/**
 * The Crown — pure, dependency-free game math.
 *
 * Kept in its own file (no server imports) so the settlement/rank math can be
 * unit-tested under `npm test` without booting the app or a database.
 */

/** Free tier gets one pick per round per device. */
export const FREE_PICKS_PER_ROUND = 1;
/** Oracle Pass holders may hedge across up to this many picks per round. */
export const ORACLE_PICKS_PER_ROUND = 5;
/** Base points for a correct call; multiplied by the pick's multiplier. */
export const CROWN_WIN_POINTS = 100;
/** Points multiplier applied to a pick placed while an Oracle Pass is active. */
export const ORACLE_MULTIPLIER = 5;
/** Oracle Pass price in whole US dollars (charged in INR at checkout). */
export const ORACLE_PASS_DOLLARS = 5;
export const ORACLE_PASS_CENTS = ORACLE_PASS_DOLLARS * 100;
/** Oracle Pass duration. */
export const ORACLE_PASS_DAYS = 7;

const DAY_MS = 86_400_000;

/** UTC calendar-day key, e.g. "2026-08-25". One Crown round per UTC day. */
export function utcDayKey(date: Date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

/** The moment (UTC) at which the round for `day` closes — start of the next UTC day. */
export function roundClosesAt(day: string): Date {
  const [y, m, d] = day.split("-").map(Number);
  if (!y || !m || !d) return new Date(Date.now() + DAY_MS);
  return new Date(Date.UTC(y, m - 1, d) + DAY_MS);
}

/** Milliseconds until a round closes (floored at 0 once closed). */
export function msUntilClose(day: string, now: Date = new Date()): number {
  return Math.max(0, roundClosesAt(day).getTime() - now.getTime());
}

/** 1 → "00:00:00", 45000 → "00:12:30", 5_400_000 → "01:30:00". */
export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

/** How many picks this device may hold this round. */
export function pickLimit(hasPass: boolean): number {
  return hasPass ? ORACLE_PICKS_PER_ROUND : FREE_PICKS_PER_ROUND;
}

/** Points awarded for a single winning pick. */
export function pointsForWin(multiplier: number): number {
  return CROWN_WIN_POINTS * (Number.isFinite(multiplier) && multiplier > 0 ? Math.floor(multiplier) : 1);
}

export type ScoreState = {
  points: number;
  wins: number;
  streak: number;
  bestStreak: number;
};

/**
 * Fold one settled round into a predictor's standing.
 * A win adds points and extends the streak; a loss resets the streak to 0 but
 * keeps lifetime points/wins. bestStreak only ever grows.
 */
export function applySettlement(prev: ScoreState, won: boolean, pointsAwarded: number): ScoreState {
  const wins = prev.wins + (won ? 1 : 0);
  const streak = won ? prev.streak + 1 : 0;
  return {
    points: prev.points + (won ? pointsAwarded : 0),
    wins,
    streak,
    bestStreak: Math.max(prev.bestStreak, streak),
  };
}

/** Public tier label for the leaderboard, from lifetime wins. */
export function tierFor(wins: number): "Bronze" | "Silver" | "Gold" | "—" {
  if (wins >= 10) return "Gold";
  if (wins >= 3) return "Silver";
  if (wins >= 1) return "Bronze";
  return "—";
}
