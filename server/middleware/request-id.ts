/**
 * Request-id + structured-error envelope (Phase 00, FR-10 / AC-18).
 *
 * - Every response carries `x-request-id` (generated here; a response that
 *   already set its own — e.g. the webhook envelope — keeps it, so header and
 *   body id match).
 * - Client errors (4xx/5xx) that answered an `Accept: application/json`
 *   request are converted to a machine-readable `{ code, message, requestId }`
 *   envelope instead of an HTML error page.
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

  const status = result.status;
  const wantsJson = String(event.req.headers.get("accept") ?? "").includes(
    "application/json",
  );

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
      try {
        const text = await result.text();
        const parsed: unknown = JSON.parse(text);
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
        return result;
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
