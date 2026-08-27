import { getSql } from "@/lib/db.server";
import type { ProductKey } from "@/lib/host";

/**
 * Server-only founding-access capture. No accounts, no marketplace, written
 * only through the validated, consent-gated server function in waitlist.ts.
 *
 * Data model (Phase 00.6, WS1): normalized — `waitlist_people` (one row per
 * email) + `waitlist_interests` (one row per person × product × role). The
 * same email can simultaneously express FoundersBid/sponsor,
 * FoundersBid/builder, CultureBid/creator, Bidception/captain, etc.
 * Resubmitting an identical interest is idempotent: it refreshes
 * consent_text/consent_at/updated_at instead of duplicating. The legacy
 * `waitlist_entries` table is frozen (backfilled by 0011, never written
 * here).
 *
 * Protection layers (in order):
 *  1. zod validation in the server function (malformed input never reaches here);
 *  2. honeypot — a hidden field bots fill; a filled honeypot gets a SILENT
 *     fake success and no write;
 *  3. per-IP rate limit — in-memory, per serverless instance (best-effort:
 *     Vercel runs many instances; the DB constraints below are the hard
 *     guarantee);
 *  4. uniqueness — `waitlist_people.email_norm` + `waitlist_interests
 *     (person_id, product_key, role)` upsert semantics.
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
    // One transaction: person upsert + interest upsert commit together, so a
    // crash can never leave an interest without its person.
    return await sql.transaction(async (tx) => {
      const people = await tx.query<{ id: string }>(
        `insert into waitlist_people (email, email_norm)
         values ($1, lower($1))
         on conflict (email_norm)
         do update set email = excluded.email, updated_at = now()
         returning id`,
        [input.email],
      );
      const personId = people[0]?.id;
      if (!personId) throw new Error("person upsert returned no id");
      const rows = await tx.query<{ created: boolean }>(
        `insert into waitlist_interests
           (person_id, product_key, role, consent_text, consent_at)
         values ($1, $2, $3, $4, now())
         on conflict (person_id, product_key, role)
         do update
           set consent_text = excluded.consent_text,
               consent_at   = now(),
               updated_at   = now()
         returning (xmax = 0) as created`,
        [personId, input.productKey, input.role, WAITLIST_CONSENT_TEXT],
      );
      return { ok: true as const, created: rows[0]?.created === true };
    });
  } catch (err) {
    console.error("[waitlist] entry write failed:", err);
    return { ok: false, code: "db_error" };
  }
}
