/** Temporary hype: display-only multiplier for site views and visits. */

export const HYPE_START = 6;
export const HYPE_END = 1;
export const HYPE_DAYS = 21;
export const HYPE_LOCK_DAILY_VISITS = 8000;
export const DAY_MS = 86_400_000;

export function elapsedHypeDays(launchedAt: Date | string, now = new Date()) {
  const start = new Date(launchedAt).getTime();
  if (!Number.isFinite(start)) return HYPE_DAYS;
  return Math.max(0, Math.floor((now.getTime() - start) / DAY_MS));
}

/**
 * 6× on day 1 (elapsed 0). Steps down linearly every 24h.
 * Exactly 1× after 21 days. Locked (or past window) stays 1×.
 */
export function hypeMultiplier(opts: {
  launchedAt: Date | string;
  locked: boolean;
  now?: Date;
}) {
  if (opts.locked) return HYPE_END;
  const days = elapsedHypeDays(opts.launchedAt, opts.now ?? new Date());
  if (days >= HYPE_DAYS) return HYPE_END;
  return HYPE_START - ((HYPE_START - HYPE_END) * days) / HYPE_DAYS;
}

export function displayCount(real: number, multiplier: number) {
  const n = Math.round(Number(real) * multiplier);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export function formatCount(n: number) {
  return Math.round(n).toLocaleString("en-US");
}
