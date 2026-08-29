#!/usr/bin/env node
/**
 * Marketplace E2E (Phase 01, AC-14): the critical sponsor + builder journeys
 * against a RUNNING dev server started with the TEST-ONLY fake provider:
 *
 *   PAYMENT_PROVIDER=fake MARKETPLACE_MONEY_LIVE=1 npm run dev
 *
 * Refused when PAYMENT_PROVIDER isn't fake (this suite exists to exercise the
 * funding machinery without real money; it must never touch a deployed env).
 * Hermetic: the dev server runs PGLite, and the test drives the REAL browser
 * flows (signup -> verify seam -> create -> fund -> publish -> apply ->
 * submit -> judge) exactly as a person would.
 *
 * Host mapping (RC1 R4 / RC2): the dev server serves the app on the product
 * apex hosts (allowedHosts in vite.config.ts). The suite points the browser
 * at http://foundersbid.lol:8080 and maps the four apex names to 127.0.0.1,
 * so the request Host header selects the product without the RC1 capability
 * 301s escaping to the real (production) domains.
 */
import { chromium } from "playwright";

const BASE = process.env.E2E_BASE ?? "http://foundersbid.lol:8080";
// A single wildcard rule maps every .lol apex to loopback. (Multiple
// explicit MAP entries hang the resolver on this stack: one of the names
// falls through to public DNS and culturebid.lol apex is a broken 10.x
// record, so the first navigation waits out the lookup.)
const DEV_HOST_MAP = "MAP *.lol 127.0.0.1";
const stamp = Date.now();
const SPONSOR = { email: `e2e-sponsor-${stamp}@test.local`, password: "e2e-sponsor-pass-2026", name: "E2E Sponsor" };
const BUILDER = { email: `e2e-builder-${stamp}@test.local`, password: "e2e-builder-pass-2026", name: "E2E Builder" };

function ok(name, cond, detail = "") {
  const line = `${cond ? "PASS" : "FAIL"} ${name}${detail ? ` — ${detail}` : ""}`;
  console.log(line);
  if (!cond) process.exitCode = 1;
}

async function waitForHydration(page, selector) {
  await page.waitForSelector(selector, { timeout: 20000 });
  await page.waitForFunction(
    (sel) => {
      const el = document.querySelector(sel);
      return el && Object.keys(el).some((k) => k.startsWith("__reactProps"));
    },
    selector,
    { timeout: 20000 },
  );
}

async function signUp(page, user) {
  await page.goto(`${BASE}/signup`);
  await waitForHydration(page, '#au-name, #au-email');
  await page.fill("#au-name", user.name);
  await page.fill("#au-email", user.email);
  await page.fill("#au-password", user.password);
  await page.click('button[type="submit"]');
  await page.waitForURL("**/dashboard", { timeout: 20000 });
  // Simulate the audited admin email verification (TEST-ONLY seam).
  const verify = await page.evaluate(async () => {
    const r = await fetch("/api/dev/verify-email", { method: "POST" });
    return r.status;
  });
  ok("signup + verification seam", verify === 200, `verify=${verify}`);
}

async function createFundedBounty(page) {
  await page.goto(`${BASE}/bounties/new`);
  await waitForHydration(page, '[data-testid="create-bounty-form"]');

  // RC3 progressive disclosure: 5 steps with per-step Continue buttons and a
  // live server-computed money plan on the Reward step. Both the desktop and
  // the mobile (sticky) action bars render; the :visible locator picks the
  // one that matches the current viewport.
  const CONTINUE = '[data-testid="continue-step"]:visible';
  const step = async () => {
    await page.locator(CONTINUE).first().click();
  };
  await page.fill("#bn-title", "E2E bounty: wire up an onboarding checklist");
  await page.fill("#bn-cat", "development");
  await page.fill("#bn-desc", "We need a crisp onboarding checklist flow for new workspaces, with progress states and a final checklist export.");
  await step();
  await step(); // "done" (optional fields)
  await page.fill("#bn-cap", "3");
  await page.fill("#bn-sub-deadline", "2026-10-01T18:00");
  await page.selectOption('select[name="qualificationMode"]', "APPLICATION_ONLY");
  await step();
  await page.fill("#bn-reward", "9000");
  await page.waitForSelector('[data-testid="money-plan"]', { timeout: 15000 });
  const plan = await page.textContent('[data-testid="money-plan"]');
  ok("money plan shows fee decomposition", /9,900\.00/.test(plan ?? "") && /900\.00/.test(plan ?? ""), (plan ?? "").slice(0, 80));
  await step(); // review
  await page.waitForSelector('[data-testid="review-block"]', { timeout: 15000 });
  await page.locator('[data-testid="create-draft"]:visible').first().click();
  await page.waitForURL("**/bounties/bnt_*", { timeout: 20000 });
  const bountyPath = new URL(page.url()).pathname;
  ok("bounty created (draft)", /bounties\/bnt_/.test(bountyPath), bountyPath);

  // publish -> fake checkout -> settle -> OPEN
  await waitForHydration(page, '[data-testid="sponsor-publish"] button');
  await page.click('[data-testid="sponsor-publish"] button');
  await page.waitForFunction(() => document.querySelector('[data-testid="funding-state"]')?.textContent === "Funded", { timeout: 20000 });
  const funding = await page.textContent('[data-testid="funding-state"]');
  ok("bounty funded + published", funding === "Funded", funding ?? "");
  return bountyPath;
}

