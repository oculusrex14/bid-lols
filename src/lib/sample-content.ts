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
 */

export interface SampleFlag {
  example: true;
}

export type SampleObject<T> = T & SampleFlag;

/** FoundersBid hero work ticket (RC5 §20.4). */
export const FOUNDERS_WORK_TICKET_EXAMPLE: SampleObject<{
  title: string;
  category: string;
  duration: string;
  rewardMinor: number;
  currency: string;
  slotsTaken: number;
  slotsCap: number;
  note: string;
}> = {
  example: true,
  title: "Cut onboarding drop-off for a B2B SaaS",
  category: "Development",
  duration: "3 weeks",
  rewardMinor: 8_500_000,
  currency: "INR",
  slotsTaken: 0,
  slotsCap: 5,
  note: "Example work. Not a live bounty.",
};

/** CultureBid hero brief poster (RC5 §21.2). */
export const CULTURE_BRIEF_EXAMPLE: SampleObject<{
  title: string;
  support: string;
  rewardMinor: number;
  currency: string;
  slotsTaken: number;
  slotsCap: number;
  licenseLine: string;
  media: string;
  note: string;
}> = {
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
};

/** CultureBid sample brief wall (RC5 §21.5). Every tile is EXAMPLE. */
export const CULTURE_SAMPLE_WALL: Array<SampleObject<{
  category: string;
  title: string;
  support: string;
  rewardMinor: number;
  currency: string;
  slotsTaken: number;
  slotsCap: number;
  licenseLine: string;
  media: string;
}>> = [
  {
    example: true,
    category: "UGC",
    title: "Twenty authentic unboxing clips",
    support: "Real hands, real moments, zero polish.",
    rewardMinor: 20_000_00,
    currency: "INR",
    slotsTaken: 0,
    slotsCap: 3,
    licenseLine: "Paid amplification · 60 days",
    media: "/sample-media/culture/ugc.svg",
  },
  {
    example: true,
    category: "Photography",
    title: "Daylight product set for a ceramics studio",
    support: "Natural light, quiet backgrounds, tactile detail.",
    rewardMinor: 35_000_00,
    currency: "INR",
    slotsTaken: 0,
    slotsCap: 2,
    licenseLine: "Exclusive license · 180 days",
    media: "/sample-media/culture/photography.svg",
  },
  {
    example: true,
    category: "Naming",
    title: "A name for a small-batch cold brew brand",
    support: "Short, ownable, and it works on a bottle.",
    rewardMinor: 25_000_00,
    currency: "INR",
    slotsTaken: 0,
    slotsCap: 1,
    licenseLine: "Full rights · Perpetual",
    media: "/sample-media/culture/naming.svg",
  },
  {
    example: true,
    category: "Music",
    title: "A signature loop for a podcast intro",
    support: "Warm, minimal, and recognisable in three seconds.",
    rewardMinor: 30_000_00,
    currency: "INR",
    slotsTaken: 0,
    slotsCap: 2,
    licenseLine: "Paid amplification · 90 days",
    media: "/sample-media/culture/music.svg",
  },
];

/**
 * Bidception sample allocation tree (RC5 §22.5). The amounts must reconcile
 * exactly: total = captain + every child allocation + reserve. A test pins
 * this invariant so a future edit cannot break the money story.
 */
export const BIDCEPTION_SAMPLE_TREE: SampleObject<{
  title: string;
  currency: string;
  totalMinor: number;
  captainLabel: string;
  captainMinor: number;
  children: Array<{ key: string; label: string; minor: number }>;
  reserveMinor: number;
  note: string;
}> = {
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
};

/**
 * Bidthrone sample record (RC5 §23.4-23.8). Deliberately NOT a plausible
 * person: no invented name, the Bid Index is NR (never a fabricated
 * number), and the fact counters are zero. The whole card is labelled
 * SAMPLE RECORD / NOT A REAL MEMBER.
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
