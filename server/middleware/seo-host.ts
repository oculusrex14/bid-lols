/**
 * Host-aware SEO + legacy routing for the four Bid Network domains.
 * Auto-registered as global Nitro middleware via `serverDir: "./server"` in
 * vite.config.ts (same mechanism as the request-id middleware).
 *
 * For GET requests:
 *  - `/robots.txt`   -> host-aware robots.txt (Sitemap: this domain).
 *  - `/sitemap.xml`  -> the single four-domain sitemap, served identically.
 *  - legacy board paths (`/founders*`, `/culture*`, `/bidception*`, `/spec*`)
 *    -> 308 to the same-host root (Phase 00 replaced the boards).
 *  - any other HTML document -> host-aware `<title>`, description, canonical
 *    and Open Graph tags injected at `</head>` (the app routes render the
 *    product-neutral head, so nothing is duplicated).
 *
 * Everything else passes through untouched. The dev server gets the same
 * behaviour from scripts/host-seo-plugin.mjs; the shared logic lives in
 * scripts/host-seo-shared.mjs so prod and dev can never disagree.
 */
import {
  DEFAULT_PRODUCT,
  injectSeoHead,
  legacyRedirectFor,
  normalizeHost,
  productForHost,
  robotsTextFor,
  sitemapXml,
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

export default async function seoHostMiddleware(
  event: SeoHostEvent,
  next: () => unknown | Promise<unknown>,
): Promise<unknown> {
  const method = (event.req.method ?? "GET").toUpperCase();
  if (method !== "GET") return next();

  const path = event.url.pathname;
  const host = requestHost(event);
  const productKey = productForHost(normalizeHost(host)) ?? DEFAULT_PRODUCT;

  if (path === "/robots.txt") {
    return new Response(robotsTextFor(productKey), {
      headers: {
        "content-type": "text/plain; charset=utf-8",
        "cache-control": "public, max-age=3600",
      },
    });
  }

  if (path === "/sitemap.xml") {
    return new Response(sitemapXml(), {
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
  const html = await original.text();
  const transformed = injectSeoHead(html, productKey, path);
  const headers = new Headers(original.headers);
  headers.delete("content-length");
  headers.set("content-type", "text/html; charset=utf-8");
  return new Response(transformed, {
    status: original.status,
    statusText: original.statusText,
    headers,
  });
}
