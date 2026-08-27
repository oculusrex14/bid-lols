import { randomUUID } from "node:crypto";

/**
 * Stale-server-function guard (Phase 00.5, WS7; Phase 00.6, WS4-A).
 *
 * Background: TanStack Start resolves server functions against a build-time
 * manifest. When a browser still runs a bundle from an OLDER deployment, its
 * serverFn ids no longer exist in the new manifest, and the framework's
 * resolver throws `Server function info not found for <id>` — outside the
 * handler's own error boundary — which used to surface as an unhandled 500
 * with a stack trace.
 *
 * `staleServerFnGuard` is the Start request-middleware body (registered in
 * src/start.ts) that runs inside the server-function dispatch chain: it
 * converts exactly that rejection into a graceful 404 JSON response and
 * downgrades the log to a warn. The response carries its OWN requestId +
 * x-request-id so the outer request-id middleware keeps both (header ===
 * body), the `stale_client_bundle` code survives composition, and the client
 * always sees one coherent 404 — never an unhandled 500 (AC-4.1).
 *
 * Genuine handler failures are NOT affected: they are caught inside the
 * handler's own try/catch and returned as serialized 5xx responses, so they
 * never reach this guard as a rejection.
 *
 * This module is pure (testable under plain node — no Start runtime needed);
 * the middleware wiring lives in src/start.ts, and the COMPOSITION is
 * regression-tested in tests/middleware-composition.test.ts.
 */

/** The exact message the framework resolver throws for a missing id. */
const STALE_PATTERN = /^Server function info not found for /;

export function isStaleServerFnError(err: unknown): boolean {
  return err instanceof Error && STALE_PATTERN.test(err.message);
}

/**
 * The graceful response for a stale/unknown server function id: 404 + a
 * machine-readable body whose requestId matches the x-request-id header set
 * here. Because the response already carries x-request-id, the outer
 * request-id middleware preserves it, and because the body has code +
 * requestId, it passes the "specific envelope" check untouched — so AFTER
 * all middleware the client sees exactly this body with the matching header.
 */
export function staleServerFnResponse(): Response {
  const requestId = randomUUID();
  return new Response(
    JSON.stringify({
      code: "stale_client_bundle",
      message:
        "This page's app build is older than the server. Refresh to load the current version.",
      requestId,
    }),
    {
      status: 404,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "x-request-id": requestId,
      },
    },
  );
}

/**
 * The request-middleware body for `createMiddleware().server(...)`.
 * Kept as a plain (options) => result function so the guard plus the
 * middleware chain around it can be composed in integration tests without a
 * live Start runtime.
 */
export function staleServerFnGuard<R>(options: {
  handlerType: string;
  next: () => R | Promise<R>;
}): R | Promise<R> {
  // Router (page) requests pass through untouched — no await, so the
  // streaming response semantics the framework relies on are preserved.
  if (options.handlerType !== "serverFn") return options.next();
  const { next } = options;
  const run = async (): Promise<R> => {
    try {
      return await next();
    } catch (err) {
      if (isStaleServerFnError(err)) {
        const res = staleServerFnResponse();
        console.warn(
          `[serverfn ${res.headers.get("x-request-id")}] stale or unknown ` +
            "server function id — the client bundle predates this deployment; " +
            "a refresh will fix it. Returning a graceful 404 instead of an " +
            "unhandled 500.",
        );
        // A Response is a legal server-middleware result; R (the ctx
        // result of `next`) is the normal one — this cast is confined to
        // the stale-id branch, which the framework never reaches with a
        // real ctx.
        return res as unknown as R;
      }
      throw err; // genuine failure — surface it exactly as before
    }
  };
  return run();
}
