import { test } from "node:test";
import assert from "node:assert/strict";
import {
  resolveProductKey,
  product,
  PRODUCT_KEYS,
} from "@/lib/host";
import {
  injectSeoHead,
  legacyRedirectFor,
  normalizeHost,
  pageTitleFor,
  robotsTextFor,
  seoMeta,
  sitemapXml,
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

test("every product carries unique, domain-specific SEO fields", () => {
  const titles = new Set<string>();
  const descriptions = new Set<string>();
  for (const key of PRODUCT_KEYS) {
    const p = product(key);
    assert.ok(p.title.includes(p.apex), `${key} title names its domain`);
    assert.ok(p.description.length > 60, `${key} description is substantive`);
    titles.add(p.title);
    descriptions.add(p.description);
  }
  assert.equal(titles.size, PRODUCT_KEYS.length, "titles are unique per domain");
  assert.equal(descriptions.size, PRODUCT_KEYS.length, "descriptions are unique per domain");
});

test("canonical is the apex-host URL (www stripped), per domain + path", () => {
  const meta = seoMeta("foundersbid", "/terms");
  assert.equal(meta.canonical, "https://foundersbid.lol/terms");
  assert.equal(meta.ogUrl, "https://foundersbid.lol/terms");
  assert.equal(meta.ogImage, "https://foundersbid.lol/og.jpg");
  assert.equal(pageTitleFor("foundersbid", "/terms"), "Terms of service — FoundersBid");
});

test("robots.txt is host-aware with the domain's own sitemap URL", () => {
  assert.match(robotsTextFor("culturebid"), /Sitemap: https:\/\/culturebid\.lol\/sitemap\.xml/);
  assert.match(robotsTextFor("bidthrone"), /User-agent: \*/);
});

test("sitemap is host-aware and product-content focused (Phase 00.6, AC-6.2)", () => {
  // Each domain inventories only its OWN home URL: legal pages are
  // noindex,follow boilerplate and stay out of the sitemap.
  const xml = sitemapXml("bidthrone");
  assert.match(xml, /^<\?xml version="1.0" encoding="UTF-8"\?>/);
  assert.equal((xml.match(/<url>/g) ?? []).length, 1);
  assert.ok(xml.includes("<loc>https://bidthrone.lol/</loc>"));
  assert.ok(!/<loc>https:\/\/www\./.test(xml), "no www URLs in the sitemap");
  assert.ok(!xml.includes("/terms"), "legal pages are not in the inventory");
  assert.ok(!xml.includes("foundersbid.lol"), "no other product origin");
});

test("legacy board paths 308 to the same-host root; live paths do not", () => {
  assert.equal(legacyRedirectFor("/founders"), "/");
  assert.equal(legacyRedirectFor("/founders/bid"), "/");
  assert.equal(legacyRedirectFor("/culture"), "/");
  assert.equal(legacyRedirectFor("/bidception/listing/x"), "/");
  assert.equal(legacyRedirectFor("/spec"), "/");
  assert.equal(legacyRedirectFor("/terms"), null);
  assert.equal(legacyRedirectFor("/"), null);
  assert.equal(legacyRedirectFor("/api/webhooks/cashfree"), null);
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
  assert.ok(out.includes("<title>bidception.lol — Bidception, nested &amp; team bounties</title>"));
  assert.ok(out.includes('rel="canonical" href="https://bidception.lol/"'));
  assert.ok(out.includes('property="og:url" content="https://bidception.lol/"'));
  assert.ok(!out.includes("old example") && !out.includes("old desc"));
  // non-HTML passes through unchanged
  assert.equal(injectSeoHead('{"ok":true}', "bidthrone", "/"), '{"ok":true}');
});
