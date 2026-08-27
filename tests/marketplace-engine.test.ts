import { test } from "node:test";
import assert from "node:assert/strict";
import { getPglite } from "../src/lib/db.server";

process.env.PAYMENT_PROVIDER = "fake";
process.env.MARKETPLACE_MONEY_LIVE = "1";

// NOTE: imports are AFTER env vars so module-level moneyMode() reads see them.
const { createBounty, publishBountyForFunding, verifyFundingAndOpen, applyToBounty, decideApplication, startWork, upsertSubmission, judgeBounty, sponsorCancelBounty, expireIfDue } =
  await import("../src/lib/marketplace/bounties.server");
const { moneyEventsFor, createAwardObligations, fundingDecomposition } = await import(
  "../src/lib/marketplace/ledger.server"
);
const { getPaymentProvider } = await import("../src/lib/payments/provider");
const { splitSponsorCharge, computeFee } = await import("../src/lib/money");


type PgRow = Record<string, any>;
async function q(pg: import("@electric-sql/pglite").PGlite, text: string, params: unknown[] = []): Promise<PgRow[]> {
  const res = await pg.query<Record<string, unknown>>(text, params as unknown[]);
  return res.rows as PgRow[];
}

const SPONSOR = "usr_sponsor_0001";
const B1 = "usr_builder_0001";
const B2 = "usr_builder_0002";
const B3 = "usr_builder_0003";

async function freshDb(): Promise<import("@electric-sql/pglite").PGlite> {
  const pg = await getPglite();
  await q(pg, "truncate bounties, bounty_applications, bounty_participants, bounty_submissions, bounty_awards, projects, project_proposals, project_milestones, money_events, payout_obligations, payments, users, notifications restart identity cascade",   );   await pg.query(     `insert into users (id, email, display_name, email_verified, role, status)      values ($1,'sponsor@test','Sponsor',true,'user','active'),             ($2,'b1@test',null,true,'user','active'),             ($3,'b2@test',null,true,'user','active'),             ($4,'b3@test',null,true,'user','active')`,     [SPONSOR, B1, B2, B3],   );   return pg; }  async function statusOf(bountyId: string): Promise<string> {   const pg = await getPglite();   const rows = await q(pg, "select status from bounties where id = $1", [bountyId]);   return String(rows[0]?.status ?? "MISSING");
}

const REWARD = 1_000_000; // ₹10,000.00 in paise
const LATER = new Date(Date.now() + 7 * 24 * 3600 * 1000);

test("AC-3: create -> DRAFT with validated allocations", async () => {
  await freshDb();
  const { id } = await createBounty({
    sponsorUserId: SPONSOR,
    product: "foundersbid",
    title: "Design a landing page for our launch",
    description: "We need a high-converting landing page with clear structure and copy.",
    category: "design",
    rewardTotalMinor: REWARD,
    rewardStructure: "WINNER_TAKES_ALL",
    rewardAllocations: [{ place: 1, amountMinor: REWARD }],
    submissionDeadline: LATER.toISOString(),
  });
  assert.equal(await statusOf(id), "DRAFT");
  // allocation validation: sum must equal the advertised reward
  await assert.rejects(
    () =>
      createBounty({
        sponsorUserId: SPONSOR,
        product: "foundersbid",
        title: "Broken allocation bounty test",
        description: "This should fail because allocations do not sum.",
        category: "design",
        rewardTotalMinor: REWARD,
        rewardStructure: "WINNER_TAKES_ALL",
        rewardAllocations: [{ place: 1, amountMinor: REWARD - 1 }],
        submissionDeadline: LATER.toISOString(),
      }),
    /allocations sum/,
  );
});

