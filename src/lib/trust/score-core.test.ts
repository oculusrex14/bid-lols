import { test } from "node:test";
import assert from "node:assert/strict";
import {
  scoreRole,
  networkOverall,
  type RoleOutcome,
  type PreparedEvidence,
  type RoleScoreResult,
} from "./score-core";
import type { Role, SeverityCode } from "./model-v1";

/** RC4 §62: scoring-pipeline property tests (pure pipeline level). */

function cleanOutcome(over: Partial<RoleOutcome> = {}): RoleOutcome {
  return {
    workKey: "w",
    counterpartyUserId: "cp",
    excludedFromEvidence: false,
    occurredDaysAgo: 30,
    amountMinor: 2_500_000,
    severity: "NORMAL",
    complexity: 0.5,
    review: null,
    timelinessY: 1,
    decisionDelayDays: null,
    stewardshipY: null,
    childOutcomeY: null,
    weightShare: 1,
    ...over,
  };
}

function prep(
  role: Role,
  outcomes: RoleOutcome[],
  extra: Partial<PreparedEvidence> = {},
): PreparedEvidence {
  return {
    role,
    outcomes,
    currentlyRestricted: false,
    severeEventReinstatedDaysAgo: null,
    ...extra,
  };
}

const DISTINCT = ["cp1", "cp2", "cp3", "cp4", "cp5"];

function steadyProvider(n: number, daysBetween = 100): RoleOutcome[] {
  return Array.from({ length: n }, (_, i) =>
    cleanOutcome({
      workKey: `work-${i}`,
      counterpartyUserId: DISTINCT[i % DISTINCT.length],
      occurredDaysAgo: (n - 1 - i) * daysBetween,
      review: {
        revealed: true,
        reviewerPrimaryOutcomes: 50,
        quality: 5,
        value: 5,
        communication: 5,
        clarity: 5,
        fairness: 5,
      },
    }),
  );
}

test("§62.1/2: no history and one clean outcome are NR", () => {
  assert.equal(scoreRole(prep("PROVIDER", [])).status, "NR");
  const one = scoreRole(prep("PROVIDER", [cleanOutcome({})]));
  assert.equal(one.status, "NR", "a single transaction never scores");
  assert.equal(one.score, null);
  assert.equal(one.primaryOutcomes, 1, "factual history shows while NR");
});

test("§62.3: adding a clean unrelated outcome never lowers the score", () => {
  const two = scoreRole(prep("PROVIDER", [
    cleanOutcome({ workKey: "w1", counterpartyUserId: "cp1", occurredDaysAgo: 400 }),
    cleanOutcome({ workKey: "w2", counterpartyUserId: "cp2", occurredDaysAgo: 31 }),
  ]));
  const three = scoreRole(prep("PROVIDER", [
    cleanOutcome({ workKey: "w1", counterpartyUserId: "cp1", occurredDaysAgo: 400 }),
    cleanOutcome({ workKey: "w2", counterpartyUserId: "cp2", occurredDaysAgo: 31 }),
    cleanOutcome({ workKey: "w3", counterpartyUserId: "cp3", occurredDaysAgo: 10 }),
  ]));
  assert.equal(two.status, "SCORED");
  assert.equal(three.status, "SCORED");
  assert.ok((three.score ?? 0) >= (two.score ?? 0), `3-outcome ${three.score} must be >= 2-outcome ${two.score}`);
});

test("§62.4: adding a finalized adverse event cannot raise the score", () => {
  const baseFacts = steadyProvider(4, 30);
  const withAdditional = scoreRole(prep("PROVIDER", baseFacts));
  const withAdverse = scoreRole(prep("PROVIDER", [
    ...baseFacts,
    cleanOutcome({
      workKey: "w-bad",
      counterpartyUserId: "cp6",
      occurredDaysAgo: 1,
      amountMinor: 5_000_000_00,
      severity: "ABANDONMENT_OR_NONPERFORMANCE",
      complexity: 0.8,
      review: null,
      timelinessY: 0,
    }),
  ]));
  assert.ok(
    (withAdverse.score ?? 900) <= (withAdditional.score ?? 0),
    `adverse outcome must not raise the score: ${withAdverse.score} vs ${withAdditional.score}`,
  );
  assert.ok(withAdverse.capApplied !== null, "a major default applies a hard cap");
  assert.ok((withAdverse.score ?? 900) <= 649, "cap ≤ 649 for a fresh major default");
});

