/**
 * BI-1.0 — the Bid Index trust model, version 1.0. PURE FUNCTIONS ONLY:
 * no SQL, no I/O, no clocks (time enters as explicit numeric day inputs).
 *
 * The specification for every number below is RC4 §12–§36; the published
 * methodology text lives in docs/BID_INDEX_METHODOLOGY.md. Implementing
 * this file is faithful transcription, NOT optimization territory:
 *   - do not retune weights to make simulations look better;
 *   - any material change (weights, priors, caps, factors, eligibility,
 *     bands) requires a new model version (BI-1.1 …), never silent edits.
 *
 * All money enters as integer MINOR units (paise) and is converted to INR
 * major units only inside valueFactor — accounting never floats.
 */

export const MODEL_VERSION = "BI-1.0";
/** Complexity formula version stamped onto trust events. */
export const COMPLEXITY_VERSION = "C-1.0";
/** Behavioural network prior (§30). */
export const NETWORK_PRIOR = 0.6;
/** Confidence thresholds (§31). */
export const CONFIDENCE_PROVISIONAL = 0.45;
export const CONFIDENCE_SUPPORTED = 0.75;

export type Role = "PROVIDER" | "SPONSOR" | "CAPTAIN";

export type SeverityCode =
  | "NORMAL"
  | "ATTRIBUTABLE_CANCELLATION"
  | "ABANDONMENT_OR_NONPERFORMANCE"
  | "PAYMENT_DEFAULT_OR_ABUSIVE_CHARGEBACK"
  | "FRAUD_OR_COLLUSION_CONFIRMED";

/** §19: multipliers applied to an outcome's weight for attributable failures. */
export const SEVERITY_MULTIPLIER: Record<SeverityCode, number> = {
  NORMAL: 1.0,
  ATTRIBUTABLE_CANCELLATION: 1.5,
  ABANDONMENT_OR_NONPERFORMANCE: 2.25,
  PAYMENT_DEFAULT_OR_ABUSIVE_CHARGEBACK: 2.75,
  FRAUD_OR_COLLUSION_CONFIRMED: 4.0,
};

/** §33 public bands (low/high inclusive). */
export type Band = { label: string; low: number; high: number } | "NR";

const BANDS: Array<{ label: string; low: number; high: number }> = [
  { label: "Critical observed risk", low: 300, high: 499 },
  { label: "High observed risk", low: 500, high: 599 },
  { label: "Caution", low: 600, high: 679 },
  { label: "Building", low: 680, high: 739 },
  { label: "Established", low: 740, high: 799 },
  { label: "Strong", low: 800, high: 849 },
  { label: "Exceptional", low: 850, high: 900 },
];

/** Clamp to [lo, hi]; NaN-safe (NaN collapses to lo). */
export function clamp(x: number, lo: number, hi: number): number {
  const n = Number(x);
  if (!Number.isFinite(n)) return lo;
  return Math.min(hi, Math.max(lo, n));
}

/** §15 saturating factor: sat(x,k) = 1 - exp(-x/k). */
export function sat(x: number, k: number): number {
  const xa = Number(x);
  const ka = Number(k);
  if (!Number.isFinite(xa) || !Number.isFinite(ka) || ka <= 0) return 0;
  return 1 - Math.exp(-Math.max(0, xa) / ka);
}

/**
 * §13 economic value factor. `amountMinor` is the role's actual economic
 * exposure in integer minor units (INR paise). V is concave (logarithmic)
 * and capped: money increases evidential weight, never linearly.
 */
export function valueFactor(amountMinor: number): number {
  const rupees = Number(amountMinor) / 100;
  if (!Number.isFinite(rupees) || rupees <= 0) return 0.75;
  const v = 1 + 0.22 * Math.log(Math.max(0.25, rupees / 25_000));
  return clamp(v, 0.75, 1.75);
}

/** §15.1 bounty complexity: 0.55*S (distinct skills, k=4) + 0.45*D (active planned days, k=45). */
export function bountyComplexity(distinctSkills: number, activePlannedDays: number): number {
  const s = sat(distinctSkills, 4);
  const d = sat(activePlannedDays, 45);
  return clamp(0.55 * s + 0.45 * d, 0, 1);
}

