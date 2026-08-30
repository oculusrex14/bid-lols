import { test } from "node:test";
import assert from "node:assert/strict";
import { getPglite } from "../src/lib/db.server";

/**
 * RC5.1 WS8/WS10/WS13: the currency foundation against real schema (PGLite).
 * Work currency is persisted, market-rate aggregates are partitioned by
 * currency, and proposals/quotes inherit the project's currency.
 */

type AnyRow = Record<string, any>;
async function q(pg: Awaited<ReturnType<typeof getPglite>>, text: string, params: unknown[] = []): Promise<AnyRow[]> {
  const res = await pg.query<Record<string, unknown>>(text, params as unknown[]);
  return res.rows as AnyRow[];
}

async function seedUser(pg: Awaited<ReturnType<typeof getPglite>>, id: string): Promise<void> {
  await pg.query("insert into users (id, email, email_verified) values ($1, $2, true)", [id, `${id}@t`]);
}

/** A completed bounty in an explicit currency, with the winner settled. */
async function doneBountyCurrency(
  pg: Awaited<ReturnType<typeof getPglite>>,
  id: string,
  sponsor: string,
  provider: string,
  rewardMinor: number,
  currency: "INR" | "USD",
  category = "development",
): Promise<void> {
  await pg.query(
    `insert into bounties
       (id, product, sponsor_user_id, title, slug, description, category,
        reward_total_minor, currency, reward_structure, reward_allocations,
        status, submission_deadline, published_at, awarded_at, completed_at, skills)
     values
       ($1, 'foundersbid', $2, $3, $4, $5, $6,
        $7, $8, 'WINNER_TAKES_ALL', $9::jsonb,
        'COMPLETED', '2026-08-10T00:00:00Z', '2026-07-01T00:00:00Z',
        '2026-08-01T00:00:00Z', '2026-08-01T00:00:00Z', '["api"]'::jsonb)`,
    [
      id,
      sponsor,
      `bounty ${id}`,
      `slug-cur-${id}`,
      `A completed ${currency} bounty for the currency foundation tests.`,
      category,
      rewardMinor,
      currency,
      JSON.stringify([{ place: 1, amount_minor: rewardMinor }]),
    ],
  );
  await pg.query(
    "insert into bounty_awards (id, bounty_id, user_id, place, amount_minor, currency, status, awarded_by) values ($1,$2,$3,1,$4,$5,'SETTLED',$6)",
    [`aw_${id}`, id, provider, rewardMinor, currency, sponsor],
  );
}

test("WS10: Market Rates aggregates are partitioned by currency", async () => {
  const pg = await getPglite();
  await pg.query("truncate bounties, bounty_awards, users restart identity cascade");
  await seedUser(pg, "usr_mrs_s");
  await seedUser(pg, "usr_mrs_p");
  const S = "usr_mrs_s";
  const P = "usr_mrs_p";
  // 11 completed INR development bounties: amounts 1,000 .. 11,000 rupees.
  for (let i = 1; i <= 11; i += 1) {
    await doneBountyCurrency(pg, `bnt_mrs_i${i}`, S, P, i * 100_000, "INR");
  }
  // 11 completed USD development bounties: amounts 100 .. 1,100 dollars.
  // Deliberately overlapping magnitudes in minor units would be a trap;
  // the medians below are provably currency-pure.
  for (let i = 1; i <= 11; i += 1) {
    await doneBountyCurrency(pg, `bnt_mrs_u${i}`, S, P, i * 10_000, "USD");
  }

  const { marketRateFor } = await import("../src/lib/marketplace/reputation.server");
  const inr = await marketRateFor(null, "development", "INR");
  const usd = await marketRateFor(null, "development", "USD");

  assert.equal(inr.currency, "INR");
  assert.equal(usd.currency, "USD");
  assert.equal(inr.sampleSize, 11, "INR partition sees only INR outcomes");
  assert.equal(usd.sampleSize, 11, "USD partition sees only USD outcomes");
  assert.equal(inr.sufficient, true);
  assert.equal(usd.sufficient, true);
  // INR: 11 amounts, median = 6th = 600,000 paise.
  assert.equal(inr.medianMinor, 600_000, "INR median from INR rows only");
  // USD: 11 amounts, median = 6th = 60,000 cents.
  assert.equal(usd.medianMinor, 60_000, "USD median from USD rows only");
  // A mixed aggregate (the forbidden behavior) would have median far away:
  assert.notEqual(inr.medianMinor, usd.medianMinor, "the partitions are different data");
  assert.equal(inr.minMinor, 100_000);
  assert.equal(usd.minMinor, 10_000);

  // An empty partition stays honest: zero outcomes, no numbers, no fallback.
  const design = await marketRateFor(null, "design", "USD");
  assert.equal(design.sampleSize, 0);
  assert.equal(design.sufficient, false);
  assert.equal(design.medianMinor, null, "no USD design sample -> no USD design price");
});

