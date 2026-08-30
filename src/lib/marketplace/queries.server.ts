import type { Sql } from "@/lib/db.server";

/**
 * Marketplace read queries (Phase 01, FR-3/FR-13). Server-side filtering,
 * sorting and cursor pagination over indexed queries — datasets are never
 * loaded whole into the client. Public reads only; authority-gated writes
 * live in the engines.
 */

export type BountyListItem = {
  id: string;
  slug: string;
  title: string;
  category: string;
  reward_total_minor: number;
  currency: string;
  reward_structure: string;
  status: string;
  participant_cap: number;
  participants: number;
  submission_deadline: string;
  created_at: string;
  /** RC3 browse: real sponsor identity when the sponsor has one. */
  sponsor_name: string | null;
  sponsor_handle: string | null;
  /** RC3 browse: CultureBid structured brief (formats / platform / usage). */
  creative: { formats?: string[]; targetPlatform?: string; usageNotes?: string } | null;
};

export type BountyFilters = {
  category?: string;
  rewardMinMinor?: number;
  rewardMaxMinor?: number;
  deadlineWithinDays?: number;
  sort?: "newest" | "ending_soon" | "reward";
  cursor?: string | null; // created_at ISO of the last row
  limit?: number;
};

/** Public OPEN bounties (listing). Cursor = created_at of the last row. */
export async function listOpenBounties(
  sql: Sql,
  product: string,
  filters: BountyFilters = {},
): Promise<{ items: BountyListItem[]; nextCursor: string | null }> {
  const limit = Math.min(Math.max(filters.limit ?? 20, 1), 50);
  // Column-qualified: the list join (users/profiles for sponsor identity)
  // introduces `status` on the joined tables — bare names would be ambiguous.
  const conditions: string[] = ["b.product = $1", "b.status in ('OPEN','APPLICATION_CLOSED','SUBMISSION','JUDGING')"];
  const params: unknown[] = [product];
  let pi = 2;
  if (filters.category) {
    conditions.push(`b.category = $${pi++}`);
    params.push(filters.category);
  }
  if (filters.rewardMinMinor != null) {
    conditions.push(`b.reward_total_minor >= $${pi++}`);
    params.push(filters.rewardMinMinor);
  }
  if (filters.rewardMaxMinor != null) {
    conditions.push(`b.reward_total_minor <= $${pi++}`);
    params.push(filters.rewardMaxMinor);
  }
  if (filters.deadlineWithinDays != null) {
    conditions.push(`b.submission_deadline <= now() + ($${pi++} || ' days')::interval`);
    params.push(String(filters.deadlineWithinDays));
  }
  if (filters.cursor) {
    conditions.push(`(b.created_at, b.id) < ($${pi++}::timestamptz, $${pi++}::text)`);
    params.push(filters.cursor, filters.cursor);
  }
  const orderBy =
    filters.sort === "ending_soon"
      ? "b.submission_deadline asc"
      : filters.sort === "reward"
        ? "b.reward_total_minor desc"
        : "b.created_at desc";
  const items = await sql.query<BountyListItem>(
    `select b.id, b.slug, b.title, b.category, b.reward_total_minor, b.currency,
            b.reward_structure, b.status, b.participant_cap, b.submission_deadline,
            b.created_at, b.creative,
            u.display_name as sponsor_name,
            p.handle as sponsor_handle,
            (select count(*)::int from bounty_participants bp where bp.bounty_id = b.id) as participants
     from bounties b
     join users u on u.id = b.sponsor_user_id
     left join profiles p on p.user_id = b.sponsor_user_id
     where ${conditions.join(" and ")}
     order by ${orderBy}, b.id
     limit $${pi}`,
    [...params, limit + 1],
  );
  const hasMore = items.length > limit;
  const page = hasMore ? items.slice(0, limit) : items;
  return {
    items: page,
    nextCursor: hasMore ? page[page.length - 1]?.created_at ?? null : null,
  };
}

export type ProjectListItem = {
  id: string; slug: string; title: string; category: string;
  budget_min_minor: number | null; budget_max_minor: number | null;
  currency: string; status: string; proposal_deadline: string | null; created_at: string;
};

/** Public OPEN projects (list). */
export async function listOpenProjects(
  sql: Sql,
  product: string,
  filters: BountyFilters = {},
): Promise<{ items: ProjectListItem[]; nextCursor: string | null }> {
  const limit = Math.min(Math.max(filters.limit ?? 20, 1), 50);
  const conditions: string[] = ["product = $1", "status in ('OPEN_FOR_PROPOSALS','ACTIVE')"];
  const params: unknown[] = [product];
  let pi = 2;
  if (filters.category) {
    conditions.push(`category = $${pi++}`);
    params.push(filters.category);
  }
  if (filters.cursor) {
    conditions.push(`(created_at, id) < ($${pi}::timestamptz, $${pi + 1}::text)`);
    params.push(filters.cursor, filters.cursor);
    pi += 2;
  }
  const orderBy = filters.sort === "reward" ? "created_at desc" : "created_at desc";
  const items = await sql.query<ProjectListItem>(
    `select id, slug, title, category, budget_min_minor, budget_max_minor, currency,
            status, proposal_deadline, created_at
     from projects
     where ${conditions.join(" and ")}
     order by ${orderBy}, id
     limit $${pi}`,
    [...params, limit + 1],
  );
  const hasMore = items.length > limit;
  const page = hasMore ? items.slice(0, limit) : items;
  return {
    items: page,
    nextCursor: hasMore ? String(page[page.length - 1]?.created_at ?? "") : null,
  };
}