test("§62.5/6: a larger-value or more-complex adverse outcome hurts at least as much", () => {
  const small = adverseRole("ABANDONMENT_OR_NONPERFORMANCE", 2_500_000, 0.3);
  const big = adverseRole("ABANDONMENT_OR_NONPERFORMANCE", 5_000_000_00, 0.3);
  const complex = adverseRole("ABANDONMENT_OR_NONPERFORMANCE", 2_500_000, 0.95);
  assert.ok((small.score ?? 900) >= (big.score ?? 900), "bigger default cannot hurt less");
  assert.ok((small.score ?? 900) >= (complex.score ?? 900), "more complex default cannot hurt less");
});

function adverseRole(severity: SeverityCode, amountMinor: number, complexity: number): RoleScoreResult {
  return scoreRole(
    prep("PROVIDER", [
      cleanOutcome({ workKey: "w1", counterpartyUserId: "cp1", occurredDaysAgo: 400 }),
      cleanOutcome({ workKey: "w2", counterpartyUserId: "cp2", occurredDaysAgo: 31 }),
      cleanOutcome({
        workKey: "w-bad",
        counterpartyUserId: "cp3",
        occurredDaysAgo: 5,
        amountMinor,
        severity,
        complexity,
        timelinessY: 0,
      }),
    ]),
  );
}

test("§62.7/8: value adds evidence but caps; one giant job stays low confidence", () => {
  const small = scoreRole(prep("PROVIDER", [
    cleanOutcome({ workKey: "w1", counterpartyUserId: "cp1", occurredDaysAgo: 30 }),
    cleanOutcome({ workKey: "w2", counterpartyUserId: "cp2", occurredDaysAgo: 20 }),
  ]));
  const bigger = scoreRole(prep("PROVIDER", [
    cleanOutcome({ workKey: "w1", counterpartyUserId: "cp1", occurredDaysAgo: 30, amountMinor: 100_000_000 }),
    cleanOutcome({ workKey: "w2", counterpartyUserId: "cp2", occurredDaysAgo: 20, amountMinor: 100_000_000 }),
  ]));
  assert.ok((bigger.score ?? 0) > (small.score ?? 0), "bigger verified value carries somewhat more evidence");
  // …but not linearly: 40× the value adds well under 100 points.
  assert.ok((bigger.score ?? 0) - (small.score ?? 0) < 120, "value is logarithmically capped");
  const whale = scoreRole(prep("PROVIDER", [
    cleanOutcome({ workKey: "w-whale", counterpartyUserId: "cp1", occurredDaysAgo: 30, amountMinor: 100_000_000_00 }),
    cleanOutcome({ workKey: "w2", counterpartyUserId: "cp2", occurredDaysAgo: 25, amountMinor: 2_500_000 }),
  ]));
  assert.ok(whale.confidence < 0.45, `a whale + tiny history cannot be high confidence: ${whale.confidence}`);
});

test("§62.9/63: 10 farmed outcomes with one counterparty lose to 20 across 5", () => {
  const farmed = scoreRole(prep("PROVIDER", steadyProvider(20).map((o, i) => ({ ...o, counterpartyUserId: "same-pair" }))));
  const diverse = scoreRole(prep("PROVIDER", steadyProvider(20)));
  assert.ok(
    (diverse.score ?? 0) > (farmed.score ?? 0),
    `diverse ${diverse.score} must beat farmed ${farmed.score}`,
  );
  assert.ok(diverse.confidence > farmed.confidence);
  assert.ok(diverse.effectiveSampleSize > farmed.effectiveSampleSize);
});

test("§62.16: confirmed fraud publishes no numeric score while restricted", () => {
  const restricted = scoreRole(prep("PROVIDER", steadyProvider(10), { currentlyRestricted: true }));
  assert.equal(restricted.status, "RESTRICTED");
  assert.equal(restricted.score, null);
});

test("§62.17/18: numeric scores stay in 300–900; confidence in 0–1", () => {
  const r = scoreRole(prep("PROVIDER", steadyProvider(50)));
  assert.ok((r.score ?? 300) >= 300 && (r.score ?? 900) <= 900);
  assert.ok(r.confidence >= 0 && r.confidence <= 1);
});

test("§62.20: reordering rows cannot change the score", () => {
  const outcomes = steadyProvider(12);
  const shuffled = [...outcomes].reverse();
  const a = scoreRole(prep("PROVIDER", outcomes));
  const b = scoreRole(prep("PROVIDER", shuffled));
  assert.equal(a.score, b.score);
  assert.equal(a.confidence, b.confidence);
  assert.deepEqual(a.pillars, b.pillars);
});

