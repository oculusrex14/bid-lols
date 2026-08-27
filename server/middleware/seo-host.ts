/**
 * Host-aware SEO + legacy routing for the four Bid Network domains.
 * Auto-registered as global Nitro middleware via `serverDir: "./server"` in
 * vite.config.ts (same mechanism as the request-id middleware).
 *
 * For ALL methods, before anything else:
 *  - `www.<apex>` hosts of the three DNS-healthy products -> 301 to the same
 *    path on the apex (Phase 00.6, AC-3.5; culturebid excluded — DNS note).
 *
 * For GET requests:
 *  - `/robots.txt`   -> host-aware robots.txt (Sitemap: this domain).
 *  - `/sitemap.xml`  -> host-aware sitemap: this domain's own public URLs
 *    only (Phase 00.5, AC-6.2).
 *  - legacy board paths (`/founders*`, `/culture*`, `/bidception*`, `/spec*`)
 *    -> 308 to the same-host root (Phase 00 replaced the boards).
 *  - any other HTML document -> status-aware head injected at `</head>`:
 *    200/3xx get host-aware `<title>`, description, canonical, and Open
 *    Graph tags; 404 gets the not-found set — branded title, `noindex,follow`,
 *    and NO canonical for the missing path (AC-6.4). The app routes render
 *    the product-neutral head, so nothing is duplicated.
 *
 * Everything else passes through untouched. The dev server gets the same
 * behaviour from scripts/host-seo-plugin.mjs; the shared logic lives in
 * scripts/host-seo-shared.mjs so prod and dev can never disagree.
 */
import {
  DEFAULT_PRODUCT,
  injectNotFoundTheme,
  injectSeoHead,
  legacyRedirectFor,
  normalizeHost,
  productForHost,
  robotsTextFor,
  sitemapXml,
  wwwRedirectFor,
  capabilityReadRedirectFor,
} from "../../scripts/host-seo-shared.mjs";

interface SeoHostEvent {
  url: URL;
  req: { method?: string; headers: Headers };
}

function requestHost(event: SeoHostEvent): string {
  return (
    event.req.headers.get("x-forwarded-host") ??
    event.req.headers.get("host") ??
    event.url.host
  );
}

function looksLikeHtml(result: unknown): boolean {
  if (!(result instanceof Response) || !result.body) return false;
  const contentType = String(result.headers.get("content-type") ?? "");
  const encoded = Boolean(result.headers.get("content-encoding"));
  return contentType.includes("text/html") && !encoded;
}

/**
 * Live public marketplace paths for this product, for the sitemap. Each query
 * is product-scoped so a host only ever lists its own content. Failures are
 * swallowed to [] — the sitemap must still serve (home URL) and never 500 a
 * crawler because a DB blip hit the listing queries.
 * @param {string} productKey
 */
async function liveSitemapPaths(productKey: string): Promise<string[]> {
  try {
    const { getSql } = await import("@/lib/db.server");
    const sql = await getSql();
    const paths: string[] = [];
    const bounties = await sql.query<{ id: string }>(
      `select id from bounties where product = $1 and status in ('OPEN','APPLICATION_CLOSED','SUBMISSION','JUDGING','AWARDED') order by created_at desc limit 200`,
      [productKey],
    );
    for (const b of bounties) paths.push(`/bounties/${b.id}`);
    const projects = await sql.query<{ id: string }>(
      `select id from projects where product = $1 and status in ('OPEN_FOR_PROPOSALS','ACTIVE','MILESTONE_REVIEW') order by created_at desc limit 200`,
      [productKey],
    );
    for (const p of projects) paths.push(`/projects/${p.id}`);
    const graveyard = await sql.query<{ id: string }>(
      `select id from graveyard_listings where product = $1 and status in ('LISTED','UNDER_OFFER') order by created_at desc limit 200`,
      [productKey],
    );
    for (const g of graveyard) paths.push(`/graveyard/${g.id}`);
    const parents = await sql.query<{ id: string }>(
      `select id from parent_works where product = $1 and status in ('FUNDED','ACTIVE','COMPLETING','COMPLETED') order by created_at desc limit 200`,
      [productKey],
    );
    for (const pw of parents) paths.push(`/bidception/${pw.id}`);
    return paths;
  } catch {
    return [];
  }
}

export default async function seoHostMiddleware(
  event: SeoHostEvent,
  next: () => unknown | Promise<unknown>,
): Promise<unknown> {
  const path = event.url.pathname;
  const host = requestHost(event);
  const productKey = productForHost(normalizeHost(host)) ?? DEFAULT_PRODUCT;

  // www→apex permanent normalization (Phase 00.6, AC-3.5) — all methods,
  // before anything else: one canonical host per product. Culturebid is
  // excluded (its apex DNS is broken; see wwwRedirectFor's docs). This is
  // the ONLY implementation on deployed runtimes: vercel.json cannot carry
  // host-scoped redirects (its schema rejects `host` on redirects), so the
  // app-level middleware covers prod + the local built preview alike, and
  // the Vite dev twin keeps local dev identical.
  const wwwRedirect = wwwRedirectFor(host, path, event.url.search);
  if (wwwRedirect !== null) {
    return new Response(null, {
      status: 301,
      headers: { location: wwwRedirect },
    });
  }

  // Capability read-redirect (RC1, R4): a list/create route on a host that
  // cannot serve its capability 301s to the canonical product's origin, same
  // path. Detail routes are entity-aware and redirect in their loaders (DB).
  const capabilityRedirect = capabilityReadRedirectFor(productKey, path);
  if (capabilityRedirect !== null) {
    const location =
      capabilityRedirect + (event.url.search ? event.url.search : "");
    return new Response(null, {
      status: 301,
      headers: { location },
    });
  }

  const method = (event.req.method ?? "GET").toUpperCase();
  if (method !== "GET") return next();

  if (path === "/robots.txt") {
    return new Response(robotsTextFor(productKey), {
      headers: {
        "content-type": "text/plain; charset=utf-8",
        "cache-control": "public, max-age=3600",
      },
    });
  }

  if (path === "/sitemap.xml") {
    // Host-aware inventory: this host's own public URLs (AC-6.2) — home plus
    // the live marketplace listings scoped to this product.
    const extraPaths = await liveSitemapPaths(productKey);
    return new Response(sitemapXml(productKey, extraPaths), {
      headers: {
        "content-type": "application/xml; charset=utf-8",
        "cache-control": "public, max-age=3600",
      },
    });
  }

  const legacy = legacyRedirectFor(path);
  if (legacy !== null) {
    return new Response(null, { status: 308, headers: { location: legacy } });
  }

  const result = await next();
  if (!looksLikeHtml(result)) return result;

  const original = result as Response;
  let html = await original.text();
  // 404: theme the <html> for the branded not-found page (AC-6.4).
  if (original.status === 404) html = injectNotFoundTheme(html, productKey);
  // Status-aware head: 404 gets the not-found set (noindex,follow, no
  // canonical for the missing path — AC-6.4); everything else gets the
  // host-aware SEO set.
  const transformed = injectSeoHead(html, productKey, path, original.status);
  const headers = new Headers(original.headers);
  headers.delete("content-length");
  headers.set("content-type", "text/html; charset=utf-8");
  return new Response(transformed, {
    status: original.status,
    statusText: original.statusText,
    headers,
  });
}
