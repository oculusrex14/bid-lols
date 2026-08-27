import {
  createCsrfMiddleware,
  createMiddleware,
  createStart,
} from "@tanstack/react-start";
import { staleServerFnGuard } from "@/lib/serverfn-guard";

/**
 * Start entry (Phase 00.5, WS7; Phase 00.6, WS4-A). Providing this file
 * replaces the framework default (a start instance with no options), so the
 * DEFAULT CSRF middleware must be included here explicitly — it is, first in
 * the chain.
 *
 * Request middleware chain (outer → inner):
 *  1. CSRF — the framework default, scoped to serverFn requests;
 *  2. stale-serverFn guard (src/lib/serverfn-guard.ts) — converts the
 *     framework resolver's `Server function info not found` rejection (a
 *     browser bundle from an older deployment) into a graceful 404 JSON with
 *     a self-consistent requestId/x-request-id + a warn log. Genuine handler
 *     errors are caught inside the handler and never reach this guard.
 *
 * The guard body is extracted (not inlined here) so the COMPOSED behavior —
 * guard + outer Nitro request-id middleware — has an integration-level
 * regression test (tests/middleware-composition.test.ts, AC-4.1).
 */
const csrfMiddleware = createCsrfMiddleware({
  filter: (ctx) => ctx.handlerType === "serverFn",
});

const guardMiddleware = createMiddleware().server(
  ({ handlerType, next }) =>
    staleServerFnGuard({
      handlerType,
      next: () => next(),
    }),
);

// This runtime's createStart takes a getOptions FUNCTION (calling the
// argument directly), not the options object the type signature advertises.
export const startInstance = createStart(() => ({
  requestMiddleware: [csrfMiddleware, guardMiddleware],
}));
