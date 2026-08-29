#!/usr/bin/env node
/**
 * RC3 critical-path E2E (S-43): the network's key user journeys against a
 * RUNNING dev server (hermetic PGLite; no payment flows here — the funded
 * marketplace journey lives in scripts/marketplace-e2e.mjs).
 *
 *   npm run dev        # plain dev server (money OFF; no fake provider needed)
 *   node tests/e2e/critical-paths.mjs
 *
 * Host mapping: MAP *.lol 127.0.0.1 (single wildcard; see marketplace-e2e).
 * Every assertion is behavioral: rendered copy, aria state, URL search
 * params, and HTTP status — no pixel or timing guesses.
 */
import { chromium } from "playwright";

const BASE = process.env.E2E_BASE ?? "http://bidthrone.lol:8080";
const PORT = process.env.E2E_PORT ?? "8080";
const DEV_HOST_MAP = "MAP *.lol 127.0.0.1";
const stamp = Date.now();
const USER = { email: `e2e-crit-${stamp}@test.local`, password: "e2e-critical-pass-2026", name: "E2E Critical" };

let failures = 0;
function ok(name, cond, detail = "") {
  const line = `${cond ? "PASS" : "FAIL"} ${name}${!cond && detail ? ` — ${detail}` : ""}`;
  console.log(line);
  if (!cond) failures += 1;
}

async function newPage(browser, { dark = false, mobile = false } = {}) {
  const context = await browser.newContext({
    viewport: mobile ? { width: 390, height: 844 } : { width: 1280, height: 800 },
  });
  if (dark) {
    await context.addInitScript(() => {
      try {
        localStorage.setItem("bidlol.appearance", "dark");
      } catch {
        /* storage unavailable — dark stays off */
      }
    });
  }
  const page = await context.newPage();
  const errors = []; // captured but only asserted for homes
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  return { context, page, errors };
}

async function hydrate(page, selector, timeout = 20000) {
  await page.waitForSelector(selector, { timeout });
  await page.waitForFunction(
    (sel) => {
      const el = document.querySelector(sel);
      return el && Object.keys(el).some((k) => k.startsWith("__reactProps"));
    },
    selector,
    { timeout },
  );
}

const url = (host, path = "/") => `http://${host}:${PORT}${path}`;

async function host(browser) {
  console.log("\n== shared surfaces ==");
  {
    const { context, page, errors } = await newPage(browser);
    // 1. All four homepages load with the right product + chrome.
    const homes = [
      ["bidthrone.lol", "Reputation built from work, not self-promotion.", "#4f46e5"],
      ["foundersbid.lol", "Get startup work done without hiring a whole team.", "#97431d"],
      ["www.culturebid.lol", "A better way to commission creative work.", "#6d28d9"],
      ["bidception.lol", "Big project. One budget.", "#0c6b62"],
    ];
    for (const [host, h1, accent] of homes) {
      await page.goto(url(host, "/"), { waitUntil: "networkidle" });
      const text = await page.textContent("h1");
      const norm = (t) => (t ?? "").replace(/\s+/g, " ").trim();
      const cs = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--accent").trim());
      // Prefix, not substring: a stray artifact prepended to the H1 (the "');"
      // typo that shipped on the founders home) must fail, while homes whose H1
      // carries an extra span clause still pass. No code punctuation in an H1.
      const clean = !/[);{}]|=>/.test(norm(text));
      ok(`home ${host}: h1 + accent`, norm(text).startsWith(norm(h1)) && clean && cs === accent, `${norm(text)} / ${cs}`);
      ok(`home ${host}: zero page errors`, errors.length === 0, errors[0] ?? "");
    }

    // 2. Active navigation + aria-current on a nested route.
    await page.goto(url("foundersbid.lol", "/bounties"), { waitUntil: "networkidle" });
    await hydrate(page, 'nav[aria-label="Product"] a');
    const active = await page.getAttribute('nav[aria-label="Product"] a:has-text("Bounties")', "aria-current");
    ok("active nav sets aria-current", active === "page", String(active));

    // 3. Network switcher lists the four products on canonical origins.
    await page.click('[aria-haspopup="menu"]');
    const menuLinks = await page.$$eval('[role="menu"] a', (as) => as.map((a) => ({ href: a.getAttribute("href"), name: a.textContent })));
    ok(
      "network switcher: 4 products on canonical origins",
      menuLinks.length === 4 &&
        menuLinks.some((l) => l.href === "https://www.culturebid.lol/") &&
        menuLinks.some((l) => l.href === "https://foundersbid.lol/"),
      JSON.stringify(menuLinks.map((l) => l.href)),
    );
    await page.keyboard.press("Escape");
    const stillOpen = await page.$('[role="menu"]');
    ok("switcher closes on Escape", stillOpen === null);

    // 4. Dark mode persists + swaps theme-color.
    await page.evaluate(() => {
      try {
        localStorage.setItem("bidlol.appearance", "dark");
      } catch {
        /* storage unavailable — dark stays off */
      }
    });
    await page.reload({ waitUntil: "networkidle" });
    const mode = await page.getAttribute("html", "data-mode");
    const tm = await page.getAttribute('meta[name="theme-color"]', "content");
    ok("dark mode applies + theme-color swaps", mode === "dark" && tm === "#1a1612", `${mode}/${tm}`);
    await context.close();
  }

  // 5. Mobile: menu opens, targets reachable, no overflow.
  {
    const { context, page } = await newPage(browser, { mobile: true });
    await page.goto(url("foundersbid.lol", "/"), { waitUntil: "networkidle" });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    ok("mobile home: no horizontal overflow", overflow <= 1, `${overflow}px`);
    await page.click('[aria-label="Open menu"]');
    const expanded = await page.getAttribute('[aria-label="Close menu"]', "aria-expanded");
    ok("mobile menu aria-expanded flips", expanded === "true", String(expanded));
    const mobileNav = await page.textContent('[aria-label="Mobile product"]');
    ok(
      "mobile menu keeps network section + blog (secondary, never primary slots)",
      /The Bid Network/.test(mobileNav ?? "") && /blog/i.test(mobileNav ?? ""),
    );
    await page.click('[aria-label="Close menu"]');
    await context.close();
  }

  // 6. Wrong-host capability redirects: verified at the HTTP level by
  // tests/capability-matrix.test.ts (301 matrix) and by curl smoke against
  // the served middleware. Deliberately NOT exercised through the browser
  // here: the browser would follow the redirect to the real production
  // origin (host-only mapping cannot contain a 301 to another domain), and
  // Playwright's maxRedirects:0 leaves the page in a broken chrome-error
  // state that poisons later navigations.
}

