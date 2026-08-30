/**
 * Home-page live preview data (RC3, S-24/S-26/S-27/S-28). The hero of each
 * product home shows REAL marketplace data when it exists — the preview is
 * server-fetched, never seeded, and never labelled as live when it is not.
 * Client-safe shape only (ids + display fields), so it can ride the home
 * loader without PII or authority context.
 */
import type { ProductKey } from "@/lib/host";
import { getSql } from "@/lib/db.server";
import { HOME_PREVIEW_BOARDS, boardSpec } from "./leaderboard-registry";
import { listOpenBounties, type BountyListItem } from "./queries.server";
import {
  MARKET_RATE_MIN_SAMPLE,
  leaderboard,
  marketRateFor,
  type LeaderboardRow,
  type MarketRateSample,
} from "./reputation.server";

/**
 * RC5 §5.7: the homepage Market Rates preview. Real values only, from the
 * SAME source as /market-rates (marketRateFor + MARKET_RATE_MIN_SAMPLE).
 * Category selection is a presentation choice; the numbers are not.
 */
export type HomeMarketRate = {
  category: string;
  sampleSize: number;
  sufficient: boolean;
  minMinor: number | null;
  medianMinor: number | null;
  maxMinor: number | null;
};

export type HomePreview =
  | { kind: "bounties"; items: BountyListItem[] }
  | {
      kind: "parents";
      items: Array<{
        id: string;
        title: string;
        status: string;
        funded_budget_minor: number | null;
        currency: string;
        child_count: number;
      }>;
    }
  | {
      kind: "boards";
      boards: Array<{
        key: string;
        name: string;
        rows: LeaderboardRow[];
      }>;
      marketRates: HomeMarketRate[];
    };

const PREVIEW_CATEGORIES = 3;
/** Presentation-only fallback when the network has no categories at all. */
const FALLBACK_CATEGORIES = ["development", "design", "content"];

async function bidthroneMarketRates(sql: Awaited<ReturnType<typeof getSql>>): Promise<HomeMarketRate[]> {
  const catRows = await sql.query<{ category: string }>(
    `select distinct category from (
       select category from bounties
       union
       select category from projects
     ) x order by category limit 40`,
  );
  const categories = catRows.length > 0 ? catRows.map((c) => c.category) : FALLBACK_CATEGORIES;
  const samples: MarketRateSample[] = await Promise.all(
    categories.map((category) => marketRateFor(null, category, MARKET_RATE_MIN_SAMPLE)),
  );
  // The most-evidenced categories lead (real data order); ties stay stable.
  samples.sort((a, b) => b.sampleSize - a.sampleSize || a.category.localeCompare(b.category));
  return samples.slice(0, PREVIEW_CATEGORIES).map((s) => ({
    category: s.category,
    sampleSize: s.sampleSize,
    sufficient: s.sufficient,
    minMinor: s.minMinor,
    medianMinor: s.medianMinor,
    maxMinor: s.maxMinor,
  }));
}

export async function homePreview(productKey: ProductKey): Promise<HomePreview> {
  switch (productKey) {
    case "foundersbid":
    case "culturebid": {
      const sql = await getSql();
      const { items } = await listOpenBounties(sql, productKey, { limit: 3, sort: "newest" });
      return { kind: "bounties", items };
    }
    case "bidception": {
      const sql = await getSql();
      // Public visibility rule = the /bidception list: funded or active work
      // only (drafts stay private until funding).
      const rows = await sql.query<{
        id: string;
        title: string;
        status: string;
        funded_budget_minor: number | null;
        currency: string;
        child_count: number;
      }>(
        `select p.id, p.title, p.status, p.funded_budget_minor, p.currency,
                (select count(*)::int from child_works c where c.parent_work_id = p.id) as child_count
         from parent_works p
         where p.product = 'bidception'
           and p.status in ('FUNDED','ACTIVE','COMPLETING','COMPLETED')
         order by p.created_at desc
         limit 3`,
      );
      return { kind: "parents", items: rows };
    }
    case "bidthrone":
    default: {
      const sql = await getSql();
      const out = [];
      for (const key of HOME_PREVIEW_BOARDS) {
        out.push({ key, name: boardSpec(key)?.title ?? key, rows: await leaderboard(key, 3) });
      }
      // RC5 §5.7: the preview consumes marketRateFor() — the same gated
      // aggregate /market-rates serves. No second, looser meaning.
      const marketRates = await bidthroneMarketRates(sql);
      return { kind: "boards", boards: out, marketRates };
    }
  }
}
