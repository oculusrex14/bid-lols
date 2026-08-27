import { test } from "node:test";
import assert from "node:assert/strict";
import { getSql } from "@/lib/db.server";
import { allowRateLimit, submitWaitlistEntry } from "@/lib/waitlist.server";
import { WAITLIST_CONSENT_TEXT } from "@/lib/waitlist-shared";

/**
 * Phase 00.6 WS1 regression (AC-1.1..1.5): the founding-access writer
 * against the real PGLite loop (migrations incl. 0010 + 0011 applied).
 * The zod validator / consent gate / honeypot live in the thin serverFn
 * wrapper (waitlist.ts) and are exercised end-to-end by the preview smoke;
 * here we cover the normalized writer, multi-interest semantics, and the
 * rate-limit decision.
 */

const uniqueEmail = () =>
  `waitlist-test-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.test`;

test("a submission writes one person + one interest with consent text", async () => {
  const email = uniqueEmail();
  const outcome = await submitWaitlistEntry({
    email,
    role: "builder",
    productKey: "foundersbid",
    ip: "10.9.9.1",
  });
  assert.deepEqual(outcome, { ok: true, created: true });

  const sql = await getSql();
  const people = await sql.query<{ email: string }>(
    `select email from waitlist_people where email_norm = $1`,
    [email.toLowerCase()],
  );
  assert.equal(people.length, 1);
  const interests = await sql.query(
    `select product_key, role, consent_text, consent_at, i.created_at
     from waitlist_interests i
     join waitlist_people p on p.id = i.person_id
     where p.email_norm = $1`,
    [email.toLowerCase()],
  );
  assert.equal(interests.length, 1);
  assert.equal(interests[0].product_key, "foundersbid");
  assert.equal(interests[0].role, "builder");
  assert.equal(interests[0].consent_text, WAITLIST_CONSENT_TEXT);
  assert.ok(interests[0].consent_at instanceof Date, "consent timestamp recorded");
  assert.ok(interests[0].created_at instanceof Date, "created timestamp recorded");
});

test("one email can hold multiple interests at once (AC-1.2)", async () => {
  const email = uniqueEmail();
  for (const [productKey, role] of [
    ["foundersbid", "sponsor"],
    ["foundersbid", "builder"],
    ["culturebid", "creator"],
    ["bidception", "captain"],
  ] as const) {
    const outcome = await submitWaitlistEntry({
      email,
      role,
      productKey,
      ip: "10.9.9.3",
    });
    assert.deepEqual(outcome, { ok: true, created: true });
  }

  const sql = await getSql();
  const people = await sql.query<{ id: string }>(
    `select id from waitlist_people where email_norm = $1`,
    [email.toLowerCase()],
  );
  assert.equal(people.length, 1, "exactly ONE person row for the email");
  const interests = await sql.query<{ n: string }>(
    `select count(*)::text as n from waitlist_interests where person_id = $1`,
    [people[0].id],
  );
  assert.equal(interests[0].n, "4", "all four interests coexist");
});

test("a repeat identical interest is idempotent: refresh, not duplicate (AC-1.3)", async () => {
  const email = uniqueEmail();
  assert.deepEqual(
    await submitWaitlistEntry({ email, role: "sponsor", productKey: "bidthrone", ip: "10.9.9.4" }),
    { ok: true, created: true },
  );
  assert.deepEqual(
    await submitWaitlistEntry({ email, role: "sponsor", productKey: "bidthrone", ip: "10.9.9.4" }),
    { ok: true, created: false },
  );

  const sql = await getSql();
  const rows = await sql.query<{ role: string; product_key: string }>(
    `select i.role, i.product_key
     from waitlist_interests i
     join waitlist_people p on p.id = i.person_id
     where p.email_norm = $1`,
    [email.toLowerCase()],
  );
  assert.equal(rows.length, 1);
  assert.deepEqual(rows[0], { role: "sponsor", product_key: "bidthrone" });
});

test("0011 backfills legacy waitlist_entries rows without losing data (AC-1.5)", async () => {
  // Simulate pre-0011 legacy rows, then apply the migration text as 0011 did.
  const sql = await getSql();
  const legacyEmail = uniqueEmail();
  await sql.query(
    `insert into waitlist_entries
       (id, email, email_norm, role, product_key, consent, consent_at, created_at, updated_at)
     values (gen_random_uuid(), $1, lower($1), 'builder', 'culturebid', $2, now(), now(), now())`,
    [legacyEmail, WAITLIST_CONSENT_TEXT],
  );

  const { readFile } = await import("node:fs/promises");
  const { join } = await import("node:path");
  const migrationText = await readFile(
    join(import.meta.dirname, "..", "..", "migrations", "0011_waitlist_normalize.sql"),
    "utf8",
  );
  // Re-apply the migration statement-by-statement (the PGLite `query` surface
  // is single-statement; 0011 is idempotent, so re-running it here is safe).
  const statements = migrationText
    .split("\n")
    .filter((line) => !line.trim().startsWith("--"))
    .join("\n")
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  for (const statement of statements) await sql.query(statement);

  const people = await sql.query<{ email: string }>(
    `select email from waitlist_people where email_norm = $1`,
    [legacyEmail.toLowerCase()],
  );
  assert.equal(people.length, 1, "legacy row backfilled into waitlist_people");
  const interests = await sql.query<{ role: string; product_key: string }>(
    `select i.role, i.product_key
     from waitlist_interests i
     join waitlist_people p on p.id = i.person_id
     where p.email_norm = $1`,
    [legacyEmail.toLowerCase()],
  );
  assert.equal(interests.length, 1);
  assert.equal(interests[0].product_key, "culturebid");
  assert.equal(interests[0].role, "builder");
  // the archive keeps its row (no destructive drop in the migration)
  const archive = await sql.query<{ c: string }>(
    `select count(*)::text as c from waitlist_entries where email_norm = $1`,
    [legacyEmail.toLowerCase()],
  );
  assert.equal(archive[0].c, "1");
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
