/**
 * RC5.1 WS6 / RC5.2: the ONE server-side viewer-region / default-currency
 * resolver.
 *
 * This is UX DEFAULTING ONLY (currency-law concept B): it chooses which
 * currency's samples to render, which currency a NEW form starts in, and
 * which currency's Market Rates are shown first. It is NEVER payment
 * authority, and it NEVER determines the currency of an already-created work
 * item (that is persisted at creation/funding, law concept A).
 *
 * Country source (RC5.2): the trusted Vercel proxy header
 * `x-vercel-ip-country` — "A two-character ISO 3166-1 country code for the
 * country associated with the location of the requester's public IP address"
 * (vercel.com/docs/headers/request-headers; Vercel's own
 * packages/functions/src/headers.ts COUNTRY_HEADER_NAME). It is calculated
 * by the Vercel proxy from the original client IP, not settable by the
 * page, and is the documented client-country header.
 *
 * (RC5.1's first cut read `x-vercel-sc` — the country of the EDGE that
 * served the request — which is Vercel's server location, not the viewer's.
 * That was wrong and is replaced here.)
 *
 * Policy (deployed): `IN` -> INR, any other value or missing -> USD. No AUD
 * in this phase.
 *
 * Policy (non-deployed): an explicit `DEFAULT_VIEWER_CURRENCY=INR|USD`
 * override for local development and tests; otherwise USD. The override is
 * honored ONLY outside deployed runtimes — a client form field (or any other
 * non-edge source) can never pick a payment currency.
 *
 * Only the safe string ("INR" | "USD") crosses to components. Raw
 * infrastructure headers never do.
 */
import type { SupportedCurrency } from "@/lib/money";

/** The Vercel proxy's client-country request header (documented contract). */
export const VERCEL_COUNTRY_HEADER = "x-vercel-ip-country";

type HeaderSource = { get(name: string): string | null };

export function isDeployedRuntime(env: NodeJS.ProcessEnv = process.env): boolean {
  return Boolean(env.VERCEL_ENV) || env.NODE_ENV === "production";
}

/**
 * Pure resolver (exported for tests): given a header source and an env,
 * return the viewer default currency. IN -> INR; any other or missing
 * country -> USD in deployed runtimes; explicit override outside deployed
 * runtimes only.
 */
export function viewerCurrencyFromHeaders(
  headers: HeaderSource,
  env: NodeJS.ProcessEnv = process.env,
): SupportedCurrency {
  if (!isDeployedRuntime(env)) {
    const override = (env.DEFAULT_VIEWER_CURRENCY ?? "").trim().toUpperCase();
    if (override === "INR" || override === "USD") return override;
    return "USD";
  }
  const country = (headers.get(VERCEL_COUNTRY_HEADER) ?? "").trim().toUpperCase();
  return country === "IN" ? "INR" : "USD";
}

/**
 * Request-scoped reader: resolves the viewer currency for the current
 * request. Falls back to the env-only path when there is no request context
 * (tests, scripts, boot).
 */
export async function getViewerCurrency(): Promise<SupportedCurrency> {
  try {
    const { getRequest } = await import("@tanstack/react-start/server");
    const request = getRequest();
    if (!request) return viewerCurrencyFromHeaders(new Headers());
    return viewerCurrencyFromHeaders(request.headers);
  } catch {
    return viewerCurrencyFromHeaders(new Headers());
  }
}
