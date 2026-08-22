import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getSql } from "@/lib/db";
import { makeId, makeToken } from "@/lib/ids";
import {
  MIN_BID_DOLLARS,
  SITE_IDS,
  isSiteId,
  quoteSwapFee,
  type SiteId,
} from "@/lib/sites";
import {
  HYPE_LOCK_DAILY_VISITS,
  displayCount,
  hypeMultiplier,
  randomHypeFactor,
} from "@/lib/hype";
import { clampSocials } from "@/lib/socials";
import { clampValues } from "@/lib/values";
import { normalizeUrl, urlKey } from "@/lib/url";
import type { Activity, BoardPayload, Listing, PublicOrder } from "@/lib/types";

const siteEnum = z.enum(SITE_IDS);
const siteSchema = z.object({
  site: siteEnum,
});

type ListingRow = {
  id: string;
  site: SiteId;
  url: string;
  title: string;
  tagline: string;
  team: string;
  socials: unknown;
  values: unknown;
  bid_cents: number;
  rank: number | null;
  clicks: number;
  swap_count: number;
  last_bid_at: string | Date;
  created_at: string | Date;
};

type ActivityRow = {
  id: string;
  site: SiteId;
  listing_id: string | null;
  kind: Activity["kind"];
  amount_cents: number | null;
  rank_to: number | null;
  title: string;
  created_at: string | Date;
};

type SiteStatsRow = {
  site: SiteId;
  views: number | string;
  visits: number | string;
  visits_today: number | string;
  visits_day: string | Date;
  launched_at: string | Date;
  hype_locked: boolean;
  hype_factor?: number | string;
};

function appOrigin() {
  return (process.env.NEXT_PUBLIC_APP_URL || "https://bidthrone.lol").replace(/\/$/, "");
}