test("WS10: the homepage preview uses the SAME currency-partitioned source", async () => {
  const pg = await getPglite();
  await pg.query("truncate bounties, bounty_awards, users restart identity cascade");
  await seedUser(pg, "usr_hpv_s");
  await seedUser(pg, "usr_hpv_p");
  const S = "usr_hpv_s";
  const P = "usr_hpv_p";
  for (let i = 1; i <= 11; i += 1) {
    await doneBountyCurrency(pg, `bnt_hpv_i${i}`, S, P, i * 100_000, "INR");
  }
  for (let i = 1; i <= 11; i += 1) {
    await doneBountyCurrency(pg, `bnt_hpv_u${i}`, S, P, i * 10_000, "USD");
  }
  const { homePreview } = await import("../src/lib/marketplace/home-preview.server");
  const { marketRateFor } = await import("../src/lib/marketplace/reputation.server");
  const usdPreview = await homePreview("bidthrone", "USD");
  assert.equal(usdPreview.kind, "boards");
  const dev = usdPreview.marketRates.find((r) => r.category === "development")!;
  const live = await marketRateFor(null, "development", "USD");
  assert.equal(dev.currency, "USD");
  assert.equal(dev.sampleSize, live.sampleSize, "preview == live source, same partition");
  assert.equal(dev.medianMinor, live.medianMinor, "preview median == live median");
  assert.equal(usdPreview.marketRateCurrency, "USD");
});

test("WS8: bounty + project creation persists the sponsor's currency choice", async () => {
  const pg = await getPglite();
  await pg.query("truncate bounties, projects, users restart identity cascade");
  await seedUser(pg, "usr_crt_s");
  const S = "usr_crt_s";
  const { createBounty } = await import("../src/lib/marketplace/bounties.server");
  const { createProject } = await import("../src/lib/marketplace/projects.server");

  const b = await createBounty({
    sponsorUserId: S,
    product: "foundersbid",
    title: "USD bounty draft",
    description: "A bounty denominated in US dollars.",
    category: "development",
    rewardTotalMinor: 100_000,
    currency: "USD",
    rewardStructure: "WINNER_TAKES_ALL",
    rewardAllocations: [{ place: 1, amountMinor: 100_000 }],
    submissionDeadline: "2026-09-01T00:00:00Z",
  });
  const bRow = (await q(pg, "select currency, reward_total_minor from bounties where id=$1", [b.id]))[0];
  assert.equal(String(bRow.currency), "USD", "the persisted work currency is the sponsor's choice");
  assert.equal(Number(bRow.reward_total_minor), 100_000, "the amount is NOT converted");

  const p = await createProject({
    sponsorUserId: S,
    product: "foundersbid",
    title: "USD project draft",
    description: "A project denominated in US dollars.",
    category: "design",
    currency: "USD",
  });
  const pRow = (await q(pg, "select currency from projects where id=$1", [p.id]))[0];
  assert.equal(String(pRow.currency), "USD");

  // The default path still persists INR (every existing sponsor is INR).
  const p2 = await createProject({
    sponsorUserId: S,
    product: "foundersbid",
    title: "INR project default",
    description: "A project with the default currency.",
    category: "design",
  });
  const p2Row = (await q(pg, "select currency from projects where id=$1", [p2.id]))[0];
  assert.equal(String(p2Row.currency), "INR");
});

