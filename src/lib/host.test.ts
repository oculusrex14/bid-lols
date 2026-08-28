import { test } from "node:test";
import assert from "node:assert/strict";
import {
  resolveProductKey,
  product,
  PRODUCT_KEYS,
  linkOrigin,
  seoOrigin,
  evergreenPaths,
  truncateWords,
} from "@/lib/host";
import {
  INDEXNOW_KEY,
  injectSeoHead,
  isIndexnowKeyPath,
  legacyRedirectFor,
  normalizeHost,
  pageTitleFor,
  robotsTextFor,
  robotsMetaFor,
  seoMeta,
  sitemapXml,
  wwwRedirectFor,
  buildEntityMeta,
} from "../../scripts/host-seo-shared.mjs";

test("product hosts resolve to their product", () => {
  assert.equal(resolveProductKey("foundersbid.lol"), "foundersbid");
  assert.equal(resolveProductKey("culturebid.lol"), "culturebid");
  assert.equal(resolveProductKey("bidception.lol"), "bidception");
  assert.equal(resolveProductKey("bidthrone.lol"), "bidthrone");
});

test("www. and ports normalize to the apex product", () => {
  assert.equal(normalizeHost("WWW.FoundersBid.Lol:443"), "foundersbid.lol");
  assert.equal(resolveProductKey("www.bidthrone.lol"), "bidthrone");
  assert.equal(resolveProductKey("culturebid.lol:8080"), "culturebid");
});

test("unknown hosts fall back to the umbrella default (never 404)", () => {
  assert.equal(resolveProductKey("vercel.app-preview.xyz"), "bidthrone");
  assert.equal(resolveProductKey("127.0.0.1:8080"), "bidthrone");
  assert.equal(resolveProductKey(null), "bidthrone");
  assert.equal(resolveProductKey(undefined), "bidthrone");
});

test("every product carries unique, brand-bearing SEO fields (RC2, C1)", () => {
  const titles = new Set<string>();
  const descriptions = new Set<string>();
  for (const key of PRODUCT_KEYS) {
    const p = product(key);
    assert.ok(p.title.includes(p.name), `${key} title carries the brand`);
    assert.ok(p.description.length > 60, `${key} description is substantive`);
    assert.ok(!/coming next/i.test(p.description), `${key} description is not pre-launch copy`);
    titles.add(p.title);
    descriptions.add(p.description);
  }
  assert.equal(titles.size, PRODUCT_KEYS.length, "titles are unique per product");
  assert.equal(descriptions.size, PRODUCT_KEYS.length, "descriptions are unique per product");
});

test("seoOrigin: culturebid canonical is www while its apex DNS is broken (RC2, C2)", () => {
  for (const key of PRODUCT_KEYS) {
    assert.equal(seoOrigin(key), linkOrigin(key), `${key}: canonical origin === link origin in the current DNS mode`);
  }
  assert.equal(seoOrigin("culturebid"), "https://www.culturebid.lol");
  assert.equal(seoOrigin("foundersbid"), "https://foundersbid.lol");
  assert.equal(seoOrigin("bidception"), "https://bidception.lol");
  assert.equal(seoOrigin("bidthrone"), "https://bidthrone.lol");
});

test("canonical is the CANONICAL-origin URL per domain + path", () => {
  const meta = seoMeta("foundersbid", "/terms");
  assert.equal(meta.canonical, "https://foundersbid.lol/terms");
  assert.equal(meta.ogUrl, "https://foundersbid.lol/terms");
  assert.equal(meta.ogImage, "https://foundersbid.lol/og.jpg");
  assert.equal(pageTitleFor("foundersbid", "/terms"), "Terms of service | FoundersBid");
  // culturebid: the working origin, not the broken apex
  const cb = seoMeta("culturebid", "/bounties");
  assert.equal(cb.canonical, "https://www.culturebid.lol/bounties");
  assert.equal(cb.ogUrl, "https://www.culturebid.lol/bounties");
  assert.equal(cb.ogImage, "https://www.culturebid.lol/og.jpg");
});

test("product-aware /bounties title (RC2, C1)", () => {
  assert.equal(pageTitleFor("foundersbid", "/bounties"), "Open bounties | FoundersBid");
  assert.equal(pageTitleFor("culturebid", "/bounties"), "Creative bounties | CultureBid");
});