function asIso(value: string | Date) {
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function mapListing(row: ListingRow): Listing {
  return {
    id: row.id,
    site: row.site,
    url: row.url,
    title: row.title,
    tagline: row.tagline,
    team: row.team,
    socials: clampSocials(row.socials),
    values: clampValues(row.values),
    bidCents: Number(row.bid_cents),
    rank: row.rank == null ? null : Number(row.rank),
    clicks: Number(row.clicks),
    swapCount: Number(row.swap_count),
    lastBidAt: asIso(row.last_bid_at),
    createdAt: asIso(row.created_at),
  };
}

function mapActivity(row: ActivityRow): Activity {
  return {
    id: row.id,
    site: row.site,
    listingId: row.listing_id,
    kind: row.kind,
    amountCents: row.amount_cents == null ? null : Number(row.amount_cents),
    rankTo: row.rank_to == null ? null : Number(row.rank_to),
    title: row.title,
    createdAt: asIso(row.created_at),
  };
}

async function recastRanks(site: SiteId) {
  const sql = await getSql();
  await sql.query(
    `with ranked as (
       select id,
         row_number() over (order by bid_cents desc, last_bid_at asc, id asc) as r
       from listings
       where site = $1 and bid_cents > 0
     )
     update listings l set rank = ranked.r from ranked where l.id = ranked.id`,
    [site],
  );
}

async function fetchListing(id: string) {
  const sql = await getSql();
  const rows = await sql.query<ListingRow>(
    `select id, site, url, title, tagline, team, socials, values, bid_cents, rank, clicks, swap_count,
            last_bid_at::text as last_bid_at, created_at::text as created_at
     from listings where id = $1`,
    [id],
  );
  return rows[0] ? mapListing(rows[0]) : null;
}

function parsePayload(raw: unknown): Record<string, unknown> {
  if (!raw) return {};
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  if (typeof raw === "object") return raw as Record<string, unknown>;
  return {};
}

function assertWholeDollars(amount: number) {
  if (!Number.isInteger(amount) || amount < MIN_BID_DOLLARS) {
    throw new Error("Bids are whole dollars only, minimum $5.");
  }
}

const listingSelect = `id, site, url, title, tagline, team, socials, values, bid_cents, rank, clicks, swap_count,
  last_bid_at::text as last_bid_at, created_at::text as created_at`;

async function ensureSiteStats(site: SiteId) {
  const sql = await getSql();
  await sql.query(
    `insert into site_stats (site, views, visits, visits_today, visits_day, launched_at, hype_locked, hype_factor)
     values ($1, 0, 0, 0, current_date, now(), false, $2)
     on conflict (site) do nothing`,
    [site, randomHypeFactor()],
  );
  await sql.query(
    `update site_stats
     set visits_today = 0, visits_day = current_date
     where site = $1 and visits_day < current_date`,
    [site],
  );
}

/** Portal / batched views: one insert + one day-roll instead of 3× ensureSiteStats. */
async function ensureAllSiteStats() {
  const sql = await getSql();
  await sql.query(
    `insert into site_stats (site, views, visits, visits_today, visits_day, launched_at, hype_locked, hype_factor)
     values
       ('founders', 0, 0, 0, current_date, now(), false, $1),
       ('culture', 0, 0, 0, current_date, now(), false, $2),
       ('bidception', 0, 0, 0, current_date, now(), false, $3)
     on conflict (site) do nothing`,
    [randomHypeFactor(), randomHypeFactor(), randomHypeFactor()],
  );
  await sql.query(
    `update site_stats
     set visits_today = 0, visits_day = current_date
     where visits_day < current_date`,
  );
}

function publicHype(row: SiteStatsRow) {
  const visitsTodayReal = Number(row.visits_today);
  const viewsReal = Number(row.views);
  const locked = Boolean(row.hype_locked) || visitsTodayReal >= HYPE_LOCK_DAILY_VISITS;
  const multiplier = hypeMultiplier({
    launchedAt: row.launched_at,
    locked,
    start: Number(row.hype_factor),
  });
  return {
    visitsToday: displayCount(visitsTodayReal, multiplier),
    totalViews: displayCount(viewsReal, multiplier),
  };
}

async function loadHype(site: SiteId) {
  const sql = await getSql();
  await ensureSiteStats(site);
  const rows = await sql.query<SiteStatsRow>(
    `select site, views, visits, visits_today, visits_day::text as visits_day,
            launched_at::text as launched_at, hype_locked, hype_factor
     from site_stats where site = $1`,
    [site],
  );
  const row = rows[0];
  if (!row) {
    return { visitsToday: 0, totalViews: 0 };
  }
  const visitsTodayReal = Number(row.visits_today);
  if (!row.hype_locked && visitsTodayReal >= HYPE_LOCK_DAILY_VISITS) {
    await sql.query(`update site_stats set hype_locked = true where site = $1`, [site]);
    row.hype_locked = true;
  }
  return publicHype(row);
}

async function bumpVisits(site: SiteId) {
  const sql = await getSql();
  await ensureSiteStats(site);
  await sql.query(
    `update site_stats
     set visits = visits + 1,
         visits_today = visits_today + 1,
         hype_locked = hype_locked or (visits_today + 1 >= $2)
     where site = $1`,
    [site, HYPE_LOCK_DAILY_VISITS],
  );
}

async function loadBoard(site: SiteId): Promise<BoardPayload> {
  const sql = await getSql();
  const listings = await sql.query<ListingRow>(
    `select ${listingSelect}
     from listings
     where site = $1 and bid_cents > 0
     order by bid_cents desc, last_bid_at asc, id asc
     limit 100`,
    [site],
  );
  const statsRows = await sql.query<{
    count: number;
    pool: number | string | null;
    clicks: number | string | null;
  }>(
    `select count(*)::int as count,
            coalesce(sum(bid_cents), 0)::bigint as pool,
            coalesce(sum(clicks), 0)::bigint as clicks
     from listings where site = $1 and bid_cents > 0`,
    [site],
  );
  const activity = await sql.query<ActivityRow>(
    `select id, site, listing_id, kind, amount_cents, rank_to, title, created_at::text as created_at
     from activity
     where site = $1
     order by created_at desc
     limit 24`,
    [site],
  );
  const stats = statsRows[0];
  const hype = await loadHype(site);
  return {
    listings: listings.map(mapListing),
    stats: {
      count: Number(stats?.count ?? 0),
      poolCents: Number(stats?.pool ?? 0),
      clicks: Number(stats?.clicks ?? 0),
      visitsToday: hype.visitsToday,
      totalViews: hype.totalViews,
    },
    activity: activity.map(mapActivity),
  };
}

export const getBoard = createServerFn({ method: "GET" })
  .validator(siteSchema.parse)
  .handler(async ({ data }): Promise<BoardPayload> => loadBoard(data.site));

/** Portal only needs top 3 + stats per board — skip activity and the full 100-row list. */
export const getPortal = createServerFn({ method: "GET" }).handler(async () => {
  const sql = await getSql();
  await ensureAllSiteStats();

  const listingRows = await sql.query<ListingRow & { rn?: number }>(
    `select * from (
       select ${listingSelect},
         row_number() over (partition by site order by bid_cents desc, last_bid_at asc, id asc) as rn
       from listings
       where bid_cents > 0
     ) ranked
     where rn <= 3`,
  );
  const statRows = await sql.query<{
    site: string;
    count: number;
    pool: number | string | null;
    clicks: number | string | null;
  }>(
    `select site,
            count(*)::int as count,
            coalesce(sum(bid_cents), 0)::bigint as pool,
            coalesce(sum(clicks), 0)::bigint as clicks
     from listings
     where bid_cents > 0
     group by site`,
  );
  const hypeRows = await sql.query<SiteStatsRow>(
    `select site, views, visits, visits_today, visits_day::text as visits_day,
            launched_at::text as launched_at, hype_locked, hype_factor
     from site_stats`,
  );

  const statsBySite = new Map(statRows.map((row) => [row.site, row]));
  const hypeBySite = new Map(hypeRows.map((row) => [row.site, row]));

  function pack(site: SiteId): BoardPayload {
    const stats = statsBySite.get(site);
    const hypeRow = hypeBySite.get(site);
    const hype = hypeRow ? publicHype(hypeRow) : { visitsToday: 0, totalViews: 0 };
    return {
      listings: listingRows.filter((row) => row.site === site).map(mapListing),
      stats: {
        count: Number(stats?.count ?? 0),
        poolCents: Number(stats?.pool ?? 0),
        clicks: Number(stats?.clicks ?? 0),
        visitsToday: hype.visitsToday,
        totalViews: hype.totalViews,
      },
      activity: [],
    };
  }

  return {
    founders: pack("founders"),
    culture: pack("culture"),
    bidception: pack("bidception"),
  };
});

export const getListing = createServerFn({ method: "GET" })
  .validator(z.object({ id: z.string().min(1) }).parse)
  .handler(async ({ data }) => {
    const listing = await fetchListing(data.id);
    if (!listing) throw new Error("Listing not found.");
    const sql = await getSql();
    const activity = await sql.query<ActivityRow>(
      `select id, site, listing_id, kind, amount_cents, rank_to, title, created_at::text as created_at
       from activity where listing_id = $1 order by created_at desc limit 12`,
      [data.id],
    );
    return { listing, activity: activity.map(mapActivity) };
  });

export const quoteBid = createServerFn({ method: "GET" })
  .validator(
    z.object({
      site: siteEnum,
      url: z.string().min(1),
      amountDollars: z.number().optional(),
    }).parse,
  )
  .handler(async ({ data }) => {
    const sql = await getSql();
    const key = urlKey(data.url);
    const existing = await sql.query<ListingRow>(
      `select ${listingSelect} from listings where site = $1 and url_key = $2`,
      [data.site, key],
    );
    const current = existing[0] ? mapListing(existing[0]) : null;
    const amount = data.amountDollars;
    if (amount == null) {
      return {
        exists: Boolean(current),
        current,
        chargeCents: null as number | null,
        targetBidCents: null as number | null,
        message: current
          ? `Already listed at $${(current.bidCents / 100).toFixed(0)}. Re-bid only pays the difference.`
          : "New listing. Minimum $5.",
      };
    }
    assertWholeDollars(amount);
    const target = amount * 100;
    if (current) {
      if (target <= current.bidCents) {
        throw new Error(
          `Need more than $${(current.bidCents / 100).toFixed(0)} to outbid this URL.`,
        );
      }
      return {
        exists: true,
        current,
        chargeCents: target - current.bidCents,
        targetBidCents: target,
        message: `Pay $${((target - current.bidCents) / 100).toFixed(0)} more to move this listing to $${amount}.`,
      };
    }
    return {
      exists: false,
      current: null,
      chargeCents: target,
      targetBidCents: target,
      message: `New listing. Charge $${amount}.`,
    };
  });

export const createBidOrder = createServerFn({ method: "POST" })
  .validator(
    z.object({
      site: siteEnum,
      url: z.string().min(3),
      title: z.string().min(2).max(80),
      tagline: z.string().max(140),
      team: z.string().max(140),
      socials: z.array(z.string()).max(5).optional(),
      /** Culturebid “why join us” points. Ignored on other boards. */
      values: z.array(z.string()).max(5).optional(),
      amountDollars: z.number(),
      email: z.string().max(120).optional(),
    }).parse,
  )
  .handler(async ({ data }) => {
    assertWholeDollars(data.amountDollars);
    if (data.site === "founders" && data.team.trim().length < 2) {
      throw new Error("Founding team names are required.");
    }
    if (data.site === "culture" && data.tagline.trim().length < 2) {
      throw new Error("A short culture statement is required.");
    }
    const url = normalizeUrl(data.url);
    const key = urlKey(url);
    const sql = await getSql();
    const existing = await sql.query<ListingRow>(
      `select ${listingSelect} from listings where site = $1 and url_key = $2`,
      [data.site, key],
    );
    const current = existing[0] ? mapListing(existing[0]) : null;
    const target = data.amountDollars * 100;
    if (current && target <= current.bidCents) {
      throw new Error(
        `Need more than $${(current.bidCents / 100).toFixed(0)} to re-bid this URL.`,
      );
    }
    const charge = current ? target - current.bidCents : target;
    const orderId = makeId("ord");
    let manageToken = current ? null : makeToken();
    if (current) {
      const tok = await sql.query<{ manage_token: string }>(
        `select manage_token from listings where id = $1`,
        [current.id],
      );
      manageToken = tok[0]?.manage_token ?? null;
    }
    const email = data.email?.trim() || undefined;
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error("Enter a valid email, or leave it blank.");
    }
    const origin = appOrigin();
    const manageUrl = manageToken
      ? `${origin}/${data.site}/manage/${manageToken}`
      : undefined;
    const { createCashfreeSession } = await import("@/lib/cashfree");
    const session = await createCashfreeSession({
      orderId,
      amountCents: charge,
      email,
      note: manageUrl
        ? `Save this manage link — it is the only way to manage or swap this listing: ${manageUrl}`
        : undefined,
      returnUrl: `${origin}/${data.site}/checkout/${orderId}`,
    });
    if (!session.live) {
      throw new Error("Cashfree did not return a live payment session.");
    }
    const payload = {
      url,
      urlKey: key,
      title: data.title.trim(),
      tagline: data.tagline.trim(),
      team: data.team.trim(),
      socials: clampSocials(data.socials),
      values: clampValues(data.values),
      targetBidCents: target,
      listingId: current?.id ?? null,
      paymentSessionId: session.paymentSessionId,
      gatewayLive: session.live,
      gatewayMode: session.mode,
      inrRupees: session.inrRupees,
      inrPerUsd: session.inrPerUsd,
      email: email ?? null,
    };
    await sql.query(
      `insert into orders (id, site, kind, amount_cents, status, listing_id, manage_token, payload)
       values ($1, $2, 'bid', $3, 'pending', $4, $5, $6::jsonb)`,
      [
        orderId,
        data.site,
        charge,
        current?.id ?? null,
        manageToken,
        JSON.stringify(payload),
      ],
    );
    return { orderId };
  });

