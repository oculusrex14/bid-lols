export const SITE_IDS = ["founders", "bidception"] as const;
export type SiteId = (typeof SITE_IDS)[number];

export function isSiteId(value: string | undefined): value is SiteId {
  return value === "founders" || value === "bidception";
}

export const MIN_BID_DOLLARS = 5;
export const SWAP_MIN_DOLLARS = 10;
export const SWAP_MAX_DOLLARS = 2500;
export const TOP_SWAP_CAP = 50;
export const TOP_SWAP_LIFETIME = 3;

export function baseSwapRate(bidCents: number) {
  const dollars = bidCents / 100;
  if (dollars < 100) return 0.1;
  if (dollars < 1000) return 0.15;
  if (dollars < 5000) return 0.2;
  return 0.25;
}

export function swapRateFor(rank: number | null, nextSwapNumber: number, bidCents: number) {
  const base = baseSwapRate(bidCents);
  if (rank != null && rank <= TOP_SWAP_CAP) {
    if (nextSwapNumber === 2) return 0.35;
    if (nextSwapNumber === 3) return 0.5;
  }
  return base;
}

export type SwapQuote =
  | {
      allowed: true;
      rate: number;
      feeCents: number;
      nextSwapNumber: number;
      remaining: number | null;
      note: string;
    }
  | {
      allowed: false;
      reason: string;
      nextSwapNumber: number;
      remaining: 0;
    };

export function quoteSwapFee(opts: {
  bidCents: number;
  rank: number | null;
  swapCount: number;
}): SwapQuote {
  const nextSwapNumber = opts.swapCount + 1;
  const inTop = opts.rank != null && opts.rank <= TOP_SWAP_CAP;

  if (inTop && nextSwapNumber > TOP_SWAP_LIFETIME) {
    return {
      allowed: false,
      reason:
        "Top 50 listings get three URL swaps for the life of the listing. This one is spent.",
      nextSwapNumber,
      remaining: 0,
    };
  }

  const rate = swapRateFor(opts.rank, nextSwapNumber, opts.bidCents);
  const raw = Math.round((opts.bidCents * rate) / 100) * 100;
  const feeCents = Math.max(
    SWAP_MIN_DOLLARS * 100,
    Math.min(SWAP_MAX_DOLLARS * 100, raw),
  );

  const remaining = inTop ? TOP_SWAP_LIFETIME - nextSwapNumber : null;
  const note = inTop
    ? nextSwapNumber === 1
      ? "First swap at the base rate for this bid."
      : nextSwapNumber === 2
        ? "Second swap is billed at 35% of the current bid."
        : "Final swap is billed at 50% of the current bid."
    : "Rank 51 and below: unlimited swaps at the base rate.";

  return { allowed: true, rate, feeCents, nextSwapNumber, remaining, note };
}

export const SITES: Record<
  SiteId,
  {
    id: SiteId;
    domain: string;
    name: string;
    wordmark: string;
    tagline: string;
    kicker: string;
    description: string;
    subject: string;
    urlLabel: string;
    urlHint: string;
    titleLabel: string;
    titleHint: string;
    taglineLabel: string;
    extraLabel: string;
    extraHint: string;
    extraPlaceholder: string;
    cta: string;
    visit: string;
    emptyBoard: string;
    emptyActivity: string;
  }
> = {
  founders: {
    id: "founders",
    domain: "foundersbid.lol",
    name: "Foundersbid",
    wordmark: "foundersbid",
    tagline: "Pay to prove the founding team. Build trust. Rank higher.",
    kicker: "Portfolios · about pages · founding teams",
    description:
      "A public board where founders buy rank for the pages that prove who they are. Team pages, about pages, personal studios. Trust, priced.",
    subject: "founding team",
    urlLabel: "Page URL",
    urlHint: "Your about page, team page, or personal studio.",
    titleLabel: "Listing title",
    titleHint: "Studio or company name as it should appear on the board.",
    taglineLabel: "One-line proof",
    extraLabel: "Founding team",
    extraHint: "Names only. This sits on the public board.",
    extraPlaceholder: "Amira Chen · Jonas Veld · Priya Shah",
    cta: "Bid the team",
    visit: "Visit page",
    emptyBoard: "No founding teams on the board yet. Five dollars puts you first.",
    emptyActivity: "Quiet. The next bid for a founding team lands here.",
  },
  bidception: {
    id: "bidception",
    domain: "bidception.lol",
    name: "Bidception",
    wordmark: "bidception",
    tagline: "The leaderboard of leaderboards. Outbid the bids.",
    kicker: "Outbid clones · .lol domains · bid platforms",
    description:
      "A meta board where every pay-to-rank site competes for the same slot. Clones, .lol domains, bid rooms. The board that ranks the boards.",
    subject: "bid platform",
    urlLabel: "Platform URL",
    urlHint: "The .lol domain or bid site you want in the ranking.",
    titleLabel: "Board name",
    titleHint: "How the platform should read on the meta board.",
    taglineLabel: "One-line claim",
    extraLabel: "What it is",
    extraHint: "A short public note. No accounts, no emails.",
    extraPlaceholder: "Pay-to-rank board for indie games",
    cta: "Outbid the bids",
    visit: "Open board",
    emptyBoard: "No bid sites listed. Five dollars crowns the first meta leader.",
    emptyActivity: "No movement. A clone will blink first.",
  },
};

export const COPY = {
  bidNow: "Bid now",
  outbid: "Outbid",
  payDifference: "Pay the difference",
  payCashfree: "Pay with Cashfree",
  confirmPay: "Confirm payment",
  swapUrl: "Swap URL",
  copyManage: "Copy manage link",
  copied: "Copied",
  viewRules: "Read the rules",
  viewActivity: "Live feed",
  backToBoard: "Back to the board",
  checkoutDemo: "Sandbox checkout. No real charge in this preview.",
  minBid: "Minimum $5. Whole dollars only.",
  rebidHint: "Re-bidding the same URL only charges the difference.",
};
