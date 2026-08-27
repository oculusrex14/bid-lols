import { getSql, type Sql } from "@/lib/db.server";
import { makeId } from "@/lib/ids";
import { AuthzError } from "@/lib/authz";
import { notify } from "@/lib/marketplace/notifications.server";

/**
 * Disputes (Phase 01, FR-9) — a MANUAL workflow. No AI adjudication. Money
 * resolutions (settle / partial / refund / cancel) happen ONLY in the admin
 * layer with an audit row; this module records the case, its counterparties
 * (derived from verified relationships, never named by the client), and the
 * state transitions.
 */

export type DisputeStatus = "OPEN" | "UNDER_REVIEW" | "RESOLVED" | "CLOSED";

const DISPUTE_TRANSITIONS: Record<DisputeStatus, DisputeStatus[]> = {
  OPEN: ["UNDER_REVIEW", "RESOLVED", "CLOSED"],
  UNDER_REVIEW: ["RESOLVED", "CLOSED"],
  RESOLVED: ["CLOSED"],
  CLOSED: [],
};

/** The verified respondent for a dispute, by work type and claimant. */
async function resolveRespondent(
  tx: Sql,
  opts: { workType: "BOUNTY" | "PROJECT"; workId: string; claimantUserId: string },
): Promise<{ respondentUserId: string }> {
  if (opts.workType === "BOUNTY") {
    const bounty = (
      await tx.query<{ sponsor_user_id: string }>(
        "select sponsor_user_id from bounties where id = $1",
        [opts.workId],
      )
    )[0];
    if (!bounty) throw new AuthzError(404, "not_found", "Bounty not found.");
    if (bounty.sponsor_user_id === opts.claimantUserId) {
      // sponsor disputes the winning builder
      const winner = (
        await tx.query<{ user_id: string }>(
          "select user_id from bounty_awards where bounty_id = $1 and place = 1",
          [opts.workId],
        )
      )[0];
      if (!winner) throw new AuthzError(422, "no_respondent", "No awarded builder to dispute with yet.");
      return { respondentUserId: winner.user_id };
    }
    const participant = (
      await tx.query<{ n: number }>(
        "select count(*)::int as n from bounty_participants where bounty_id = $1 and user_id = $2 and status in ('APPROVED','WORK_STARTED','SUBMITTED')",
        [opts.workId, opts.claimantUserId],
      )
    )[0];
    if ((participant?.n ?? 0) === 0) {
      throw new AuthzError(403, "forbidden", "Only active participants or the sponsor can open a dispute.");
    }
    return { respondentUserId: bounty.sponsor_user_id };
  }

  const project = (
    await tx.query<{ sponsor_user_id: string; selected_proposal_id: string | null }>(
      "select sponsor_user_id, selected_proposal_id from projects where id = $1",
      [opts.workId],
    )
  )[0];
  if (!project) throw new AuthzError(404, "not_found", "Project not found.");
  const provider = project.selected_proposal_id
    ? (
        await tx.query<{ provider_user_id: string }>(
          "select provider_user_id from project_proposals where id = $1",
          [project.selected_proposal_id],
        )
      )[0]
    : undefined;
  if (project.sponsor_user_id === opts.claimantUserId) {
    if (!provider) throw new AuthzError(422, "no_respondent", "No selected provider to dispute with.");
    return { respondentUserId: provider.provider_user_id };
  }
  if (provider && provider.provider_user_id === opts.claimantUserId) {
    return { respondentUserId: project.sponsor_user_id };
  }
  throw new AuthzError(403, "forbidden", "Only the sponsor or the selected provider can open a dispute.");
}

export type OpenDisputeInput = {
  workType: "BOUNTY" | "PROJECT";
  workId: string;
  claimantUserId: string;
  reason: string;
  evidenceLinks?: string[];
  disputedAmountMinor?: number;
};

export async function openDispute(
  input: OpenDisputeInput,
): Promise<{ id: string }> {
  const sql = await getSql();
  return sql.transaction(async (tx) => {
    const { respondentUserId } = await resolveRespondent(tx, {
      workType: input.workType,
      workId: input.workId,
      claimantUserId: input.claimantUserId,
    });
    const id = makeId("dsp_");
    await tx.query(
      `insert into disputes
        (id, work_type, work_id, claimant_user_id, respondent_user_id, reason,
         evidence_links, disputed_amount_minor, currency)
       values ($1,$2,$3,$4,$5,$6,$7::jsonb,$8,'INR')`,
      [
        id,
        input.workType,
        input.workId,
        input.claimantUserId,
        respondentUserId,
        input.reason.slice(0, 4000),
        JSON.stringify(input.evidenceLinks ?? []),
        input.disputedAmountMinor ?? null,
      ],
    );
    await notify(tx, {
      userId: respondentUserId,
      type: "dispute_update",
      title: "A dispute was opened",
      body: "A marketplace counterparty opened a dispute. An admin will review it.",
      entityType: "DISPUTE",
      entityId: id,
    });
    return { id };
  });
}

/** Admin transitions (the admin module performs the authorization + audit). */
export async function transitionDispute(opts: {
  disputeId: string;
  nextStatus: DisputeStatus;
  resolution?: string;
  adminUserId: string;
}): Promise<{ ok: true } | { ok: false; code: string; message: string }> {
  const sql = await getSql();
  return sql.transaction(async (tx) => {
    const current = (
      await tx.query<{ status: DisputeStatus; claimant_user_id: string; respondent_user_id: string }>(
        "select status, claimant_user_id, respondent_user_id from disputes where id = $1 for update",
        [opts.disputeId],
      )
    )[0];
    if (!current) return { ok: false, code: "not_found", message: "Dispute not found." };
    if (!(DISPUTE_TRANSITIONS[current.status] ?? []).includes(opts.nextStatus)) {
      return {
        ok: false,
        code: "invalid_transition",
        message: `${current.status} -> ${opts.nextStatus} is illegal.`,
      };
    }
    await tx.query(
      `update disputes set status=$2, resolution=coalesce($3, resolution),
         resolved_by=$4, updated_at=now()
       where id=$1`,
      [opts.disputeId, opts.nextStatus, opts.resolution ?? null, opts.adminUserId],
    );
    for (const party of [current.claimant_user_id, current.respondent_user_id]) {
      await notify(tx, {
        userId: party,
        type: "dispute_update",
        title: `Dispute ${opts.nextStatus.toLowerCase()}`,
        body: opts.resolution ?? "",
        entityType: "DISPUTE",
        entityId: opts.disputeId,
      });
    }
    return { ok: true };
  });
}

export type DisputeQueueItem = {
  id: string; work_type: string; work_id: string; status: DisputeStatus;
  claimant_user_id: string; respondent_user_id: string; reason: string;
  disputed_amount_minor: number | null; currency: string; created_at: string;
  claimant_email: string | null; respondent_email: string | null;
};

/** Open disputes for the admin queue (oldest first). */
export async function listOpenDisputes(limit = 50): Promise<DisputeQueueItem[]> {
  const sql = await getSql();
  return sql.query<DisputeQueueItem>(
    `select d.*, u1.email as claimant_email, u2.email as respondent_email
     from disputes d
     left join users u1 on u1.id = d.claimant_user_id
     left join users u2 on u2.id = d.respondent_user_id
     where d.status in ('OPEN','UNDER_REVIEW')
     order by d.created_at asc limit $1`,
    [limit],
  );
}