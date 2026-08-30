/**
 * Bid Index role scoring pipeline — PURE (RC4 §5–§36). SQL never computes
 * the model: evidence.server.ts loads authoritative rows, this module turns
 * them into role scores deterministically. Chronological ordering happens
 * HERE, so database row order can never change a score (§62.20), and the
 * result is fully reproducible from trust_events alone.
 *
 * Depends only on the pure model in ./model-v1.
 */
import {
  MODEL_VERSION,
  availableMean,
  clamp,
  confidence,
  confidenceLabel,
  decisionTimelinessValue,
  effectiveSampleSize,
  eventWeight,
  hardCapForEvents,
  isEligible,
  isMajorDefault,
  overallBlend,
  overallScore,
  pillarValue,
  rating01,
  reviewerFactor,
  roleBase,
  roleScore,
  scoreBand,
  severityWeight,
  type Band,
  type Role,
  type SeverityCode,
} from "./model-v1";

/** A revealed-or-blind review attached to one primary outcome. Raw 1–5 stars. */
export interface ReviewFacts {
  revealed: boolean;
  /** The reviewer's own verified primary-outcome count at scoring time. */
  reviewerPrimaryOutcomes: number;
  quality: number | null;
  value: number | null;
  communication: number | null;
  clarity: number | null;
  fairness: number | null;
}

/**
 * One primary evidence unit for one (user, role, work item) — §7.
 *
 * RC5.1: every outcome carries the PERSISTED currency of its work item.
 * BI-1.0 is INR-native (valueFactor reads INR paise; verified volume is
 * INR-denominated). The gate lives in assignWeights()/evidenceStats():
 * non-INR outcomes keep their FACTUAL evidence (reliability, experience,
 * reviews, caps) but their economic amount is scored at the floor value
 * factor — a USD cent is never read as an INR paise, and no FX exists.
 */
export interface RoleOutcome {
  workKey: string;
  counterpartyUserId: string | null;
  /** Self-dealing or known related-party: weight 0, never external evidence (§17). */
  excludedFromEvidence: boolean;
  occurredDaysAgo: number;
  /** The role's actual economic exposure in minor units (§13). */
  amountMinor: number;
  /** The work item's persisted currency (INR or USD; law concept A). */
  currency: string;
  severity: SeverityCode;
  /** Complexity C ∈ [0,1] from structured work facts (§15). */
  complexity: number;
  /** Reveal-gated review of this member for this work (null = none). */
  review: ReviewFacts | null;
  timelinessY: number | null;
  /** Days past the 3-day grace an objective sponsor decision took (null = unobserved). */
  decisionDelayDays: number | null;
  /** Captain budget-stewardship observation (null = unobserved). */
  stewardshipY: number | null;
  /** Captain value-weighted child completion (null = unobserved). */
  childOutcomeY: number | null;
  /** Multiplier on the outcome's evidential weight (SHARED_FAULT = 0.5, §20). */
  weightShare: number;
}

export interface PreparedEvidence {
  role: Role;
  outcomes: RoleOutcome[];
  /** Account suspended/restricted for a severe-integrity event (§34.3). */
  currentlyRestricted: boolean;
  /** Days since formal reinstatement (severe events only; null otherwise). */
  severeEventReinstatedDaysAgo: number | null;
}

export type ScoreStatus = "NR" | "SCORED" | "RESTRICTED";

export interface RoleScoreResult {
  role: Role;
  modelVersion: string;
  status: ScoreStatus;
  score: number | null;
  band: Band;
  confidence: number;
  confidenceLabel: "PROVISIONAL" | "SUPPORTED" | "HIGH";
  bRaw: number;
  pillars: Record<string, number>;
  primaryOutcomes: number;
  uniqueCounterparties: number;
  effectiveSampleSize: number;
  spanDays: number;
  verifiedVolumeMinor: number;
  capApplied: number | null;
  /** Score before any hard cap, for the private report's explanation. */
  uncappedScore: number | null;
}

interface WeightedOutcome {
  outcome: RoleOutcome;
  /** §18 primary weight; 0 for excluded (self/related-party) evidence. */
  weight: number;
  /** §19 failure weight for adverse events; equals weight for clean outcomes. */
  failureWeight: number;
  /** §27 reviewer-weighted weight for review-sourced pillar observations. */
  reviewerWeight: number;
}

/** Deterministic order: occurredDaysAgo asc, then a stable work key. */
function byOccurrence(a: RoleOutcome, b: RoleOutcome): number {
  return a.occurredDaysAgo - b.occurredDaysAgo || a.workKey.localeCompare(b.workKey);
}

