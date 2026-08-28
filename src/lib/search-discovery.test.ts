import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import {
  PRODUCTS,
  PRODUCT_KEYS,
  injectSeoHead,
  seoOrigin,
  seoMeta,
  pageTitleFor,
  evergreenPaths,
  robotsMetaFor,
  sitemapXml,
} from "../../scripts/host-seo-shared.mjs";
import {
  BLOG_ARTICLES,
  articleBySlug,
  articlesForProduct,
  type BlogArticle,
} from "@/content/blog/articles";
import {
  BID_NETWORK_ORG_ID,
  bidNetworkOrganization,
  blogPostingSchema,
  breadcrumbSchema,
  itemListSchema,
  profileSchema,
  websiteSchema,
} from "@/lib/schema";

const root = join(import.meta.dirname, "..", "..");

/** Walk a directory tree; returns file paths only. */
function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

// ── C1: product metadata ────────────────────────────────────────────────

test("homepage titles and descriptions are unique across the four products", () => {
  const titles = PRODUCT_KEYS.map((k) => PRODUCTS[k].title);
  const descs = PRODUCT_KEYS.map((k) => PRODUCTS[k].description);
  assert.equal(new Set(titles).size, 4, "unique home titles");
  assert.equal(new Set(descs).size, 4, "unique home descriptions");
});

test("no product metadata carries pre-launch phrasing (RC2, C1.2)", () => {
  for (const key of PRODUCT_KEYS) {
    const p = PRODUCTS[key];
    const blob = `${p.title} ${p.description} ${p.kicker} ${p.oneLine}`;
    assert.ok(!/coming next/i.test(blob), `${key}: no "coming next"`);
    assert.ok(!/opens in stages/i.test(blob), `${key}: no "opens in stages"`);
    assert.ok(!/later product/i.test(blob), `${key}: no "later product"`);
  }
});

// ── C2: canonical origins ──────────────────────────────────────────────

test("no metadata points at the broken culturebid apex origin", () => {
  for (const key of PRODUCT_KEYS) {
    const meta = seoMeta(key, "/");
    for (const field of [meta.canonical, meta.ogUrl, meta.ogImage]) {
      assert.ok(!field.startsWith("https://culturebid.lol") || key !== "culturebid",
        `culturebid metadata uses the apex origin: ${field}`);
    }
    assert.ok(meta.canonical.startsWith(seoOrigin(key)), `${key} canonical on its canonical origin`);
  }
});

// ── C5: blog architecture ──────────────────────────────────────────────

test("blog: one flagship article per product, unique slugs network-wide", () => {
  const slugs = new Set(BLOG_ARTICLES.map((a) => a.slug));
  assert.equal(slugs.size, BLOG_ARTICLES.length, "slugs are unique");
  for (const key of PRODUCT_KEYS) {
    const arts = articlesForProduct(key);
    assert.equal(arts.length, 1, `${key} hosts exactly one article`);
    assert.equal(arts[0].product, key, `article product matches ${key}`);
  }
  assert.equal(articleBySlug("bounty-or-project")?.product, "foundersbid");
  assert.equal(articleBySlug("does-not-exist"), null);
});

test("blog: article metadata is well-formed (dates, brand-bearing SEO title)", () => {
  for (const a of BLOG_ARTICLES) {
    assert.ok(!Number.isNaN(new Date(a.publishedAt).getTime()), `${a.slug}: publishedAt is a real date`);
    assert.ok(a.publishedAt <= a.modifiedAt, `${a.slug}: modified >= published`);
    assert.ok(a.seoTitle.includes(PRODUCTS[a.product].name), `${a.slug}: SEO title carries the brand`);
    assert.ok(a.description.length >= 50, `${a.slug}: description is substantive`);
    assert.ok(a.blocks.length > 5, `${a.slug}: article has real body blocks`);
    const firstP = a.blocks.find((b) => b.kind === "p");
    assert.ok(firstP && firstP.kind === "p" && firstP.text.length > 40, `${a.slug}: opens with a direct paragraph`);
  }
});

