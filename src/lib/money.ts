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

/* ---------------------------------------------------------------------------
 * RC5.1 WS5: the explicit ISO-currency registry. The ONLY place currency
 * presentation rules live; components never branch on currency themselves.
 * Two supported WORK currencies: INR (India) and USD (everywhere else).
 * No FX anywhere in this release — a USD amount is never read as INR paise
 * and vice versa (see the BI-1.0 gate in src/lib/trust/score-core.ts).
 * ------------------------------------------------------------------------- */

export type SupportedCurrency = "INR" | "USD";

export const SUPPORTED_CURRENCIES: readonly SupportedCurrency[] = ["INR", "USD"];

export interface CurrencyConfig {
  code: SupportedCurrency;
  locale: string;
  minorDigits: number;
  symbol: string;
}

export const CURRENCY_CONFIG: Record<SupportedCurrency, CurrencyConfig> = {
  INR: { code: "INR", locale: "en-IN", minorDigits: 2, symbol: "₹" },
  USD: { code: "USD", locale: "en-US", minorDigits: 2, symbol: "$" },
};

/**
 * Coerce a stored currency code to the supported registry. Fails VISIBLY on
 * anything unknown — a record's currency is provenance, and silently
 * assuming INR for a corrupted/foreign value is exactly the contamination
 * this release exists to prevent.
 */
export function toSupportedCurrency(code: string): SupportedCurrency {
  const c = (code ?? "").toUpperCase() as SupportedCurrency;
  if (c === "INR" || c === "USD") return c;
  throw new Error(`toSupportedCurrency: unsupported currency code "${code}"`);
}

export function currencySymbol(currency: SupportedCurrency): string {
  return CURRENCY_CONFIG[currency].symbol;
}

/** INR-first formatter; explicit currency code required (FR: currency-explicit). */
export function formatMinor(minor: number, currency: SupportedCurrency = "INR"): string {
  if (!Number.isInteger(minor)) throw new Error(`formatMinor: not an integer: ${minor}`);
  if (!(currency in CURRENCY_CONFIG)) {
    throw new Error(`formatMinor: unsupported currency "${currency}"`);
  }
  const cfg = CURRENCY_CONFIG[currency];
  const value = minor / 10 ** cfg.minorDigits;
  return new Intl.NumberFormat(cfg.locale, {
    style: "currency",
    currency: cfg.code,
    minimumFractionDigits: cfg.minorDigits,
    maximumFractionDigits: cfg.minorDigits,
  }).format(value);
}

/**
 * Display-only variant of formatMinor (RC5 §29 / RC5.1 WS4): when minor units
 * are exactly zero the marketing surfaces prefer "₹1,00,000" / "$1,000" over
 * "₹1,00,000.00" / "$1,000.00". Nonzero paise/cents stay visible
 * ("₹1,00,000.50", "$1,000.50") — money is never rounded away, and
 * accounting/detail surfaces keep using formatMinor().
 */
export function formatMinorTrimmed(minor: number, currency: SupportedCurrency = "INR"): string {
  if (!(currency in CURRENCY_CONFIG)) {
    throw new Error(`formatMinorTrimmed: unsupported currency "${currency}"`);
  }
  const cfg = CURRENCY_CONFIG[currency];
  if (minor % 10 ** cfg.minorDigits === 0) {
    const whole = minor / 10 ** cfg.minorDigits;
    return `${cfg.symbol}${whole.toLocaleString(cfg.locale, { maximumFractionDigits: 0 })}`;
  }
  return formatMinor(minor, currency);
}

/** Whole (major) units for form previews: symbol + locale grouping, 0 decimals. */
export function formatMajor(value: number, currency: SupportedCurrency = "INR"): string {
  if (!(currency in CURRENCY_CONFIG)) {
    throw new Error(`formatMajor: unsupported currency "${currency}"`);
  }
  const cfg = CURRENCY_CONFIG[currency];
  return `${cfg.symbol}${Number(value).toLocaleString(cfg.locale, { maximumFractionDigits: 0 })}`;
}

/** Work currencies accepted at authoritative boundaries (RC5.1: INR + USD). */
export const ACCEPTED_CURRENCIES = new Set<SupportedCurrency>(SUPPORTED_CURRENCIES);

export function isAcceptedCurrency(code: string): boolean {
  return ACCEPTED_CURRENCIES.has(code.toUpperCase() as SupportedCurrency);
}

/* ---------------------------------------------------------------------------
 * RC5.2: the ONE authoritative product-money policy per currency.
 *
 * Every minimum/launch rule lives HERE and is composed with CURRENCY_CONFIG
 * above (no duplicated scales or symbols). Server validation, client UX
 * validation, form copy, and sample-validity tests all derive from this
 * registry. These are product policy numbers per currency — NOT exchange
 * rate conversions: the INR and USD floors are independent launch decisions.
 * ------------------------------------------------------------------------- */

export interface CurrencyMoneyPolicy {
  /**
   * Minimum advertised bounty reward (launch product rule).
   *   INR: ₹1,000 = 100,000 paise
   *   USD: $50    = 5,000 cents
   * CultureBid's smaller creative commissions are why the USD floor is
   * $50, not a rupee floor reinterpreted in cents.
   */
  minBountyRewardMinor: number;
  /**
   * Minimum funded total budget for a Bidception parent work (team
   * projects are deliberately larger than single bounties; 1,000 major
   * units in either currency — ₹1,000 / $1,000 — is the launch scale).
   */
  minParentBudgetMajor: number;
}

export const CURRENCY_MONEY_POLICY: Record<SupportedCurrency, CurrencyMoneyPolicy> = {
  INR: { minBountyRewardMinor: 100_000, minParentBudgetMajor: 1_000 },
  USD: { minBountyRewardMinor: 5_000, minParentBudgetMajor: 1_000 },
};

export function minBountyRewardMinor(currency: SupportedCurrency): number {
  return CURRENCY_MONEY_POLICY[currency].minBountyRewardMinor;
}

/** Same floor in MAJOR units, derived from CURRENCY_CONFIG (never duplicated). */
export function minBountyRewardMajor(currency: SupportedCurrency): number {
  return CURRENCY_MONEY_POLICY[currency].minBountyRewardMinor / 10 ** CURRENCY_CONFIG[currency].minorDigits;
}

export function minParentBudgetMajor(currency: SupportedCurrency): number {
  return CURRENCY_MONEY_POLICY[currency].minParentBudgetMajor;
}

/** Human-readable floor for form copy: "₹1,000" / "$50". */
export function bountyFloorCopy(currency: SupportedCurrency): string {
  return formatMajor(minBountyRewardMajor(currency), currency);
}

/**
 * Authoritative check used at server boundaries: does this minor-unit
 * reward satisfy the launch floor for its currency? Unknown currencies are
 * rejected, never assumed INR.
 */
export function meetsBountyRewardFloor(minor: number, currency: string): boolean {
  if (!Number.isInteger(minor) || minor <= 0) return false;
  const c = (currency ?? "").toUpperCase() as SupportedCurrency;
  if (c !== "INR" && c !== "USD") return false;
  return minor >= CURRENCY_MONEY_POLICY[c].minBountyRewardMinor;
}