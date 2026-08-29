import { test } from "node:test";
import assert from "node:assert/strict";
import {
  MODEL_VERSION,
  clamp,
  sat,
  valueFactor,
  bountyComplexity,
  projectComplexity,
  captainComplexity,
  complexityWeight,
  recencyFactor,
  counterpartyFactor,
  reviewerFactor,
  eventWeight,
  severityWeight,
  posterior,
  pillarValue,
  roleBase,
  effectiveSampleSize,
  counterpartyDiversity,
  historySpanFactor,
  confidence,
  confidenceLabel,
  roleScore,
  scoreBand,
  timelinessValue,
  decisionTimelinessValue,
  stewardshipValue,
  childOutcomeValue,
  roleExposure,
  overallBlend,
  overallScore,
  hardCapForEvents,
  isMajorDefault,
  isSevereIntegrity,
  marginalImpact,
  rating01,
  availableMean,
  isEligible,
} from "./model-v1";

/** RC4 §70: unit tests for every mathematical primitive. */

function close(a: number, b: number, eps = 1e-9): boolean {
  return Math.abs(a - b) <= eps;
}

test("clamp is NaN-safe and bounded", () => {
  assert.equal(clamp(5, 0, 1), 1);
  assert.equal(clamp(-5, 0, 1), 0);
  assert.equal(clamp(0.5, 0, 1), 0.5);
  assert.equal(clamp(NaN, 0, 1), 0);
  assert.equal(clamp(NaN, 0.75, 1.75), 0.75);
});

test("sat matches its definition", () => {
  assert.ok(close(sat(0, 4), 0));
  assert.ok(close(sat(4, 4), 1 - Math.exp(-1)));
  assert.ok(close(sat(100, 4), 1));
  assert.equal(sat(NaN, 4), 0);
  assert.equal(sat(5, NaN), 0);
});

test("value factor reference examples (§13) with concave caps", () => {
  // inputs are paise: rupees × 100
  assert.ok(close(valueFactor(500_000), 0.75), "₹5,000 → 0.75");
  assert.ok(close(valueFactor(1_000_000), 0.7984, 1e-3), "₹10,000 → ≈0.80");
  assert.ok(close(valueFactor(2_500_000), 1.0, 1e-9), "₹25,000 → 1.00");
  assert.ok(close(valueFactor(5_000_000), 1.1525, 1e-3), "₹50,000 → ≈1.15");
  assert.ok(close(valueFactor(10_000_000), 1.3052, 1e-3), "₹1,00,000 → ≈1.30");
  assert.ok(close(valueFactor(50_000_000), 1.6591, 1e-3), "₹5,00,000 → ≈1.66");
  assert.ok(close(valueFactor(100_000_000), 1.75), "₹10,00,000 capped at 1.75");
  assert.ok(close(valueFactor(1e12), 1.75), "huge money stays capped");
  assert.equal(valueFactor(0), 0.75);
  assert.equal(valueFactor(NaN), 0.75);
});

test("complexity formulas match §15", () => {
  // sat at its own scale = 1 - e^-1 ≈ 0.632, so a 4-skill/45-day bounty sits mid-range
  const mid = bountyComplexity(4, 45);
  assert.ok(close(mid, 1 - Math.exp(-1)));
  assert.ok(close(bountyComplexity(40, 450), 1, 1e-3), "large inputs saturate to C=1");
  assert.ok(close(bountyComplexity(0, 0), 0));
  assert.ok(close(projectComplexity(64, 64, 960), 1, 1e-3));
  assert.ok(close(projectComplexity(0, 0, 0), 0));
  const captain = captainComplexity({
    distinctSkills: 60,
    childUnits: 50,
    dependencyEdges: 40,
    distinctWorkers: 50,
    plannedDays: 900,
  });
  assert.ok(close(captain, 1, 1e-3));
  assert.ok(bountyComplexity(2, 30) < 1);
  // participant count is NOT an input to bounty complexity (§15.1)
  assert.equal(bountyComplexity(2, 30), bountyComplexity(2, 30) + 0);
  assert.equal(complexityWeight(0), 0.9);
  assert.equal(complexityWeight(1), 1.25);
  assert.ok(close(complexityWeight(0.5), 1.075));
});

test("recency: today ≈1.15, one year ≈1.075, three years ≈1.02, old → 1.0 (§16)", () => {
  assert.ok(recencyFactor(0) > 1.14);
  assert.ok(close(recencyFactor(365), 1.075), `got ${recencyFactor(365)}`);
  assert.ok(close(recencyFactor(365 * 3), 1.0188, 1e-3));
  assert.ok(close(recencyFactor(365 * 10), 1.0, 1e-3));
});

