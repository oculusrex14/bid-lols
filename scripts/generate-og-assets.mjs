#!/usr/bin/env node
/**
 * RC4 P0: deterministic social-card generator.
 *
 * The legacy /og.jpg still carried pre-pivot "pay-to-rank" artwork (the
 * superseded brand wordmark, retired with Phase 00).
 * and is crawl-cached by X; current metadata must point at VERSIONED URLs.
 * This script renders each product's 1200x630 card (aspect 1.91:1) from an
 * SVG template in the RC3 Network Spine visual language — no fake people,
 * no fake numbers, no legacy copy — and commits the PNGs to public/og/.
 *
 * Rerun with: node scripts/generate-og-assets.mjs
 * Every output is fully determined by this script; never hand-edit the
 * PNGs. To re-issue a card set for cache purposes, bump OG_ASSET_VERSION
 * (scripts/host-seo-shared.mjs) so every referencing URL changes at once.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = join(ROOT, "public", "og", "trust-v1");
const W = 1200;
const H = 630;

/**
 * Card definitions: product accent + surface tokens mirror the RC3 light
 * skins in src/styles.css (contrast-verified pairs), so the cards read as
 * the same products the site shows. Text comes straight from the spec.
 */
const CARDS = {
  bidthrone: {
    // indigo on porcelain
    bg: "#f1f2f4",
    kicker: "BID NETWORK",
    brand: "BIDTHRONE",
    headline: "Reputation built from completed work.",
    support: "A 300–900 Bid Index from verified marketplace outcomes.",
    footer: "FoundersBid · CultureBid · Bidception",
    fg: "#191c22",
    muted: "#565b64",
    accent: "#4f46e5",
    rule: "#c9ccd4",
  },
  foundersbid: {
    // warm paper + copper
    bg: "#f5f1ea",
    kicker: "BID NETWORK",
    brand: "FOUNDERSBID",
    headline: "Get startup work done.",
    support: "Bounties · Projects · Verified outcomes",
    footer: "",
    fg: "#211d18",
    muted: "#5e5648",
    accent: "#b45309",
    rule: "#ddd2c4",
  },
  culturebid: {
    // violet on cool stone
    bg: "#f0eff4",
    kicker: "BID NETWORK",
    brand: "CULTUREBID",
    headline: "Paid creative briefs. Fair rules.",
    support: "Capped entries · Published rewards · Clear licensing",
    footer: "",
    fg: "#1d1a22",
    muted: "#5a5563",
    accent: "#7c3aed",
    rule: "#d6d3de",
  },
  bidception: {
    // teal on graphite
    bg: "#1f2428",
    kicker: "BID NETWORK",
    brand: "BIDCEPTION",
    headline: "One project. One budget.",
    support: "A team forms around the work.",
    footer: "Nested bounties · projects · budget discipline",
    fg: "#eef1f2",
    muted: "#a9b2b6",
    accent: "#14b8a6",
    rule: "#3a4147",
  },
  // The neutral network card that REPLACES the legacy og.jpg artwork.
  network: {
    bg: "#1c1e25",
    kicker: "BID NETWORK",
    brand: "FOUR PRODUCTS. ONE MARKET.",
    headline: "Work gets done. Outcomes count.",
    support: "foundersbid.lol · culturebid.lol · bidception.lol · bidthrone.lol",
    footer: "",
    fg: "#eef1f3",
    muted: "#a4acba",
    accent: "#5b5fc7",
    rule: "#343842",
  },
};

/** Escape XML text nodes. */
function esc(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** One 1200x630 card as SVG text. Layout deliberate: kicker, brand, headline, support, footer, hairline rules, accent bar. */
function svgFor(c) {
  const lines = (text, max) => {
    // crude deterministic wrap on word boundaries for long headlines
    if (!text || text.length <= max) return [text].filter(Boolean);
    const words = text.split(" ");
    const rows = [];
    let cur = "";
    for (const w of words) {
      if ((cur + " " + w).trim().length > max && cur) {
        rows.push(cur);
        cur = w;
      } else {
        cur = (cur ? cur + " " : "") + w;
      }
    }
    if (cur) rows.push(cur);
    return rows;
  };
  const headline = lines(c.headline, 34);
  const headlineSize = Math.min(c.headline.length > 40 ? 66 : 72, 72);
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="${W}" height="${H}" fill="${c.bg}"/>
  <!-- accent spine -->
  <rect x="0" y="0" width="12" height="${H}" fill="${c.accent}"/>
  <!-- kicker -->
  <text x="96" y="128" font-family="Helvetica, Arial, sans-serif" font-size="26" letter-spacing="6" font-weight="600" fill="${c.accent}">${esc(c.kicker)}</text>
  <!-- brand -->
  <text x="96" y="204" font-family="Helvetica, Arial, sans-serif" font-size="72" letter-spacing="10" font-weight="700" fill="${c.fg}">${esc(c.brand)}</text>
  <!-- rule -->
  <rect x="96" y="252" width="${W - 192}" height="3" fill="${c.rule}"/>
  <!-- headline -->
  ${headline
    .map(
      (line, i) =>
        `<text x="96" y="${330 + i * (headlineSize + 10)}" font-family="Helvetica, Arial, sans-serif" font-size="${headlineSize}" font-weight="700" fill="${c.fg}">${esc(line)}</text>`,
    )
    .join("\n  ")}
  <!-- support -->
  <text x="96" y="${H - 118}" font-family="Helvetica, Arial, sans-serif" font-size="30" fill="${c.muted}">${esc(c.support)}</text>
  <!-- footer -->
  ${c.footer ? `<text x="96" y="${H - 64}" font-family="Helvetica, Arial, sans-serif" font-size="22" letter-spacing="2" fill="${c.muted}">${esc(c.footer)}</text>` : ""}
  <!-- wordmark dot -->
  <circle cx="${W - 84}" cy="${H - 74}" r="10" fill="${c.accent}"/>
</svg>`;
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const written = [];
  for (const [name, card] of Object.entries(CARDS)) {
    const svg = Buffer.from(svgFor(card), "utf8");
    const png = await sharp(svg, { density: 96 })
      .resize(W, H)
      .png({ compressionLevel: 9 })
      .toBuffer();
    const out = name === "network" ? join(ROOT, "public", "og.jpg") : join(OUT_DIR, `${name}.png`);
    await writeFile(out, png);
    const kb = Math.round(png.length / 1024);
    if (png.length > 1024 * 1024) throw new Error(`${out} exceeds 1 MB (${kb} KB)`);
    written.push({ out, kb });
  }
  for (const { out, kb } of written) console.log(`[og] wrote ${out} (${kb} KB)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});