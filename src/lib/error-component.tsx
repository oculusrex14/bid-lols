import type { ErrorComponentProps } from "@tanstack/react-router";
import { errorDetail } from "./error-copy";
import { TriangleAlert } from "lucide-react";

/**
 * Router-level error boundary: unexpected errors only (loader/SSR crashes,
 * client render failures). Missing routes get the designed NotFoundPage via
 * `defaultNotFoundComponent` (src/router.tsx) and never reach this component.
 *
 * P0 security rule (leaked in the RC3 /bounties incident): in PRODUCTION this
 * component must never render the raw `error.message` — that line is exactly
 * how "column b.creative does not exist" (a SQL error string) reached users.
 * Production shows neutral copy. The real underlying error (message + stack)
 * is written to the server log below, so internal logs retain it while the
 * response stays clean.
 *
 * Request ID: the request-id middleware (server/middleware/request-id.ts)
 * injects a fixed-position "Request ID: <id>" line into the SSR document,
 * BEFORE Start's hydration marker — outside the React tree, so hydration
 * can never wipe it. The value equals the `x-request-id` response header and
 * the `[request <id>] ... -> 500` server log line, so a user can quote one
 * id that correlates all three. Client-side errors (post-hydration) have no
 * request to quote; the line is simply absent ("if available").
 *
 * Development (`vite dev`) keeps the diagnostic message so the person
 * debugging sees what actually failed. The local built preview is a
 * production build (import.meta.env.PROD), so it renders the SANITIZED
 * copy — which is exactly the behavior you want to verify before release.
 */
const IS_PRODUCTION = import.meta.env?.PROD === true;

export function AppErrorComponent({ error }: ErrorComponentProps) {
  if (typeof window === "undefined") {
    // Server log retains the real underlying error, correlated with the
    // middleware's `[request <id>] GET /path -> 500` line for the same request.
    console.error("[route-error]", error);
  }
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 bg-bg px-6 text-center text-fg">
      <span className="text-danger" aria-hidden="true">
        <TriangleAlert className="size-10" strokeWidth={2} />
      </span>
      <h1 className="font-display text-2xl tracking-tight">Something went wrong</h1>
      <p className="max-w-md text-sm break-words text-muted">
        {errorDetail(IS_PRODUCTION, error.message)}
      </p>
    </main>
  );
}
