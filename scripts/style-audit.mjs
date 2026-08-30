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
  bidthrone: ["/", "/leaderboards", "/bid-index", "/market-rates", "/bounties", "/graveyard", "/blog", "/blog/reputation-from-completed-work", "/signup", "/dashboard", "/settings/profile"],
  foundersbid: ["/", "/bounties", "/bounties/new", "/projects", "/graveyard", "/graveyard/new", "/post", "/signup", "/dashboard"],
  culturebid: ["/", "/bounties", "/bounties/new", "/graveyard", "/blog"],
  bidception: ["/", "/bidception", "/bidception/new", "/bounties", "/graveyard", "/leaderboards", "/bid-index"],
};

// RC5 §33: the critical product-object routes, captured at 390 / 768 / 1440.
const RESPONSIVE = {
  foundersbid: ["/", "/bounties", "/post", "/bounties/new"],
  culturebid: ["/", "/bounties", "/bounties/new"],
  bidception: ["/", "/bidception"],
  bidthrone: ["/", "/leaderboards", "/bid-index", "/market-rates", "/market-rates?currency=USD"],
};
const VIEWPORTS = [
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
  { width: 1440, height: 900 },
];

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
// RC5 responsive pass: light mode only (dark variants are covered by the
// full matrix above). Also records no-overflow + sample-label facts so the
// visual pass is measurable, not just a screenshot dump. Same outer
// try/finally: one browser, two passes.
for (const [product, base] of Object.entries(HOSTS)) {
    for (const vp of VIEWPORTS) {
      for (const route of RESPONSIVE[product]) {
        const context = await browser.newContext({
          viewport: { width: vp.width, height: vp.height },
          isMobile: vp.width < 500,
          hasTouch: vp.width < 500,
        });
        const p = await context.newPage();
        const errors = [];
        p.on("pageerror", (e) => errors.push(`pageerror: ${String(e).slice(0, 200)}`));
        const url = base + route;
        const slug = route.replace(/\/$/, "").replace(/\//g, "_") || "home";
        let status = null;
        let check = null;
        try {
          const res = await p.goto(url, { waitUntil: "networkidle", timeout: 30000 });
          status = res ? res.status() : null;
          await p.waitForTimeout(350);
          check = await p.evaluate(() => {
            const overflow = document.documentElement.scrollWidth > window.innerWidth + 1;
            const samples = [...document.querySelectorAll("[data-example='true']")].map((el) => {
              const t = (el.textContent || "").trim();
              return { labelled: /EXAMPLE|SAMPLE|Sample|Example/i.test(t) };
            });
            return {
              overflow,
              sampleCount: samples.length,
              allSamplesLabelled: samples.every((s) => s.labelled),
              h1: (document.querySelector("h1")?.textContent || "").slice(0, 60),
            };
          });
          const shot = `${OUT}/${product}${slug}-${vp.width}.png`;
          await p.screenshot({ path: shot, fullPage: false });
          fingerprints.push({ url: `${url}@${vp.width}`, status, shot, errors, fp: check, responsive: true });
          console.log(
            `${status} ${url} @${vp.width} overflow=${check.overflow} samples=${check.sampleCount}/${check.allSamplesLabelled ? "labelled" : "UNLABELLED"} -> ${shot}`,
          );
        } catch (err) {
          fingerprints.push({ url, status, shot: null, errors, fp: check, responsive: true });
          console.log(`FAIL ${url}@${vp.width} ${String(err).slice(0, 150)}`);
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
