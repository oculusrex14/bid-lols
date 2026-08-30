import { getSql } from "@/lib/db.server";
import type { SupportedCurrency } from "@/lib/money";
import { boardSpec, type BoardKey, type BoardSpec } from "./leaderboard-registry";

/**
 * Bidthrone FACTUAL read model (Phase 04, FR-2/FR-3/FR-4). RC4 §10/§55: the
 * old headline composite (experience + 10*reliability + 10*quality) is
 * RETIRED — the headline number is the BI-1.0 Bid Index from the trust
 * layer. This module stays as the verifiable factual counters (wins,
 * completions, captained units, review means, dispute counts) for the
 * public profile's factual block.
 */

export type ReputationMetrics = {
  userId: string;
  // Interpretable dimensions
  experience: number; // verified completions (bounty wins + project + captured child completions)
  reliability: number; // 0..1 completion ratio (completions / started)
  quality: number; // mean review rating 0..5 (0 when none)
  recentActivity: number; // completions in the trailing 90 days
  // Underlying facts (shown on the profile, all independently verifiable)
  bountyWins: number;
  projectCompletions: number;
  captainedCompletions: number;
  reviewsReceived: number;
  disputesAsClaimant: number;
  disputesAsRespondent: number;
};

/** Mean of a list of 1..5 ratings; 0 when empty. */
function meanRatings(ratings: number[]): number {
  if (ratings.length === 0) return 0;
  return ratings.reduce((a, b) => a + b, 0) / ratings.length;
}

export async function reputationFor(userId: string): Promise<ReputationMetrics> {
  const sql = await getSql();
  const [wins, projects, captained, reviews, disputes, recent] = await Promise.all([
    sql.query<{ n: number }>(
      "select count(*)::int as n from bounty_awards where user_id = $1 and place = 1",
      [userId],
    ),
    sql.query<{ n: number }>(
      `select count(*)::int as n from projects p
       join project_proposals pp on pp.id = p.selected_proposal_id
       where pp.provider_user_id = $1 and p.status = 'COMPLETED'`,
      [userId],
    ),
    sql.query<{ n: number }>(
      "select count(*)::int as n from reputation_events where user_id = $1 and kind = 'captained_completion'",
      [userId],
    ),
    sql.query<{ rating: number }>(
      `select ((coalesce(quality,0)+coalesce(communication,0)+coalesce(timeliness,0)+coalesce(clarity,0))*1.0)
         / nullif((case when quality is null then 0 else 1 end + case when communication is null then 0 else 1 end
                   + case when timeliness is null then 0 else 1 end + case when clarity is null then 0 else 1 end), 0) as rating
       from reviews where reviewee_user_id = $1`,
      [userId],
    ),
    sql.query<{ claimant: number; respondent: number }>(
      `select
         (select count(*)::int from disputes where claimant_user_id = $1) as claimant,
         (select count(*)::int from disputes where respondent_user_id = $1) as respondent`,
      [userId],
    ),
    sql.query<{ n: number }>(
      `select (
         (select count(*)::int from bounty_awards
           where user_id = $1 and place = 1 and awarded_at > now() - interval '90 days')
       + (select count(*)::int from projects p
           join project_proposals pp on pp.id = p.selected_proposal_id
           where pp.provider_user_id = $1 and p.status = 'COMPLETED'
             and p.completed_at > now() - interval '90 days')
       + (select count(*)::int from reputation_events
           where user_id = $1 and kind = 'captained_completion'
             and created_at > now() - interval '90 days')
       )::int as n`,
      [userId],
    ),
  ]);

  const bountyWins = wins[0]?.n ?? 0;
  const projectCompletions = projects[0]?.n ?? 0;
  const captainedCompletions = captained[0]?.n ?? 0;
  const reviewsReceived = reviews.length;
  const disputesAsClaimant = disputes[0]?.claimant ?? 0;
  const disputesAsRespondent = disputes[0]?.respondent ?? 0;
  const recentActivity = recent[0]?.n ?? 0;

  const quality = meanRatings(reviews.map((r) => Number(r.rating) || 0));
  const experience = bountyWins + projectCompletions + captainedCompletions;
  // Reliability: a defensible completion ratio. Absent a per-member "started"
  // counter in the ledger, use (completions) vs (completions + open disputes
  // where they are the provider/respondent) as the denominator — disputes are
  // the only negative signal that is itself verifiable. This keeps it honest
  // and in [0..1].
  // RC4: the old composite score is retired; the public headline number is
  // the BI-1.0 Bid Index (trust layer). These remain verifiable facts.
  const negative = disputesAsRespondent;
  const reliability = experience + negative === 0 ? 0 : experience / (experience + negative);
  return {
    userId,
    experience,
    reliability,
    quality,
    recentActivity,
    bountyWins,
    projectCompletions,
    captainedCompletions,
    reviewsReceived,
    disputesAsClaimant,
    disputesAsRespondent,
  };
}

