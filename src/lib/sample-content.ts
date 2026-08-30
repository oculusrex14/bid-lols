/**
 * RC5 §12: the example/sample contract. These constants are LABELLED
 * PRESENTATION ONLY — they are never inventory. No sample entity is ever
 * written to users / bounties / projects / parent_works / reviews /
 * reputation_events / trust_events; no sample enters JSON-LD; no sample
 * count feeds a real heading. Every rendered sample carries data-example="true"
 * on its root and the visible text EXAMPLE or SAMPLE.
 *
 * Client-safe by construction (no server imports): consumed by the
 * product-object components and the four homepage compositions.
 *
 * Money is integer minor units exactly like the real rows, and real
 * components render it through MoneyValue — samples never get a special
 * formatter.
 *
 * RC5.1 WS7: samples carry an explicit amount set PER VIEWER DEFAULT
 * CURRENCY (INR for India, USD everywhere else). These are ILLUSTRATIVE
 * LOCAL SAMPLE VALUES, not FX conversions — the two sets are independent
 * product decisions. A sample always renders in the viewer's default
 * currency and keeps its visible EXAMPLE / SAMPLE label; a real record
 * always renders in its OWN persisted currency regardless of the viewer.
 */
import type { SupportedCurrency } from "@/lib/money";

export type SampleFlag = {
  example: true;
};

export type SampleObject<T> = T & SampleFlag;

export type SampleCurrency = SupportedCurrency;

/** FoundersBid hero work ticket (RC5 §20.4). */
type WorkTicketSample = SampleObject<{
  title: string;
  category: string;
  duration: string;
  rewardMinor: number;
  currency: SampleCurrency;
  slotsTaken: number;
  slotsCap: number;
  note: string;
}>;

export const FOUNDERS_WORK_TICKET_EXAMPLES: Record<SampleCurrency, WorkTicketSample> = {
  INR: {
    example: true,
    title: "Cut onboarding drop-off for a B2B SaaS",
    category: "Development",
    duration: "3 weeks",
    rewardMinor: 8_500_000,
    currency: "INR",
    slotsTaken: 0,
    slotsCap: 5,
    note: "Example work. Not a live bounty.",
  },
  USD: {
    example: true,
    title: "Cut onboarding drop-off for a B2B SaaS",
    category: "Development",
    duration: "3 weeks",
    rewardMinor: 100_000,
    currency: "USD",
    slotsTaken: 0,
    slotsCap: 5,
    note: "Example work. Not a live bounty.",
  },
};

/** FoundersBid "sample work" research ticket (RC5 §20.5). */
export const FOUNDERS_RESEARCH_TICKET_EXAMPLES: Record<SampleCurrency, WorkTicketSample> = {
  INR: {
    example: true,
    title: "Teardown of three competitor pricing pages",
    category: "Research",
    duration: "2 weeks",
    rewardMinor: 4_000_000,
    currency: "INR",
    slotsTaken: 0,
    slotsCap: 3,
    note: "Example work. Not a live bounty.",
  },
  USD: {
    example: true,
    title: "Teardown of three competitor pricing pages",
    category: "Research",
    duration: "2 weeks",
    rewardMinor: 50_000,
    currency: "USD",
    slotsTaken: 0,
    slotsCap: 3,
    note: "Example work. Not a live bounty.",
  },
};

/** CultureBid hero brief poster (RC5 §21.2). */
type BriefSample = SampleObject<{
  title: string;
  support: string;
  rewardMinor: number;
  currency: SampleCurrency;
  slotsTaken: number;
  slotsCap: number;
  licenseLine: string;
  media: string;
  note: string;
}>;

export const CULTURE_BRIEF_EXAMPLES: Record<SampleCurrency, BriefSample> = {
  INR: {
    example: true,
    title: "Three 15-second Reels for a skincare launch",
    support: "Natural glow. Real people. Short stories that sell.",
    rewardMinor: 50_000_00,
    currency: "INR",
    slotsTaken: 0,
    slotsCap: 2,
    licenseLine: "Paid amplification · 90 days",
    media: "/sample-media/culture/hero-skincare.svg",
    note: "Example brief. Not live.",
  },
  USD: {
    example: true,
    title: "Three 15-second Reels for a skincare launch",
    support: "Natural glow. Real people. Short stories that sell.",
    rewardMinor: 60_000,
    currency: "USD",
    slotsTaken: 0,
    slotsCap: 2,
    licenseLine: "Paid amplification · 90 days",
    media: "/sample-media/culture/hero-skincare.svg",
    note: "Example brief. Not live.",
  },
};

/**
 * CultureBid sample brief wall (RC5 §21.5). Every tile is EXAMPLE.
 * Illustrative local sample values — NOT FX conversions of the INR set.
 */
export type WallTileSample = SampleObject<{
  category: string;
  title: string;
  support: string;
  rewardMinor: number;
  currency: SampleCurrency;
  slotsTaken: number;
  slotsCap: number;
  licenseLine: string;
  media: string;
}>;

const WALL_TITLES: Array<{ category: string; title: string; support: string; licenseLine: string; media: string; slotsCap: number }> = [
  {
    category: "UGC",
    title: "Twenty authentic unboxing clips",
    support: "Real hands, real moments, zero polish.",
    licenseLine: "Paid amplification · 60 days",
    media: "/sample-media/culture/ugc.svg",
    slotsCap: 3,
  },
  {
    category: "Photography",
    title: "Daylight product set for a ceramics studio",
    support: "Natural light, quiet backgrounds, tactile detail.",
    licenseLine: "Exclusive license · 180 days",
    media: "/sample-media/culture/photography.svg",
    slotsCap: 2,
  },
  {
    category: "Naming",
    title: "A name for a small-batch cold brew brand",
    support: "Short, ownable, and it works on a bottle.",
    licenseLine: "Full rights · Perpetual",
    media: "/sample-media/culture/naming.svg",
    slotsCap: 1,
  },
  {
    category: "Music",
    title: "A signature loop for a podcast intro",
    support: "Warm, minimal, and recognisable in three seconds.",
    licenseLine: "Paid amplification · 90 days",
    media: "/sample-media/culture/music.svg",
    slotsCap: 2,
  },
];

