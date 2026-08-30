import { test } from "node:test";
import assert from "node:assert/strict";
import { getPglite } from "../src/lib/db.server";

process.env.PAYMENT_PROVIDER = "fake";
process.env.MARKETPLACE_MONEY_LIVE = "1";

const {
  createParentWork,
  publishParentForFunding,
  verifyParentFunding,
  selectCaptain,
  activateParent,
  allocateChildWork,
} = await import("../src/lib/marketplace/bidception.server");
const { getPaymentProvider } = await import("../src/lib/payments/provider");

const SPONSOR = "usr_bcn2_sponsor";
const CAPTAIN = "usr_bcn2_captain";
const BUDGET = 500; // ₹500.00 in rupees

type AnyRow = Record<string, any>;
async function q(pg: import("@electric-sql/pglite").PGlite, text: string, params: unknown[] = []): Promise<AnyRow[]> {
  const res = await pg.query<Record<string, unknown>>(text, params as unknown[]);
  return res.rows as AnyRow[];
}

test("RC1 R2: parent funding through the real production path (no status shortcuts)", async () => {
  const pg = await getPglite();
  await pg.query(
    "truncate parent_works, child_works, money_events, notifications, payments, users restart identity cascade",
  );
  await pg.query(
    "insert into users (id, email, email_verified) values ($1,'sp@t',true), ($2,'cp@t',true)",
    [SPONSOR, CAPTAIN],
  );

  // 1. create + start fake-provider funding
  const { id } = await createParentWork({
    sponsorUserId: SPONSOR,
    product: "bidception",
    title: "RC1 real funding parent work",
    objective: "A parent work funded through the production code path, not a test shortcut.",
  });
  const published = await publishParentForFunding({
    parentWorkId: id,
    sponsorUserId: SPONSOR,
    budgetMajor: BUDGET,
    currency: "INR",
  });
  assert.ok(published.ok, JSON.stringify(published));

  // 2. payment decomposition is authoritative + correct
  const payment = (await q(pg, "select id, amount_cents, status, provider_order_id, meta from payments where kind='funding'"))[0];
  assert.equal(Number(payment.amount_cents), 55_000, "₹500.00 reward + 10% fee = ₹550.00 (55,000 paise)");
  assert.equal(payment.meta.parent_id, id);
  assert.equal(Number(payment.meta.reward_minor), 50_000, "reward ₹500.00 in paise");
  assert.equal(Number(payment.meta.platform_fee_minor), 5_000);
  assert.equal(payment.meta.reward_minor + payment.meta.platform_fee_minor, 55_000);

  // 3. parent row carries the numeric budget + payment link (the reversed-binding regression)
  const parent = (await q(pg, "select funded_budget_minor, funding_payment_id, status from parent_works where id=$1", [id]))[0];
  assert.equal(Number(parent.funded_budget_minor), 50_000, "funded_budget_minor is the numeric budget (paise)");
  assert.equal(String(parent.funding_payment_id), String(payment.id), "funding_payment_id is the payment id");
  assert.equal(String(parent.status), "AWAITING_FUNDING");

  // 4. provider verification is authoritative: unpaid first
  const early = await verifyParentFunding({ parentWorkId: id, paymentId: String(payment.id) });
  assert.equal(early, "not_settled", "unverified payment does not fund the parent");

  // 5. fake provider marks paid (what the webhook proves) + settle
  (getPaymentProvider() as unknown as { markPaid(id: string): void }).markPaid(String(payment.id));
  const funded = await verifyParentFunding({ parentWorkId: id, paymentId: String(payment.id), providerRef: "rc1-test" });
  assert.equal(funded, "funded");
  // idempotent
  assert.equal(await verifyParentFunding({ parentWorkId: id, paymentId: String(payment.id) }), "alreadyFunded");

  // 6. money_events are PARENT_WORK (never BOUNTY) and sum to the charge
  const events = await q(pg, "select entity_type, type, amount_minor from money_events where entity_id=$1 order by created_at", [id]);
  assert.equal(events.length, 2);
  for (const e of events) assert.equal(String(e.entity_type), "PARENT_WORK");
  const reward = events.find((e) => e.type === "REWARD");
  const fee = events.find((e) => e.type === "PLATFORM_FEE");
  assert.ok(reward && fee, "REWARD and PLATFORM_FEE events exist");
  assert.equal(Number(reward!.amount_minor), 50_000);
  assert.equal(Number(fee!.amount_minor), 5_000);

  // 7. captain selection via the real engine + activation + one allocation
  const sel = await selectCaptain({ parentWorkId: id, sponsorUserId: SPONSOR, captainUserId: CAPTAIN });
  assert.ok(sel.ok, JSON.stringify(sel));
  const act = await activateParent({ parentWorkId: id, sponsorUserId: SPONSOR });
  assert.ok(act.ok, JSON.stringify(act));
  const alloc = await allocateChildWork({
    parentWorkId: id,
    actorUserId: CAPTAIN,
    title: "Landing page",
    allocatedMinor: 20_000,
    kind: "BOUNTY" as const,
  });
  assert.ok(alloc.ok, JSON.stringify(alloc));
  const over = await allocateChildWork({
    parentWorkId: id,
    actorUserId: CAPTAIN,
    title: "Too much",
    allocatedMinor: 30_001,
    kind: "BOUNTY" as const,
  });
  assert.equal(over.ok, false, "allocation exceeding the remaining balance (50,000-20,000=30,000) is refused");
  if (!over.ok) assert.equal(over.code, "insufficient_balance");
});

