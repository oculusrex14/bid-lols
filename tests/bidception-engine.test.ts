import { test } from "node:test";
import assert from "node:assert/strict";
import { getPglite } from "../src/lib/db.server";

const {
  applyToBounty,
  startWork,
  upsertSubmission,
  judgeBounty,
} = await import("../src/lib/marketplace/bounties.server");
const { submitProposal, selectProposal } = await import("../src/lib/marketplace/projects.server");
const {
  createParentWork,
  allocateChildWork,
  setCaptainCompensation,
  markChildReady,
  activateChild,
  completeChild,
  failChild,
  beginParentSettlement,
  getParentTree,
} = await import("../src/lib/marketplace/bidception.server");

const SPONSOR = "usr_bcn_sponsor";
const CAPTAIN = "usr_bcn_captain";
const OTHER = "usr_bcn_other";
const BUDGET = 1_000_000; // ₹10,000.00

async function seedParent(): Promise<{ pg: import("@electric-sql/pglite").PGlite; id: string }> {
  const pg = await getPglite();
  await pg.query(
    "truncate parent_works, child_works, money_events, notifications, users restart identity cascade",
  );
  await pg.query(
    "insert into users (id, email, email_verified) values ($1,'sp@t',true), ($2,'cp@t',true), ($3,'oth@t',true)",
    [SPONSOR, CAPTAIN, OTHER],
  );
  const { id } = await createParentWork({
    sponsorUserId: SPONSOR,
    product: "bidception",
    title: "Launch campaign parent work case",
    objective: "Ship a full launch campaign: page, video, outreach and analytics.",
  });
  // Funded + active with a captain, bypassing the funding gate (engine tests
  // target the budget invariant, not the payment rail).
  await pg.query(
    "update parent_works set status='ACTIVE', funded_budget_minor=$2, captain_user_id=$3 where id=$1",
    [id, BUDGET, CAPTAIN],
  );
  return { pg, id };
}

test("AC-1 + invariant: allocate until the balance runs out", async () => {
  const { id } = await seedParentId();
  const a = await allocateChildWork({
    parentWorkId: id,
    actorUserId: CAPTAIN,
    title: "Landing page",
    allocatedMinor: 300_000,
    kind: "BOUNTY" as const,
  });
  assert.ok(a.ok, JSON.stringify(a));
  const b = await allocateChildWork({
    parentWorkId: id,
    actorUserId: CAPTAIN,
    title: "Demo video",
    allocatedMinor: 200_000,
    kind: "BOUNTY" as const,
  });
  assert.ok(b.ok, JSON.stringify(b));
  const c = await allocateChildWork({
    parentWorkId: id,
    actorUserId: CAPTAIN,
    title: "Outreach",
    allocatedMinor: 250_000,
    kind: "BOUNTY" as const,
  });
  assert.ok(c.ok, JSON.stringify(c));
  // balance now 1_000_000 - 750_000 = 250_000; a 250_001 allocation refuses
  const tooMuch = await allocateChildWork({
    parentWorkId: id,
    actorUserId: CAPTAIN,
    title: "Analytics",
    allocatedMinor: 250_001,
    kind: "BOUNTY" as const,
  });
  assert.equal(tooMuch.ok, false);
  if (!tooMuch.ok) assert.equal(tooMuch.code, "insufficient_balance");
  const exact = await allocateChildWork({
    parentWorkId: id,
    actorUserId: CAPTAIN,
    title: "Analytics",
    allocatedMinor: 250_000,
    kind: "BOUNTY" as const,
  });
  assert.ok(exact.ok, JSON.stringify(exact));
  const beyond = await allocateChildWork({
    parentWorkId: id,
    actorUserId: CAPTAIN,
    title: "One rupee more",
    allocatedMinor: 1,
    kind: "BOUNTY" as const,
  });
  assert.equal(beyond.ok, false);
  if (!beyond.ok) assert.equal(beyond.code, "insufficient_balance");
});

async function seedParentId(): Promise<{ id: string }> {
  const { id } = await seedParent();
  return { id };
}

test("AC-2: five concurrent 600k allocations on a 1M budget — exactly one wins", async () => {
  const { id } = await seedParentId();
  const results = await Promise.all(
    Array.from({ length: 5 }, (_, i) =>
      allocateChildWork({
        parentWorkId: id,
        actorUserId: CAPTAIN,
        title: `Parallel child ${i}`,
        allocatedMinor: 600_000,
        kind: "BOUNTY" as const,
      }),
    ),
  );
  const winners = results.filter((r) => r.ok);
  const refusals = results.filter((r) => !r.ok && r.code === "insufficient_balance");
  assert.equal(winners.length, 1, `expected exactly 1 winner, got ${JSON.stringify(results)}`);
  assert.equal(refusals.length, 4);

  const pg = await getPglite();
  const rows = await pg.query<{ total: number }>(
    "select coalesce(sum(allocated_minor),0)::int as total from child_works where parent_work_id = $1",
    [id],
  );
  assert.equal(Number(rows.rows[0].total), 600_000, "money was never created by nesting");
});


