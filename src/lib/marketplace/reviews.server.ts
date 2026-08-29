import { getSql, type Sql } from "@/lib/db.server";
import { makeId } from "@/lib/ids";
import { AuthzError } from "@/lib/authz";
import { notify } from "@/lib/marketplace/notifications.server";

/**
 * Reviews + reputation seeds (Phase 01, FR-8). Reviews exist ONLY for
 * genuinely completed work; both directions; unique per reviewer per work;
 * never a self-review. Reputation events are append-only verified outcomes
 * that Phase 04 consumes. No public ranking is computed in Phase 01.
 */

export type WorkType = "BOUNTY" | "PROJECT";
export type ReviewDirection = "SPONSOR_TO_PROVIDER" | "PROVIDER_TO_SPONSOR";

/**
 * The review gate: the work must exist AND be COMPLETED, the reviewer must be
 * a genuine counterparty, and the reviewee is derived from the verified
 * relationship (never named by the client). Returns the reviewee's user id.
 */
export async function resolveReviewParties(
  tx: Sql,
  opts: { workType: WorkType; workId: string; reviewerUserId: string; direction: ReviewDirection },
): Promise<{ revieweeUserId: string }> {
  if (opts.workType === "BOUNTY") {
    const bounty = (
      await tx.query<{ status: string; sponsor_user_id: string }>(
        "select status, sponsor_user_id from bounties where id = $1",
        [opts.workId],
      )
    )[0];
    if (!bounty) throw new AuthzError(404, "not_found", "Bounty not found.");
    if (bounty.status !== "COMPLETED") {
      throw new AuthzError(403, "work_not_completed", "Reviews open only after the work completes.");
    }
    const winner = (
      await tx.query<{ user_id: string }>(
        "select user_id from bounty_awards where bounty_id = $1 and place = 1",
        [opts.workId],
      )
    )[0];
    if (!winner) throw new AuthzError(422, "no_winner", "No awarded winner to review yet.");
    if (opts.direction === "SPONSOR_TO_PROVIDER") {
      if (bounty.sponsor_user_id !== opts.reviewerUserId) {
        throw new AuthzError(403, "forbidden", "Only the sponsor reviews the winning builder.");
      }
      return { revieweeUserId: winner.user_id };
    }
    if (winner.user_id !== opts.reviewerUserId) {
      throw new AuthzError(403, "forbidden", "Only the awarded builder reviews the sponsor.");
    }
    return { revieweeUserId: bounty.sponsor_user_id };
  }

  const project = (
    await tx.query<{
      status: string;
      sponsor_user_id: string;
      selected_proposal_id: string | null;
    }>("select status, sponsor_user_id, selected_proposal_id from projects where id = $1", [
      opts.workId,
    ])
  )[0];
  if (!project) throw new AuthzError(404, "not_found", "Project not found.");
  if (project.status !== "COMPLETED") {
    throw new AuthzError(403, "work_not_completed", "Reviews unlock when the project completes.");
  }
  const provider = (
    await tx.query<{ provider_user_id: string }>(
      "select provider_user_id from project_proposals where id = $1",
      [project.selected_proposal_id],
    )
  )[0];
  if (!provider) throw new AuthzError(422, "no_provider", "No selected provider to review.");
  if (opts.direction === "SPONSOR_TO_PROVIDER") {
    if (project.sponsor_user_id !== opts.reviewerUserId) {
      throw new AuthzError(403, "forbidden", "Only the sponsor reviews the provider.");
    }
    return { revieweeUserId: provider.provider_user_id };
  }
  if (provider.provider_user_id !== opts.reviewerUserId) {
    throw new AuthzError(403, "forbidden", "Only the selected provider reviews the sponsor.");
  }
  return { revieweeUserId: project.sponsor_user_id };
}

export type CreateReviewInput = {
  workType: WorkType;
  workId: string;
  reviewerUserId: string;
  direction: ReviewDirection;
  quality?: number;
  communication?: number;
  timeliness?: number;
  clarity?: number;
  /** RC4 §42: extra nullable dimensions. Missing is NOT zero. */
  value?: number;
  fairness?: number;
  body?: string;
};