export const createSwapOrder = createServerFn({ method: "POST" })
  .validator(
    z.object({
      token: z.string().min(8),
      newUrl: z.string().min(3),
    }).parse,
  )
  .handler(async ({ data }) => {
    const sql = await getSql();
    const rows = await sql.query<ListingRow>(
      `select ${listingSelect} from listings where manage_token = $1`,
      [data.token],
    );
    const listing = rows[0] ? mapListing(rows[0]) : null;
    if (!listing) throw new Error("Manage link is not valid.");
    const quote = quoteSwapFee({
      bidCents: listing.bidCents,
      rank: listing.rank,
      swapCount: listing.swapCount,
    });
    if (!quote.allowed) throw new Error(quote.reason);
    const url = normalizeUrl(data.newUrl);
    const key = urlKey(url);
    if (key === urlKey(listing.url)) {
      throw new Error("That is already the listed URL.");
    }
    const clash = await sql.query<{ id: string }>(
      `select id from listings where site = $1 and url_key = $2 and id <> $3`,
      [listing.site, key, listing.id],
    );
    if (clash[0]) throw new Error("Another listing already holds that URL.");
    const orderId = makeId("ord");
    const origin = appOrigin();
    const manageUrl = `${origin}/${listing.site}/manage/${data.token}`;
    const { createCashfreeSession } = await import("@/lib/cashfree");
    const session = await createCashfreeSession({
      orderId,
      amountCents: quote.feeCents,
      note: `Save this manage link — it is the only way to manage or swap this listing: ${manageUrl}`,
      returnUrl: `${origin}/${listing.site}/checkout/${orderId}`,
    });
    if (!session.live) {
      throw new Error("Cashfree did not return a live payment session.");
    }
    const payload = {
      listingId: listing.id,
      newUrl: url,
      urlKey: key,
      title: listing.title,
      nextSwapNumber: quote.nextSwapNumber,
      paymentSessionId: session.paymentSessionId,
      gatewayLive: session.live,
      gatewayMode: session.mode,
      inrRupees: session.inrRupees,
      inrPerUsd: session.inrPerUsd,
    };
    await sql.query(
      `insert into orders (id, site, kind, amount_cents, status, listing_id, manage_token, payload)
       values ($1, $2, 'swap', $3, 'pending', $4, $5, $6::jsonb)`,
      [orderId, listing.site, quote.feeCents, listing.id, data.token, JSON.stringify(payload)],
    );
    return { orderId };
  });

