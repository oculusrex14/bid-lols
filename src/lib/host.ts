import {
  DEFAULT_PRODUCT,
  PRODUCTS,
  PRODUCT_KEYS,
  linkOrigin,
  normalizeHost,
  pageTitleFor,
  productForHost,
  seoOrigin,
  themeColorFor,
  THEME_COLORS,
  truncateWords,
  evergreenPaths,
  DEFAULT_THEME_MODE,
} from "../../scripts/host-seo-shared.mjs";

/**
 * Typed view over scripts/host-seo-shared.mjs (the single source of truth for
 * host <-> product mapping and copy, shared with the Nitro middleware, the Vite
 * dev plugin, and the tests).
 */

export type ProductKey = (typeof PRODUCT_KEYS)[number];
export type Product = (typeof PRODUCTS)[string];

export {
  PRODUCT_KEYS,
  DEFAULT_PRODUCT,
  PRODUCTS,
  normalizeHost,
  productForHost,
  pageTitleFor,
  linkOrigin,
  /** RC2, C2: the canonical origin for declarative URLs (www for culturebid
   *  while its apex DNS is broken; see host-seo-shared.mjs). */
  seoOrigin,
  truncateWords,
  evergreenPaths,
  /** RC3, S-38 / RC5 §9: product-aware browser chrome color for the
   *  product DEFAULT mode (Bidthrone ships dark; the shell swaps the value
   *  after hydration when the stored preference differs). */
  themeColorFor,
  THEME_COLORS,
  /** RC5 §9: default appearance per product (Bidthrone dark-first). */
  DEFAULT_THEME_MODE,
};

/** @param {ProductKey} key */
export function product(key: ProductKey): Product {
  return PRODUCTS[key];
}

/**
 * Map a Host header value to a product key. Unknown hosts resolve to the
 * umbrella default (keeps Vercel preview URLs and local dev working).
 */
export function resolveProductKey(host: string | null | undefined): ProductKey {
  return (productForHost(normalizeHost(host)) ?? DEFAULT_PRODUCT) as ProductKey;
}

/**
 * The product for the request being rendered.
 *
 * - SSR: reads the request Host header through Start's per-request context
 *   (`getRequestHost`, x-forwarded-host first on Vercel).
 * - Client: `window.location.host` — synchronous, and identical to the SSR
 *   value for the same request, so hydration never mismatches.
 */
export async function currentProductKey(): Promise<ProductKey> {
  if (import.meta.env.SSR) {
    // The SSR branch is tree-shaken from the client build; the `.server`
    // module (and its react-start/server import) never ships to browsers.
    const { serverProductKey } = await import("@/lib/host.server");
    return serverProductKey();
  }
  return resolveProductKey(window.location.host);
}