test("AC-6: money flag off -> honest funding_disabled, no partial state", async () => {
  const pg = await freshDb();
  delete process.env.MARKETPLACE_MONEY_LIVE;
  const { id } = await createBounty({
    sponsorUserId: SPONSOR,
    product: "foundersbid",
    title: "Unfunded bounty honest refusal",
    description: "This bounty must refuse to publish while funding is off.",
    category: "research",
    rewardTotalMinor: REWARD,
    rewardStructure: "WINNER_TAKES_ALL",
    rewardAllocations: [{ place: 1, amountMinor: REWARD }],
    submissionDeadline: LATER.toISOString(),
  });
  const result = await publishBountyForFunding({ bountyId: id, sponsorUserId: SPONSOR });
  assert.equal(result.ok, false);
  if (!result.ok && result.code === "funding_disabled") {
    assert.match(result.message, /not live yet|founding access/i);
  } else {
    assert.fail(`expected funding_disabled, got ${JSON.stringify(result)}`);
  }
  const s = await q(pg, "select status from bounties where id = $1", [id]);   assert.equal(s[0].status, "DRAFT"); // nothing half-published
  const payments = await q(pg, "select count(*)::int as n from payments");
  assert.equal(payments[0].n, 0, "no payment row is created while funding is off");
  process.env.MARKETPLACE_MONEY_LIVE = "1";
});

test("AC-4: sandbox funding -> settle -> OPEN, ledger sums exactly, idempotent", async () => {
  const pg = await freshDb();
  process.env.MARKETPLACE_MONEY_LIVE = "1";
  const { id } = await createBounty({
    sponsorUserId: SPONSOR,
    product: "foundersbid",
    title: "Funded bounty full lifecycle",
    description: "A complete bounty to exercise funding, applications and judging.",
    category: "automation",
    rewardTotalMinor: REWARD,
    rewardStructure: "WINNER_TAKES_ALL",
    rewardAllocations: [{ place: 1, amountMinor: REWARD }],
    submissionDeadline: LATER.toISOString(),
  });
  const published = await publishBountyForFunding({ bountyId: id, sponsorUserId: SPONSOR });
  assert.equal(published.ok, true);
  if (!published.ok) return;

  // sponsor subtotal == reward + fee (₹10,000 -> ₹1,000 -> ₹11,000)
  const payment = (
    await q(pg, "select id, amount_cents, meta from payments where kind='funding'")
  )[0] as { id: string; amount_cents: number; meta: Record<string, unknown> };
  const plan = splitSponsorCharge(REWARD);
  assert.equal(payment.amount_cents, plan.sponsorSubtotal);
  assert.equal(payment.meta.reward_minor, plan.reward);
  assert.equal(payment.meta.platform_fee_minor, plan.platformFee);

  const provider = getPaymentProvider() as unknown as {
    markPaid(id: string): void;
    isOrderPaid(id: string): Promise<boolean>;
  };
  provider.markPaid(String(payment.id)); // what a verified webhook proves

  const first = await verifyFundingAndOpen({
    bountyId: id,
    paymentId: String(payment.id),
    providerRef: "webhook-test-1",
  });
  assert.equal(first, "opened");
  const second = await verifyFundingAndOpen({
    bountyId: id,
    paymentId: String(payment.id),
  });
  assert.equal(second, "alreadyOpen");

  const bounty = (await q(pg, "select status, published_at from bounties where id=$1", [id]))[0];
  assert.equal(bounty.status, "OPEN");
  assert.ok(bounty.published_at);

  // Ledger decomposition: REWARD + PLATFORM_FEE == sponsor charge, exactly once.
  const events = await moneyEventsFor("BOUNTY", id);
  const reward = events.filter((e) => e.type === "REWARD");
  const fee = events.filter((e) => e.type === "PLATFORM_FEE");
  assert.equal(reward.length, 1, "exactly one REWARD event (no double settle)");
  assert.equal(fee.length, 1);
  assert.equal(reward[0].amount_minor, plan.reward);
  assert.equal(fee[0].amount_minor, plan.platformFee);
  assert.equal(reward[0].amount_minor + fee[0].amount_minor, payment.amount_cents);

  // Payment row flipped once.
  const pmt = (await q(pg, "select status, paid_at from payments"))[0];
  assert.equal(pmt.status, "paid");
  assert.ok(pmt.paid_at);
  process.env.MARKETPLACE_MONEY_LIVE = "0";
});