test("blog: every article is linked from its home (no orphan article, RC2 C5.6)", () => {
  const homes = walk(join(root, "src", "components", "home"));
  const homeText = homes.map((f) => readFileSync(f, "utf8")).join("\n");
  for (const a of BLOG_ARTICLES) {
    assert.ok(homeText.includes(`/blog/${a.slug}`), `home copy links /blog/${a.slug}`);
  }
});

// ── C6: structured data ────────────────────────────────────────────────

test("schema: Bid Network organization has one stable @id", () => {
  assert.equal(bidNetworkOrganization()["@id"], BID_NETWORK_ORG_ID);
  assert.deepEqual(websiteSchema("bidthrone").publisher, { "@id": BID_NETWORK_ORG_ID });
  for (const key of PRODUCT_KEYS) {
    const ws = websiteSchema(key);
    assert.equal(ws.url, seoOrigin(key), `${key} WebSite url = canonical origin`);
    assert.deepEqual(ws.publisher, { "@id": BID_NETWORK_ORG_ID });
  }
});

test("schema: BlogPosting carries only real article fields (no person author)", () => {
  const article = articleBySlug("bounty-or-project")!;
  const s = blogPostingSchema("foundersbid", article) as Record<string, unknown>;
  assert.equal(s["@type"], "BlogPosting");
  assert.equal(s.headline, article.headline);
  assert.equal(s.datePublished, article.publishedAt);
  assert.equal(s.dateModified, article.modifiedAt);
  assert.equal((s.author as Record<string, unknown>)["@type"], "Organization");
  assert.equal((s.publisher as Record<string, unknown>)["@type"], "Organization");
  assert.equal((s.mainEntityOfPage as Record<string, unknown>)["@id"], "https://foundersbid.lol/blog/bounty-or-project");
});

test("schema: profile + breadcrumb + itemlist shapes", () => {
  const pr = profileSchema("bidthrone", {
    displayName: "Ada",
    handle: "ada",
    bio: "Builder.",
    skills: ["development"],
    websiteUrl: "https://ada.example",
    githubUrl: null,
    linkedinUrl: null,
  }) as Record<string, unknown>;
  assert.equal(pr["@type"], "ProfilePage");
  assert.equal((pr.mainEntity as Record<string, unknown>)["@type"], "Person");
  assert.deepEqual((pr.mainEntity as Record<string, unknown>).sameAs, ["https://ada.example"]);

  const crumb = breadcrumbSchema("foundersbid", [
    { name: "FoundersBid", url: "https://foundersbid.lol" },
    { name: "Bounties", url: "https://foundersbid.lol/bounties" },
  ]) as Record<string, unknown>;
  assert.equal((crumb.itemListElement as unknown[]).length, 2);

  const list = itemListSchema("foundersbid", [{ name: "T", url: "https://foundersbid.lol/bounties/x" }]) as Record<string, unknown>;
  assert.equal((list.itemListElement as { position: number }[])[0].position, 1);
});

test("schema: no fabricated rich-result types anywhere in public source (RC2, C6.7)", () => {
  const banned = ["AggregateRating", "FAQPage", "JobPosting", "ReviewAggregate"];
  const files = walk(join(root, "src")).filter(
    (f) => (f.endsWith(".tsx") || f.endsWith(".ts")) && !f.includes(".test."),
  );
  for (const f of files) {
    // Strip block comments: schema.ts documents the banned types by name,
    // which is the point of the check (emitted nodes, not doc prose).
    const text = readFileSync(f, "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    for (const token of banned) {
      assert.ok(!text.includes(token), `${f} emits ${token}`);
    }
    // An "Offer" JSON-LD type would be a fake marketplace price claim; the
    // graveyard OFFER feature is a separate, user-facing workflow (its UI
    // strings are not schema types) and is not banned.
    assert.ok(!/"@type"\s*:\s*"Offer"/.test(text), `${f} emits an Offer node`);
  }
});