/**
 * §17/§18: assign chronological pair indices and primary weights. The pair
 * numbering comes from the sorted sequence itself, so a re-ordered input
 * produces the identical result.
 */
function assignWeights(outcomes: RoleOutcome[]): WeightedOutcome[] {
  const ordered = [...outcomes].sort(byOccurrence);
  const pairCount = new Map<string, number>();
  return ordered.map((o) => {
    if (o.excludedFromEvidence) {
      return { outcome: o, weight: 0, failureWeight: 0, reviewerWeight: 0 };
    }
    const pairKey = o.counterpartyUserId ?? `work:${o.workKey}`;
    const nth = (pairCount.get(pairKey) ?? 0) + 1;
    pairCount.set(pairKey, nth);
    const share = clamp(Number(o.weightShare ?? 1), 0, 1);
    // RC5.1 WS11: BI-1.0 is INR-native. Only INR-denominated economic
    // amounts enter valueFactor; anything else is scored at the floor
    // (valueFactor(0) = 0.75, the documented no-missing-amount behavior).
    // The outcome itself stays in evidence — the currency gate applies to
    // the economic amount, never to the fact that the work completed.
    const economicAmountMinor = o.currency === "INR" ? o.amountMinor : 0;
    const rawWeight = eventWeight({
      amountMinor: economicAmountMinor,
      complexity: clamp(o.complexity, 0, 1),
      ageDays: o.occurredDaysAgo,
      pairIndex: nth,
    });
    // §20: SHARED_FAULT applies 50% of the applicable weight to each side.
    const base = share * rawWeight;
    const failureWeight =
      o.severity === "NORMAL" ? base : share * severityWeight(rawWeight, o.severity);
    const reviewerWeight = base * reviewerFactor(o.review?.reviewerPrimaryOutcomes ?? 0);
    return { outcome: o, weight: base, failureWeight, reviewerWeight };
  });
}

/**
 * §23–§25 pillar observations from weighted outcomes. Review-sourced
 * observations require reciprocal reveal (§26); a missing review dimension
 * produces no observation (missing ≠ zero, §42).
 */
type Obs = Record<string, Array<{ weight: number; value: number }>>;

function makeObs(): { obs: Obs; add: (pillar: string, weight: number, value: number) => void } {
  const obs: Obs = {};
  const add = (pillar: string, weight: number, value: number): void => {
    if (!(weight > 0)) return;
    (obs[pillar] ??= []).push({ weight, value: clamp(value, 0, 1) });
  };
  return { obs, add };
}

/** §23: normalised review value for a pillar, or null when the reveal gate or absence blocks it. */
function revealedRating(o: RoleOutcome, pick: "qlv" | "comm" | "clarity" | "sponsorReview"): number | null {
  const r = o.review;
  if (!r?.revealed) return null;
  switch (pick) {
    case "qlv":
      return availableMean([rating01(r.quality), rating01(r.value)]);
    case "comm":
      return rating01(r.communication);
    case "clarity":
      return availableMean([rating01(r.clarity), rating01(r.fairness)]);
    default:
      return availableMean([rating01(r.quality), rating01(r.communication), rating01(r.clarity)]);
  }
}

function providerObs(add: (p: string, w: number, v: number) => void, x: WeightedOutcome): void {
  const clean = x.outcome.severity === "NORMAL";
  const { outcome: o, weight: w, failureWeight: wf, reviewerWeight: rw } = x;
  add("RELIABILITY", clean ? w : wf, clean ? 1 : 0);
  const qlv = revealedRating(o, "qlv");
  if (qlv != null) add("QUALITY", rw, qlv);
  if (o.timelinessY != null) add("TIMELINESS", w, clean ? o.timelinessY : 0);
  const comm = revealedRating(o, "comm");
  if (comm != null) add("COMMUNICATION", rw, comm);
  add("INTEGRITY", clean ? 0.25 * w : wf, clean ? 1 : 0);
}

function sponsorObs(add: (p: string, w: number, v: number) => void, x: WeightedOutcome): void {
  const clean = x.outcome.severity === "NORMAL";
  const { outcome: o, weight: w, failureWeight: wf, reviewerWeight: rw } = x;
  add("FUNDING", clean ? w : wf, clean ? 1 : 0);
  const clarity = revealedRating(o, "clarity");
  if (clarity != null) add("CLARITY", rw, clarity);
  if (o.decisionDelayDays != null) {
    add("DECISION_TIMELINESS", w, decisionTimelinessValue(o.decisionDelayDays));
  }
  const comm = revealedRating(o, "comm");
  if (comm != null) add("COMMUNICATION", rw, comm);
  add("INTEGRITY", clean ? 0.25 * w : wf, clean ? 1 : 0);
}

