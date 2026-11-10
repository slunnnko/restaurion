// Denní souhrn notifikací e-mailem. Spouští ho plánovaný Worker (workers/digest); Pages Functions
// neumí Cron Triggers. Přihlašovací kódy se posílají hned jinde, tady je jen souhrn.

import { escapeHtml, sendEmailViaResend } from '../_shared.ts';
import type { Env } from '../_shared.ts';

export const DAILY_EMAIL_BUDGET = 100;
export const LOGIN_CODE_RESERVE = 10;

export interface DigestCandidate {
  profileId: string;
  email: string;
  oldestUnread: string;
}

/** Nejstarší nepřečtené první; zbytek se přenese na další den sám (emailed_at zůstane NULL). */
export function pickDigestRecipients<T extends { oldestUnread: string }>(rows: T[], budget: number): T[] {
  if (budget <= 0) return [];
  return [...rows].sort((a, b) => a.oldestUnread.localeCompare(b.oldestUnread)).slice(0, budget);
}

const LABELS: Record<string, string> = {
  job_match: 'Nová zakázka pro vás',
  interest: 'Někdo projevil zájem o vaši zakázku',
  accepted: 'Zadavatel vás přijal',
  declined: 'Zadavatel vybral jiného řemeslníka',
  withdrawn: 'Řemeslník odstoupil od zakázky',
};

interface NotificationRow {
  id: string;
  type: string;
  title: string | null;
}

export function buildDigestHtml(items: NotificationRow[], appUrl: string): string {
  const list = items
    .map(
      (n) =>
        `<li style="margin-bottom:6px;"><b>${escapeHtml(LABELS[n.type] ?? n.type)}</b>${n.title ? `: ${escapeHtml(n.title)}` : ''}</li>`
    )
    .join('');
  const link = `${appUrl}/?profil=1`;
  return `
    <div style="font-family: sans-serif; color: #111111; max-width: 520px; margin: 0 auto; border: 2px solid #111111; border-radius: 16px; padding: 24px; background: #FFFDF7;">
      <div style="background: #FEF08A; border: 2px solid #111111; border-radius: 10px; padding: 8px 14px; display: inline-block; font-weight: 800; font-size: 12px; margin-bottom: 16px;">
        RESTAURION – DENNÍ SOUHRN
      </div>
      <h2 style="margin: 0 0 12px 0; font-size: 20px;">Máte nové upozornění</h2>
      <ul style="padding-left: 18px; margin: 0 0 16px 0;">${list}</ul>
      <p style="margin: 0 0 12px 0;"><a href="${escapeHtml(appUrl)}/" style="color:#111111;font-weight:800;">Otevřít Restaurion</a></p>
      <p style="font-size: 13px; color: #444;"><a href="${escapeHtml(link)}" style="color:#444;">Nastavení upozornění / Teď nepřijímám zakázky</a></p>
    </div>`;
}

/** Vrací počet odeslaných souhrnů. Bez RESEND_API_KEY a RESEND_FROM nedělá nic. */
export async function runDigest(env: Env): Promise<number> {
  if (!env.DB || !env.RESEND_API_KEY || !env.RESEND_FROM) return 0;
  const db = env.DB;
  const appUrl = (env.APP_URL || 'https://restaurion.pages.dev').replace(/\/$/, '');

  const sent = await db
    .prepare(`SELECT COUNT(*) AS n FROM email_log WHERE sent_at >= date('now')`)
    .first<{ n: number }>();
  const budget = DAILY_EMAIL_BUDGET - (sent?.n ?? 0) - LOGIN_CODE_RESERVE;
  if (budget <= 0) return 0;

  const rows = await db
    .prepare(
      `SELECT p.id AS profileId, p.email AS email, MIN(n.created_at) AS oldestUnread
       FROM profiles p JOIN notifications n ON n.profile_id = p.id
       WHERE p.email_digest = 1 AND p.consent_at IS NOT NULL AND n.read_at IS NULL AND n.emailed_at IS NULL
       GROUP BY p.id, p.email ORDER BY oldestUnread ASC LIMIT ?`
    )
    .bind(budget)
    .all<DigestCandidate>();

  let count = 0;
  for (const r of pickDigestRecipients(rows.results, budget)) {
    const items = await db
      .prepare(
        `SELECT n.id, n.type, j.title FROM notifications n LEFT JOIN jobs j ON j.id = n.job_id
         WHERE n.profile_id = ? AND n.read_at IS NULL AND n.emailed_at IS NULL ORDER BY n.created_at LIMIT 50`
      )
      .bind(r.profileId)
      .all<NotificationRow>();
    if (items.results.length === 0) continue;

    const ok = await sendEmailViaResend(env, {
      to: r.email,
      kind: 'digest',
      profileId: r.profileId,
      subject: `Restaurion: ${items.results.length} nových upozornění`,
      html: buildDigestHtml(items.results, appUrl),
    });
    if (!ok) continue;
    const ids = items.results.map((i) => i.id);
    await db
      .prepare(`UPDATE notifications SET emailed_at = datetime('now') WHERE id IN (${ids.map(() => '?').join(',')})`)
      .bind(...ids)
      .run();
    count++;
  }
  return count;
}
