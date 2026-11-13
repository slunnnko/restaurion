import { recheckLicences, runDigest } from '../../functions/api/_lib/digest.ts';
import type { Env } from '../../functions/api/_shared.ts';

// Cron Triggers (wrangler.json): 06:00 UTC digest, 03:30 UTC licence recheck (D49, own invocation for the subrequest cap).
// Secrets: RESEND_API_KEY, RESEND_FROM (wrangler secret put).
const RECHECK_CRON = '30 3 * * *';

export default {
  async scheduled(event: { cron?: string }, env: Env, ctx: { waitUntil(p: Promise<unknown>): void }): Promise<void> {
    if (event.cron === RECHECK_CRON) {
      ctx.waitUntil(recheckLicences(env));
      return;
    }
    ctx.waitUntil(runDigest(env).then((n) => console.log(`digest sent: ${n}`)));
  },
};
