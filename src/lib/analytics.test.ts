import { test } from "node:test";
import assert from "node:assert/strict";
import { getSql } from "@/lib/db.server";
import { recordOutboundClick, recordPageView, recordVisit } from "@/lib/analytics.server";

/**
 * W2 / FR-8: truthful counters against the dev/preview PGLite loop.
 * views = one per impression; visits = caller-deduped per session;
 * clicks = independent outbound counter. No scaling, no double-count.
 */

type Stats = { views: number; visits: number; visits_today: number; clicks: number };

async function stats(site: string): Promise<Stats> {
  const sql = await getSql();
  const row = await sql.query<Stats>(
    `select views::int as views, visits::int as visits, visits_today::int as visits_today,
            clicks::int as clicks from site_stats where site = $1`,
    [site],
  );
  // No row yet = all zeros (the server creates it on first record).
  return (
    row[0] ?? { views: 0, visits: 0, visits_today: 0, clicks: 0 }
  );
}

test("AC-15(a): two impressions -> views +2, visits unchanged", async () => {
  const before = await stats("foundersbid");
  await recordPageView("foundersbid");
  await recordPageView("foundersbid");
  const after = await stats("foundersbid");
  assert.equal(after.views, before.views + 2);
  assert.equal(after.visits, before.visits);
  assert.equal(after.visits_today, before.visits_today);
  assert.equal(after.clicks, before.clicks);
});

test("AC-15(a): a visit increments visits + visits_today exactly once per call", async () => {
  const before = await stats("culturebid");
  await recordVisit("culturebid");
  const after = await stats("culturebid");
  assert.equal(after.visits, before.visits + 1);
  assert.equal(after.visits_today, before.visits_today + 1);
  assert.equal(after.views, before.views);
});

test("AC-15(b): an outbound click increments only site_stats.clicks", async () => {
  const before = await stats("bidception");
  await recordOutboundClick("bidception");
  await recordOutboundClick("bidception");
  const after = await stats("bidception");
  assert.equal(after.clicks, before.clicks + 2);
  assert.equal(after.views, before.views);
  assert.equal(after.visits, before.visits);
  assert.equal(after.visits_today, before.visits_today);
});

test("W2: the umbrella domain records into its own new-key row", async () => {
  await recordPageView("bidthrone");
  const row = await stats("bidthrone");
  assert.ok(row.views >= 1);
});

test("AC-15(c): no hype scaling anywhere in the counter path", async () => {
  const sql = await getSql();
  // The legacy hype_factor/hype_locked columns stay (historical data) but no
  // code multiplies counters by them: views equals the recorded impressions.
  const before = await stats("foundersbid");
  await recordPageView("foundersbid");
  const after = await stats("foundersbid");
  assert.equal(after.views - before.views, 1, "stored value is the raw count, not a scaled display");
  // The site_stats schema still carries the legacy columns (additive DDL only).
  const cols = await sql.query<{ column_name: string }>(
    `select column_name from information_schema.columns where table_name = 'site_stats'`,
  );
  const names = cols.map((c) => c.column_name);
  for (const expected of ["views", "visits", "visits_today", "visits_day", "hype_factor", "hype_locked", "clicks"]) {
    assert.ok(names.includes(expected), `site_stats has ${expected}`);
  }
});
