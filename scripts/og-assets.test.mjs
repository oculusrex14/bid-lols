import { test } from "node:test";
import assert from "node:assert/strict";
import { access, readFile, stat } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import {
  OG_ASSET_VERSION,
  ogImageFor,
  ogImageAltFor,
  renderSeoHeadTags,
  buildEntityMeta,
} from "./host-seo-shared.mjs";

/**
 * RC4 P0: social-card integrity. X still showed the legacy "pay to rank"
 * artwork via ${origin}/og.jpg; these tests pin the versioned replacement
 * and the full OG/Twitter metadata contract for all four products.
 */

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PRODUCTS = ["bidthrone", "foundersbid", "culturebid", "bidception"];
const LEGACY_COPY = [/pay to rank/i, /\bBID\.LOL\b/, /highest bid wins/i, /buy the throne/i];

function headFor(productKey, pathname) {
  return renderSeoHeadTags(productKey, pathname);
}

test("all four products resolve to distinct versioned card URLs", () => {
  const urls = PRODUCTS.map((p) => ogImageFor(p));
  assert.equal(new Set(urls).size, 4, "each host must use its own card");
  for (const url of urls) {
    assert.ok(url.includes(`/og/${OG_ASSET_VERSION}/`), `versioned path in ${url}`);
    assert.ok(url.endsWith(".png"), `png card: ${url}`);
  }
  // CultureBid keeps the working www canonical origin for its card URL.
  assert.ok(ogImageFor("culturebid").startsWith("https://www.culturebid.lol/"));
  const entity = buildEntityMeta("bidthrone", "/profile/test", {
    title: "T",
    description: "D",
  });
  assert.equal(entity.ogImage, ogImageFor("bidthrone"));
  assert.equal(entity.ogImageAlt, ogImageAltFor("bidthrone"));
});

test("no current metadata references the legacy /og.jpg", () => {
  for (const p of PRODUCTS) {
    for (const path of ["/", "/leaderboards", "/bid-index", "/market-rates", "/profile/x"]) {
      const head = headFor(p, path);
      assert.ok(!head.includes("/og.jpg"), `${p}${path}: metadata must not reference /og.jpg`);
    }
  }
});

test("head metadata carries the full OG + Twitter contract", () => {
  const head = headFor("bidthrone", "/");
  const url = ogImageFor("bidthrone");
  const alt = ogImageAltFor("bidthrone");
  const required = [
    `<meta property="og:image" content="${url}"`,
    `<meta property="og:image:secure_url" content="${url}"`,
    `<meta property="og:image:type" content="image/png"`,
    `<meta property="og:image:width" content="1200"`,
    `<meta property="og:image:height" content="630"`,
    `<meta property="og:image:alt" content="${alt}"`,
    `<meta name="twitter:card" content="summary_large_image"`,
    `<meta name="twitter:image" content="${url}"`,
    `<meta name="twitter:image:alt" content="${alt}"`,
  ];
  for (const needle of required) {
    assert.ok(head.includes(needle), `metadata includes ${needle}`);
  }
  assert.ok(head.includes('<meta name="twitter:title" content="'), "twitter:title present");
  assert.ok(head.includes('<meta name="twitter:description" content="'), "twitter:description present");
  assert.ok(head.includes('<meta property="og:url" content="https://bidthrone.lol/">'), "og:url canonical");
});

const CARD_FILES = {
  bidthrone: "public/og/trust-v1/bidthrone.png",
  foundersbid: "public/og/trust-v1/foundersbid.png",
  culturebid: "public/og/trust-v1/culturebid.png",
  bidception: "public/og/trust-v1/bidception.png",
};

test("every referenced card exists, is PNG, exactly 1200x630, and under 1 MB", async () => {
  for (const [p, rel] of Object.entries(CARD_FILES)) {
    assert.equal(ogImageFor(p), `${expectedOrigin(p)}/og/${OG_ASSET_VERSION}/${p}.png`);
    const abs = join(ROOT, rel);
    await access(abs);
    const buf = await readFile(abs);
    const meta = await sharp(buf).metadata();
    assert.equal(meta.format, "png", `${rel} is a PNG`);
    assert.equal(meta.width, 1200, `${rel} width 1200`);
    assert.equal(meta.height, 630, `${rel} height 630`);
    const size = (await stat(abs)).size;
    assert.ok(size < 1024 * 1024, `${rel} under 1 MB (got ${size} bytes)`);
    assert.ok(size > 10000, `${rel} is a real rendered card, not a stub`);
  }
});

function expectedOrigin(p) {
  return p === "culturebid" ? "https://www.culturebid.lol" : `https://${p}.lol`;
}

test("legacy og.jpg is a CURRENT neutral network card, not the old artwork", async () => {
  const abs = join(ROOT, "public/og.jpg");
  await access(abs);
  const meta = await sharp(abs).metadata();
  assert.equal(meta.format, "png");
  assert.equal(meta.width, 1200);
  assert.equal(meta.height, 630);
});

test("no public source contains legacy pay-to-rank copy", async () => {
  const sources = [
    join(ROOT, "scripts/host-seo-shared.mjs"),
    join(ROOT, "scripts/generate-og-assets.mjs"),
    join(ROOT, "src/components/home/bidthrone-home.tsx"),
    join(ROOT, "src/routes/bid-index.tsx"),
    join(ROOT, "src/routes/leaderboards.tsx"),
    join(ROOT, "src/lib/marketplace/reputation.ts"),
  ];
  for (const f of sources) {
    let text = "";
    try {
      text = await readFile(f, "utf8");
    } catch {
      continue; // a listed source may not exist by the end of the release
    }
    for (const re of LEGACY_COPY) {
      assert.ok(!re.test(text), `${f} contains legacy copy: ${re}`);
    }
  }
});