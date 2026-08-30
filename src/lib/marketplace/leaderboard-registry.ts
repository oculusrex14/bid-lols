/**
 * The ONE leaderboard registry (RC5 §5.5). Board identity lives here and
 * nowhere else: the serverFn validator, the server dispatch, the navigation
 * and selector lists, the page titles/descriptions, and the metric
 * formatting all derive from this array. No duplicate board lists.
 *
 * Client-safe by construction (no SQL, no server imports): it is imported
 * by the reputation serverFn module, the /leaderboards route, and the
 * bidthrone home preview alike.
 *
 * Taxonomy (RC4 §3/§56 + RC5 §23.12): the Bid Index boards rank the
 * PERSONAL 300-900 trust model (BI-1.0). "Most Reliable" ranks the
 * provider RELIABILITY PILLAR (0..1) and is never displayed as a 300-900
 * number. Market Rates (aggregate pricing) is a separate product and has no
 * board here.
 */

export type BoardKey =
  | "most_experience"
  | "most_wins"
  | "most_complete"
  | "top_captains"
  | "top_sponsors"
  | "most_quality"
  | "most_reliable"
  | "rising"
  | "highest_bid_index"
  | "top_providers_bid_index"
  | "top_sponsors_bid_index"
  | "top_captains_bid_index";

/** facts = verifiable marketplace counters; bidindex = the personal trust
 *  score; reliability = the 0..1 provider reliability pillar. */
export type BoardFamily = "facts" | "bidindex" | "reliability";

export type BoardRole = "PROVIDER" | "SPONSOR" | "CAPTAIN" | "OVERALL";

export interface BoardSpec {
  key: BoardKey;
  /** Display title on the page. */
  title: string;
  family: BoardFamily;
  /** What the board ranks by, in one short phrase (metric column header). */
  metric: string;
  /** The minimum evidence a member must have to appear (public copy). */
  minimumEvidence: string;
  /** Optional trust-layer role (bidindex + reliability families). */
  role?: BoardRole;
  /** How one row's own metric value reads. `outcomes` = verified outcomes. */
  format: (metric: number, outcomes: number) => string;
  /** One-paragraph board explanation (the "methodology" line). */
  explanation: string;
}

const SCORE_BOARD_FLOOR =
  "Score-eligible members only: confidence 0.45 or higher, at least 5 effective independent outcomes, and 3 or more unrelated counterparties.";

export const BOARD_REGISTRY: readonly BoardSpec[] = [
  {
    key: "most_experience",
    title: "Most experience",
    family: "facts",
    metric: "Verified completions",
    minimumEvidence: "At least 1 verified completion",
    format: (m, o) => `${m} verified`,
    explanation:
      "Verified completions across the network: bounties won, projects completed, teams captained.",
  },
  {
    key: "most_wins",
    title: "Most bounty wins",
    family: "facts",
    metric: "First-place awards",
    minimumEvidence: "At least 1 verified completion",
    format: (m, o) => `${m} win${m === 1 ? "" : "s"}`,
    explanation: "Members with the most first-place awards.",
  },
  {
    key: "most_complete",
    title: "Most completed",
    family: "facts",
    metric: "Projects completed",
    minimumEvidence: "At least 1 verified completion",
    format: (m, o) => `${m} project${m === 1 ? "" : "s"}`,
    explanation: "Projects carried to completion.",
  },
  {
    key: "top_captains",
    title: "Top captains",
    family: "facts",
    metric: "Captained completions",
    minimumEvidence: "At least 1 captained completion",
    format: (m, o) => `${m} captained`,
    explanation: "Team projects captained to completion.",
  },
  {
    key: "top_sponsors",
    title: "Top sponsors",
    family: "facts",
    metric: "Funded completions",
    minimumEvidence: "At least 1 funded completion",
    format: (m, o) => `${m} funded completion${m === 1 ? "" : "s"}`,
    explanation:
      "Sponsors with the most funded, completed work on the network.",
  },
  {
    key: "most_quality",
    title: "Highest rated",
    family: "facts",
    metric: "Average review quality",
    minimumEvidence: "At least 3 reviews",
    format: (m, o) => `quality ${m.toFixed(2)} avg`,
    explanation:
      "Average review quality from completed work. Requires at least three reviews to appear.",
  },
  {
    key: "most_reliable",
    title: "Most reliable",
    family: "reliability",
    metric: "Reliability pillar",
    minimumEvidence:
      "Provider role score-eligible, at least 5 effective outcomes, and 3 or more unrelated counterparties",
    role: "PROVIDER",
    format: (m, o) =>
      `Reliability ${Math.round(m * 100)}% · ${o} verified outcome${o === 1 ? "" : "s"}`,
    explanation:
      "Providers ranked by the BI-1.0 reliability estimate, a Bayesian estimate derived from weighted verified provider outcomes. It is shown as a percentage but is not the literal percentage of jobs completed clean. This is NOT a 300-900 Bid Index number. The board requires full provider score eligibility, so it is empty until providers establish history.",
  },
  {
    key: "rising",
    title: "Rising",
    family: "facts",
    metric: "Completions in 90 days",
    minimumEvidence: "At least 1 verified completion",
    format: (m, o) => `${m} in 90 days`,
    explanation: "Verified completions in the last 90 days.",
  },
  {
    key: "highest_bid_index",
    title: "Highest Bid Index",
    family: "bidindex",
    metric: "Overall Bid Index",
    minimumEvidence: SCORE_BOARD_FLOOR,
    role: "OVERALL",
    format: (m, o) => `Bid Index ${Math.round(m)} · model BI-1.0`,
    explanation:
      "Overall Bid Index leaders. " +
      SCORE_BOARD_FLOOR,
  },
  {
    key: "top_providers_bid_index",
    title: "Top Provider Index",
    family: "bidindex",
    metric: "Provider Bid Index",
    minimumEvidence: SCORE_BOARD_FLOOR,
    role: "PROVIDER",
    format: (m, o) => `Bid Index ${Math.round(m)} · model BI-1.0`,
    explanation:
      "Providers by personal Bid Index. " +
      SCORE_BOARD_FLOOR,
  },
  {
    key: "top_sponsors_bid_index",
    title: "Top Sponsor Index",
    family: "bidindex",
    metric: "Sponsor Bid Index",
    minimumEvidence: SCORE_BOARD_FLOOR,
    role: "SPONSOR",
    format: (m, o) => `Bid Index ${Math.round(m)} · model BI-1.0`,
    explanation:
      "Sponsors by personal Bid Index. " +
      SCORE_BOARD_FLOOR,
  },
  {
    key: "top_captains_bid_index",
    title: "Top Captain Index",
    family: "bidindex",
    metric: "Captain Bid Index",
    minimumEvidence: SCORE_BOARD_FLOOR,
    role: "CAPTAIN",
    format: (m, o) => `Bid Index ${Math.round(m)} · model BI-1.0`,
    explanation:
      "Captains by personal Bid Index. " +
      SCORE_BOARD_FLOOR,
  },
];

/** Derived, single-source key list (used by the serverFn validator). */
export const BOARD_KEYS: readonly BoardKey[] = BOARD_REGISTRY.map((b) => b.key);

/** Look up one board; undefined = unknown key (callers 400/empty, never guess). */
export function boardSpec(key: string): BoardSpec | undefined {
  return BOARD_REGISTRY.find((b) => b.key === key);
}

/** The boards shown on the bidthrone home (presentation choice, real data). */
export const HOME_PREVIEW_BOARDS: readonly BoardKey[] = [
  "most_wins",
  "top_captains",
  "rising",
];
