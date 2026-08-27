/**
 * Marketplace state machines (Phase 01, FR-4/FR-5) — PURE definitions.
 *
 * The maps below are the single authority for allowed transitions; the DB
 * enforces them with conditional updates (`update … where status = $expected`)
 * and this module owns the vocabulary. Exhaustive unit tests in
 * state.test.ts fail on any map mutation, so an accidental weakening of a
 * rule is a test failure, not a production surprise.
 */

export const BOUNTY_STATES = [
  "DRAFT",
  "AWAITING_FUNDING",
  "OPEN",
  "APPLICATION_CLOSED",
  "SUBMISSION",
  "JUDGING",
  "AWARDED",
  "SETTLING",
  "COMPLETED",
  "CANCELLED",
  "EXPIRED",
  "DISPUTED",
] as const;
export type BountyState = (typeof BOUNTY_STATES)[number];

export const PROJECT_STATES = [
  "DRAFT",
  "OPEN_FOR_PROPOSALS",
  "PROPOSAL_SELECTED",
  "AWAITING_FUNDING",
  "ACTIVE",
  "MILESTONE_REVIEW",
  "COMPLETION_REVIEW",
  "COMPLETED",
  "CANCELLED",
  "DISPUTED",
] as const;
export type ProjectState = (typeof PROJECT_STATES)[number];

export const APPLICATION_STATES = ["PENDING", "APPROVED", "REJECTED", "WITHDRAWN"] as const;
export type ApplicationState = (typeof APPLICATION_STATES)[number];

export const PARTICIPANT_STATES = [
  "APPROVED",
  "WORK_STARTED",
  "SUBMITTED",
  "WITHDRAWN",
  "DISQUALIFIED",
] as const;
export type ParticipantState = (typeof PARTICIPANT_STATES)[number];

export const MILESTONE_STATES = [
  "PENDING",
  "ACTIVE",
  "SUBMITTED_FOR_REVIEW",
  "APPROVED",
  "REJECTED",
  "PAID_OUT",
] as const;
export type MilestoneState = (typeof MILESTONE_STATES)[number];

export const REWARD_STRUCTURES = ["WINNER_TAKES_ALL", "PODIUM", "FINALIST_POOL"] as const;
export type RewardStructure = (typeof REWARD_STRUCTURES)[number];

/** Allowed bounty transitions. Anything not listed is illegal. */
export const BOUNTY_TRANSITIONS: Record<BountyState, BountyState[]> = {
  DRAFT: ["AWAITING_FUNDING", "CANCELLED"],
  // funding verified (webhook/provider check) -> OPEN (published)
  AWAITING_FUNDING: ["OPEN", "CANCELLED"],
  OPEN: ["APPLICATION_CLOSED", "SUBMISSION", "EXPIRED", "CANCELLED", "DISPUTED"],
  APPLICATION_CLOSED: ["SUBMISSION", "EXPIRED", "CANCELLED", "DISPUTED"],
  SUBMISSION: ["JUDGING", "EXPIRED", "DISPUTED"],
  JUDGING: ["AWARDED", "SUBMISSION", "DISPUTED"],
  AWARDED: ["SETTLING", "DISPUTED"],
  SETTLING: ["COMPLETED", "DISPUTED"],
  COMPLETED: [],
  // Cancellation policy (FR-4): CANCELLED is only reachable from pre-work
  // states; after work begins the path is DISPUTED -> admin resolution.
  CANCELLED: [],
  EXPIRED: [],
  DISPUTED: ["SETTLING", "COMPLETED", "CANCELLED", "AWARDED"],
};

/** Project transitions. */
export const PROJECT_TRANSITIONS: Record<ProjectState, ProjectState[]> = {
  DRAFT: ["OPEN_FOR_PROPOSALS", "CANCELLED"],
  OPEN_FOR_PROPOSALS: ["PROPOSAL_SELECTED", "CANCELLED"],
  PROPOSAL_SELECTED: ["AWAITING_FUNDING", "OPEN_FOR_PROPOSALS", "CANCELLED"],
  AWAITING_FUNDING: ["ACTIVE", "CANCELLED"],
  ACTIVE: ["MILESTONE_REVIEW", "COMPLETION_REVIEW", "DISPUTED"],
  MILESTONE_REVIEW: ["ACTIVE", "COMPLETION_REVIEW", "DISPUTED"],
  COMPLETION_REVIEW: ["COMPLETED", "MILESTONE_REVIEW", "DISPUTED"],
  COMPLETED: [],
  CANCELLED: [],
  DISPUTED: ["ACTIVE", "COMPLETION_REVIEW", "CANCELLED"],
};

