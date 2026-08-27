// @ts-check
/**
 * Single source of truth for host <-> product mapping and SEO content
 * (title, description, canonical, OG), robots/sitemap bodies, legacy-path
 * redirects, and HTML head injection.
 *
 * Consumed by:
 *  - server/middleware/seo-host.ts   (Nitro, prod + preview)
 *  - scripts/host-seo-plugin.mjs      (Vite dev server twin)
 *  - src/lib/host.ts                 (app code, re-exported with types)
 *  - tests (node --test / tsx --test)
 *
 * Keep this dependency-free plain ESM: it is imported from the browser
 * bundle, Nitro functions, and Vite plugins alike.
 */

/** Canonical product keys, in sitemap order. */
/** @type {readonly ["bidthrone", "foundersbid", "culturebid", "bidception"]} */
export const PRODUCT_KEYS = [
  "bidthrone",
  "foundersbid",
  "culturebid",
  "bidception",
];

/**
 * @typedef {Object} Product
 * @property {string} key
 * @property {string} apex
 * @property {string|null} theme  data-theme value; null = default tokens
 * @property {string} name
 * @property {string} wordmark
 * @property {string} kicker
 * @property {string} title
 * @property {string} description
 * @property {string} oneLine
 * @property {string} contactEmail
 */

/** @type {Record<string, Product>} */
export const PRODUCTS = {
  bidthrone: {
    key: "bidthrone",
    apex: "bidthrone.lol",
    theme: null,
    name: "Bidthrone",
    wordmark: "bidthrone",
    kicker: "Public profiles and reputation for the Bid Network",
    title: "bidthrone.lol — Public profiles and reputation",
    description:
      "Public profiles and honest leaderboards for people who do real work on the Bid Network. Reputation comes from completed projects — not from paying for placement.",
    oneLine: "Public profiles and leaderboards for people who do real work.",
    contactEmail: "contact@bidthrone.lol",
  },
  foundersbid: {
    key: "foundersbid",
    apex: "foundersbid.lol",
    theme: "founders",
    name: "FoundersBid",
    wordmark: "foundersbid",
    kicker: "Where founders find people to build with",
    title: "foundersbid.lol — Post work, find builders",
    description:
      "FoundersBid connects founders with people who can build. Post a bounty or a project, review applications, and pay for completed work. Development, design, research, marketing, and more.",
    oneLine: "Post work you need done. Review proposals. Pay for results.",
    contactEmail: "contact@foundersbid.lol",
  },
  culturebid: {
    key: "culturebid",
    apex: "culturebid.lol",
    theme: "culture",
    name: "CultureBid",
    wordmark: "culturebid",
    kicker: "Creative briefs for photographers, writers, designers and more",
    title: "culturebid.lol — Creative work, fairly run",
    description:
      "CultureBid is a place where brands post creative briefs — video, photography, design, writing, naming — and creators respond with real work. Clear rules, capped entries, and the brand picks the winner.",
    oneLine: "Post a creative brief. Creators submit. You pick the winner.",
    contactEmail: "contact@culturebid.lol",
  },
  bidception: {
    key: "bidception",
    apex: "bidception.lol",
    theme: "bidception",
    name: "Bidception",
    wordmark: "bidception",
    kicker: "Break big projects into funded pieces a team can build",
    title: "bidception.lol — Fund one project, build it as a team",
    description:
      "Bidception is coming next: nested and team bounties, where a funded problem is decomposed into smaller funded sub-bounties and teams captain their way to the win.",
    oneLine: "Fund one project. A captain breaks it up. A team builds it together.",
    contactEmail: "contact@bidception.lol",
  },
};

/** Product served on hosts we do not recognize (umbrella default). */
export const DEFAULT_PRODUCT = "bidthrone";

/**
 * Normalize a Host header value: lowercase, strip www. and the port.
 * @param {string | null | undefined} host
 * @returns {string}
 */
export function normalizeHost(host) {
  if (!host) return "";
  let h = String(host).toLowerCase().trim();
  h = h.replace(/^www\./, "");
  const colon = h.indexOf(":");
  if (colon >= 0) h = h.slice(0, colon);
  return h;
}

