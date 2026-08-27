import { test } from "node:test";
import assert from "node:assert/strict";
import { getPglite } from "../src/lib/db.server";

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
  });
  assert.ok(a.ok, JSON.stringify(a));
  const b = await allocateChildWork({
    parentWorkId: id,
    actorUserId: CAPTAIN,
    title: "Demo video",
    allocatedMinor: 200_000,
  });
  assert.ok(b.ok, JSON.stringify(b));
  const c = await allocateChildWork({
    parentWorkId: id,
    actorUserId: CAPTAIN,
    title: "Outreach",
    allocatedMinor: 250_000,
  });
  assert.ok(c.ok, JSON.stringify(c));
  // balance now 1_000_000 - 750_000 = 250_000; a 250_001 allocation refuses
  const tooMuch = await allocateChildWork({
    parentWorkId: id,
    actorUserId: CAPTAIN,
    title: "Analytics",
    allocatedMinor: 250_001,
  });
  assert.equal(tooMuch.ok, false);
  if (!tooMuch.ok) assert.equal(tooMuch.code, "insufficient_balance");
  const exact = await allocateChildWork({
    parentWorkId: id,
    actorUserId: CAPTAIN,
    title: "Analytics",
    allocatedMinor: 250_000,
  });
  assert.ok(exact.ok, JSON.stringify(exact));
  const beyond = await allocateChildWork({
    parentWorkId: id,
    actorUserId: CAPTAIN,
    title: "One rupee more",
    allocatedMinor: 1,
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

test("AC-3: dependency gating — BLOCKED becomes READY only when deps COMPLETE", async () => {
  const { id } = await seedParentId();
  const a = await allocateChildWork({
    parentWorkId: id,
    actorUserId: CAPTAIN,
    title: "Stage one (foundation)",
    allocatedMinor: 200_000,
  });
  assert.ok(a.ok);
  const aId = a.ok ? a.childWorkId : "";
  const b = await allocateChildWork({
    parentWorkId: id,
    actorUserId: CAPTAIN,
    title: "Stage two (build)",
    allocatedMinor: 200_000,
    dependsOn: [aId],
  });
  assert.ok(b.ok);
  const childA = aId;
  const childB = b.ok ? b.childWorkId : "";

  const tooEarly = await markChildReady({ childWorkId: childB, actorUserId: CAPTAIN });
  assert.equal(tooEarly.ok, false);
  if (!tooEarly.ok) assert.equal(tooEarly.code, "dependencies_incomplete");

  assert.ok((await markChildReady({ childWorkId: childA, actorUserId: CAPTAIN })).ok);
  assert.ok((await activateChild({ childWorkId: childA, actorUserId: CAPTAIN })).ok);
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
  });
  assert.equal(overAfterFee.ok, false);
});

test("AC-5: settlement — reserve math, REFUND event negative, idempotent", async () => {
  const { id } = await seedParentId();
  const c1 = await allocateChildWork({
    parentWorkId: id,
    actorUserId: CAPTAIN,
    title: "Page",
    allocatedMinor: 400_000,
  });
  const c2 = await allocateChildWork({
    parentWorkId: id,
    actorUserId: CAPTAIN,
    title: "Video",
    allocatedMinor: 300_000,
  });
  assert.ok(c1.ok && c2.ok, "allocations succeeded");
  const pg = await getPglite();
  const children = (await pg.query(
    "select id, title from child_works where parent_work_id=$1 order by seq",
    [id],
  )).rows as Array<{ id: string; title: string }>;
  const [childPage, childVideo] = children;
  await markChildReady({ childWorkId: childPage.id, actorUserId: CAPTAIN });
  await activateChild({ childWorkId: childPage.id, actorUserId: CAPTAIN });
  await completeChild({ childWorkId: childPage.id, actorUserId: CAPTAIN });
  await markChildReady({ childWorkId: childVideo.id, actorUserId: CAPTAIN });
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
  });
  assert.ok(c.ok);
  const pg = await getPglite();
  const childId = (
    await pg.query<{ id: string }>("select id from child_works where parent_work_id=$1 limit 1", [id])
  ).rows[0].id;
  await markChildReady({ childWorkId: childId, actorUserId: CAPTAIN });
  await activateChild({ childWorkId: childId, actorUserId: CAPTAIN });
  await completeChild({ childWorkId: childId, actorUserId: CAPTAIN });

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