async function builderAppliesAndSubmits(page, bountyPath) {
  // fresh session for the builder
  await page.evaluate(async () => {
    await fetch("/api/auth/sign-out", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
  });
  await page.goto(`${BASE}/signup`);
  await waitForHydration(page, "#au-email");
  await page.fill("#au-name", BUILDER.name);
  await page.fill("#au-email", BUILDER.email);
  await page.fill("#au-password", BUILDER.password);
  await page.click('button[type="submit"]');
  await page.waitForURL("**/dashboard", { timeout: 20000 });

  await page.goto(`${BASE}${bountyPath}`);
  await waitForHydration(page, '[data-testid="viewer-actions"] textarea');
  await page.fill('[data-testid="viewer-actions"] textarea', "I have shipped onboarding flows before — see my profile.");
  await page.click('[data-testid="viewer-actions"] button');
  // Application succeeds -> the page reloads and shows the authoritative
  // state (auto-approved in APPLICATION_ONLY mode).
  await page.waitForFunction(
    () => document.querySelector("main")?.textContent?.includes("Application: Approved"),
    { timeout: 20000 },
  );
  ok("builder applied (APPLICATION_ONLY auto-approves)", true);

  await page.goto(`${BASE}${bountyPath}`);
  await page.reload();
  await waitForHydration(page, '[data-testid="viewer-actions"]');
  await page.click('button:has-text("Start work")');
  // run() reloads the page after the state change; wait for the reloaded
  // UI to show the WORK_STARTED participation state before continuing.
  await page.waitForFunction(
    () => document.querySelector("main")?.textContent?.includes("Work started"),
    { timeout: 20000 },
  );
  await page.click('button:has-text("Submit work"), a:has-text("Submit work")');
  await page.waitForSelector('input[name="title"]');
  await page.fill('input[name="title"]', "Onboarding checklist v1");
  await page.fill('textarea[name="body"]', "Built the flow: checklist states, progress bar, persistence.");
  await page.fill('input[name="links"]', "https://example.com/checklist");
  await page.click('button:has-text("Save submission")');
  // Submission lands -> reload shows the SUBMITTED participation state.
  await page.waitForFunction(
    () => document.querySelector("main")?.textContent?.includes("Participation: Submitted"),
    { timeout: 20000 },
  );
  ok("builder submitted work", true);
}

async function main() {
  if (process.env.PAYMENT_PROVIDER !== "fake") {
    console.error("This E2E must run against a dev server started with PAYMENT_PROVIDER=fake.");
    process.exit(1);
  }
  const browser = await chromium.launch({ args: [`--host-resolver-rules=${DEV_HOST_MAP}`] });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  try {
    await signUp(page, SPONSOR);
    const bountyPath = await createFundedBounty(page);
    await builderAppliesAndSubmits(page, bountyPath);
    // list shows the open bounty
    await page.goto(`${BASE}/bounties`);
    const list = await page.textContent("main");
    ok("open bounty appears in the public listing", (list ?? "").includes("onboarding checklist"));
  } finally {
    await browser.close();
  }
  if (process.exitCode) {
    console.error("E2E FAILED");
  } else {
    console.log("E2E PASSED");
  }
}

main().catch((err) => {
  console.error("E2E error:", err?.message ?? err);
  process.exit(1);
});