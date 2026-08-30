/**
 * Trust evidence layer (RC4 §40): loads AUTHORITATIVE marketplace state
 * (bounties, projects, parent works, milestones, reviews, disputes, users)
 * and shapes it into the pure BI-1.0 pipeline's RoleOutcomes. SQL loads
 * facts; the model in ./score-core decides everything else. No client input
 * can add to any of these values, and only revealed reviews enter (§9/§26).
 *
 * Trust events (the append-only audit layer) are NOT the source here — the
 * projector (./projector.server.ts) records them from the same state, and
 * explicit REVERSAL rows are the only way a state-derived outcome is
 * excluded. Delete every trust event and the score still reproduces
 * (§11/§41): state + reversals → deterministic evidence.
 */
import { getSql, type Sql } from "@/lib/db.server";
import { bountyComplexity, captainComplexity, projectComplexity, timelinessValue } from "./model-v1";
import type { PreparedEvidence, RoleOutcome, ReviewFacts } from "./score-core";
import type { Role } from "./model-v1";
import { revealState } from "@/lib/marketplace/review-reveal";

const DAY_MS = 86_400_000;
/** §24.1: generous deterministic funding window before a lapse is attributable. */
export const FUNDING_WINDOW_DAYS = 7;

function toDate(value: unknown): Date | null {
  if (value == null) return null;
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? null : d;
}

function daysAgo(value: unknown, now: Date): number {
  const d = toDate(value);
  if (!d) return 0;
  return Math.max(0, Math.floor((now.getTime() - d.getTime()) / DAY_MS));
}

/** Source key for the trust-event layer: ("source_type", "source_id"). */
export function sourceParts(workKey: string): { sourceType: string; sourceId: string } {
  const [sourceType, ...rest] = workKey.split(":");
  return { sourceType, sourceId: rest.join(":") };
}

interface MilestoneRow {
  id: string;
  submitted_at: string;
  active_at: string | null;
  effective_due: string | null;
  amount_minor: number;
}

/** Value-weighted milestone timeliness for one delivered project (§23.3). */
function milestoneTimelinessValue(rows: MilestoneRow[]): number | null {
  if (rows.length === 0) return null;
  let weightSum = 0;
  let valueSum = 0;
  for (const m of rows) {
    const submitted = toDate(m.submitted_at);
    const due = toDate(m.effective_due);
    if (!submitted || !due) continue;
    const active = toDate(m.active_at) ?? new Date(submitted.getTime() - 7 * DAY_MS);
    const lateDays = Math.max(0, (submitted.getTime() - due.getTime()) / DAY_MS);
    const planned = Math.max(7, (due.getTime() - active.getTime()) / DAY_MS);
    const weight = Math.max(1, Number(m.amount_minor));
    valueSum += weight * timelinessValue(lateDays, planned);
    weightSum += weight;
  }
  return weightSum > 0 ? valueSum / weightSum : null;
}

/** §27: the reviewer-weight input (reviewer's own verified outcomes), one query. */
async function reviewerCounts(sql: Sql, reviewerIds: string[]): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  if (reviewerIds.length === 0) return counts;
  const rows = await sql.query<{ rid: string; n: number }>(
    `with rev as (select unnest($1::text[]) as rid)
     select rev.rid as rid, (
       (select count(*)::int from bounty_awards ba
          join bounties b on b.id = ba.bounty_id
         where ba.user_id = rev.rid and ba.place = 1 and b.status = 'COMPLETED')
     + (select count(*)::int from projects p
          join project_proposals pp on pp.id = p.selected_proposal_id
         where pp.provider_user_id = rev.rid and p.status = 'COMPLETED')
     + (select count(*)::int from parent_works pw
         where pw.captain_user_id = rev.rid and pw.status = 'COMPLETED')
     + (select count(*)::int from bounties b2 where b2.sponsor_user_id = rev.rid and b2.status = 'COMPLETED')
     + (select count(*)::int from projects p2
         where p2.sponsor_user_id = rev.rid and p2.status = 'COMPLETED')
     ) as n
     from rev`,
    [reviewerIds],
  );
  for (const r of rows) counts.set(r.rid, Number(r.n) || 0);
  return counts;
}

/** Reveal map per work ("BOUNTY:id"/"PROJECT:id") from the shared §26 rule. */
async function revealMapFor(sql: Sql, userId: string, now: Date): Promise<Map<string, boolean>> {
  const rows = await sql.query<{ work_key: string; created_at: string; other_created_at: string | null }>(
    `select r.work_type || ':' || r.work_id as work_key, r.created_at,
            (select o.created_at from reviews o
              where o.work_type = r.work_type and o.work_id = r.work_id
                and o.reviewer_user_id = r.reviewee_user_id
                and o.reviewee_user_id = r.reviewer_user_id
              limit 1) as other_created_at
     from reviews r
     where r.reviewee_user_id = $1`,
    [userId],
  );
  const map = new Map<string, boolean>();
  for (const r of rows) {
    map.set(r.work_key, revealState(r.created_at, r.other_created_at, now).revealed);
  }
  return map;
}