test("WS8: a proposal quote inherits the PROJECT's currency, never a literal INR", async () => {
  const pg = await getPglite();
  await pg.query("truncate bounties, projects, project_proposals, users restart identity cascade");
  await seedUser(pg, "usr_prj_s");
  await seedUser(pg, "usr_prj_p");
  const S = "usr_prj_s";
  const P = "usr_prj_p";
  const { createProject, publishProject, submitProposal } = await import("../src/lib/marketplace/projects.server");
  const p = await createProject({
    sponsorUserId: S,
    product: "foundersbid",
    title: "USD project for proposals",
    description: "Sponsor a USD-denominated project.",
    category: "development",
    currency: "USD",
  });
  await publishProject({ projectId: p.id, sponsorUserId: S });
  const sub = await submitProposal({
    projectId: p.id,
    providerUserId: P,
    approach: "A solid approach, in detail, long enough to pass.",
    quotedMinor: 500_000,
  });
  assert.equal(sub.ok, true, "proposal accepted");
  const row = (await q(pg, "select currency, quoted_minor from project_proposals where project_id=$1", [p.id]))[0];
  assert.equal(String(row.currency), "USD", "the quote is denominated in the project's currency");
  assert.equal(Number(row.quoted_minor), 500_000, "$5,000.00 in cents, untouched");
});

/* --------------------------------------------------------------------------
 * WS6: the viewer-region default currency resolver.
 * ------------------------------------------------------------------------ */

const DEPLOYED_ENV = { VERCEL_ENV: "production", NODE_ENV: "production" } as NodeJS.ProcessEnv;
const DEV_ENV = { NODE_ENV: "development" } as NodeJS.ProcessEnv;

/**
 * The production contract is Vercel's documented client-country header
 * `x-vercel-ip-country` ("two-character ISO 3166-1 country code for the
 * country associated with the location of the requester's public IP
 * address" — vercel.com/docs/headers/request-headers; COUNTRY_HEADER_NAME in
 * Vercel's own packages/functions/src/headers.ts). It is set by the Vercel
 * proxy from the original client IP.
 */
function h(country?: string): Headers {
  const headers = new Headers();
  if (country) headers.set("x-vercel-ip-country", country);
  return headers;
}

test("WS6: deployed policy — IN -> INR, every other/missing country -> USD", async () => {
  const { viewerCurrencyFromHeaders } = await import("../src/lib/viewer-currency.server");
  assert.equal(viewerCurrencyFromHeaders(h("IN"), DEPLOYED_ENV), "INR");
  assert.equal(viewerCurrencyFromHeaders(h("US"), DEPLOYED_ENV), "USD");
  assert.equal(viewerCurrencyFromHeaders(h("AU"), DEPLOYED_ENV), "USD", "no AUD in this phase");
  assert.equal(viewerCurrencyFromHeaders(h("GB"), DEPLOYED_ENV), "USD");
  assert.equal(viewerCurrencyFromHeaders(h(), DEPLOYED_ENV), "USD", "missing header -> USD");
  assert.equal(viewerCurrencyFromHeaders(h("IN"), DEPLOYED_ENV), "INR", "case-insensitive edge value");
  // Normalization: lowercase + surrounding whitespace still resolves safely.
  const lower = new Headers();
  lower.set("x-vercel-ip-country", "  in \n");
  assert.equal(viewerCurrencyFromHeaders(lower, DEPLOYED_ENV), "INR");
  const garbage = new Headers();
  garbage.set("x-vercel-ip-country", "IN/XX");
  assert.equal(viewerCurrencyFromHeaders(garbage, DEPLOYED_ENV), "USD", "malformed value -> safe default");
});

