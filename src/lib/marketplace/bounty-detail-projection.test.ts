/**
 * RC3 correctness regression (S-7 pattern): getBountyDetail must return the
 * fields its type claims. In RC2 and earlier the SQL projection did NOT
 * select `b.title` while BountyPublic claimed `title: string` — every public
 * bounty detail page rendered its <h1> as the string "undefined" in
 * production. This test fails on that projection.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

process.env.PAYMENT_PROVIDER = "fake";

const { getBountyDetail } = await import("@/lib/marketplace/queries.server");
const { createBounty } = await import("@/lib/marketplace/bounties.server");
const { getSql } = await import("@/lib/db.server");

async function sponsor(): Promise<string> {
  const sql = await getSql();
  const id = `usr_bt_${Math.random().toString(36).slice(2, 10)}`;
  await sql.query("insert into users (id, email, display_name, email_verified) values ($1, $2, $3, true)", [
    id,
    `${id}@test.local`,
    "BT Sponsor",
  ]);
  return id;
}

test("getBountyDetail: the projection carries the real title (the undefined-h1 regression)", async () => {
  const sponsorId = await sponsor();
  const { id } = await createBounty({
    sponsorUserId: sponsorId,
    product: "foundersbid",
    title: "Regression: the h1 must show this exact title",
    description:
      "A bounded task created purely to prove the detail-page projection includes every field the type claims.",
    category: "development",
    skills: [],
    rewardTotalMinor: 150_000,
    currency: "INR",
    rewardStructure: "WINNER_TAKES_ALL",
    rewardAllocations: [{ place: 1, amountMinor: 150_000 }],
    submissionDeadline: new Date(Date.now() + 14 * 86400_000).toISOString(),
  });
  const detail = await getBountyDetail(await getSql(), id, null);
  assert.ok(detail, "detail resolves for a real bounty");
  assert.equal(detail.bounty.title, "Regression: the h1 must show this exact title");
  assert.equal(detail.bounty.category, "development");
  assert.equal(detail.bounty.status, "DRAFT");
  // every claimed display field is present, not undefined:
  for (const key of ["title", "description", "category", "currency", "status", "sponsor_user_id"] as const) {
    assert.notEqual(detail.bounty[key], undefined, `bounty.${key} must be selected`);
  }
});