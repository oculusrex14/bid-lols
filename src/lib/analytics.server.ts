import { getSql, type Sql } from "@/lib/db.server";
import type { ProductKey } from "@/lib/host";

/**
 * Server-only analytics primitives (W2/FR-8). Lives under the `.server`
 * convention so the DB module (and its PGLite dev dependency) can never reach
 * the client bundle.
 *
 *  - `views`    = one increment per page impression;
 *  - `visits`   = at most one increment per browser session per product —
 *                 the client gates the call (first impression only);
 *  - `clicks`   = one increment per outbound link click, represented
 *                 independently of views/visits.
 *
 * No scaling, no multipliers, no double-counting (the legacy artificial-count
 * layer and the double-incrementing tracker are gone). Counters are stored as
 * real integers in `site_stats` and can be shown as-is.
 */

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
export async function recordPageView(site: ProductKey): Promise<void> {
  const sql = await getSql();
  await ensureSiteStats(sql, site);
  await sql.query(`update site_stats set views = views + 1 where site = $1`, [site]);
}

/** One increment per browser session per product (client gates repetition). */
export async function recordVisit(site: ProductKey): Promise<void> {
  const sql = await getSql();
  await ensureSiteStats(sql, site);
  await sql.query(
    `update site_stats set visits = visits + 1, visits_today = visits_today + 1 where site = $1`,
    [site],
  );
}

/** One increment per outbound link click — independent of views/visits. */
export async function recordOutboundClick(site: ProductKey): Promise<void> {
  const sql = await getSql();
  await ensureSiteStats(sql, site);
  await sql.query(`update site_stats set clicks = clicks + 1 where site = $1`, [site]);
}
