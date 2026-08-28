#!/usr/bin/env node
// @ts-check
/**
 * IndexNow submission (RC2, C10). Notifies search providers (Bing, Yandex,
 * Naver, Seznam) that PUBLIC canonical URLs are new/changed/deleted.
 *
 * IndexNow is a discovery notification, not a ranking guarantee, and not a
 * dependency of the build: this script is run by an operator after a release.
 *
 * Usage:
 *   node scripts/indexnow-submit.mjs --file urls.txt --apply
 *
 *   urls.txt: one absolute canonical URL per line (https://<host>/<path>).
 *   Without --apply the script prints the exact payloads it would send
 *   (dry run). Batches are capped at 10,000 URLs per request.
 *
 * The key is committed in scripts/host-seo-shared.mjs (INDEXNOW_KEY): it is a
 * PUBLIC verification token that providers fetch from the host, not a secret.
 * The build never calls api.indexnow.org.
 */
import { readFileSync } from "node:fs";
import { INDEXNOW_KEY } from "./host-seo-shared.mjs";

const API = "https://api.indexnow.org/indexnow";

function parseArgs(argv) {
  const args = { file: null, apply: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--file") args.file = argv[++i];
    else if (a === "--apply") args.apply = true;
    else if (a === "--help") {
      console.log("Usage: node scripts/indexnow-submit.mjs --file urls.txt [--apply]");
      process.exit(0);
    } else {
      console.error(`Unknown argument: ${a}`);
      process.exit(2);
    }
  }
  if (!args.file) {
    console.error("Missing --file <urls.txt>");
    process.exit(2);
  }
  return args;
}

function groupByHost(urls) {
  const byHost = new Map();
  for (const u of urls) {
    let host;
    try {
      host = new URL(u).host;
    } catch {
      console.error(`SKIP (not a valid URL): ${u}`);
      continue;
    }
    if (!byHost.has(host)) byHost.set(host, []);
    byHost.get(host).push(u);
  }
  return byHost;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const lines = readFileSync(args.file, "utf8")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"));

  if (lines.length === 0) {
    console.log("No URLs to submit.");
    return;
  }

  const byHost = groupByHost(lines);
  const hosts = [...byHost.keys()].sort();

  for (const host of hosts) {
    const urlList = byHost.get(host);
    const payload = {
      host,
      key: INDEXNOW_KEY,
      urlList: urlList.slice(0, 10000),
    };
    if (!args.apply) {
      console.log(`[dry-run] ${host}: would submit ${payload.urlList.length} URLs`);
      console.log(JSON.stringify(payload, null, 2).slice(0, 2000));
      continue;
    }
    const res = await fetch(API, {
      method: "POST",
      headers: { "content-type": "application/json; charset=utf-8" },
      body: JSON.stringify(payload),
    });
    // 200 = accepted, 202 = accepted with async processing. Anything else is
    // reported verbatim; the operator retries after checking the key file.
    const body = await res.text().catch(() => "");
    console.log(`${res.status} ${host} (${payload.urlList.length} URLs)${body ? `: ${body}` : ""}`);
    if (res.status !== 200 && res.status !== 202) process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error("IndexNow submission failed:", err.message ?? err);
  process.exit(1);
});
