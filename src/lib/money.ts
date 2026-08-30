/**
 * Money core (Phase 01, FR-6). Integer minor units ONLY — never floats.
 * India/INR is the launch market; currency stays an explicit parameter so a
 * second market is configuration, not a rewrite.
 *
 * THE fee constant lives here and nowhere else. Sponsor-side platform fee:
 * advertised reward is EXACTLY what winners receive; the fee is charged ON
 * TOP of the reward and disclosed before funding. No hidden deductions —
 * ever (product rule 6).
 */

/** Platform fee in basis points: 1000 bps = 10.00%. */
export const PLATFORM_FEE_BPS = 1000 as const;

export const BPS_MAX = 10_000 as const;

export function platformFeeBps(env: { PLATFORM_FEE_BPS?: string } = process.env): number {
  const parsed = Number.parseInt(env.PLATFORM_FEE_BPS ?? "", 10);
  if (Number.isInteger(parsed) && parsed >= 0 && parsed <= BPS_MAX) return parsed;
  return PLATFORM_FEE_BPS;
}

/** Round-half-up fee for an amount in minor units at `bps`. */
export function computeFee(amountMinor: number, bps: number = platformFeeBps()): number {
  if (!Number.isInteger(amountMinor) || amountMinor < 0) {
    throw new Error(`fee: amount must be a non-negative integer, got ${amountMinor}`);
  }
  if (!Number.isInteger(bps) || bps < 0 || bps > BPS_MAX) {
    throw new Error(`fee: bps out of range: ${bps}`);
  }
  return Math.round((amountMinor * bps) / BPS_MAX);
}

/**
 * The sponsor's charge decomposition for funding a reward pool:
 *   sponsorCharge = reward (advertised, unchanged) + platform fee
 * Tax/processing are added only when actually applicable (callers pass them
 * in explicitly — they are NEVER invented here).
 */
export function splitSponsorCharge(
  rewardMinor: number,
  bps: number = platformFeeBps(),
): { reward: number; platformFee: number; sponsorSubtotal: number } {
  const platformFee = computeFee(rewardMinor, bps);
  return {
    reward: rewardMinor,
    platformFee,
    sponsorSubtotal: rewardMinor + platformFee,
  };
}

/**
 * Distribute `poolMinor` across integer shares that sum EXACTLY to the pool
 * (largest-remainder, deterministic order = input order). Used by reward
 * allocations and compensation splits: rounding can never create or destroy
 * money.
 */
export function allocateEvenly(
  totalMinor: number,
  weights: number[],
): number[] {
  if (!Number.isInteger(totalMinor) || totalMinor < 0) {
    throw new Error(`allocateEvenly: invalid total ${totalMinor}`);
  }
  if (weights.length === 0) return [];
  const sum = weights.reduce((a, b) => a + b, 0);
  if (sum === 0) {
    // Equal split when all weights are zero (explicit caller intent).
    const base = Math.floor(totalMinor / weights.length);
    const out = weights.map(() => base);
    let remainder = totalMinor - base * weights.length;
    for (let i = 0; remainder > 0; i = (i + 1) % out.length, remainder -= 1) {
      out[i] += 1;
    }
    return out;
  }
  const raw = weights.map((w) => (totalMinor * w) / sum);
  const floors = raw.map((v) => Math.floor(v));
  let remainder = totalMinor - floors.reduce((a, b) => a + b, 0);
  // Distribute the remainder to the largest fractional parts (stable order).
  const order = raw
    .map((v, i) => ({ i, frac: v - Math.floor(v) }))
    .sort((a, b) => b.frac - a.frac || a.i - b.i);
  const out = floors.slice();
  for (const { i } of order) {
    if (remainder <= 0) break;
    out[i] += 1;
    remainder -= 1;
  }
  return out;
}

/** Sum invariant helper: the advertised allocation must equal the funded pool. */
export function sumAllocations(parts: number[]): number {
  return parts.reduce((a, b) => a + b, 0);
}

/** INR-first formatter; explicit currency code required (FR: currency-explicit). */
export function formatMinor(minor: number, currency: string = "INR"): string {
  if (!Number.isInteger(minor)) throw new Error(`formatMinor: not an integer: ${minor}`);
  // ISO-4217 minor-unit exponent: INR/USD/EUR have TWO (paise/cents); JPY/KRW
  // have zero. Getting this wrong misstates money by 100x — caught live in
  // Phase 01 browser verification (a ₹10,000 reward rendered as ₹10,00,000).
  const zeroDecimals = new Set(["JPY", "KRW"]);
  const decimals = zeroDecimals.has(currency) ? 0 : 2;
  const value = minor / 10 ** decimals;
  const formatted = value.toLocaleString("en-IN", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return `${currency === "INR" ? "₹" : `${currency} `}${formatted}`;
}

/**
 * Display-only variant of formatMinor (RC5 §29): when paise are exactly
 * zero the marketing surfaces prefer "₹1,00,000" over "₹1,00,000.00".
 * Nonzero paise stay visible ("₹1,00,000.50") — money is never rounded
 * away, and accounting/detail surfaces keep using formatMinor().
 */
export function formatMinorTrimmed(minor: number, currency: string = "INR"): string {
  const trimmed = currency === "INR" && minor % 100 === 0;
  if (trimmed) {
    const whole = Math.floor(minor / 100);
    return "₹" + whole.toLocaleString("en-IN");
  }
  return formatMinor(minor, currency);
}

/** Valid ISO-4217-ish currency codes accepted at boundaries (launch: INR only). */
export const ACCEPTED_CURRENCIES = new Set(["INR"]);

export function isAcceptedCurrency(code: string): boolean {
  return ACCEPTED_CURRENCIES.has(code.toUpperCase());
}