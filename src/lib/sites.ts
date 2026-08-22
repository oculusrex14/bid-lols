/** Three boards under bidthrone.lol. `site` is the board key (not a separate board_type). */
export const SITE_IDS = ["founders", "culture", "bidception"] as const;
export type SiteId = (typeof SITE_IDS)[number];

export function isSiteId(value: string | undefined): value is SiteId {
  return value === "founders" || value === "culture" || value === "bidception";
}

export function otherSites(site: SiteId): SiteId[] {
  return SITE_IDS.filter((id) => id !== site);
}

export const PORTAL = {
  name: "Bidthrone",
  domain: "bidthrone.lol",
  url: "https://bidthrone.lol/",
  wordmark: "bidthrone",
} as const;

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

export type SiteConfig = {
  id: SiteId;
  domain: string;
  name: string;
  wordmark: string;
  tagline: string;
  /** One line on the bidthrone portal card. */
  portalLine: string;
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
  claimHeadline: string;
  claimDeck: string;
};

export const SITES: Record<SiteId, SiteConfig> = {
  founders: {
    id: "founders",
    domain: "foundersbid.lol",
    name: "Foundersbid",
    wordmark: "foundersbid",
    tagline: "Pay to prove the founding team. Build trust. Rank higher.",
    portalLine: "Trust the founding team",
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
    claimHeadline: "Claim #1",
    claimDeck: "Put the founding team on the first line of the board.",
  },
  culture: {
    id: "culture",
    domain: "culturebid.lol",
    name: "Culturebid",
    wordmark: "culturebid",
    tagline: "Rank your culture. Attract the people who matter.",
    portalLine: "Rank your culture. Attract the people who matter.",
    kicker: "Careers pages · culture · why join us",
    description:
      "Companies bid to showcase their culture, team, and why join us — so the best talent finds them first.",
    subject: "company culture",
    urlLabel: "Careers / culture page URL",
    urlHint: "The careers, team, or culture page talent should open.",
    titleLabel: "Company name",
    titleHint: "How the company should read on the talent board.",
    taglineLabel: "Short culture statement",
    extraLabel: "Employee / founder quote (optional)",
    extraHint: "One sentence from someone who works there.",
    extraPlaceholder: "We ship on Fridays and still make dinner.",
    cta: "Bid the culture",
    visit: "Visit culture page",
    emptyBoard: "No culture pages on the board yet. Five dollars puts you first.",
    emptyActivity: "Quiet. The next culture bid lands here.",
    claimHeadline: "Claim #1",
    claimDeck: "Put the culture page on the first line of the board.",
  },
  bidception: {
    id: "bidception",
    domain: "bidception.lol",
    name: "Bidception",
    wordmark: "bidception",
    tagline: "Find where else to spend your marketing budget.",
    portalLine: "Discover other marketing platforms",
    kicker: "Marketing platforms · directories · visibility tools",
    description:
      "A discovery board for marketing platforms, directories, pay-to-rank tools, newsletter sponsorships, and community boards. Have leftover budget after foundersbid or culturebid? Find the next place to run the same strategy.",
    subject: "marketing platform",
    urlLabel: "Platform URL",
    urlHint: "The marketing platform, directory, or visibility tool.",
    titleLabel: "Platform name",
    titleHint: "How the platform should read on the discovery board.",
    taglineLabel: "One-line pitch",
    extraLabel: "What it is",
    extraHint: "Directory, newsletter board, pay-to-rank, ads network.",
    extraPlaceholder: "Newsletter sponsorship marketplace",
    cta: "List a platform",
    visit: "Open platform",
    emptyBoard: "No marketing platforms listed. Five dollars puts the first tool first.",
    emptyActivity: "Quiet. The next platform bid lands here.",
    claimHeadline: "Take the top slot",
    claimDeck: "The board for marketing platforms. Highest bid stands first.",
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
