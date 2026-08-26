import type { SiteId } from "@/lib/sites";

export type Listing = {
  id: string;
  site: SiteId;
  url: string;
  title: string;
  tagline: string;
  team: string;
  socials: string[];
  /** Culturebid key values / “why join us” points. Empty on other boards. */
  values: string[];
  bidCents: number;
  rank: number | null;
  clicks: number;
  swapCount: number;
  lastBidAt: string;
  createdAt: string;
};

export type Activity = {
  id: string;
  site: SiteId;
  listingId: string | null;
  kind: "bid" | "rebid" | "swap" | "click";
  amountCents: number | null;
  rankTo: number | null;
  title: string;
  createdAt: string;
};

export type BoardStats = {
  count: number;
  poolCents: number;
  clicks: number;
  visitsToday: number;
  totalViews: number;
};

export type BoardPayload = {
  listings: Listing[];
  stats: BoardStats;
  activity: Activity[];
};

export type OrderKind = "bid" | "swap" | "oracle";

export type PublicOrder = {
  id: string;
  site: SiteId;
  kind: OrderKind;
  amountCents: number;
  status: "pending" | "paid" | "failed" | "expired";
  title: string;
  url: string;
  chargeLabel: string;
  listingId: string | null;
  paymentSessionId: string;
  gateway: "cashfree";
  gatewayLive: boolean;
  gatewayMode: "sandbox" | "production";
  /** Cashfree India charge in whole rupees (board bid stays USD). */
  inrRupees: number;
  inrPerUsd: number;
  fxSource: "live" | "fallback";
  /** Set only for `oracle` orders: when the pass is/was active. */
  passExpiresAt?: string | null;
};

export type CrownCandidate = {
  id: string;
  rank: number | null;
  title: string;
  url: string;
  bidCents: number;
  pickCount: number;
  picked: boolean;
  isLeader: boolean;
};

export type CrownLeader = {
  handle: string;
  points: number;
  wins: number;
  streak: number;
  isOracle: boolean;
  isYou: boolean;
};

export type CrownMe = {
  token: string;
  handle: string;
  points: number;
  wins: number;
  streak: number;
  bestStreak: number;
  picks: string[];
  hasPass: boolean;
  passExpiresAt: string | null;
  pickLimit: number;
};

export type CrownPayload = {
  site: SiteId;
  /** UTC day key the active round is named after. */
  roundDay: string;
  closesAt: string;
  candidates: CrownCandidate[];
  me: CrownMe;
  leaderboard: CrownLeader[];
  lastResult: {
    roundDay: string;
    winnerId: string | null;
    winnerTitle: string | null;
    youWon: boolean;
  } | null;
};