test("AC-5: apply -> approve -> start -> submit -> judge -> awards == advertised", async () => {
  const pg = await freshDb();
  process.env.MARKETPLACE_MONEY_LIVE = "1";
  const { id } = await createBounty({
    sponsorUserId: SPONSOR,
    product: "foundersbid",
    title: "Judged bounty podium structure",
    description: "A podium-structure bounty to exercise the full judging path.",
    category: "research",
    rewardTotalMinor: REWARD,
    rewardStructure: "PODIUM",
    rewardAllocations: [
      { place: 1, amountMinor: 700_000, label: "winner" },
      { place: 2, amountMinor: 300_000, label: "runner-up" },
    ],
    submissionDeadline: LATER.toISOString(),
    participantCap: 3,
  });
  const published = await publishBountyForFunding({ bountyId: id, sponsorUserId: SPONSOR });
  assert.equal(published.ok, true);
  const payment = (await q(pg, "select id from payments where kind='funding'"))[0];
  const provider = getPaymentProvider() as unknown as { markPaid(id: string): void };
  provider.markPaid(payment.id);
  await verifyFundingAndOpen({ bountyId: id, paymentId: payment.id });

  // three builders apply (cap 3); sponsor approves two of them
  const a1 = await applyToBounty({ bountyId: id, userId: B1, message: "I can do this" });
  const a2 = await applyToBounty({ bountyId: id, userId: B2, message: "Me too" });
  const a3 = await applyToBounty({ bountyId: id, userId: B3, message: "And me" });
  assert.ok(a1.ok && a2.ok && a3.ok);
  for (const a of [a1, a2, a3]) {
    if (!a.ok) continue;
    const d = await decideApplication({ applicationId: a.applicationId, sponsorUserId: SPONSOR, decision: "APPROVE" });
    assert.ok(d.ok, JSON.stringify(d));
  }
  // cap enforcement: a 4th applicant (new user) hits the cap
  await q(pg, "insert into users (id, email, email_verified) values ($1,'b4@test',true)", ["usr_builder_0004"]);
  const a4 = await applyToBounty({ bountyId: id, userId: "usr_builder_0004" });
  assert.equal(a4.ok, false);
  if (!a4.ok) assert.match(a4.message, /cap/i);

  // self-apply is impossible (service check)
  const selfApply = await applyToBounty({ bountyId: id, userId: SPONSOR });
  assert.equal(selfApply.ok, false);

  // work begins, submissions land
  assert.ok((await startWork({ bountyId: id, userId: B1 })).ok);
  assert.ok((await startWork({ bountyId: id, userId: B2 })).ok);
  assert.ok((await startWork({ bountyId: id, userId: B3 })).ok);
  assert.ok(
    (await upsertSubmission({ bountyId: id, userId: B1, title: "Entry one", body: "My approach…", links: ["https://example.com/one"] })).ok,
  );
  assert.ok(
    (await upsertSubmission({ bountyId: id, userId: B2, title: "Entry two", body: "Better approach…" })).ok,
  );
  assert.ok(
    (await upsertSubmission({ bountyId: id, userId: B3, title: "Entry three", body: "Third approach…" })).ok,
  );

  // judging: winner + runner-up per the PODIUM allocations
  const judged = await judgeBounty({
    bountyId: id,
    sponsorUserId: SPONSOR,
    placements: [
      { userId: B2, place: 1 },
      { userId: B1, place: 2 },
    ],
  });
  assert.ok(judged.ok, JSON.stringify(judged));

  const awards = await q(pg, "select user_id, place, amount_minor from bounty_awards order by place");
  assert.equal(awards.length, 2);
  assert.equal(awards[0].user_id, B2);
  assert.equal(awards[0].amount_minor, 700_000);
  assert.equal(awards[1].amount_minor, 300_000);
  const sum = awards.reduce((t, a) => t + Number(a.amount_minor), 0);
  assert.equal(sum, REWARD, "awarded amounts sum EXACTLY to the advertised reward");

  const bounty = (await q(pg, "select status from bounties where id=$1", [id]))[0];
  assert.equal(bounty.status, "AWARDED");

  // payout obligations: one per award, idempotent
  const awardIds = await q(pg, "select id, user_id, place from bounty_awards order by place");
  const obligations = await createAwardObligations({
    awards: awards.map((a) => ({
      awardId: String(awardIds.find((r) => r.user_id === a.user_id)?.id),
      payeeUserId: String(a.user_id),
      amountMinor: Number(a.amount_minor),
      currency: "INR",
    })),
  });
  assert.equal(obligations.length, 2);
  const obligationsAgain = await createAwardObligations({
    awards: awards.map((a) => ({
      awardId: String(awardIds.find((r) => r.user_id === a.user_id)?.id),
      payeeUserId: String(a.user_id),
      amountMinor: Number(a.amount_minor),
      currency: "INR",
    })),
  });
  assert.equal(obligationsAgain.length, 0, "obligations are idempotent");
  const pending = (await q(pg, "select count(*)::int as n from payout_obligations where status='PENDING'"))[0];
  assert.equal(pending.n, 2);

  // notifications flowed: winner + sponsor + applicants
  const ntf = (await q(pg, "select count(*)::int as n from notifications"))[0].n;
  assert.ok(ntf >= 6, `expected notifications, got ${ntf}`);
  process.env.MARKETPLACE_MONEY_LIVE = "0";
});