/**
 * Map a Host header to a product key. Unknown hosts -> null (callers fall
 * back to the umbrella default, which keeps Vercel preview URLs and local
 * dev working).
 * @param {string | null | undefined} host
 * @returns {string | null}
 */
export function productForHost(host) {
  const h = normalizeHost(host);
  for (const key of PRODUCT_KEYS) {
    if (PRODUCTS[key].apex === h) return key;
  }
  return null;
}

/**
 * www→apex normalization (Phase 00.6, AC-3.5).
 *
 * bidthrone/foundersbid/bidception: www.<apex> is the same origin as <apex>
 * and must 301 (permanent) to the apex so search engines and browsers see
 * ONE canonical host (and so analytics sessions are not split across two
 * browser origins).
 *
 * culturebid is EXCLUDED: its apex DNS is misconfigured (private 10.x A
 * records — see docs/ops/DEPLOYMENT.md "DNS note"), so www is the only
 * working origin; a www→apex redirect would break the site. After the
 * external DNS fix, remove "culturebid" from this set and the redirect
 * applies there too.
 *
 * Returns the apex Location for a www host that should be normalized,
 * otherwise null.
 */
const WWW_NORMALIZE_EXCLUDED = new Set(["culturebid"]);

/**
 * @param {string | null | undefined} host
 * @param {string} [pathname]
 * @param {string} [search]
 * @returns {string | null}
 */
export function wwwRedirectFor(host, pathname = "/", search = "") {
  const raw = String(host ?? "").toLowerCase().trim().replace(/:\d+$/, "");
  if (!raw.startsWith("www.")) return null;
  const apex = raw.slice(4);
  for (const key of PRODUCT_KEYS) {
    if (PRODUCTS[key].apex === apex) {
      if (WWW_NORMALIZE_EXCLUDED.has(key)) return null;
      return `https://${apex}${pathname}${search}`;
    }
  }
  return null; // www of an unknown host -> umbrella default, no redirect
}

/**
 * @param {string} key
 * @returns {Product}
 */
export function product(key) {
  return PRODUCTS[key] ?? PRODUCTS[DEFAULT_PRODUCT];
}

/** Page titles for the non-home routes (same content on every product host). */
/** @type {Record<string, string>} */
const PATH_TITLES = {
  "/terms": "Terms of service",
  "/privacy": "Privacy policy",
  "/refund": "Refund & payment policy",
  "/contact": "Contact",
  "/signin": "Sign in",
  "/signup": "Create an account",
  "/dashboard": "Dashboard",
  "/settings/profile": "Profile settings",
  "/admin": "Admin",
  "/bounties": "Open bounties",
  "/projects": "Open projects",
};

/** Private surfaces: never indexed (authenticated or operational). */
const PRIVATE_PATHS = new Set([
  "/dashboard",
  "/settings/profile",
  "/admin",
  // Gated aggregate (Phase 04, FR-4): only indexable once a sample threshold
  // is met — which the static middleware cannot know per category, so the
  // aggregate page itself stays noindex; individual data is not deal-level.
  "/bid-index",
]);

/**
 * @param {string} pathname
 * @returns {boolean}
 */
function isPrivatePath(pathname) {
  if (PRIVATE_PATHS.has(pathname)) return true;
  if (pathname.startsWith("/settings/")) return true;
  if (pathname.startsWith("/admin")) return true;
  if (pathname.startsWith("/test/")) return true;
  if (pathname.startsWith("/api/")) return true;
  if (pathname.startsWith("/signin") || pathname.startsWith("/signup")) return true;
  return false;
}

/**
 * Public marketplace detail pages (bounty/project) are product content and
 * indexable; titles are generic at the middleware layer (the DB-backed exact
 * title is a Phase-04-grade refinement, recorded in the phase notes).
 * @param {string} pathname
 * @returns {null | { suffix: string }}
 */