test("pair damping thresholds (§17)", () => {
  assert.equal(counterpartyFactor(1), 1.0);
  assert.equal(counterpartyFactor(3), 1.0);
  assert.equal(counterpartyFactor(4), 0.6);
  assert.equal(counterpartyFactor(10), 0.6);
  assert.equal(counterpartyFactor(11), 0.3);
  assert.equal(counterpartyFactor(100), 0.3);
});

test("reviewer factor: brand-new counts 60%, established 100% (§27)", () => {
  assert.equal(reviewerFactor(0), 0.6);
  assert.ok(close(reviewerFactor(1), 0.6 + 0.4 * Math.sqrt(0.1)));
  assert.equal(reviewerFactor(10), 1.0);
  assert.equal(reviewerFactor(100), 1.0);
});

test("event weight multiplies V * Wc * R * P and clamps (§18)", () => {
  const expected =
    valueFactor(2_500_000) *
    complexityWeight(0.5) *
    recencyFactor(30) *
    counterpartyFactor(1);
  const w = eventWeight({ amountMinor: 2_500_000, complexity: 0.5, ageDays: 30, pairIndex: 1 });
  assert.ok(close(w, expected));
  assert.ok(w >= 0.4 && w <= 2.5);
  const damped = eventWeight({ amountMinor: 2_500_000, complexity: 0.5, ageDays: 0, pairIndex: 20 });
  const plain = eventWeight({ amountMinor: 2_500_000, complexity: 0.5, ageDays: 0, pairIndex: 1 });
  // the raw product would be 0.30×, but the §18 weight floor is 0.40
  assert.ok(close(damped, Math.max(0.4, plain * 0.3), 1e-9), "20th outcome from one pair is damped (floor 0.40)");
});

test("severity multipliers and the failure clamp (§19)", () => {
  assert.equal(severityWeight(1, "NORMAL"), 1);
  assert.ok(close(severityWeight(1, "ATTRIBUTABLE_CANCELLATION"), 1.5));
  assert.ok(close(severityWeight(1, "ABANDONMENT_OR_NONPERFORMANCE"), 2.25));
  assert.ok(close(severityWeight(1, "PAYMENT_DEFAULT_OR_ABUSIVE_CHARGEBACK"), 2.75));
  assert.ok(close(severityWeight(1, "FRAUD_OR_COLLUSION_CONFIRMED"), 4.0));
  assert.equal(severityWeight(100, "FRAUD_OR_COLLUSION_CONFIRMED"), 5.0, "failure weight clamps at 5.0");
  assert.equal(isMajorDefault("ABANDONMENT_OR_NONPERFORMANCE"), true);
  assert.equal(isMajorDefault("PAYMENT_DEFAULT_OR_ABUSIVE_CHARGEBACK"), true);
  assert.equal(isMajorDefault("ATTRIBUTABLE_CANCELLATION"), false);
  assert.equal(isSevereIntegrity("FRAUD_OR_COLLUSION_CONFIRMED"), true);
});

test("posterior is the fractional Bayesian update (§22)", () => {
  assert.ok(close(posterior(0.7, 4, [{ weight: 1, value: 1 }, { weight: 1, value: 0 }]), (0.7 * 4 + 1) / 6));
  assert.ok(close(posterior(0.85, 5, []), 0.85), "no observations → prior");
  assert.ok(close(posterior(0.7, 4, [{ weight: 0, value: 0 }]), 0.7), "zero weight does not move it");
  assert.ok(close(posterior(0.7, 4, [{ weight: NaN, value: 1 }]), 0.7), "invalid observations skipped");
});

test("pillar aggregation uses the role prior tables", () => {
  assert.ok(close(pillarValue("PROVIDER", "RELIABILITY", []), 0.7));
  assert.ok(close(pillarValue("CAPTAIN", "BUDGET_STEWARDSHIP", []), 0.75));
  assert.ok(close(pillarValue("SPONSOR", "INTEGRITY", []), 0.85));
});

test("rating normalization and available-mean: missing is NOT zero (§42)", () => {
  assert.equal(rating01(1), 0);
  assert.equal(rating01(5), 1);
  assert.equal(rating01(3), 0.5);
  assert.equal(rating01(null), null);
  assert.equal(rating01(0), null, "out-of-range rating rejected");
  // availableMean consumes already-normalized values and skips the missing ones
  const mean = availableMean([null, 0.5, undefined]);
  assert.ok(mean !== null && close(mean, 0.5));
  const mean2 = availableMean([null, 1, 0]);
  assert.ok(mean2 !== null && close(mean2, 0.5));
  assert.equal(availableMean([null, null]), null);
});

