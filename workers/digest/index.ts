import { runDigest } from '../../functions/api/_lib/digest.ts';
import type { Env } from '../../functions/api/_shared.ts';

// Cron Trigger (wrangler.json: 06:00 UTC). Secrets: RESEND_API_KEY, RESEND_FROM (wrangler secret put).
export default {
  async scheduled(_event: unknown, env: Env, ctx: { waitUntil(p: Promise<unknown>): void }): Promise<void> {
    ctx.waitUntil(runDigest(env).then((n) => console.log(`digest sent: ${n}`)));
  },
};
