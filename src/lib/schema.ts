/**
 * JSON-LD builders (RC2, C6). Pure data, no React: routes emit these with
 * <JsonLd /> so every schema claim is in the initial HTML.
 *
 * Rules this module enforces by construction:
 *  - the Bid Network organization has ONE stable @id, declared in full on
 *    the bidthrone home and referenced (never redeclared with a different
 *    URL) everywhere else;
 *  - blog authors/publishers are organizations (the products), never
 *    invented persons;
 *  - no AggregateRating, no Review counts, no Offer, no FAQPage, no
 *    JobPosting: nothing here may claim data the page does not show.
 */
import { product, seoOrigin, type ProductKey } from "@/lib/host";

/** @type {Record<string, unknown>} */
type Node = Record<string, unknown>;

/** Stable identity for the umbrella organization (AC-6.2). */
export const BID_NETWORK_ORG_ID = "https://bidthrone.lol/#organization";

/**
 * Full Organization node for the Bid Network. Declared once, on the
 * bidthrone home (the umbrella domain).
 */
export function bidNetworkOrganization(): Node {
  return {
    "@type": "Organization",
    "@id": BID_NETWORK_ORG_ID,
    name: "Bid Network",
    url: "https://bidthrone.lol",
    description:
      "An internet bounty network. Put a clear budget on useful work and make the rules visible before anyone starts: startup work on FoundersBid, creative work on CultureBid, team projects on Bidception, and the public work record on Bidthrone.",
  };
}

/**
 * Product-level organization node, consistent with the product's one-line
 * description used in metadata and footer (AC-21 of the RC2 brief).
 */
export function productOrganization(key: ProductKey): Node {
  const p = product(key);
  return {
    "@type": "Organization",
    name: p.name,
    url: seoOrigin(key),
    description: p.oneLine,
    parentOrganization: { "@id": BID_NETWORK_ORG_ID },
  };
}

/** WebSite node for a product home. */
export function websiteSchema(key: ProductKey): Node {
  return {
    "@type": "WebSite",
    name: product(key).name,
    url: seoOrigin(key),
    publisher: { "@id": BID_NETWORK_ORG_ID },
  };
}

/** BlogPosting for one article. Organization author and publisher only. */
export function blogPostingSchema(
  key: ProductKey,
  article: {
    slug: string;
    headline: string;
    description: string;
    publishedAt: string;
    modifiedAt: string;
  },
): Node {
  const origin = seoOrigin(key);
  const url = `${origin}/blog/${article.slug}`;
  const org = productOrganization(key);
  return {
    "@type": "BlogPosting",
    headline: article.headline,
    description: article.description,
    datePublished: article.publishedAt,
    dateModified: article.modifiedAt,
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    author: org,
    publisher: org,
    isPartOf: { "@id": `${origin}/#website` },
  };
}

/** ItemList for a page that visibly lists entities (AC-6.6). */
export function itemListSchema(
  key: ProductKey,
  items: { name: string; url: string }[],
): Node {
  return {
    "@type": "ItemList",
    name: product(key).name,
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      url: it.url,
    })),
  };
}

/** BreadcrumbList matching the visible link trail. */
export function breadcrumbSchema(key: ProductKey, trail: { name: string; url: string }[]): Node {
  return {
    "@type": "BreadcrumbList",
    itemListElement: trail.map((t, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: t.name,
      item: t.url,
    })),
  };
}

/** ProfilePage for an indexable public profile (AC-6.4, C8). */
export function profileSchema(
  key: ProductKey,
  profile: {
    displayName: string;
    handle: string;
    bio: string;
    skills: string[];
    websiteUrl: string | null;
    githubUrl: string | null;
    linkedinUrl: string | null;
  },
): Node {
  const origin = seoOrigin(key);
  const url = `${origin}/profile/${profile.handle}`;
  const sameAs = [profile.websiteUrl, profile.githubUrl, profile.linkedinUrl].filter(
    (v): v is string => Boolean(v),
  );
  return {
    "@type": "ProfilePage",
    name: profile.displayName,
    url,
    description: profile.bio.slice(0, 160) || `Public profile on ${product(key).name}.`,
    mainEntity: {
      "@type": "Person",
      name: profile.displayName,
      url,
      ...(sameAs.length > 0 ? { sameAs } : {}),
    },
  };
}
