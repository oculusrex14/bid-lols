import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getSql } from "@/lib/db";
import { makeId } from "@/lib/ids";
import { SITE_IDS, type SiteId } from "@/lib/sites";
import { createCashfreeSession } from "@/lib/cashfree";
import {
  ORACLE_PASS_CENTS,
  ORACLE_MULTIPLIER,
  ORACLE_PICKS_PER_ROUND,
  pickLimit,
  pointsForWin,
  roundClosesAt,
  utcDayKey,
} from "@/lib/crown-math";
import type { CrownCandidate, CrownLeader, CrownMe, CrownPayload } from "@/lib/types";

const siteEnum = z.enum(["founders", "culture", "bidception"]);

function appOrigin() {
  return (process.env.NEXT_PUBLIC_APP_URL || "https://bidthrone.lol").replace(/\/$/, "");
}

function sanitizeHandle(raw: string): string {
  const clean = raw.replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, 24);
  return clean.length > 1 ? clean : "Crowner";
}

function activePassExpiry(row: { expires_at: string | Date } | undefined): string | null {
  if (!row) return null;
  const t = row.expires_at instanceof Date ? row.expires_at.getTime() : Date.parse(String(row.expires_at));
  return Number.isFinite(t) && t > Date.now() ? new Date(t).toISOString() : null;
}

async function getActivePassExpiry(sql: Awaited<ReturnType<typeof getSql>>, site: SiteId, token: string) {
  const rows = await sql.query<{ expires_at: string | Date }>(
    `select expires_at from crown_passes where site = $1 and token = $2 order by expires_at desc limit 1`,
    [site, token],
  );
  return activePassExpiry(rows[0]);
}

async function settleClosedRounds(sql: Awaited<ReturnType<typeof getSql>>, site: SiteId) {
  const today = utcDayKey();
  const openRounds = await sql.query<{ round: string }>(
    `select distinct round from crown_predictions
     where site = $1 and settled = false and round < $2`,
    [site, today],
  );
  for (const { round } of openRounds) {
    const leader = await sql.query<{ id: string }>(
      `select id from listings where site = $1 and bid_cents > 0
       order by bid_cents desc, last_bid_at asc, id asc limit 1`,
      [site],
    );
    const winnerId: string | null = leader[0]?.id ?? null;
    const picks = await sql.query<{ id: string; token: string; handle: string; listing_id: string; multiplier: number }>(
      `select id, token, handle, listing_id, multiplier from crown_predictions
       where site = $1 and round = $2 and settled = false`,
      [site, round],
    );
    const byToken = new Map<string, { handle: string; picked: string[]; mult: number }>();
    for (const pick of picks) {
      const entry = byToken.get(pick.token) ?? { handle: pick.handle, picked: [], mult: pick.multiplier };
      entry.picked.push(pick.listing_id);
      byToken.set(pick.token, entry);
    }
    for (const pick of picks) {
      await sql.query(
        `update crown_predictions set settled = true, won = ($1::text is not null and listing_id = $1) where id = $2`,
        [winnerId, pick.id],
      );
    }
    for (const [token, entry] of byToken) {
      const won = winnerId != null && entry.picked.includes(winnerId);
      const prev = await sql.query<{ points: number; wins: number; streak: number; best_streak: number }>(
        `select points, wins, streak, best_streak from crown_scores where site = $1 and token = $2`,
        [site, token],
      );
      const base = prev[0] ?? { points: 0, wins: 0, streak: 0, best_streak: 0 };
      const points = Number(base.points) + (won ? pointsForWin(entry.mult) : 0);
      const wins = Number(base.wins) + (won ? 1 : 0);
      const streak = won ? Number(base.streak) + 1 : 0;
      const bestStreak = Math.max(Number(base.best_streak), streak);
      await sql.query(
        `insert into crown_scores (site, token, handle, points, wins, streak, best_streak)
         values ($1, $2, $3, $4, $5, $6, $7)
         on conflict (site, token) do update
           set handle = excluded.handle,
               points = excluded.points,
               wins = excluded.wins,
               streak = excluded.streak,
               best_streak = excluded.best_streak,
               updated_at = now()`,
        [site, token, entry.handle, points, wins, streak, bestStreak],
      );
    }
  }
}

function toCandidate(row: {
  id: string;
  rank: number | null;
  title: string;
  team: string;
  url: string;
  bid_cents: number;
  pick_count: number;
}): Omit<CrownCandidate, "picked" | "isLeader"> {
  return {
    id: row.id,
    rank: row.rank == null ? null : Number(row.rank),
    title: row.title,
    url: row.url,
    bidCents: Number(row.bid_cents),
    pickCount: Number(row.pick_count),
  };
}