test("robots.txt is host-aware with the CANONICAL-origin sitemap URL (RC2, C9)", () => {
  assert.match(robotsTextFor("culturebid"), /Sitemap: https:\/\/www\.culturebid\.lol\/sitemap\.xml/);
  assert.match(robotsTextFor("bidthrone"), /User-agent: \*/);
  // OAI-SearchBot (ChatGPT Search) is covered by the wildcard and not blocked.
  const robots = robotsTextFor("foundersbid");
  assert.ok(!/Disallow/i.test(robots), "no public route is robots-blocked");
});

test("indexing policy: private surfaces noindex, public surfaces index (RC2, C9/C12)", () => {
  for (const path of ["/dashboard", "/settings/profile", "/admin", "/bid-index", "/signin", "/signup", "/terms", "/privacy", "/refund", "/contact", "/api/webhooks/cashfree"]) {
    assert.equal(robotsMetaFor("bidthrone", path), "noindex,follow", `${path} stays noindex`);
  }
  for (const path of ["/", "/bounties", "/bounties/bnt_x", "/projects", "/graveyard", "/bidception", "/leaderboards", "/blog", "/blog/some-article", "/profile/someone"]) {
    assert.equal(robotsMetaFor("bidthrone", path), "index,follow", `${path} is indexable`);
  }
});

test("sitemap: home + evergreen + entities, canonical origin, truthful lastmod only (RC2, C7)", () => {
  const xml = sitemapXml("bidthrone", [
    ...evergreenPaths("bidthrone").map((path) => ({ path, lastmod: null })),
    { path: "/blog/reputation-from-completed-work", lastmod: "2026-08-28T00:00:00.000Z" },
  ]);
  assert.match(xml, /^<\?xml version="1.0" encoding="UTF-8"\?>/);
  assert.ok(xml.includes("<loc>https://bidthrone.lol/</loc>"));
  assert.ok(xml.includes("<loc>https://bidthrone.lol/leaderboards</loc>"));
  assert.ok(xml.includes("<loc>https://bidthrone.lol/blog</loc>"));
  assert.ok(xml.includes("<loc>https://bidthrone.lol/blog/reputation-from-completed-work</loc>"));
  assert.match(xml, /<lastmod>2026-08-28T00:00:00\.000Z<\/lastmod>/);
  // evergreen URLs carry no fabricated lastmod
  const blogIndexBlock = xml.slice(xml.indexOf("<loc>https://bidthrone.lol/blog</loc>"), xml.indexOf("</url>", xml.indexOf("<loc>https://bidthrone.lol/blog</loc>")));
  assert.ok(!blogIndexBlock.includes("<lastmod>"), "no lastmod on the blog index URL");
  assert.ok(!/<loc>https:\/\/www\./.test(xml), "no www URLs on a DNS-healthy apex");
  assert.ok(!xml.includes("/terms"), "legal pages are not in the inventory");
  assert.ok(!xml.includes("foundersbid.lol"), "no other product origin");

  // culturebid: every URL on the canonical (www) origin
  const cbXml = sitemapXml("culturebid", [{ path: "/bounties", lastmod: null }]);
  assert.ok(cbXml.includes("<loc>https://www.culturebid.lol/bounties</loc>"));
  assert.ok(!cbXml.includes("https://culturebid.lol"), "broken apex origin never appears");

  // entity entries without lastmod stay lastmod-free
  const plain = sitemapXml("foundersbid", [{ path: "/bounties/bnt_x" }]);
  assert.ok(!plain.includes("<lastmod>"), "no fabricated lastmod when none is provided");
});

test("legacy board paths 308 to the same-host root; live paths do not", () => {
  assert.equal(legacyRedirectFor("/founders"), "/");
  assert.equal(legacyRedirectFor("/founders/bid"), "/");
  assert.equal(legacyRedirectFor("/culture"), "/");
  // `/bidception` is a LIVE product root (Phase 03), not legacy:
  assert.equal(legacyRedirectFor("/bidception"), null);
  assert.equal(legacyRedirectFor("/bidception/new"), null);
  assert.equal(legacyRedirectFor("/spec"), "/");
  assert.equal(legacyRedirectFor("/terms"), null);
  assert.equal(legacyRedirectFor("/"), null);
  assert.equal(legacyRedirectFor("/api/webhooks/cashfree"), null);
});

