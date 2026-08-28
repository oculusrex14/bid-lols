// @ts-check
/**
 * Single source of truth for host <-> product mapping and SEO content
 * (title, description, canonical, OG), robots/sitemap bodies, entity-level
 * metadata, legacy-path redirects, and HTML head injection.
 *
 * Consumed by:
 *  - server/middleware/seo-host.ts   (Nitro, prod + preview)
 *  - scripts/host-seo-plugin.mjs      (Vite dev server twin)
 *  - src/lib/host.ts                 (app code, re-exported with types)
 *  - tests (node --test / tsx --test)
 *
 * Keep this dependency-free plain ESM: it is imported from the browser
 * bundle, Nitro functions, and Vite plugins alike.
 *
 * Metadata precedence (RC2, C3): entity-level head wins when the middleware
 * resolves a real entity for a detail path; host-level head is the fallback
 * for everything else. The canonical origin per product is `seoOrigin`,
 * which is the only host search engines should treat as canonical.
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
    kicker: "Public work records for the Bid Network",
    title: "Freelancer Proof of Work & Reputation | Bidthrone",
    description:
      "Public profiles and leaderboards built from completed work on the Bid Network. Bounties won, projects delivered, teams captained. When a category has enough settled outcomes, see what the market pays.",
    oneLine: "Reputation from completed work, not self-promotion.",
    contactEmail: "contact@bidthrone.lol",
  },
  foundersbid: {
    key: "foundersbid",
    apex: "foundersbid.lol",
    theme: "founders",
    name: "FoundersBid",
    wordmark: "foundersbid",
    kicker: "Startup work, funded and bounded",
    title: "Startup Freelance Bounties & Projects | FoundersBid",
    description:
      "Post startup work with a clear budget and a deadline. Use a bounty when several people can compete on the result. Use a project when you choose one provider before the work begins. Development, design, research, marketing.",
    oneLine: "Get startup work done without hiring a whole team.",
    contactEmail: "contact@foundersbid.lol",
  },
  culturebid: {
    key: "culturebid",
    apex: "culturebid.lol",
    theme: "culture",
    name: "CultureBid",
    wordmark: "culturebid",
    kicker: "Paid creative briefs with fair rules",
    title: "Creative Bounties for Brands & Creators | CultureBid",
    description:
      "Brands post paid creative briefs with a clear reward, a deadline, and a capped number of creator slots. Creators know the rules before they start. Video, photography, design, writing, naming.",
    oneLine: "A better way to commission creative work.",
    contactEmail: "contact@culturebid.lol",
  },
  bidception: {
    key: "bidception",
    apex: "bidception.lol",
    theme: "bidception",
    name: "Bidception",
    wordmark: "bidception",
    kicker: "One project, one budget, a team of specialists",
    title: "Build Projects With Freelance Teams | Bidception",
    description:
      "Fund one big project with a single budget. A captain you choose splits it into work packages, each with its own budget and deadline. Specialists take the parts they are good at. Every rupee reconciles to the parent budget.",
    oneLine: "Big project. One budget. The right people for each part.",
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
 * applies there too (and from SEO_CANONICAL_WWW, below).
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
 * RC2 (C2): the CANONICAL origin for declarative URLs. Search engines must
 * only be pointed at origins that actually resolve and serve the app.
 *
 * culturebid.lol apex DNS is broken (private 10.x records; verified
 * unreachable from the internet), so www.culturebid.lol is the canonical
 * CultureBid origin for: canonical, og:url, og:image, sitemap URLs, the
 * robots Sitemap line, JSON-LD @id / url / mainEntityOfPage, and IndexNow.
 *
 * Rollback (when the apex is verified reachable): remove "culturebid" from
 * this set AND from WWW_NORMALIZE_EXCLUDED. Both sets must stay in sync.
 */
const SEO_CANONICAL_WWW = new Set(["culturebid"]);

/**
 * Clickable origin for cross-product links (and, in the current DNS mode,
 * identical to the canonical origin).
 * @param {string} key
 * @returns {string}
 */
export function linkOrigin(key) {
  const p = product(key);
  return key === "culturebid" ? `https://www.${p.apex}` : `https://${p.apex}`;
}

