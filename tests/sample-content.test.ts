import { test } from "node:test";
import assert from "node:assert/strict";
import {
  BIDTHRONE_SAMPLE_RECORD,
  cultureBriefExample,
  cultureSampleWall,
  foundersResearchTicketExample,
  foundersWorkTicketExample,
  bidceptionSampleTree,
} from "../src/lib/sample-content";
import { SUPPORTED_CURRENCIES, minBountyRewardMinor, minParentBudgetMajor } from "../src/lib/money";

/**
 * RC5 §12/§37 + RC5.1 WS7: the example/sample contract, now with an
 * explicit amount set PER VIEWER DEFAULT CURRENCY. Samples are labelled
 * presentation only: every one carries example: true, the visible
 * EXAMPLE/SAMPLE wording, integer minor-unit money, and none of the
 * words that would imply actual marketplace activity (verified, paid,
 * settled, or unqualified "live"). The INR and USD sets are independent
 * product values — NOT FX conversions of each other.
 */

function assertSampled(obj: { example: true }, label: string): void {
  assert.equal(obj.example, true, `${label} must be flagged as an example`);
}

test("every sample object carries example: true, in both currencies", () => {
  for (const c of SUPPORTED_CURRENCIES) {
    assertSampled(foundersWorkTicketExample(c), `founders ticket ${c}`);
    assertSampled(foundersResearchTicketExample(c), `founders research ticket ${c}`);
    assertSampled(cultureBriefExample(c), `culture brief ${c}`);
    for (const s of cultureSampleWall(c)) assertSampled(s, `culture wall ${s.category} ${c}`);
    assertSampled(bidceptionSampleTree(c), `bidception tree ${c}`);
  }
  assertSampled(BIDTHRONE_SAMPLE_RECORD, "bidthrone record");
});

test("sample money is integer minor units in the sample's own currency", () => {
  for (const c of SUPPORTED_CURRENCIES) {
    const t = foundersWorkTicketExample(c);
    const r = foundersResearchTicketExample(c);
    const b = cultureBriefExample(c);
    const wall = cultureSampleWall(c);
    const tree = bidceptionSampleTree(c);
    assert.equal(t.currency, c, "ticket currency matches the set");
    assert.equal(b.currency, c);
    assert.equal(tree.currency, c);
    for (const s of wall) assert.equal(s.currency, c);
    const values = [
      t.rewardMinor,
      r.rewardMinor,
      b.rewardMinor,
      ...wall.map((s) => s.rewardMinor),
      tree.totalMinor,
      tree.captainMinor,
      ...tree.children.map((ch) => ch.minor),
      tree.reserveMinor,
    ];
    for (const v of values) {
      assert.ok(Number.isInteger(v), `sample amount ${v} must be an integer minor unit`);
      assert.ok(v >= 0, "sample amounts are non-negative");
    }
  }
});

test("the INR and USD sample sets are independent values (no FX conversion)", () => {
  // Illustrative local sample values: the two sets are unrelated product
  // decisions, so at least one pair differs in ratio and nothing is a
  // round-number exchange rate of the other.
  const inr = foundersWorkTicketExample("INR");
  const usd = foundersWorkTicketExample("USD");
  assert.equal(inr.rewardMinor, 8_500_000, "INR hero ticket is ₹85,000");
  assert.equal(usd.rewardMinor, 100_000, "USD hero ticket is $1,000");
  assert.equal(foundersResearchTicketExample("INR").rewardMinor, 4_000_000, "INR research ₹40,000");
  assert.equal(foundersResearchTicketExample("USD").rewardMinor, 50_000, "USD research $500");
  assert.equal(cultureBriefExample("INR").rewardMinor, 5_000_000, "INR culture hero ₹50,000");
  assert.equal(cultureBriefExample("USD").rewardMinor, 60_000, "USD culture hero $600");
});

test("no sample implies real marketplace activity", () => {
  const notes = [
    foundersWorkTicketExample("INR").note,
    foundersWorkTicketExample("USD").note,
    cultureBriefExample("INR").note,
    cultureBriefExample("USD").note,
    bidceptionSampleTree("INR").note,
    bidceptionSampleTree("USD").note,
    BIDTHRONE_SAMPLE_RECORD.label,
    BIDTHRONE_SAMPLE_RECORD.disclaimer,
  ];
  for (const t of notes) {
    assert.ok(
      !/\bverified\b/i.test(t) && !/\bsettled\b/i.test(t) && !/\bpaid\b/i.test(t),
      `sample note must not say verified/paid/settled: ${t}`,
    );
  }
  assert.deepEqual(
    cultureSampleWall("INR").map((s) => s.licenseLine),
    cultureSampleWall("USD").map((s) => s.licenseLine),
    "license wording is currency-independent",
  );
  assert.deepEqual(
    cultureSampleWall("INR").map((s) => s.licenseLine),
    [
      "Paid amplification · 60 days",
      "Exclusive license · 180 days",
      "Full rights · Perpetual",
      "Paid amplification · 90 days",
    ],
    "sample license lines are the spec wording, verbatim",
  );
  // "live" only in the negated form ("Not a live bounty", "Not live").
  for (const t of [
    foundersWorkTicketExample("INR").note,
    cultureBriefExample("USD").note,
    bidceptionSampleTree("INR").note,
  ]) {
    assert.ok(/not (a )?live/i.test(t), `sample disclaimer negates "live": ${t}`);
  }
});