test("RC1 R2b: funding intent is honest while the money flag is off", async () => {
  delete process.env.MARKETPLACE_MONEY_LIVE;
  const pg = await getPglite();
  await pg.query("truncate parent_works, payments restart identity cascade");
  const { id } = await createParentWork({
    sponsorUserId: SPONSOR,
    product: "bidception",
    title: "Flag-off parent work case",
    objective: "Funding must refuse honestly when the money flag is off.",
  });
  const r = await publishParentForFunding({ parentWorkId: id, sponsorUserId: SPONSOR, budgetMajor: 1000, currency: "INR" });
  assert.equal(r.ok, false);
  if (!r.ok) assert.equal(r.code, "funding_disabled");
  assert.equal(String((await q(pg, "select status from parent_works where id=$1", [id]))[0].status), "DRAFT");
  assert.equal((await q(pg, "select count(*)::int as n from payments"))[0].n, 0, "no payment row while funding is off");
  process.env.MARKETPLACE_MONEY_LIVE = "1";
});
test("RC5.1 WS8/WS9: a USD parent funds through the fake provider and children inherit USD", async () => {
  const pg = await getPglite();
  await pg.query(
    "truncate parent_works, child_works, money_events, notifications, payments, bounties, bounty_awards restart identity cascade",
  );
  const USR = "usr_rc51_usd_sponsor";
  const CP2 = "usr_rc51_usd_captain";
  await pg.query("insert into users (id, email, email_verified) values ($1,'usd@t',true), ($2,'cp2@t',true)", [USR, CP2]);

  const { id } = await createParentWork({
    sponsorUserId: USR,
    product: "bidception",
    title: "RC5.1 USD parent work",
    objective: "A parent funded in USD through the fake provider (tests only).",
  });
  const published = await publishParentForFunding({
    parentWorkId: id,
    sponsorUserId: USR,
    budgetMajor: 1200,
    currency: "USD",
  });
  assert.ok(published.ok, JSON.stringify(published));

  // 1. the parent row persists ITS currency (the work-currency law).
  const parent = (await q(pg, "select currency, funded_budget_minor, status from parent_works where id=$1", [id]))[0];
  assert.equal(String(parent.currency), "USD", "parent_works.currency is the funded currency");
  assert.equal(Number(parent.funded_budget_minor), 120_000, "$1,200.00 in minor units");

  // 2. the payment row is denominated USD too.
  const pay = (await q(pg, "select id, currency, amount_cents from payments where idempotency_key like $1", [`parent-funding:${id}`]))[0];
  assert.equal(String(pay.currency), "USD");
  assert.equal(Number(pay.amount_cents), 132_000, "$1,200 + 10% fee = $1,320 in cents");

  // 3. settle + captain + activate + allocate a bounty child: it inherits USD.
  (getPaymentProvider() as unknown as { markPaid(id: string): void }).markPaid(String(pay.id));
  assert.equal(await verifyParentFunding({ parentWorkId: id, paymentId: String(pay.id), providerRef: "rc51" }), "funded");
  const sel = await selectCaptain({ parentWorkId: id, sponsorUserId: USR, captainUserId: CP2 });
  assert.ok(sel.ok, JSON.stringify(sel));
  const act = await activateParent({ parentWorkId: id, sponsorUserId: USR });
  assert.ok(act.ok, JSON.stringify(act));
  const alloc = await allocateChildWork({
    parentWorkId: id,
    actorUserId: CP2,
    title: "USD child landing page",
    allocatedMinor: 36_000,
    kind: "BOUNTY" as const,
  });
  assert.ok(alloc.ok, JSON.stringify(alloc));
  const child = (await q(pg, "select currency, reward_total_minor from bounties where id=$1", [String(alloc.ok && alloc.linkedId)]))[0];
  assert.equal(String(child.currency), "USD", "the child bounty is denominated in the parent's currency");
  assert.equal(Number(child.reward_total_minor), 36_000);
});

test("RC5.1 WS9: Cashfree rejects USD before any provider order creation", async () => {
  const { CashfreeProvider, providerSupportsCollection, UNSUPPORTED_CURRENCY_MESSAGE } =
    await import("../src/lib/payments/provider");
  const cf = new CashfreeProvider();
  assert.equal(providerSupportsCollection(cf, "INR"), true);
  assert.equal(providerSupportsCollection(cf, "USD"), false, "Cashfree declares INR-only collection");
  // The createOrder guard fires BEFORE any fetch: no credentials needed
  // (the currency check precedes cashfreeCredentials()), no network, ever.
  await assert.rejects(
    cf.createOrder({ localOrderId: "pmt_test", amountMinor: 100_000, currency: "USD" }),
    (err: unknown) => {
      assert.ok(String((err as Error).message).includes("INR only"), "clear unsupported-currency error");
      assert.ok(String((err as Error).message).includes(UNSUPPORTED_CURRENCY_MESSAGE), "the shared boundary message");
      return true;
    },
  );
  const fake = getPaymentProvider() as unknown as { capabilities: { currencies: readonly string[] } };
  assert.deepEqual([...fake.capabilities.currencies], ["INR", "USD"], "the fake test provider exercises both");
});
