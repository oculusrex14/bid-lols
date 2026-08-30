import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  reputationFor,
  leaderboard,
  marketRateFor,
  type ReputationMetrics,
  type LeaderboardRow,
  type MarketRateSample,
} from "@/lib/marketplace/reputation.server";
export type { ReputationMetrics, LeaderboardRow, MarketRateSample };
export const MARKET_RATE_MIN_SAMPLE = 10;
import { toErrorResponse } from "@/lib/authz";

/**
 * Client-safe Bidthrone serverFns (Phase 04; RC4 §3/§56). Read-only
 * reputation feeding the leaderboards; Market Rates is the SEPARATE
 * aggregate-pricing product and never shares naming with the personal
 * Bid Index trust score.
 */

// RC5 §5.5: board identity comes from the single registry — no local list.
import { BOARD_KEYS } from "./leaderboard-registry";
export {
  BOARD_REGISTRY,
  boardSpec,
  type BoardKey,
  type BoardSpec,
  type BoardFamily,
} from "./leaderboard-registry";
export { BOARD_KEYS };

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
      .object({ board: z.enum(BOARD_KEYS), limit: z.number().int().min(1).max(25).default(10) })
      .parse(input),
  )
  .handler(
    async ({
      data,
    }): Promise<{ ok: true; board: string; rows: LeaderboardRow[]; newNetwork: boolean } | { ok: false; code: string; message: string }> => {
      try {
        // Boards are network-wide by design (reputation crosses products);
        // each board ranks by its own dedicated metric — there is no
        // misleading product arg.
        const rows = await leaderboard(data.board, data.limit, 1);
        return { ok: true, board: data.board, rows, newNetwork: rows.length === 0 };
      } catch (err) {
        const mapped = toErrorResponse(err);
        if (mapped) return { ok: false, ...mapped.body };
        return { ok: false, code: "error", message: "Could not load the board." };
      }
    },
  );

/**
 * Market Rates (aggregate pricing; renamed from "Bid Index" in RC4 §3).
 * RC5.1 WS10: the currency is part of the aggregate identity — callers must
 * say which currency's verified outcomes they want; unknown values fail the
 * validator instead of assuming INR.
 */
export const marketRateFn = createServerFn({ method: "GET" })
  .validator((input: { product: string; category: string; currency: string }) =>
    z
      .object({
        product: z.string().max(20),
        category: z.string().max(40),
        currency: z.enum(["INR", "USD"]),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    return marketRateFor(data.product, data.category, data.currency);
  });
