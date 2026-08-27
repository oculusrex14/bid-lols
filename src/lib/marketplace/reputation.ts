import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  reputationFor,
  leaderboard,
  bidIndexFor,
  type ReputationMetrics,
  type LeaderboardRow,
  type BidIndexSample,
} from "@/lib/marketplace/reputation.server";
export type { ReputationMetrics, LeaderboardRow, BidIndexSample };
export const BID_INDEX_MIN_SAMPLE = 10;
import { toErrorResponse } from "@/lib/authz";

/**
 * Client-safe Bidthrone serverFns (Phase 04). Read-only reputation; the
 * source of truth is the ledger/awards/reviews, never a stored number.
 */

const BOARD_NAMES = [
  "most_experience",
  "most_wins",
  "most_complete",
  "most_quality",
  "most_reliable",
  "rising",
  "top_sponsors",
] as const;

export const myReputationFn = createServerFn({ method: "GET" })
  .validator((input: { userId: string }) =>
    z.object({ userId: z.string().min(4).max(64) }).parse(input),
  )
  .handler(
    async ({
      data,
    }): Promise<{ ok: true; reputation: ReputationMetrics } | { ok: false; code: string; message: string }> => {
      try {
        return { ok: true, reputation: await reputationFor(data.userId) };
      } catch (err) {
        const mapped = toErrorResponse(err);
        if (mapped) return { ok: false, ...mapped.body };
        return { ok: false, code: "error", message: "Could not load reputation." };
      }
    },
  );

export const boardFn = createServerFn({ method: "GET" })
  .validator((input: { board: string; limit?: number }) =>
    z
      .object({ board: z.enum(BOARD_NAMES), limit: z.number().int().min(1).max(25).default(10) })
      .parse(input),
  )
  .handler(
    async ({
      data,
    }): Promise<{ ok: true; board: string; rows: LeaderboardRow[]; newNetwork: boolean } | { ok: false; code: string; message: string }> => {
      try {
        // Boards are network-wide by design (reputation crosses products);
        // the product arg is a read refinement reserved for later.
        // Boards are network-wide by design (documented) — each board ranks
        // by its own dedicated metric; there is no misleading product arg.
        const rows = await leaderboard(data.board, data.limit, 1);
        return { ok: true, board: data.board, rows, newNetwork: rows.length === 0 };
      } catch (err) {
        const mapped = toErrorResponse(err);
        if (mapped) return { ok: false, ...mapped.body };
        return { ok: false, code: "error", message: "Could not load the board." };
      }
    },
  );

export const bidIndexFn = createServerFn({ method: "GET" })
  .validator((input: { product: string; category: string }) =>
    z.object({ product: z.string().max(20), category: z.string().max(40) }).parse(input),
  )
  .handler(async ({ data }) => {
    return bidIndexFor(data.product, data.category);
  });

export { BOARD_NAMES };