/**
 * A leaderboard row. Only members with at least `minSample` verified
 * completions are ranked — below that the board is "new network" and the
 * caller shows the honest empty state instead of padding it with noise.
 */
export type LeaderboardRow = {
  userId: string;
  handle: string | null;
  displayName: string | null;
  /** The board's own metric value (what the board ranks by). */
  metric: number;
  /** Derived only for context; the rank uses `metric`. */
  experience: number;
  /** RC4 §55: the old headline composite was retired. Score boards carry
   * the real BI-1.0 number in `metric` instead. */
  skills: string[];
};

/**
 * RC5 §5.5: the board identity (names, titles, families, metrics, floors)
 * lives in ONE typed registry (leaderboard-registry.ts). This module only
 * dispatches; there is no second board array here.
 */
export type { BoardKey };

/** Minimum verified outcomes before a member may appear on ANY board. */
export const LEADERBOARD_MIN_SAMPLE = 1;
/** Minimum reviews for the quality board. */
export const QUALITY_MIN_REVIEWS = 3;

type UserFacts = {
  userId: string;
  handle: string | null;
  displayName: string | null;
  skills: string[];
  experience: number;
  wins: number;
  projectCompletions: number;
  captained: number;
  reviewsReceived: number;
  quality: number;
  recent90: number;
  sponsorCompleted: number;
  sponsorReviews: number;
};

async function loadFacts(): Promise<UserFacts[]> {
  const sql = await getSql();
  // One candidate set + one bulk aggregation pass. Every number here comes
  // from the authoritative tables; nothing is stored or guessed.
  const rows = await sql.query<{
    user_id: string;
    handle: string | null;
    display_name: string | null;
    skills: string[] | null;
    wins: number;
    project_completions: number;
    captained: number;
    reviews_received: number;
    quality: number | null;
    recent90: number;
    sponsor_completed: number;
    sponsor_reviews: number;
  }>(
    `with candidates as (
       select u.id, pr.handle, u.display_name, pr.skills
       from users u left join profiles pr on pr.user_id = u.id
       where u.status = 'active' and u.banned = false
     )
     select c.id as user_id, c.handle, c.display_name, c.skills as skills,
       (select count(*)::int from bounty_awards where user_id = c.id and place = 1) as wins,
       (select count(*)::int from projects p
          join project_proposals pp on pp.id = p.selected_proposal_id
         where pp.provider_user_id = c.id and p.status = 'COMPLETED') as project_completions,
       (select count(*)::int from reputation_events
          where user_id = c.id and kind = 'captained_completion') as captained,
       (select count(*)::int from reviews where reviewee_user_id = c.id) as reviews_received,
       (select avg((coalesce(quality,0)+coalesce(communication,0)+coalesce(timeliness,0)+coalesce(clarity,0))*1.0
            / nullif((case when quality is null then 0 else 1 end + case when communication is null then 0 else 1 end
                      + case when timeliness is null then 0 else 1 end + case when clarity is null then 0 else 1 end), 0))
         from reviews where reviewee_user_id = c.id) as quality,
       (
         (select count(*)::int from bounty_awards
            where user_id = c.id and place = 1 and awarded_at > now() - interval '90 days')
       + (select count(*)::int from projects p
            join project_proposals pp on pp.id = p.selected_proposal_id
           where pp.provider_user_id = c.id and p.status = 'COMPLETED'
             and p.completed_at > now() - interval '90 days')
       + (select count(*)::int from reputation_events
            where user_id = c.id and kind = 'captained_completion'
              and created_at > now() - interval '90 days')
       )::int as recent90,
       ((select count(*)::int from bounties b
          where b.sponsor_user_id = c.id and b.status in ('AWARDED','SETTLING','COMPLETED'))
       + (select count(*)::int from projects p
            where p.sponsor_user_id = c.id and p.status = 'COMPLETED')) as sponsor_completed,
       (select count(*)::int from reviews r
          where r.reviewee_user_id = c.id and r.direction = 'PROVIDER_TO_SPONSOR') as sponsor_reviews
     from candidates c`,
  );
  return rows.map((r) => {
    const wins = r.wins ?? 0;
    const projectCompletions = r.project_completions ?? 0;
    const captained = r.captained ?? 0;
    const experience = wins + projectCompletions + captained;
    // Reliability uses verifiable facts only: completions vs completions +
    // disputes where the member is the respondent (their work was disputed).
    const quality = r.quality == null ? 0 : Number(r.quality);
    return {
      userId: r.user_id,
      handle: r.handle,
      displayName: r.display_name,
      skills: Array.isArray(r.skills) ? r.skills.slice(0, 3) : [],
      experience,
      wins,
      projectCompletions,
      captained,
      reviewsReceived: r.reviews_received ?? 0,
      quality,
      recent90: r.recent90 ?? 0,
      sponsorCompleted: r.sponsor_completed ?? 0,
      sponsorReviews: r.sponsor_reviews ?? 0,
    };
  });
}