/** §15.2 project complexity: 0.25*S + 0.45*M + 0.30*D. */
export function projectComplexity(
  distinctSkills: number,
  milestoneCount: number,
  plannedDays: number,
): number {
  const s = sat(distinctSkills, 4);
  const m = sat(milestoneCount, 4);
  const d = sat(plannedDays, 60);
  return clamp(0.25 * s + 0.45 * m + 0.3 * d, 0, 1);
}

/** §15.3 captain complexity: 0.15*S + 0.25*U + 0.20*E + 0.20*P + 0.20*D. */
export function captainComplexity(input: {
  distinctSkills: number;
  childUnits: number;
  dependencyEdges: number;
  distinctWorkers: number;
  plannedDays: number;
}): number {
  const s = sat(input.distinctSkills, 6);
  const u = sat(input.childUnits, 5);
  const e = sat(input.dependencyEdges, 4);
  const p = sat(input.distinctWorkers, 5);
  const d = sat(input.plannedDays, 90);
  return clamp(0.15 * s + 0.25 * u + 0.2 * e + 0.2 * p + 0.2 * d, 0, 1);
}

/** §15.4 W_complexity = 0.90 + 0.35*C ∈ [0.90, 1.25]. */
export function complexityWeight(c: number): number {
  return 0.9 + 0.35 * clamp(c, 0, 1);
}

/** §16 recency: R(ageDays) = 1 + 0.15 * 2^(-ageDays/365). Inactivity never decays old history. */
export function recencyFactor(ageDays: number): number {
  const a = Number(ageDays);
  if (!Number.isFinite(a) || a < 0) return 1.0;
  return 1 + 0.15 * Math.pow(2, -a / 365);
}

/**
 * §17 repeated-counterparty damping. `nthPairOutcome` is the 1-based
 * chronological position of this primary outcome between the same user
 * pair. 1–3 → 1.00, 4–10 → 0.60, 11+ → 0.30.
 */
export function counterpartyFactor(nthPairOutcome: number): number {
  const n = Math.floor(Number(nthPairOutcome));
  if (!Number.isFinite(n) || n <= 3) return 1.0;
  if (n <= 10) return 0.6;
  return 0.3;
}

/** §27 reviewer weight: 0.60 + 0.40*min(1, sqrt(n/10)); n = reviewer's verified primary outcomes. */
export function reviewerFactor(reviewerPrimaryOutcomes: number): number {
  const n = Number(reviewerPrimaryOutcomes);
  if (!Number.isFinite(n) || n <= 0) return 0.6;
  return 0.6 + 0.4 * Math.min(1, Math.sqrt(n / 10));
}

/** §18 primary event weight: clamp(0.40, 2.50, V * Wc * R * P). `amountMinor` is raw paise. */
export function eventWeight(input: {
  amountMinor: number;
  complexity: number;
  ageDays: number;
  pairIndex: number;
}): number {
  const w =
    valueFactor(input.amountMinor) *
    complexityWeight(input.complexity) *
    recencyFactor(input.ageDays) *
    counterpartyFactor(input.pairIndex);
  return clamp(w, 0.4, 2.5);
}

/** §18/§19 failure weight: clamp(0.40, 5.00, W * severity). */
export function severityWeight(weight: number, severity: SeverityCode): number {
  const w = Number(weight);
  if (!Number.isFinite(w)) return 0.4;
  return clamp(w * SEVERITY_MULTIPLIER[severity], 0.4, 5.0);
}

/** §7 helper: normalised star rating r ∈ [1,5] → [0,1]; null when absent. */
export function rating01(r: number | null | undefined): number | null {
  if (r == null) return null;
  const v = Number(r);
  if (!Number.isFinite(v) || v < 1 || v > 5) return null;
  return (v - 1) / 4;
}

/** Mean of the available normalised values; null when nothing is available (missing ≠ zero). */
export function availableMean(values: ReadonlyArray<number | null | undefined>): number | null {
  let sum = 0;
  let n = 0;
  for (const v of values) {
    const x = Number(v);
    if (v == null || !Number.isFinite(x)) continue;
    sum += x;
    n += 1;
  }
  return n === 0 ? null : sum / n;
}

