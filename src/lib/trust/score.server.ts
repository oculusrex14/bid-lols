/**
 * Score snapshot service (RC4 §11/§40/§41): pure core from ./score-core is
 * wrapped by a read-through snapshot cache in `trust_score_snapshots`.
 * Snapshots are an AUDIT record, never the authority: every read rebuilds a
 * fingerprint of the authoritative state and recomputes when anything that
 * could move the score changed (new outcome, revealed review, adjudication,
 * reversal, model version).
 */
import { getSql, type Sql } from "@/lib/db.server";
import { MODEL_VERSION, scoreBand } from "./model-v1";
import { networkOverall, scoreRole, type OverallResult, type PreparedEvidence, type RoleScoreResult, type ScoreStatus } from "./score-core";
import { collectTrustFacts } from "./evidence.server";
import { createHash } from "node:crypto";

/** A trust report for one member. */
export interface TrustReport {
  userId: string;
  modelVersion: string;
  generatedAt: string;
  /** Overall Bid Index (null = NR network-wide for this member). */
  overall: {
    status: ScoreStatus;
    score: number | null;
    band: string;
    capApplied: number | null;
  } | null;
  roles: RoleScoreResult[];
  inputHash: string;
  /** Whether the report came from a matching snapshot or fresh compute. */
  fromSnapshot: boolean;
}

/** Deterministic JSON fingerprint (sorted keys, no whitespace). */
export function stableStringify(value: unknown): string {
  return JSON.stringify(sortValue(value));
}

function sortValue(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(sortValue);
  if (v && typeof v === "object") {
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(v as Record<string, unknown>).sort()) {
      out[k] = sortValue((v as Record<string, unknown>)[k]);
    }
    return out;
  }
  return v;
}

function hashReport(userId: string, roles: PreparedEvidence[]): string {
  // Fingerprint = outcome identity + all scoring-relevant facts. Hidden
  // (blind) review STARS never enter: only revealed-ness and the reviewer's
  // own evidence count (§26/§27).
  const summary = roles.map((r) => ({
    role: r.role,
    outcomes: r.outcomes
      .slice()
      .sort((a, b) => a.workKey.localeCompare(b.workKey))
      .map((o) => ({
        k: o.workKey,
        cp: o.counterpartyUserId,
        ex: o.excludedFromEvidence,
        d: o.occurredDaysAgo,
        a: o.amountMinor,
        s: o.severity,
        c: Math.round(o.complexity * 1e6) / 1e6,
        t: o.timelinessY,
        dec: o.decisionDelayDays,
        st: o.stewardshipY,
        ch: o.childOutcomeY,
        w: o.weightShare,
        rv: o.review
          ? { revealed: o.review.revealed, ro: o.review.reviewerPrimaryOutcomes }
          : null,
      })),
  }));
  return createHash("sha256")
    .update(stableStringify({ model: MODEL_VERSION, userId, roles: summary }))
    .digest("hex");
}

interface SnapshotRow {
  role: string;
  model_version: string;
  score: number | null;
  status: string;
  confidence: number | null;
  input_hash: string;
  pillars: Record<string, number> | null;
  primary_outcomes: number | null;
  unique_counterparties: number | null;
  as_of: string;
}

/**
 * The complete report path: authoritative evidence → fingerprint →
 * snapshot-or-compute per role → overall blend → persisted snapshots.
 * RESTRICTED (banned) accounts produce role results with no numeric score.
 */
export async function trustReportFor(userId: string, asOf = new Date()): Promise<TrustReport> {
  const sql = await getSql();
  const facts = await collectTrustFacts(userId, asOf);
  const prepared: PreparedEvidence[] = [facts.provider, facts.sponsor, facts.captain].map((r) => ({
    ...r,
    currentlyRestricted: facts.banned || r.currentlyRestricted,
  }));
  const inputHash = hashReport(userId, prepared);
  const results: RoleScoreResult[] = [];
  const snapshots = await readSnapshots(sql, userId);
  let fromSnapshot = true;
  for (const r of prepared) {
    const cached = snapshots.get(r.role);
    if (cached && cached.model_version === MODEL_VERSION && cached.input_hash === inputHash) {
      results.push(snapshotToResult(cached, r.role));
      continue;
    }
    fromSnapshot = false;
    const computed = scoreRole(r);
    results.push(computed);
    await writeSnapshot(sql, userId, r.role, computed, inputHash, asOf);
  }
  const overall = networkOverall(results);
  return {
    userId,
    modelVersion: MODEL_VERSION,
    generatedAt: asOf.toISOString(),
    overall: overall
      ? { status: overall.status, score: overall.score, band: String(overall.band), capApplied: overall.capApplied }
      : null,
    roles: results,
    inputHash,
    fromSnapshot,
  };
}

async function readSnapshots(sql: Sql, userId: string): Promise<Map<string, SnapshotRow>> {
  const rows = await sql.query<SnapshotRow>(
    `select role, model_version, score, status, confidence, input_hash, pillars,
            primary_outcomes, unique_counterparties, as_of
     from trust_score_snapshots where user_id = $1 and model_version = $2`,
    [userId, MODEL_VERSION],
  );
  const map = new Map<string, SnapshotRow>();
  for (const r of rows) map.set(r.role, r);
  return map;
}

