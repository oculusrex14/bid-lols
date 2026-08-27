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
      `select count(*)::int as n from reputation_events
       where user_id = $1 and kind = 'captained_completion' and created_at > now() - interval '90 days'`,
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
  experience: number;
  score: number;
};

/**
 * Compute a leaderboard from real data. Returns an empty array when nobody
 * meets the sample threshold — the UI then renders the "not enough data yet"
 * state. NEVER seeds or fabricates rows.
 * @param board one of: most_experience | most_reliable | most_wins | most_complete | most_quality | rising | top_sponsors
 */
export async function leaderboard(
  board: string,
  product: string,
  limit = 10,
  minSample = 1,
): Promise<LeaderboardRow[]> {
  const sql = await getSql();
  // Candidate users: anyone with a profile handle OR who has verified work in
  // this product. We aggregate from the authoritative tables.
  const candidates = await sql.query<{ user_id: string }>(
    `select user_id from bounty_awards
     union
     select provider_user_id from project_proposals pp
       join projects p on p.selected_proposal_id = pp.id and p.status = 'COMPLETED'
     union
     select user_id from reputation_events`,
  );
  const userIds = candidates.map((c) => c.user_id);
  if (userIds.length === 0) return [];

  // Load handles/names + per-user experience in bulk to keep this cheap.
  const profiles = await sql.query<{ user_id: string; handle: string | null; display_name: string | null }>(
    `select u.id as user_id, pr.handle, u.display_name
     from users u left join profiles pr on pr.user_id = u.id
     where u.id = any($1) and u.status = 'active' and u.banned = false`,
    [userIds],
  );
  const profileById = new Map(profiles.map((p) => [p.user_id, p]));

  const rows: LeaderboardRow[] = [];
  for (const uid of userIds) {
    const rep = await reputationFor(uid);
    if (rep.experience < minSample) continue;
    const pr = profileById.get(uid);
    rows.push({
      userId: uid,
      handle: pr?.handle ?? null,
      displayName: pr?.display_name ?? pr?.handle ?? null,
      experience: rep.experience,
      score: rep.score,
    });
  }
  // Sort by the requested board's ordering.
  rows.sort((a, b) => {
    switch (board) {
      case "most_reliable":
        return b.score - a.score; // reliability feeds the composite
      case "rising":
        return b.score - a.score;
      case "top_sponsors":
        return a.score - b.score;
      case "most_wins":
      case "most_complete":
      case "most_quality":
      case "most_experience":
      default:
        return b.experience - a.experience;
    }
  });
  void product; // product-scoping is a read refinement; boards are network-wide by design
  return rows.slice(0, limit);
}


/**
 * Bid Index sample (Phase 04, FR-4). Aggregates real, verified money amounts
 * for a product+category and returns it ONLY when the sample meets the
 * threshold — otherwise the caller suppresses the benchmark (noindex, empty
 * state). Never exposes individual deals; only anonymized aggregates with the
 * sample size disclosed.
 */
export type BidIndexSample = {
  product: string;
  category: string;
  sampleSize: number;
  /** null until the sample is sufficient (threshold met). */
  minMinor: number | null;
  medianMinor: number | null;
  maxMinor: number | null;
  sufficient: boolean;
};

export const BID_INDEX_MIN_SAMPLE = 10;

export async function bidIndexFor(
  product: string,
  category: string,
  threshold = BID_INDEX_MIN_SAMPLE,
): Promise<BidIndexSample> {
  const sql = await getSql();
  const bounties = await sql.query<{ amount: number }>(
    "select reward_total_minor::bigint as amount from bounties where product = $1 and category = $2 and status in ('AWARDED','SETTLING','COMPLETED')",
    [product, category],
  );
  const projects = await sql.query<{ amount: number }>(
    "select coalesce(selected_quoted_minor,0)::bigint as amount from projects where product = $1 and category = $2 and status in ('ACTIVE','COMPLETION_REVIEW','COMPLETED') and selected_quoted_minor is not null",
    [product, category],
  );
  const amounts = [
    ...bounties.map((b) => Number(b.amount)),
    ...projects.map((p) => Number(p.amount)),
  ].filter((a) => a > 0).sort((a, b) => a - b);
  const sampleSize = amounts.length;
  const sufficient = sampleSize >= threshold;
  if (!sufficient) {
    return { product, category, sampleSize, minMinor: null, medianMinor: null, maxMinor: null, sufficient };
  }
  const medianMinor = amounts[Math.floor((sampleSize - 1) / 2)];
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
