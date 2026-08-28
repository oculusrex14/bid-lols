#!/usr/bin/env node
/**
 * Complexity audit (RC3, S-11): measure — do not guess.
 *
 * Uses the ESLint Linter API with the already-installed
 * @typescript-eslint/parser and the core rules:
 *   - complexity (cyclomatic; reported at limit 0 so EVERY value is captured)
 *   - max-depth  (nesting; reported at limit 0 so EVERY depth is captured)
 *   - function length (non-blank lines, straight from the TS AST)
 *
 * Emits a per-function table for .ts/.tsx files under src/, server/,
 * scripts/ and tests/. Nothing is modified.
 *
 * Usage:
 *   node scripts/complexity-report.mjs                      # full table
 *   node scripts/complexity-report.mjs --gate               # CI gate: exits 1
 *   COMPLEXITY_MAX=15 MAX_DEPTH_MAX=5 FN_LINES_MAX=120 node scripts/complexity-report.mjs --gate
 *   node scripts/complexity-report.mjs --json out.json      # machine output
 */
import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { Linter } from "eslint";
import tsParser from "@typescript-eslint/parser";
import ts from "typescript";

const ROOTS = ["src", "server", "scripts", "tests"];
const IGNORE = new Set(["src/routeTree.gen.ts", "src/content/blog/articles.ts"]);

function listFiles(dir, out) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) {
      if (name === "node_modules" || name === ".vercel" || name === "dist" || name === "screenshots") continue;
      listFiles(p, out);
    } else if (/\.(ts|tsx)$/.test(name)) out.push(p);
  }
  return out;
}

const files = [];
for (const r of ROOTS) {
  try {
    listFiles(r, files);
  } catch {
    /* root missing */
  }
}

const linter = new Linter();
const MEASURE_RULES = {
  complexity: ["error", 0],
  "max-depth": ["error", 0],
};

const gate = process.argv.includes("--gate");
const COMPLEXITY_MAX = Number(process.env.COMPLEXITY_MAX ?? 15);
const MAX_DEPTH_MAX = Number(process.env.MAX_DEPTH_MAX ?? 5);
const FN_LINES_MAX = Number(process.env.FN_LINES_MAX ?? 120);

const rows = [];
for (const file of files) {
  const rel = relative(process.cwd(), file);
  if (IGNORE.has(rel)) continue;
  const src = readFileSync(file, "utf8");
  const fileLines = src.split("\n").length;

  const messages = linter.verify(src, [
    {
      languageOptions: { parser: tsParser, ecmaVersion: 2022, sourceType: "module" },
      rules: MEASURE_RULES,
    },
  ]);
  for (const m of messages) {
    if (m.ruleId === "complexity") {
      rows.push({ file: rel, line: m.line, rule: "complexity", value: Number(m.message.match(/complexity of (\d+)/)?.[1] ?? 0) });
    } else if (m.ruleId === "max-depth") {
      rows.push({ file: rel, line: m.line, rule: "max-depth", value: Number(m.message.match(/nested too deeply \((\d+)\)/)?.[1] ?? 0) });
    }
  }

  // Function lengths: non-blank line span per function node (AST, no Linter needed).
  const sf = ts.createSourceFile(rel, src, ts.ScriptTarget.ESNext, true);
  const visit = (node) => {
    const isFn =
      ts.isFunctionDeclaration(node) ||
      ts.isFunctionExpression(node) ||
      ts.isArrowFunction(node) ||
      ts.isMethodDeclaration(node);
    if (isFn) {
      const start = node.getStart();
      const slice = src.slice(start, node.getEnd());
      const used = slice.split("\n").filter((l) => l.trim().length > 0).length;
      rows.push({ file: rel, line: src.slice(0, start).split("\n").length, rule: "fn-lines", value: used });
    }
    ts.forEachChild(node, visit);
  };
  ts.forEachChild(sf, visit);

  rows.push({ file: rel, line: 0, rule: "file-lines", value: fileLines });
}

const data = rows.filter((r) => r.rule !== "file-lines");
const sizes = rows.filter((r) => r.rule === "file-lines");
// The GATE enforces production code only (src/ + server/): test suites and
// scripts are assertion/data-heavy by nature and would make the threshold
// theater. They are still MEASURED and reported (non-gate mode) so nobody
// optimizes against the gate's blind spots.
const isProd = (file) => file.startsWith("src/") || file.startsWith("server/");
const byComplexity = data
  .filter((r) => r.rule === "complexity" || r.rule === "fn-lines" || r.rule === "max-depth")
  .filter((r) => isProd(r.file))
  .filter((r) =>
    r.rule === "complexity" ? r.value > COMPLEXITY_MAX
    : r.rule === "max-depth" ? r.value > MAX_DEPTH_MAX
    : r.value > FN_LINES_MAX,
  );

if (!gate) {
  const pick = (rows2) => rows2.map((r) => ({ value: r.value, file: r.file, line: r.line }));
  const top = pick(
    data
      .filter((r) => r.rule === "complexity")
      .sort((a, b) => b.value - a.value)
      .slice(0, 30),
  );
  console.log("== top 30 by cyclomatic complexity (limit " + COMPLEXITY_MAX + ") ==");
  console.table(top);
  const topFn = pick(
    data.filter((r) => r.rule === "fn-lines").sort((a, b) => b.value - a.value).slice(0, 20),
  );
  console.log("== top 20 by non-blank function lines (limit " + FN_LINES_MAX + ") ==");
  console.table(topFn);
  const topDepth = pick(
    data.filter((r) => r.rule === "max-depth").sort((a, b) => b.value - a.value).slice(0, 20),
  );
  console.log("== top 20 by nesting depth (limit " + MAX_DEPTH_MAX + ") ==");
  console.table(topDepth);
  console.log("== top 25 files by total lines ==");
  console.table(sizes.map((r) => ({ value: r.value, file: r.file })).sort((a, b) => b.value - a.value).slice(0, 25));
  console.log(`files=${sizes.length} complexityViolations=${byComplexity.length}`);
} else {
  console.log(`gate: COMPLEXITY_MAX=${COMPLEXITY_MAX} MAX_DEPTH_MAX=${MAX_DEPTH_MAX} FN_LINES_MAX=${FN_LINES_MAX}`);
  console.log(`violations=${byComplexity.length}`);
  for (const r of byComplexity.slice(0, 100)) {
    console.log(`  ${r.rule} ${r.value} > ${r.rule === "complexity" ? COMPLEXITY_MAX : r.rule === "max-depth" ? MAX_DEPTH_MAX : FN_LINES_MAX}  ${r.file}:${r.line}`);
  }
}

const jsonArg = process.argv.indexOf("--json");
if (jsonArg > -1) {
  writeFileSync(process.argv[jsonArg + 1], JSON.stringify({ generatedAt: new Date().toISOString(), thresholds: { COMPLEXITY_MAX, MAX_DEPTH_MAX, FN_LINES_MAX }, all: data, files: sizes }, null, 2));
}
if (gate && byComplexity.length > 0) process.exitCode = 1;
