import { getSql, type Sql } from "@/lib/db.server";
import { makeId } from "@/lib/ids";

/**
 * Notifications (Phase 01, FR-10). In-app is authoritative. Email is NOT sent
 * here — email is adapter-gated (mail.ts) and only wired for flows where a
 * provider is configured; this module records the in-app row (the durable,
 * honest notification) for every trigger on the FR-10 list.
 */

export type NotificationType =
  | "application_accepted"
  | "application_rejected"
  | "proposal_received"
  | "proposal_selected"
  | "funding_verified"
  | "deadline_approaching"
  | "submission_received"
  | "winner_selected"
  | "milestone_accepted"
  | "milestone_rejected"
  | "dispute_update"
  | "payout_state"
  | "review_requested";

export type NotificationInput = {
  userId: string;
  type: NotificationType;
  title: string;
  body?: string;
  entityType?: string;
  entityId?: string;
  link?: string;
};

/** Insert one notification (inside the caller's transaction when given). */
export async function notify(tx: Sql, input: NotificationInput): Promise<string> {
  const id = makeId("ntf_");
  await tx.query(
    `insert into notifications (id, user_id, type, title, body, entity_type, entity_id, link)
     values ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [
      id,
      input.userId,
      input.type,
      input.title.slice(0, 200),
      (input.body ?? "").slice(0, 1000),
      input.entityType ?? null,
      input.entityId ?? null,
      input.link ?? null,
    ],
  );
  return id;
}

/** Convenience: notify with its own transaction (non-money paths). */
export async function notifyStandalone(input: NotificationInput): Promise<void> {
  const sql = await getSql();
  await notify(sql, input);
}

export type NotificationView = {
  id: string;
  type: string;
  title: string;
  body: string;
  link: string | null;
  read: boolean;
  createdAt: string;
};

/** The caller's notifications, newest first (authorization is the caller's). */
export async function listNotifications(
  userId: string,
  limit = 50,
): Promise<NotificationView[]> {
  const sql = await getSql();
  const rows = await sql.query<{
    id: string; type: string; title: string; body: string;
    link: string | null; read_at: string | null; created_at: string;
  }>(
    "select id, type, title, body, link, read_at, created_at from notifications where user_id = $1 order by created_at desc limit $2",
    [userId, limit],
  );
  return rows.map((r) => ({
      id: r.id,
      type: r.type,
      title: r.title,
      body: r.body,
      link: r.link,
    read: r.read_at != null,
    createdAt: r.created_at,
  }));
}

export async function markNotificationRead(
  userId: string,
  notificationId: string,
): Promise<boolean> {
  const sql = await getSql();
  const res = await sql.query<{ id: string }>(
    "update notifications set read_at = now() where id = $1 and user_id = $2 and read_at is null returning id",
    [notificationId, userId],
  );
  return res.length > 0;
}