interface ReviewRow {
  work_key: string;
  reviewer_user_id: string;
  quality: number | null;
  value: number | null;
  communication: number | null;
  clarity: number | null;
  fairness: number | null;
}

/** A revealed review shaped for the pipeline (never leaks a blind rating). */
function reviewFacts(
  row: ReviewRow | null | undefined,
  revealed: Map<string, boolean>,
  counts: Map<string, number>,
): ReviewFacts | null {
  if (!row) return null;
  return {
    revealed: revealed.get(row.work_key) ?? false,
    reviewerPrimaryOutcomes: counts.get(row.reviewer_user_id) ?? 0,
    quality: row.quality,
    value: row.value,
    communication: row.communication,
    clarity: row.clarity,
    fairness: row.fairness,
  };
}

/** One finalized dispute, responsibility-resolved (never from claimant state). */
export interface Adjudication {
  disputeId: string;
  workType: "BOUNTY" | "PROJECT";
  workId: string;
  resolutionCode: string;
  severity: NonNullable<RoleOutcome["severity"]>;
  /** Affected economic amount (disputed amount, falling back to the work amount). */
  amountMinor: number;
  /** The work item's persisted currency (RC5.1; disputes.currency, NOT NULL default INR). */
  currency: string;
  ageDays: number;
  /** Responsible parties; SHARED_FAULT splits half to each side (§20). */
  targets: Array<{ userId: string; role: Role; share: number }>;
  providerId: string | null;
  sponsorId: string | null;
  captainId: string | null;
  /** The parent work when the disputed item is a Bidception child (§25). */
  parentWorkKey: string | null;
}

interface DisputeRow {
  id: string;
  resolution_code: string;
  severity_code: string | null;
  disputed_amount_minor: number | null;
  finalized_at: string | null;
  work_type: string;
  work_id: string;
  bounty_sponsor: string | null;
  project_sponsor: string | null;
  bounty_provider: string | null;
  project_provider: string | null;
  captain_user_id: string | null;
  parent_work_id: string | null;
  work_amount: number | null;
  currency: string;
}

const NEUTRAL_RESOLUTIONS = new Set(["NO_FAULT", "PLATFORM_OR_PROVIDER_FAULT", "OTHER_NO_SCORE_EFFECT"]);

/**
 * Responsibility -> scoring targets, driven by the §20 table (SHARED_FAULT
 * splits the failure weight half to each side). Empty = no scoring evidence.
 */
function targetsFor(d: DisputeRow): Array<{ userId: string; role: Role; share: number }> {
  const provider = d.bounty_provider ?? d.project_provider ?? null;
  const sponsor = d.bounty_sponsor ?? d.project_sponsor ?? null;
  const captain = d.parent_work_id ? d.captain_user_id : null;
  const picking: Record<string, Array<{ userId: string | null; role: Role; share: number }>> = {
    PROVIDER_AT_FAULT: [{ userId: provider, role: "PROVIDER", share: 1 }],
    SPONSOR_AT_FAULT: [{ userId: sponsor, role: "SPONSOR", share: 1 }],
    ABUSIVE_CHARGEBACK_CONFIRMED: [{ userId: sponsor, role: "SPONSOR", share: 1 }],
    CAPTAIN_AT_FAULT: [{ userId: captain, role: "CAPTAIN", share: 1 }],
    FRAUD_CONFIRMED: [
      { userId: provider, role: "PROVIDER", share: 1 },
      { userId: sponsor, role: "SPONSOR", share: 1 },
    ],
    COLLUSION_CONFIRMED: [
      { userId: provider, role: "PROVIDER", share: 1 },
      { userId: sponsor, role: "SPONSOR", share: 1 },
    ],
    SHARED_FAULT: [
      { userId: provider, role: "PROVIDER", share: 0.5 },
      { userId: sponsor, role: "SPONSOR", share: 0.5 },
    ],
  };
  return (picking[d.resolution_code] ?? []).filter((t): t is { userId: string; role: Role; share: number } => Boolean(t.userId));
}

/** Default §19 severity when the adjudication did not pin one. */
function severityForResolution(code: string): NonNullable<RoleOutcome["severity"]> {
  switch (code) {
    case "ABUSIVE_CHARGEBACK_CONFIRMED":
    case "SPONSOR_AT_FAULT":
      return "PAYMENT_DEFAULT_OR_ABUSIVE_CHARGEBACK";
    case "FRAUD_CONFIRMED":
    case "COLLUSION_CONFIRMED":
      return "FRAUD_OR_COLLUSION_CONFIRMED";
    case "PROVIDER_AT_FAULT":
    case "CAPTAIN_AT_FAULT":
      return "ABANDONMENT_OR_NONPERFORMANCE";
    default:
      return "ATTRIBUTABLE_CANCELLATION";
  }
}