export const getCrown = createServerFn({ method: "GET" })
  .validator(z.object({ site: siteEnum, token: z.string().min(4).max(80), handle: z.string().max(64) }).parse)
  .handler(async ({ data }): Promise<CrownPayload> => {
    const sql = await getSql();
    await settleClosedRounds(sql, data.site);
    const now = new Date();
    const roundDay = utcDayKey(now);
    const listings = await sql.query<{
      id: string;
      rank: number | null;
      title: string;
      team: string;
      url: string;
      bid_cents: number;
    }>(
      `select id, rank, title, team, url, bid_cents
       from listings where site = $1 and bid_cents > 0
       order by bid_cents desc, last_bid_at asc, id asc limit 10`,
      [data.site],
    );
    const counts = await sql.query<{ listing_id: string; pick_count: number }>(
      `select listing_id, count(*)::int as pick_count from crown_predictions
       where site = $1 and round = $2 and settled = false
       group by listing_id`,
      [data.site, roundDay],
    );
    const pickCounts = new Map(counts.map((c) => [c.listing_id, Number(c.pick_count)]));
    const myPicks = await sql.query<{ listing_id: string }>(
      `select listing_id from crown_predictions where site = $1 and token = $2 and round = $3 and settled = false`,
      [data.site, data.token, roundDay],
    );
    const myPickIds = new Set(myPicks.map((p) => p.listing_id));
    const scoreRow = await sql.query<{
      points: number;
      wins: number;
      streak: number;
      best_streak: number;
    }>(`select points, wins, streak, best_streak from crown_scores where site = $1 and token = $2`, [
      data.site,
      data.token,
    ]);
    const passExpiry = await getActivePassExpiry(sql, data.site, data.token);
    const hasPass = passExpiry !== null;
    const leaderRows = await sql.query<{
      token: string;
      handle: string;
      points: number;
      wins: number;
      streak: number;
      is_oracle: boolean;
    }>(
      `select s.token, s.handle, s.points, s.wins, s.streak,
              exists(select 1 from crown_passes p where p.site = s.site and p.token = s.token and p.expires_at > now()) as is_oracle
       from crown_scores s
       where s.site = $1
       order by s.points desc, s.wins desc, s.streak desc, s.handle asc
       limit 10`,
      [data.site],
    );
    const lastResultRow = await sql.query<{ round: string; listing_id: string | null }>(
      `select round, listing_id from crown_predictions
       where site = $1 and settled = true and won = true
       order by round desc limit 1`,
      [data.site],
    );
    let lastResult: CrownPayload["lastResult"] = null;
    if (lastResultRow[0]) {
      const lr = lastResultRow[0];
      const winner = await sql.query<{ title: string; id: string }>(
        `select id, title from listings where id = $1`,
        [lr.listing_id ?? ""],
      );
      const myWin = await sql.query<{ n: number }>(
        `select count(*)::int as n from crown_predictions
         where site = $1 and token = $2 and round = $3 and settled = true and won = true`,
        [data.site, data.token, lr.round],
      );
      lastResult = {
        roundDay: lr.round,
        winnerId: lr.listing_id,
        winnerTitle: winner[0]?.title ?? null,
        youWon: Number(myWin[0]?.n ?? 0) > 0,
      };
    }
    const me: CrownMe = {
      token: data.token,
      handle: sanitizeHandle(data.handle),
      points: Number(scoreRow[0]?.points ?? 0),
      wins: Number(scoreRow[0]?.wins ?? 0),
      streak: Number(scoreRow[0]?.streak ?? 0),
      bestStreak: Number(scoreRow[0]?.best_streak ?? 0),
      picks: [...myPickIds],
      hasPass,
      passExpiresAt: passExpiry,
      pickLimit: pickLimit(hasPass),
    };
    const candidates: CrownCandidate[] = listings.map((l) => ({
      ...toCandidate({ ...l, pick_count: pickCounts.get(l.id) ?? 0 }),
      picked: myPickIds.has(l.id),
      isLeader: l.rank === 1,
    }));
    return {
      site: data.site,
      roundDay,
      closesAt: roundClosesAt(roundDay).toISOString(),
      candidates,
      me,
      leaderboard: leaderRows.map((r) => ({
        handle: r.handle,
        points: Number(r.points),
        wins: Number(r.wins),
        streak: Number(r.streak),
        isOracle: Boolean(r.is_oracle),
        isYou: r.token === data.token,
      })) as CrownLeader[],
      lastResult,
    };
  });

