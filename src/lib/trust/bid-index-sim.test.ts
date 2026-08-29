import { test } from "node:test";
import assert from "node:assert/strict";
import { PERSONAS, simulate, outcome, steadyProvider } from "./bid-index-sim";
import { scoreRole } from "./score-core";

/**
 * RC4 §61/§62/§63: the simulation runs the PRODUCTION scoring functions.
 * These are MODEL-VERIFICATION assertions, never calibration claims (§60).
 */

function personaBuild(label: string): () => ReturnType<typeof outcome>[] {
  const found = PERSONAS.find((p) => p.label.startsWith(label));
  if (!found) throw new Error(`missing persona: ${label}`);
  return found.outcomes;
}

function run(label: string): ReturnType<typeof simulate> {
  return simulate("PROVIDER", personaBuild(label)());
}

test("§62.1/2: a one-job member is NR", () => {
  assert.equal(run("NEW USER").status, "NR");
});

test("§32 fixtures land in the expected regions", () => {
  const two = simulate(
    "PROVIDER",
    [
      outcome({ workKey: "BOUNTY:w1", counterpartyUserId: "cp1", occurredDaysAgo: 30 }),
      outcome({ workKey: "BOUNTY:w2", counterpartyUserId: "cp2", occurredDaysAgo: 20 }),
    ],
  );
  assert.equal(two.status, "SCORED");
  assert.ok((two.score ?? 0) >= 655 && (two.score ?? 0) <= 700, `2 clean ≈ 680, got ${two.score}`);
  assert.equal(two.confidenceLabel, "PROVISIONAL");

  const ten = simulate(
    "PROVIDER",
    Array.from({ length: 10 }, (_, i) =>
      outcome({
        workKey: `BOUNTY:w${i}`,
        counterpartyUserId: `cp${(i % 5) + 1}`,
        occurredDaysAgo: 365 - i * 30,
        review: { revealed: true, reviewerPrimaryOutcomes: 100, quality: 5, value: 5, communication: 5, clarity: 5, fairness: 5 },
      }),
    ),
  );
  assert.ok(ten.status === "SCORED" && (ten.score ?? 0) >= 780 && (ten.score ?? 0) <= 810,
    `10 clean scores in the 790-800 region, got ${ten.score}`);
  assert.equal(ten.confidenceLabel, "SUPPORTED");
});

test("§63: 100 tiny jobs between two colluding accounts cannot dominate 20 diverse jobs", () => {
  const pair = run("COLLUDING PAIR");
  assert.equal(pair.status, "NR", "100 jobs with ONE counterparty are not score-eligible at all");
  const diverse = run("DIVERSE PROFESSIONAL");
  assert.ok(diverse.status === "SCORED" && (diverse.score ?? 0) > 800);
  assert.ok(diverse.confidence > pair.confidence || pair.status === "NR",
    "volume with one counterparty never beats diverse evidence");
});

test("§64: a ₹5,00,000 high-complexity abandonment caps a strong provider at 649", () => {
  const veteran = simulate(
    "PROVIDER",
    steadyProvider(20, { counterparties: 20, daysBetween: 37, reviewerOutcomes: 60 }),
  );
  assert.ok((veteran.score ?? 0) >= 830, "setup: veteran is strong");
  const after = simulate(
    "PROVIDER",
    [
      outcome({ workKey: "BOUNTY:w-bad", counterpartyUserId: "cp-new", occurredDaysAgo: 30, amountMinor: 50_000_000_00, severity: "ABANDONMENT_OR_NONPERFORMANCE", complexity: 0.95, timelinessY: 0, review: null }),
      ...steadyProvider(19, { counterparties: 10, daysBetween: 38, reviewerOutcomes: 60 }),
    ],
  );
  assert.ok((after.score ?? 900) <= 649, `major-default cap must bind (got ${after.score})`);
  assert.ok((after.score ?? 0) < (veteran.score ?? 0), "the default materially drops the score");
});

test("confirmed fraud hides the numeric score while restricted (§62.16)", () => {
  const r = scoreRole({ role: "PROVIDER", outcomes: steadyProvider(20, { counterparties: 20 }), currentlyRestricted: true, severeEventReinstatedDaysAgo: null });
  assert.equal(r.status, "RESTRICTED");
  assert.equal(r.score, null);
});

test("vindicated parties stay untouched; abusers converge low", () => {
  const vindicated = simulate("PROVIDER", personaBuild("STEADY PROVIDER")());
  assert.ok((vindicated.score ?? 0) > 700, "clean providers sit high for their history");
  const abuser = simulate("PROVIDER", personaBuild("DISPUTE ABUSER")());
  assert.ok((abuser.score ?? 900) <= 549, "two majors inside 730 days cap at 549");
});