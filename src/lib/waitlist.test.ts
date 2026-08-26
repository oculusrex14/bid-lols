import { test } from "node:test";
import assert from "node:assert/strict";
import { getSql } from "@/lib/db.server";
import { allowRateLimit, submitWaitlistEntry } from "@/lib/waitlist.server";
import { WAITLIST_CONSENT_TEXT } from "@/lib/waitlist-shared";

/**
 * Phase 00.5 WS3 regression (AC-3.1/3.2/3.3): the founding-access writer
 * against the real PGLite loop (migrations incl. 0010 applied).
 * The zod validator / consent gate / honeypot live in the thin serverFn
 * wrapper (waitlist.ts) and are exercised end-to-end by the preview smoke;
 * here we cover the writer + the rate-limit decision.
 */

const uniqueEmail = () =>
  `waitlist-test-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.test`;

test("an entry is written with the given product, role, and consent text", async () => {
  const email = uniqueEmail();
  const outcome = await submitWaitlistEntry({
    email,
    role: "builder",
    productKey: "foundersbid",
    ip: "10.9.9.1",
  });
  assert.deepEqual(outcome, { ok: true, created: true });

  const sql = await getSql();
  const rows = await sql.query(
    `select email, email_norm, role, product_key, consent, consent_at, created_at
     from waitlist_entries where email_norm = $1`,
    [email.toLowerCase()],
  );
  assert.equal(rows.length, 1);
  assert.equal(rows[0].role, "builder");
  assert.equal(rows[0].product_key, "foundersbid");
  assert.equal(rows[0].consent, WAITLIST_CONSENT_TEXT);
  assert.ok(rows[0].consent_at instanceof Date, "consent timestamp recorded");
  assert.ok(rows[0].created_at instanceof Date, "created timestamp recorded");
});

test("a repeat submission updates the same row instead of duplicating", async () => {
  const email = uniqueEmail();
  assert.deepEqual(
    await submitWaitlistEntry({ email, role: "sponsor", productKey: "bidthrone", ip: "10.9.9.2" }),
    { ok: true, created: true },
  );
  assert.deepEqual(
    await submitWaitlistEntry({ email, role: "builder", productKey: "bidthrone", ip: "10.9.9.2" }),
    { ok: true, created: false },
  );

  const sql = await getSql();
  const rows = await sql.query<{ role: string }>(
    `select role from waitlist_entries where email_norm = $1`,
    [email.toLowerCase()],
  );
  assert.equal(rows.length, 1);
  assert.equal(rows[0].role, "builder");
});

test("the per-IP rate limiter allows 5 then blocks within the window (AC-3.3)", () => {
  const ip = "203.0.113.7";
  const t0 = 1_700_000_000_000;
  for (let i = 1; i <= 5; i += 1) {
    assert.equal(allowRateLimit(ip, t0 + i * 1000), true, `submission ${i} should pass`);
  }
  assert.equal(allowRateLimit(ip, t0 + 6_000), false, "6th in-window submission must be blocked");
});

test("the rate-limit window slides; different IPs are independent", () => {
  const ip = "203.0.113.8";
  const t0 = 1_700_000_100_000;
  for (let i = 1; i <= 5; i += 1) allowRateLimit(ip, t0 + i * 1000);
  // after the 10-minute window elapses the counter resets
  assert.equal(allowRateLimit(ip, t0 + 11 * 60_000), true);
  // an unseen IP is unaffected
  assert.equal(allowRateLimit("203.0.113.9", t0 + 11 * 60_000), true);
});

test("a missing IP degrades to the DB uniqueness guard (allowed)", () => {
  assert.equal(allowRateLimit(undefined, 0), true);
});
