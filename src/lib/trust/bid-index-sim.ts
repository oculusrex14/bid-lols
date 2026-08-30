#!/usr/bin/env node
/**
 * RC4 §61: Bid Index simulation. Deterministic + randomized synthetic
 * histories run through the SAME production scoring functions as the live
 * site — the pure pipeline in this directory. Results are fixture sanity
 * checks, not marketing targets, and they make no claim of statistical
 * validation (§60/§65).
 *
 *   npx tsx src/lib/trust/bid-index-sim.ts
 */

import { scoreRole, type RoleScoreResult } from "./score-core";
import type { Role, SeverityCode } from "./model-v1";
import type { RoleOutcome } from "./score-core";

interface RoleOutcomePlus extends RoleOutcome {
  role?: Role;
}

export function outcome(over: Partial<RoleOutcome> = {}): RoleOutcome {
  return {
    workKey: "w",
    counterpartyUserId: "cp",
    excludedFromEvidence: false,
    occurredDaysAgo: 30,
    amountMinor: 2_500_000,
    currency: "INR",
    severity: "NORMAL" as SeverityCode as SeverityCode,
    complexity: 0.5,
    review: null,
    timelinessY: 1,
    decisionDelayDays: null,
    stewardshipY: null,
    childOutcomeY: null,
    weightShare: 1,
    ...over,
  } satisfies RoleOutcome;
}