/** Pillar weight table per role (§23–§25). */
export const PILLAR_WEIGHTS: Record<Role, Record<string, number>> = {
  PROVIDER: {
    RELIABILITY: 0.35,
    QUALITY: 0.2,
    TIMELINESS: 0.15,
    COMMUNICATION: 0.1,
    INTEGRITY: 0.2,
  },
  SPONSOR: {
    FUNDING: 0.35,
    CLARITY: 0.2,
    DECISION_TIMELINESS: 0.15,
    COMMUNICATION: 0.1,
    INTEGRITY: 0.2,
  },
  CAPTAIN: {
    PARENT_COMPLETION: 0.3,
    BUDGET_STEWARDSHIP: 0.2,
    CHILD_OUTCOMES: 0.15,
    TIMELINESS: 0.15,
    SPONSOR_REVIEW: 0.05,
    INTEGRITY: 0.15,
  },
};

/** Bayesian priors (μ, κ) per role pillar (§23–§25). */
export const PILLAR_PRIORS: Record<Role, Record<string, { mu: number; kappa: number }>> = {
  PROVIDER: {
    RELIABILITY: { mu: 0.7, kappa: 4 },
    QUALITY: { mu: 0.7, kappa: 5 },
    TIMELINESS: { mu: 0.7, kappa: 4 },
    COMMUNICATION: { mu: 0.7, kappa: 5 },
    INTEGRITY: { mu: 0.85, kappa: 5 },
  },
  SPONSOR: {
    FUNDING: { mu: 0.7, kappa: 4 },
    CLARITY: { mu: 0.7, kappa: 5 },
    DECISION_TIMELINESS: { mu: 0.7, kappa: 4 },
    COMMUNICATION: { mu: 0.7, kappa: 5 },
    INTEGRITY: { mu: 0.85, kappa: 5 },
  },
  CAPTAIN: {
    PARENT_COMPLETION: { mu: 0.7, kappa: 4 },
    BUDGET_STEWARDSHIP: { mu: 0.75, kappa: 4 },
    CHILD_OUTCOMES: { mu: 0.7, kappa: 4 },
    TIMELINESS: { mu: 0.7, kappa: 4 },
    SPONSOR_REVIEW: { mu: 0.7, kappa: 5 },
    INTEGRITY: { mu: 0.85, kappa: 5 },
  },
};

/**
 * §22 fractional Bayesian pillar update: posterior = (μκ + Σ(w·y)) / (κ+Σw)
 * for observations {weight ≥ 0, y ∈ [0,1]}. Deterministic; invalid
 * observations are skipped, never NaN-ed.
 */
export function posterior(
  mu: number,
  kappa: number,
  observations: ReadonlyArray<{ weight: number; value: number }>,
): number {
  const m = clamp(mu, 0, 1);
  const k = Number(kappa) > 0 ? Number(kappa) : 1;
  let sumW = 0;
  let sumWY = 0;
  for (const o of observations) {
    const w = Number(o.weight);
    const y = Number(o.value);
    if (!Number.isFinite(w) || !Number.isFinite(y)) continue;
    const wc = Math.max(0, w);
    sumW += wc;
    sumWY += wc * clamp(y, 0, 1);
  }
  return clamp((m * k + sumWY) / (k + sumW), 0, 1);
}

/** Convenience: one role pillar from observations via the role's prior table. */
export function pillarValue(
  role: Role,
  pillar: string,
  observations: ReadonlyArray<{ weight: number; value: number }>,
): number {
  const prior = PILLAR_PRIORS[role][pillar];
  if (!prior) return NETWORK_PRIOR;
  return posterior(prior.mu, prior.kappa, observations);
}

