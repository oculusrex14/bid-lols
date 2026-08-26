/**
 * Stale-server-function guard (Phase 00.5, WS7 / AC-7.1..7.3).
 *
 * Background: TanStack Start resolves server functions against a build-time
 * manifest. When a browser still runs a bundle from an OLDER deployment, its
 * serverFn ids no longer exist in the new manifest, and the framework's
 * resolver throws `Server function info not found for <id>` — outside the
 * handler's own error boundary — which surfaces as an unhandled 500 with a
 * full stack trace in the logs.
 *
 * The guard is a Start request middleware (registered in src/start.ts) that
 * runs inside the server-function dispatch chain: it converts exactly that
 * rejection into a graceful 404 JSON response and downgrades the log to a
 * warn. Genuine handler failures are NOT affected — they are caught inside
 * the handler's own try/catch and returned as serialized 5xx responses, so
 * they never reach this guard as a rejection.
 *
 * This module is pure (testable under plain node); the middleware wiring
 * lives in src/start.ts.
 */

/** The exact message the framework resolver throws for a missing id. */
const STALE_PATTERN = /^Server function info not found for /;

export function isStaleServerFnError(err: unknown): boolean {
  return err instanceof Error && STALE_PATTERN.test(err.message);
}

/**
 * The graceful response for a stale/unknown server function id: 404 + a
 * machine-readable body. The outer request-id Nitro middleware adds the
 * x-request-id header (and, for JSON accepts, normalizes the body into the
 * standard {code, message, requestId} envelope) — so the client always sees
 * one coherent 404, never an unhandled 500.
 */
export function staleServerFnResponse(): Response {
  return new Response(
    JSON.stringify({
      code: "stale_client_bundle",
      message:
        "This page's app build is older than the server. Refresh to load the current version.",
    }),
    {
      status: 404,
      headers: { "content-type": "application/json; charset=utf-8" },
    },
  );
}