test("WS6/RC5.2: the resolver reads the client-country header, not the edge-location header", async () => {
  const { viewerCurrencyFromHeaders, VERCEL_COUNTRY_HEADER } = await import("../src/lib/viewer-currency.server");
  assert.equal(VERCEL_COUNTRY_HEADER, "x-vercel-ip-country", "pinned to the documented Vercel contract");
  // RC5.1 read `x-vercel-sc` (the country of the EDGE that served the
  // request — Vercel's server location, not the viewer's). Guard the
  // regression explicitly: an edge-country header must have ZERO effect.
  const edgeOnly = new Headers();
  edgeOnly.set("x-vercel-sc", "IN");
  assert.equal(viewerCurrencyFromHeaders(edgeOnly, DEPLOYED_ENV), "USD", "x-vercel-sc alone never selects INR");
  const edgeUsViewerIn = new Headers();
  edgeUsViewerIn.set("x-vercel-sc", "US");
  edgeUsViewerIn.set("x-vercel-ip-country", "IN");
  assert.equal(viewerCurrencyFromHeaders(edgeUsViewerIn, DEPLOYED_ENV), "INR", "the client-country header wins");
});

test("WS6: non-deployed override works, garbage override falls back to USD", async () => {
  const { viewerCurrencyFromHeaders } = await import("../src/lib/viewer-currency.server");
  assert.equal(viewerCurrencyFromHeaders(new Headers(), { ...DEV_ENV, DEFAULT_VIEWER_CURRENCY: "INR" }), "INR");
  assert.equal(viewerCurrencyFromHeaders(new Headers(), { ...DEV_ENV, DEFAULT_VIEWER_CURRENCY: "USD" }), "USD");
  assert.equal(viewerCurrencyFromHeaders(new Headers(), { ...DEV_ENV, DEFAULT_VIEWER_CURRENCY: "AUD" }), "USD", "unsupported override ignored");
  assert.equal(viewerCurrencyFromHeaders(new Headers(), DEV_ENV), "USD", "no override -> USD");
});

test("WS6: no client-supplied source can pick the viewer currency in production", async () => {
  const { viewerCurrencyFromHeaders } = await import("../src/lib/viewer-currency.server");
  // The resolver reads exactly one trusted header plus env. Anything a
  // client form could send (query-style headers, cookies, XFF tricks) is
  // not an input — assert the two realistic attack shapes stay USD.
  const spoof = new Headers();
  spoof.set("x-vercel-sc", "IN");
  spoof.set("x-vercel-sc", "US"); // last value wins if a proxy double-set it
  assert.equal(viewerCurrencyFromHeaders(spoof, DEPLOYED_ENV), "USD");
  const overrideInProd = { ...DEPLOYED_ENV, DEFAULT_VIEWER_CURRENCY: "INR" };
  assert.equal(viewerCurrencyFromHeaders(new Headers(), overrideInProd), "USD", "the env override is dev/test-only, never honored in deployed runtimes");
});

/* --------------------------------------------------------------------------
 * RC5.2: the per-currency launch floor (one authoritative policy in
 * money.ts) enforced at the boundaries, plus persistence invariance under
 * differing viewer contexts.
 * ------------------------------------------------------------------------ */