/**
 * Compute a leaderboard. EVERY board ranks by its own dedicated metric,
 * dispatched through the single registry (RC5 §5.5). Boards are network-wide
 * by design (documented); there is no misleading product parameter. Returns
 * an empty array when nobody meets the sample floor — the UI renders the
 * honest "new network" state. NEVER seeds or fabricates rows.
 */
export async function leaderboard(
  board: BoardKey,
  limit = 10,
  minSample = LEADERBOARD_MIN_SAMPLE,
): Promise<LeaderboardRow[]> {
  const spec = boardSpec(board);
  if (!spec) throw new Error(`unknown leaderboard board: ${board}`);
  if (spec.family === "bidindex") return bidIndexBoard(spec, limit);
  if (spec.family === "reliability") return reliabilityBoard(spec, limit);
  return factsBoard(spec, limit, minSample);
}

/** RC5 §5.6: Most Reliable ranks the BI-1.0 provider RELIABILITY PILLAR
 * (0..1), with the score-board evidence floor. Never the 300-900 number. */
async function reliabilityBoard(spec: BoardSpec, limit: number): Promise<LeaderboardRow[]> {
  void spec; // identity lives in the registry; the pillar + floor are fixed
  const { reliabilityLeaderboard } = await import("@/lib/trust/score.server");
  const rows = await reliabilityLeaderboard(limit);
  return rows.map((r) => factRow(r.userId, r.handle, r.displayName, r.reliability, r.primaryOutcomes));
}

/** The personal 300-900 Bid Index boards (role or overall). */
async function bidIndexBoard(spec: BoardSpec, limit: number): Promise<LeaderboardRow[]> {
  const { bidIndexLeaderboard, bidIndexLeaderboardOverall } = await import("@/lib/trust/score.server");
  const rows =
    spec.role === "OVERALL"
      ? await bidIndexLeaderboardOverall(limit)
      : await bidIndexLeaderboard(spec.role as "PROVIDER" | "SPONSOR" | "CAPTAIN", limit);
  return rows.map((r) => factRow(r.userId, r.handle, r.displayName, r.score, r.primaryOutcomes));
}

function factRow(
  userId: string,
  handle: string | null,
  displayName: string | null,
  metric: number,
  outcomes: number,
): LeaderboardRow {
  return { userId, handle, displayName, metric, experience: outcomes, skills: [] };
}

/** The factual counter boards, all from the one bulk loadFacts() pass. */
async function factsBoard(
  spec: BoardSpec,
  limit: number,
  minSample: number,
): Promise<LeaderboardRow[]> {
  const facts = await loadFacts();
  const rows = facts
    .filter((f) => {
      switch (spec.key) {
        case "most_quality":
          return f.reviewsReceived >= QUALITY_MIN_REVIEWS;
        case "top_captains":
          return f.captained >= 1;
        case "top_sponsors":
          return f.sponsorCompleted >= 1;
        default:
          return f.experience >= minSample;
      }
    })
    .map((f) => {
      // the metric each board is named for
      let metric = f.experience;
      switch (spec.key) {
        case "most_wins":
          metric = f.wins;
          break;
        case "most_complete":
          metric = f.projectCompletions;
          break;
        case "most_quality":
          metric = f.quality;
          break;
        case "rising":
          metric = f.recent90;
          break;
        case "top_captains":
          metric = f.captained;
          break;
        case "top_sponsors":
          metric = f.sponsorCompleted;
          break;
        case "most_experience":
        default:
          metric = f.experience;
      }
      return {
        userId: f.userId,
        handle: f.handle,
        displayName: f.displayName,
        skills: f.skills,
        metric,
        experience: f.experience,
      };
    })
    // stable tie-breaks: metric desc, then experience desc, then handle asc
    .sort((a, b) => b.metric - a.metric || b.experience - a.experience || String(a.handle ?? "").localeCompare(String(b.handle ?? "")));
  return rows.slice(0, limit);
}


