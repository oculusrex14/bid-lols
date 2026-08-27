import { createServerFn } from "@tanstack/react-start";

/**
 * Client-safe wrappers around the server-only analytics primitives
 * (analytics.server.ts).
 *
 * Phase 00.6 (WS3): the server functions take NO product key from the
 * client. The browser can no longer choose which product receives a metric —
 * the server determines the origin product from the request Host header
 * (serverProductKey()) inside the handler. The client payload therefore
 * carries nothing: there is no data here that "genuinely must come from
 * the client".
 *
 * Metric semantics (documented precisely, AC-3.3):
 *  - views   = page impressions: one increment per server-rendered page load
 *              and per client-side route impression (TrackProductView fires
 *              once on mount).
 *  - visits  = per-browser-session, per-product deduped count: at most one
 *              increment while session storage works; when sessionStorage is
 *              UNAVAILABLE the call deliberately degrades to one increment
 *              per impression (documented, tested — NOT a "unique visitor"
 *              metric, and never labelled as one).
 *  - clicks  = outbound link clicks: one increment per click on a link that
 *              leaves the network.
 *
 * None of these are exposed publicly as bidder/sponsor statistics; that
 * would require an explicit fraud/dedup semantics specification first
 * (AC-3.4).
 */

async function runServer<T>(
  run: (mod: typeof import("@/lib/analytics.server")) => Promise<T>,
): Promise<T> {
  if (!import.meta.env.SSR) {
    throw new Error("analytics server functions must run server-side");
  }
  return run(await import("@/lib/analytics.server"));
}

export const trackPageView = createServerFn({ method: "POST" }).handler(async () => {
  await runServer((m) => m.recordPageView());
});

export const trackVisit = createServerFn({ method: "POST" }).handler(async () => {
  await runServer((m) => m.recordVisit());
});

/** No pre-launch UI calls this yet — the server-side primitive exists and is
 *  covered by tests, so outbound clicks are represented independently the
 *  moment Phase 01 ships outbound links. */
export const trackOutboundClick = createServerFn({ method: "POST" }).handler(async () => {
  await runServer((m) => m.recordOutboundClick());
});
