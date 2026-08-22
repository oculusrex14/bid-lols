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

export type OrderKind = "bid" | "swap";

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
};
