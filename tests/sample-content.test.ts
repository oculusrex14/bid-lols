import { test } from "node:test";
import assert from "node:assert/strict";
import {
  BIDCEPTION_SAMPLE_TREE,
  CULTURE_BRIEF_EXAMPLE,
  CULTURE_SAMPLE_WALL,
  FOUNDERS_WORK_TICKET_EXAMPLE,
  BIDTHRONE_SAMPLE_RECORD,
} from "../src/lib/sample-content";

/**
 * RC5 §12/§37: the example/sample contract. Samples are labelled
 * presentation only: every one carries example: true, the visible
 * EXAMPLE/SAMPLE wording, integer minor-unit money, and none of the
 * words that would imply actual marketplace activity (verified, paid,
 * settled, or unqualified "live").
 */

function assertSampled(obj: { example: true }, label: string): void {
  assert.equal(obj.example, true, `${label} must be flagged as an example`);
}

test("every sample object carries example: true", () => {
  assertSampled(FOUNDERS_WORK_TICKET_EXAMPLE, "founders ticket");
  assertSampled(CULTURE_BRIEF_EXAMPLE, "culture brief");
  for (const s of CULTURE_SAMPLE_WALL) assertSampled(s, `culture wall ${s.category}`);
  assertSampled(BIDCEPTION_SAMPLE_TREE, "bidception tree");
  assertSampled(BIDTHRONE_SAMPLE_RECORD, "bidthrone record");
});

test("sample money is integer minor units (never floats)", () => {
  const values = [
    FOUNDERS_WORK_TICKET_EXAMPLE.rewardMinor,
    CULTURE_BRIEF_EXAMPLE.rewardMinor,
    ...CULTURE_SAMPLE_WALL.map((s) => s.rewardMinor),
    BIDCEPTION_SAMPLE_TREE.totalMinor,
    BIDCEPTION_SAMPLE_TREE.captainMinor,
    ...BIDCEPTION_SAMPLE_TREE.children.map((c) => c.minor),
    BIDCEPTION_SAMPLE_TREE.reserveMinor,
  ];
  for (const v of values) {
    assert.ok(Number.isInteger(v), `sample amount ${v} must be an integer minor unit`);
    assert.ok(v >= 0, "sample amounts are non-negative");
  }
});

test("no sample implies real marketplace activity", () => {
  // The activity-state words (verified/paid/settled) must not appear in the
  // sample NOTES: a note claiming "paid" or "verified" would imply actual
  // marketplace activity. The license lines are the spec's sample license
  // wording ("Paid amplification · 90 days" describes the winning work's
  // rights, not an event), so they are asserted against the spec strings
  // instead.
  const notes = [
    FOUNDERS_WORK_TICKET_EXAMPLE.note,
    CULTURE_BRIEF_EXAMPLE.note,
    BIDCEPTION_SAMPLE_TREE.note,
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
    CULTURE_SAMPLE_WALL.map((s) => s.licenseLine),
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
    FOUNDERS_WORK_TICKET_EXAMPLE.note,
    CULTURE_BRIEF_EXAMPLE.note,
    BIDCEPTION_SAMPLE_TREE.note,
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

test("the sample allocation tree reconciles exactly (total = captain + children + reserve)", () => {
  const t = BIDCEPTION_SAMPLE_TREE;
  const parts =
    t.captainMinor + t.children.reduce((a, c) => a + c.minor, 0) + t.reserveMinor;
  assert.equal(parts, t.totalMinor, "the sample tree must add up, to the paise");
  assert.equal(t.totalMinor, 100_000_00, "total is ₹1,00,000 in minor units");
  assert.equal(t.captainMinor, 1_000_000, "captain is ₹10,000");
  assert.deepEqual(
    t.children.map((c) => c.minor),
    [3_000_000, 2_000_000, 2_500_000, 1_500_000],
    "child allocations are the spec values",
  );
  assert.equal(t.reserveMinor, 0, "the sample carries no reserve");
});

test("samples never enter the database (no sample rows in users/bounties)", async () => {
  const { getPglite } = await import("../src/lib/db.server");
  const pg = await getPglite();
  const titles = [
    FOUNDERS_WORK_TICKET_EXAMPLE.title,
    CULTURE_BRIEF_EXAMPLE.title,
    ...CULTURE_SAMPLE_WALL.map((x) => x.title),
  ];
  const users = await pg.query<{ n: number }>("select count(*)::int as n from users where display_name = $1", [BIDTHRONE_SAMPLE_RECORD.name]);
  assert.equal(Number(users.rows[0]?.n ?? 0), 0, "the EXAMPLE MEMBER is not a user row");
  for (const t of titles) {
    const b = await pg.query<{ n: number }>("select count(*)::int as n from bounties where title = $1", [t]);
    assert.equal(Number(b.rows[0]?.n ?? 0), 0, `sample title is not a bounty row: ${t}`);
  }
});

test("sample wall categories are the spec set with real-looking, clearly sample data", () => {
  const cats = CULTURE_SAMPLE_WALL.map((s) => s.category);
  assert.deepEqual(cats.sort(), ["Music", "Naming", "Photography", "UGC"].sort());
  for (const s of CULTURE_SAMPLE_WALL) {
    assert.equal(s.slotsTaken, 0, "no sample claims a filled slot");
  }
});
