import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getSql } from "@/lib/db";
import { makeId, makeToken } from "@/lib/ids";
import {
  MIN_BID_DOLLARS,
  isSiteId,
  quoteSwapFee,
  type SiteId,
} from "@/lib/sites";
import { normalizeUrl, urlKey } from "@/lib/url";
import type { Activity, BoardPayload, Listing, PublicOrder } from "@/lib/types";

const siteSchema = z.object({
  site: z.enum(["founders", "bidception"]),
});

type ListingRow = {
  id: string;
  site: SiteId;
  url: string;
  title: string;
  tagline: string;
  team: string;
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
    `select id, site, url, title, tagline, team, bid_cents, rank, clicks, swap_count,
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

const listingSelect = `id, site, url, title, tagline, team, bid_cents, rank, clicks, swap_count,
  last_bid_at::text as last_bid_at, created_at::text as created_at`;

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
  return {
    listings: listings.map(mapListing),
    stats: {
      count: Number(stats?.count ?? 0),
      poolCents: Number(stats?.pool ?? 0),
      clicks: Number(stats?.clicks ?? 0),
    },
    activity: activity.map(mapActivity),
  };
}

export const getBoard = createServerFn({ method: "GET" })
  .validator(siteSchema.parse)
  .handler(async ({ data }): Promise<BoardPayload> => loadBoard(data.site));

export const getPortal = createServerFn({ method: "GET" }).handler(async () => {
  const [founders, bidception] = await Promise.all([
    loadBoard("founders"),
    loadBoard("bidception"),
  ]);
  return { founders, bidception };
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
      site: z.enum(["founders", "bidception"]),
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
      site: z.enum(["founders", "bidception"]),
      url: z.string().min(3),
      title: z.string().min(2).max(80),
      tagline: z.string().max(140),
      team: z.string().max(140),
      amountDollars: z.number(),
    }).parse,
  )
  .handler(async ({ data }) => {
    assertWholeDollars(data.amountDollars);
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
    const manageToken = current ? null : makeToken();
    const payload = {
      url,
      urlKey: key,
      title: data.title.trim(),
      tagline: data.tagline.trim(),
      team: data.team.trim(),
      targetBidCents: target,
      listingId: current?.id ?? null,
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
    const payload = {
      listingId: listing.id,
      newUrl: url,
      urlKey: key,
      title: listing.title,
      nextSwapNumber: quote.nextSwapNumber,
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

    const payload = parsePayload(order.payload);
    let listingId = order.listing_id;
    let token = order.manage_token;
    let kind: Activity["kind"] = "bid";

    if (order.kind === "bid") {
      const targetBidCents = Number(payload.targetBidCents);
      const title = String(payload.title ?? "Listing");
      const tagline = String(payload.tagline ?? "");
      const team = String(payload.team ?? "");
      const url = String(payload.url);
      const key = String(payload.urlKey);
      if (listingId) {
        const current = await fetchListing(listingId);
        if (!current) throw new Error("Listing missing.");
        if (targetBidCents <= current.bidCents) {
          throw new Error("This bid is no longer high enough.");
        }
        await sql.query(
          `update listings
           set bid_cents = $1, title = $2, tagline = $3, team = $4, url = $5, url_key = $6, last_bid_at = now()
           where id = $7`,
          [targetBidCents, title, tagline, team, url, key, listingId],
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
            (id, site, url, url_key, title, tagline, team, bid_cents, clicks, swap_count, manage_token, last_bid_at)
           values ($1,$2,$3,$4,$5,$6,$7,$8,0,0,$9, now())`,
          [
            listingId,
            order.site,
            url,
            key,
            title,
            tagline,
            team,
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
    const rows = await sql.query<{ url: string; clicks: number }>(
      `update listings set clicks = clicks + 1 where id = $1 returning url, clicks`,
      [data.id],
    );
    const row = rows[0];
    if (!row) throw new Error("Listing not found.");
    return { url: row.url, clicks: Number(row.clicks) };
  });