/** Structured complexity of one work item, from observable facts only (§15). */
export async function workComplexity(sql: Sql, workType: string, workId: string): Promise<number> {
  if (workType === "BOUNTY") {
    const rows = await sql.query<{ skills_len: number; days: number | null }>(
      `select coalesce(jsonb_array_length(skills), 0)::int as skills_len,
              extract(epoch from (coalesce(completed_at, submission_deadline) - coalesce(published_at, created_at))) / 86400.0 as days
       from bounties where id = $1`,
      [workId],
    );
    const b = rows[0];
    return bountyComplexity(b?.skills_len ?? 0, Math.max(1, Number(b?.days) || 0));
  }
  const rows = await sql.query<{ skills_len: number; milestone_count: number; days: number | null }>(
    `select coalesce(jsonb_array_length(skills), 0)::int as skills_len,
            (select count(*)::int from project_milestones m where m.project_id = projects.id) as milestone_count,
            extract(epoch from (coalesce(completed_at, now()) - (select min(coalesce(m.active_at, m.submitted_at, created_at))
               from project_milestones m where m.project_id = projects.id))) / 86400.0 as days
     from projects where id = $1`,
    [workId],
  );
  const p = rows[0];
  return projectComplexity(
    p?.skills_len ?? 0,
    Math.max(0, Number(p?.milestone_count) || 0),
    Math.max(0, Number(p?.days) || 0),
  );
}


/** Final disputes for one member, shaped into BI-1.0 adjudications. */
export async function disputeAdjudications(sql: Sql, userId: string, now: Date): Promise<Adjudication[]> {
  const rows = await sql.query<DisputeRow>(
    `select d.id, d.resolution_code, d.severity_code,
            d.currency,
            d.disputed_amount_minor::bigint as disputed_amount_minor, d.finalized_at,
            d.work_type, d.work_id,
            b.sponsor_user_id as bounty_sponsor,
            p2.sponsor_user_id as project_sponsor,
            (select ba.user_id from bounty_awards ba where ba.bounty_id = d.work_id and ba.place = 1 limit 1) as bounty_provider,
            (select pp.provider_user_id from project_proposals pp where pp.id = p2.selected_proposal_id limit 1) as project_provider,
            coalesce(b.parent_work_id, p2.parent_work_id) as parent_work_id,
            pw.captain_user_id as captain_user_id,
            coalesce(ba2.amount_minor, p2.selected_quoted_minor) as work_amount
     from disputes d
     left join bounties b on b.id = d.work_id and d.work_type = 'BOUNTY'
     left join bounty_awards ba2 on ba2.bounty_id = d.work_id and ba2.place = 1
     left join projects p2 on p2.id = d.work_id and d.work_type = 'PROJECT'
     left join parent_works pw on pw.id = coalesce(b.parent_work_id, p2.parent_work_id)
     where d.finalized_at is not null and d.resolution_code is not null
       and (d.claimant_user_id = $1 or d.respondent_user_id = $1)`,
    [userId],
  );
  const out: Adjudication[] = [];
  for (const d of rows) {
    if (NEUTRAL_RESOLUTIONS.has(d.resolution_code)) continue;
    const targets = targetsFor(d);
    if (targets.length === 0) continue;
    const severity = severityForResolution(d.severity_code ?? d.resolution_code);
    if (d.severity_code && d.severity_code !== "NORMAL") {
      // An explicit adjudicated severity code wins over the default mapping.
      out.push(shaped(d, targets, d.severity_code as NonNullable<RoleOutcome["severity"]>, now));
    } else {
      out.push(shaped(d, targets, severity, now));
    }
  }
  return out;
}

function shaped(
  d: DisputeRow,
  targets: Array<{ userId: string; role: Role; share: number }>,
  severity: NonNullable<RoleOutcome["severity"]>,
  now: Date,
): Adjudication {
  return {
    disputeId: d.id,
    workType: d.work_type === "BOUNTY" ? "BOUNTY" : "PROJECT",
    workId: d.work_id,
    resolutionCode: d.resolution_code,
    severity,
    amountMinor: Number(d.disputed_amount_minor ?? d.work_amount ?? 0),
    currency: d.currency,
    ageDays: daysAgo(d.finalized_at, now),
    targets,
    providerId: d.bounty_provider ?? d.project_provider ?? null,
    sponsorId: d.bounty_sponsor ?? d.project_sponsor ?? null,
    captainId: d.captain_user_id,
    parentWorkKey: d.parent_work_id ? `PARENT_WORK:${d.parent_work_id}` : null,
  };
}

/** §34/§19: one dispute-derived adverse RoleOutcome for the responsible user. */
function adverseOutcome(a: Adjudication, userId: string, complexity: number): RoleOutcome {
  const mine = a.targets.find((t) => t.userId === userId);
  const others = a.targets.filter((t) => t.userId !== userId);
  return {
    workKey: `${a.workType === "BOUNTY" ? "BOUNTY" : "PROJECT"}:${a.workId}`,
    counterpartyUserId: others[0]?.userId ?? null,
    excludedFromEvidence: false,
    occurredDaysAgo: a.ageDays,
    amountMinor: a.amountMinor,
    currency: a.currency,
    severity: a.severity,
    complexity,
    review: null,
    timelinessY: 0,
    decisionDelayDays: null,
    stewardshipY: null,
    childOutcomeY: null,
    weightShare: mine?.share ?? 1,
  };
}

