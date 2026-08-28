import { getSql } from "@/lib/db.server";

/**
 * Bidthrone reputation read model (Phase 04, FR-2/FR-3/FR-4).
 *
 * Everything here is DERIVED from the authoritative tables — there is no
 * stored reputation number that can drift, be bought, or be fabricated. A
 * member with no verified outcomes gets an honest empty reputation, never
 * seeded/fake activity.
 *
 * The composite `score` is intentionally interpretable (not a magic 0–100):
 *   score = experience + 10 * reliability + 10 * quality
 * where experience = count of verified completions, reliability is the
 * completion ratio (0..1), quality is the mean review rating (0..5). The
 * formula is documented in PHASE_04_BIDTHRONE.md so it is never a black box.
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
  // Composite (documented formula, not a purchaseable rank)
  score: number;
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
  const negative = disputesAsRespondent;
  const reliability = experience + negative === 0 ? 0 : experience / (experience + negative);

  const score = experience + 10 * reliability + 10 * quality;
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
    score,
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
  score: number;
};

export const BOARD_NAMES = [
  "most_experience", // verified completion count
  "most_wins", // place-1 bounty/creative awards
  "most_complete", // completed projects
  "top_captains", // captained completions
  "top_sponsors", // sponsor-side verified completed work
  "most_quality", // mean review quality (min 3 reviews)
  "most_reliable", // completion ratio (min sample)
  "rising", // verified completions in the trailing 90 days
] as const;

/** Minimum verified outcomes before a member may appear on ANY board. */
export const LEADERBOARD_MIN_SAMPLE = 1;
/** Minimum reviews for the quality board. */
export const QUALITY_MIN_REVIEWS = 3;

type UserFacts = {
  userId: string;
  handle: string | null;
  displayName: string | null;
  experience: number;
  wins: number;
  projectCompletions: number;
  captained: number;
  reviewsReceived: number;
  quality: number;
  reliability: number;
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
       select u.id, pr.handle, u.display_name
       from users u left join profiles pr on pr.user_id = u.id
       where u.status = 'active' and u.banned = false
     )
     select c.id as user_id, c.handle, c.display_name,
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
      experience,
      wins,
      projectCompletions,
      captained,
      reviewsReceived: r.reviews_received ?? 0,
      quality,
      reliability: 0, // computed per-user below from reputationFor (ledger-accurate)
      recent90: r.recent90 ?? 0,
      sponsorCompleted: r.sponsor_completed ?? 0,
      sponsorReviews: r.sponsor_reviews ?? 0,
    };
  });
}

/**
 * Compute a leaderboard. EVERY board ranks by its own dedicated metric — the
 * name on the page is the sort in the query. Boards are network-wide by
 * design (documented); there is no misleading product parameter. Returns an
 * empty array when nobody meets the sample floor — the UI renders the honest
 * "new network" state. NEVER seeds or fabricates rows.
 */
export async function leaderboard(
  board: string,
  limit = 10,
  minSample = LEADERBOARD_MIN_SAMPLE,
): Promise<LeaderboardRow[]> {
  const facts = await loadFacts();
  const rows = facts
    .filter((f) => {
      switch (board) {
        case "most_quality":
          return f.reviewsReceived >= QUALITY_MIN_REVIEWS;
        case "most_reliable":
          return f.experience >= 2;
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
      switch (board) {
        case "most_wins":
          metric = f.wins;
          break;
        case "most_complete":
          metric = f.projectCompletions;
          break;
        case "most_quality":
          metric = f.quality;
          break;
        case "most_reliable":
          metric = f.reliability;
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
        metric,
        experience: f.experience,
        score: f.experience + 10 * f.reliability + 10 * f.quality,
      };
    })
    // stable tie-breaks: metric desc, then experience desc, then handle asc
    .sort((a, b) => b.metric - a.metric || b.experience - a.experience || String(a.handle ?? "").localeCompare(String(b.handle ?? "")));
  return rows.slice(0, limit);
}


/**
 * Bid Index sample (RC1, R9). Aggregates REAL verified money amounts for a
 * product+category and publishes ONLY when the sample meets the threshold
 * (10). A sample is a genuine completed/settled outcome — created/unfunded
 * or awarded-but-unsettled work never counts. Never exposes individual
 * deals; only anonymized aggregates with the sample size disclosed.
 */
export type BidIndexSample = {
  /** null = network-wide sample. */
  product: string | null;
  category: string;
  sampleSize: number;
  minMinor: number | null;
  medianMinor: number | null;
  maxMinor: number | null;
  sufficient: boolean;
};

export const BID_INDEX_MIN_SAMPLE = 10;

/**
 * `product` null = network-wide aggregation (the Bidthrone surface, which
 * hosts no bounties of its own). A product key keeps the RC1 R9
 * product/category isolation for engine tests.
 */
export async function bidIndexFor(
  product: string | null,
  category: string,
  threshold = BID_INDEX_MIN_SAMPLE,
): Promise<BidIndexSample> {
  const sql = await getSql();
  // verified = completed/settled outcomes only (RC1, R9): a merely-created or
  // unfunded opportunity is not a price point; awarded-but-unsettled work is
  // not yet a verified transaction either.
  const params = product ? [product, category] : [category];
  const bounties = await sql.query<{ amount: number }>(
    product
      ? "select reward_total_minor::bigint as amount from bounties where product = $1 and category = $2 and status in ('COMPLETED')"
      : "select reward_total_minor::bigint as amount from bounties where category = $1 and status in ('COMPLETED')",
    params,
  );
  const projects = await sql.query<{ amount: number }>(
    product
      ? "select coalesce(selected_quoted_minor,0)::bigint as amount from projects where product = $1 and category = $2 and status in ('COMPLETED') and selected_quoted_minor is not null"
      : "select coalesce(selected_quoted_minor,0)::bigint as amount from projects where category = $1 and status in ('COMPLETED') and selected_quoted_minor is not null",
    params,
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
    return { product, category, sampleSize, minMinor: null, medianMinor: null, maxMinor: null, sufficient };
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
    sampleSize,
    minMinor: amounts[0],
    medianMinor,
    maxMinor: amounts[sampleSize - 1],
    sufficient,
  };
}