function marketplacePathMeta(pathname) {
  if (pathname === "/bounties" || pathname.startsWith("/bounties/")) return { suffix: "Open bounties" };
  if (pathname === "/projects" || pathname.startsWith("/projects/")) return { suffix: "Open projects" };
  if (pathname === "/graveyard" || pathname.startsWith("/graveyard/")) return { suffix: "The Graveyard" };
  if (pathname === "/bidception" || pathname.startsWith("/bidception/")) return { suffix: "Funded parent work" };
  if (pathname === "/leaderboards") return { suffix: "Leaderboards" };
  if (pathname === "/bid-index") return { suffix: "The Bid Index" };
  if (pathname.startsWith("/profile/")) return { suffix: "Member profile" };
  if (pathname.startsWith("/test/")) return { suffix: "Test" };
  return null;
}

/**
 * Clickable origin for cross-product links. culturebid.lol's apex DNS is
 * misconfigured (private 10.x A records — see docs/ops/DEPLOYMENT.md, DNS
 * note), so visitors must go through www.culturebid.lol until the apex is
 * verified reachable. Declarative URLs (canonical, OG, sitemap) keep using
 * the apex origin; only <a href> navigation uses this helper (AC-5.2).
 * @param {string} key
 * @returns {string}
 */
export function linkOrigin(key) {
  const p = product(key);
  return key === "culturebid" ? `https://www.${p.apex}` : `https://${p.apex}`;
}

/**
 * Product capability matrix (RC1, R4) — single source shared by the Nitro
 * middleware, the Vite dev twin, and src/lib/marketplace/capabilities.ts.
 * Which product hosts which marketplace surface; shared capabilities exist
 * on every host and never redirect.
 */
/** @type {Record<string, string[]>} */
const CAPABILITY_MATRIX = {
  foundersbid: ["bounties", "projects", "graveyard"],
  culturebid: ["bounties"],
  bidception: ["bidception"],
  bidthrone: ["reputation"],
};
const SHARED_CAPABILITIES = ["profiles", "auth", "dashboard", "notifications"];

/**
 * @param {string} productKey
 * @returns {string[]}
 */
export function productCapabilities(productKey) {
  return [...(CAPABILITY_MATRIX[productKey] ?? []), ...SHARED_CAPABILITIES];
}

/**
 * @param {string} productKey
 * @param {string} capability
 * @returns {boolean}
 */
export function hasCapability(productKey, capability) {
  return productCapabilities(productKey).includes(capability);
}

/** @type {Record<string, string>} */
const CANONICAL_FOR_CAPABILITY = {
  bounties: "foundersbid",
  projects: "foundersbid",
  graveyard: "foundersbid",
  bidception: "bidception",
  reputation: "bidthrone",
};

/**
 * @param {string} capability
 * @returns {string | null} canonical product key, or null for shared caps
 */
export function canonicalProductForCapability(capability) {
  return CANONICAL_FOR_CAPABILITY[capability] ?? null;
}

/**
 * @param {string} pathname
 * @returns {string | null} the capability a path requires (null = shared/other)
 */
export function capabilityForPath(pathname) {
  if (pathname === "/bounties" || pathname.startsWith("/bounties/")) return "bounties";
  if (pathname === "/projects" || pathname.startsWith("/projects/")) return "projects";
  if (pathname === "/graveyard" || pathname.startsWith("/graveyard/")) return "graveyard";
  if (pathname === "/bidception" || pathname.startsWith("/bidception/")) return "bidception";
  if (pathname === "/leaderboards" || pathname === "/bid-index") return "reputation";
  return null;
}

/**
 * READ redirect (RC1, R4): list/create routes on a host that cannot serve the
 * capability get a permanent 301 to the canonical product origin, same path.
 * Detail routes redirect entity-aware at the loader (they need the DB).
 * null = the host serves it (or there is no canonical home).
 * @param {string} hostProduct
 * @param {string} pathname
 * @returns {string | null} absolute redirect URL or null
 */