/** Build a clean primary outcome with review attach (shared mapper input). */
interface WorkFact {
  workKey: string;
  counterpartyUserId: string | null;
  amountMinor: number;
  currency: string;
  occurredDaysAgo: number;
  complexity: number;
  timelinessY: number | null;
  decisionDelayDays: number | null;
}

function cleanOutcomeFrom(
  f: WorkFact,
  reviewRows: ReviewRow[],
  revealed: Map<string, boolean>,
  counts: Map<string, number>,
  excluded: boolean,
): RoleOutcome {
  const review = reviewRows.find((rv) => rv.work_key === f.workKey) ?? null;
  return {
    workKey: f.workKey,
    counterpartyUserId: f.counterpartyUserId,
    excludedFromEvidence: excluded,
    occurredDaysAgo: f.occurredDaysAgo,
    amountMinor: f.amountMinor,
    currency: f.currency,
    severity: "NORMAL",
    complexity: f.complexity,
    review: reviewFacts(
      excluded ? null : (review as ReviewRow | null),
      revealed,
      counts,
    ),
    timelinessY: f.timelinessY,
    decisionDelayDays: f.decisionDelayDays,
    stewardshipY: null,
    childOutcomeY: null,
    weightShare: 1,
  };
}

function workComplexityFromParts(input: {
  kind: "BOUNTY" | "PROJECT";
  skillsLen: number;
  milestoneCount: number;
  plannedDays: number;
}): number {
  return input.kind === "BOUNTY"
    ? bountyComplexity(input.skillsLen, Math.max(1, input.plannedDays))
    : projectComplexity(input.skillsLen, input.milestoneCount, Math.max(0, input.plannedDays));
}

/** Provider primary outcomes: settled bounty wins and delivered projects. */
async function buildProviderOutcomes(
  sql: Sql,
  userId: string,
  now: Date,
  reviewRows: ReviewRow[],
  revealed: Map<string, boolean>,
  counts: Map<string, number>,
): Promise<RoleOutcome[]> {
  const bounties = await sql.query<{
    work_key: string;
    amount_minor: number;
    currency: string;
    completed_at: string;
    sponsor_user_id: string;
    skills_len: number;
    planned_days: number | null;
  }>(
    `select 'BOUNTY:' || b.id as work_key, ba.amount_minor::bigint as amount_minor,
            b.currency,
            coalesce(b.completed_at, ba.awarded_at) as completed_at, b.sponsor_user_id,
            coalesce(jsonb_array_length(b.skills), 0)::int as skills_len,
            extract(epoch from (b.completed_at - coalesce(b.published_at, b.created_at))) / 86400.0 as planned_days
     from bounty_awards ba join bounties b on b.id = ba.bounty_id
     where ba.user_id = $1 and ba.place = 1 and b.status = 'COMPLETED'`,
    [userId],
  );
  const projects = await sql.query<{
    work_key: string;
    amount_minor: number | null;
    currency: string;
    completed_at: string;
    sponsor_user_id: string;
    skills_len: number;
    milestone_count: number;
    planned_days: number | null;
  }>(
    `select 'PROJECT:' || p.id as work_key, p.selected_quoted_minor::bigint as amount_minor,
            p.currency,
            p.completed_at, p.sponsor_user_id,
            coalesce(jsonb_array_length(p.skills), 0)::int as skills_len,
            (select count(*)::int from project_milestones m where m.project_id = p.id) as milestone_count,
            extract(epoch from (p.completed_at - (select min(coalesce(m.active_at, m.submitted_at, m.created_at))
               from project_milestones m where m.project_id = p.id))) / 86400.0 as planned_days
     from projects p join project_proposals pp on pp.id = p.selected_proposal_id
     where pp.provider_user_id = $1 and p.status = 'COMPLETED'`,
    [userId],
  );
  const excluded = await excludedKeys(sql, userId, "PROVIDER");
  const outcomes: RoleOutcome[] = [];
  // Bounty wins: submission timeliness is enforced by the platform (on time → 1).
  for (const b of bounties) {
    outcomes.push(
      cleanOutcomeFrom(
        {
          workKey: b.work_key,
          counterpartyUserId: b.sponsor_user_id,
          amountMinor: Number(b.amount_minor),
          currency: b.currency,
          occurredDaysAgo: daysAgo(b.completed_at, now),
          complexity: bountyComplexity(b.skills_len, Math.max(1, Number(b.planned_days) || 0)),
          timelinessY: 1,
          decisionDelayDays: null,
        },
        reviewRows,
        revealed,
        counts,
        excluded.has(b.work_key),
      ),
    );
  }
  for (const p of projects) {
    const milestones = await milestonesWithEffectiveDue(sql, p.work_key.slice("PROJECT:".length));
    const timelinessY = milestoneTimelinessValue(milestones);
    outcomes.push(
      cleanOutcomeFrom(
        {
          workKey: p.work_key,
          counterpartyUserId: p.sponsor_user_id,
          amountMinor: Number(p.amount_minor ?? 0),
          currency: p.currency,
          occurredDaysAgo: daysAgo(p.completed_at, now),
          complexity: projectComplexity(p.skills_len, p.milestone_count, Math.max(0, Number(p.planned_days) || 0)),
          timelinessY,
          decisionDelayDays: null,
        },
        reviewRows,
        revealed,
        counts,
        excluded.has(p.work_key),
      ),
    );
  }
  return outcomes.sort((a, b) => a.workKey.localeCompare(b.workKey));
}


