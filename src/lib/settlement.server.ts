import { getSql, type Sql } from "@/lib/db.server";
import { makeId } from "@/lib/ids";
import { cashfreeOrderIsPaid } from "@/lib/cashfree";
import { clampSocials } from "@/lib/socials";
import { clampValues } from "@/lib/values";

/**
 * Order settlement — the ONLY code path that turns a pending order into a
 * paid one (Phase 00, FR-4/S-2). Invoked exclusively by the signature-
 * verified Cashfree webhook route.
 *
 * Guarantees:
 *  - **Claim guard (S-3):** `update orders set status='paid' … where status='pending'`
 *    runs in the same transaction as the legacy effects; exactly one
 *    concurrent caller can win, so double settlement is impossible.
 *  - **Provider re-verify (S-4):** before claiming, the order status is
 *    re-queried at Cashfree. No client-carried payment state is ever trusted.
 *  - **Idempotent + retry-safe:** a paid order with no `audit_events` row
 *    re-applies its effects on retry; a fully settled order returns
 *    `alreadySettled: true` and does nothing.
 *  - **Auditable:** every successful settlement writes an `audit_events` row
 *    (AGENTS §7).
 *
 * Legacy effects (bid / re-bid / swap / oracle pass) are the documented
 * forward-fix surface for in-flight orders from the removed pay-to-rank
 * product. No new orders can be created after Phase 00.
 */

export type SettleResult =
  | { ok: true; orderId: string; alreadySettled: boolean }
  | { ok: false; code: "order_not_found" | "order_not_settlable" | "not_paid_at_gateway" | "effect_failed"; message: string };

/** Legacy board keys still present in `orders.site` (tables kept as history). */
const LEGACY_SITES = new Set(["founders", "culture", "bidception"]);

type OrderRow = {
  id: string;
  site: string;
  kind: "bid" | "swap" | "oracle";
  amount_cents: number;
  status: string;
  listing_id: string | null;
  manage_token: string | null;
  payload: unknown;
};

type ListingRow = {
  id: string;
  site: string;
  url: string;
  url_key: string;
  title: string;
  tagline: string;
  team: string;
  socials: unknown;
  values: unknown;
  bid_cents: number;
  rank: number | null;
  clicks: number;
  swap_count: number;
  manage_token: string;
  last_bid_at: string;
  created_at: string;
};