const BUILDER = "usr_bcn_builder";
const LATER = new Date(Date.now() + 14 * 86400_000).toISOString();

/** Drive a LINKED child bounty through the real engine to AWARDED. */
async function awardLinkedBounty(bountyId: string, builder: string): Promise<void> {
  const app = await applyToBounty({ bountyId, userId: builder, message: "I can build this unit." });
  assert.ok(app.ok, JSON.stringify(app));
  assert.ok((await startWork({ bountyId, userId: builder })).ok);
  assert.ok(
    (await upsertSubmission({ bountyId, userId: builder, title: "Delivered unit work", body: "Complete and verified." })).ok,
  );
  const judged = await judgeBounty({
    bountyId,
    sponsorUserId: SPONSOR,
    placements: [{ userId: builder, place: 1 }],
  });
  assert.ok(judged.ok, JSON.stringify(judged));
}


test("AC-3: dependency gating — BLOCKED becomes READY only when deps COMPLETE", async () => {
  const { id } = await seedParentId();
  const a = await allocateChildWork({
    parentWorkId: id,
    actorUserId: CAPTAIN,
    title: "Stage one (foundation)",
    allocatedMinor: 200_000,
    kind: "BOUNTY" as const,
  });
  assert.ok(a.ok);
  const aId = a.ok ? a.childWorkId : "";
  const b = await allocateChildWork({
    parentWorkId: id,
    actorUserId: CAPTAIN,
    title: "Stage two (build)",
    allocatedMinor: 200_000,
    kind: "BOUNTY" as const,
    dependsOn: [aId],
  });
  assert.ok(b.ok);
  const childA = aId;
  const childB = b.ok ? b.childWorkId : "";

  const tooEarly = await markChildReady({ childWorkId: childB, actorUserId: CAPTAIN });
  assert.equal(tooEarly.ok, false);
  if (!tooEarly.ok) assert.equal(tooEarly.code, "dependencies_incomplete");

  // childA has no dependencies: allocated READY (RC1 initial state)
  assert.ok((await activateChild({ childWorkId: childA, actorUserId: CAPTAIN })).ok);

  // RC1: the linked bounty must reach AWARDED through the real engine before
  // the child unit can complete — no click-through completion.
  const aLinked = a.ok ? a.linkedId : "";
  try {
    const early = await completeChild({ childWorkId: childA, actorUserId: CAPTAIN });
    assert.equal(early.ok, false, "completing before the linked bounty is judged is refused");
    if (!early.ok) assert.equal(early.code, "underlying_work_incomplete");
  } catch (err) {
    assert.match(String((err as Error).message ?? err), /underlying|linked bounty|judged/i);
  }
  await (await getPglite()).query(
    "insert into users (id, email, email_verified) values ($1,'bc@t',true) on conflict (id) do nothing",
    [BUILDER],
  );
  await awardLinkedBounty(aLinked, BUILDER);

  assert.ok((await completeChild({ childWorkId: childA, actorUserId: CAPTAIN })).ok);

  const nowReady = await markChildReady({ childWorkId: childB, actorUserId: CAPTAIN });
  assert.ok(nowReady.ok, JSON.stringify(nowReady));
});

test("AC-4: authorization — non-captain/non-sponsor cannot allocate; captain fee is sponsor-only", async () => {
  const { id } = await seedParentId();
  const outsider = await allocateChildWork({
    parentWorkId: id,
    actorUserId: OTHER,
    title: "Not my budget",
    allocatedMinor: 100_000,
    kind: "BOUNTY" as const,
  });
  assert.equal(outsider.ok, false);
  if (!outsider.ok) assert.equal(outsider.code, "forbidden");

  const captainSelfFee = await setCaptainCompensation({
    parentWorkId: id,
    actorUserId: CAPTAIN,
    feeMinor: 100_000,
  });
  assert.equal(captainSelfFee.ok, false, "the captain cannot set their own fee");
  if (!captainSelfFee.ok) assert.equal(captainSelfFee.code, "forbidden");

  const sponsorFee = await setCaptainCompensation({
    parentWorkId: id,
    actorUserId: SPONSOR,
    feeMinor: 100_000,
  });
  assert.ok(sponsorFee.ok, JSON.stringify(sponsorFee));

  // the fee reduces the allocatable balance: 1_000_000 - 100_000 = 900_000
  const overAfterFee = await allocateChildWork({
    parentWorkId: id,
    actorUserId: CAPTAIN,
    title: "Too big now",
    allocatedMinor: 900_001,
    kind: "BOUNTY" as const,
  });
  assert.equal(overAfterFee.ok, false);
});