/** Work keys ("TYPE:id") excluded by REVERSAL events for this member+role. */
async function excludedKeys(sql: Sql, userId: string, role: Role): Promise<Set<string>> {
  const rows = await sql.query<{ source_type: string; source_id: string }>(
    `select distinct orig.source_type, orig.source_id
     from trust_events rev
     join trust_events orig on orig.id = rev.reverses_event_id
     where rev.event_kind = 'REVERSAL' and orig.user_id = $1 and orig.role = $2`,
    [userId, role],
  );
  const keys = new Set<string>();
  for (const r of rows) {
    keys.add(`${r.source_type.toUpperCase()}:${r.source_id}`);
    if (r.source_type === "funding_lapse") keys.add(`PROJECT:${r.source_id}`);
    if (r.source_type === "dispute_resolution") keys.add(`source-dispute:${r.source_id}`);
  }
  return keys;
}

/** Trust events for this member+role, righted for the projector. */
export interface KnownEvent {
  id: string;
  userId: string;
  sourceType: string;
  sourceId: string;
  role: Role;
  eventKind: string;
}

async function knownEvents(sql: Sql, userId: string): Promise<KnownEvent[]> {
  const rows = await sql.query<{ id: string; user_id: string; source_type: string; source_id: string; role: string; event_kind: string }>(
    `select id, user_id, source_type, source_id, role, event_kind from trust_events where user_id = $1`,
    [userId],
  );
  return rows.map((r) => ({
    id: r.id,
    userId: r.user_id,
    sourceType: r.source_type,
    sourceId: r.source_id,
    role: r.role as Role,
    eventKind: r.event_kind,
  }));
}

export interface TrustFacts {
  userId: string;
  banned: boolean;
  now: Date;
  provider: PreparedEvidence;
  sponsor: PreparedEvidence;
  captain: PreparedEvidence;
  /** Final dispute adjudications in this member's orbit (projector input). */
  adjudications: Adjudication[];
  /** Existing trust events for the projector's idempotency diff. */
  events: KnownEvent[];
}

type RoleBuckets = Record<Role, RoleOutcome[]>;

export async function collectTrustFacts(userId: string, asOf = new Date()): Promise<TrustFacts> {
  const sql = await getSql();
  const user = (
    await sql.query<{ banned: boolean }>("select banned from users where id = $1", [userId])
  )[0];
  const reviewRows = await sql.query<ReviewRow>(
    `select work_type || ':' || work_id as work_key, reviewer_user_id,
            quality, value, communication, clarity, fairness
     from reviews where reviewee_user_id = $1`,
    [userId],
  );
  const revealed = await revealMapFor(sql, userId, asOf);
  const reviewers = [...new Set(reviewRows.map((r) => r.reviewer_user_id))];
  const counts = await reviewerCounts(sql, reviewers);
  const provider = await buildProviderOutcomes(sql, userId, asOf, reviewRows, revealed, counts);
  const sponsor = await buildSponsorOutcomes(sql, userId, asOf, reviewRows, revealed, counts);
  const captain = await buildCaptainOutcomes(sql, userId, asOf, revealed, counts);
  const adjudications = await disputeAdjudications(sql, userId, asOf);
  const excluded = {
    PROVIDER: await excludedKeys(sql, userId, "PROVIDER"),
    SPONSOR: await excludedKeys(sql, userId, "SPONSOR"),
    CAPTAIN: await excludedKeys(sql, userId, "CAPTAIN"),
  };
  const adverse = await disputeAdverseOutcomes(sql, adjudications, userId, excluded);
  const lapse = await sponsorFundingLapses(sql, userId, asOf, excluded.SPONSOR);
  const events = await knownEvents(sql, userId);

  // A final adjudication against a member supersedes the clean completion of
  // that same work for that member's role (§19/§20): the adverse event takes
  // over; the clean outcome is neither double-counted nor rebuilt.
  const superseded = { PROVIDER: new Set<string>(), SPONSOR: new Set<string>(), CAPTAIN: new Set<string>() };
  for (const a of adjudications) {
    const workKey = `${a.workType}:${a.workId}`;
    if (a.targets.some((t) => t.role === "PROVIDER")) superseded.PROVIDER.add(workKey);
    if (a.targets.some((t) => t.role === "SPONSOR")) superseded.SPONSOR.add(workKey);
    if (a.targets.some((t) => t.role === "CAPTAIN") && a.parentWorkKey) {
      superseded.CAPTAIN.add(a.parentWorkKey);
    }
  }
  const keep = (list: RoleOutcome[], supersededKeys: Set<string>): RoleOutcome[] =>
    list.filter((o) => o.severity === "NORMAL" ? !supersededKeys.has(o.workKey) : true);

  return {
    userId,
    banned: Boolean(user?.banned ?? false),
    now: asOf,
    provider: {
      role: "PROVIDER",
      outcomes: [...keep(provider, superseded.PROVIDER), ...adverse.PROVIDER],
      currentlyRestricted: false,
      severeEventReinstatedDaysAgo: null,
    },
    sponsor: {
      role: "SPONSOR",
      outcomes: [...keep(sponsor, superseded.SPONSOR), ...lapse, ...adverse.SPONSOR],
      currentlyRestricted: false,
      severeEventReinstatedDaysAgo: null,
    },
    captain: {
      role: "CAPTAIN",
      outcomes: [...keep(captain, superseded.CAPTAIN), ...adverse.CAPTAIN],
      currentlyRestricted: false,
      severeEventReinstatedDaysAgo: null,
    },
    adjudications,
    events,
  };
}