/** §28 behavioural base: 0.70*geometric + 0.30*arithmetic over the role's pillars. */
export function roleBase(pillars: Readonly<Record<string, number>>, role: Role): number {
  const weights = PILLAR_WEIGHTS[role];
  let arithmetic = 0;
  let logSum = 0;
  for (const [pillar, w] of Object.entries(weights)) {
    const p = clamp(pillars[pillar] ?? NETWORK_PRIOR, 0, 1);
    arithmetic += w * p;
    logSum += w * Math.log(Math.max(0.05, p));
  }
  return clamp(0.7 * Math.exp(logSum) + 0.3 * arithmetic, 0, 1);
}

/** §29 Kish effective sample size; empty/invalid input → 0. */
export function effectiveSampleSize(weights: ReadonlyArray<number>): number {
  let sum = 0;
  let sumSq = 0;
  for (const w of weights) {
    const x = Number(w);
    if (!Number.isFinite(x) || x <= 0) continue;
    sum += x;
    sumSq += x * x;
  }
  if (sum <= 0 || sumSq <= 0) return 0;
  return (sum * sum) / sumSq;
}

/** §29.1 counterparty diversity D = 0.70 + 0.30*min(U/5, 1). */
export function counterpartyDiversity(uniqueCounterparties: number): number {
  const u = Number(uniqueCounterparties);
  if (!Number.isFinite(u) || u <= 0) return 0.7;
  return 0.7 + 0.3 * Math.min(u / 5, 1);
}

/** §29.2 history-span factor H = 0.85 + 0.15*min(days/365, 1). */
export function historySpanFactor(spanDays: number): number {
  const d = Number(spanDays);
  if (!Number.isFinite(d) || d <= 0) return 0.85;
  return 0.85 + 0.15 * Math.min(d / 365, 1);
}

/** §29.3 confidence C = (1 - e^(-n_eff/8)) * D * H, clamped [0,1]. */
export function confidence(input: {
  effectiveSampleSize: number;
  uniqueCounterparties: number;
  spanDays: number;
}): number {
  const e = Number(input.effectiveSampleSize);
  const nEff = Number.isFinite(e) && e > 0 ? e : 0;
  const c =
    (1 - Math.exp(-nEff / 8)) *
    counterpartyDiversity(input.uniqueCounterparties) *
    historySpanFactor(input.spanDays);
  return clamp(c, 0, 1);
}

/** §31 confidence label. */
export function confidenceLabel(c: number): "PROVISIONAL" | "SUPPORTED" | "HIGH" {
  const v = clamp(Number(c), 0, 1);
  if (v < CONFIDENCE_PROVISIONAL) return "PROVISIONAL";
  if (v < CONFIDENCE_SUPPORTED) return "SUPPORTED";
  return "HIGH";
}

/** §30 shrinkage + mapping: round(300 + 600*(C*B_raw + (1-C)*0.60)), clamped 300–900. */
export function roleScore(bRaw: number, c: number): number {
  const b = clamp(bRaw, 0, 1);
  const conf = clamp(c, 0, 1);
  const blended = conf * b + (1 - conf) * NETWORK_PRIOR;
  return Math.max(300, Math.min(900, Math.round(300 + 600 * blended)));
}

/** Band for a numeric score. */
export function scoreBand(score: number): Band {
  const s = Math.round(Number(score));
  if (!Number.isFinite(s)) return "NR";
  for (const band of BANDS) {
    if (s >= band.low && s <= band.high) return band;
  }
  return s < 300 ? BANDS[0] : BANDS[BANDS.length - 1];
}

/** Type guard for display code. */
export function isScored(band: Band): band is { label: string; low: number; high: number } {
  return band !== "NR";
}

/** §23.3/§25.4 timeliness observation: exp(-2.5 * lateDays/plannedDays), planned floor 7 days. */
export function timelinessValue(lateDays: number, plannedDays: number): number {
  const late = Number(lateDays);
  const planned = Number(plannedDays);
  const l = Number.isFinite(late) ? Math.max(0, late) : 0;
  const p = Number.isFinite(planned) ? Math.max(7, planned) : 7;
  return clamp(Math.exp(-2.5 * (l / p)), 0, 1);
}

/** §24.3 sponsor decision timeliness: exp(-delayDays/7) after the 3-day grace. */
export function decisionTimelinessValue(delayDaysAfterGrace: number): number {
  const d = Number(delayDaysAfterGrace);
  const dd = Number.isFinite(d) ? Math.max(0, d) : 0;
  return clamp(Math.exp(-dd / 7), 0, 1);
}

