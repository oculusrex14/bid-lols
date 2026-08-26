/**
 * Baseline web-security headers (Phase 00.5, WS8 / AC-8.1..8.4).
 *
 * Runs OUTERMOST (the "00-" prefix sorts before every other middleware), so
 * it sees the final response body — after the SEO head injection — and can
 * nonce the inline scripts it finds there:
 *
 *  - every response gets X-Content-Type-Options: nosniff, a strict
 *    Referrer-Policy, and a Permissions-Policy that denies camera /
 *    microphone / geolocation / interest-cohort;
 *  - text/html responses additionally get a Content-Security-Policy. The
 *    policy is NON-permissive: no `unsafe-inline` for scripts. The two
 *    inline scripts the Start SSR emits (the appearance boot script and the
 *    per-page stream-barrier script, whose content varies by page) receive a
 *    fresh per-request nonce injected into their <script> tags; external
 *    module scripts are same-origin ('self').
 *  - HSTS: NOT set here. Vercel already sends strict-transport-security on
 *    production domains; emitting a second one would conflict (AC-8.2).
 *  - The local Vite DEV server deliberately does not apply this middleware:
 *    HMR injects inline scripts that cannot be nonced (AC-8.4). Built
 *    (preview/prod) runtimes get the full baseline.
 */
import { randomBytes } from "node:crypto";

interface SecEvent {
  url: URL;
  req: { method?: string; headers: Headers };
}

const PERMISSIONS_POLICY =
  "camera=(), microphone=(), geolocation=(), interest-cohort=()";

function nonceFor(): string {
  return randomBytes(16).toString("base64");
}

function cspWithNonce(nonce: string): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}'`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; ");
}

/** Add nonce="…" to every inline <script> tag (ones without a src= attribute). */
function nonceInlineScripts(html: string, nonce: string): string {
  return html.replace(/<script(?![^>]*\bsrc=)/g, `<script nonce="${nonce}"`);
}

function looksLikeHtml(result: unknown): boolean {
  if (!(result instanceof Response) || !result.body) return false;
  const contentType = String(result.headers.get("content-type") ?? "");
  const encoded = Boolean(result.headers.get("content-encoding"));
  return contentType.includes("text/html") && !encoded;
}

export default async function securityHeadersMiddleware(
  event: SecEvent,
  next: () => unknown | Promise<unknown>,
): Promise<unknown> {
  const result = await next();
  if (!(result instanceof Response)) return result;

  const headers = new Headers(result.headers);
  if (!headers.get("x-content-type-options")) {
    headers.set("x-content-type-options", "nosniff");
  }
  if (!headers.get("referrer-policy")) {
    headers.set("referrer-policy", "strict-origin-when-cross-origin");
  }
  if (!headers.get("permissions-policy")) {
    headers.set("permissions-policy", PERMISSIONS_POLICY);
  }
  // HSTS is Vercel's on production domains (AC-8.2) — we never emit it, so
  // no conflict is possible.

  if (!looksLikeHtml(result)) {
    return new Response(result.body, {
      status: result.status,
      statusText: result.statusText,
      headers,
    });
  }

  const nonce = nonceFor();
  const original = result as Response;
  const html = await original.text();
  const transformed = nonceInlineScripts(html, nonce);
  headers.set("content-security-policy", cspWithNonce(nonce));
  headers.delete("content-length");

  return new Response(transformed, {
    status: original.status,
    statusText: original.statusText,
    headers,
  });
}
