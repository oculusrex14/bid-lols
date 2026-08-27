// @ts-check
/**
 * Dev-server (Vite) half of the host-aware SEO + legacy routing that
 * server/middleware/seo-host.ts provides on deployed runtimes. Both consume
 * scripts/host-seo-shared.mjs, so dev and prod can never disagree.
 *
 * Nitro middleware only exists when the nitro plugin is attached (build +
 * preview); `vite dev` needs this plugin for identical behaviour on
 * 127.0.0.1:8080 — including Host-header based product selection, which lets
 * local testing hit each product surface via
 * `curl -H "Host: foundersbid.lol" http://127.0.0.1:8080/`.
 */
import {
  DEFAULT_PRODUCT,
  legacyRedirectFor,
  normalizeHost,
  productForHost,
  robotsTextFor,
  sitemapXml,
  wwwRedirectFor,
  capabilityReadRedirectFor,
} from "./host-seo-shared.mjs";

/** @param {import("node:http").IncomingMessage} req */
function requestHost(req) {
  const forwarded = req.headers["x-forwarded-host"];
  const host = forwarded ?? req.headers.host ?? "127.0.0.1";
  return Array.isArray(host) ? String(host[0]) : String(host);
}

function pathOf(req) {
  const rawUrl = req.url ?? "";
  const i = rawUrl.indexOf("?");
  return i >= 0 ? rawUrl.slice(0, i) : rawUrl;
}

function send(res, status, contentType, body) {
  res.statusCode = status;
  res.setHeader("content-type", contentType);
  res.end(body);
}

export function hostSeoDevPlugin() {
  return {
    name: "bid-network:host-seo",
    apply: "serve",
    configureServer(server) {
      // Pre-app: www 301s / robots / sitemap / legacy 308s.
      server.middlewares.use((req, res, next) => {
        // www→apex permanent normalization (Phase 00.6, AC-3.5) — all methods,
        // same shared decision as the Nitro middleware (culturebid excluded).
        const wwwRedirect = wwwRedirectFor(
          requestHost(req),
          pathOf(req).split("?")[0],
          (() => {
            const i = (req.url ?? "").indexOf("?");
            return i >= 0 ? (req.url ?? "").slice(i) : "";
          })(),
        );
        if (wwwRedirect !== null) {
          res.statusCode = 301;
          res.setHeader("location", wwwRedirect);
          res.end();
          return;
        }
        // Capability read-redirect (RC1, R4): list/create route on a host that
        // cannot serve it 301s to the canonical product origin, same path.
        const capProduct =
          productForHost(normalizeHost(requestHost(req))) ?? DEFAULT_PRODUCT;
        const capPath = pathOf(req).split("?")[0];
        const capabilityRedirect = capabilityReadRedirectFor(capProduct, capPath);
        if (capabilityRedirect !== null) {
          const qIdx = (req.url ?? "").indexOf("?");
          const search = qIdx >= 0 ? (req.url ?? "").slice(qIdx) : "";
          res.statusCode = 301;
          res.setHeader("location", capabilityRedirect + search);
          res.end();
          return;
        }
        const method = String(req.method ?? "GET").toUpperCase();
        if (method !== "GET") return next();
        const path = pathOf(req);
        if (path === "/robots.txt" || path === "/sitemap.xml") {
          const productKey =
            productForHost(normalizeHost(requestHost(req))) ?? DEFAULT_PRODUCT;
          if (path === "/robots.txt") {
            return send(res, 200, "text/plain; charset=utf-8", robotsTextFor(productKey));
          }
          // Host-aware inventory: this host's own URLs only (Phase 00.5, AC-6.2).
return send(res, 200, "application/xml; charset=utf-8", sitemapXml(productKey));
        }
        if (legacyRedirectFor(path) !== null) {
          res.statusCode = 308;
          res.setHeader("location", "/");
          res.end();
          return;
        }
        next();
      });

      // NOTE: dev intentionally does NOT transform the SSR HTML head. Injecting
      // foreign <head> nodes into Vite dev's streamed SSR breaks React 19
      // hydration (verified empirically; the same transform is clean on the
      // Nitro preview/prod path). The root route's static umbrella title/desc
      // stand in for dev, and deployed runtimes get the full host-aware head
      // from server/middleware/seo-host.ts.
    },
  };
}
