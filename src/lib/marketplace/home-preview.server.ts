/**
 * Home-page live preview data (RC3, S-24/S-26/S-27/S-28). The hero of each
 * product home shows REAL marketplace data when it exists — the preview is
 * server-fetched, never seeded, and never labelled as live when it is not.
 * Client-safe shape only (ids + display fields), so it can ride the home
 * loader without PII or authority context.
 */
import type { ProductKey } from "@/lib/host";
import { getSql } from "@/lib/db.server";
import { listOpenBounties, type BountyListItem } from "./queries.server";
import { leaderboard, type LeaderboardRow } from "./reputation.server";

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
      bidIndexReady: boolean;
    };

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
      const boards = [
        { key: "most_wins", name: "Top builders" },
        { key: "top_captains", name: "Top captains" },
        { key: "rising", name: "Rising" },
      ];
      const out = [];
      for (const b of boards) {
        out.push({ ...b, rows: await leaderboard(b.key, 3) });
      }
      // The Bid Index publishes only with a real sample; surface whether any
      // category currently qualifies (truthful "market data exists" signal).
      const sql = await getSql();
      const idx = await sql.query<{ n: number }>(
        `select count(*)::int as n from (
           select category from bounties
           where status in ('COMPLETED','SETTLING') and reward_total_minor is not null
           group by category having count(*) >= 10
         ) t`,
      );
      return { kind: "boards", boards: out, bidIndexReady: (idx[0]?.n ?? 0) > 0 };
    }
  }
}
