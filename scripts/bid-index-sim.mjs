#!/usr/bin/env node
// @ts-nocheck — exercised via tsx (production scoring fns are .ts); loaded by src/lib/trust/bid-index-sim.test.ts under tsx as well.
/**
 * RC4 §61: Bid Index simulation. Deterministic + randomized synthetic
 * histories run through the SAME production scoring functions as the live
 * site (src/lib/trust/score-core.ts via model-v1) — not a duplicate
 * implementation. Results are sanity fixtures, not marketing targets;
 * they make no claim of statistical validation (§60/§65).
 *
 *   npx tsx scripts/bid-index-sim.mjs [--compact]
 */
const { availableMean, bountyComplexity, counterpartyFactor, eventWeight, effectiveSampleSize, rating01, reviewerFactor } = await import("../src/lib/trust/model-v1.ts");
const { scoreRole, networkOverall } = await import("../src/lib/trust/score-core.ts");

/** Deterministic PRNG (mulberry32) so every run is reproducible. */
function makeRng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function outcome(over) {
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

function reviewOf(outcomes, stars = 5, reviewerOutcomes = 50) {
  return {
    revealed: true,
    reviewerPrimaryOutcomes: reviewerOutcomes,
    quality: stars,
    value: stars,
    communication: stars,
    clarity: stars,
    fairness: stars,
  };
}

/** DIVERSE PROFESSIONAL: n clean jobs across five+ unrelated counterparties. */
export function steadyProvider(n, opts = {}) {
  const daysBetween = opts.daysBetween ?? 60;
  const amount = opts.amountMinor ?? 2_500_000;
  const complexity = opts.complexity ?? 0.5;
  const rng = opts.rng ?? (() => 0.5);
  const out = [];
  const cps = Math.max(1, opts.counterparties ?? 5);
  for (let i = 0; i < n; i += 1) {
    const cp = `cp-${(i % Math.max(1, opts.counterparties ?? 5)) + 1}`;
    out.push(outcome({
      workKey: `BOUNTY:w-${i}`,
      counterpartyUserId: cp,
      occurredDaysAgo: (n - 1 - i) * daysBetween,
      amountMinor: amount,
      complexity,
      review: reviewOfStars(opts.stars ?? 5, 50),
      timelinessY: opts.timeliness ?? 1,
      pairIndex: 1,
    }));
    void rng;
  }
  return out;
}

function reviewOfStars(stars, reviewerOutcomes) {
  return reviewFactsShape(stars, reviewerOutcomes);
}

function reviewFactsShape(stars, reviewerOutcomes) {
  return {
    revealed: true,
    reviewerPrimaryOutcomes: reviewerOutcomes,
    quality: stars,
    value: stars,
    communication: stars,
    clarity: stars,
    fairness: stars,
  };
}

export const PERSONAS = {
  NEW_USER: () => [outcome({})],
  STEADY_PROVIDER: () => steadyProvider(20),
  WHALE: () => [outcome({ workKey: "BOUNTY:w-whale", amountMinor: 100_000_000_00, counterpartyUserId: "cp-1" }), outcome({ workKey: "BOUNTY:w2", counterpartyUserId: "cp-2", occurredDaysAgo: 25 })],
  HIGH_QUALITY_BUT_LATE: () => steadyProvider(12, { stars: 5, timeliness: 0.15 }),
  LOW_QUALITY_BUT_RELIABLE: () => steadyProvider(15, { stars: 3 }),
  SCAM_PROVIDER: () => [
    ...steadyProvider(8, { daysBetween: 20, amountMinor: 500_000 }),
    outcome({
      workKey: "BOUNTY:w-scam",
      counterpartyUserId: "cp-fresh",
      amountMinor: 50_000_000_00,
      severity: "ABANDONMENT_OR_NONPERFORMANCE",
      complexity: 0.9,
      timelinessY: 0,
      review: null,
    }),
  ],
  SCAM_SPONSOR: () => [
    ...steadyProvider(6, { daysBetween: 40 }),
    outcome({
      workKey: "PROJECT:w-chargeback",
      counterpartyUserId: "cp-x",
      amountMinor: 30_000_000_00,
      severity: "PAYMENT_DEFAULT_OR_ABUSIVE_CHARGEBACK",
      complexity: 0.5,
    }),
  ],
  VINDICATED_PROVIDER: () => [
    ...steadyProvider(8, { daysBetween: 30 }),
  ],
  DISPUTE_ABUSER: () => [
    ...steadyProvider(10, { daysBetween: 25 }),
    outcome({ workKey: "BOUNTY:w-abuse", severity: "PAYMENT_DEFAULT_OR_ABUSIVE_CHARGEBACK", counterpartyUserId: "cp-z", occurredDaysAgo: 2, complexity: 0.5 }),
    outcome({ workKey: "BOUNTY:w-abuse2", severity: "ABANDONMENT_OR_NONPERFORMANCE", counterpartyUserId: "cp-z", occurredDaysAgo: 1, complexity: 0.5 }),
  ],
  COLLUDING_PAIR: () => {
    const out = [];
    for (let i = 0; i < 100; i += 1) {
      out.push(outcome({
        workKey: `BOUNTY:collur-${i}`,
        counterpartyUserId: "same-accomplice",
        amountMinor: 50_000,
        occurredDaysAgo: 100 - Math.floor(i / 2),
        complexity: 0.1,
        review: reviewFactsShape(5, 120),
      }));
    }
    return out;
  },
  DIVERSE_PROFESSIONAL: () => steadyProvider(20),
  CAPTAIN: () => [outcome({ role: undefinedsForTyping(), counterpartyUserId: "cp-sponsor", amountMinor: 5_000_000, complexity: 0.9 })],
  INACTIVE_VETERAN: () => steadyProvider(12, { daysBetween: 200 }),
  REHABILITATED_DEFAULT: () => [
    ...steadyProvider(14, { daysBetween: 90 }),
    outcome({
      workKey: "BOUNTY:w-old-default",
      counterpartyUserId: "cp-old",
      occurredDaysAgo: 1200,
      amountMinor: 40_000_000_00,
      severity: "ABANDONMENT_OR_NONPERFORMANCE",
      complexity: 0.8,
      timelinessY: 0,
    }),
  ],
};

function undefinedsForTyping() {
  return "PROVIDER";
}

/** SCAM Sponsor shares the SPONSOR pillar shape. */
PERSONAS.SCAM_SPONSOR_ROLE = (occurredDaysAgo = 5) => steadyProvider(6, { daysBetween: 40 });

/** Run a persona through the production pipeline (role-scoped). */
export function simulate(role, outcomesFn, prepOver = {}) {
  return scoreRole({ role, outcomes: outcomesFn(), currentlyRestricted: false, severeEventReinstatedDaysAgo: null, ...prepOver });
}

function bandOf(r) {
  return r.status === "SCORED" ? String(r.band ?? "") : r.status === "RESTRICTED" ? "RESTRICTED" : "NR";
}

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log("BI-1.0 simulation (fixture sanity, not calibration):\n");
  const show = (name, r) => {
    console.log(
      `${name.padEnd(24)} ${r.status}  score=${String(r.score ?? "NR").padEnd(4)}  conf=${(Math.round(r.confidence * 100) / 100).toFixed(2)}  n_eff=${(Math.round(r.effectiveSampleSize * 10) / 10)}  U=${r.uniqueCounterparties}  cap=${r.capApplied ?? "-"}`,
    );
  };
  show("NEW USER (1 job)", simulate("PROVIDER", PERSONAS.NEW_USER));
  show("STEADY PROVIDER (20)", simulate("PROVIDER", PERSONAS.STEADY_PROVIDER));
  show("WHALE (1 big job)", simulate("PROVIDER", PERSONAS.WHALE));
  show("HIGH QUALITY, LATE", simulate("PROVIDER", PERSONAS.HIGH_QUALITY_BUT_LATE));
  show("LOW QUALITY, RELIABLE", simulate("PROVIDER", PERSONAS.LOW_QUALITY_BUT_RELIABLE));
  show("SCAM PROVIDER", simulate("PROVIDER", PERSONAS.SCAM_PROVIDER));
  show("SCAM SPONSOR", simulate("SPONSOR", PERSONAS.SCAM_SPONSOR));
  show("DISPUTE ABUSER", simulate("PROVIDER", PERSONAS.DISPUTE_ABUSER));
  show("COLLUDING PAIR", simulate("PROVIDER", PERSONAS.COLLUDING_PAIR));
  show("DIVERSE PROFESSIONAL", simulate("PROVIDER", PERSONAS.DIVERSE_PROFESSIONAL));
  show("INACTIVE VETERAN", simulate("PROVIDER", PERSONAS.INACTIVE_VETERAN));
  show("REHABILITATED DEFAULT", simulate("PROVIDER", PERSONAS.REHABILITATED_DEFAULT));
}
