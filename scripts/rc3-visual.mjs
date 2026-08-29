#!/usr/bin/env node
/**
 * RC3 visual QA (S-45): real screenshots at 390/768/1440 for the key pages of
 * the four products, against a RUNNING dev server (PGLite, hermetic), plus
 * console/page-error capture. This is release QA, not a CI gate (font and
 * rendering differences across machines make pixel diffs flaky).
 *
 * Usage:
 *   node scripts/rc3-visual.mjs [--out screenshots/rc3] [--dark]
 *
 * Host mapping: MAP *.lol 127.0.0.1 (single wildcard; multiple explicit
 * entries hang the resolver — see marketplace-e2e.mjs).
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { chromium } from "playwright";

const OUT = process.argv.includes("--out") ? process.argv[process.argv.indexOf("--out") + 1] : "screenshots/rc3";
const DARK = process.argv.includes("--dark");
const PORT = process.env.E2E_PORT ?? "8080";

const PAGES = [
  { host: "bidthrone.lol", path: "/", slug: "home" },
  { host: "bidthrone.lol", path: "/leaderboards", slug: "leaderboards" },
  { host: "bidthrone.lol", path: "/bid-index", slug: "bid-index" },
  { host: "foundersbid.lol", path: "/", slug: "home" },
  { host: "foundersbid.lol", path: "/bounties", slug: "browse" },
  { host: "foundersbid.lol", path: "/post", slug: "post" },
  { host: "foundersbid.lol", path: "/bounties/new", slug: "create" },
  { host: "foundersbid.lol", path: "/projects", slug: "projects" },
  { host: "foundersbid.lol", path: "/graveyard", slug: "graveyard" },
  { host: "culturebid.lol", path: "/", slug: "home" },
  { host: "culturebid.lol", path: "/bounties", slug: "browse" },
  { host: "culturebid.lol", path: "/bounties/new", slug: "create" },
  { host: "bidception.lol", path: "/", slug: "home" },
  { host: "bidception.lol", path: "/bidception", slug: "team-projects" },
  { host: "bidception.lol", path: "/bidception/new", slug: "create" },
  { host: "bidthrone.lol", path: "/signup", slug: "signup" },
];
const VIEWPORTS = [
  { name: "mobile", width: 390, height: 844 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1440, height: 900 },
];

mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({
  args: ["--host-resolver-rules=MAP *.lol 127.0.0.1", "--font-render-hinting=none"],
});

const report = [];
try {
  for (const page of PAGES) {
    for (const vp of VIEWPORTS) {
      const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
      if (DARK) {
        await context.addInitScript(() => {
          try {
            localStorage.setItem("bidlol.appearance", "dark");
          } catch {}
        });
      }
      const p = await context.newPage();
      const errors = [];
      p.on("console", (msg) => {
        if (msg.type() === "error") errors.push(msg.text().slice(0, 300));
      });
      p.on("pageerror", (err) => errors.push(`pageerror: ${String(err).slice(0, 300)}`));
      const url = `http://${page.host}:${PORT}${page.path}`;
      let status = null;
      let overflow = null;
      let design = null;
      try {
        const res = await p.goto(url, { waitUntil: "networkidle", timeout: 30000 });
        status = res ? res.status() : null;
        await p.waitForTimeout(400);
        overflow = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        // Programmatic design checks (this session's model has no image input;
        // these replace pixel inspection with measurable spine assertions):
        design = await p.evaluate(() => {
          const cs = getComputedStyle(document.documentElement);
          const border2 = document.querySelectorAll(".border-2").length;
          const h1 = document.querySelector("h1")?.textContent?.trim() ?? null;
          const cta = document.querySelector('[data-testid="primary-cta"]')?.textContent?.trim() ?? null;
          const themeColor = document.querySelector('meta[name="theme-color"]')?.getAttribute("content") ?? null;
          const switcher = document.querySelector('[aria-haspopup="menu"]') !== null;
          const skip = document.querySelector('a[href="#content"]') !== null;
          return { accent: cs.getPropertyValue("--accent").trim(), border2, h1, cta, themeColor, switcher, skip };
        });
        const shot = `${OUT}/${page.host.replace(".lol", "")}-${page.slug}-${vp.name}${DARK ? "-dark" : ""}.png`;
        await p.screenshot({ path: shot, fullPage: true });
        report.push({ url, status, overflowPx: overflow, shot, errors, design });
        console.log(`${status} ${url} [${vp.name}] overflow=${overflow}px errors=${errors.length} accent=${design.accent} border2=${design.border2} cta=${design.cta} -> ${shot}`);
      } catch (err) {
        report.push({ url, status, overflowPx: overflow, shot: null, errors: [...errors, String(err).slice(0, 300)] });
        console.log(`FAIL ${url} [${vp.name}] ${String(err).slice(0, 200)}`);
      }
      await context.close();
    }
  }
} finally {
  await browser.close();
}

const problems = report.filter((r) => (r.status !== 200 && r.status !== 301 && r.status !== 302) || (r.overflowPx ?? 0) > 2 || r.errors.length > 0);
writeFileSync(`${OUT}/report.json`, JSON.stringify({ generatedAt: new Date().toISOString(), dark: DARK, report, problems }, null, 2));
console.log(`\n${report.length} captures, ${problems.length} with problems -> ${OUT}/report.json`);
process.exitCode = problems.length > 0 ? 1 : 0;
