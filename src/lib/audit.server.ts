import { getSql, type Sql } from "@/lib/db.server";
import { makeId } from "@/lib/ids";

/**
 * Audit log (mission §AUDIT LOG) — append-only. One row per important action:
 * actor, action, entity, timestamp, metadata. Never log secrets: callers must
 * pass metadata without credential values.
 */

export interface AuditEntry {
  actorUserId?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  meta?: Record<string, unknown>;
}

/** Insert one audit row (inside the caller's transaction when given). */
export async function insertAudit(tx: Sql, entry: AuditEntry): Promise<string> {
  const id = makeId("aev_");
  await tx.query(
    `insert into audit_events (id, actor_user_id, action, entity_type, entity_id, meta)
     values ($1,$2,$3,$4,$5,$6::jsonb)`,
    [
      id,
      entry.actorUserId ?? null,
      entry.action,
      entry.entityType,
      entry.entityId,
      JSON.stringify(entry.meta ?? {}),
    ],
  );
  return id;
}

/** Standalone audit (own transaction) for non-money paths. */
export async function auditStandalone(entry: AuditEntry): Promise<void> {
  const sql = await getSql();
  await insertAudit(sql, entry);
}

export type AuditTrailItem = {
  id: string; action: string; entity_type: string; entity_id: string;
  actor_user_id: string | null; meta: null | Record<string, string | number | boolean | null>; created_at: string;
  actor_email: string | null;
};

/** The recent audit trail for admin inspection. */
export async function recentAudit(limit = 100): Promise<AuditTrailItem[]> {
  const sql = await getSql();
  return sql.query<AuditTrailItem>(
    `select a.id, a.action, a.entity_type, a.entity_id, a.actor_user_id, a.meta,
            a.created_at, u.email as actor_email
     from audit_events a
     left join users u on u.id = a.actor_user_id
     order by a.created_at desc limit $1`,
    [limit],
  );
}