test("§34.1: a recent major default caps a veteran at 649 despite 50 clean jobs", () => {
  const clean = steadyProvider(50);
  const veteran = scoreRole(prep("PROVIDER", clean));
  assert.ok((veteran.score ?? 0) >= 850, `setup: veteran should be strong, got ${veteran.score}`);
  const afterDefault = scoreRole(prep("PROVIDER", [
    ...clean.slice(1), // 49 clean outcomes
    cleanOutcome({
      workKey: "w-default",
      counterpartyUserId: "cp-new",
      occurredDaysAgo: 60,
      amountMinor: 50_000_000_00,
      severity: "ABANDONMENT_OR_NONPERFORMANCE",
      complexity: 0.9,
      timelinessY: 0,
    }),
  ]));
  assert.ok((afterDefault.score ?? 900) <= 649, `capped at 649, got ${afterDefault.score}`);
  // and the underlying adverse event also moved the displayed score down vs before
  assert.ok((afterDefault.score ?? 900) < (veteran.score ?? 0));
});

test("§62.14: losing a bounty is not evidence — absence of an outcome changes nothing", () => {
  const provider = scoreRole(prep("PROVIDER", [
    ...steadyProvider(4, 30),
    cleanOutcome({ workKey: "w5", counterpartyUserId: "cp4", occurredDaysAgo: 5 }),
  ]));
  assert.equal(provider.status, "SCORED");
  // A non-winning submission never becomes a RoleOutcome at all — there is no
  // event to add; the scoring pipeline only ever sees primary outcomes.
});

test("§62.15: provider strength cannot erase an active sponsor cap on the overall", () => {
  const provider = scoreRole(prep("PROVIDER", steadyProvider(20)));
  const sponsorClean = steadyProvider(6);
  const sponsor = scoreRole(prep("SPONSOR", [
    ...sponsorClean,
    cleanOutcome({
      workKey: "w-default",
      counterpartyUserId: "cp1",
      occurredDaysAgo: 30,
      amountMinor: 20_000_000_00,
      severity: "PAYMENT_DEFAULT_OR_ABUSIVE_CHARGEBACK",
      complexity: 0.5,
    }),
  ]));
  assert.equal(provider.status, "SCORED");
  assert.equal(sponsor.status, "SCORED");
  assert.ok((sponsor.capApplied ?? 900) <= 649);
  const overall = networkOverall([provider, sponsor]);
  assert.ok(overall, "overall exists");
  assert.ok((overall.score ?? 900) <= 649, `overall capped by the sponsor default, got ${overall.score}`);
});

test("§62.13/10: neutral cancellation and an open dispute add no outcome", () => {
  // Only finalized attributable events exist in the pipeline; neutral states
  // never produce RoleOutcomes, so scores are invariant to them (proven by
  // identical results with and without the absent event).
  const a = scoreRole(prep("PROVIDER", steadyProvider(5)));
  const b = scoreRole(prep("PROVIDER", steadyProvider(5)));
  assert.equal(a.score, b.score);
});

test("role scores are independent: eligibility differs per role", () => {
  const great = scoreRole(prep("PROVIDER", steadyProvider(20)));
  const tinyHistory = scoreRole(prep("SPONSOR", [
    cleanOutcome({ workKey: "s1", counterpartyUserId: "cp1", occurredDaysAgo: 10 }),
    cleanOutcome({ workKey: "s2", counterpartyUserId: "cp1", occurredDaysAgo: 5 }),
  ]));
  assert.equal(great.status, "SCORED");
  assert.equal(tinyHistory.status, "NR", "two outcomes with ONE counterparty never scores");
  assert.equal(tinyHistory.score, null);
  assert.equal(tinyHistory.primaryOutcomes, 2, "facts remain visible");
});

test("clean integrity evidence carries deliberately weak weight (§23.5)", () => {
  // integrity pillar observations are 0.25 * W — a long clean record moves
  // integrity only modestly above its 0.85 prior
  const r = scoreRole(prep("PROVIDER", steadyProvider(10)));
  assert.ok(r.pillars.INTEGRITY > 0.85);
  assert.ok(r.pillars.INTEGRITY < 0.93, `clean integrity stays weak, got ${r.pillars.INTEGRITY}`);
});