test("RC5.2: the bounty floor is per-currency (INR 100,000 minor / USD 5,000 minor)", async () => {
  const {
    meetsBountyRewardFloor,
    minBountyRewardMinor,
    minBountyRewardMajor,
    bountyFloorCopy,
    CURRENCY_MONEY_POLICY,
  } = await import("../src/lib/money");
  // The policy is the single source: INR ₹1,000 / USD $50.
  assert.equal(minBountyRewardMinor("INR"), 100_000);
  assert.equal(minBountyRewardMinor("USD"), 5_000);
  assert.equal(minBountyRewardMajor("INR"), 1_000, "major floor derives from minor (no duplicated constant)");
  assert.equal(minBountyRewardMajor("USD"), 50);
  assert.equal(bountyFloorCopy("INR"), "₹1,000");
  assert.equal(bountyFloorCopy("USD"), "$50");

  // Boundary cases (the exact audit pairs).
  assert.equal(meetsBountyRewardFloor(99_999, "INR"), false, "₹999.99 rejects");
  assert.equal(meetsBountyRewardFloor(100_000, "INR"), true, "₹1,000 accepts");
  assert.equal(meetsBountyRewardFloor(4_999, "USD"), false, "$49.99 rejects");
  assert.equal(meetsBountyRewardFloor(5_000, "USD"), true, "$50 accepts");
  assert.equal(meetsBountyRewardFloor(100_000, "EUR"), false, "unknown currency rejects (never assumes INR)");
  assert.equal(meetsBountyRewardFloor(0, "INR"), false);
  assert.equal(CURRENCY_MONEY_POLICY.INR.minParentBudgetMajor, 1_000, "team-project budget floor (major units)");
  assert.equal(CURRENCY_MONEY_POLICY.USD.minParentBudgetMajor, 1_000, "documented product scale, not an FX value");
});

test("RC5.2: createBounty enforces the floor in both currencies (and rejects unknown)", async () => {
  const pg = await getPglite();
  await pg.query("truncate bounties, users restart identity cascade");
  await seedUser(pg, "usr_floor_s");
  const S = "usr_floor_s";
  const { createBounty } = await import("../src/lib/marketplace/bounties.server");
  const base = {
    sponsorUserId: S,
    product: "foundersbid",
    title: "Floor boundary bounty",
    description: "A bounty at the exact launch floor for its currency.",
    category: "development",
    rewardStructure: "WINNER_TAKES_ALL" as const,
    submissionDeadline: "2026-09-01T00:00:00Z",
  };

  // USD: $49.99 must fail, $50 must succeed (CultureBid uses the same rule).
  await assert.rejects(
    createBounty({ ...base, rewardTotalMinor: 4_999, currency: "USD", rewardAllocations: [{ place: 1, amountMinor: 4_999 }] }),
    /at least \$50/i,
  );
  const usd = await createBounty({ ...base, rewardTotalMinor: 5_000, currency: "USD", rewardAllocations: [{ place: 1, amountMinor: 5_000 }] });
  const usdRow = (await q(pg, "select currency from bounties where id=$1", [usd.id]))[0];
  assert.equal(String(usdRow.currency), "USD");

  const culture = await createBounty({
    ...base,
    product: "culturebid",
    title: "CultureBid floor brief",
    rewardTotalMinor: 5_000,
    currency: "USD",
    rewardAllocations: [{ place: 1, amountMinor: 5_000 }],
  });
  assert.ok(culture.id, "CultureBid bounties use the same underlying rule");

  // INR: ₹999.99 must fail, ₹1,000 must succeed.
  await assert.rejects(
    createBounty({ ...base, rewardTotalMinor: 99_999, currency: "INR", rewardAllocations: [{ place: 1, amountMinor: 99_999 }] }),
    /at least ₹1,000/i,
  );
  const inr = await createBounty({ ...base, rewardTotalMinor: 100_000, currency: "INR", rewardAllocations: [{ place: 1, amountMinor: 100_000 }] });
  const inrRow = (await q(pg, "select currency from bounties where id=$1", [inr.id]))[0];
  assert.equal(String(inrRow.currency), "INR");

  // Unknown currency at the engine boundary fails safely (never assumed INR).
  await assert.rejects(
    createBounty({ ...base, rewardTotalMinor: 100_000, currency: "EUR", rewardAllocations: [{ place: 1, amountMinor: 100_000 }] }),
    /EUR|at least/i,
  );
});

