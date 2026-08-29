#!/usr/bin/env node
// @ts-check
/**
 * WCAG AA contrast audit for the Network Spine palettes (style pass, 2026-08-29).
 *
 * Parses src/styles.css (the single source of palette truth) and asserts, for
 * every product x mode, that each semantic text role clears AA (>= 4.5:1) on
 * every surface it can sit on. Also asserts the theme-color meta values
 * (THEME_COLORS in host-seo-shared.mjs) equal the CSS page background so the
 * browser chrome can never diverge from the page.
 *
 * This is the measured guard behind the "contrast-verified" claim in
 * docs/03_DESIGN_SYSTEM.md.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { THEME_COLORS } from "./host-seo-shared.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const css = readFileSync(join(root, "src", "styles.css"), "utf8");

/** Extract `--name: #hex;` pairs from one CSS rule body. */
function block(selector) {
  const re = new RegExp(
    selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\s*\\{([^}]*)\\}",
  );
  const m = css.match(re);
  assert.ok(m, `styles.css: expected block not found: ${selector}`);
  const tokens = {};
  for (const t of m[1].matchAll(/--([a-z-]+):\s*(#[0-9a-fA-F]{3,8})\s*;?/g)) {
    tokens[t[1]] = t[1].length ? t[2].toLowerCase() : t[2].toLowerCase();
  }
  return tokens;
}

function srgbToLinear(v) {
  const c = v / 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function relLuminance(hex) {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16));
  return 0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b);
}

/** WCAG contrast ratio between two hex colors. */
function contrast(a, b) {
  const l1 = relLuminance(a);
  const l2 = relLuminance(b);
  const [hi, lo] = l1 >= l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * Assemble the effective token set for a product in a mode.
 * bidthrone has theme: null (the :root / dark-default blocks ARE bidthrone).
 */
function palette(product, mode) {
  const theme = { bidthrone: null, foundersbid: "founders", culturebid: "culture", bidception: "bidception" }[product];
  const baseSel = mode === "light" ? ":root" : 'html[data-mode="dark"]';
  const base = block(baseSel);
  const tokens = { ...base };
  if (theme) {
    const sel =
      mode === "light"
        ? `[data-theme="${theme}"]`
        : `html[data-mode="dark"][data-theme="${theme}"]`;
    Object.assign(tokens, block(sel));
  }
  return tokens;
}

const TEXT_ROLES = ["fg", "muted", "subtle", "accent", "up", "danger", "warn"];
const SURFACES = ["bg", "surface", "raised"];
const AA = 4.5;

test("every text role clears WCAG AA on every surface, all four products, light and dark", () => {
  for (const product of Object.keys(THEME_COLORS)) {
    for (const mode of ["light", "dark"]) {
      const p = palette(product, mode);
      for (const role of TEXT_ROLES) {
        assert.ok(p[role], `${product}/${mode}: missing token --${role}`);
        for (const surf of SURFACES) {
          const ratio = contrast(p[role], p[surf]);
          assert.ok(
            ratio >= AA,
            `${product} ${mode}: --${role} on --${surf} is ${ratio.toFixed(2)}:1 (< ${AA}:1)`,
          );
        }
      }
      // Button label: accent-fg on accent.
      const ratio = contrast(p["accent-fg"], p.accent);
      assert.ok(
        ratio >= AA,
        `${product} ${mode}: --accent-fg on --accent is ${ratio.toFixed(2)}:1 (< ${AA}:1)`,
      );
    }
  }
});

test("theme-color meta equals the CSS page background per product (no chrome drift)", () => {
  for (const product of Object.keys(THEME_COLORS)) {
    assert.equal(
      THEME_COLORS[product].light,
      palette(product, "light").bg,
      `${product}: THEME_COLORS.light != styles.css --bg`,
    );
    assert.equal(
      THEME_COLORS[product].dark,
      palette(product, "dark").bg,
      `${product}: THEME_COLORS.dark != styles.css --bg`,
    );
  }
});
