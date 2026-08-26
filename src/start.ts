import {
  createCsrfMiddleware,
  createMiddleware,
  createStart,
} from "@tanstack/react-start";
import { isStaleServerFnError, staleServerFnResponse } from "@/lib/serverfn-guard";

/**
 * Start entry (Phase 00.5, WS7). Providing this file replaces the framework
 * default (a start instance with no options), so the DEFAULT CSRF middleware
 * must be included here explicitly — it is, first in the chain.
 *
 * Request middleware chain (outer → inner):
 *  1. CSRF — the framework default, scoped to serverFn requests;
 *  2. stale-serverFn guard — converts the framework resolver's
 *     `Server function info not found` rejection (a browser bundle from an
 *     older deployment) into a graceful 404 JSON + a warn log, instead of an
 *     unhandled 500 with a stack trace. Genuine handler errors are caught
 *     inside the handler and never reach this guard (AC-7.2).
 */
const csrfMiddleware = createCsrfMiddleware({
  filter: (ctx) => ctx.handlerType === "serverFn",
});

const staleServerFnGuard = createMiddleware().server(
  async ({ handlerType, next }) => {
    // Router (page) requests pass through untouched — no await, so the
    // streaming response semantics the framework relies on are preserved.
    if (handlerType !== "serverFn") return next();
    try {
      return await next();
    } catch (err) {
      if (isStaleServerFnError(err)) {
        console.warn(
          "[serverfn] stale or unknown server function id — the client " +
            "bundle predates this deployment; a refresh will fix it. " +
            "Returning a graceful 404 instead of an unhandled 500.",
        );
        return staleServerFnResponse();
      }
      throw err; // genuine failure — surface it exactly as before
    }
  },
);

// This runtime's createStart takes a getOptions FUNCTION (calling the
// argument directly), not the options object the type signature advertises.
export const startInstance = createStart(() => ({
  requestMiddleware: [csrfMiddleware, staleServerFnGuard],
}));
