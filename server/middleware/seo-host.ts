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
 *  - `/robots.txt`   -> host-aware robots.txt (Sitemap: this domain's
 *    CANONICAL origin, which is www for culturebid while its apex DNS is
 *    broken — RC2, C2).
 *  - `/<indexnow-key>key.txt` -> IndexNow verification key (public token).
 *  - `/sitemap.xml`  -> host-aware sitemap: home, evergreen routes, blog
 *    articles, live public entities (with truthful lastmod from
 *    updated_at), and indexable public profiles.
 *  - legacy board paths (`/founders*`, `/culture*`, `/spec*`) -> 308 to the
 *    same-host root (Phase 00 replaced the boards).
 *  - any other HTML document -> status-aware head injected at `</head>`:
 *    200/3xx get entity-aware head when a real entity resolves for the path
 *    (RC2, C3: entity metadata wins), else the host-level fallback; 404 gets
 *    the not-found set — branded title, `noindex,follow`, and NO canonical
 *    for the missing path.
 *
 * Everything else passes through untouched. The dev server gets the same
 * robots/sitemap/redirect behaviour from scripts/host-seo-plugin.mjs; the
 * shared logic lives in scripts/host-seo-shared.mjs so prod and dev can
 * never disagree. (Dev deliberately does not transform the SSR head — see
 * that plugin — so deployed runtimes are the head authority.)
 */
import {
  DEFAULT_PRODUCT,
  INDEXNOW_KEY,
  buildEntityMeta,
  capabilityReadRedirectFor,
  evergreenPaths,
  injectNotFoundTheme,
  injectSeoHead,
  isIndexnowKeyPath,
  legacyRedirectFor,
  normalizeHost,
  productForHost,
  robotsTextFor,
  securityTxtFor,
  sitemapXml,
  truncateWords,
  wwwRedirectFor,
} from "../../scripts/host-seo-shared.mjs";
import { formatMinor } from "@/lib/money";

interface SeoHostEvent {
  url: URL;
  req: { method?: string; headers: Headers };
}

type SitemapEntry = { path: string; lastmod?: string | null };
type EntityMeta = ReturnType<typeof buildEntityMeta>;

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

/** Statuses whose detail pages are real public content (indexable). */
const INDEXABLE_BOUNTY = new Set([
  "OPEN",
  "APPLICATION_CLOSED",
  "SUBMISSION",
  "JUDGING",
  "AWARDED",
  "SETTLING",
  "COMPLETED",
]);
const INDEXABLE_PROJECT = new Set([
  "OPEN_FOR_PROPOSALS",
  "PROPOSAL_SELECTED",
  "AWAITING_FUNDING",
  "ACTIVE",
  "MILESTONE_REVIEW",
  "COMPLETION_REVIEW",
  "COMPLETED",
]);
const INDEXABLE_GRAVEYARD = new Set(["LISTED", "UNDER_OFFER", "TRANSFERRED"]);
const INDEXABLE_PARENT = new Set(["FUNDED", "ACTIVE", "COMPLETING", "COMPLETED"]);

/** money.ts is pure (no imports) — safe to use here without the DB chain. */
function inr(minor: number | null, currency: string): string | null {
  if (minor == null) return null;
  return formatMinor(Number(minor), currency || "INR");
}

/**
 * Live public paths + real lastmod for this product, for the sitemap. Each
 * query is product-scoped so a host only ever lists its own content.
 * Profiles pass the RC2 indexability gate (C8). Failures return [] — the
 * sitemap must still serve and never 500 a crawler because of a DB blip.
 *
 * Exported for the hermetic PGLite test (tests/seo-entity-meta.test.ts).
 */