/** Participant lifecycle (separate from the bounty's own state). */
export const PARTICIPANT_TRANSITIONS: Record<ParticipantState, ParticipantState[]> = {
  APPROVED: ["WORK_STARTED", "WITHDRAWN", "DISQUALIFIED"],
  WORK_STARTED: ["SUBMITTED", "WITHDRAWN", "DISQUALIFIED"],
  SUBMITTED: ["DISQUALIFIED"],
  WITHDRAWN: [],
  DISQUALIFIED: [],
};

export const MILESTONE_TRANSITIONS: Record<MilestoneState, MilestoneState[]> = {
  PENDING: ["ACTIVE", "REJECTED"],
  ACTIVE: ["SUBMITTED_FOR_REVIEW", "REJECTED"],
  SUBMITTED_FOR_REVIEW: ["APPROVED", "REJECTED", "ACTIVE"],
  APPROVED: ["PAID_OUT"],
  REJECTED: ["ACTIVE"],
  PAID_OUT: [],
};

export function canTransition<S extends string>(
  map: Record<S, S[]>,
  from: S,
  to: S,
): boolean {
  return (map[from] ?? []).includes(from === to ? ("" as S) : to) && from !== to;
}

export function assertTransition<S extends string>(
  map: Record<S, S[]>,
  entity: string,
  from: S,
  to: S,
): void {
  if (!canTransition(map, from, to)) {
    throw new Error(`illegal ${entity} transition: ${from} -> ${to}`);
  }
}

/**
 * Cancellation fairness (FR-4): a sponsor may self-cancel only while no
 * approved participant has started work. After work begins, cancellation is
 * an admin-mediated dispute resolution — never a silent sponsor action.
 */
export function sponsorMaySelfCancel(
  bountyStatus: BountyState,
  workStarted: boolean,
): boolean {
  if (workStarted) return false;
  return ["DRAFT", "AWAITING_FUNDING", "OPEN", "APPLICATION_CLOSED"].includes(bountyStatus);
}

/**
 * Derive the bounty's milestone-style progress state from its own state +
 * clock (lazy EXPIRED transition, FR-4): past the submission deadline with no
 * judging means EXPIRED. Pure so both services and tests can use it.
 */
export function effectiveBountyStatus(
  status: BountyState,
  now: Date,
  submissionDeadline: Date | null,
  submissionCount: number,
): BountyState {
  if (
    submissionDeadline &&
    now > submissionDeadline &&
    submissionCount === 0 &&
    ["OPEN", "APPLICATION_CLOSED", "SUBMISSION"].includes(status)
  ) {
    return "EXPIRED";
  }
  return status;
}

/**
 * Reward allocation validation: the advertised allocations must sum EXACTLY
 * to the funded reward pool, and each structure has shape rules.
 */
export type RewardAllocation = { place: number; amountMinor: number; label?: string };

export function validateRewardAllocations(
  structure: RewardStructure,
  rewardTotalMinor: number,
  allocations: RewardAllocation[],
): { ok: true } | { ok: false; reason: string } {
  if (!Number.isInteger(rewardTotalMinor) || rewardTotalMinor <= 0) {
    return { ok: false, reason: "reward_total_minor must be a positive integer" };
  }
  const sum = allocations.reduce((a, b) => a + b.amountMinor, 0);
  if (sum !== rewardTotalMinor) {
    return {
      ok: false,
      reason: `allocations sum ${sum} != advertised reward ${rewardTotalMinor}`,
    };
  }
  const places = allocations.map((a) => a.place).sort((a, b) => a - b);
  if (new Set(places).size !== places.length) {
    return { ok: false, reason: "duplicate places in reward allocations" };
  }
  for (let i = 0; i < places.length; i += 1) {
    if (places[i] !== i + 1) {
      return { ok: false, reason: "places must be 1..n with no gaps" };
    }
  }
  if (structure === "WINNER_TAKES_ALL" && allocations.length !== 1) {
    return { ok: false, reason: "WINNER_TAKES_ALL has exactly one allocation" };
  }
  if (structure === "PODIUM" && (allocations.length < 1 || allocations.length > 3)) {
    return { ok: false, reason: "PODIUM has 1–3 places" };
  }
  if (structure === "FINALIST_POOL" && allocations.length < 2) {
    return { ok: false, reason: "FINALIST_POOL needs a winner premium plus participation rewards" };
  }
  return { ok: true };
}