function snapshotToResult(row: SnapshotRow, role: RoleScoreResult["role"]): RoleScoreResult {
  return {
    role,
    modelVersion: row.model_version,
    status: row.status as ScoreStatus,
    score: row.score == null ? null : Number(row.score),
    band: row.score == null ? "NR" : scoreBand(Number(row.score)),
    confidence: row.confidence == null ? 0 : Number(row.confidence),
    confidenceLabel: labelFromConfidence(row.confidence == null ? 0 : Number(row.confidence)),
    bRaw: 0,
    pillars: row.pillars ?? {},
    primaryOutcomes: Number(row.primary_outcomes ?? 0),
    uniqueCounterparties: Number(row.unique_counterparties ?? 0),
    effectiveSampleSize: 0,
    spanDays: 0,
    verifiedVolumeMinor: 0,
    capApplied: null,
    uncappedScore: null,
  };
}

function labelFromConfidence(c: number): "PROVISIONAL" | "SUPPORTED" | "HIGH" {
  if (c < 0.45) return "PROVISIONAL";
  if (c < 0.75) return "SUPPORTED";
  return "HIGH";
}

async function writeSnapshot(
  sql: Sql,
  userId: string,
  role: RoleScoreResult["role"],
  result: RoleScoreResult,
  inputHash: string,
  asOf: Date,
): Promise<void> {
  await sql.query(
    `insert into trust_score_snapshots
       (id, user_id, role, model_version, score, status, confidence,
        effective_sample_size, unique_counterparties, primary_outcomes,
        verified_volume_minor, verified_volume_currency, pillars, caps, input_hash, as_of)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'INR',$12::jsonb,$13::jsonb,$14,$15)
     on conflict (user_id, role, model_version) do update set
       score = excluded.score, status = excluded.status, confidence = excluded.confidence,
       effective_sample_size = excluded.effective_sample_size,
       unique_counterparties = excluded.unique_counterparties,
       primary_outcomes = excluded.primary_outcomes,
       verified_volume_minor = excluded.verified_volume_minor,
       pillars = excluded.pillars, caps = excluded.caps,
       input_hash = excluded.input_hash, as_of = excluded.as_of`,
    [
      `tss_${userId.slice(0, 12)}_${role}_${MODEL_VERSION}`.replace(/[^A-Za-z0-9_.:-]/g, ""),
      userId,
      role,
      MODEL_VERSION,
      result.score,
      result.status,
      result.confidence,
      result.effectiveSampleSize,
      result.uniqueCounterparties,
      result.primaryOutcomes,
      result.verifiedVolumeMinor,
      JSON.stringify(result.pillars),
      JSON.stringify(result.capApplied == null ? {} : { cap: result.capApplied }),
      inputHash,
      asOf.toISOString(),
    ],
  );
}

/**
 * §35: TRUE marginal score effect of each finalized adverse event for a
 * role — the score with the event minus the score without it, computed by
 * the real model (never an invented point table).
 */
export async function marginalImpactsForRole(
  userId: string,
  role: PreparedEvidence["role"],
): Promise<Array<{ workKey: string; severity: string; impactPoints: number }>> {
  const facts = await collectTrustFacts(userId);
  const prep = role === "PROVIDER" ? facts.provider : role === "SPONSOR" ? facts.sponsor : facts.captain;
  const base = scoreRole({ ...prep, currentlyRestricted: facts.banned || prep.currentlyRestricted });
  if (base.status !== "SCORED" || base.score == null) return [];
  const out: Array<{ workKey: string; severity: string; impactPoints: number }> = [];
  for (const outcome of prep.outcomes) {
    if (outcome.severity === "NORMAL") continue;
    const without = scoreRole(
      { ...prep, outcomes: prep.outcomes.filter((o) => o.workKey !== outcome.workKey) },
      );
    const withoutScore = without.status === "SCORED" && without.score != null ? without.score : null;
    out.push({
      workKey: outcome.workKey,
      severity: outcome.severity,
      impactPoints: withoutScore == null ? 0 : base.score - withoutScore,
    });
  }
  return out;
}

/**
 * §54/§73: score leaderboard from snapshots. Candidates are re-verified
 * through the full scoring path (bounded by the small limit) so public
 * rankings can never serve stale numbers (§73). Eligibility is STRICTER
 * than display: score-eligible, confidence ≥ 0.45, n_eff ≥ 5, ≥3 unrelated
 * counterparties (§54). Empty beats fake.
 */
export interface BidIndexLeaderRow {
  userId: string;
  handle: string | null;
  displayName: string | null;
  score: number;
  band: string;
  confidence: number;
  primaryOutcomes: number;
  uniqueCounterparties: number;
}