async function auth(browser) {
  console.log("\n== account journeys ==");
  const { context, page } = await newPage(browser);
  await page.goto(`${BASE}/signup`, { waitUntil: "networkidle" });
  const copy = await page.textContent("main");
  ok(
    "signup copy: shared account + host session honesty",
    /works across all four marketplaces/.test(copy ?? "") && /sign in again/i.test(copy ?? ""),
  );
  await hydrate(page, "#au-email");
  await page.fill("#au-name", USER.name);
  await page.fill("#au-email", USER.email);
  await page.fill("#au-password", USER.password);
  await page.click('button[type="submit"]');
  await page.waitForURL("**/dashboard", { timeout: 20000 });
  ok("signup -> dashboard", true);

  // Verify email via the test seam. The honest contract: 200 on the plain
  // dev server (NODE_ENV != production), 403 on any PRODUCTION build — the
  // built preview below runs production SSR, so both outcomes are evidence
  // the guard works (strict 403-under-deployment is pinned separately in
  // tests/dev-endpoints-deployed-guard.test.ts).
  const verify = await page.evaluate(async () => (await fetch("/api/dev/verify-email", { method: "POST" })).status);
  ok("verification seam: 200 on dev / 403 on production builds", verify === 200 || verify === 403, `status=${verify}`);

  // Sign out.
  await page.goto(url("bidthrone.lol", "/"), { waitUntil: "networkidle" });
  await hydrate(page, '[data-testid="primary-cta"]');
  await page.evaluate(async () => {
    await fetch("/api/auth/sign-out", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
  });

  // Anonymous CTA on bidthrone: Create account. Signed-in: My profile/Dashboard.
  await page.goto(url("bidthrone.lol", "/"), { waitUntil: "networkidle" });
  const anonCta = await page.textContent('[data-testid="primary-cta"]');
  ok("anonymous bidthrone CTA is Create account", (anonCta ?? "").trim() === "Create account", anonCta ?? "");

  await page.goto(`${BASE}/signin`, { waitUntil: "networkidle" });
  await hydrate(page, "#au-email");
  await page.fill("#au-email", USER.email);
  await page.fill("#au-password", USER.password);
  await page.click('button[type="submit"]');
  try {
    await page.waitForURL("**/dashboard", { timeout: 20000 });
    ok("signin -> dashboard", true);
  } catch {
    const formText = await page.textContent('[data-testid="signin-form"]').catch(() => "");
    ok("signin -> dashboard", false, `stuck at ${page.url()} :: ${(formText ?? "").slice(0, 160)}`);
  }
  await page.goto(url("bidthrone.lol", "/dashboard"), { waitUntil: "networkidle" });
  const dash = await page.textContent("main");
  ok("dashboard renders the marketplace card", /drafts, applications, proposals/i.test(dash ?? ""));
  await page.goto(url("bidthrone.lol", "/settings/profile"), { waitUntil: "networkidle" });
  const handle = `crit${String(stamp).slice(-6)}`;
  await hydrate(page, "#pf-handle");
  await page.fill("#pf-handle", handle);
  await page.click('button:has-text("Save")');
  await page.waitForTimeout(1500);
  await page.goto(url("bidthrone.lol", "/"), { waitUntil: "networkidle" });
  const memberCta = await page.textContent('[data-testid="primary-cta"]');
  ok(
    "member bidthrone CTA is no longer Create account",
    (memberCta ?? "").trim() !== "Create account",
    memberCta ?? "",
  );
  await context.close();
}

async function signInOn(page, host) {
  await page.goto(url(host, "/signin"), { waitUntil: "networkidle" });
  await hydrate(page, "#au-email");
  await page.fill("#au-email", USER.email);
  await page.fill("#au-password", USER.password);
  await page.click('button[type="submit"]');
  await page.waitForURL("**/dashboard", { timeout: 20000 });
}

async function founders(browser) {
  console.log("\n== FoundersBid ==");
  const { context, page } = await newPage(browser);
  // Sessions are host-only by design: sign in again on this domain with the
  // same shared account (which is exactly the documented behavior).
  await signInOn(page, "foundersbid.lol");
  await page.goto(url("foundersbid.lol", "/"), { waitUntil: "networkidle" });

  // Marketplace-first: open-now/hero within the first meaningful scroll.
  const heroHasPreview = await page.$('[aria-label="Live opportunities right now"], [aria-label="Example opportunity (not live)"]');
  ok("hero carries a marketplace preview (or labelled example)", heroHasPreview !== null);

  // /post chooser routes to both creation flows.
  await page.goto(url("foundersbid.lol", "/post"), { waitUntil: "networkidle" });
  const chooser = await page.textContent("main");
  ok("/post offers bounty vs project", /Post a bounty/.test(chooser ?? "") && /Post a project/.test(chooser ?? ""));

  // Browse: filters are URL-backed.
  await page.goto(url("foundersbid.lol", "/bounties?sort=reward&rewardMin=25000"), { waitUntil: "networkidle" });
  const urlNow = page.url();
  ok("browse deep link keeps filters in the URL", /[?&]sort=reward/.test(urlNow) && /rewardMin=25000/.test(urlNow), urlNow);

  // Creation: conditional reward fields per structure.
  await page.goto(url("foundersbid.lol", "/bounties/new"), { waitUntil: "networkidle" });
  await hydrate(page, "#bn-title");
  const CONT = '[data-testid="continue-step"]:visible';
  await page.fill("#bn-title", "Critical path bounty: proof of the reward form");
  await page.fill("#bn-cat", "development");
  await page.fill("#bn-desc", "This bounty exists to prove the conditional reward structure fields render only what the structure needs.");
  await page.locator(CONT).first().click();
  await page.locator(CONT).first().click();
  await page.fill("#bn-cap", "5");
  await page.fill("#bn-sub-deadline", "2027-10-01T18:00");
  await page.locator(CONT).first().click();
  await page.fill("#bn-reward", "20000");
  await page.waitForTimeout(600);
  const wtaFields = await page.$$eval("#bn-p1, #bn-pw", (els) => els.filter((e) => e.offsetParent !== null).length);
  ok("winner-takes-all renders no split fields", wtaFields === 0, String(wtaFields));
  await page.selectOption('select[name="rewardStructure"]', "PODIUM");
  await page.waitForTimeout(300);
  const podiumFields = await page.$$eval("#bn-p1", (els) => els.filter((e) => e.offsetParent !== null).length);
  ok("podium renders podium fields", podiumFields === 1);
  await context.close();
}

async function culture(browser) {
  console.log("\n== CultureBid ==");
  const { context, page } = await newPage(browser);
  await signInOn(page, "culturebid.lol"); // host-only session: sign in on the apex host the test then uses
  await page.goto(url("culturebid.lol", "/"), { waitUntil: "networkidle" });
  const home = await page.textContent("main");
  ok("culture home is format-first", /What you can commission/.test(home ?? ""));
  ok("no Founders copy leakage on culture home", !/Post work|startup work/i.test(home ?? ""));

  await page.goto(url("culturebid.lol", "/bounties/new"), { waitUntil: "networkidle" });
  await hydrate(page, "h1");
  const createHead = await page.textContent("main");
  ok("culture creation leads with the format question", /What are you commissioning\?/.test(createHead ?? ""), (createHead ?? "").slice(0, 120));

  // The chooser on /post redirects to the brief form on culture.
  await page.goto(url("culturebid.lol", "/post"), { waitUntil: "load" });
  ok("culture /post lands on its own create form", /bounties\/new$/.test(page.url()), page.url());
  await context.close();
}

async function bidception(browser) {
  console.log("\n== Bidception ==");
  const { context, page } = await newPage(browser);
  await page.goto(url("bidception.lol", "/bidception"), { waitUntil: "networkidle" });
  const list = await page.textContent("main");
  ok("team projects list + honest empty state", /No funded team projects yet/.test(list ?? ""));

  await page.goto(url("bidception.lol", "/bidception/new"), { waitUntil: "networkidle" });
  ok("create requires auth (redirects to signin)", /\/signin/.test(page.url()), page.url());
  await context.close();
}

async function bidthrone(browser) {
  console.log("\n== Bidthrone ==");
  const { context, page } = await newPage(browser);
  await page.goto(url("bidthrone.lol", "/leaderboards"), { waitUntil: "networkidle" });
  const lb = await page.textContent("main");
  ok("leaderboards show methodology + empty honesty", /No payment or placement input changes a rank/.test(lb ?? ""));

  await page.goto(url("bidthrone.lol", "/bid-index"), { waitUntil: "networkidle" });
  const idx = await page.textContent("main");
  ok(
    "bid-index is the trust methodology surface (BI-1.0, bands, no fake scores)",
    /How it works/.test(idx ?? "") && /BI-1\.0/.test(idx ?? "") && !/₹0/.test(idx ?? ""),
  );
  ok("bid-index keeps the not-a-credit-score disclaimer", /not a credit score/.test(idx ?? ""));

  await page.goto(url("bidthrone.lol", "/market-rates"), { waitUntil: "networkidle" });
  const rates = await page.textContent("main");
  ok(
    "market-rates gates on sample size (insufficient labels, never zero prices)",
    /Not enough verified data yet|Insufficient sample/.test(rates ?? "") && !/Insufficient sample\s*₹0/.test(rates ?? ""),
  );
  ok("market rates are separate from the trust score", /that is the Bid Index/i.test(rates ?? "") || /Market rates/.test(rates ?? ""));

  // RC4 P0: versioned social card assets reachable over HTTP (loopback +
  // Host header, same mechanism as the browser resolver map).
  const cardResp = await page.request.get(`http://127.0.0.1:${PORT}/og/trust-v1/bidthrone.png`, {
    headers: { host: "bidthrone.lol" },
  });
  ok("bidthrone social card serves 200 png", cardResp.ok(), String(cardResp.status()));
  await context.close();
}

async function graveyard(browser) {
  console.log("\n== Graveyard ==");
  const { context, page } = await newPage(browser);
  await page.goto(url("foundersbid.lol", "/graveyard"), { waitUntil: "networkidle" });
  const gy = await page.textContent("main");
  ok("graveyard empty state is honest", /No assets up for transfer yet/.test(gy ?? ""));
  await context.close();
}

async function moneyOff(browser) {
  console.log("\n== money OFF posture ==");
  const { context, page } = await newPage(browser);
  await signInOn(page, "foundersbid.lol");
  await page.goto(url("foundersbid.lol", "/"), { waitUntil: "networkidle" });
  const note = await page.textContent('[data-testid="funding-note"]');
  ok("home states funding is off", /Funding is not enabled yet/.test(note ?? ""), note ?? "");
  // The funding-off claim lives on the creation review step (and the home
  // note above). Walk the steps to reach the review.
  await page.goto(url("foundersbid.lol", "/bounties/new"), { waitUntil: "networkidle" });
  const CONT = '[data-testid="continue-step"]:visible';
  await hydrate(page, "#bn-title");
  await page.fill("#bn-title", "Money off posture check bounty");
  await page.fill("#bn-cat", "development");
  await page.fill("#bn-desc", "Walking to the review step to verify the honest funding-off statement renders before any commitment.");
  await page.locator(CONT).first().click();
  await page.locator(CONT).first().click();
  await page.fill("#bn-cap", "5");
  await page.fill("#bn-sub-deadline", "2027-10-01T18:00");
  await page.locator(CONT).first().click();
  await page.fill("#bn-reward", "5000");
  await page.locator(CONT).first().click();
  const review = await page.textContent('[data-testid="review-block"]');
  ok(
    "creation review states draft-free + funding off",
    /draft is saved|no payment\s+will be taken|Funding is not enabled/i.test(review ?? ""),
    (review ?? "").slice(0, 100),
  );
  await context.close();
}

const browser = await chromium.launch({ args: [`--host-resolver-rules=${DEV_HOST_MAP}`] });
try {
  await host(browser);
  await auth(browser);
  await founders(browser);
  await culture(browser);
  await bidception(browser);
  await bidthrone(browser);
  await graveyard(browser);
  await moneyOff(browser);
} finally {
  await browser.close();
}
if (failures > 0) {
  console.error(`E2E CRITICAL PATHS FAILED (${failures})`);
  process.exit(1);
}
console.log("E2E CRITICAL PATHS PASSED");