/**
 * The canonical origin for metadata, sitemaps, robots, and schema.
 * @param {string} key
 * @returns {string}
 */
export function seoOrigin(key) {
  const p = product(key);
  return SEO_CANONICAL_WWW.has(key) ? `https://www.${p.apex}` : `https://${p.apex}`;
}

/**
 * @param {string} key
 * @returns {Product}
 */
export function product(key) {
  return PRODUCTS[key] ?? PRODUCTS[DEFAULT_PRODUCT];
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

/** Page titles for the static routes (same content on every product host,
 *  except /bounties which is product-aware). */
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
  "/projects": "Open projects",
  "/blog": "Blog",
};

/** Product-aware suffix for /bounties (FoundersBid vs CultureBid surface). */
/** @type {Record<string, string>} */
const BOUNTIES_PATH_TITLE = {
  foundersbid: "Open bounties",
  culturebid: "Creative bounties",
};

/** Private surfaces: never indexed (authenticated or operational). */
const PRIVATE_PATHS = new Set([
  "/dashboard",
  "/settings/profile",
  "/admin",
  // Gated aggregate (Phase 04, FR-4): only publishable once a sample
  // threshold is met per category, which the static middleware cannot know,
  // so the aggregate page itself stays noindex; no deal-level data exposed.
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
 * Public marketplace paths and their page-title suffixes. Detail pages get
 * entity-level head from the middleware when a real entity resolves (RC2,
 * C3); these suffixes are the fallback for anything else under the prefix.
 * @param {string} productKey
 * @param {string} pathname
 * @returns {null | { suffix: string }}
 */
function marketplacePathMeta(productKey, pathname) {
  if (pathname === "/bounties" || pathname.startsWith("/bounties/")) {
    return { suffix: BOUNTIES_PATH_TITLE[productKey] ?? "Open bounties" };
  }
  if (pathname === "/projects" || pathname.startsWith("/projects/")) return { suffix: "Open projects" };
  if (pathname === "/graveyard" || pathname.startsWith("/graveyard/")) return { suffix: "Graveyard" };
  if (pathname === "/bidception" || pathname.startsWith("/bidception/")) return { suffix: "Team projects" };
  if (pathname === "/leaderboards") return { suffix: "Leaderboards" };
  if (pathname === "/bid-index") return { suffix: "Bid Index" };
  if (pathname.startsWith("/profile/")) return { suffix: "Member profile" };
  if (pathname.startsWith("/test/")) return { suffix: "Test" };
  return null;
}

/**
 * @param {string} productKey
 * @param {string} pathname
 * @returns {string}
 */
function pageTitleFor(productKey, pathname) {
  const p = product(productKey);
  const suffix = PATH_TITLES[pathname] ?? marketplacePathMeta(productKey, pathname)?.suffix;
  return suffix ? `${suffix} | ${p.name}` : p.title;
}
export { pageTitleFor };

/**
 * Host-aware SEO meta for one (product, path) pair. This is the FALLBACK
 * head: entity detail paths override it via buildEntityMeta when the
 * middleware resolves a real entity.
 * @param {string} productKey
 * @param {string} pathname
 * @returns {{
 *   title: string, description: string, canonical: string,
 *   ogTitle: string, ogDescription: string, ogUrl: string,
 *   ogImage: string, ogType: string, robots: string
 * }}
 */
export function seoMeta(productKey, pathname) {
  const p = product(productKey);
  const origin = seoOrigin(productKey);
  const canonical = `${origin}${pathname}`;
  const title = pageTitleFor(productKey, pathname);
  return {
    title,
    description: p.description,
    canonical,
    ogTitle: title,
    ogDescription: p.description,
    ogUrl: canonical,
    ogImage: `${origin}/og.jpg`,
    ogType: "website",
    robots: robotsMetaFor(productKey, pathname),
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
 * Collapse whitespace and truncate at a word boundary. No ellipsis: a cut
 * title still reads as a title. Empty input gives "".
 * @param {string} s
 * @param {number} maxChars
 * @returns {string}
 */
export function truncateWords(s, maxChars) {
  const flat = String(s ?? "").replace(/\s+/g, " ").trim();
  if (flat.length <= maxChars) return flat;
  const cut = flat.slice(0, Math.max(1, maxChars));
  const space = cut.lastIndexOf(" ");
  return space > 0 ? cut.slice(0, space) : cut;
}

/**
 * Deliberate indexing policy:
 *  - home + public surfaces: indexable;
 *  - legal pages (terms/privacy/refund/contact): `noindex,follow`;
 *  - private/operational surfaces (accounts, settings, admin, gated
 *    aggregate, forms, API, test routes): `noindex,follow`;
 *  - unknown routes: `noindex,follow` via notFoundHeadTags.
 * Pages marked noindex must NOT be robots-blocked (crawlers need to read
 * the meta). RC2 (C9).
 * @param {string} productKey
 * @param {string} pathname
 * @returns {string}
 */
function robotsMetaFor(productKey, pathname) {
  void productKey; // policy is uniform across products; keep the shape
  if (isPrivatePath(pathname)) return "noindex,follow";
  if (["/terms", "/privacy", "/refund", "/contact"].includes(pathname)) {
    return "noindex,follow";
  }
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
  return renderHeadTags(productKey, m);
}

/**
 * Render the head tag set from a meta object (fallback OR entity).
 * @param {string} productKey
 * @param {import("./host-seo-shared.mjs").SeoMeta} m
 * @returns {string}
 */
export function renderHeadTags(productKey, m) {
  void productKey;
  const extra = Array.isArray(m.extraHeadTags) ? m.extraHeadTags : [];
  return [
    `<title>${esc(m.title)}</title>`,
    `<meta name="robots" content="${m.robots}">`,
    `<meta name="description" content="${esc(m.description)}">`,
    `<link rel="canonical" href="${esc(m.canonical)}">`,
    `<meta property="og:title" content="${esc(m.ogTitle)}">`,
    `<meta property="og:description" content="${esc(m.ogDescription)}">`,
    `<meta property="og:url" content="${esc(m.ogUrl)}">`,
    `<meta property="og:image" content="${esc(m.ogImage)}">`,
    `<meta property="og:type" content="${esc(m.ogType)}">`,
    `<meta name="twitter:card" content="summary_large_image">`,
    ...extra.map((t) => (t.startsWith("<") ? t : `<meta property="${esc(t)}">`)),
  ].join("\n");
}

/**
 * @typedef {Object} SeoMeta
 * @property {string} title
 * @property {string} description
 * @property {string} canonical
 * @property {string} ogTitle
 * @property {string} ogDescription
 * @property {string} ogUrl
 * @property {string} ogImage
 * @property {string} ogType
 * @property {string} robots
 * @property {string[]} [extraHeadTags]
 */

/**
 * Entity-level head (RC2, C3). The middleware resolves the real entity
 * (DB row or blog module) and calls this; user content is escaped and
 * truncated. `indexable` is false for drafts / cancelled / thin profiles:
 * the page still renders, but search engines are told so via robots.
 *
 * @param {string} productKey
 * @param {string} pathname
 * @param {{
 *   title: string, description: string, ogType?: string,
 *   indexable?: boolean, extraHeadTags?: string[]
 * }} e
 * @returns {SeoMeta}
 */
export function buildEntityMeta(productKey, pathname, e) {
  const p = product(productKey);
  const origin = seoOrigin(productKey);
  const canonical = `${origin}${pathname}`;
  return {
    title: e.title,
    description: e.description,
    canonical,
    ogTitle: e.title,
    ogDescription: e.description,
    ogUrl: canonical,
    ogImage: `${origin}/og.jpg`,
    ogType: e.ogType ?? "website",
    robots: e.indexable === false ? "noindex,follow" : "index,follow",
    extraHeadTags: e.extraHeadTags ?? [],
  };
}

/**
 * Strip any pre-existing title/description/canonical/og:/robots tags, then
 * insert before `</head>`:
 *  - normal statuses: the provided head set (entity when available, host
 *    fallback otherwise);
 *  - 404: the not-found set — branded title, `noindex,follow`, and NO
 *    canonical/OG for the missing path.
 * Returns the input unchanged when it is not an HTML document.
 * @param {string} html
 * @param {string} productKey
 * @param {string} pathname
 * @param {number} [status]
 * @param {SeoMeta | null} [entityMeta]
 * @returns {string}
 */
export function injectSeoHead(html, productKey, pathname, status = 200, entityMeta = null) {
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
    status === 404
      ? notFoundHeadTags(productKey)
      : entityMeta
        ? renderHeadTags(productKey, entityMeta)
        : renderSeoHeadTags(productKey, pathname);
  return out.replace("</head>", `${tags}\n</head>`);
}

/**
 * @param {string} productKey
 * @returns {string}
 */
export function robotsTextFor(productKey) {
  const p = product(productKey);
  // Keep every public surface crawlable. OAI-SearchBot (ChatGPT Search) and
  // GPTBot (model training) are both allowed under the wildcard: the
  // training-policy decision is recorded in docs/ops/SEARCH_VISIBILITY.md
  // and must be changed deliberately, not accidentally.
  return `User-agent: *\nAllow: /\nSitemap: ${seoOrigin(productKey)}/sitemap.xml\n`;
}

/**
 * Evergreen indexable paths per product (RC2, C7). Static content: no
 * lastmod (there is no stored modified timestamp for a product page, and
 * generating one from request time would be a lie). Blog article paths are
 * added by the caller from the content module (they have real modifiedAt).
 * @param {string} productKey
 * @returns {string[]}
 */
export function evergreenPaths(productKey) {
  switch (productKey) {
    case "foundersbid":
      return ["/bounties", "/projects", "/graveyard", "/blog"];
    case "culturebid":
      return ["/bounties", "/blog"];
    case "bidception":
      return ["/bidception", "/blog"];
    case "bidthrone":
      return ["/leaderboards", "/blog"];
    default:
      return ["/blog"];
  }
}

/**
 * Host-aware sitemap. `entries` are same-origin public paths; each may carry
 * a real lastmod (ISO 8601) from a stored timestamp. Only this host's own
 * URLs are ever listed (AC-6.2). The home URL is always first.
 * @param {string} productKey
 * @param {{ path: string, lastmod?: string | null }[]} [entries]
 */
export function sitemapXml(productKey, entries = []) {
  const origin = seoOrigin(productKey);
  const all = [{ path: "/", lastmod: null }, ...entries.filter((e) => e && e.path)];
  const urls = all.map((e) => {
    const lastmod = e.lastmod ? `\n    <lastmod>${esc(e.lastmod)}</lastmod>` : "";
    return `  <url>\n    <loc>${esc(`${origin}${e.path}`)}</loc>${lastmod}\n  </url>`;
  });
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>\n`;
}

/**
 * 404 body theming: put the product's data-theme on the <html> tag so the
 * branded not-found page (which renders outside any themed wrapper) picks
 * up the right palette. No-op for products without a theme override.
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
 * Head tags for unknown routes: branded title, `noindex,follow`, and
 * deliberately NO canonical / OG for a path that does not exist.
 * @param {string} productKey
 * @returns {string}
 */
export function notFoundHeadTags(productKey) {
  const p = product(productKey);
  return [
    `<title>Page not found: ${esc(p.name)}</title>`,
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
  // NOTE: `/bidception` is NOT a legacy board path — it is the Phase 03
  // team-project root (list / new / :id). Deliberately omitted here so
  // bidception.lol/bidception serves the product instead of 308-ing to /.
  for (const prefix of ["/founders", "/culture", "/spec"]) {
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) return "/";
  }
  return null;
}

/**
 * IndexNow (RC2, C10). The key is a PUBLIC verification token (not a
 * secret): search providers fetch `<origin>/<key>key.txt` to verify the
 * publisher controls the host. Stable across releases by design.
 */
export const INDEXNOW_KEY = "007a94fe-3404-482d-b88c-cef5d087511c";

/**
 * @param {string} pathname
 * @returns {boolean}
 */
export function isIndexnowKeyPath(pathname) {
  return pathname === `/${INDEXNOW_KEY}key.txt`;
}