export async function bidIndexLeaderboard(
  role: RoleScoreResult["role"],
  limit = 10,
): Promise<BidIndexLeaderRow[]> {
  const sql = await getSql();
  const candidates = await sql.query<{
    user_id: string;
    score: number;
    handle: string | null;
    display_name: string | null;
  }>(
    `select s.user_id, s.score::int as score, pr.handle, u.display_name
     from trust_score_snapshots s
     join users u on u.id = s.user_id and u.banned = false
     left join profiles pr on pr.user_id = s.user_id
     where s.role = $1 and s.model_version = $2 and s.status = 'SCORED' and s.score is not null
     order by s.score desc
     limit $3`,
    [role, MODEL_VERSION, limit * 4],
  );
  const rows: BidIndexLeaderRow[] = [];
  for (const c of candidates.slice(0, limit * 2)) {
    const report = await trustReportFor(c.user_id, new Date());
    const r = report.roles.find((x) => x.role === role);
    if (!r || r.status !== "SCORED" || r.score == null) continue;
    if (r.confidence < 0.45) continue;
    if (r.effectiveSampleSize < 5) continue;
    if (r.uniqueCounterparties < 3) continue;
    rows.push({
      userId: c.user_id,
      handle: c.handle,
      displayName: c.display_name,
      score: r.score,
      band: String(r.band),
      confidence: r.confidence,
      primaryOutcomes: r.primaryOutcomes,
      uniqueCounterparties: r.uniqueCounterparties,
    });
    if (rows.length >= limit) break;
  }
  return rows.sort((a, b) => b.score - a.score || a.handle?.localeCompare(b.handle ?? "") || 0);
}

/** Public-facing trust facts for a profile (§50/§53). */
export interface PublicTrustBlock {
  modelVersion: string;
  overall: { status: ScoreStatus; score: number | null; band: string; confidence: number; confidenceLabel: string } | null;
  roles: Array<{
    role: RoleScoreResult["role"];
    status: ScoreStatus;
    score: number | null;
    band: string;
    confidence: number;
    confidenceLabel: string;
    pillars: Record<string, number>;
    primaryOutcomes: number;
    uniqueCounterparties: number;
  }>;
  verifiedOutcomeCount: number;
}

export async function publicTrustFor(userId: string, asOf = new Date()): Promise<PublicTrustBlock> {
  const report = await trustReportFor(userId, asOf);
  const scored = report.roles.filter((r) => r.status === "SCORED");
  return {
    modelVersion: report.modelVersion,
    overall: report.overall
      ? {
          status: report.overall.status,
          score: report.overall.score,
          band: report.overall.band,
          confidence: report.roles.reduce((a, r) => Math.max(a, r.confidence), 0),
          confidenceLabel: report.roles.some((r) => r.confidenceLabel === "HIGH")
            ? "HIGH CONFIDENCE"
            : report.roles.some((r) => r.confidenceLabel === "SUPPORTED")
              ? "SUPPORTED"
              : "PROVISIONAL",
        }
      : null,
    roles: report.roles.map((r) => ({
      role: r.role,
      status: r.status,
      score: r.score,
      band: String(r.band),
      confidence: r.confidence,
      confidenceLabel: r.confidenceLabel,
      pillars: r.pillars,
      primaryOutcomes: r.primaryOutcomes,
      uniqueCounterparties: r.uniqueCounterparties,
    })),
    verifiedOutcomeCount: scored.reduce((a, r) => a + 0, 0) + report.roles.reduce((a, r) => a + r.primaryOutcomes, 0),
  };
}

/**
 * Overall Bid Index ranking (§54 "Highest Bid Index"). Members re-verified
 * through the full pipeline; overall only exists once some role is scored.
 */
export async function bidIndexLeaderboardOverall(limit = 10): Promise<BidIndexLeaderRow[]> {
  const sql = await getSql();
  const candidates = await sql.query<{ user_id: string; handle: string | null; display_name: string | null }>(
    `select distinct s.user_id, pr.handle, u.display_name
     from trust_score_snapshots s
     join users u on u.id = s.user_id and u.banned = false
     left join profiles pr on pr.user_id = s.user_id
     where s.model_version = $1 and s.status = 'SCORED' and s.score is not null
     order by s.user_id
     limit $2`,
    [MODEL_VERSION, limit * 4],
  );
  const rows: BidIndexLeaderRow[] = [];
  for (const c of candidates.slice(0, limit * 2)) {
    const report = await trustReportFor(c.user_id, new Date());
    if (!report.overall || report.overall.status !== "SCORED" || report.overall.score == null) {
      continue;
    }
    rows.push({
      userId: c.user_id,
      handle: c.handle,
      displayName: c.display_name,
      score: report.overall.score,
      band: String(report.overall.band),
      confidence: report.roles.reduce((a, r) => Math.max(a, r.confidence), 0),
      primaryOutcomes: report.roles.reduce((a, r) => a + r.primaryOutcomes, 0),
      uniqueCounterparties: report.roles.reduce((a, r) => Math.max(a, r.uniqueCounterparties), 0),
    });
    if (rows.length >= limit) break;
  }
  return rows.sort((a, b) => b.score - a.score);
}