const WALL_REWARDS_INR = [20_000_00, 35_000_00, 25_000_00, 30_000_00];
const WALL_REWARDS_USD = [25_000, 42_500, 30_000, 35_000];

function buildWall(currency: SampleCurrency): WallTileSample[] {
  const rewards = currency === "INR" ? WALL_REWARDS_INR : WALL_REWARDS_USD;
  return WALL_TITLES.map((t, i) => ({
    example: true,
    category: t.category,
    title: t.title,
    support: t.support,
    rewardMinor: rewards[i],
    currency,
    slotsTaken: 0,
    slotsCap: t.slotsCap,
    licenseLine: t.licenseLine,
    media: t.media,
  }));
}

export const CULTURE_SAMPLE_WALLS: Record<SampleCurrency, WallTileSample[]> = {
  INR: buildWall("INR"),
  USD: buildWall("USD"),
};

/**
 * Bidception sample allocation tree (RC5 §22.5). The amounts must reconcile
 * exactly: total = captain + every child allocation + reserve, in EVERY
 * currency. A test pins this invariant so a future edit cannot break the
 * money story. Illustrative local sample values — NOT FX conversions.
 */
export type SampleTree = SampleObject<{
  title: string;
  currency: SampleCurrency;
  totalMinor: number;
  captainLabel: string;
  captainMinor: number;
  children: Array<{ key: string; label: string; minor: number }>;
  reserveMinor: number;
  note: string;
}>;

export const BIDCEPTION_SAMPLE_TREES: Record<SampleCurrency, SampleTree> = {
  INR: {
    example: true,
    title: "Launch a new product site",
    currency: "INR",
    totalMinor: 100_000_00,
    captainLabel: "Captain",
    captainMinor: 10_000_00,
    children: [
      { key: "landing", label: "Landing page", minor: 30_000_00 },
      { key: "video", label: "Demo video", minor: 20_000_00 },
      { key: "outreach", label: "Launch outreach", minor: 25_000_00 },
      { key: "analytics", label: "Post-launch analytics", minor: 15_000_00 },
    ],
    reserveMinor: 0,
    note: "Example allocation. Not a live project.",
  },
  USD: {
    example: true,
    title: "Launch a new product site",
    currency: "USD",
    totalMinor: 120_000,
    captainLabel: "Captain",
    captainMinor: 12_000,
    children: [
      { key: "landing", label: "Landing page", minor: 36_000 },
      { key: "video", label: "Demo video", minor: 24_000 },
      { key: "outreach", label: "Launch outreach", minor: 30_000 },
      { key: "analytics", label: "Post-launch analytics", minor: 18_000 },
    ],
    reserveMinor: 0,
    note: "Example allocation. Not a live project.",
  },
};

/**
 * Bidthrone sample record (RC5 §23.4-23.8). Deliberately NOT a plausible
 * person: no invented name, the Bid Index is NR (never a fabricated
 * number), and the fact counters are zero. The whole card is labelled
 * SAMPLE RECORD / NOT A REAL MEMBER. Currency-free: it shows no money.
 */
export const BIDTHRONE_SAMPLE_RECORD: SampleObject<{
  label: string;
  disclaimer: string;
  name: string;
  handle: string;
  avatarInitials: string;
  bidIndexStatus: "NR";
  bidIndexNote: string;
  modelVersion: string;
  counters: { bountiesWon: number; projectsCompleted: number; teamsCaptained: number };
  reviewSlots: number;
  timelineLabel: string;
}> = {
  example: true,
  label: "SAMPLE RECORD",
  disclaimer: "NOT A REAL MEMBER",
  name: "EXAMPLE MEMBER",
  handle: "example",
  avatarInitials: "EX",
  bidIndexStatus: "NR",
  bidIndexNote: "Not enough history",
  modelVersion: "BI-1.0",
  counters: { bountiesWon: 0, projectsCompleted: 0, teamsCaptained: 0 },
  reviewSlots: 3,
  timelineLabel: "No settled work yet",
};

/* --------------------------------------------------------------------------
 * Accessors: fail visibly on an unknown currency (never assume INR).
 * ------------------------------------------------------------------------ */

function pick<T>(table: Record<SampleCurrency, T>, currency: string): T {
  const c = (currency ?? "").toUpperCase();
  if (c !== "INR" && c !== "USD") {
    throw new Error(`sample-content: unsupported sample currency "${currency}"`);
  }
  return table[c as SampleCurrency];
}

export function foundersWorkTicketExample(currency: string): WorkTicketSample {
  return pick(FOUNDERS_WORK_TICKET_EXAMPLES, currency);
}

export function foundersResearchTicketExample(currency: string): WorkTicketSample {
  return pick(FOUNDERS_RESEARCH_TICKET_EXAMPLES, currency);
}

export function cultureBriefExample(currency: string): BriefSample {
  return pick(CULTURE_BRIEF_EXAMPLES, currency);
}

export function cultureSampleWall(currency: string): WallTileSample[] {
  return pick(CULTURE_SAMPLE_WALLS, currency);
}

export function bidceptionSampleTree(currency: string): SampleTree {
  return pick(BIDCEPTION_SAMPLE_TREES, currency);
}
