/**
 * RC5.1 WS6: the ONE server-side viewer-region / default-currency resolver.
 *
 * This is UX DEFAULTING ONLY (currency-law concept B): it chooses which
 * currency's samples to render, which currency a NEW form starts in, and
 * which currency's Market Rates are shown first. It is NEVER payment
 * authority, and it NEVER determines the currency of an already-created work
 * item (that is persisted at creation/funding, law concept A).
 *
 * Policy (deployed): the trusted Vercel edge country header `x-vercel-sc`
 * (set by Vercel's edge, not client-controllable): IN -> INR, any other
 * value or missing -> USD. No AUD in this phase.
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

type HeaderSource = { get(name: string): string | null };

export function isDeployedRuntime(env: NodeJS.ProcessEnv = process.env): boolean {
  return Boolean(env.VERCEL_ENV) || env.NODE_ENV === "production";
}

/**
 * Pure resolver (exported for tests): given a header source and an env,
 * return the viewer default currency. Unknown/missing country => USD in
 * deployed runtimes; explicit override outside deployed runtimes.
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
  const sc = (headers.get("x-vercel-sc") ?? "").trim().toUpperCase();
  return sc === "IN" ? "INR" : "USD";
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