export function capabilityReadRedirectFor(hostProduct, pathname) {
  const cap = capabilityForPath(pathname);
  if (!cap) return null;
  if (hasCapability(hostProduct, cap)) return null;
  const canonical = canonicalProductForCapability(cap);
  if (!canonical) return null;
  return `${linkOrigin(canonical)}${pathname}`;
}

/**
 * @param {string} productKey
 * @param {string} pathname
 * @returns {string}
 */
function pageTitleFor(productKey, pathname) {
  const p = product(productKey);
  const suffix = PATH_TITLES[pathname] ?? marketplacePathMeta(pathname)?.suffix;
  return suffix ? `${suffix} — ${p.name}` : p.title;
}
export { pageTitleFor };

/**
 * Host-aware SEO meta for one (product, path) pair.
 * @param {string} productKey
 * @param {string} pathname
 * @returns {{
 *   title: string, description: string, canonical: string,
 *   ogTitle: string, ogDescription: string, ogUrl: string,
 *   ogImage: string, ogType: string
 * }}
 */
export function seoMeta(productKey, pathname) {
  const p = product(productKey);
  const canonical = `https://${p.apex}${pathname}`;
  const title = pageTitleFor(productKey, pathname);
  return {
    title,
    description: p.description,
    canonical,
    ogTitle: title,
    ogDescription: p.description,
    ogUrl: canonical,
    ogImage: `https://${p.apex}/og.jpg`,
    ogType: "website",
  };
}

/** @param {string} s @returns {string} */
function esc(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;");
}

/**
 * Deliberate indexing policy (Phase 00.6, WS6 / AC-6.1):
 *  - home: indexable — the product surface is the network's public face;
 *  - legal pages (terms/privacy/refund/contact): `noindex,follow` — generic
 *    boilerplate per product with little search value; links still flow;
 *  - unknown routes: `noindex,follow` (Phase 00.5, via notFoundHeadTags).
 * Sitemaps therefore list home URLs only (AC-6.2) — the inventory is
 * product-content focused and matches what we ask crawlers to index.
 * @param {string} productKey
 * @param {string} pathname
 * @returns {string}
 */
function robotsMetaFor(productKey, pathname) {
  void productKey; // policy is uniform across products today; keep the shape
  // Private/operational surfaces are never indexed.
  if (isPrivatePath(pathname)) return "noindex,follow";
  // Legal pages keep the 00.6 noindex,follow policy.
  if (pathname in PATH_TITLES && ["/terms", "/privacy", "/refund", "/contact"].includes(pathname)) {
    return "noindex,follow";
  }
  // Marketplace listing/detail pages are product content (index,follow) —
  // real marketplace content is what appears here; an empty page is honest.
  return "index,follow";
}
export { robotsMetaFor };

/**
 * The host-aware head tag set for one (product, path) pair.
 * @param {string} productKey
 * @param {string} pathname
 * @returns {string}
 */
export function renderSeoHeadTags(productKey, pathname) {
  const m = seoMeta(productKey, pathname);
  return [
    `<title>${esc(m.title)}</title>`,
    `<meta name="robots" content="${robotsMetaFor(productKey, pathname)}">`,
    `<meta name="description" content="${esc(m.description)}">`,
    `<link rel="canonical" href="${esc(m.canonical)}">`,
    `<meta property="og:title" content="${esc(m.ogTitle)}">`,
    `<meta property="og:description" content="${esc(m.ogDescription)}">`,
    `<meta property="og:url" content="${esc(m.ogUrl)}">`,
    `<meta property="og:image" content="${esc(m.ogImage)}">`,
    `<meta property="og:type" content="${m.ogType}">`,
    `<meta name="twitter:card" content="summary_large_image">`,
  ].join("\n");
}

/**
 * Strip any pre-existing title/description/canonical/og:/robots tags, then
 * insert before `</head>`:
 *  - normal statuses: the host-aware SEO set;
 *  - 404: the not-found set — branded title, `noindex,follow`, and NO
 *    canonical/OG for the missing path (AC-6.4).
 * Returns the input unchanged when it is not an HTML document.
 * @param {string} html
 * @param {string} productKey
 * @param {string} pathname
 * @param {number} [status]
 * @returns {string}
 */