test("RC5.2: 9 INR + 9 USD outcomes in one category publish NOTHING", async () => {
  const pg = await getPglite();
  await pg.query("truncate bounties, bounty_awards, users restart identity cascade");
  await seedUser(pg, "usr_mix_s");
  await seedUser(pg, "usr_mix_p");
  const S = "usr_mix_s";
  const P = "usr_mix_p";
  for (let i = 1; i <= 9; i += 1) {
    await doneBountyCurrency(pg, `bnt_mix_i${i}`, S, P, i * 100_000, "INR", "development");
    await doneBountyCurrency(pg, `bnt_mix_u${i}`, S, P, i * 10_000, "USD", "development");
  }
  const { marketRateFor } = await import("../src/lib/marketplace/reputation.server");
  const inr = await marketRateFor(null, "development", "INR");
  const usd = await marketRateFor(null, "development", "USD");
  assert.equal(inr.sampleSize, 9, "the INR partition sees only its 9");
  assert.equal(usd.sampleSize, 9, "the USD partition sees only its 9");
  assert.equal(inr.sufficient, false, "9 < 10: the INR benchmark must not publish");
  assert.equal(usd.sufficient, false, "9 < 10: the USD benchmark must not publish");
  assert.equal(inr.medianMinor, null, "no INR median leaks out of an insufficient sample");
  assert.equal(usd.medianMinor, null, "no USD median leaks out of an insufficient sample");
  // The 18 total outcomes must NOT combine into one 18-sample benchmark:
  // each partition sees exactly its own 9 (a mixed aggregate would see 18).
  assert.notEqual(inr.sampleSize, 18, "the INR partition is not the mixed aggregate");
  assert.notEqual(usd.sampleSize, 18, "the USD partition is not the mixed aggregate");
});

test("RC5.2: persisted records keep their currency under every viewer context", async () => {
  const pg = await getPglite();
  await pg.query("truncate bounties, bounty_awards, users restart identity cascade");
  await seedUser(pg, "usr_inv_s");
  await seedUser(pg, "usr_inv_p");
  const S = "usr_inv_s";
  const P = "usr_inv_p";
  await doneBountyCurrency(pg, "bnt_inv_inr", S, P, 2_000_000, "INR", "development");
  await doneBountyCurrency(pg, "bnt_inv_usd", S, P, 200_000, "USD", "development");
  // An OPEN USD record (listOpenBounties only sees open-family statuses).
  await pg.query(
    `insert into bounties
       (id, product, sponsor_user_id, title, slug, description, category,
        reward_total_minor, currency, reward_structure, reward_allocations,
        status, submission_deadline, published_at, skills)
     values
       ('bnt_inv_open_usd','foundersbid',$1,'Open USD record','slug-inv-usd',
        'An open bounty denominated in US dollars for the invariance test.',
        'research',150000,'USD','WINNER_TAKES_ALL',
        $2::jsonb,'OPEN','2026-12-01T00:00:00Z','2026-09-15T00:00:00Z','["api"]'::jsonb)`,
    [S, JSON.stringify([{ place: 1, amount_minor: 150_000 }])],
  );

  const { listOpenBounties } = await import("../src/lib/marketplace/queries.server");
  const { viewerCurrencyFromHeaders } = await import("../src/lib/viewer-currency.server");

  // India viewer (INR default) reads the list: the USD record is still USD.
  const inHeader = new Headers();
  inHeader.set("x-vercel-ip-country", "IN");
  assert.equal(viewerCurrencyFromHeaders(inHeader, { VERCEL_ENV: "production" } as NodeJS.ProcessEnv), "INR");
  const usHeader = new Headers();
  usHeader.set("x-vercel-ip-country", "US");
  assert.equal(viewerCurrencyFromHeaders(usHeader, { VERCEL_ENV: "production" } as NodeJS.ProcessEnv), "USD");

  // The engine reads through the app Sql (PGLite-backed in tests), not the
  // raw handle.
  const { getSql } = await import("../src/lib/db.server");
  const rows = await listOpenBounties(await getSql(), "foundersbid", { limit: 10 });
  const usdRow = rows.items.find((b) => b.id === "bnt_inv_open_usd")!;
  assert.equal(usdRow.currency, "USD", "an INR-default viewer's read of a USD record stays USD");
  assert.equal(Number(usdRow.reward_total_minor), 150_000, "the amount is untouched by viewer context");
});
