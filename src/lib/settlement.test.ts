import { test } from "node:test";
import assert from "node:assert/strict";
import { getSql } from "@/lib/db.server";
import { makeId } from "@/lib/ids";
import { settleOrder, isSettled } from "@/lib/settlement.server";

/**
 * AC-5 / S-3: two concurrent settlement attempts on one pending order apply
 * the effect exactly once; the claim guard's loser returns alreadySettled.
 * Runs against the dev/preview PGLite loop (migrations 0002-0009 applied).
 *
 * `fetch` is stubbed per test, so these credentials are inert — they only
 * keep the Cashfree client's header builder from throwing in a CI environment
 * with no .env.local.
 */
process.env.CASHFREE_CLIENT_ID = process.env.CASHFREE_CLIENT_ID || "test-client-id";
process.env.CASHFREE_CLIENT_SECRET = process.env.CASHFREE_CLIENT_SECRET || "test-client-secret";

function providerStub(status: "PAID" | "PENDING"): typeof fetch {
  return (async () =>
    new Response(
      JSON.stringify({ order_status: status }),
      { status: 200, headers: { "content-type": "application/json" } },
    )) as typeof fetch;
}

async function insertPendingBidOrder(
  payload: Record<string, unknown> = {
    targetBidCents: 2500,
    title: "Test Listing",
    tagline: "",
    team: "",
    socials: [],
    values: [],
    url: "https://example.test/page",
    urlKey: "example.test/page",
  },
): Promise<string> {
  const sql = await getSql();
  const orderId = makeId("ord");
  await sql.query(
    `insert into orders (id, site, kind, amount_cents, status, payload)
     values ($1, 'founders', 'bid', 2500, 'pending', $2::jsonb)`,
    [orderId, JSON.stringify(payload)],
  );
  return orderId;
}

async function listingRows(site: string) {
  const sql = await getSql();
  return sql.query<{ id: string }>(`select id from listings where site = $1`, [site]);
}

async function auditRows(orderId: string) {
  const sql = await getSql();
  return sql.query<{ id: string }>(
    `select id from audit_events where entity_type = 'order' and entity_id = $1 and action = 'order_settled'`,
    [orderId],
  );
}

test("S-4: provider reports PENDING -> no settlement, order stays pending", async () => {
  const orderId = await insertPendingBidOrder();
  const realFetch = globalThis.fetch;
  globalThis.fetch = providerStub("PENDING");
  try {
    const result = await settleOrder(orderId);
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.code, "not_paid_at_gateway");
    const sql = await getSql();
    const row = await sql.query<{ status: string }>(`select status from orders where id = $1`, [orderId]);
    assert.equal(row[0]?.status, "pending");
    assert.equal((await auditRows(orderId)).length, 0);
  } finally {
    globalThis.fetch = realFetch;
  }
});

test("AC-5: two concurrent settles apply the effect exactly once", async () => {
  const orderId = await insertPendingBidOrder();
  const realFetch = globalThis.fetch;
  globalThis.fetch = providerStub("PAID");
  try {
    const [a, b] = await Promise.all([settleOrder(orderId), settleOrder(orderId)]);
    assert.equal(a.ok, true);
    assert.equal(b.ok, true);
    const settledOnce = [a, b].filter((r) => r.ok && r.alreadySettled === false);
    const settledTwice = [a, b].filter((r) => r.ok && r.alreadySettled === true);
    assert.equal(settledOnce.length, 1, "exactly one winner claims the order");
    assert.equal(settledTwice.length, 1, "the loser observes an already-settled order");

    // Effects: one listing, one audit row.
    assert.equal((await listingRows("founders")).length, 1);
    assert.equal((await auditRows(orderId)).length, 1);
    assert.equal(await isSettled(orderId), true);

    // Order state is paid exactly once, with paid_at set.
    const sql = await getSql();
    const order = await sql.query<{ status: string; paid_at: string | null }>(
      `select status, paid_at::text as paid_at from orders where id = $1`,
      [orderId],
    );
    assert.equal(order[0]?.status, "paid");
    assert.ok(order[0]?.paid_at);
  } finally {
    globalThis.fetch = realFetch;
  }
});

test("AC-4(f): duplicate event after settlement -> 200-equivalent, no second effect", async () => {
  const orderId = await insertPendingBidOrder({
    targetBidCents: 4000,
    url: "https://example.test/two",
    urlKey: "example.test/two",
  });
  const realFetch = globalThis.fetch;
  globalThis.fetch = providerStub("PAID");
  try {
    const first = await settleOrder(orderId);
    assert.equal(first.ok, true);
    const second = await settleOrder(orderId);
    assert.equal(second.ok, true);
    if (second.ok) assert.equal(second.alreadySettled, true);
    assert.equal((await listingRows("founders")).length, 2, "no duplicate listing");
    assert.equal((await auditRows(orderId)).length, 1, "no duplicate audit row");
  } finally {
    globalThis.fetch = realFetch;
  }
});

test("unknown order -> order_not_found (4xx, no settlement)", async () => {
  const result = await settleOrder(makeId("ord"));
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.code, "order_not_found");
});

test("non-pending, non-paid order is not settlable", async () => {
  const sql = await getSql();
  const orderId = makeId("ord");
  await sql.query(
    `insert into orders (id, site, kind, amount_cents, status, payload)
     values ($1, 'founders', 'bid', 1000, 'expired', '{}'::jsonb)`,
    [orderId],
  );
  const result = await settleOrder(orderId);
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.code, "order_not_settlable");
});