test("the bidthrone sample record is NR with zero counters (no invented number)", () => {
  const r = BIDTHRONE_SAMPLE_RECORD;
  assert.equal(r.bidIndexStatus, "NR", "the sample Bid Index is NR, never a number");
  assert.equal(r.counters.bountiesWon, 0);
  assert.equal(r.counters.projectsCompleted, 0);
  assert.equal(r.counters.teamsCaptained, 0);
  assert.equal(r.handle, "example");
  assert.equal(r.modelVersion, "BI-1.0");
});

test("the sample allocation tree reconciles exactly in BOTH currencies", () => {
  const inr = bidceptionSampleTree("INR");
  const usd = bidceptionSampleTree("USD");
  for (const t of [inr, usd]) {
    const parts =
      t.captainMinor + t.children.reduce((a, c) => a + c.minor, 0) + t.reserveMinor;
    assert.equal(parts, t.totalMinor, `${t.currency}: the sample tree must add up, to the minor unit`);
  }
  // INR: ₹1,00,000 total, ₹10,000 captain, 30k/20k/25k/15k children, no reserve.
  assert.equal(inr.totalMinor, 100_000_00, "total is ₹1,00,000 in minor units");
  assert.equal(inr.captainMinor, 1_000_000, "captain is ₹10,000");
  assert.deepEqual(
    inr.children.map((c) => c.minor),
    [3_000_000, 2_000_000, 2_500_000, 1_500_000],
    "INR child allocations are the spec values",
  );
  assert.equal(inr.reserveMinor, 0);
  // USD: $1,200 total, $120 captain, 360/240/300/180 children, no reserve.
  assert.equal(usd.totalMinor, 120_000, "total is $1,200 in minor units");
  assert.equal(usd.captainMinor, 12_000, "captain is $120");
  assert.deepEqual(
    usd.children.map((c) => c.minor),
    [36_000, 24_000, 30_000, 18_000],
    "USD child allocations are the spec values",
  );
  assert.equal(usd.reserveMinor, 0);
});

test("samples never enter the database (no sample rows in users/bounties)", async () => {
  const { getPglite } = await import("../src/lib/db.server");
  const pg = await getPglite();
  const titles = [
    foundersWorkTicketExample("INR").title,
    cultureBriefExample("INR").title,
    ...cultureSampleWall("INR").map((x) => x.title),
    ...cultureSampleWall("USD").map((x) => x.title),
  ];
  const users = await pg.query<{ n: number }>("select count(*)::int as n from users where display_name = $1", [BIDTHRONE_SAMPLE_RECORD.name]);
  assert.equal(Number(users.rows[0]?.n ?? 0), 0, "the EXAMPLE MEMBER is not a user row");
  for (const t of titles) {
    const b = await pg.query<{ n: number }>("select count(*)::int as n from bounties where title = $1", [t]);
    assert.equal(Number(b.rows[0]?.n ?? 0), 0, `sample title is not a bounty row: ${t}`);
  }
});

test("sample wall categories are the spec set in both currencies", () => {
  for (const c of SUPPORTED_CURRENCIES) {
    const cats = cultureSampleWall(c).map((s) => s.category);
    assert.deepEqual(cats.sort(), ["Music", "Naming", "Photography", "UGC"].sort(), `${c}`);
    for (const s of cultureSampleWall(c)) {
      assert.equal(s.slotsTaken, 0, "no sample claims a filled slot");
    }
  }
});

test("unknown sample currencies fail visibly (never assumed INR)", () => {
  assert.throws(() => foundersWorkTicketExample("EUR"), /unsupported sample currency/i);
  assert.throws(() => bidceptionSampleTree("AUD"), /unsupported sample currency/i);
});

/**
 * RC5.2: every monetary sample that represents a postable bounty/brief must
 * satisfy the ACTUAL per-currency product rules (the single policy in
 * money.ts) — the product must never demonstrate work it cannot post.
 */
test("RC5.2: every bounty-shaped sample meets its currency's launch floor", () => {
  for (const c of ["INR", "USD"] as const) {
    const bountySamples = [
      foundersWorkTicketExample(c),
      foundersResearchTicketExample(c),
      cultureBriefExample(c),
      ...cultureSampleWall(c),
    ];
    for (const s of bountySamples) {
      assert.ok(
        s.rewardMinor >= minBountyRewardMinor(c),
        `"${s.title}" sample (${c} ${s.rewardMinor}) is postable: >= the ${c} bounty floor ${minBountyRewardMinor(c)}`,
      );
    }
  }
  // The sample parent trees satisfy the team-project budget floor too.
  for (const c of ["INR", "USD"] as const) {
    const t = bidceptionSampleTree(c);
    assert.ok(t.totalMinor / 100 >= minParentBudgetMajor(c), `${c} sample tree total >= the parent budget floor (major units)`);
  }
});
