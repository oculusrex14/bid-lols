import { test } from "node:test";
import assert from "node:assert/strict";
import { getPglite } from "../src/lib/db.server";

process.env.PAYMENT_PROVIDER = "fake";
process.env.MARKETPLACE_MONEY_LIVE = "1";

const {
  createProject,
  publishProject,
  submitProposal,
  selectProposal,
  fundProject,
  verifyProjectFunding,
  submitMilestone,
  decideMilestone,
  completeProject,
} = await import("../src/lib/marketplace/projects.server");
const { createReview } = await import("../src/lib/marketplace/reviews.server");
const { getPaymentProvider } = await import("../src/lib/payments/provider");

const SPONSOR = "usr_prj_lifecycle_sponsor";
const PROVIDER = "usr_prj_lifecycle_provider";
const WRONG = "usr_prj_lifecycle_wrong";
const QUOTE = 200_000; // ₹2,000.00

type AnyRow = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

async function q(pg: import("@electric-sql/pglite").PGlite, text: string, params: unknown[] = []): Promise<AnyRow[]> {
  const res = await pg.query<Record<string, unknown>>(text, params as unknown[]);
  return res.rows as AnyRow[];
}

async function seed() {
  const pg = await getPglite();
  await pg.query(
    "truncate bounties, bounty_applications, bounty_participants, bounty_submissions, bounty_awards, projects, project_proposals, project_milestones, money_events, payout_obligations, reviews, reputation_events, payments, users, notifications restart identity cascade",
  );
  await pg.query(
    "insert into users (id, email, email_verified) values ($1,'ps@t',true), ($2,'pp@t',true), ($3,'wp@t',true)",
    [SPONSOR, PROVIDER, WRONG],
  );
  return pg;
}