function parsePayload(payload: unknown): Record<string, unknown> {
  if (typeof payload === "string") {
    try {
      return JSON.parse(payload) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  return (payload ?? {}) as Record<string, unknown>;
}

async function fetchListing(sql: Sql, id: string): Promise<ListingRow | null> {
  const rows = await sql.query<ListingRow>(
    `select id, site, url, url_key, title, tagline, team, socials, values, bid_cents, rank,
            clicks, swap_count, manage_token,
            last_bid_at::text as last_bid_at, created_at::text as created_at
     from listings where id = $1`,
    [id],
  );
  return rows[0] ?? null;
}

/** Window over bid_cents desc — rank 1..n per legacy site. */
async function recastRanks(sql: Sql, site: string): Promise<void> {
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

async function insertActivity(
  sql: Sql,
  order: OrderRow,
  kind: "bid" | "rebid" | "swap" | "click",
  listingId: string | null,
  rankTo: number | null,
  title: string,
): Promise<void> {
  await sql.query(
    `insert into activity (id, site, listing_id, kind, amount_cents, rank_to, title)
     values ($1, $2, $3, $4, $5, $6, $7)`,
    [makeId("act"), order.site, listingId, kind, Number(order.amount_cents), rankTo, title],
  );
}

async function applyBidEffect(sql: Sql, order: OrderRow): Promise<void> {
  const payload = parsePayload(order.payload);
  const targetBidCents = Number(payload.targetBidCents);
  if (!Number.isFinite(targetBidCents) || targetBidCents <= 0) {
    throw new Error(`Order ${order.id} bid effect has no valid target bid.`);
  }
  const title = String(payload.title ?? "Listing");
  const tagline = String(payload.tagline ?? "");
  const team = String(payload.team ?? "");
  const socialsIn = clampSocials(payload.socials);
  const valuesIn = clampValues(payload.values);
  const url = String(payload.url);
  const key = String(payload.urlKey);

  if (order.listing_id) {
    const current = await fetchListing(sql, order.listing_id);
    if (!current) throw new Error(`Order ${order.id}: listing ${order.listing_id} is missing.`);
    if (targetBidCents <= current.bid_cents) {
      // The bid no longer outranks the listing. The payment is authoritative;
      // never silently drop it — record it for ops forward-fix.
      console.error(
        `[settlement] order ${order.id} paid for target ${targetBidCents} which no longer outranks ${current.bid_cents}; listing untouched (forward-fix required).`,
      );
      return;
    }
    const socials = socialsIn.length > 0 ? socialsIn : clampSocials(current.socials);
    const values = valuesIn.length > 0 ? valuesIn : clampValues(current.values);
    await sql.query(
      `update listings
       set bid_cents = $1, title = $2, tagline = $3, team = $4, url = $5, url_key = $6,
           socials = $7::jsonb, values = $8::jsonb, last_bid_at = now()
       where id = $9`,
      [targetBidCents, title, tagline, team, url, key, JSON.stringify(socials), JSON.stringify(values), order.listing_id],
    );
    await recastRanks(sql, order.site);
    const after = await fetchListing(sql, order.listing_id);
    await insertActivity(sql, order, "rebid", order.listing_id, after?.rank ?? null, title);
    return;
  }

  const listingId = makeId("lst");
  const token = order.manage_token ?? makeId("tok");
  await sql.query(
    `insert into listings
      (id, site, url, url_key, title, tagline, team, socials, values, bid_cents, clicks, swap_count, manage_token, last_bid_at)
     values ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9::jsonb, $10, 0, 0, $11, now())`,
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
  await recastRanks(sql, order.site);
  const after = await fetchListing(sql, listingId);
  await insertActivity(sql, order, "bid", listingId, after?.rank ?? null, title);
}

async function applySwapEffect(sql: Sql, order: OrderRow): Promise<void> {
  if (!order.listing_id) throw new Error(`Order ${order.id} swap effect has no listing.`);
  const listing = await fetchListing(sql, order.listing_id);
  if (!listing) throw new Error(`Order ${order.id}: listing ${order.listing_id} is missing.`);
  const payload = parsePayload(order.payload);
  const newUrl = String(payload.newUrl ?? listing.url);
  const key = String(payload.urlKey ?? listing.url_key);
  // The fee was fixed and charged at order creation; settlement never
  // re-quotes (the provider payment is the authority for money).
  await sql.query(
    `update listings set url = $1, url_key = $2, swap_count = swap_count + 1 where id = $3`,
    [newUrl, key, order.listing_id],
  );
  await recastRanks(sql, order.site);
  const after = await fetchListing(sql, order.listing_id);
  await insertActivity(sql, order, "swap", order.listing_id, after?.rank ?? null, listing.title);
}

async function applyOracleEffect(sql: Sql, order: OrderRow): Promise<void> {
  const payload = parsePayload(order.payload);
  const token = String(payload.token ?? "");
  if (!token) throw new Error(`Order ${order.id} oracle effect has no identity token.`);
  const handle = String(payload.handle ?? "Oracle");
  await sql.query(
    `insert into crown_passes (id, site, token, handle, order_id, expires_at)
     values ($1, $2, $3, $4, $5,
             greatest(now(), (select coalesce(max(expires_at), now()) from crown_passes where site = $2 and token = $3))
             + interval '7 day')
     on conflict (order_id) do nothing`,
    [makeId("pass"), order.site, token, handle, order.id],
  );
}

function auditMeta(order: OrderRow, note?: string): string {
  return JSON.stringify({
    kind: order.kind,
    amount_cents: Number(order.amount_cents),
    provider: "cashfree",
    ...(note ? { note } : {}),
  });
}

/**
 * Settle one Cashfree order. Safe to call concurrently and repeatedly:
 * the claim guard guarantees effects apply at most once, and retries after a
 * crashed effect re-apply the effect exactly (audited rows are the marker).
 */
export async function settleOrder(orderIdRaw: string): Promise<SettleResult> {
  const orderId = String(orderIdRaw ?? "").trim();
  if (orderId.length < 8) {
    return { ok: false, code: "order_not_found", message: "Order not found." };
  }
  const sql = await getSql();

  const rows = await sql.query<OrderRow>(
    `select id, site, kind, amount_cents, status, listing_id, manage_token, payload
     from orders where id = $1`,
    [orderId],
  );
  const order = rows[0];
  if (!order || !LEGACY_SITES.has(order.site)) {
    return { ok: false, code: "order_not_found", message: "Order not found." };
  }

  if (order.status === "paid") {
    const settled = await sql.query<{ id: string }>(
      `select id from audit_events where entity_type = 'order' and entity_id = $1 and action = 'order_settled' limit 1`,
      [order.id],
    );
    if (settled.length > 0) {
      return { ok: true, orderId, alreadySettled: true };
    }
    // Paid but the effect pass crashed before it was audited: re-apply.
    console.warn(`[settlement] order ${order.id} is paid but un-audited; re-applying effects.`);
  } else if (order.status !== "pending") {
    return { ok: false, code: "order_not_settlable", message: "Order is not pending." };
  } else {
    // S-4: re-verify at the provider before any state transition.
    const paidAtGateway = await cashfreeOrderIsPaid(order.id);
    if (!paidAtGateway) {
      return { ok: false, code: "not_paid_at_gateway", message: "Provider has not marked this order paid." };
    }
  }

  const wasAlreadyPaid = order.status === "paid";
  try {
    const completed = await sql.transaction(async (tx) => {
      if (!wasAlreadyPaid) {
        // S-3: atomic claim — exactly one concurrent caller can win.
        // RETURNING makes the claim observable through the row-count surface
        // (pg UPDATEs otherwise return no rows regardless of whether they fired).
        const claimed = await tx.query(
          `update orders set status = 'paid', paid_at = now()
           where id = $1 and status = 'pending'
           returning id`,
          [order.id],
        );
        if (claimed.length === 0) return false; // someone else settled concurrently
      }
      // Winner of the claim (or the paid-but-un-audited retry path) applies
      // the legacy effects exactly once.
      if (order.kind === "oracle") await applyOracleEffect(tx, order);
      else if (order.kind === "swap") await applySwapEffect(tx, order);
      else await applyBidEffect(tx, order);

      await tx.query(
        `insert into audit_events (id, actor_user_id, action, entity_type, entity_id, meta)
         values ($1, null, 'order_settled', 'order', $2, $3::jsonb)`,
        [makeId("aev"), order.id, auditMeta(order)],
      );
      return true;
    });
    // completed && !wasAlreadyPaid  -> this call did the settling
    // everything else               -> the order was already settled (or is by
    //                                  a concurrent caller); report so.
    return { ok: true, orderId, alreadySettled: wasAlreadyPaid || !completed };
  } catch (err) {
    // The claim may have committed with a partial effect (only possible if the
    // transaction primitive misbehaves or a statement succeeded before the
    // failure inside PGLite). Never revert the payment state — log loudly and
    // let the webhook retry re-apply via the paid-but-un-audited path.
    console.error(`[settlement] effect pass failed for order ${order.id} (order remains ${order.status === "pending" ? "pending" : "paid"}); webhook retry will re-apply:`, err);
    return { ok: false, code: "effect_failed", message: "Settlement effect pass failed; retry pending." };
  }
}

/** Test/ops helper: has this order been fully settled (audited)? */
export async function isSettled(orderId: string): Promise<boolean> {
  const sql = await getSql();
  const rows = await sql.query<{ id: string }>(
    `select id from audit_events where entity_type = 'order' and entity_id = $1 and action = 'order_settled' limit 1`,
    [orderId],
  );
  return rows.length > 0;
}