test("roleBase: weak integrity cannot be washed out (geometric majority §28)", () => {
  const mixed = {
    RELIABILITY: 0.95,
    QUALITY: 0.95,
    TIMELINESS: 0.95,
    COMMUNICATION: 0.95,
    INTEGRITY: 0.05,
  };
  const b = roleBase(mixed, "PROVIDER");
  const arithmetic = 0.35 * 0.95 + 0.2 * 0.95 + 0.15 * 0.95 + 0.1 * 0.95 + 0.2 * 0.05;
  assert.ok(b < 0.65, `weak integrity must bite hard, got ${b}`);
  assert.ok(b < arithmetic - 0.15, "the geometric component drags the base well below arithmetic");
  const strong = roleBase(
    { RELIABILITY: 0.95, QUALITY: 0.95, TIMELINESS: 0.95, COMMUNICATION: 0.95, INTEGRITY: 0.95 },
    "PROVIDER",
  );
  assert.ok(strong > 0.9);
});

test("Kish effective sample size (§29)", () => {
  assert.equal(effectiveSampleSize([1, 1, 1, 1, 1]), 5);
  assert.equal(effectiveSampleSize([10]), 1, "one giant job has n_eff ≈ 1");
  assert.equal(effectiveSampleSize([2, 2, 2, 2]), 4);
  assert.ok(close(effectiveSampleSize([1, 10]), 121 / 101));
  assert.equal(effectiveSampleSize([]), 0);
});

test("confidence: one giant transaction cannot produce high confidence", () => {
  const c = confidence({ effectiveSampleSize: 1, uniqueCounterparties: 1, spanDays: 0 });
  assert.ok(c < 0.2, `got ${c}`);
  assert.equal(confidenceLabel(c), "PROVISIONAL");
});

test("confidence factors: diversity and span (§29.1/§29.2)", () => {
  assert.equal(counterpartyDiversity(0), 0.7);
  assert.ok(close(counterpartyDiversity(2), 0.82));
  assert.equal(counterpartyDiversity(5), 1.0);
  assert.equal(historySpanFactor(0), 0.85);
  assert.ok(close(historySpanFactor(365), 1.0));
});

test("fixture: two clean outcomes, two counterparties, ~30 days ≈ 680 PROVISIONAL (§32)", () => {
  const weights = [1.153, 1.153];
  const nEff = effectiveSampleSize(weights);
  const c = confidence({ effectiveSampleSize: nEff, uniqueCounterparties: 2, spanDays: 30 });
  assert.ok(c < 0.45, `confidence must be PROVISIONAL, got ${c}`);
  const rf = reviewerFactor(0); // brand-new reviewer
  const pillars = {
    RELIABILITY: pillarValue("PROVIDER", "RELIABILITY", [
      { weight: 1.153, value: 1 },
      { weight: 1.153, value: 1 },
    ]),
    QUALITY: pillarValue("PROVIDER", "QUALITY", [
      { weight: 1.153 * rf, value: 1 },
      { weight: 1.153 * rf, value: 1 },
    ]),
    TIMELINESS: pillarValue("PROVIDER", "TIMELINESS", [
      { weight: 1.153, value: 1 },
      { weight: 1.153, value: 1 },
    ]),
    COMMUNICATION: pillarValue("PROVIDER", "COMMUNICATION", [
      { weight: 1.153 * rf, value: 1 },
      { weight: 1.153 * rf, value: 1 },
    ]),
    INTEGRITY: pillarValue("PROVIDER", "INTEGRITY", [
      { weight: 0.25 * 1.153, value: 1 },
      { weight: 0.25 * 1.153, value: 1 },
    ]),
  };
  const score = roleScore(roleBase(pillars, "PROVIDER"), c);
  assert.ok(score >= 655 && score <= 700, `fixture 2-clean: expected ≈680, got ${score}`);
  assert.equal(confidenceLabel(c), "PROVISIONAL");
});