test("RC1 R1: full project lifecycle — no manual state skips", async () => {
  const pg = await seed();

  // 1. sponsor creates + publishes
  const { id } = await createProject({
    sponsorUserId: SPONSOR,
    product: "foundersbid",
    title: "RC1 lifecycle dashboard project",
    description: "A billing dashboard project that walks the entire Mode B lifecycle end to end.",
    category: "development",
  });
  assert.ok((await publishProject({ projectId: id, sponsorUserId: SPONSOR })).ok);

  // 2. provider proposes (milestones sum to the quote)
  const proposal = await submitProposal({
    projectId: id,
    providerUserId: PROVIDER,
    approach: "Data model and API first, then UI, then QA handoff with docs.",
    quotedMinor: QUOTE,
    timelineWeeks: 6,
    milestonesProposed: [
      { title: "Data model + API", amountMinor: 120_000 },
      { title: "UI build", amountMinor: 80_000 },
    ],
  });
  assert.ok(proposal.ok, JSON.stringify(proposal));
  const proposalId = proposal.ok ? proposal.proposalId : "";

  // 3. sponsor selects -> milestones materialized
  assert.ok((await selectProposal({ projectId: id, proposalId, sponsorUserId: SPONSOR })).ok);
  const milestones = (await q(pg, "select id, seq, status, amount_minor from project_milestones where project_id=$1 order by seq", [id])) as AnyRow[];
  assert.equal(milestones.length, 2);
  assert.equal(String(milestones[0].status), "PENDING");

  // 4. funding through the fake provider (the real path — no status writes)
  const fund = await fundProject({ projectId: id, sponsorUserId: SPONSOR });
  assert.ok(fund.ok, JSON.stringify(fund));
  const payment = (await q(pg, "select id, amount_cents from payments where kind='funding'"))[0];
  assert.equal(Number(payment.amount_cents), 220_000, "quote 2000.00 + 10% fee = 2200.00");
  (getPaymentProvider() as unknown as { markPaid(id: string): void }).markPaid(String(payment.id));
  const verified = await verifyProjectFunding({ projectId: id, paymentId: String(payment.id) });
  assert.equal(verified, "active");
  // provider re-verification is authoritative: a second call cannot move state
  assert.equal(await verifyProjectFunding({ projectId: id, paymentId: String(payment.id) }), "alreadyActive");
  const m1 = milestones[0];
  const m2 = milestones[1];
  assert.equal(String((await q(pg, "select status from project_milestones where id=$1", [m1.id]))[0].status), "ACTIVE");
  assert.equal(String((await q(pg, "select status from project_milestones where id=$1", [m2.id]))[0].status), "PENDING");

  // 5. PENDING milestone cannot be submitted
  const pendingReject = await submitMilestone({ milestoneId: String(m2.id), userId: PROVIDER });
  assert.equal(pendingReject.ok, false, "PENDING milestone cannot be submitted");

  // 6. wrong provider cannot submit
  const wrongProvider = await submitMilestone({ milestoneId: String(m1.id), userId: WRONG });
  assert.equal(wrongProvider.ok, false, "the selected provider is the only one who can submit");

  // 7. provider submits m1; sponsor REJECTS with feedback; provider resubmits
  assert.ok((await submitMilestone({ milestoneId: String(m1.id), userId: PROVIDER, notes: "API slice 1" })).ok);
  const rejected = await decideMilestone({ milestoneId: String(m1.id), sponsorUserId: SPONSOR, decision: "REJECT", feedback: "Needs the usage-based edge case" });
  assert.ok(rejected.ok, JSON.stringify(rejected));
  assert.equal(String(rejected.ok ? rejected.status : ""), "REJECTED");
  assert.ok((await submitMilestone({ milestoneId: String(m1.id), userId: PROVIDER, notes: "Fixed" })).ok, "resubmission after rejection works");

  // 8. non-sponsor cannot decide
  const notSponsor = await decideMilestone({ milestoneId: String(m1.id), sponsorUserId: PROVIDER, decision: "APPROVE" });
  assert.equal(notSponsor.ok, false);

  // 9. sponsor approves m1 -> m2 ACTIVE
  assert.ok((await decideMilestone({ milestoneId: String(m1.id), sponsorUserId: SPONSOR, decision: "APPROVE" })).ok);
  assert.equal(String((await q(pg, "select status from project_milestones where id=$1", [m2.id]))[0].status), "ACTIVE");

  // 10. duplicate decision safely rejected
  const dup = await decideMilestone({ milestoneId: String(m1.id), sponsorUserId: SPONSOR, decision: "APPROVE" });
  assert.equal(dup.ok, false, "second decision on an approved milestone is rejected");

  // 11. m2 submit + approve -> COMPLETION_REVIEW
  assert.ok((await submitMilestone({ milestoneId: String(m2.id), userId: PROVIDER })).ok);
  assert.ok((await decideMilestone({ milestoneId: String(m2.id), sponsorUserId: SPONSOR, decision: "APPROVE" })).ok);
  assert.equal(String((await q(pg, "select status from projects where id=$1", [id]))[0].status), "COMPLETION_REVIEW");

  // 12. reviews still gated: project not COMPLETED yet (createReview throws)
  await assert.rejects(
    () =>
      createReview({
        workType: "PROJECT",
        workId: id,
        reviewerUserId: SPONSOR,
        direction: "SPONSOR_TO_PROVIDER",
        quality: 5,
      }),
    /work_not_completed|Reviews unlock|work completes/i,
  );

  // 13. completion
  const completed = await completeProject({ projectId: id, sponsorUserId: SPONSOR });
  assert.ok(completed.ok, JSON.stringify(completed));
  assert.equal(String((await q(pg, "select status from projects where id=$1", [id]))[0].status), "COMPLETED");
  const rep = (await q(pg, "select count(*)::int as n from reputation_events where user_id=$1 and kind='project_completed'", [PROVIDER]))[0];
  assert.equal(Number(rep.n), 1, "verified-outcome seed written for the provider");

  // 14. review now allowed both directions
  const s2p = await createReview({
    workType: "PROJECT",
    workId: id,
    reviewerUserId: SPONSOR,
    direction: "SPONSOR_TO_PROVIDER",
    quality: 5,
    communication: 4,
    body: "Delivered on time.",
  });
  assert.ok(s2p.id, "sponsor->provider review allowed post-completion");
  const p2s = await createReview({
    workType: "PROJECT",
    workId: id,
    reviewerUserId: PROVIDER,
    direction: "PROVIDER_TO_SPONSOR",
    quality: 4,
    body: "Clear brief.",
  });
  assert.ok(p2s.id, "provider->sponsor review allowed post-completion");
  // unique per reviewer per work
  await assert.rejects(
    () =>
      createReview({
        workType: "PROJECT",
        workId: id,
        reviewerUserId: SPONSOR,
        direction: "SPONSOR_TO_PROVIDER",
        quality: 5,
      }),
    /unique|violates/i,
  );

  // 15. milestone amounts reconcile exactly to the selected quote
  const total = (await q(pg, "select coalesce(sum(amount_minor),0)::int as s from project_milestones where project_id=$1", [id]))[0];
  assert.equal(Number(total.s), QUOTE, "milestones sum exactly to the quoted amount");
});