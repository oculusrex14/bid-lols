/**
 * Map foundersbid.lol / bidception.lol onto the path-based boards.
 *
 * Silent internal rewrites would SSR /founders while the client hydrates `/`
 * (the portal) — 302s keep server and client on the same path.
 */

export const PORTAL_ORIGIN = "https://bidthrone.lol";

const SITE_BY_HOST = {
  "foundersbid.lol": "founders",
  "culturebid.lol": "culture",
  "bidception.lol": "bidception",
};

const OTHER_SITES = {
  founders: ["culture", "bidception"],
  culture: ["founders", "bidception"],
  bidception: ["founders", "culture"],
};
const DOMAIN_BY_SITE = {
  founders: "foundersbid.lol",
  culture: "culturebid.lol",
  bidception: "bidception.lol",
};

const PASSTHROUGH_PREFIXES = [
  "/api",
  "/assets",
  "/__grok",
  "/favicon",
  "/og.jpg",
  "/robots.txt",
  "/sitemap",
];

export function normalizeHost(hostHeader) {
  const raw = String(hostHeader ?? "")
    .split(",")[0]
    .trim()
    .toLowerCase();
  if (!raw) return "";
  const host = raw.split(":")[0];
  return host.startsWith("www.") ? host.slice(4) : host;
}

export function siteForHost(hostHeader) {
  const host = normalizeHost(hostHeader);
  return SITE_BY_HOST[host] ?? null;
}

export function isPassthroughPath(pathname) {
  const path = pathname || "/";
  return PASSTHROUGH_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`) || path.startsWith(`${prefix}.`),
  );
}

/**
 * @returns {{ location: string, status: number } | null}
 * `location` is path-absolute on the same host, or an absolute URL for a
 * different brand / the portal.
 */
export function redirectForBrandHost({ host, path, search = "" }) {
  const site = siteForHost(host);
  if (!site) return null;

  const pathname = path && path.length > 0 ? path : "/";
  const query = search && search !== "?" ? search : "";

  if (pathname === "/spec" || pathname.startsWith("/spec/")) {
    return { location: `${PORTAL_ORIGIN}${pathname}${query}`, status: 302 };
  }

  if (isPassthroughPath(pathname)) return null;
  if (pathname === `/${site}` || pathname.startsWith(`/${site}/`)) return null;

  // Cross-board: redirect to the other brand's domain.
  for (const other of OTHER_SITES[site]) {
    if (pathname === `/${other}` || pathname.startsWith(`/${other}/`)) {
      const rest = pathname.slice(`/${other}`.length) || "/";
      const destPath = rest.startsWith("/") ? rest : `/${rest}`;
      return {
        location: `https://${DOMAIN_BY_SITE[other]}${destPath}${query}`,
        status: 302,
      };
    }
  }

  const prefixed = pathname === "/" ? `/${site}` : `/${site}${pathname}`;
  return { location: `${prefixed}${query}`, status: 302 };
}

/** Connect-style middleware for Vite `configureServer` (dev only). */
export function brandHostVitePlugin() {
  return {
    name: "bidthrone:brand-host",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const host = req.headers["x-forwarded-host"] ?? req.headers.host ?? "";
        const url = new URL(req.url ?? "/", "http://local.invalid");
        const redirect = redirectForBrandHost({
          host,
          path: url.pathname,
          search: url.search,
        });
        if (!redirect) {
          next();
          return;
        }
        res.statusCode = redirect.status;
        res.setHeader("location", redirect.location);
        res.end();
      });
    },
  };
}
