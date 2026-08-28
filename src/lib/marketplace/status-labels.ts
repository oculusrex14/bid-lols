/**
 * Human labels for marketplace status enums (RC3, S-31). One semantic
 * status treatment across the network: raw DB values stay in the data,
 * humans see words. Unknown values fall back to a de-scoped raw word
 * (never an empty string, never a promise) so a new enum value can never
 * render as a blank badge.
 *
 * Client-safe pure module (no server imports).
 */
const LABELS: Record<string, string> = {
  // bounties
  DRAFT: "Draft",
  AWAITING_FUNDING: "Awaiting funding",
  OPEN: "Open",
  APPLICATION_CLOSED: "Applications closed",
  SUBMISSION: "Submissions open",
  JUDGING: "In judging",
  AWARDED: "Awarded",
  SETTLING: "Settling",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  EXPIRED: "Expired",
  DISPUTED: "Disputed",
  // projects
  OPEN_FOR_PROPOSALS: "Open for proposals",
  PROPOSAL_SELECTED: "Provider selected",
  ACTIVE: "Active",
  MILESTONE_REVIEW: "Milestone review",
  COMPLETION_REVIEW: "Completion review",
  // applications
  PENDING: "Pending",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  WITHDRAWN: "Withdrawn",
  // participants
  WORK_STARTED: "Work started",
  SUBMITTED: "Submitted",
  DISQUALIFIED: "Disqualified",
  // submissions
  UNDER_REVIEW: "In review",
  FINALIST: "Finalist",
  WINNER: "Winner",
  NOT_SELECTED: "Not selected",
  // proposals
  SHORTLISTED: "Shortlisted",
  SELECTED: "Selected",
  // milestones
  OBLIGATION_CREATED: "Obligation created",
  SETTLED: "Settled",
  FAILED: "Failed",
  // disputes / funding
  RESOLVED: "Resolved",
  CLOSED: "Closed",
  REVIEWED: "Reviewed",
  ACTIONED: "Actioned",
  DISMISSED: "Dismissed",
  // graveyard listings
  LISTED: "Listed",
  UNDER_OFFER: "Under offer",
  TRANSFERRED: "Transferred",
  // graveyard offers
  ACCEPTED: "Accepted",
  // parent works
  FUNDED: "Funded",
  COMPLETING: "Completing",
};

export function statusLabel(raw: string | null | undefined): string {
  if (!raw) return "Unknown";
  const hit = LABELS[raw];
  if (hit) return hit;
  // De-scope unknown enum values: "SOMETHING_NEW" -> "Something New".
  return raw
    .replace(/_/g, " ")
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