/** Sponsor decision-timeliness for one project's milestones (§24.3). */
async function sponsorDecisionDelay(sql: Sql, projectId: string): Promise<number | null> {
  const rows = await sql.query<{ submitted_at: string; decided_at: string }>(
    `select submitted_at, decided_at from project_milestones
     where project_id = $1 and submitted_at is not null and decided_at is not null`,
    [projectId],
  );
  if (rows.length === 0) return null;
  const GRACE_MS = 3 * DAY_MS;
  const delays = rows.map((r) => {
    const submitted = new Date(r.submitted_at).getTime();
    const decided = new Date(r.decided_at).getTime();
    return Math.max(0, (decided - (submitted + GRACE_MS)) / DAY_MS);
  });
  return delays.reduce((a, b) => a + b, 0) / delays.length;
}

/** Sponsor primary outcomes: completed funded work they sponsored. */
async function buildSponsorOutcomes(
  sql: Sql,
  userId: string,
  now: Date,
  reviewRows: ReviewRow[],
  revealed: Map<string, boolean>,
  counts: Map<string, number>,
): Promise<RoleOutcome[]> {
  const bounties = await sql.query<{
    work_key: string;
    reward_total_minor: number;
    currency: string;
    completed_at: string;
    awarded_at: string | null;
    submission_deadline: string | null;
    skills_len: number;
    planned_days: number | null;
    winner_user_id: string;
  }>(
    `select 'BOUNTY:' || b.id as work_key, b.reward_total_minor::bigint as reward_total_minor,
            b.currency,
            b.completed_at, b.awarded_at, b.submission_deadline,
            coalesce(jsonb_array_length(b.skills), 0)::int as skills_len,
            extract(epoch from (b.completed_at - coalesce(b.published_at, b.created_at))) / 86400.0 as planned_days,
            (select ba.user_id from bounty_awards ba where ba.bounty_id = b.id and ba.place = 1 limit 1) as winner_user_id
     from bounties b
     where b.sponsor_user_id = $1 and b.status = 'COMPLETED'`,
    [userId],
  );
  const projects = await sql.query<{
    work_key: string;
    quoted: number | null;
    currency: string;
    completed_at: string;
    provider_user_id: string;
  }>(
    `select 'PROJECT:' || p.id as work_key, p.selected_quoted_minor::bigint as quoted,
            p.currency, p.completed_at,
            pp.provider_user_id
     from projects p join project_proposals pp on pp.id = p.selected_proposal_id
     where p.sponsor_user_id = $1 and p.status = 'COMPLETED'`,
    [userId],
  );
  const excluded = await excludedKeys(sql, userId, "SPONSOR");

  const outcomes: RoleOutcome[] = [];
  for (const b of bounties) {
    if (excluded.has(b.work_key)) continue;
    if (!b.winner_user_id) continue;
    const graceMs = 3 * DAY_MS;
    const awarded = toDate(b.awarded_at);
    const deadline = toDate(b.submission_deadline);
    const decisionDelayDays =
      awarded && deadline
        ? Math.max(0, (awarded.getTime() - (deadline.getTime() + graceMs)) / DAY_MS)
        : null;
    outcomes.push(
      cleanOutcomeFrom(
        {
          workKey: b.work_key,
          counterpartyUserId: b.winner_user_id,
          amountMinor: Number(b.reward_total_minor),
          currency: b.currency,
          occurredDaysAgo: daysAgo(b.completed_at, now),
          // Sponsor exposure rides the same bounty structure (§15.1 facts).
          complexity: bountyComplexity(b.skills_len, Math.max(1, Number(b.planned_days) || 0)),
          timelinessY: null,
          decisionDelayDays,
        },
        reviewRows,
        revealed,
        counts,
        false,
      ),
    );
  }
  for (const p of projects) {
    if (excluded.has(p.work_key)) continue;
    const decisionDelayDays = await sponsorDecisionDelay(sql, p.work_key.slice("PROJECT:".length));
    outcomes.push(
      cleanOutcomeFrom(
        {
          workKey: p.work_key,
          counterpartyUserId: p.provider_user_id,
          amountMinor: Number(p.quoted ?? 0),
          currency: p.currency,
          occurredDaysAgo: daysAgo(p.completed_at, now),
          // The sponsor's exposure is the same work's economics; complexity
          // for the sponsor role tracks the work item, not the provider's task.
          complexity: await workComplexity(sql, "PROJECT", p.work_key.slice("PROJECT:".length)),
          timelinessY: null,
          decisionDelayDays,
        },
        reviewRows,
        revealed,
        counts,
        false,
      ),
    );
  }
  return outcomes.sort((a, b) => a.workKey.localeCompare(b.workKey));
}