// ── C7: sitemaps ───────────────────────────────────────────────────────

test("sitemap: evergreen paths match the capability matrix", () => {
  assert.deepEqual(evergreenPaths("foundersbid").sort(), ["/blog", "/bounties", "/graveyard", "/projects"].sort());
  assert.deepEqual(evergreenPaths("culturebid").sort(), ["/blog", "/bounties"].sort());
  assert.deepEqual(evergreenPaths("bidception").sort(), ["/bidception", "/blog"].sort());
  assert.deepEqual(evergreenPaths("bidthrone").sort(), ["/blog", "/leaderboards"].sort());
  // no private/create/legal URL is ever evergreen
  for (const key of PRODUCT_KEYS) {
    for (const path of evergreenPaths(key)) {
      assert.ok(!["/dashboard", "/signin", "/signup", "/settings/profile", "/bounties/new", "/projects/new", "/graveyard/new", "/bidception/new", "/terms", "/privacy", "/refund", "/contact", "/bid-index"].includes(path), `${key}: ${path} must not be in the inventory`);
    }
  }
});

test("sitemap: the /bid-index gated aggregate is not an evergreen URL", () => {
  for (const key of PRODUCT_KEYS) {
    assert.ok(!evergreenPaths(key).includes("/bid-index"));
  }
});

// ── C12: duplicate-meta audit over indexable static routes ─────────────

test("metadata: indexable static routes have unique titles per product", () => {
  for (const key of PRODUCT_KEYS) {
    const paths = ["/", ...evergreenPaths(key)];
    const titles = new Set(paths.map((p) => pageTitleFor(key, p)));
    assert.equal(titles.size, paths.length, `${key} static titles unique: ${[...titles].join(" | ")}`);
    // and none of the static titles collides with the product home title in
    // a way that would read as one page
    for (const p of paths.slice(1)) {
      assert.notEqual(pageTitleFor(key, p), seoMeta(key, "/").title, `${key} ${p} title differs from the home title`);
    }
  }
});

test("metadata: private routes stay noindex in the head set (RC2, C12)", () => {
  const html = "<html><head><title>x</title></head><body></body></html>";
  for (const p of ["/dashboard", "/signin", "/signup"]) {
    const out = injectSeoHead(html, "foundersbid", p, 200);
    assert.match(out, /noindex,follow/, `${p} is noindex`);
  }
  const pub = injectSeoHead(html, "foundersbid", "/blog", 200);
  assert.match(pub, /index,follow/, "/blog is indexable");
});

test("sitemap: full inventory for a product contains blog + evergreen, never private", () => {
  const xml = sitemapXml("foundersbid", [
    ...evergreenPaths("foundersbid").map((path) => ({ path, lastmod: null })),
    { path: "/blog/bounty-or-project", lastmod: "2026-08-28T00:00:00.000Z" },
    { path: "/bounties/bnt_1", lastmod: null },
  ]);
  assert.ok(xml.includes("https://foundersbid.lol/bounties"));
  assert.ok(xml.includes("https://foundersbid.lol/blog/bounty-or-project"));
  assert.ok(xml.includes("https://foundersbid.lol/bounties/bnt_1"));
  assert.ok(!xml.includes("/bounties/new"));
  assert.ok(!xml.includes("/dashboard"));
  assert.ok(!xml.includes("/signin"));
  assert.ok(!xml.includes("/terms"));
  assert.ok(!xml.includes("/bid-index"));
});

test("robots meta for entity detail paths stays indexable at the host fallback layer", () => {
  // The host-level fallback (no entity resolved) keeps detail pages
  // indexable; the entity layer downgrades drafts to noindex.
  assert.equal(robotsMetaFor("foundersbid", "/bounties/whatever"), "index,follow");
  assert.equal(robotsMetaFor("bidthrone", "/profile/whatever"), "index,follow");
});