function captainObs(add: (p: string, w: number, v: number) => void, x: WeightedOutcome): void {
  const clean = x.outcome.severity === "NORMAL";
  const { outcome: o, weight: w, failureWeight: wf, reviewerWeight: rw } = x;
  add("PARENT_COMPLETION", clean ? w : wf, clean ? 1 : 0);
  if (o.stewardshipY != null) add("BUDGET_STEWARDSHIP", w, o.stewardshipY);
  if (o.childOutcomeY != null) add("CHILD_OUTCOMES", w, o.childOutcomeY);
  if (o.timelinessY != null) add("TIMELINESS", w, clean ? o.timelinessY : 0);
  const review = revealedRating(o, "sponsorReview");
  if (review != null) add("SPONSOR_REVIEW", x.reviewerWeight, review);
  add("INTEGRITY", clean ? 0.25 * w : wf, clean ? 1 : 0);
}

/**
 * §23–§25 pillar observations from weighted outcomes. Review-sourced
 * observations require reciprocal reveal (§26); a missing review dimension
 * produces no observation (missing is not zero, §42).
 */
function pillarObservations(
  role: Role,
  weighted: WeightedOutcome[],
): Record<string, Array<{ weight: number; value: number }>> {
  const { obs, add } = makeObs();
  const perOutcome = role === "PROVIDER" ? providerObs : role === "SPONSOR" ? sponsorObs : captainObs;
  for (const x of weighted) {
    if (role === "PROVIDER") perOutcomeRef(providerObs, add, x);
    else if (role === "SPONSOR") perOutcomeRef(sponsorObs, add, x);
    else perOutcomeRef(captainObs, add, x);
  }
  return obs;
}

function perOutcomeRef(
  fn: (add: (p: string, w: number, v: number) => void, x: WeightedOutcome) => void,
  add: (p: string, w: number, v: number) => void,
  x: WeightedOutcome,
): void {
  fn(add, x);
}

/** Primary-weight statistics + the major-default event ages (§29/§34). */
function evidenceStats(weighted: WeightedOutcome[]): {
  weights: number[];
  primaryOutcomes: number;
  uniqueCounterparties: number;
  spanDays: number;
  verifiedVolumeMinor: number;
  majorDefaultDaysAgo: number[];
} {
  const counted = weighted.filter((x) => x.weight > 0 || x.failureWeight > 0);
  const weights = counted.map((x) =>
    x.outcome.severity === "NORMAL" ? x.weight : x.failureWeight,
  );
  const counterparties = new Set<string>();
  for (const x of counted) {
    const cp = x.outcome.counterpartyUserId;
    if (cp) counterparties.add(cp);
  }
  const days = counted.map((x) => x.outcome.occurredDaysAgo);
  const majors = counted
    .filter((x) => x.outcome.severity !== "NORMAL" && isMajorDefault(x.outcome.severity))
    .map((x) => x.outcome.occurredDaysAgo);
  return {
    weights,
    primaryOutcomes: counted.length,
    uniqueCounterparties: counterparties.size,
    spanDays: days.length >= 2 ? Math.max(...days) - Math.min(...days) : 0,
    // RC5.1 WS12: verified volume is strictly INR-denominated (option A).
    // INR and USD minor units are never added together; no FX-normalized
    // total exists without a formal model. The snapshot column
    // verified_volume_currency therefore stays 'INR' by contract.
    verifiedVolumeMinor: counted.reduce(
      (a, x) => a + (x.outcome.currency === "INR" ? Math.max(0, x.outcome.amountMinor) : 0),
      0,
    ),
    majorDefaultDaysAgo: majors,
  };
}

function confidenceOf(weights: number[], uniqueCounterparties: number, spanDays: number): number {
  return confidence({
    effectiveSampleSize: effectiveSampleSize(weights),
    uniqueCounterparties,
    spanDays,
  });
}

/** NR / RESTRICTED result: factual record intact, no published number. */
function unpublished(input: {
  role: Role;
  pillars: Record<string, number>;
  bRaw: number;
  conf: number;
  eff: number;
  facts: ReturnType<typeof evidenceStats>;
  status: "NR" | "RESTRICTED";
}): RoleScoreResult {
  return {
    role: input.role,
    modelVersion: MODEL_VERSION,
    status: input.status,
    score: null,
    band: "NR",
    confidence: input.conf,
    confidenceLabel: confidenceLabel(input.conf),
    bRaw: input.bRaw,
    pillars: input.pillars,
    primaryOutcomes: input.facts.primaryOutcomes,
    uniqueCounterparties: input.facts.uniqueCounterparties,
    effectiveSampleSize: input.eff,
    spanDays: input.facts.spanDays,
    verifiedVolumeMinor: input.facts.verifiedVolumeMinor,
    capApplied: null,
    uncappedScore: null,
  };
}

