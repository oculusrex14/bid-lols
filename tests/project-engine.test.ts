import { test } from "node:test";
import assert from "node:assert/strict";
import { getPglite } from "../src/lib/db.server";

process.env.PAYMENT_PROVIDER = "fake";
process.env.MARKETPLACE_MONEY_LIVE = "1";

const {
  createProject,
  publishProject,
  verifyProjectFunding,
  fundProject,
  selectProposal,
  submitProposal,
} = await import("../src/lib/marketplace/projects.server");
const { getPaymentProvider } = await import("../src/lib/payments/provider");

const SPONSOR = "usr_proj_sponsor";
const PROVIDER = "usr_proj_provider";

async function freshDb(): Promise<import("@electric-sql/pglite").PGlite> {
  const pg = await getPglite();
  await pg.query(
    "truncate bounties, bounty_applications, bounty_participants, bounty_submissions, bounty_awards, projects, project_proposals, project_milestones, money_events, payout_obligations, payments, users, notifications restart identity cascade",
  );
  await pg.query(
    "insert into users (id, email, email_verified) values ($1,'ps@t',true), ($2,'pp@t',true)",
    [SPONSOR, PROVIDER],
  );
  return pg;
}

/* eslint-disable @typescript-eslint/no-explicit-any -- test ergonomics */
async function q(
  pg: import("@electric-sql/pglite").PGlite,
  text: string,
  params: unknown[] = [],
): Promise<Record<string, any>[]> {
  const res = await pg.query<Record<string, unknown>>(text, params as unknown[]);
  return res.rows as Record<string, any>[];
}

test("FR-5: project flow — publish, propose, sum-checked select, fund, milestone active", async () => {
  const pg = await freshDb();
  const { id } = await createProject({
    sponsorUserId: SPONSOR,
    product: "foundersbid",
    title: "Build an MVP billing dashboard project",
    description: "We need a billing dashboard MVP with usage-based invoicing for our automation product.",
    category: "development",
  });

  // sponsor cannot propose on own project
  const selfProposal = await submitProposal({
    projectId: id,
    providerUserId: SPONSOR,
    approach: "I will design and build the whole dashboard myself very quickly.",
    quotedMinor: 100_000,
    milestonesProposed: [{ title: "M1", amountMinor: 100_000 }],
  });
  assert.equal(selfProposal.ok, false);

  assert.ok((await publishProject({ projectId: id, sponsorUserId: SPONSOR })).ok);

  const proposal = await submitProposal({
    projectId: id,
    providerUserId: PROVIDER,
    approach: "Phase 1: data model + API. Phase 2: UI. Phase 3: QA handoff.",
    experience: "Built three billing systems.",
    quotedMinor: 200_000,
    timelineWeeks: 4,
    milestonesProposed: [
      { title: "Data model + API", amountMinor: 120_000 },
      { title: "UI build", amountMinor: 80_000 },
    ],
  });
  assert.ok(proposal.ok, JSON.stringify(proposal));

  // select refuses when milestones don't sum to the quote
  await pg.query(
    "update project_proposals set milestones_proposed = $1::jsonb",
    [JSON.stringify([{ title: "M1", amountMinor: 100_000 }, { title: "M2", amountMinor: 50_000 }])],
  );
  const proposalId = (await q(pg, "select id from project_proposals"))[0].id as string;
  const badSelect = await selectProposal({
    projectId: id,
    proposalId,
    sponsorUserId: SPONSOR,
  });
  assert.equal(badSelect.ok, false);
  if (!badSelect.ok) assert.match(badSelect.message, /milestones sum/);

  // correct milestones -> select succeeds
  await pg.query(
    "update project_proposals set milestones_proposed = $1::jsonb",
    [JSON.stringify([{ title: "Data model + API", amountMinor: 120_000 }, { title: "UI build", amountMinor: 80_000 }])],
  );
  const select = await selectProposal({ projectId: id, proposalId, sponsorUserId: SPONSOR });
  assert.ok(select.ok, JSON.stringify(select));

  const milestones = await q(pg, "select seq, status, amount_minor from project_milestones order by seq");
  assert.equal(milestones.length, 2);
  assert.equal(Number(milestones[0].amount_minor), 120_000);

  // fund via the fake provider: subtotal = quote + fee
  const fund = await fundProject({ projectId: id, sponsorUserId: SPONSOR });
  assert.ok(fund.ok, JSON.stringify(fund));
  const payment = (await q(pg, "select id, amount_cents, status from payments where kind='funding'"))[0];
  assert.equal(Number(payment.amount_cents), 220_000, "2000.00 quoted + 10% fee = 2200.00");
  assert.equal(String(payment.status), "pending");

  (getPaymentProvider() as unknown as { markPaid(id: string): void }).markPaid(String(payment.id));
  const verify = await verifyProjectFunding({ projectId: id, paymentId: String(payment.id) });
  assert.equal(verify, "active");

  const project = (await q(pg, "select status from projects where id=$1", [id]))[0];
  assert.equal(String(project.status), "ACTIVE");
  const ms = await q(pg, "select seq, status from project_milestones order by seq");
  assert.equal(String(ms[0].status), "ACTIVE");
  assert.equal(String(ms[1].status), "PENDING");

  const ledger = await q(pg, "select type, amount_minor from money_events order by created_at");
  const reward = ledger.find((e) => e.type === "REWARD");
  const fee = ledger.find((e) => e.type === "PLATFORM_FEE");
  assert.ok(reward && fee, "REWARD and PLATFORM_FEE events exist");
  assert.equal(Number(reward.amount_minor) + Number(fee.amount_minor), 220_000);
  process.env.MARKETPLACE_MONEY_LIVE = "0";
});