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

function h(country?: string): Headers {
  const headers = new Headers();
  if (country) headers.set("x-vercel-sc", country);
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
  const lower = new Headers();
  lower.set("x-vercel-sc", "in");
  assert.equal(viewerCurrencyFromHeaders(lower, DEPLOYED_ENV), "INR");
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
