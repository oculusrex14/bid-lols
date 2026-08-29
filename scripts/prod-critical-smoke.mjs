#!/usr/bin/env node
// @ts-check
/**
 * Production critical-route smoke (RC3 P0 #5). Required after EVERY
 * production deploy (docs/ops/DEPLOYMENT.md release procedure, step 10):
 * every critical route must answer HTTP 200. Homepage-only verification is
 * explicitly insufficient — the RC3 /bounties schema incident passed a
 * homepage check while the main browse surfaces were 500ing.
 *
 * No secrets involved; this hits only public URLs. The production
 * DATABASE_URL never enters CI or this script — the gate runs on the
 * authenticated operator/runtime side of the release procedure.
 *
 * Usage:
 *   node scripts/prod-critical-smoke.mjs          # the live production domains
 *   node scripts/prod-critical-smoke.mjs --local  # against a local dev/built server
 *   node scripts/prod-critical-smoke.mjs --local --port 8081
 *
 * --local mode talks to 127.0.0.1 with per-route Host headers, so it
 * exercises the real host routing (product skin, canonical origins) without
 * wildcard DNS. Exits non-zero when any route is not 200.
 */
import http from "node:http";

const ROUTES = [
  // Marketplace surfaces (the RC3 incident class: browse/detail, not just home)
  "https://foundersbid.lol/",
  "https://foundersbid.lol/bounties",
  "https://foundersbid.lol/projects",
  "https://foundersbid.lol/graveyard",
  "https://www.culturebid.lol/",
  "https://www.culturebid.lol/bounties",
  "https://bidception.lol/",
  "https://bidception.lol/bidception",
  "https://bidthrone.lol/",
  "https://bidthrone.lol/leaderboards",
  "https://bidthrone.lol/bid-index",
  "https://bidthrone.lol/market-rates",
  // Account surfaces
  "https://foundersbid.lol/signin",
  "https://foundersbid.lol/signup",
  // Search + disclosure surfaces
  "https://foundersbid.lol/robots.txt",
  "https://foundersbid.lol/sitemap.xml",
  "https://foundersbid.lol/.well-known/security.txt",
];

const LOCAL_PORT = Number(process.env.SMOKE_PORT ?? argValue("--port") ?? "8080");
const LOCAL = process.argv.includes("--local");

function argValue(flag) {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function checkProd(url) {
  const res = await fetch(url, { redirect: "manual", signal: AbortSignal.timeout(30_000) });
  return res.status;
}

function checkLocal(host, path) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        host: "127.0.0.1",
        port: LOCAL_PORT,
        path,
        method: "GET",
        headers: { host, accept: "text/html" },
      },
      (res) => {
        res.resume(); // drain
        res.once("end", () => resolve(res.statusCode));
      },
    );
    req.on("error", reject);
    req.setTimeout(30_000, () => {
      req.destroy(new Error("timeout"));
    });
    req.end();
  });
}

const startedAt = Date.now();
let failures = 0;
for (const url of ROUTES) {
  const u = new URL(url);
  let status;
  try {
    status = LOCAL ? await checkLocal(u.host, u.pathname + u.search) : await checkProd(url);
  } catch (err) {
    status = `ERROR ${String(err.message ?? err).slice(0, 60)}`;
  }
  const ok = status === 200;
  if (!ok) failures += 1;
  console.log(`${ok ? "PASS" : "FAIL"} ${u.host}${u.pathname} -> ${status}`);
}
console.log(
  failures === 0
    ? `CRITICAL ROUTES SMOKE PASSED (${ROUTES.length}/${ROUTES.length} at 200, ${Date.now() - startedAt}ms, ${LOCAL ? `local :${LOCAL_PORT}` : "production"})`
    : `CRITICAL ROUTES SMOKE FAILED (${failures}/${ROUTES.length} not 200, ${LOCAL ? `local :${LOCAL_PORT}` : "production"})`,
);
process.exitCode = failures === 0 ? 0 : 1;