export type BountyPublic = {
  id: string;
  product: string;
  creative: { formats?: string[]; targetPlatform?: string; publicPostingRequired?: boolean; performanceMeasured?: boolean; usageNotes?: string } | null;
  title: string;
  slug: string;
  category: string;
  description: string;
  deliverables: string;
  acceptance_criteria: string;
  ip_and_confidentiality: string;
  reward_total_minor: number;
  currency: string;
  reward_structure: string;
  status: string;
  participant_cap: number;
  participants: number;
  application_deadline: string | null;
  submission_deadline: string;
  published_at: string | null;
  created_at: string;
  sponsor_name: string | null;
  sponsor_handle: string | null;
  sponsor_company: string | null;
  sponsor_user_id: string;
  funding_payment_id: string | null;
};

export type BountyDetail = {
  bounty: BountyPublic;
  participants: Array<{ handle: string | null; display_name: string | null; status: string }>;
  submissions: Array<{
    id: string;
    title: string;
    body: string;
    links: string[];
    status: string;
    place: number | null;
    submitted_at: string;
    handle: string | null;
    display_name: string | null;
  }>;
  awards: Array<{ place: number; amount_minor: number; currency: string; handle: string | null; status: string }>;
  viewer: {
    isSponsor: boolean;
    application: { id: string; status: string } | null;
    participant: { status: string } | null;
    submission: { id: string; title: string } | null;
  } | null;
};

/**
 * Public bounty detail + viewer-scoped authority context. Anonymous viewers
 * get the public sections only; sponsor/participant extras require the
 * session user (resolved by the route loader, NOT by the client).
 */
export async function getBountyDetail(
  sql: Sql,
  bountyId: string,
  viewerUserId: string | null,
): Promise<BountyDetail | null> {
  const rows = await sql.query<BountyPublic>(
    `select b.id, b.creative, b.product, b.slug, b.title, b.category, b.description, b.deliverables,
            b.acceptance_criteria, b.ip_and_confidentiality, b.reward_total_minor,
            b.currency, b.reward_structure, b.status, b.participant_cap,
            b.application_deadline, b.submission_deadline, b.published_at,
            b.created_at, b.sponsor_user_id, b.funding_payment_id,
            u.display_name as sponsor_name, p.handle as sponsor_handle,
            p.company_name as sponsor_company,
            (select count(*)::int from bounty_participants bp where bp.bounty_id = b.id) as participants
     from bounties b
     join users u on u.id = b.sponsor_user_id
     left join profiles p on p.user_id = b.sponsor_user_id
     where b.id = $1`,
    [bountyId],
  );
  const bounty = rows[0];
  if (!bounty) return null;

  const participants = await sql.query<{ handle: string | null; display_name: string | null; status: string }>(
    `select pr.handle, u.display_name, bp.status
     from bounty_participants bp
     join users u on u.id = bp.user_id
     left join profiles pr on pr.user_id = bp.user_id
     where bp.bounty_id = $1 order by bp.created_at`,
    [bountyId],
  );
  const submissions = await sql.query<{
    id: string; title: string; body: string; links: string[]; status: string;
    place: number | null; submitted_at: string; handle: string | null; display_name: string | null;
  }>(
    `select s.id, s.title, s.body, s.links, s.status, s.place, s.submitted_at,
            pr.handle, u.display_name
     from bounty_submissions s
     join users u on u.id = s.user_id
     left join profiles pr on pr.user_id = s.user_id
     where s.bounty_id = $1
     order by s.place asc nulls last, s.submitted_at desc`,
    [bountyId],
  );
  const awards = await sql.query<{ place: number; amount_minor: number; currency: string; handle: string | null; status: string }>(
    `select a.place, a.amount_minor, a.currency, a.status, pr.handle
     from bounty_awards a
     left join profiles pr on pr.user_id = a.user_id
     where a.bounty_id = $1 order by a.place`,
    [bountyId],
  );

  let viewer: BountyDetail["viewer"] = null;
  if (viewerUserId) {
    const app = await sql.query<{ id: string; status: string }>(
      "select id, status from bounty_applications where bounty_id = $1 and user_id = $2",
      [bountyId, viewerUserId],
    );
    const par = await sql.query<{ status: string }>(
      "select status from bounty_participants where bounty_id = $1 and user_id = $2",
      [bountyId, viewerUserId],
    );
    const sub = await sql.query<{ id: string; title: string }>(
      "select id, title from bounty_submissions where bounty_id = $1 and user_id = $2",
      [bountyId, viewerUserId],
    );
    viewer = {
      isSponsor: bounty.sponsor_user_id === viewerUserId,
      application: app[0] ?? null,
      participant: par[0] ?? null,
      submission: sub[0] ?? null,
    };
  }

  return {
    bounty,
    participants: participants.map((p) => ({ handle: p.handle, display_name: p.display_name, status: p.status })),
    submissions: submissions.map((s) => ({
      ...s,
      links: Array.isArray(s.links) ? s.links : [],
    })),
    awards,
    viewer,
  };
}

/** Applications for a sponsor's management view (their own bounties only). */
export async function listApplicationsForSponsor(
  sql: Sql,
  bountyId: string,
  sponsorUserId: string,
): Promise<Array<{ id: string; status: string; message: string; created_at: string; handle: string | null; display_name: string | null }>> {
  // The WHERE on sponsor is the authorization (an IDOR guard, not cosmetics).
  return sql.query(
    `select a.id, a.status, a.message, a.created_at, pr.handle, u.display_name
     from bounty_applications a
     join bounties b on b.id = a.bounty_id and b.sponsor_user_id = $2
     join users u on u.id = a.user_id
     left join profiles pr on pr.user_id = a.user_id
     where a.bounty_id = $1
     order by a.created_at asc`,
    [bountyId, sponsorUserId],
  );
}