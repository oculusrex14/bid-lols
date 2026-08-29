/**
 * Trust event projector (RC4 §39): deterministic, idempotent, rebuildable
 * mapping from authoritative marketplace state into the append-only
 * `trust_events` layer. NEVER called with client-supplied payloads; nothing
 * but trusted server services may write trust events (§68).
 *
 * Idempotency: every event carries a UNIQUE key on
 * (source_type, source_id, user_id, role, event_kind), so re-running the
 * projector produces the identical event set (§62.21/22). State that stops
 * supporting an event no longer emits it; the projector records an explicit
 * REVERSAL for the stale event instead of deleting history.
 */
import { getSql, type Sql } from "@/lib/db.server";
import { makeId } from "@/lib/ids";
import { COMPLEXITY_VERSION } from "./model-v1";
import { collectTrustFacts, workComplexity, type Adjudication, type KnownEvent } from "./evidence.server";
import type { Role, SeverityCode } from "./model-v1";
import type { RoleOutcome } from "./score-core";

/** The evidence bundle the projector walks (mirror of TrustFacts shape). */
interface RoleMaps {
  PROVIDER: RoleOutcome[];
  SPONSOR: RoleOutcome[];
  CAPTAIN: RoleOutcome[];
}

interface EventDraft {
  userId: string;
  role: Role;
  sourceType: string;
  sourceId: string;
  eventKind: string;
  severityCode: SeverityCode;
  counterpartyUserId: string | null;
  workType: "BOUNTY" | "PROJECT" | "PARENT_WORK";
  workId: string;
  amountMinor: number;
  complexity: number;
  occurredAt: Date;
  meta: Record<string, unknown>;
}

function sourceOf(workKey: string): { type: string; id: string } {
  const [type, ...rest] = workKey.split(":");
  return { type, id: rest.join(":") };
}

/** Build the complete expected event set for one member from the facts. */
const DAY_MS = 86_400_000;

async function draftsFromFacts(
  userId: string,
  outcomes: RoleMaps,
  adjudications: Adjudication[],
  lapseKeys: Set<string>,
  asOf: Date,
  sql: Sql,
): Promise<EventDraft[]> {
  const drafts: EventDraft[] = [];
  const roleOf = (r: Role): RoleOutcome[] =>
    r === "PROVIDER" ? outcomes.PROVIDER : r === "SPONSOR" ? outcomes.SPONSOR : outcomes.CAPTAIN;
  for (const role of ["PROVIDER", "SPONSOR", "CAPTAIN"] as const) {
    for (const o of roleOf(role)) {
      const src = sourceOf(o.workKey);
      if (src.type === "BOUNTY" || src.type === "PROJECT" || src.type === "PARENT_WORK") {
        if (o.severity === "NORMAL") {
          drafts.push({
            userId,
            role,
            sourceType: src.type,
            sourceId: src.id,
            eventKind: "CLEAN_COMPLETION",
            severityCode: "NORMAL",
            counterpartyUserId: o.counterpartyUserId,
            workType: src.type,
            workId: src.id,
            amountMinor: o.amountMinor,
            complexity: o.complexity,
            occurredAt: new Date(asOf.getTime() - o.occurredDaysAgo * DAY_MS),
            meta: { timelinessY: o.timelinessY, stewardshipY: o.stewardshipY, childOutcomeY: o.childOutcomeY },
          });
        }
      }
    }
  }
  // Sponsor funding lapses from the deterministic §24.1 rule.
  for (const o of outcomes.SPONSOR) {
    if (o.severity !== "NORMAL" && lapseKeys.has(o.workKey)) {
      const src = sourceOf(o.workKey);
      drafts.push({
        userId,
        role: "SPONSOR",
        sourceType: "funding_lapse",
        sourceId: src.id,
        eventKind: "ATTRIBUTABLE_CANCELLATION",
        severityCode: "ATTRIBUTABLE_CANCELLATION",
        counterpartyUserId: o.counterpartyUserId,
        workType: "PROJECT",
        workId: src.id,
        amountMinor: o.amountMinor,
        complexity: o.complexity,
        occurredAt: new Date(asOf.getTime() - o.occurredDaysAgo * DAY_MS),
        meta: {},
      });
    }
  }
  // Final adjudications: one event per (dispute, user, role) target.
  for (const a of adjudications) {
    const complexity = await workComplexity(sql, a.workType, a.workId);
    for (const target of a.targets) {
      drafts.push({
        userId: target.userId,
        role: target.role,
        sourceType: "dispute_resolution",
        sourceId: a.disputeId,
        eventKind: a.severity,
        severityCode: a.severity,
        counterpartyUserId:
          target.role === "PROVIDER" ? a.sponsorId ?? a.captainId : target.role === "SPONSOR" ? a.providerId : a.sponsorId,
        workType: a.workType,
        workId: a.workId,
        amountMinor: a.amountMinor,
        complexity,
        occurredAt: new Date(asOf.getTime() - a.ageDays * DAY_MS),
        meta: { resolutionCode: a.resolutionCode, share: target.share },
      });
    }
  }
  return drafts;
}

/** Resolution of one projection run. */
export interface ProjectionResult {
  userId: string;
  created: number;
  reversed: number;
  valid: number;
  apply: boolean;
}