export function injectSeoHead(html, productKey, pathname, status = 200) {
  let out = String(html ?? "");
  if (!out.includes("</head>")) return out;
  const strip = [
    /<title>[\s\S]*?<\/title>/g,
    /<meta\s+name="description"\s+content="[^"]*"[^>]*\/?>/g,
    /<link\s+rel="canonical"\s+href="[^"]*"[^>]*\/?>/g,
    /<meta\s+property="og:[^"]*"\s+content="[^"]*"[^>]*\/?>/g,
    /<meta\s+name="robots"\s+content="[^"]*"[^>]*\/?>/g,
  ];
  for (const re of strip) out = out.replace(re, "");
  const tags =
    status === 404 ? notFoundHeadTags(productKey) : renderSeoHeadTags(productKey, pathname);
  return out.replace("</head>", `${tags}\n</head>`);
}

/**
 * @param {string} productKey
 * @returns {string}
 */
export function robotsTextFor(productKey) {
  const p = product(productKey);
  return `User-agent: *\nAllow: /\nSitemap: https://${p.apex}/sitemap.xml\n`;
}

/**
 * Host-aware, product-content-focused sitemap (Phase 00.6, WS6 / AC-6.2):
 * each domain inventories only its OWN home URL on its apex. Legal pages are
 * noindex,follow boilerplate (see robotsMetaFor) and are deliberately NOT in
 * the inventory; no fake/demo URLs exist as independent routes. A product
 * host does not present another product's origin in its inventory.
 * @param {string} productKey
 * @returns {string}
 */
/**
 * Host-aware sitemap. `extraPaths` are same-origin public paths (live bounties,
 * projects, graveyard assets, bidception parent works) to include alongside the
 * home URL. Only this host's own URLs are ever listed (AC-6.2).
 * @param {string} productKey
 * @param {string[]} extraPaths
 */
export function sitemapXml(productKey, extraPaths = []) {
  const p = product(productKey);
  const urls = [`  <url>\n    <loc>https://${p.apex}/</loc>\n  </url>`];
  for (const path of extraPaths) {
    urls.push(`  <url>\n    <loc>https://${p.apex}${path}</loc>\n  </url>`);
  }
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>\n`;
}

/**
 * 404 body theming: put the product's data-theme on the <html> tag so the
 * branded not-found page (which renders outside any themed wrapper) picks up
 * the right palette. No-op for products without a theme override.
 * @param {string} html
 * @param {string} productKey
 * @returns {string}
 */
export function injectNotFoundTheme(html, productKey) {
  const theme = product(productKey).theme;
  if (!theme) return String(html ?? "");
  return String(html ?? "").replace(/<html\b/, `<html data-theme="${theme}"`);
}

/**
 * Head tags for unknown routes (Phase 00.5, AC-6.4/6.5): branded title,
 * `noindex,follow`, and deliberately NO canonical / OG for a path that does
 * not exist — a canonical for a missing path would mislead crawlers.
 * @param {string} productKey
 * @returns {string}
 */
export function notFoundHeadTags(productKey) {
  const p = product(productKey);
  return [
    `<title>Page not found — ${esc(p.name)}</title>`,
    `<meta name="robots" content="noindex,follow">`,
    `<meta name="description" content="This page does not exist on ${esc(p.apex)}.">`,
  ].join("\n");
}

/**
 * Legacy paths removed in Phase 00 that still receive organic traffic:
 * 308 (permanent, method-preserving) to the same-host root.
 * @param {string} pathname
 * @returns {string | null}
 */
export function legacyRedirectFor(pathname) {
  // NOTE: `/bidception` is NO LONGER a legacy board path — it is the Phase 03
  // nested-marketplace root (list / new / :id). It is deliberately omitted here
  // so bidception.lol/bidception serves the product instead of 308-ing to /.
  for (const prefix of ["/founders", "/culture", "/spec"]) {
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) return "/";
  }
  return null;
}
