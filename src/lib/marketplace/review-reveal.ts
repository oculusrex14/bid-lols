/**
 * Blind reciprocal review reveal (RC4 §26/§49). ONE definition of reveal
 * eligibility — the public review listing and the Bid Index scoring input
 * both consume these helpers, so a hidden reciprocal review cannot leak
 * through one path while the other gates it.
 *
 * Rule: after completed work, neither side sees the counterparty's review
 * for that same transaction until either
 *   A. both sides have submitted, or
 *   B. 14 days have passed from the FIRST submission in the pair.
 * Reviews are immutable after creation (admin data-correction is a separate,
 * audited process), so nobody can wait for the counterparty's rating and
 * then retaliate.
 */

/** §26.B: the reveal window in days. */
export const REVEAL_WINDOW_DAYS = 14;

const DAY_MS = 24 * 60 * 60 * 1000;

export type RevealDecision =
  | { revealed: true; reason: "both_submitted" | "window_elapsed" }
  | { revealed: false; revealsAt: string };

/**
 * Decide whether a review becomes visible. `mineCreatedAt` is the review in
 * question; `otherCreatedAt` is the counterparty's review of the same work
 * (null while only one side has submitted). `now` comes from the caller so
 * the logic is testable and deterministic.
 */
export function revealState(
  mineCreatedAt: Date | string,
  otherCreatedAt: Date | string | null,
  now: Date,
): RevealDecision {
  const mine = new Date(mineCreatedAt).getTime();
  if (Number.isNaN(mine)) {
    return { revealed: false, revealsAt: "" }; // malformed dates never reveal
  }
  if (otherCreatedAt != null) {
    const other = new Date(otherCreatedAt).getTime();
    if (!Number.isNaN(other)) {
      return { revealed: true, reason: "both_submitted" };
    }
  }
  const windowAt = mine + REVEAL_WINDOW_DAYS * DAY_MS;
  if (now.getTime() >= windowAt) {
    return { revealed: true, reason: "window_elapsed" };
  }
  return { revealed: false, revealsAt: new Date(windowAt).toISOString() };
}

/**
 * The SQL twin of `revealState` for the public listing query: the
 * counterparty review exists (same work, opposite pair) OR the reveal
 * window has elapsed. Public listing and scoring share the same rule; the
 * hermetic integration test pins the two implementations together.
 */
export function revealSqlCondition(): string {
  return `(
    exists (
      select 1 from reviews other
      where other.work_type = r.work_type
        and other.work_id = r.work_id
        and other.reviewer_user_id = r.reviewee_user_id
        and other.reviewee_user_id = r.reviewer_user_id
    )
    or r.created_at <= now() - interval '${REVEAL_WINDOW_DAYS} days'
  )`;
}