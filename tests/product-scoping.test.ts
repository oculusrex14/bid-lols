import { test } from "node:test";
import assert from "node:assert/strict";
import { getPglite } from "../src/lib/db.server";

process.env.PAYMENT_PROVIDER = "fake";
process.env.MARKETPLACE_MONEY_LIVE = "1";

const { createBounty } = await import("../src/lib/marketplace/bounties.server");
const { listOpenBounties, listOpenProjects } = await import("../src/lib/marketplace/queries.server");
const { categoriesFor } = await import("../src/lib/marketplace/categories");
const { getSql } = await import("../src/lib/db.server");

const SPONSOR = "usr_scope_sponsor";

test("AC-1: /bounties listings are product-scoped (culturebid never sees foundersbid's)", async () => {
  const pg = await getPglite();
  await pg.query(
    "truncate bounties, bounty_applications, bounty_participants, bounty_submissions, bounty_awards, money_events, payments, users, notifications restart identity cascade",
  );
  await pg.query(
    "insert into users (id, email, email_verified) values ($1,'ps@t',true)",
    [SPONSOR],
  );

  const FOUNDERS_REWARD = 1_000_000; // ₹10,000.00
  const CULTURE_REWARD = 500_000; // ₹5,000.00
  const LATER = new Date(Date.now() + 7 * 24 * 3600 * 1000);

  const founders = await createBounty({
    sponsorUserId: SPONSOR,
    product: "foundersbid",
    title: "Founders-only bounty scoped test case",
    description: "This bounty must be visible only on the foundersbid marketplace surface.",
    category: "development",
    rewardTotalMinor: FOUNDERS_REWARD,
    rewardStructure: "WINNER_TAKES_ALL",
    rewardAllocations: [{ place: 1, amountMinor: FOUNDERS_REWARD }],
    submissionDeadline: LATER.toISOString(),
  });
  const culture = await createBounty({
    sponsorUserId: SPONSOR,
    product: "culturebid",
    title: "Culture brief scoped test case asset",
    description: "A creative brief that must be visible only on the culturebid marketplace surface.",
    category: "ugc",
    rewardTotalMinor: CULTURE_REWARD,
    rewardStructure: "WINNER_TAKES_ALL",
    rewardAllocations: [{ place: 1, amountMinor: CULTURE_REWARD }],
    submissionDeadline: LATER.toISOString(),
  });

  // Public surfaces show open listings; force both to OPEN (as verified
  // funding would) — scoping is what we're testing, not the funding gate.
  await pg.query("update bounties set status='OPEN'");
  const sql = await getSql();
  const forFounders = await listOpenBounties(sql, "foundersbid", { limit: 50 });
  const forCulture = await listOpenBounties(sql, "culturebid", { limit: 50 });

  assert.ok(
    forFounders.items.some((b) => b.id === founders.id),
    "foundersbid surface shows the foundersbid bounty",
  );
  assert.ok(!forFounders.items.some((b) => b.id === culture.id), "foundersbid surface hides culturebid's brief");
  assert.ok(forCulture.items.some((b) => b.id === culture.id), "culturebid surface shows the culturebid brief");
  assert.ok(!forCulture.items.some((b) => b.id === founders.id), "culturebid surface hides foundersbid's bounty");

  // AC-2: creative category constants are product-scoped
  assert.ok(categoriesFor("culturebid").includes("ugc"));
  assert.ok(categoriesFor("foundersbid").includes("development"));
  assert.ok(!categoriesFor("culturebid").includes("debugging"));

  // projects scoping uses the same shape
  await pg.query(
    `insert into projects (id, product, sponsor_user_id, title, slug, description, category, status)
     values ('prj_x','culturebid',$1,'Project scope test asset','proj-x','A project brief scoped to culturebid only.','design','OPEN_FOR_PROPOSALS')`,
    [SPONSOR],
  );
  const cultureProjects = await listOpenProjects(sql, "culturebid", {});
  assert.ok(cultureProjects.items.some((p) => String(p.id) === "prj_x"));
});