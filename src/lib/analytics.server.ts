import { getSql, type Sql } from "@/lib/db.server";
import type { ProductKey } from "@/lib/host";

/**
 * Server-only analytics primitives. Lives under the `.server` convention so
 * the DB module (and its PGLite dev dependency) can never reach the client
 * bundle.
 *
 * METRIC SEMANTICS (Phase 00.6, AC-3.3 — read before using these numbers):
 *  - `views`   — PAGE IMPRESSIONS. One increment per page load / client-side
 *                route impression. Raw event count; includes bots, crawlers,
 *                reloads, and duplicate hits.
 *  - `visits`  — SESSION-DEDUPED PER PRODUCT, PER BROWSER. At most one
 *                increment per (browser session, product) while
 *                sessionStorage is available; when session storage is
 *                UNAVAILABLE the call deliberately degrades to one increment
 *                per impression (see src/lib/visit-dedup.ts + TrackProductView
 *                for the tested decision). This is NOT a unique-visitor
 *                count: www and apex are separate browser origins,
 *                different browsers/devices count separately, and the
 *                degraded path double-counts sessions. Never label it
 *                "unique visitors".
 *  - `clicks`  — OUTBOUND LINK CLICKS. One increment per click on a link
 *                that leaves the network.
 *
 * None of these metrics may be exposed publicly as bidder/sponsor
 * statistics until their fraud/dedup semantics are explicitly specified
 * (AC-3.4) — they are internal health signals today.
 *
 * ORIGIN PRODUCT: never client-supplied. Each primitive determines
 * `product_key` server-side from the request Host header (serverProductKey,
 * x-forwarded-host first) unless an explicit key is passed — the explicit
 * parameter is a server-side testing seam and is never fed from client data.
 */

/** Server-side origin product from the active request (falls back to the
 *  umbrella default outside a request scope, e.g. unit tests). */
async function requestProductKey(): Promise<ProductKey> {
  const { serverProductKey } = await import("@/lib/host.server");
  return serverProductKey();
}

/** Insert the row on first use + roll the daily counter when the day changes. */
async function ensureSiteStats(sql: Sql, site: ProductKey): Promise<void> {
  await sql.query(`insert into site_stats (site) values ($1) on conflict (site) do nothing`, [site]);
  await sql.query(
    `update site_stats
     set visits_today = 0, visits_day = current_date
     where site = $1 and visits_day <> current_date`,
    [site],
  );
}

/** One increment per page impression. */
export async function recordPageView(explicitKey?: ProductKey): Promise<void> {
  const sql = await getSql();
  const site = explicitKey ?? (await requestProductKey());
  await ensureSiteStats(sql, site);
  await sql.query(`update site_stats set views = views + 1 where site = $1`, [site]);
}

/** One increment per browser session per product (client gates repetition;
 *  see the semantics block for the storage-unavailable degradation). */
export async function recordVisit(explicitKey?: ProductKey): Promise<void> {
  const sql = await getSql();
  const site = explicitKey ?? (await requestProductKey());
  await ensureSiteStats(sql, site);
  await sql.query(
    `update site_stats set visits = visits + 1, visits_today = visits_today + 1 where site = $1`,
    [site],
  );
}

/** One increment per outbound link click — independent of views/visits. */
export async function recordOutboundClick(explicitKey?: ProductKey): Promise<void> {
  const sql = await getSql();
  const site = explicitKey ?? (await requestProductKey());
  await ensureSiteStats(sql, site);
  await sql.query(`update site_stats set clicks = clicks + 1 where site = $1`, [site]);
}