/**
 * Market Rates sample (RC4 §3/§56; renamed from "Bid Index"). Aggregates
 * REAL verified money amounts for a product+category+CURRENCY and publishes
 * ONLY when the sample meets the threshold (10). A sample is a genuine
 * completed/settled outcome — created/unfunded or awarded-but-unsettled
 * work never counts. Never exposes individual deals; only anonymized
 * aggregates with the sample size disclosed.
 *
 * RC5.1 WS10: currency is part of the aggregate identity. Every query
 * filters `currency = $requested`; a ₹50,000 and a $1,000 can never enter
 * the same sorted amount array.
 */
export type MarketRateSample = {
  /** null = network-wide sample. */
  product: string | null;
  category: string;
  currency: SupportedCurrency;
  sampleSize: number;
  minMinor: number | null;
  medianMinor: number | null;
  maxMinor: number | null;
  sufficient: boolean;
};

export const MARKET_RATE_MIN_SAMPLE = 10;

/**
 * `product` null = network-wide aggregation (the Bidthrone surface, which
 * hosts no bounties of its own). A product key keeps the RC1 R9
 * product/category isolation for engine tests. `currency` is REQUIRED —
 * there is no default, so a mixed-currency aggregate is impossible by
 * construction.
 */
export async function marketRateFor(
  product: string | null,
  category: string,
  currency: SupportedCurrency,
  threshold = MARKET_RATE_MIN_SAMPLE,
): Promise<MarketRateSample> {
  const sql = await getSql();
  // verified = completed/settled outcomes only (RC1, R9): a merely-created or
  // unfunded opportunity is not a price point; awarded-but-unsettled work is
  // not yet a verified transaction either.
  const bounties = await sql.query<{ amount: number }>(
    product
      ? "select reward_total_minor::bigint as amount from bounties where product = $1 and category = $2 and currency = $3 and status in ('COMPLETED')"
      : "select reward_total_minor::bigint as amount from bounties where category = $1 and currency = $2 and status in ('COMPLETED')",
    product ? [product, category, currency] : [category, currency],
  );
  const projects = await sql.query<{ amount: number }>(
    product
      ? "select coalesce(selected_quoted_minor,0)::bigint as amount from projects where product = $1 and category = $2 and currency = $3 and status in ('COMPLETED') and selected_quoted_minor is not null"
      : "select coalesce(selected_quoted_minor,0)::bigint as amount from projects where category = $1 and currency = $2 and status in ('COMPLETED') and selected_quoted_minor is not null",
    product ? [product, category, currency] : [category, currency],
  );
  const amounts = [
    ...bounties.map((b) => Number(b.amount)),
    ...projects.map((p) => Number(p.amount)),
  ]
    .filter((a) => a > 0)
    .sort((a, b) => a - b);
  const sampleSize = amounts.length;
  const sufficient = sampleSize >= threshold;
  if (!sufficient) {
    return { product, category, currency, sampleSize, minMinor: null, medianMinor: null, maxMinor: null, sufficient };
  }
  // Median: odd sample -> middle; even -> mean of the two middles, rounded to
  // the nearest minor unit (half-up). Documented in the phase spec.
  let medianMinor: number;
  if (sampleSize % 2 === 1) {
    medianMinor = amounts[(sampleSize - 1) / 2];
  } else {
    const a = amounts[sampleSize / 2 - 1];
    const b = amounts[sampleSize / 2];
    medianMinor = Math.floor((a + b + 1) / 2);
  }
  return {
    product,
    category,
    currency,
    sampleSize,
    minMinor: amounts[0],
    medianMinor,
    maxMinor: amounts[sampleSize - 1],
    sufficient,
  };
}
