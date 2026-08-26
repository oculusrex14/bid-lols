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
    kicker: "The reputation & discovery layer of the Bid Network",
    title: "bidthrone.lol — Bidthrone, the Bid Network",
    description:
      "Bidthrone is the reputation and discovery layer of the Bid Network — an internet bounty network where sponsors put money on a problem and qualified builders, creators, and captains compete to solve it. Coming next.",
    oneLine:
      "An internet bounty network. Put money on a problem. See who takes the throne.",
    contactEmail: "contact@bidthrone.lol",
  },
  foundersbid: {
    key: "foundersbid",
    apex: "foundersbid.lol",
    theme: "founders",
    name: "FoundersBid",
    wordmark: "foundersbid",
    kicker: "The startup execution marketplace",
    title: "foundersbid.lol — FoundersBid, the startup execution marketplace",
    description:
      "FoundersBid is coming next: a startup execution marketplace where sponsors put money on real problems — development, AI automation, design, product, research, marketing — and qualified builders compete to solve them.",
    oneLine: "Put money on a startup problem. Qualified builders compete to solve it.",
    contactEmail: "contact@foundersbid.lol",
  },
  culturebid: {
    key: "culturebid",
    apex: "culturebid.lol",
    theme: "culture",
    name: "CultureBid",
    wordmark: "culturebid",
    kicker: "The creative bounty marketplace",
    title: "culturebid.lol — CultureBid, the creative bounty marketplace",
    description:
      "CultureBid is coming next: a marketplace for creative bounties — UGC, video, photography, design, writing, memes, naming, and brand challenges. Sponsors fund; creators compete; the sponsor picks.",
    oneLine: "Fund a creative brief. Creators compete. The sponsor picks the winner.",
    contactEmail: "contact@culturebid.lol",
  },
  bidception: {
    key: "bidception",
    apex: "bidception.lol",
    theme: "bidception",
    name: "Bidception",
    wordmark: "bidception",
    kicker: "Nested & team bounties",
    title: "bidception.lol — Bidception, nested & team bounties",
    description:
      "Bidception is coming next: nested and team bounties, where a funded problem is decomposed into smaller funded sub-bounties and teams captain their way to the win.",
    oneLine: "Funded problems, decomposed into funded sub-bounties.",
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
  "/refund": "Refund policy",
  "/contact": "Contact",
};

/**
 * @param {string} productKey
 * @param {string} pathname
 * @returns {string}
 */
export function pageTitleFor(productKey, pathname) {
  const p = product(productKey);
  const suffix = PATH_TITLES[pathname];
  return suffix ? `${suffix} — ${p.name}` : p.title;
}

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
 * The host-aware head tag set for one (product, path) pair.
 * @param {string} productKey
 * @param {string} pathname
 * @returns {string}
 */
export function renderSeoHeadTags(productKey, pathname) {
  const m = seoMeta(productKey, pathname);
  return [
    `<title>${esc(m.title)}</title>`,
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
 * Strip any pre-existing title/description/canonical/og: tags, then insert
 * the host-aware set before `</head>`. Returns the input unchanged when it
 * is not an HTML document.
 * @param {string} html
 * @param {string} productKey
 * @param {string} pathname
 * @returns {string}
 */
export function injectSeoHead(html, productKey, pathname) {
  let out = String(html ?? "");
  if (!out.includes("</head>")) return out;
  const strip = [
    /<title>[\s\S]*?<\/title>/g,
    /<meta\s+name="description"\s+content="[^"]*"[^>]*\/?>/g,
    /<link\s+rel="canonical"\s+href="[^"]*"[^>]*\/?>/g,
    /<meta\s+property="og:[^"]*"\s+content="[^"]*"[^>]*\/?>/g,
  ];
  for (const re of strip) out = out.replace(re, "");
  return out.replace("</head>", `${renderSeoHeadTags(productKey, pathname)}\n</head>`);
}

/**
 * @param {string} productKey
 * @returns {string}
 */
export function robotsTextFor(productKey) {
  const p = product(productKey);
  return `User-agent: *\nAllow: /\nSitemap: https://${p.apex}/sitemap.xml\n`;
}

/** One sitemap, served identically on all four domains (apex URLs only). */
export function sitemapXml() {
  const urls = PRODUCT_KEYS.map(
    (k) => `  <url>\n    <loc>https://${PRODUCTS[k].apex}/</loc>\n  </url>`,
  ).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

/**
 * Legacy paths removed in Phase 00 that still receive organic traffic:
 * 308 (permanent, method-preserving) to the same-host root.
 * @param {string} pathname
 * @returns {string | null}
 */
export function legacyRedirectFor(pathname) {
  for (const prefix of ["/founders", "/culture", "/bidception", "/spec"]) {
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) return "/";
  }
  return null;
}
