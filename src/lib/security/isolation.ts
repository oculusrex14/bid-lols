import { getRequest } from "@tanstack/react-start/server";

/**
 * Fetch-Metadata sibling isolation — **server-only** (imports
 * `@tanstack/react-start/server`, which reaches into Node's
 * AsyncLocalStorage; never import from client-reachable code).
 *
 * Apps deployed on multi-tenant host platforms can be "same-site" to each
 * other while MUTUALLY UNTRUSTED, and a `SameSite=Lax` session cookie IS sent
 * on same-site subrequests — so without this, a malicious sibling could make
 * a SCRIPTED (fetch/XHR/form-POST) request to this app's server functions and
 * ride this app's session cookie.
 *
 * We allow only: same-origin requests (this app's own client), non-browser
 * requests (SSR / server-to-server, which send no `Sec-Fetch-Site`), and
 * top-level GET navigations. Every cross-site / same-site *scripted* request
 * is rejected with `CrossSiteRequestError`.
 *
 * Retained from the removed Better Auth scaffold as the reusable chokepoint
 * primitive for the Phase 01 auth surface (see docs/05_SECURITY.md).
 */
export class CrossSiteRequestError extends Error {
  readonly status = 403;
  constructor() {
    super("Forbidden: cross-site request blocked");
    this.name = "CrossSiteRequestError";
  }
}

/** Throw `CrossSiteRequestError` for a scripted cross-site/sibling request. */
export function assertSameSiteRequest(): void {
  const request = getRequest();
  if (!request) return; // no request context (e.g. build) — nothing to guard
  const h = request.headers;
  const site = h.get("sec-fetch-site");
  // Non-browser client (no header), the app's own origin, or a direct
  // (address-bar/bookmark) load are all fine.
  if (!site || site === "same-origin" || site === "none") return;
  // A top-level GET navigation is fine even when it's cross-site; scripted
  // requests never set navigate mode.
  const dest = h.get("sec-fetch-dest");
  const isTopLevelGet =
    h.get("sec-fetch-mode") === "navigate" &&
    request.method === "GET" &&
    dest !== "object" &&
    dest !== "embed";
  if (isTopLevelGet) return;
  throw new CrossSiteRequestError();
}