export const placeCrownPick = createServerFn({ method: "POST" })
  .validator(
    z
      .object({
        site: siteEnum,
        token: z.string().min(4).max(80),
        handle: z.string().max(64),
        listingId: z.string().min(1),
        replaceId: z.string().min(1).optional(),
      })
      .parse,
  )
  .handler(async ({ data }) => {
    const sql = await getSql();
    await settleClosedRounds(sql, data.site);
    const now = new Date();
    const round = utcDayKey(now);
    const handle = sanitizeHandle(data.handle);
    const listing = await sql.query<{ id: string }>(
      `select id from listings where id = $1 and site = $2 and bid_cents > 0`,
      [data.listingId, data.site],
    );
    if (!listing[0]) throw new Error("That listing is not on the board.");
    let picks = await sql.query<{ id: string; listing_id: string }>(
      `select id, listing_id from crown_predictions where site = $1 and token = $2 and round = $3 and settled = false`,
      [data.site, data.token, round],
    );
    if (data.replaceId) {
      if (!picks.some((p) => p.id === data.replaceId)) throw new Error("Pick no longer exists.");
      await sql.query(
        `delete from crown_predictions where id = $1 and site = $2 and token = $3 and round = $4`,
        [data.replaceId, data.site, data.token, round],
      );
      picks = picks.filter((p) => p.id !== data.replaceId);
    }
    if (picks.some((p) => p.listing_id === data.listingId)) {
      throw new Error("Already picked that listing this round.");
    }
    const passExpiry = await getActivePassExpiry(sql, data.site, data.token);
    const limit = pickLimit(passExpiry !== null);
    if (picks.length >= limit) {
      throw errorOrMessage(limit);
    }
    const id = makeId("crn");
    await sql.query(
      `insert into crown_predictions (id, site, round, token, handle, listing_id, multiplier)
       values ($1, $2, $3, $4, $5, $6, $7)`,
      [id, data.site, round, data.token, handle, data.listingId, passExpiry ? ORACLE_MULTIPLIER : 1],
    );
    return {
      picks: [...picks.map((p) => p.listing_id), data.listingId],
      limit,
    };
  });

function errorOrMessage(limit: number): Error {
  return new Error(
    limit >= ORACLE_PICKS_PER_ROUND
      ? "Pick limit reached. Remove one or upgrade to Oracle."
      : "One pick a day on the free tier. Remove it or get the Oracle Pass.",
  );
}

export const removeCrownPick = createServerFn({ method: "POST" })
  .validator(z.object({ site: siteEnum, token: z.string().min(4).max(80), listingId: z.string().min(1) }).parse)
  .handler(async ({ data }) => {
    const sql = await getSql();
    const round = utcDayKey();
    await sql.query(
      `delete from crown_predictions where site = $1 and token = $2 and round = $3 and listing_id = $4 and settled = false`,
      [data.site, data.token, round, data.listingId],
    );
    return { ok: true };
  });

export const createOracleOrder = createServerFn({ method: "POST" })
  .validator(z.object({ site: siteEnum, token: z.string().min(4).max(80), handle: z.string().max(64) }).parse)
  .handler(async ({ data }) => {
    const sql = await getSql();
    const handle = sanitizeHandle(data.handle);
    const orderId = makeId("ord");
    const session = await createCashfreeSession({
      orderId,
      amountCents: ORACLE_PASS_CENTS,
      email: undefined,
      note: `Oracle Pass — 7 days of extra picks, 5x points and crowd odds on ${data.site}.`,
      returnUrl: `${appOrigin()}/${data.site}/checkout/${orderId}`,
    });
    if (!session.live) {
      throw new Error("Cashfree did not return a live payment session.");
    }
    const payload = {
      token: data.token,
      handle,
      paymentSessionId: session.paymentSessionId,
      gatewayLive: session.live,
      gatewayMode: session.mode,
      inrRupees: session.inrRupees,
      inrPerUsd: session.inrPerUsd,
      fxSource: session.fxSource,
    };
    await sql.query(
      `insert into orders (id, site, kind, amount_cents, status, listing_id, manage_token, payload)
       values ($1, $2, 'oracle', $3, 'pending', null, null, $4::jsonb)`,
      [orderId, data.site, ORACLE_PASS_CENTS, JSON.stringify(payload)],
    );
    return { orderId };
  });


