import { test } from "node:test";
import assert from "node:assert/strict";
import { getPglite } from "../src/lib/db.server";

/**
 * RC5.1 WS11/WS12: BI-1.0 remains INR-native end-to-end (PGLite).
 *  - a USD outcome keeps its FACTUAL evidence (it still counts for
 *    reliability/experience) but its amount is never read as INR paise
 *    (it scores at the floor value factor, 0.75);
 *  - verified volume is INR-denominated only;
 *  - the projector persists the TRUE amount + TRUE currency into
 *    trust_events (factual provenance round-trip);
 *  - an all-INR member is unaffected (the gate is a no-op for INR).
 */

const ASOF = new Date("2026-09-15T00:00:00Z");
const USD_PROVIDER = "usr_rc51_usd_p";
const USD_TWIN_PROVIDER = "usr_rc51_inr_p";
const SPONSOR_A = "usr_rc51_s_a";
const SPONSOR_B = "usr_rc51_s_b";

type Pg = Awaited<ReturnType<typeof getPglite>>;
async function q(pg: Pg, text: string, params: unknown[] = []) {
  const res = await pg.query<Record<string, unknown>>(text, params as unknown[]);
  return res.rows as Record<string, any>[];
}

async function seedUsers(pg: Pg): Promise<void> {
  await q(pg, "truncate trust_events, trust_score_snapshots, bounties, bounty_awards, users restart identity cascade");
  await q(
    pg,
    "insert into users (id, email, email_verified) values ($1,$2,true),($3,$4,true),($5,$6,true),($7,$8,true)",
    [
      USD_PROVIDER, `usdp@t`, USD_TWIN_PROVIDER, "inrp@t",
      SPONSOR_A, "sa@t", SPONSOR_B, "sb@t",
    ],
  );
}

/** One completed bounty, won by `winner`, in `currency` at 2,500,000 minor. */
async function doneBounty(
  pg: Pg,
  seq: string,
  sponsor: string,
  winner: string,
  currency: "INR" | "USD",
): Promise<void> {
  await q(
    pg,
    `insert into bounties
       (id, product, sponsor_user_id, title, slug, description, category,
        reward_total_minor, currency, reward_structure, reward_allocations,
        status, submission_deadline, published_at, awarded_at, completed_at, skills)
     values
       ($1, 'foundersbid', $2, $3, $4, $5, 'development',
        2500000, $6, 'WINNER_TAKES_ALL', $7::jsonb,
        'COMPLETED', '2026-08-10T00:00:00Z', '2026-07-01T00:00:00Z',
        '2026-08-01T00:00:00Z', '2026-08-01T00:00:00Z', '["api"]'::jsonb)`,
    [
      `bnt_rc51_${seq}`,
      sponsor,
      `RC5.1 currency bounty ${seq}`,
      `slug-rc51-${seq}`,
      `A completed ${currency} bounty for the trust currency gate tests.`,
      currency,
      JSON.stringify([{ place: 1, amount_minor: 2_500_000 }]),
    ],
  );
  await q(
    pg,
    "insert into bounty_awards (id, bounty_id, user_id, place, amount_minor, currency, status, awarded_by) values ($1,$2,$3,1,2500000,$4,'SETTLED',$5)",
    [`awd_rc51_${seq}`, `bnt_rc51_${seq}`, winner, currency, sponsor],
  );
}

test("RC5.1 WS11: a USD completion is never scored as INR paise", async () => {
  const pg = await getPglite();
  await seedUsers(pg);
  await doneBounty(pg, "u1", SPONSOR_A, USD_PROVIDER, "USD");
  await doneBounty(pg, "u2", SPONSOR_B, USD_PROVIDER, "USD");
  // The INR twin: identical shape, same amounts, INR denomination.
  await doneBounty(pg, "i1", SPONSOR_A, USD_TWIN_PROVIDER, "INR");
  await doneBounty(pg, "i2", SPONSOR_B, USD_TWIN_PROVIDER, "INR");

  const { trustReportFor } = await import("../src/lib/trust/score.server");
  const usdReport = await trustReportFor(USD_PROVIDER, ASOF);
  const inrReport = await trustReportFor(USD_TWIN_PROVIDER, ASOF);

  const usdRole = usdReport.roles.find((r) => r.role === "PROVIDER")!;
  const inrRole = inrReport.roles.find((r) => r.role === "PROVIDER")!;

  assert.equal(usdRole.status, "SCORED", "the USD member still scores on factual evidence");
  assert.equal(usdRole.primaryOutcomes, 2, "both USD outcomes remain counted outcomes");
  assert.equal(usdRole.verifiedVolumeMinor, 0, "verified volume is INR-only: USD contributes zero");
  assert.equal(inrRole.verifiedVolumeMinor, 5_000_000, "the INR twin keeps its full volume");

  // The economic gate: 2,500,000 INR paise = ₹25,000 -> valueFactor exactly
  // 1.0; the same minor figure in USD cents is $25,000 and must be scored at
  // the floor (0.75). If cents were misread as paise, the two pillars would
  // be identical.
  assert.ok(
    usdRole.pillars.RELIABILITY < inrRole.pillars.RELIABILITY,
    `USD outcome weights less than its INR twin (floor vs full value factor): usd=${usdRole.pillars.RELIABILITY} inr=${inrRole.pillars.RELIABILITY}`,
  );
  assert.notEqual(usdRole.score, inrRole.score, "no paise-for-cents misread end to end");
  // ...but the floor still counts: the USD member moves above the 0.7 prior.
  assert.ok(usdRole.pillars.RELIABILITY > 0.7, "floor-weighted clean outcomes still move the pillar");
});

test("RC5.1 WS11: the projector persists the TRUE amount and TRUE currency", async () => {
  const pg = await getPglite();
  await seedUsers(pg);
  await doneBounty(pg, "u1", SPONSOR_A, USD_PROVIDER, "USD");
  await doneBounty(pg, "u2", SPONSOR_B, USD_PROVIDER, "USD");

  const { projectUserTrustEvents } = await import("../src/lib/trust/projector.server");
  const run = await projectUserTrustEvents(USD_PROVIDER, { apply: true });
  assert.equal(run.created, 2, `two clean completions projected (${JSON.stringify(run)})`);

  const rows = await q(
    pg,
    "select currency, amount_minor, event_kind from trust_events where user_id = $1 and event_kind = 'CLEAN_COMPLETION' order by source_id",
    [USD_PROVIDER],
  );
  assert.equal(rows.length, 2);
  for (const r of rows) {
    assert.equal(String(r.currency), "USD", "trust_events carry the factual currency provenance");
    assert.equal(Number(r.amount_minor), 2_500_000, "the TRUE amount is stored (not zeroed, not misread)");
  }

  // The INR twin's events stay INR.
  await doneBounty(pg, "i1", SPONSOR_A, USD_TWIN_PROVIDER, "INR");
  await doneBounty(pg, "i2", SPONSOR_B, USD_TWIN_PROVIDER, "INR");
  await projectUserTrustEvents(USD_TWIN_PROVIDER, { apply: true });
  const inrRows = await q(
    pg,
    "select distinct currency from trust_events where user_id = $1 and event_kind = 'CLEAN_COMPLETION'",
    [USD_TWIN_PROVIDER],
  );
  assert.deepEqual(inrRows.map((r) => String(r.currency)), ["INR"]);
});