export const getOrder = createServerFn({ method: "GET" })
  .validator(z.object({ orderId: z.string().min(1) }).parse)
  .handler(async ({ data }): Promise<PublicOrder> => {
    const sql = await getSql();
    const rows = await sql.query<{
      id: string;
      site: string;
      kind: "bid" | "swap";
      amount_cents: number;
      status: PublicOrder["status"];
      listing_id: string | null;
      payload: unknown;
    }>(
      `select id, site, kind, amount_cents, status, listing_id, payload
       from orders where id = $1`,
      [data.orderId],
    );
    const row = rows[0];
    if (!row || !isSiteId(row.site)) throw new Error("Order not found.");
    const payload = parsePayload(row.payload);
    const title = String(payload.title ?? "Listing");
    const url = String(payload.url ?? payload.newUrl ?? "");
    const chargeLabel =
      row.kind === "swap"
        ? "URL swap fee"
        : payload.listingId
          ? "Re-bid difference"
          : "New listing bid";
    const paymentSessionId = String(payload.paymentSessionId ?? "");
    const gatewayLive = payload.gatewayLive === true;
    const gatewayMode =
      payload.gatewayMode === "production" ? "production" : "sandbox";
    const inrPerUsd = Number(payload.inrPerUsd) || 85;
    const inrRupees =
      Number(payload.inrRupees) ||
      Math.max(1, Math.round((Number(row.amount_cents) / 100) * inrPerUsd));
    return {
      id: row.id,
      site: row.site,
      kind: row.kind,
      amountCents: Number(row.amount_cents),
      status: row.status,
      title,
      url,
      chargeLabel,
      listingId: row.listing_id,
      paymentSessionId,
      gateway: "cashfree",
      gatewayLive,
      gatewayMode,
      inrRupees,
      inrPerUsd,
    };
  });