/**
 * Score one role through BI-1.0: weights → pillars → B_raw → confidence →
 * shrinkage → 300–900 → hard caps. Restricted accounts publish no number
 * while restricted (§34.3); ineligible roles are NR with facts intact (§6).
 */
export function scoreRole(prep: PreparedEvidence): RoleScoreResult {
  const weighted = assignWeights(prep.outcomes);
  const pillarObs = pillarObservations(prep.role, weighted);
  const pillars: Record<string, number> = {};
  for (const pillar of Object.keys(pillarObs)) {
    pillars[pillar] = pillarValue(prep.role, pillar, pillarObs[pillar]);
  }
  const facts = evidenceStats(weighted);
  const bRaw = roleBase(pillars, prep.role);
  const conf = confidenceOf(facts.weights, facts.uniqueCounterparties, facts.spanDays);
  if (prep.currentlyRestricted) {
    return unpublished({
      role: prep.role,
      pillars,
      bRaw,
      conf,
      eff: effectiveSampleSize(facts.weights),
      facts,
      status: "RESTRICTED",
    });
  }
  if (!isEligible(facts.primaryOutcomes, facts.uniqueCounterparties)) {
    return unpublished({
      role: prep.role,
      pillars,
      bRaw,
      conf,
      eff: effectiveSampleSize(facts.weights),
      facts,
      status: "NR",
    });
  }
  const cap = hardCapForEvents({
    majorDefaultsDaysAgo: facts.majorDefaultDaysAgo,
    currentlyRestricted: prep.currentlyRestricted,
    severeEventReinstatedDaysAgo: prep.severeEventReinstatedDaysAgo,
  });
  const uncappedScore = roleScore(bRaw, conf);
  const score = cap != null ? Math.min(uncappedScore, cap) : uncappedScore;
  return {
    role: prep.role,
    modelVersion: MODEL_VERSION,
    status: "SCORED",
    score,
    band: scoreBand(score),
    confidence: conf,
    confidenceLabel: confidenceLabel(conf),
    bRaw,
    pillars,
    primaryOutcomes: facts.primaryOutcomes,
    uniqueCounterparties: facts.uniqueCounterparties,
    effectiveSampleSize: effectiveSampleSize(facts.weights),
    spanDays: facts.spanDays,
    verifiedVolumeMinor: facts.verifiedVolumeMinor,
    capApplied: cap,
    uncappedScore,
  };
}

export interface OverallResult {
  modelVersion: string;
  status: ScoreStatus;
  score: number | null;
  band: Band;
  shares: number[] | null;
  capApplied: number | null;
}

/**
 * §36 overall Bid Index over scored role results. One scored role maps
 * straight through; several roles blend geometrically under exposure shares
 * capped at 80%. The strictest active hard cap across scored roles binds
 * the overall number too — provider strength cannot hide a sponsor cap
 * (§62.15). null when no role is score-eligible (callers show NR).
 */
export function networkOverall(roles: RoleScoreResult[]): OverallResult | null {
  const scored = roles.filter((r) => r.status === "SCORED" && r.score != null);
  if (scored.length === 0) return null;
  if (scored.length === 1) {
    const solo = scored[0];
    return {
      modelVersion: MODEL_VERSION,
      status: "SCORED",
      score: solo.score,
      band: solo.band,
      shares: [1],
      capApplied: solo.capApplied,
    };
  }
  const blend = overallBlend(
    scored.map((r) => ({
      bRaw: r.bRaw,
      confidence: r.confidence,
      effectiveSampleSize: r.effectiveSampleSize,
      verifiedVolumeMinor: r.verifiedVolumeMinor,
    })),
  );
  if (!blend) return null;
  const raw = overallScore(blend.bNetwork);
  const cap = strictestCap(scored);
  const score = cap != null ? Math.min(raw, cap) : raw;
  return {
    modelVersion: MODEL_VERSION,
    status: "SCORED",
    score,
    band: scoreBand(score),
    shares: blend.shares,
    capApplied: cap,
  };
}

/** The strictest active cap across scored roles binds the overall. */
function strictestCap(roles: RoleScoreResult[]): number | null {
  let cap: number | null = null;
  for (const r of roles) {
    if (r.capApplied != null) {
      cap = cap == null ? r.capApplied : Math.min(cap, r.capApplied);
    }
  }
  return cap;
}