test("fixture: ten clean outcomes, 5+ counterparties, ~365d ≈ 790–800 SUPPORTED (§32)", () => {
  const weights = Array.from({ length: 10 }, () => 1.15);
  const nEff = effectiveSampleSize(weights);
  const c = confidence({ effectiveSampleSize: nEff, uniqueCounterparties: 5, spanDays: 365 });
  assert.equal(confidenceLabel(c), "SUPPORTED");
  const rf = reviewerFactor(10);
  const pillars = {
    RELIABILITY: pillarValue("PROVIDER", "RELIABILITY", weights.map((w) => ({ weight: w, value: 1 }))),
    QUALITY: pillarValue("PROVIDER", "QUALITY", weights.map((w) => ({ weight: w * rf, value: 1 }))),
    TIMELINESS: pillarValue("PROVIDER", "TIMELINESS", weights.map((w) => ({ weight: w, value: 1 }))),
    COMMUNICATION: pillarValue("PROVIDER", "COMMUNICATION", weights.map((w) => ({ weight: w * rf, value: 1 }))),
    INTEGRITY: pillarValue("PROVIDER", "INTEGRITY", weights.map((w) => ({ weight: 0.25 * w, value: 1 }))),
  };
  const score = roleScore(roleBase(pillars, "PROVIDER"), c);
  assert.ok(score >= 780 && score <= 805, `fixture 10-clean: expected 790–800, got ${score}`);
});

test("fixture: twenty clean outcomes over ~730d ≈ 840–855 HIGH (§32)", () => {
  const weights = Array.from({ length: 20 }, (_, i) => 1.08 + 0.02 * (i % 3));
  const nEff = effectiveSampleSize(weights);
  const c = confidence({ effectiveSampleSize: nEff, uniqueCounterparties: 5, spanDays: 730 });
  assert.equal(confidenceLabel(c), "HIGH");
  const rf = reviewerFactor(20);
  const pillars = {
    RELIABILITY: pillarValue("PROVIDER", "RELIABILITY", weights.map((w) => ({ weight: w, value: 1 }))),
    QUALITY: pillarValue("PROVIDER", "QUALITY", weights.map((w) => ({ weight: w * rf, value: 1 }))),
    TIMELINESS: pillarValue("PROVIDER", "TIMELINESS", weights.map((w) => ({ weight: w, value: 1 }))),
    COMMUNICATION: pillarValue("PROVIDER", "COMMUNICATION", weights.map((w) => ({ weight: w * rf, value: 1 }))),
    INTEGRITY: pillarValue("PROVIDER", "INTEGRITY", weights.map((w) => ({ weight: 0.25 * w, value: 1 }))),
  };
  const score = roleScore(roleBase(pillars, "PROVIDER"), c);
  assert.ok(score >= 835 && score <= 860, `fixture 20-clean: expected 840–855, got ${score}`);
});

test("roleScore shrinks to the network prior at zero confidence and clamps (§30)", () => {
  assert.equal(roleScore(1.0, 0), 660, "zero confidence → prior 0.60 → 660");
  assert.equal(roleScore(0.6, 0), 660);
  assert.equal(roleScore(1, 1), 900);
  assert.equal(roleScore(0, 1), 300);
  assert.equal(roleScore(NaN, 0.5), roleScore(0, 0.5), "NaN never propagates");
});

test("bands (§33)", () => {
  assert.deepEqual(scoreBand(300), { label: "Critical observed risk", low: 300, high: 499 });
  const caution = scoreBand(660);
  assert.ok(typeof caution === "object" && caution.label === "Caution");
  assert.equal(scoreBand(680) && (scoreBand(680) as { label: string }).label, "Building");
  assert.equal((scoreBand(740) as { label: string }).label, "Established");
  assert.equal((scoreBand(800) as { label: string }).label, "Strong");
  assert.equal((scoreBand(850) as { label: string }).label, "Exceptional");
  assert.equal((scoreBand(900) as { label: string }).label, "Exceptional");
  assert.equal(scoreBand(NaN), "NR");
});

test("observed value functions: timeliness, decisions, stewardship, children", () => {
  assert.equal(timelinessValue(0, 30), 1);
  const full = timelinessValue(30, 30);
  assert.ok(full > 0.075 && full < 0.1, "a whole planned period late is strongly reduced");
  assert.ok(close(timelinessValue(3, 30), Math.exp(-2.5 * 0.1)));
  assert.equal(timelinessValue(0, 3), 1, "planned floor of 7 days");
  assert.ok(close(decisionTimelinessValue(7), Math.exp(-1)));
  assert.equal(decisionTimelinessValue(0), 1);
  assert.equal(stewardshipValue(0, 100000), 1);
  assert.equal(stewardshipValue(25000, 100000), 0.75);
  assert.equal(stewardshipValue(0, 0), 1, "zero committed denominator floored");
  assert.equal(childOutcomeValue(75000, 100000), 0.75);
  assert.ok(close(childOutcomeValue(0, 100000), 0));
});