/** §25.2/3: budget facts for one parent from child allocations. */
async function parentBudgetFacts(sql: Sql, parentWorkId: string): Promise<{
  childUnits: number;
  dependencyEdges: number;
  distinctWorkers: number;
  skillsLen: number;
  failedMinor: number;
  committedMinor: number;
  completedMinor: number;
}> {
  const children = await sql.query<{
    allocated_minor: number;
    state: string;
    depends_on: string[];
  }>(
    `select allocated_minor::bigint as allocated_minor, state, depends_on
     from child_works where parent_work_id = $1`,
    [parentWorkId],
  );
  const workers = await sql.query<{ worker: string }>(
    `select distinct ba.user_id as worker
     from child_works cw
     join bounties b on b.id = cw.bounty_id
     join bounty_awards ba on ba.bounty_id = b.id and ba.place = 1
     where cw.parent_work_id = $1
     union
     select distinct pp.provider_user_id as worker
     from child_works cw2
     join projects p on p.id = cw2.project_id
     join project_proposals pp on pp.id = p.selected_proposal_id
     where cw2.parent_work_id = $1`,
    [parentWorkId],
  );
  const skillRows = await sql.query<{ n: number }>(
    `select count(distinct skill)::int as n from (
       select jsonb_array_elements_text(b.skills) as skill
       from child_works cw join bounties b on b.id = cw.bounty_id
       where cw.parent_work_id = $1
       union
       select jsonb_array_elements_text(p.skills) as skill
       from child_works cw2 join projects p on p.id = cw2.project_id
       where cw2.parent_work_id = $1
     ) x`,
    [parentWorkId],
  );
  const committed = children.reduce((a, c) => a + Math.max(0, Number(c.allocated_minor)), 0);
  const failed = children
    .filter((c) => c.state === "FAILED")
    .reduce((a, c) => a + Math.max(0, Number(c.allocated_minor)), 0);
  const completed = children
    .filter((c) => c.state === "COMPLETE")
    .reduce((a, c) => a + Math.max(0, Number(c.allocated_minor)), 0);
  return {
    childUnits: children.length,
    dependencyEdges: children.reduce((a, c) => a + (Array.isArray(c.depends_on) ? c.depends_on.length : 0), 0),
    distinctWorkers: new Set(workers.map((w) => w.worker)).size,
    skillsLen: Number(skillRows[0]?.n ?? 0),
    failedMinor: failed,
    committedMinor: committed,
    completedMinor: completed,
  };
}


/** Captain primary outcomes: parent works they carried to completion. */
async function buildCaptainOutcomes(
  sql: Sql,
  userId: string,
  now: Date,
  revealed: Map<string, boolean>,
  counts: Map<string, number>,
): Promise<RoleOutcome[]> {
  const parents = await sql.query<{
    work_key: string;
    compensation: number;
    currency: string;
    completed_at: string;
    sponsor_user_id: string;
    selected_at: string | null;
    skills_len: number | null;
  }>(
    `select 'PARENT_WORK:' || pw.id as work_key, pw.captain_compensation_minor::bigint as compensation,
            pw.currency,
            pw.completed_at, pw.sponsor_user_id, pw.captain_selected_at as selected_at,
            null::int as skills_len
     from parent_works pw
     where pw.captain_user_id = $1 and pw.status = 'COMPLETED'`,
    [userId],
  );
  const excluded = await excludedKeys(sql, userId, "CAPTAIN");
  const outcomes: RoleOutcome[] = [];
  for (const pw of parents) {
    if (excluded.has(pw.work_key)) continue;
    const facts = await parentBudgetFacts(sql, pw.work_key.slice("PARENT_WORK:".length));
    const selected = toDate(pw.selected_at);
    const completed = toDate(pw.completed_at);
    const plannedDays =
      selected && completed ? Math.max(0, (completed.getTime() - selected.getTime()) / DAY_MS) : 0;
    // §25.5: sponsor→captain reviews are not yet a supported relationship, so
    // the SPONSOR_REVIEW pillar stays on its prior until Bidception gains a
    // review surface (honest limitation, 5% weight).
    void revealed;
    void counts;
    outcomes.push({
      workKey: pw.work_key,
      counterpartyUserId: pw.sponsor_user_id,
      excludedFromEvidence: false,
      occurredDaysAgo: daysAgo(pw.completed_at, now),
      amountMinor: Number(pw.compensation),
      currency: pw.currency,
      severity: "NORMAL",
      complexity: captainComplexity({
        distinctSkills: facts.skillsLen,
        childUnits: facts.childUnits,
        dependencyEdges: facts.dependencyEdges,
        distinctWorkers: facts.distinctWorkers,
        plannedDays: Math.max(0, plannedDays),
      }),
      review: null,
      timelinessY: null,
      decisionDelayDays: null,
      stewardshipY: facts.committedMinor > 0 ? 1 - facts.failedMinor / facts.committedMinor : 1,
      childOutcomeY: facts.committedMinor > 0 ? facts.completedMinor / facts.committedMinor : 1,
      weightShare: 1,
    });
  }
  return outcomes.sort((a, b) => a.workKey.localeCompare(b.workKey));
}