/**
 * Project (and optionally apply) trust events for one member. `apply: false`
 * is a fully hermetic dry-run — no writes; `apply: true` inserts missing
 * events and appends REVERSAL rows for events state no longer supports.
 */
export async function projectUserTrustEvents(
  userId: string,
  opts: { apply?: boolean } = {},
): Promise<ProjectionResult> {
  const sql = await getSql();
  const asOf = new Date();
  const facts = await collectTrustFacts(userId, asOf);
  const lapseKeys = new Set<string>();
  for (const outcome of facts.sponsor.outcomes) {
    if (outcome.severity !== "NORMAL") lapseKeys.add(outcome.workKey);
  }
  const drafts = await draftsFromFacts(userId, {
    PROVIDER: facts.provider.outcomes,
    SPONSOR: facts.sponsor.outcomes,
    CAPTAIN: facts.captain.outcomes,
  }, facts.adjudications, lapseKeys, asOf, sql);
  const keyOf = (sourceType: string, sourceId: string, role: Role, kind: string): string =>
    `${sourceType}:${sourceId}:${userId}:${role}:${kind}`;
  const expected = new Map<string, EventDraft>();
  for (const d of drafts) {
    expected.set(`${d.sourceType}:${d.sourceId}:${d.userId}:${d.role}:${d.eventKind}`, d);
  }
  const existing = facts.events.filter((e) => e.eventKind !== "REVERSAL");
  const reversedIds = new Set(
    facts.events.filter((e) => e.eventKind === "REVERSAL").map((e) => e.sourceId),
  );
  // A reversal shadow that targets an id whose (source, kind) is stale is
  // itself recorded against the event id; a key already reversed never comes
  // back from state alone (only an audited correction can).
  const existingKeys = new Map<string, KnownEvent>();
  for (const e of existing) {
    existingKeys.set(`${e.sourceType}:${e.sourceId}:${e.userId}:${e.role}:${e.eventKind}`, e);
  }
  let created = 0;
  let reversedCount = 0;
  let valid = 0;
  if (opts.apply) {
    await sql.transaction(async (tx) => {
      for (const [key, draft] of expected) {
        if (existingKeys.has(key)) {
          valid += 1;
          continue;
        }
        await tx.query(
          `insert into trust_events
             (id, user_id, role, product, work_type, work_id, counterparty_user_id,
              event_kind, severity_code, amount_minor, currency, complexity_raw,
              complexity_version, source_type, source_id, occurred_at, meta)
           values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'INR',$11,$12,$13,$14,$15,$16::jsonb)`,
          [
            makeId("tev_"),
            draft.userId,
            draft.role,
            (await workProduct(tx, draft.workType, draft.workId)) ?? "bidthrone",
            draft.workType,
            draft.workId,
            draft.counterpartyUserId,
            draft.eventKind,
            draft.severityCode,
            draft.amountMinor,
            draft.complexity,
            COMPLEXITY_VERSION,
            draft.sourceType,
            draft.sourceId,
            draft.occurredAt.toISOString(),
            JSON.stringify(draft.meta),
          ],
        );
        created += 1;
      }
      for (const [key, e] of existingKeys) {
        if (expected.has(key)) continue;
        if (reversedIds.has(e.id)) continue;
        await tx.query(
          `insert into trust_events
             (id, user_id, role, product, work_type, work_id, event_kind,
              source_type, source_id, occurred_at, reverses_event_id, meta)
           values ($1,$2,$3,'bidthrone','BOUNTY',$4,'REVERSAL','reversal',$5,$6,$7,$8::jsonb)`,
          [
            makeId("tev_"),
            e.userId,
            e.role,
            e.sourceId,
            e.id,
            asOf.toISOString(),
            JSON.stringify({ reason: "state_no_longer_supports_event", staleKey: key }),
          ],
        );
        reversedCount += 1;
      }
    });
  } else {
    for (const [key] of expected) {
      if (existingKeys.has(key)) {
        valid += 1;
      } else {
        created += 1;
      }
    }
    for (const [key, e] of existingKeys) {
      if (!expected.has(key) && !reversedIds.has(e.id)) reversedCount += 1;
    }
  }
  return { userId, created, reversed: reversedCount, valid, apply: Boolean(opts.apply) };
}

/** Rebuild projection for every active member (the --apply script driver). */
export async function projectAllUsers(limit = 5000): Promise<ProjectionResult[]> {
  const sql = await getSql();
  const users = await sql.query<{ id: string }>(
    `select u.id from users u
     where u.banned = false and u."banExpires" is null
     order by u.created_at asc limit $1`,
    [limit],
  );
  const results: ProjectionResult[] = [];
  for (const u of users) {
    results.push(await projectUserTrustEvents(u.id, { apply: true }));
  }
  return results;
}

/** The owning product of a work item (for trust_events.product). */
async function workProduct(sql: Sql, workType: string, workId: string): Promise<string | null> {
  const table = workType === "BOUNTY" ? "bounties" : workType === "PROJECT" ? "projects" : "parent_works";
  const rows = await sql.query<{ product: string }>(
    `select product from ${table} where id = $1`,
    [workId],
  );
  return rows[0]?.product ?? null;
}