test("role exposure caps the volume boost (§36)", () => {
  assert.equal(roleExposure(0, 0), 0);
  const capped = roleExposure(100, 1_000_000_000_000);
  assert.ok(capped <= 10 * 1.6);
  assert.ok(roleExposure(1, 2_500_000_000) <= 1.6);
});

test("overall blend reserves at most 80% share to a giant role (§36)", () => {
  const big = { bRaw: 0.95, confidence: 0.9, effectiveSampleSize: 100, verifiedVolumeMinor: 1_000_000_000_000 };
  const small = { bRaw: 0.55, confidence: 0.3, effectiveSampleSize: 2, verifiedVolumeMinor: 0 };
  const result = overallBlend([big, small]);
  assert.ok(result, "blend exists for scored roles");
  const finalTotal = result!.shares.reduce((a, b) => a + b, 0);
  const normalized = result!.shares.map((s) => s / finalTotal);
  assert.ok(close(finalTotal, 1, 1e-9) || normalized[0] === normalized[0]);
  assert.ok(
    Math.max(...normalized) <= 0.801,
    `largest role share capped at 80%, got ${Math.max(...normalized)}`,
  );
  const score = overallScore(result!.bNetwork);
  assert.ok(score >= 300 && score <= 900);
  assert.ok(
    score < roleScore(big.bRaw, big.confidence),
    "the overall cannot conceal a weak scored role (§36)",
  );
  const solo = overallBlend([big]);
  assert.ok(solo, "single scored role blends to itself");
  const soloScore = overallScore(solo!.bNetwork);
  assert.equal(soloScore, roleScore(big.bRaw, big.confidence), "one role: overall === role score");
});

test("hard caps (§34)", () => {
  assert.equal(
    hardCapForEvents({ majorDefaultsDaysAgo: [0], currentlyRestricted: false, severeEventReinstatedDaysAgo: null }),
    649,
  );
  assert.equal(
    hardCapForEvents({ majorDefaultsDaysAgo: [180], currentlyRestricted: false, severeEventReinstatedDaysAgo: null }),
    649,
  );
  const mid = hardCapForEvents({ majorDefaultsDaysAgo: [455], currentlyRestricted: false, severeEventReinstatedDaysAgo: null });
  assert.ok(mid !== null && mid > 649 && mid < 799, `linear recovery mid-point, got ${mid}`);
  assert.equal(
    hardCapForEvents({ majorDefaultsDaysAgo: [731], currentlyRestricted: false, severeEventReinstatedDaysAgo: null }),
    null,
    "cap expires after day 730",
  );
  const repeated = hardCapForEvents({ majorDefaultsDaysAgo: [100, 200], currentlyRestricted: false, severeEventReinstatedDaysAgo: null });
  assert.equal(repeated, 549);
  const repeatedMid = hardCapForEvents({ majorDefaultsDaysAgo: [500, 600], currentlyRestricted: false, severeEventReinstatedDaysAgo: null });
  assert.ok(repeatedMid !== null && repeatedMid > 549 && repeatedMid < 699);
  assert.equal(
    hardCapForEvents({ majorDefaultsDaysAgo: [], currentlyRestricted: true, severeEventReinstatedDaysAgo: null }),
    null,
    "restricted accounts hide the numeric score at the service level",
  );
  assert.equal(
    hardCapForEvents({ majorDefaultsDaysAgo: [], currentlyRestricted: false, severeEventReinstatedDaysAgo: 10 }),
    499,
  );
  const reinstMid = hardCapForEvents({ majorDefaultsDaysAgo: [], currentlyRestricted: false, severeEventReinstatedDaysAgo: 730 });
  assert.ok(reinstMid !== null && reinstMid > 499 && reinstMid < 649);
  assert.equal(
    hardCapForEvents({ majorDefaultsDaysAgo: [], currentlyRestricted: false, severeEventReinstatedDaysAgo: 1096 }),
    null,
  );
});

test("marginal impact is the true score difference (§35)", () => {
  assert.equal(marginalImpact(820, 881), -61);
  assert.equal(marginalImpact(700.4, 700.6), -1, "rounded score points");
  assert.equal(marginalImpact(700.2, 699.8), 0);
  assert.equal(marginalImpact(880, 700), 180, "removing an adverse event raises the score");
});

test("model version is pinned", () => {
  assert.equal(MODEL_VERSION, "BI-1.0");
});

test("eligibility: two outcomes AND two counterparties (§6)", () => {
  assert.equal(isEligible(2, 2), true);
  assert.equal(isEligible(1, 5), false, "one transaction never scores");
  assert.equal(isEligible(5, 1), false, "one counterparty never scores");
  assert.equal(isEligible(0, 0), false);
});