/**
 * §19/§20: dispute-derived adverse outcomes for this member, one per
 * adjudication where they bear (a share of) responsibility. Exclusion honors
 * explicit REVERSAL events (source key "source-dispute:<dispute id>").
 */
async function disputeAdverseOutcomes(
  sql: Sql,
  adjudications: Adjudication[],
  userId: string,
  excluded: Record<Role, Set<string>>,
): Promise<RoleBuckets> {
  const buckets: RoleBuckets = { PROVIDER: [], SPONSOR: [], CAPTAIN: [] };
  for (const a of adjudications) {
    const mine = a.targets.find((t) => t.userId === userId);
    if (!mine) continue;
    if (excluded[mine.role].has(`source-dispute:${a.disputeId}`)) continue;
    const complexity = await workComplexity(sql, a.workType, a.workId);
    const counterparty =
      mine.role === "PROVIDER" ? a.sponsorId ?? a.captainId : mine.role === "SPONSOR" ? a.providerId : a.sponsorId;
    buckets[mine.role].push({
      workKey: `${a.workType}:${a.workId}`,
      counterpartyUserId: counterparty ?? null,
      excludedFromEvidence: false,
      occurredDaysAgo: a.ageDays,
      amountMinor: a.amountMinor,
      currency: a.currency,
      severity: a.severity,
      complexity,
      review: null,
      timelinessY: 0,
      decisionDelayDays: null,
      stewardshipY: null,
      childOutcomeY: null,
      weightShare: mine.share,
    });
  }
  return buckets;
}

/**
 * §24.1: sponsor funding lapse. A project cancelled from AWAITING_FUNDING
 * with a selected provider, past the 7-day funding window, is an
 * attributable sponsor cancellation (single deterministic rule; cancels
 * inside the window are neutral). Never inferred from free text.
 */
async function sponsorFundingLapses(
  sql: Sql,
  userId: string,
  now: Date,
  excluded: Set<string>,
): Promise<RoleOutcome[]> {
  const rows = await sql.query<{
    work_id: string;
    cancelled_at: string | null;
    selected_at: string | null;
    quoted: number | null;
    currency: string;
    provider_user_id: string;
  }>(
    `select p.id as work_id, p.cancelled_at, pp.updated_at as selected_at,
            p.selected_quoted_minor as quoted, p.currency, pp.provider_user_id
     from projects p join project_proposals pp on pp.id = p.selected_proposal_id
     where p.sponsor_user_id = $1 and p.status = 'CANCELLED' and pp.status = 'SELECTED'`,
    [userId],
  );
  const outcomes: RoleOutcome[] = [];
  for (const r of rows) {
    const cancelled = toDate(r.cancelled_at);
    const selected = toDate(r.selected_at);
    if (!cancelled || !selected) continue;
    if (cancelled.getTime() - selected.getTime() <= FUNDING_WINDOW_DAYS * DAY_MS) continue; // inside window → neutral
    const key = `PROJECT:${r.work_id}`;
    if (excluded.has(key)) continue;
    outcomes.push({
      workKey: key,
      counterpartyUserId: r.provider_user_id,
      excludedFromEvidence: false,
      occurredDaysAgo: daysAgo(r.cancelled_at, now),
      amountMinor: Math.max(0, Number(r.quoted ?? 0)),
      currency: r.currency,
      severity: "ATTRIBUTABLE_CANCELLATION",
      complexity: await workComplexity(sql, "PROJECT", r.work_id),
      review: null,
      timelinessY: null,
      decisionDelayDays: null,
      stewardshipY: null,
      childOutcomeY: null,
      weightShare: 1,
    });
  }
  return outcomes.sort((a, b) => a.workKey.localeCompare(b.workKey));
}

/** Milestones of one project that were submitted, with the effective due date. */
async function milestonesWithEffectiveDue(sql: Sql, projectId: string): Promise<MilestoneRow[]> {
  const rows = await sql.query<MilestoneRow>(
    `select m.id, m.submitted_at, m.active_at, m.due_at as effective_due,
            m.amount_minor::bigint as amount_minor
     from project_milestones m
     where m.project_id = $1 and m.submitted_at is not null
     order by m.seq asc`,
    [projectId],
  );
  if (rows.length === 0) return [];
  const extensions = await sql.query<{ milestone_id: string; new_due_at: string }>(
    `select e.milestone_id, e.new_due_at
     from project_milestone_extensions e
     join project_milestones m on m.id = e.milestone_id
     where m.project_id = $1
     order by e.created_at asc`,
    [projectId],
  );
  // §23.3: the latest approved extension resets the effective due date.
  const extended = new Map<string, string>();
  for (const e of extensions) extended.set(e.milestone_id, e.new_due_at);
  return rows.map((m) => ({
    ...m,
    effective_due: extended.get(m.id) ?? m.effective_due,
  }));
}