test("www 301s stay unchanged for the three DNS-healthy products (RC2 regression guard)", () => {
  for (const key of ["bidthrone", "foundersbid", "bidception"] as const) {
    const apex = product(key).apex;
    assert.equal(wwwRedirectFor(`www.${apex}`, "/blog"), `https://${apex}/blog`);
  }
  assert.equal(wwwRedirectFor("www.culturebid.lol", "/blog"), null, "culturebid www is canonical; never 301");
});

test("injectSeoHead replaces the head with one host-aware title set", () => {
  const html =
    "<!doctype html><html><head><title>old</title>" +
    '<meta name="description" content="old desc">' +
    '<link rel="canonical" href="https://old.example/">' +
    '<meta property="og:title" content="old og">' +
    "</head><body>hi</body></html>";
  const out = injectSeoHead(html, "bidception", "/");
  assert.equal((out.match(/<title>/g) ?? []).length, 1);
  assert.ok(out.includes("<title>Build Projects With Freelance Teams | Bidception</title>"));
  assert.ok(out.includes('rel="canonical" href="https://bidception.lol/"'));
  assert.ok(out.includes('property="og:url" content="https://bidception.lol/"'));
  assert.ok(!out.includes("old.example") && !out.includes("old desc"));
  // non-HTML passes through unchanged
  assert.equal(injectSeoHead('{"ok":true}', "bidthrone", "/"), '{"ok":true}');
});

test("entity meta wins over the host fallback and escapes user content (RC2, C3)", () => {
  const meta = buildEntityMeta("foundersbid", "/bounties/bnt_x", {
    title: "Evil <script>alert(1)</script> title · dev · ₹85,000 | FoundersBid",
    description: "A bounded task with a fixed reward. \"Quotes\" and <tags> are data.",
  });
  assert.equal(meta.canonical, "https://foundersbid.lol/bounties/bnt_x");
  assert.equal(meta.ogType, "website");
  assert.equal(meta.robots, "index,follow");
  const html = "<!doctype html><html><head><title>old</title></head><body></body></html>";
  const out = injectSeoHead(html, "foundersbid", "/bounties/bnt_x", 200, meta);
  assert.ok(!out.includes("<script>alert"), "entity title is escaped in the head");
  assert.ok(out.includes("Evil &lt;script>alert(1)&lt;/script> title"), "escaped: " + (out.match(/<title>[\s\S]*?<\/title>/)?.[0] ?? ""));
  assert.equal(meta.robots, "index,follow");

  // drafts / cancelled entities get noindex,follow
  const draft = buildEntityMeta("foundersbid", "/bounties/bnt_y", {
    title: "Draft thing",
    description: "x",
    indexable: false,
  });
  assert.equal(draft.robots, "noindex,follow");

  // articles: og:type article + date tags
  const article = buildEntityMeta("foundersbid", "/blog/bounty-or-project", {
    title: "A Better Way to Hire Freelancers for Startup Projects | FoundersBid",
    description: "desc",
    ogType: "article",
    extraHeadTags: [
      '<meta property="article:published_time" content="2026-08-28">',
      '<meta property="article:modified_time" content="2026-08-28">',
    ],
  });
  assert.equal(article.ogType, "article");
  const out2 = injectSeoHead(html, "foundersbid", "/blog/bounty-or-project", 200, article);
  assert.ok(out2.includes('article:published_time" content="2026-08-28"'));
});

test("truncateWords cuts at word boundaries without an ellipsis", () => {
  assert.equal(truncateWords("short", 40), "short");
  assert.equal(truncateWords("alpha beta gamma delta", 11), "alpha beta");
  assert.equal(truncateWords("   spaced   out    ", 20), "spaced out");
});

test("IndexNow key is a stable committed GUID (RC2, C10)", () => {
  assert.match(INDEXNOW_KEY, /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  assert.ok(isIndexnowKeyPath(`/${INDEXNOW_KEY}key.txt`));
  assert.ok(!isIndexnowKeyPath("/indexnow-key.txt"));
  assert.ok(!isIndexnowKeyPath("/"));
});
