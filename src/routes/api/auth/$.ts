import { createFileRoute } from "@tanstack/react-router";
import { auth } from "@/lib/auth.server";

/**
 * Better Auth API mount (Phase 01, FR-1) — /api/auth/* is Better Auth's
 * endpoint surface (sign-in/sign-up/sign-out/session/verification). Requests
 * are delegated verbatim to `auth.handler`; cookies, CSRF/origin checks,
 * rate limiting and password hashing are internal to Better Auth.
 *
 * CSP note: this is a non-HTML endpoint; the security-headers middleware only
 * injects CSP into text/html responses, so no nonce handling is needed here.
 */
export const Route = createFileRoute("/api/auth/$")({
  component: () => null,
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => auth.handler(request),
      POST: async ({ request }: { request: Request }) => auth.handler(request),
    },
  },
});