export const confirmPayment = createServerFn({ method: "POST" })
  .validator(z.object({ orderId: z.string().min(1) }).parse)
  .handler(async ({ data }) => {
    const sql = await getSql();
    const rows = await sql.query<{
      id: string;
      site: string;
      kind: "bid" | "swap";
      amount_cents: number;
      status: string;
      listing_id: string | null;
      manage_token: string | null;
      payload: unknown;
    }>(
      `select id, site, kind, amount_cents, status, listing_id, manage_token, payload
       from orders where id = $1`,
      [data.orderId],
    );
    const order = rows[0];
    if (!order || !isSiteId(order.site)) throw new Error("Order not found.");
    if (order.status === "paid") {
      const listingId = order.listing_id;
      if (!listingId) throw new Error("Paid order is missing a listing.");
      const listing = await fetchListing(listingId);
      if (!listing) throw new Error("Listing missing.");
      return {
        alreadyPaid: true,
        listing,
        token: order.manage_token,
        site: order.site,
      };
    }
    if (order.status !== "pending") throw new Error("This order can no longer be paid.");

    const { cashfreeOrderIsPaid } = await import("@/lib/cashfree");
    const paidAtGateway = await cashfreeOrderIsPaid(order.id);
    if (!paidAtGateway) {
      throw new Error("Cashfree has not marked this order paid yet.");
    }

    const payload = parsePayload(order.payload);
    let listingId = order.listing_id;
    let token = order.manage_token;
    let kind: Activity["kind"] = "bid";

    if (order.kind === "bid") {
      const targetBidCents = Number(payload.targetBidCents);
      const title = String(payload.title ?? "Listing");
      const tagline = String(payload.tagline ?? "");
      const team = String(payload.team ?? "");
      const socialsIn = clampSocials(payload.socials);
      const valuesIn = clampValues(payload.values);
      const url = String(payload.url);
      const key = String(payload.urlKey);
      if (listingId) {
        const current = await fetchListing(listingId);
        if (!current) throw new Error("Listing missing.");
        if (targetBidCents <= current.bidCents) {
          throw new Error("This bid is no longer high enough.");
        }
        const socials = socialsIn.length ? socialsIn : current.socials;
        const values = valuesIn.length ? valuesIn : current.values;
        await sql.query(
          `update listings
           set bid_cents = $1, title = $2, tagline = $3, team = $4, url = $5, url_key = $6,
               socials = $7::jsonb, values = $8::jsonb, last_bid_at = now()
           where id = $9`,
          [targetBidCents, title, tagline, team, url, key, JSON.stringify(socials), JSON.stringify(values), listingId],
        );
        kind = "rebid";
        const tok = await sql.query<{ manage_token: string }>(
          `select manage_token from listings where id = $1`,
          [listingId],
        );
        token = tok[0]?.manage_token ?? token;
      } else {
        listingId = makeId("lst");
        token = token ?? makeToken();
        await sql.query(
          `insert into listings
            (id, site, url, url_key, title, tagline, team, socials, values, bid_cents, clicks, swap_count, manage_token, last_bid_at)
           values ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9::jsonb,$10,0,0,$11, now())`,
          [
            listingId,
            order.site,
            url,
            key,
            title,
            tagline,
            team,
            JSON.stringify(socialsIn),
            JSON.stringify(valuesIn),
            targetBidCents,
            token,
          ],
        );
        kind = "bid";
      }
      await recastRanks(order.site);
      const listing = await fetchListing(listingId);
      await sql.query(
        `insert into activity (id, site, listing_id, kind, amount_cents, rank_to, title)
         values ($1,$2,$3,$4,$5,$6,$7)`,
        [
          makeId("act"),
          order.site,
          listingId,
          kind,
          Number(order.amount_cents),
          listing?.rank ?? null,
          title,
        ],
      );
    } else {
      if (!listingId) throw new Error("Swap is missing a listing.");
      const listing = await fetchListing(listingId);
      if (!listing) throw new Error("Listing missing.");
      const quote = quoteSwapFee({
        bidCents: listing.bidCents,
        rank: listing.rank,
        swapCount: listing.swapCount,
      });
      if (!quote.allowed) throw new Error(quote.reason);
      const newUrl = String(payload.newUrl);
      const key = String(payload.urlKey);
      await sql.query(
        `update listings set url = $1, url_key = $2, swap_count = swap_count + 1 where id = $3`,
        [newUrl, key, listingId],
      );
      await recastRanks(order.site);
      const updated = await fetchListing(listingId);
      await sql.query(
        `insert into activity (id, site, listing_id, kind, amount_cents, rank_to, title)
         values ($1,$2,$3,'swap',$4,$5,$6)`,
        [
          makeId("act"),
          order.site,
          listingId,
          Number(order.amount_cents),
          updated?.rank ?? null,
          listing.title,
        ],
      );
      const tok = await sql.query<{ manage_token: string }>(
        `select manage_token from listings where id = $1`,
        [listingId],
      );
      token = tok[0]?.manage_token ?? token;
      kind = "swap";
    }

    await sql.query(
      `update orders set status = 'paid', paid_at = now(), listing_id = $1, manage_token = $2 where id = $3`,
      [listingId, token, order.id],
    );

    const listing = listingId ? await fetchListing(listingId) : null;
    if (!listing || !token) throw new Error("Payment recorded, listing missing.");
    return { alreadyPaid: false, listing, token, site: order.site, kind };
  });