/** §25.2 budget stewardship y = 1 - failedAttributed/committed, clamped [0,1]. */
export function stewardshipValue(failedAttributedMinor: number, committedMinor: number): number {
  const failed = Number(failedAttributedMinor);
  const committed = Number(committedMinor);
  const f = Number.isFinite(failed) ? Math.max(0, failed) : 0;
  const total = Number.isFinite(committed) && committed > 0 ? committed : 1;
  return clamp(1 - f / total, 0, 1);
}

/** §25.3 child-outcome reliability y: value-weighted completion proportion. */
export function childOutcomeValue(completedMinor: number, totalMinor: number): number {
  const done = Number(completedMinor);
  const total = Number(totalMinor);
  const d = Number.isFinite(done) ? Math.max(0, done) : 0;
  const t = Number.isFinite(total) && total > 0 ? total : 1;
  return clamp(d / t, 0, 1);
}

/** §36 role exposure E = sqrt(n_eff) * clamp(1.0, 1.6, 1 + 0.10*ln(1 + vol/25000)). */
export function roleExposure(effectiveSampleSizeN: number, verifiedVolumeMinor: number): number {
  const nEff = Math.max(0, Number(effectiveSampleSizeN) || 0);
  const rupees = Math.max(0, Number(verifiedVolumeMinor) || 0) / 100;
  const boost = 1 + 0.1 * Math.log(1 + rupees / 25_000);
  return Math.sqrt(nEff) * clamp(boost, 1.0, 1.6);
}

/**
 * §36 overall blend over scored roles. Shares are exposure proportions,
 * hard-capped at 80% per role with proportional redistribution; the blend is
 * geometric over the confidence-adjusted B values. null when nothing scored.
 */
export function overallBlend(
  roles: ReadonlyArray<{
    bRaw: number;
    confidence: number;
    effectiveSampleSize: number;
    verifiedVolumeMinor: number;
  }>,
): { bNetwork: number; shares: number[] } | null {
  const scored = roles.filter(
    (r) => Number.isFinite(r.confidence) && Number.isFinite(r.bRaw) && r.confidence > 0,
  );
  if (scored.length === 0) return null;
  const exposures = scored.map((r) => roleExposure(r.effectiveSampleSize, r.verifiedVolumeMinor));
  const totalE = exposures.reduce((a, b) => a + b, 0);
  if (!(totalE > 0)) return null;

  let shares = exposures.map((e) => e / totalE);
  // 80% cap: redistribute excess proportionally over the other scored roles.
  const MAX_SHARE = 0.8;
  for (let round = 0; round < scored.length; round += 1) {
    const total = shares.reduce((a, b) => a + b, 0);
    if (!(total > 0)) return null;
    shares = shares.map((s) => s / total);
    const overIdx: number[] = [];
    let excess = 0;
    shares.forEach((s, i) => {
      if (s > MAX_SHARE) {
        overIdx.push(i);
        excess += s - MAX_SHARE;
      }
    });
    if (overIdx.length === 0) break;
    const freeIdx: number[] = [];
    let freeMass = 0;
    shares.forEach((s, i) => {
      if (s <= MAX_SHARE && !overIdx.includes(i)) {
        freeIdx.push(i);
        freeMass += s;
      }
    });
    if (freeIdx.length === 0 || !(freeMass > 0)) break;
    shares = shares.map((s, i) => {
      if (overIdx.includes(i)) return MAX_SHARE;
      if (freeIdx.includes(i)) return s + excess * (s / freeMass);
      return s;
    });
  }
  const finalTotal = shares.reduce((a, b) => a + b, 0);
  if (!(finalTotal > 0)) return null;
  let logSum = 0;
  const adjusted = scored.map((r) => {
    const b = clamp(r.confidence * r.bRaw + (1 - r.confidence) * NETWORK_PRIOR, 0, 1);
    return b;
  });
  shares.forEach((share, i) => {
    logSum += (share / finalTotal) * Math.log(Math.max(0.05, adjusted[i]));
  });
  return { bNetwork: clamp(Math.exp(logSum), 0, 1), shares };
}