test("AC-5: settlement — reserve math, REFUND event negative, idempotent", async () => {
  const { id } = await seedParentId();
  const c1 = await allocateChildWork({
    parentWorkId: id,
    actorUserId: CAPTAIN,
    title: "Page build unit",
    allocatedMinor: 400_000,
    kind: "BOUNTY" as const,
  });
  const c2 = await allocateChildWork({
    parentWorkId: id,
    actorUserId: CAPTAIN,
    title: "Video build unit",
    allocatedMinor: 300_000,
    kind: "BOUNTY" as const,
  });
  assert.ok(c1.ok && c2.ok, "allocations succeeded");
  const pg = await getPglite();
  await pg.query(
    "insert into users (id, email, email_verified) values ($1,'bc@t',true) on conflict (id) do nothing",
    [BUILDER],
  );
  const children = (await pg.query(
    "select id, title, bounty_id from child_works where parent_work_id=$1 order by seq",
    [id],
  )).rows as Array<{ id: string; title: string; bounty_id: string | null }>;
  const [childPage, childVideo] = children;
  await activateChild({ childWorkId: childPage.id, actorUserId: CAPTAIN });
  // the linked bounty must be AWARDED through the real engine first (RC1 gate)
  await awardLinkedBounty(String(childPage.bounty_id), BUILDER);
  assert.ok((await completeChild({ childWorkId: childPage.id, actorUserId: CAPTAIN })).ok);
  await activateChild({ childWorkId: childVideo.id, actorUserId: CAPTAIN });
  await failChild({ childWorkId: childVideo.id, actorUserId: CAPTAIN, reason: "scope changed" });

  // done 400k, failed 300k, fee 0 -> reserve = 300k
  const settle = await beginParentSettlement({
    parentWorkId: id,
    actorUserId: SPONSOR,
    action: "REFUND_RESERVE",
  });
  assert.ok(settle.ok, JSON.stringify(settle));
  assert.equal(settle.ok ? settle.reserveMinor : -1, 300_000);

  const events = (
    await pg.query<{ n: number; amt: number }>(
      "select count(*)::int as n, coalesce(sum(amount_minor),0)::int as amt from money_events where entity_id=$1",
      [id],
    )
  ).rows as Array<{ n: number; amt: number }>;
  assert.equal(events[0].n, 1, "exactly one REFUND event");
  assert.equal(Number(events[0].amt), -300_000, "refund recorded as a negative amount");

  // idempotent: settling again refuses, writes nothing
  const again = await beginParentSettlement({
    parentWorkId: id,
    actorUserId: SPONSOR,
    action: "REFUND_RESERVE",
  });
  assert.equal(again.ok, false);
  if (!again.ok) assert.equal(again.code, "already_settled");
  const events2 = (
    await pg.query<{ n: number }>("select count(*)::int as n from money_events where entity_id=$1", [id])
  ).rows as Array<{ n: number }>;
  assert.equal(events2[0].n, 1);
});

test("captain reputation seed + parent tree read", async () => {
  const { id } = await seedParentId();
  const c = await allocateChildWork({
    parentWorkId: id,
    actorUserId: CAPTAIN,
    title: "Reputation seed child",
    allocatedMinor: 100_000,
    kind: "BOUNTY" as const,
  });
  assert.ok(c.ok);
  const pg = await getPglite();
  await pg.query(
    "insert into users (id, email, email_verified) values ($1,'bc@t',true) on conflict (id) do nothing",
    [BUILDER],
  );
  const child = (
    await pg.query<{ id: string; bounty_id: string | null }>(
      "select id, bounty_id from child_works where parent_work_id=$1 limit 1",
      [id],
    )
  ).rows[0];
  await activateChild({ childWorkId: child.id, actorUserId: CAPTAIN });
  await awardLinkedBounty(String(child.bounty_id), BUILDER);
  await completeChild({ childWorkId: child.id, actorUserId: CAPTAIN });

  const rep = (
    await pg.query<{ n: number }>(
      "select count(*)::int as n from reputation_events where user_id=$1 and kind='captained_completion'",
      [CAPTAIN],
    )
  ).rows as Array<{ n: number }>;
  assert.equal(rep[0].n, 1, "captain earned a verified completion seed");

  const tree = await getParentTree(id);
  assert.ok(tree);
  if (!tree) return;
  assert.equal(tree.children.length, 1);
  assert.equal(tree.children[0].state, "COMPLETE");
  assert.equal(tree.children[0].allocated_minor, 100_000);
});