export async function createReview(input: CreateReviewInput): Promise<{ id: string; revieweeUserId: string }> {
  const sql = await getSql();
  return sql.transaction(
    async (tx): Promise<{ id: string; revieweeUserId: string }> => {
      const { revieweeUserId } = await resolveReviewParties(tx, {
        workType: input.workType,
        workId: input.workId,
        reviewerUserId: input.reviewerUserId,
        direction: input.direction,
      });
      if (revieweeUserId === input.reviewerUserId) {
        throw new AuthzError(422, "self_review", "You cannot review yourself.");
      }
      const id = makeId("rev_");
      await tx.query(
        `insert into reviews
          (id, work_type, work_id, reviewer_user_id, reviewee_user_id, direction,
           quality, communication, timeliness, clarity, value, fairness, body)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
        [
          id,
          input.workType,
          input.workId,
          input.reviewerUserId,
          revieweeUserId,
          input.direction,
          input.quality ?? null,
          input.communication ?? null,
          input.timeliness ?? null,
          input.clarity ?? null,
          input.value ?? null,
          input.fairness ?? null,
          (input.body ?? "").slice(0, 4000),
        ],
      );
      await tx.query(
        `insert into reputation_events (id, user_id, kind, work_type, work_id, counterparty_user_id, meta)
         values ($1,$2,'review_received',$3,$4,$5,$6::jsonb)`,
        [
          makeId("rep_"),
          revieweeUserId,
          input.workType,
          input.workId,
          input.reviewerUserId,
          JSON.stringify({ direction: input.direction }),
        ],
      );
      await notify(tx, {
        userId: revieweeUserId,
        type: "review_requested",
        title: "You received a review",
        body: "A marketplace counterparty left you a review.",
        entityType: input.workType,
        entityId: input.workId,
      });
      return { id, revieweeUserId };
    },
  );
}

/**
 * Public reviews for a profile (newest first) — BLIND-GATED (RC4 §26/§49):
 * a review is visible only after reciprocal reveal (both sides submitted OR
 * the 14-day window elapsed). The predicate is the shared reveal condition,
 * mirroring exactly what the Bid Index scoring evidence consumes.
 */
export async function reviewsForUser(
  userId: string,
  limit = 20,
): Promise<Array<{ quality: number | null; communication: number | null; timeliness: number | null; clarity: number | null; value: number | null; fairness: number | null; body: string; createdAt: string; reviewerHandle: string | null }>> {
  const sql = await getSql();
  const { revealSqlCondition } = await import("@/lib/marketplace/review-reveal");
  return sql.query(
    `select r.quality, r.communication, r.timeliness, r.clarity, r.value, r.fairness, r.body,
            r.created_at as "createdAt", pr.handle as "reviewerHandle"
     from reviews r
     left join profiles pr on pr.user_id = r.reviewer_user_id
     where r.reviewee_user_id = $1
       and ${revealSqlCondition()}
     order by r.created_at desc limit $2`,
    [userId, limit],
  );
}

/** Verified-outcome counters for a profile (bidthrone seeds; facts only). */
export async function verifiedOutcomeCounts(
  userId: string,
): Promise<{ bountyWins: number; projectCompletions: number; captainedProjects: number; reviewsAvg: number | null; reviewCount: number }> {
  const sql = await getSql();
  const wins = await sql.query<{ n: number }>(
    "select count(*)::int as n from bounty_awards where user_id = $1 and place = 1",
    [userId],
  );
  const projects = await sql.query<{ n: number }>(
    `select count(*)::int as n from projects p
     join project_proposals pp on pp.id = p.selected_proposal_id
     where pp.provider_user_id = $1 and p.status = 'COMPLETED'`,
    [userId],
  );
  const captained = await sql.query<{ n: number }>(
    "select count(*)::int as n from reputation_events where user_id = $1 and kind = 'captained_completion'",
    [userId],
  );
  const agg = (
    await sql.query<{ avg: number | null; n: number }>(
      `select round(avg((coalesce(quality,0) + coalesce(communication,0) + coalesce(timeliness,0) + coalesce(clarity,0))
         / nullif((case when quality is null then 0 else 1 end + case when communication is null then 0 else 1 end
                    + case when timeliness is null then 0 else 1 end + case when clarity is null then 0 else 1 end), 0)
       )::numeric, 2)::float8 as avg, count(*)::int as n
       from reviews where reviewee_user_id = $1`,
      [userId],
    )
  )[0];
  return {
    bountyWins: wins[0]?.n ?? 0,
    projectCompletions: projects[0]?.n ?? 0,
    captainedProjects: captained[0]?.n ?? 0,
    reviewsAvg: agg?.avg ?? null,
    reviewCount: agg?.n ?? 0,
  };
}