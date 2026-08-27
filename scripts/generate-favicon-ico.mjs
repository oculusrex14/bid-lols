#!/usr/bin/env node
// @ts-check
/**
 * Generate public/favicon.ico from the existing public/favicon.svg
 * (Phase 00.6, WS7). Ordinary browsers request /favicon.ico by default;
 * serving a valid ICO there stops the avoidable 404s in the logs.
 *
 * Approach: rasterize the SVG at 32x32 and 16x16 with headless Chromium
 * (already a devDependency for the smoke tests) via a canvas, then pack both
 * PNGs into a single ICO container (PNG-in-ICO — valid and supported by all
 * modern browsers). The SVG favicon stays untouched.
 *
 * Usage: node scripts/generate-favicon-ico.mjs   (writes public/favicon.ico)
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const svgPath = join(root, "public", "favicon.svg");
const outPath = join(root, "public", "favicon.ico");

const svgText = readFileSync(svgPath, "utf8");
const svgDataUrl = `data:image/svg+xml;utf8,${encodeURIComponent(svgText)}`;

async function rasterizePng(browser, size) {
  const page = await browser.newPage();
  await page.setContent(
    `<!doctype html><html><body style="margin:0"><img id="fav" src="${svgDataUrl}"></body></html>`,
  );
  await page.waitForFunction(() => {
    const el = document.getElementById("fav");
    return el && el.naturalWidth > 0;
  });
  const b64 = await page.evaluate((s) => {
    return new Promise((resolve, reject) => {
      const el = document.getElementById("fav");
      const canvas = document.createElement("canvas");
      canvas.width = s;
      canvas.height = s;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("no 2d context"));
      ctx.drawImage(el, 0, 0, s, s);
      try {
        resolve(canvas.toDataURL("image/png").split(",")[1]);
      } catch (err) {
        reject(err);
      }
    });
  }, size);
  await page.close();
  return Buffer.from(b64, "base64");
}

/**
 * Pack PNG images into an ICO container.
 * @param {Array<{ size: number, png: Buffer }>} images
 * @returns {Buffer}
 */
function pngsToIco(images) {
  const count = images.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(count, 4);

  const entrySize = 16;
  let dataOffset = 6 + entrySize * count;
  const entries = [];
  for (const { size, png } of images) {
    const entry = Buffer.alloc(entrySize);
    entry.writeUInt8(size >= 256 ? 0 : size, 0); // width (0 means 256)
    entry.writeUInt8(size >= 256 ? 0 : size, 1); // height
    entry.writeUInt8(0, 2); // color palette
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // color planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(png.length, 8); // image data size
    entry.writeUInt32LE(dataOffset, 12); // image data offset
    dataOffset += png.length;
    entries.push(entry);
  }
  return Buffer.concat([header, ...entries, ...images.map((i) => i.png)]);
}

const browser = await chromium.launch({
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
try {
  const png32 = await rasterizePng(browser, 32);
  const png16 = await rasterizePng(browser, 16);
  if (!png32.length || !png16.length) throw new Error("rasterization produced no data");
  const ico = pngsToIco([
    { size: 32, png: png32 },
    { size: 16, png: png16 },
  ]);
  writeFileSync(outPath, ico);
  console.log(
    `[generate-favicon-ico] wrote ${outPath} (${ico.length} bytes, 32x32 + 16x16 PNG-in-ICO)`,
  );
} finally {
  await browser.close();
}
