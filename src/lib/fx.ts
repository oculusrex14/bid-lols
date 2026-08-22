/** Live USD → INR for Cashfree India checkout. Cached in-process. */

const FALLBACK_INR_PER_USD = 85;
const CACHE_MS = 15 * 60 * 1000;

type FxQuote = {
  inrPerUsd: number;
  source: "live" | "fallback";
  asOf: string | null;
};

let cache: { quote: FxQuote; fetchedAt: number } | null = null;

function envFallbackRate() {
  const n = Number(process.env.INR_PER_USD || FALLBACK_INR_PER_USD);
  return Number.isFinite(n) && n > 0 ? n : FALLBACK_INR_PER_USD;
}

/** Optional merchant markup on mid-market FX, e.g. `2` = +2%. Default 0. */
function markupPercent() {
  const n = Number(process.env.FX_MARKUP_PERCENT || "0");
  return Number.isFinite(n) && n >= 0 ? Math.min(n, 25) : 0;
}

async function fetchLiveUsdInr(): Promise<FxQuote | null> {
  const res = await fetch("https://open.er-api.com/v6/latest/USD", {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(6_000),
  });
  if (!res.ok) return null;
  const json = (await res.json()) as {
    result?: string;
    rates?: { INR?: number };
    time_last_update_utc?: string;
  };
  const mid = Number(json.rates?.INR);
  if (json.result !== "success" || !Number.isFinite(mid) || mid <= 0) return null;
  const markup = markupPercent();
  const charged = mid * (1 + markup / 100);
  return {
    inrPerUsd: Math.round(charged * 10000) / 10000,
    source: "live",
    asOf: json.time_last_update_utc ?? null,
  };
}

export async function getUsdInrQuote(): Promise<FxQuote> {
  const now = Date.now();
  if (cache && now - cache.fetchedAt < CACHE_MS) return cache.quote;
  try {
    const live = await fetchLiveUsdInr();
    if (live) {
      cache = { quote: live, fetchedAt: now };
      return live;
    }
  } catch {
    /* use fallback */
  }
  const fallback: FxQuote = {
    inrPerUsd: envFallbackRate(),
    source: "fallback",
    asOf: null,
  };
  cache = { quote: fallback, fetchedAt: now };
  return fallback;
}

export function usdCentsToInrRupees(amountCents: number, inrPerUsd: number) {
  const dollars = Math.max(0, Number(amountCents) / 100);
  const rate = Number.isFinite(inrPerUsd) && inrPerUsd > 0 ? inrPerUsd : envFallbackRate();
  return Math.max(1, Math.round(dollars * rate));
}