/** §36 overall score from the network blend, clamped 300–900. */
export function overallScore(bNetwork: number): number {
  const b = clamp(Number(bNetwork), 0, 1);
  return Math.max(300, Math.min(900, Math.round(300 + 600 * b)));
}

/** Input for the §34 hard-cap rules (days measured back from scoring time). */
export type CapInput = {
  /** Day counts (≥0, most recent first recommended) of FINAL major-default adjudications. */
  majorDefaultsDaysAgo: number[];
  /** True while the account is suspended/restricted for a severe-integrity event. */
  currentlyRestricted: boolean;
  /** Days since formal reinstatement when a severe event exists (null otherwise). */
  severeEventReinstatedDaysAgo: number | null;
};

/** §34.1/§34.2/§34.3 linear recovery curve. */
function linearCap(daysAgo: number, startDay: number, endDay: number, startCap: number, endCap: number): number {
  const t = (daysAgo - startDay) / (endDay - startDay);
  return startCap + (endCap - startCap) * clamp(t, 0, 1);
}

/**
 * §34 hard score ceiling from FINAL adjudicated events; null = no cap. When
 * both a severe cap and a major cap apply, the LOWER (stricter) ceiling wins:
 * the severe branch is computed first here and majors can only appear when
 * the severe branch returned null.
 */
export function hardCapForEvents(events: CapInput): number | null {
  if (events.currentlyRestricted) return null; // status becomes RESTRICTED; no numeric score
  const reinstated = Number(events.severeEventReinstatedDaysAgo);
  if (events.severeEventReinstatedDaysAgo != null && Number.isFinite(reinstated) && reinstated >= 0) {
    if (reinstated <= 365) return 499;
    if (reinstated <= 1095) return linearCap(reinstated, 365, 1095, 499, 649);
  }
  const majors = (events.majorDefaultsDaysAgo ?? [])
    .filter((d) => Number.isFinite(d) && d >= 0)
    .sort((a, b) => a - b);
  if (majors.length === 0) return null;
  const mostRecent = majors[0];
  // Repeated-major rule: 2+ majors within a rolling 730-day window.
  const within730 = majors.filter((d) => d <= 730);
  if (within730.length >= 2) {
    // mostRecent is the smallest day count, hence ≤ 730 here.
    if (mostRecent <= 365) return 549;
    return linearCap(mostRecent, 365, 730, 549, 699);
  }
  // Single major: 649 for 180 days, linear recovery to 799 by day 730.
  if (mostRecent <= 180) return 649;
  if (mostRecent <= 730) return linearCap(mostRecent, 180, 730, 649, 799);
  return null;
}

/** §34: does an adverse severity count as a MAJOR_DEFAULT cap trigger? */
export function isMajorDefault(severity: SeverityCode): boolean {
  return (
    severity === "ABANDONMENT_OR_NONPERFORMANCE" ||
    severity === "PAYMENT_DEFAULT_OR_ABUSIVE_CHARGEBACK"
  );
}

/** §34: severe-integrity event? (fraud/collusion/identity manipulation confirmed) */
export function isSevereIntegrity(severity: SeverityCode): boolean {
  return severity === "FRAUD_OR_COLLUSION_CONFIRMED";
}

/** §35: the true marginal effect of one finalized event, in points. */
export function marginalImpact(scoreWithEvent: number, scoreWithoutEvent: number): number {
  const a = Math.round(Number(scoreWithEvent));
  const b = Math.round(Number(scoreWithoutEvent));
  if (!Number.isFinite(a) || !Number.isFinite(b)) return 0;
  return a - b;
}

/** Role eligibility (§6): ≥2 primary outcomes AND ≥2 distinct counterparties. */
export function isEligible(primaryOutcomes: number, uniqueCounterparties: number): boolean {
  return (
    Number.isFinite(primaryOutcomes) &&
    primaryOutcomes >= 2 &&
    Number.isFinite(uniqueCounterparties) &&
    uniqueCounterparties >= 2
  );
}