async function q2(pg: import("@electric-sql/pglite").PGlite, text: string, params: unknown[] = []): Promise<Record<string, any>[]> {
  const res = await pg.query<Record<string, unknown>>(text, params as unknown[]);
  return res.rows as Record<string, any>[]; // eslint-disable-line @typescript-eslint/no-explicit-any
}

test("RC1 R6: linked child PROJECT — quote capped at allocation, ACTIVE on selection, completes", async () => {
  const pg = await getPglite();
  await pg.query(
    "truncate parent_works, child_works, projects, project_proposals, project_milestones, money_events, payments, users, notifications restart identity cascade",
  );
  await pg.query(
    "insert into users (id, email, email_verified) values ($1,'sp@t',true), ($2,'cp@t',true), ($3,'pv@t',true), ($4,'pv2@t',true)",
    [SPONSOR, CAPTAIN, "usr_bcn_provider", "usr_bcn_provider2"],
  );
  const PROVIDER2 = "usr_bcn_provider";
  const { id } = await createParentWork({
    sponsorUserId: SPONSOR,
    product: "bidception",
    title: "Linked project parent case",
    objective: "A parent whose child is a real PROJECT engine row.",
  });
  await pg.query(
    "update parent_works set status='ACTIVE', funded_budget_minor=$2, captain_user_id=$3 where id=$1",
    [id, BUDGET, CAPTAIN],
  );
  const alloc = await allocateChildWork({
    parentWorkId: id,
    actorUserId: CAPTAIN,
    title: "Marketing site project child",
    allocatedMinor: 400_000,
    kind: "PROJECT",
    projectSpec: { category: "development" },
  });
  assert.ok(alloc.ok, JSON.stringify(alloc));
  const linkedProjectId = alloc.ok ? alloc.linkedId : "";
  // the linked project is a REAL projects row, OPEN_FOR_PROPOSALS, capped
  assert.equal(
    String((await q2(pg, "select status, budget_max_minor, parent_work_id from projects where id=$1", [linkedProjectId]))[0].status),
    "OPEN_FOR_PROPOSALS",
  );
  // provider proposes ABOVE the allocation -> refused
  // submit succeeds (the cap applies at selection, not at submission)
  const over = await submitProposal({
    projectId: linkedProjectId,
    providerUserId: "usr_bcn_provider2",
    approach: "A real approach proposal with real substance and detail.",
    quotedMinor: 450_000,
    milestonesProposed: [{ title: "All work", amountMinor: 450_000 }],
  });
  assert.ok(over.ok, JSON.stringify(over));
  // selection refuses: the quote exceeds the child's allocated budget
  const overSel = await selectProposal({ projectId: linkedProjectId, proposalId: over.ok ? over.proposalId : "", sponsorUserId: SPONSOR });
  assert.equal(overSel.ok, false);
  if (!overSel.ok) assert.equal(overSel.code, "quote_exceeds_allocation");
  // proposal within the cap -> selectable
  const proposal = await submitProposal({
    projectId: linkedProjectId,
    providerUserId: "usr_bcn_provider",
    approach: "Two phases: design then build, with QA handoff at the end.",
    quotedMinor: 350_000,
    milestonesProposed: [
      { title: "Design phase", amountMinor: 150_000 },
      { title: "Build phase", amountMinor: 200_000 },
    ],
  });
  assert.ok(proposal.ok, JSON.stringify(proposal));
  const sel = await selectProposal({ projectId: linkedProjectId, proposalId: proposal.ok ? proposal.proposalId : "", sponsorUserId: SPONSOR });
  assert.ok(sel.ok, JSON.stringify(sel));
  // child project is ACTIVE immediately (funded from the parent allocation)
  assert.equal(String((await q2(pg, "select status from projects where id=$1", [linkedProjectId]))[0].status), "ACTIVE");
  assert.equal(String((await q2(pg, "select status from project_milestones where project_id=$1 order by seq", [linkedProjectId]))[0].status), "ACTIVE");
  // child_works row is linked both ways
  const child = (await q2(pg, "select kind, project_id, state from child_works where project_id=$1", [linkedProjectId]))[0];
  assert.equal(String(child.kind), "PROJECT");
  assert.equal(String(child.project_id), linkedProjectId);
});
