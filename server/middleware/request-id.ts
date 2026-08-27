/**
 * Request-id + structured-error envelope (Phase 00, FR-10 / AC-18).
 *
 * - Every response carries `x-request-id` (generated here; a response that
 *   already set its own — e.g. the webhook envelope — keeps it, so header and
 *   body id match).
 * - Client errors (4xx/5xx) that answered an `Accept: application/json`
 *   request are converted to a machine-readable `{ code, message, requestId }`
 *   envelope instead of an HTML error page.
 * - The framework's unknown-route + JSON-Accept quirk (a missing page
 *   answered as 500 "Only HTML requests are supported here") is relabelled
 *   to its honest 404 before enveloping; genuine 500s on real routes are
 *   never touched (Phase 00.5, AC-6.5).
 * - 4xx/5xx are logged with the id, so a client can quote one id against one
 *   log line (AC-18 / G5).
 *
 * Runs BEFORE server/middleware/seo-host.ts (alphabetical), so it wraps every
 * response, including the SEO-injected HTML.
 */
import { randomUUID } from "node:crypto";

interface RequestIdEvent {
  url: URL;
  req: { method?: string; headers: Headers };
}

/**
 * Boundary-aware route classification (Phase 00.6, WS4-B).
 *
 * "Known" = the path has (or has) a real handler, so a 500 from it is GENUINE
 * and must stay a 500:
 *  - exact page/static routes (home + legal + robots/sitemap);
 *  - the two real API routes (everything else under /api/ is NOT a route);
 *  - the /_serverFn/ namespace (server-function dispatch);
 *  - the legacy 308 prefixes, boundary-aware (intercepted before Start).
 *
 * Everything else is an unknown path, whose only 500 source in this
 * framework is the JSON-Accept not-found quirk — relabelled to an honest
 * 404 below. `/termsXYZ`, `/privacy123`, `/api-whatever`, `/random` are all
 * unknown. NOTE: `/terms/` (trailing slash) is answered by the router with a
 * 307 → `/terms` (verified empirically), so a 500 can never originate from
 * it — it is classified "unknown" anyway (safe: the quirk relabel can never
 * mask a real failure there; see tests/request-id.test.ts).
 */
const KNOWN_EXACT_PATHS = new Set([
  "/",
  "/terms",
  "/privacy",
  "/refund",
  "/contact",
  "/robots.txt",
  "/sitemap.xml",
]);

/** The complete set of real API routes — /api/* is known ONLY for these. */
const KNOWN_API_PATHS = new Set(["/api/webhooks/cashfree", "/api/favicon"]);

const LEGACY_PREFIXES = ["/founders", "/culture", "/bidception", "/spec"];

export function isKnownRoute(pathname: string): boolean {
  if (KNOWN_EXACT_PATHS.has(pathname)) return true;
  if (KNOWN_API_PATHS.has(pathname)) return true;
  if (pathname.startsWith("/_serverFn/")) return true;
  return LEGACY_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

/** Pure, unit-testable decision: should a 500 JSON-Accept response be relabelled to 404? */
export function isUnknownRouteJsonQuirk(pathname: string, status: number, wantsJson: boolean): boolean {
  return status === 500 && wantsJson && !isKnownRoute(pathname);
}

function codeFor(status: number): string {
  if (status === 401) return "unauthorized";
  if (status === 404) return "not_found";
  if (status === 405) return "method_not_allowed";
  if (status === 409) return "conflict";
  if (status >= 500) return "internal_error";
  return "error";
}

function messageFor(status: number): string {
  if (status === 404) return "Resource not found.";
  if (status >= 500) return "Internal server error.";
  return "Request failed.";
}

export default async function requestIdMiddleware(
  event: RequestIdEvent,
  next: () => unknown | Promise<unknown>,
): Promise<unknown> {
  const requestId = randomUUID();
  const result = await next();

  if (!(result instanceof Response)) return result;

  const headers = new Headers(result.headers);
  if (!headers.get("x-request-id")) headers.set("x-request-id", requestId);

  let status = result.status;
  const wantsJson = String(event.req.headers.get("accept") ?? "").includes(
    "application/json",
  );

  // Framework quirk (deterministic, not a server failure): an UNKNOWN route
  // requested with `Accept: application/json` makes Start answer 500
  // ("Only HTML requests are supported here") instead of 404. Genuine routes
  // are excluded from the relabel (isUnknownRouteJsonQuirk), so a real 500
  // is never masked — only the missing-page case gets its honest 404
  // (Phase 00.5, AC-6.5).
  if (isUnknownRouteJsonQuirk(event.url.pathname, status, wantsJson)) {
    status = 404;
  }

  if (status >= 400 && wantsJson) {
    const envelope = JSON.stringify({
      code: codeFor(status),
      message: messageFor(status),
      requestId,
    });
    const isJson = headers.get("content-type")?.includes("application/json") === true;

    if (isJson) {
      // Keep handler-authored envelopes (they carry their own specific code
      // and requestId, e.g. the webhook 401/400/409 shapes); normalize any
      // generic JSON error body (e.g. the router's "Only HTML requests" 500)
      // to the standard envelope so header id === body id always.
      let specific = false;
      let specificText: string | null = null;
      try {
        specificText = await result.text(); // consumes the body — see below
        const parsed: unknown = JSON.parse(specificText);
        if (
          parsed !== null &&
          typeof parsed === "object" &&
          "requestId" in parsed &&
          "code" in parsed
        ) {
          specific = true;
        }
      } catch {
        specific = false;
      }
      if (specific) {
        if (status === 404 || status >= 500) {
          console.error(
            `[request ${requestId}] ${event.req.method ?? "GET"} ${event.url.pathname} -> ${status}`,
          );
        }
        // The specific-envelope check consumed `result`'s body — return a
        // FRESH response carrying the same body (returning the consumed
        // original would send an empty body, Phase 00.6 WS4 regression).
        return new Response(specificText, {
          status,
          statusText: result.statusText,
          headers,
        });
      }
    }

    if (status === 404 || status >= 500) {
      console.error(
        `[request ${requestId}] ${event.req.method ?? "GET"} ${event.url.pathname} -> ${status}`,
      );
    }
    const jsonHeaders = new Headers(headers);
    jsonHeaders.set("content-type", "application/json; charset=utf-8");
    jsonHeaders.delete("content-length");
    return new Response(envelope, {
      status,
      statusText: result.statusText,
      headers: jsonHeaders,
    });
  }

  if (status >= 400 && (status === 404 || status >= 500)) {
    console.error(
      `[request ${requestId}] ${event.req.method ?? "GET"} ${event.url.pathname} -> ${status}`,
    );
  }

  return new Response(result.body, {
    status,
    statusText: result.statusText,
    headers,
  });
}
