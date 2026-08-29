#!/usr/bin/env node
/**
 * Style audit: screenshot a matrix of routes across the four products
 * (light + dark, desktop + mobile), and dump per-page style fingerprints
 * (computed tokens, card classes, heading fonts) so inconsistencies are
 * measurable, not guessed.
 *
 * Usage:
 *   node scripts/style-audit.mjs --env prod --out screenshots/style-audit
 *   node scripts/style-audit.mjs --env local --port 8081 --out screenshots/style-audit
 *
 * local: host mapping MAP *.lol 127.0.0.1 against the built preview.
 * prod:  real public URLs (culturebid apex is DNS-broken, so www is used).
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { chromium } from "playwright";

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : fallback;
};
const ENV = flag("--env", "local");
const PORT = flag("--port", "8081");
const OUT = flag("--out", "screenshots/style-audit");

const HOSTS =
  ENV === "prod"
    ? {
        bidthrone: "https://bidthrone.lol",
        foundersbid: "https://foundersbid.lol",
        culturebid: "https://www.culturebid.lol",
        bidception: "https://bidception.lol",
      }
    : {
        bidthrone: `http://bidthrone.lol:${PORT}`,
        foundersbid: `http://foundersbid.lol:${PORT}`,
        culturebid: `http://culturebid.lol:${PORT}`,
        bidception: `http://bidception.lol:${PORT}`,
      };

// The full route matrix per product. Slugs unique per host.
const ROUTES = {
  bidthrone: ["/", "/leaderboards", "/bid-index", "/bounties", "/graveyard", "/blog", "/blog/introducing-the-bid-network", "/signup", "/dashboard", "/settings/profile"],
  foundersbid: ["/", "/bounties", "/bounties/new", "/projects", "/graveyard", "/graveyard/new", "/post", "/signup", "/dashboard"],
  culturebid: ["/", "/bounties", "/bounties/new", "/graveyard", "/blog"],
  bidception: ["/", "/bidception", "/bidception/new", "/bounties", "/graveyard", "/leaderboards", "/bid-index"],
};

mkdirSync(OUT, { recursive: true });
const launchArgs = ENV === "local" ? ["--host-resolver-rules=MAP *.lol 127.0.0.1", "--font-render-hinting=none"] : ["--font-render-hinting=none"];
const browser = await chromium.launch({ args: launchArgs });

const fingerprints = [];
try {
  for (const [product, base] of Object.entries(HOSTS)) {
    for (const dark of [false, true]) {
      for (const route of ROUTES[product]) {
        const context = await browser.newContext({
          viewport: { width: 1440, height: 900 },
        });
        if (dark) {
          await context.addInitScript(() => {
            try {
              localStorage.setItem("bidlol.appearance", "dark");
            } catch {
              /* ignore */
            }
          });
        }
        const p = await context.newPage();
        const errors = [];
        p.on("console", (m) => {
          if (m.type() === "error") errors.push(m.text().slice(0, 200));
        });
        p.on("pageerror", (e) => errors.push(`pageerror: ${String(e).slice(0, 200)}`));
        const url = base + route;
        const slug = route.replace(/\/$/, "").replace(/\//g, "_") || "home";
        let status = null;
        let fp = null;
        try {
          const res = await p.goto(url, { waitUntil: "networkidle", timeout: 30000 });
          status = res ? res.status() : null;
          await p.waitForTimeout(350);
          fp = await p.evaluate(() => {
            const cs = getComputedStyle(document.documentElement);
            const tok = (n) => cs.getPropertyValue(n).trim();
            const root = document.querySelector("[data-theme]") ? "data-theme on subtree" : "no data-theme attr";
            const h1 = document.querySelector("h1");
            const h1cs = h1 ? getComputedStyle(h1) : null;
            // sample card-ish containers: elements with a background different from page bg
            const bg = tok("--bg");
            const surfaces = [];
            for (const el of document.querySelectorAll("main div, main section")) {
              const c = getComputedStyle(el);
              if (c.backgroundColor !== "rgba(0, 0, 0, 0)" && c.backgroundColor !== bg && el.getBoundingClientRect().width > 300) {
                surfaces.push({
                  bg: c.backgroundColor,
                  border: c.borderTopWidth + " " + c.borderTopColor,
                  radius: c.borderTopLeftRadius,
                  cls: (el.className || "").toString().slice(0, 120),
                });
              }
            }
            // dedupe by bg+border+radius
            const seen = new Set();
            const uniq = [];
            for (const s of surfaces) {
              const k = s.bg + "|" + s.border + "|" + s.radius;
              if (!seen.has(k)) {
                seen.add(k);
                uniq.push(s);
              }
            }
            return {
              theme: root,
              accent: tok("--accent"),
              accentSoft: tok("--accent-soft").slice(0, 30),
              bg: tok("--bg"),
              surface: tok("--surface"),
              raised: tok("--raised"),
              fg: tok("--fg"),
              border: tok("--border").slice(0, 30),
              mode: document.documentElement.getAttribute("data-mode"),
              h1Font: h1cs ? h1cs.fontFamily : null,
              bodyFont: getComputedStyle(document.body).fontFamily,
              surfaceStyles: uniq.slice(0, 8),
              buttonSamples: [...document.querySelectorAll("button, a[class*='primary'], [data-testid='primary-cta']")]
                .slice(0, 6)
                .map((b) => {
                  const c = getComputedStyle(b);
                  return { text: (b.textContent || "").trim().slice(0, 24), bg: c.backgroundColor, color: c.color, radius: c.borderTopLeftRadius, border: c.borderTopWidth + " " + c.borderTopColor };
                }),
            };
          });
          const shot = `${OUT}/${product}${dark ? "-dark" : ""}${slug}.png`;
          await p.screenshot({ path: shot, fullPage: false });
          fingerprints.push({ url, status, shot, errors, fp });
          console.log(`${status} ${url} -> ${shot}`);
        } catch (err) {
          fingerprints.push({ url, status, shot: null, errors, fp });
          console.log(`FAIL ${url} ${String(err).slice(0, 150)}`);
        }
        await context.close();
      }
    }
  }
} finally {
  await browser.close();
}
writeFileSync(`${OUT}/fingerprints.json`, JSON.stringify(fingerprints, null, 2));
console.log(`\n${fingerprints.length} captures -> ${OUT}/fingerprints.json`);