export async function liveSitemapEntries(productKey: string): Promise<SitemapEntry[]> {
  try {
    const { getSql } = await import("@/lib/db.server");
    const sql = await getSql();
    const entries: SitemapEntry[] = [];
    const bounties = await sql.query<{ id: string; updated_at: string }>(
      `select id, updated_at from bounties where product = $1 and status in ('OPEN','APPLICATION_CLOSED','SUBMISSION','JUDGING','AWARDED','SETTLING','COMPLETED') order by updated_at desc limit 200`,
      [productKey],
    );
    for (const b of bounties) entries.push({ path: `/bounties/${b.id}`, lastmod: iso(b.updated_at) });
    const projects = await sql.query<{ id: string; updated_at: string }>(
      `select id, updated_at from projects where product = $1 and status in ('OPEN_FOR_PROPOSALS','PROPOSAL_SELECTED','AWAITING_FUNDING','ACTIVE','MILESTONE_REVIEW','COMPLETION_REVIEW','COMPLETED') order by updated_at desc limit 200`,
      [productKey],
    );
    for (const p of projects) entries.push({ path: `/projects/${p.id}`, lastmod: iso(p.updated_at) });
    const graveyard = await sql.query<{ id: string; updated_at: string }>(
      `select id, updated_at from graveyard_listings where product = $1 and status in ('LISTED','UNDER_OFFER','TRANSFERRED') order by updated_at desc limit 200`,
      [productKey],
    );
    for (const g of graveyard) entries.push({ path: `/graveyard/${g.id}`, lastmod: iso(g.updated_at) });
    const parents = await sql.query<{ id: string; updated_at: string }>(
      `select id, updated_at from parent_works where product = $1 and status in ('FUNDED','ACTIVE','COMPLETING','COMPLETED') order by updated_at desc limit 200`,
      [productKey],
    );
    for (const pw of parents) entries.push({ path: `/bidception/${pw.id}`, lastmod: iso(pw.updated_at) });
    // Public profiles (C8 gate: handle + real public content).
    const profiles = await sql.query<{ handle: string; updated_at: string }>(
      `select p.handle, p.updated_at
       from profiles p join users u on u.id = p.user_id
       where u.status = 'active' and u.banned = false and p.handle is not null and p.handle <> ''
         and (length(p.bio) > 0
              or coalesce(jsonb_array_length(p.skills), 0) > 0
              or coalesce(jsonb_array_length(p.portfolio_links), 0) > 0
              or p.github_url is not null
              or p.linkedin_url is not null
              or p.website_url is not null
              or (select count(*)::int from bounty_awards where user_id = p.user_id and place = 1) > 0)`,
    );
    for (const pr of profiles) {
      entries.push({ path: `/profile/${pr.handle}`, lastmod: iso(pr.updated_at) });
    }
    // Blog articles (static, real modifiedAt).
    const { articlesForProduct } = await import("@/content/blog/articles");
    for (const a of articlesForProduct(productKey as never)) {
      entries.push({ path: `/blog/${a.slug}`, lastmod: a.modifiedAt });
    }
    return entries;
  } catch {
    return [];
  }
}

