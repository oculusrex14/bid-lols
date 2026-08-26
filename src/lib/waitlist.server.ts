import { getSql } from "@/lib/db.server";
import type { ProductKey } from "@/lib/host";

/**
 * Server-only founding-access capture (Phase 00.5, WS3). No accounts, no
 * marketplace: one row per email address in `waitlist_entries`, written only
 * through the validated, consent-gated server function in waitlist.ts.
 *
 * Protection layers (in order):
 *  1. zod validation in the server function (malformed input never reaches here);
 *  2. honeypot — a hidden field bots fill; a filled honeypot gets a SILENT
 *     fake success and no write (AC-3.3);
 *  3. per-IP rate limit — in-memory, per serverless instance (best-effort:
 *     Vercel runs many instances; the DB unique constraint below is the hard
 *     guarantee, so cross-instance spam still collapses to one row per email);
 *  4. `email_norm` unique constraint — upsert semantics: repeat submissions
 *     update role/consent/timestamps instead of duplicating.
 */

import { WAITLIST_CONSENT_TEXT, WAITLIST_ROLES, type WaitlistRole } from "@/lib/waitlist-shared";

export { WAITLIST_ROLES, type WaitlistRole };

export type WaitlistOutcome =
  | { ok: true; created: boolean }
  | { ok: false; code: "rate_limited" | "db_error" };

/** Per-IP window: 5 submissions / 10 minutes (best-effort per instance). */
const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_MAX = 5;
const buckets = new Map<string, { count: number; windowStart: number }>();

export function allowRateLimit(key: string | undefined, now = Date.now()): boolean {
  if (!key) return true; // no IP available — fall back to the DB uniqueness guard
  let b = buckets.get(key);
  if (!b || now - b.windowStart >= RATE_WINDOW_MS) {
    b = { count: 0, windowStart: now };
    buckets.set(key, b);
  }
  b.count += 1;
  // keep the map from growing unbounded across instances' lifetimes
  if (buckets.size > 10_000) buckets.clear();
  return b.count <= RATE_MAX;
}

export async function submitWaitlistEntry(input: {
  email: string;
  role: WaitlistRole;
  productKey: ProductKey;
  ip?: string;
}): Promise<WaitlistOutcome> {
  // Best-effort client IP: use the caller-provided one, else read the
  // forwarded header from the active request (only inside a serverFn —
  // plain test calls have no request and simply skip the IP limiter,
  // leaving the DB uniqueness guard as the hard limit).
  let ip = input.ip;
  if (ip === undefined) {
    try {
      const { getRequest } = await import("@tanstack/react-start/server");
      const fwd = getRequest()?.headers?.get("x-forwarded-for");
      const first = fwd?.split(",")[0]?.trim();
      if (first && first.length <= 64) ip = first;
    } catch {
      ip = undefined;
    }
  }
  if (!allowRateLimit(ip)) {
    return { ok: false, code: "rate_limited" };
  }
  try {
    const sql = await getSql();
    const rows = await sql.query<{ created: boolean }>(
      `insert into waitlist_entries
        (email, email_norm, role, product_key, consent, consent_at)
       values ($1, lower($1), $2, $3, $4, now())
       on conflict (email_norm)
       do update
         set role = excluded.role,
             product_key = excluded.product_key,
             consent = excluded.consent,
             consent_at = now(),
             updated_at = now()
       returning (xmax = 0) as created`,
      [input.email, input.role, input.productKey, WAITLIST_CONSENT_TEXT],
    );
    return { ok: true, created: rows[0]?.created === true };
  } catch (err) {
    console.error("[waitlist] entry write failed:", err);
    return { ok: false, code: "db_error" };
  }
}