export const getManaged = createServerFn({ method: "GET" })
  .validator(z.object({ token: z.string().min(8) }).parse)
  .handler(async ({ data }) => {
    const sql = await getSql();
    const rows = await sql.query<ListingRow>(
      `select ${listingSelect} from listings where manage_token = $1`,
      [data.token],
    );
    const listing = rows[0] ? mapListing(rows[0]) : null;
    if (!listing) throw new Error("Manage link is not valid.");
    const quote = quoteSwapFee({
      bidCents: listing.bidCents,
      rank: listing.rank,
      swapCount: listing.swapCount,
    });
    return { listing, quote, token: data.token };
  });

export const trackClick = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().min(1) }).parse)
  .handler(async ({ data }) => {
    const sql = await getSql();
    const rows = await sql.query<{ url: string; clicks: number; site: string }>(
      `update listings set clicks = clicks + 1 where id = $1 returning url, clicks, site`,
      [data.id],
    );
    const row = rows[0];
    if (!row) throw new Error("Listing not found.");
    if (isSiteId(row.site)) await bumpVisits(row.site);
    return { url: row.url, clicks: Number(row.clicks) };
  });

export const trackView = createServerFn({ method: "POST" })
  .validator(z.object({ sites: z.array(siteEnum).min(1).max(3) }).parse)
  .handler(async ({ data }) => {
    const sql = await getSql();
    const sites = [...new Set(data.sites)];
    if (sites.length > 1) await ensureAllSiteStats();
    else await ensureSiteStats(sites[0]);
    const placeholders = sites.map((_, i) => `$${i + 1}`).join(", ");
    await sql.query(
      `update site_stats
       set views = views + 1,
           visits = visits + 1,
           visits_today = visits_today + 1
       where site in (${placeholders})`,
      sites,
    );
  });