function review(stars = 5, reviewerOutcomes = 50) {
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
export function steadyProvider(n: number, opts: {
  daysBetween?: number;
  amountMinor?: number;
  complexity?: number;
  stars?: number;
  timeliness?: number;
  counterparties?: number;
  reviewerOutcomes?: number;
} = {}): RoleOutcome[] {
  const daysBetween = opts.daysBetween ?? 60;
  const amount = opts.amountMinor ?? 2_500_000;
  const complexity = opts.complexity ?? 0.5;
  const cps = Math.max(1, opts.counterparties ?? 5);
  const out: RoleOutcome[] = [];
  for (let i = 0; i < n; i += 1) {
    out.push(outcome({
      workKey: `BOUNTY:w-${i}`,
      counterpartyUserId: `cp-${(i % cps) + 1}`,
      occurredDaysAgo: (n - 1 - i) * daysBetween,
      amountMinor: amount,
      complexity,
      review: review(opts.stars ?? 5, opts.reviewerOutcomes ?? 50),
      timelinessY: opts.timeliness ?? 1,
    }));
  }
  return out;
}

function colludingPair(): RoleOutcome[] {
  const out: RoleOutcome[] = [];
  for (let i = 0; i < 100; i += 1) {
    out.push(outcome({
      workKey: `BOUNTY:collude-${i}`,
      counterpartyUserId: "same-accomplice",
      amountMinor: 50_000,
      occurredDaysAgo: 100 - Math.floor(i / 2),
      complexity: 0.1,
      review: review(5, 120),
    }));
  }
  return out;
}

function whale(): RoleOutcome[] {
  return [
    outcome({ workKey: "BOUNTY:w-whale", amountMinor: 100_000_000_00, counterpartyUserId: "cp-1" }),
    outcome({ workKey: "BOUNTY:w2", counterpartyUserId: "cp-2", occurredDaysAgo: 25 }),
  ];
}

function scamProvider(): RoleOutcome[] {
  const clean = steadyProvider(8, { daysBetween: 20, amountMinor: 500_000, complexity: 0.2, reviewerOutcomes: 3 });
  return [
    ...clean,
    outcome({
      workKey: "BOUNTY:w-scam",
      counterpartyUserId: "cp-fresh",
      amountMinor: 50_000_000_00,
      severity: "ABANDONMENT_OR_NONPERFORMANCE" as SeverityCode,
      complexity: 0.9,
      timelinessY: 0,
      review: null,
    }),
  ];
}

function scamSponsor(): RoleOutcome[] {
  const clean = steadyProvider(6, { daysBetween: 40, reviewerOutcomes: 3 });
  return [
    ...clean,
    outcome({
      workKey: "PROJECT:w-chargeback",
      counterpartyUserId: "cp-x",
      amountMinor: 30_000_000_00,
      severity: "PAYMENT_DEFAULT_OR_ABUSIVE_CHARGEBACK" as SeverityCode,
      complexity: 0.5,
      review: null,
    }),
  ];
}

function disputeAbuser(): RoleOutcome[] {
  const clean = steadyProvider(10, { daysBetween: 25, reviewerOutcomes: 5 });
  return [
    ...clean,
    outcome({ workKey: "BOUNTY:w-abuse", severity: "PAYMENT_DEFAULT_OR_ABUSIVE_CHARGEBACK" as SeverityCode, counterpartyUserId: "cp-z", occurredDaysAgo: 2, complexity: 0.5, review: null }),
    outcome({ workKey: "BOUNTY:w-abuse2", severity: "ABANDONMENT_OR_NONPERFORMANCE" as SeverityCode, counterpartyUserId: "cp-z2", occurredDaysAgo: 1, complexity: 0.5, review: null }),
  ];
}

function rehabilitatedDefault(): RoleOutcome[] {
  const clean = steadyProvider(14, { daysBetween: 90, reviewerOutcomes: 40 });
  return [
    ...clean,
    outcome({
      workKey: "BOUNTY:w-old-default",
      counterpartyUserId: "cp-old",
      occurredDaysAgo: 1200,
      amountMinor: 40_000_000_00,
      severity: "ABANDONMENT_OR_NONPERFORMANCE" as SeverityCode,
      complexity: 0.8,
      timelinessY: 0,
      review: null,
    }),
  ];
}

export type PersonaRun = { role: Role; outcomes: RoleOutcome[]; label: string };

export const PERSONAS: Array<{ label: string; role: Role; outcomes: () => RoleOutcome[] }> = [
  { label: "NEW USER (1 job)", role: "PROVIDER", outcomes: () => [outcome({})] },
  { label: "STEADY PROVIDER (20)", role: "PROVIDER", outcomes: () => steadyProvider(20, { counterparties: 20 }) },
  { label: "WHALE (1 big + 1 small)", role: "PROVIDER", outcomes: whale },
  { label: "HIGH QUALITY BUT LATE", role: "PROVIDER", outcomes: () => steadyProvider(12, { stars: 5, timeliness: 0.15, reviewerOutcomes: 40 }) },
  { label: "LOW QUALITY BUT RELIABLE", role: "PROVIDER", outcomes: () => steadyProvider(15, { stars: 3, reviewerOutcomes: 40 }) },
  { label: "SCAM PROVIDER", role: "PROVIDER", outcomes: scamProvider },
  { label: "SCAM SPONSOR", role: "SPONSOR", outcomes: scamSponsor },
  { label: "DISPUTE ABUSER", role: "PROVIDER", outcomes: disputeAbuser },
  { label: "COLLUDING PAIR (100 tiny)", role: "PROVIDER", outcomes: colludingPair },
  { label: "DIVERSE PROFESSIONAL (20)", role: "PROVIDER", outcomes: () => steadyProvider(20) },
  { label: "INACTIVE VETERAN", role: "PROVIDER", outcomes: () => steadyProvider(12, { daysBetween: 200, reviewerOutcomes: 40 }) },
  { label: "REHABILITATED DEFAULT", role: "PROVIDER", outcomes: rehabilitatedDefault },
];

export function simulate(role: Role, outcomes: RoleOutcome[]): RoleScoreResult {
  return scoreRole({ role, outcomes, currentlyRestricted: false, severeEventReinstatedDaysAgo: null });
}

export function bandOf(r: RoleScoreResult): string {
  if (r.status === "SCORED") return String(r.score ?? "None");
  if (r.status === "RESTRICTED") return "RESTRICTED";
  return "NR";
}

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log("BI-1.0 simulation (fixture sanity, not calibration):\n");
  for (const persona of PERSONAS) {
    const r = simulate(persona.role, persona.outcomes());
    console.log(
      `${persona.label.padEnd(28)} ${r.status.padEnd(6)}  score=${String(r.score ?? "NR").padEnd(4)}  conf=${(Math.round(r.confidence * 100) / 100).toString().padEnd(4)}  n_eff=${(Math.round(r.effectiveSampleSize * 10) / 10).toString()}  U=${r.uniqueCounterparties}  cap=${String(r.capApplied ?? "-")}`,
    );
  }
}