function iso(v: unknown): string | null {
  if (!v) return null;
  const d = new Date(String(v));
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

type EntitySql = {
  query<T>(sql: string, params: unknown[]): Promise<T[]>;
};

/**
 * RC3 (S-11): one resolver per entity type — each owns its regex, its DB
 * read, its indexability set, and its title/description shape. The dispatcher
 * below stays flat; wrong-host entities never reach this (the route loader
 * redirects first), and a missing entity resolves null (host fallback).
 */

async function bountyEntityMeta(productKey: string, p: string, id: string, sql: EntitySql): Promise<EntityMeta | null> {
  const rows = await sql.query<{
    title: string; category: string; status: string;
    reward_total_minor: number | null; currency: string; description: string;
  }>(
    `select title, category, status, reward_total_minor, currency, coalesce(description, '') as description from bounties where id = $1`,
    [id],
  );
  const b = rows[0];
  if (!b) return null;
  const indexable = INDEXABLE_BOUNTY.has(b.status);
  const reward = indexable && b.reward_total_minor != null ? inr(b.reward_total_minor, b.currency) : null;
  const brand = productKey === "culturebid" ? "CultureBid" : "FoundersBid";
  return buildEntityMeta(productKey, p, {
    title: `${truncateWords(b.title, 52)}${indexable ? "" : " (draft)"} · ${b.category}${reward ? ` · ${reward}` : ""} | ${brand}`,
    description: truncateWords(b.description, 150) || `Bounty in ${b.category} on ${brand}.`,
    indexable,
  });
}

async function projectEntityMeta(productKey: string, p: string, id: string, sql: EntitySql): Promise<EntityMeta | null> {
  const rows = await sql.query<{
    title: string; category: string; status: string; description: string;
  }>(
    `select title, category, status, coalesce(description, '') as description from projects where id = $1`,
    [id],
  );
  const pr = rows[0];
  if (!pr) return null;
  const indexable = INDEXABLE_PROJECT.has(pr.status);
  return buildEntityMeta(productKey, p, {
    title: `${truncateWords(pr.title, 52)} · ${pr.category} | FoundersBid`,
    description: truncateWords(pr.description, 150) || `A project brief on FoundersBid.`,
    indexable,
  });
}

async function graveyardEntityMeta(productKey: string, p: string, id: string, sql: EntitySql): Promise<EntityMeta | null> {
  const rows = await sql.query<{
    title: string; status: string; description: string;
    asking_price_minor: number | null; currency: string;
  }>(
    `select title, status, coalesce(description, '') as description, asking_price_minor, currency from graveyard_listings where id = $1`,
    [id],
  );
  const g = rows[0];
  if (!g) return null;
  const indexable = INDEXABLE_GRAVEYARD.has(g.status);
  const price = indexable && g.asking_price_minor != null ? inr(g.asking_price_minor, g.currency) : null;
  return buildEntityMeta(productKey, p, {
    title: `${truncateWords(g.title, 52)} · ${price ?? "Open to offers"} | FoundersBid Graveyard`,
    description: truncateWords(g.description, 150) || "An abandoned project offered for transfer on FoundersBid.",
    indexable,
  });
}

async function parentEntityMeta(productKey: string, p: string, id: string, sql: EntitySql): Promise<EntityMeta | null> {
  const rows = await sql.query<{
    title: string; status: string; objective: string;
    funded_budget_minor: number | null; currency: string;
  }>(
    `select title, status, coalesce(objective, '') as objective, funded_budget_minor, currency from parent_works where id = $1`,
    [id],
  );
  const pw = rows[0];
  if (!pw) return null;
  const indexable = INDEXABLE_PARENT.has(pw.status);
  const budget = indexable && pw.funded_budget_minor != null ? inr(pw.funded_budget_minor, pw.currency) : null;
  return buildEntityMeta(productKey, p, {
    title: `${truncateWords(pw.title, 52)} · ${budget ?? "Team project"} | Bidception`,
    description: truncateWords(pw.objective, 150) || "One funded project, built as a team on Bidception.",
    indexable,
  });
}

async function profileEntityMeta(productKey: string, p: string, handle: string): Promise<EntityMeta | null> {
  const { getPublicProfile } = await import("@/lib/profiles.server");
  const profile = await getPublicProfile(handle);
  if (!profile) return null;
  const hasContent =
    profile.bio.length > 0 ||
    profile.skills.length > 0 ||
    profile.portfolioLinks.length > 0 ||
    Boolean(profile.githubUrl || profile.linkedinUrl || profile.websiteUrl);
  const skills = profile.skills.slice(0, 4).join(", ");
  const desc = hasContent
    ? truncateWords(profile.bio || (skills ? `Public profile. Skills: ${skills}.` : "Public profile on the Bid Network."), 150)
    : "Public profile on the Bid Network.";
  return buildEntityMeta(productKey, p, {
    title: `${truncateWords(profile.displayName, 40)} (@${profile.handle}) | Bid Network`,
    description: desc,
    ogType: "profile",
    indexable: hasContent,
  });
}

async function blogEntityMeta(productKey: string, p: string, slug: string): Promise<EntityMeta | null> {
  const { articleBySlug } = await import("@/content/blog/articles");
  const article = articleBySlug(slug);
  if (!article) return null;
  // The loader has already redirected cross-host article reads, so this
  // branch only runs when article.product === productKey.
  return buildEntityMeta(productKey, p, {
    title: article.seoTitle,
    description: article.description,
    ogType: "article",
    extraHeadTags: [
      `<meta property="article:published_time" content="${article.publishedAt}">`,
      `<meta property="article:modified_time" content="${article.modifiedAt}">`,
    ],
  });
}

/**
 * Entity-level head for the detail routes (RC2, C3; RC3 S-11 split).
 * Returns null when no entity resolves (the route then 404s or falls back
 * to host-level meta).
 *
 * Exported for the hermetic PGLite test (tests/seo-entity-meta.test.ts).
 */
export async function entityMetaFor(productKey: string, pathname: string): Promise<EntityMeta | null> {
  const p = pathname;
  try {
    // Lazy: the DB is only touched when a path actually matches an entity
    // shape (same semantics as the RC2 per-branch imports).
    let sql: EntitySql | null = null;
    const tx = async (): Promise<EntitySql> => {
      if (!sql) {
        const { getSql } = await import("@/lib/db.server");
        sql = await getSql();
      }
      return sql;
    };
    const mBounty = /^\/bounties\/([A-Za-z0-9_-]{4,64})$/.exec(p);
    if (mBounty) return await bountyEntityMeta(productKey, p, mBounty[1], await tx());
    const mProject = /^\/projects\/([A-Za-z0-9_-]{4,64})$/.exec(p);
    if (mProject) return await projectEntityMeta(productKey, p, mProject[1], await tx());
    const mGraveyard = /^\/graveyard\/([A-Za-z0-9_-]{4,64})$/.exec(p);
    if (mGraveyard) return await graveyardEntityMeta(productKey, p, mGraveyard[1], await tx());
    const mParent = /^\/bidception\/([A-Za-z0-9_-]{4,64})$/.exec(p);
    if (mParent) return await parentEntityMeta(productKey, p, mParent[1], await tx());
    const mProfile = /^\/profile\/([A-Za-z0-9_-]{1,64})$/.exec(p);
    if (mProfile) return await profileEntityMeta(productKey, p, mProfile[1]);
    const mBlog = /^\/blog\/([a-z0-9][a-z0-9-]{0,96})$/.exec(p);
    if (mBlog) return await blogEntityMeta(productKey, p, mBlog[1]);
    return null;
  } catch {
    return null; // entity lookup never breaks the page; host fallback applies
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

  // Security disclosure (RC3, S-10.6): host-aware contact + policy + expiry.
  if (path === "/.well-known/security.txt") {
    return new Response(securityTxtFor(productKey), {
      headers: {
        "content-type": "text/plain; charset=utf-8",
        "cache-control": "public, max-age=3600",
      },
    });
  }

  // IndexNow verification key (RC2, C10): public token, one file per host.
  if (isIndexnowKeyPath(path)) {
    return new Response(INDEXNOW_KEY, {
      headers: {
        "content-type": "text/plain; charset=utf-8",
        "cache-control": "public, max-age=86400",
      },
    });
  }

  if (path === "/sitemap.xml") {
    // Host-aware inventory: home + evergreen + blog + live public entities
    // (truthful lastmod) + indexable profiles. All on this host's CANONICAL
    // origin (www for culturebid while its apex DNS is broken).
    const live = await liveSitemapEntries(productKey);
    const entries: SitemapEntry[] = [
      ...evergreenPaths(productKey).map((path2) => ({ path: path2, lastmod: null })),
      ...live,
    ];
    return new Response(sitemapXml(productKey, entries), {
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
  // 404: theme the <html> for the branded not-found page.
  if (original.status === 404) html = injectNotFoundTheme(html, productKey);
  // Entity-aware head when a real entity resolves (RC2, C3); otherwise the
  // host-level fallback. 404s get the not-found set.
  let entityMeta: EntityMeta | null = null;
  if (original.status === 200) {
    entityMeta = await entityMetaFor(productKey, path);
  }
  const transformed = injectSeoHead(html, productKey, path, original.status, entityMeta);
  const headers = new Headers(original.headers);
  headers.delete("content-length");
  headers.set("content-type", "text/html; charset=utf-8");
  return new Response(transformed, {
    status: original.status,
    statusText: original.statusText,
    headers,
  });
}