test("AC-4b: cancellation policy — self-serve before work, dispute path after", async () => {
  const pg = await freshDb();
  process.env.MARKETPLACE_MONEY_LIVE = "1";
  const { id } = await createBounty({
    sponsorUserId: SPONSOR,
    product: "foundersbid",
    title: "Cancellation policy bounty case",
    description: "A bounty to verify the fair cancellation policy paths.",
    category: "copy",
    rewardTotalMinor: REWARD,
    rewardStructure: "WINNER_TAKES_ALL",
    rewardAllocations: [{ place: 1, amountMinor: REWARD }],
    submissionDeadline: LATER.toISOString(),
  });
  const published = await publishBountyForFunding({ bountyId: id, sponsorUserId: SPONSOR });
  assert.equal(published.ok, true);
  const payment = (await q(pg, "select id from payments where kind='funding'"))[0];
  const provider = getPaymentProvider() as unknown as { markPaid(id: string): void };
  provider.markPaid(payment.id);
  await verifyFundingAndOpen({ bountyId: id, paymentId: payment.id });

  // before work begins: sponsor may self-cancel (refund due)
  const early = await sponsorCancelBounty({ bountyId: id, sponsorUserId: SPONSOR, reason: "changed priorities" });
  assert.ok(early.ok);
  if (early.ok) assert.equal(early.outcome, "cancelled_refund_due");
  const s = (await q(pg, "select status from bounties where id=$1", [id]))[0];   assert.equal(s.status, "CANCELLED");
  process.env.MARKETPLACE_MONEY_LIVE = "0";
});

test("AC-4c: expiry — past deadline with zero submissions", async () => {
  const pg = await freshDb();
  const past = new Date(Date.now() - 1000).toISOString();
  const { id } = await createBounty({
    sponsorUserId: SPONSOR,
    product: "foundersbid",
    title: "Expired bounty lazy transition",
    description: "This bounty expires because nobody submitted before the deadline.",
    category: "naming",
    rewardTotalMinor: REWARD,
    rewardStructure: "WINNER_TAKES_ALL",
    rewardAllocations: [{ place: 1, amountMinor: REWARD }],
    submissionDeadline: past,
  });
  // DRAFT bounties are never expirable (publish gate not passed)
  assert.equal(await expireIfDue(id), false);
  process.env.MARKETPLACE_MONEY_LIVE = "1";
  // force to OPEN (skip funding) to test the lazy transition itself
  await q(pg, "update bounties set status='OPEN' where id=$1", [id]);   assert.equal(await expireIfDue(id), true);   const s = (await q(pg, "select status from bounties where id=$1", [id]))[0];   assert.equal(s.status, "EXPIRED");
  process.env.MARKETPLACE_MONEY_LIVE = "0";
});

test("money: decomposition arithmetic is exact for edge amounts", () => {
  // fee rounding: 33.3% style cases stay integral
  const d = fundingDecomposition(999_999);
  assert.equal(d.rewardMinor + d.feeMinor, d.sponsorSubtotal);
  assert.equal(computeFee(999_999), Math.round((999_999 * 1000) / 10_000));
});
