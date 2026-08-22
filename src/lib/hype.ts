/** Temporary hype: display-only multiplier for site views and visits. */

export const HYPE_START = 6;
export const HYPE_END = 1;
export const HYPE_DAYS = 21;
export const HYPE_LOCK_DAILY_VISITS = 8000;
export const DAY_MS = 86_400_000;

/** Stable per-board start factor in [1.2, 6]. Stored on site_stats.hype_factor. */
export function randomHypeFactor() {
  return Math.round((1.2 + Math.random() * (HYPE_START - 1.2)) * 100) / 100;
}

export function elapsedHypeDays(launchedAt: Date | string, now = new Date()) {
  const start = new Date(launchedAt).getTime();
  if (!Number.isFinite(start)) return HYPE_DAYS;
  return Math.max(0, Math.floor((now.getTime() - start) / DAY_MS));
}

/**
 * Day 1 uses the board's own start factor (random, up to 6× — not a shared
 * flat 6×). Steps down linearly every 24h to 1× after 21 days.
 */
export function hypeMultiplier(opts: {
  launchedAt: Date | string;
  locked: boolean;
  start?: number;
  now?: Date;
}) {
  if (opts.locked) return HYPE_END;
  const days = elapsedHypeDays(opts.launchedAt, opts.now ?? new Date());
  if (days >= HYPE_DAYS) return HYPE_END;
  const start = clampStart(opts.start);
  return start - ((start - HYPE_END) * days) / HYPE_DAYS;
}

function clampStart(value: number | undefined) {
  const n = Number(value);
  if (!Number.isFinite(n)) return HYPE_START;
  return Math.min(HYPE_START, Math.max(HYPE_END, n));
}

export function displayCount(real: number, multiplier: number) {
  const n = Math.round(Number(real) * multiplier);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export function formatCount(n: number) {
  return Math.round(n).toLocaleString("en-US");
}
