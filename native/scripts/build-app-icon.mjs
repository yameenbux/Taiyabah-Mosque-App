/**
 * Taiyabah Masjid — the iOS app icon, at a size somebody can actually read.
 * Copyright (c) 2026 Yameen Bux. All rights reserved. See LICENSE.md.
 *
 * WHY THIS IS SEPARATE FROM THE ANDROID ONE. assets/icon.png used to serve
 * both, and the wordmark in it measured 555 x 394 inside a 1024 canvas — a
 * bounding diagonal of 681px against Android's adaptive-icon safe circle of
 * 682px. That is not a coincidence: the artwork was sized to survive
 * Android's mask, which keeps only the middle two thirds.
 *
 * iOS has no such mask. It rounds the corners and shows everything else, so
 * the same artwork left more than half the icon empty and rendered "MASJID"
 * at about two points on a home screen — invisible among other apps, which
 * is exactly what was reported.
 *
 * So the original artwork stays, as assets/adaptive-icon.png, where it is
 * correct. This writes a separate assets/icon.png for iOS with the lockup at
 * LOCKUP_SHARE of the canvas.
 *
 *   node scripts/build-app-icon.mjs
 *
 * No alpha: an iOS app icon with transparency is rejected at submission, so
 * the plum is painted rather than left to the page.
 */
import { requirePlaywright } from "./lib/playwright.mjs";
const pw = await requirePlaywright("build-app-icon.mjs");
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "../..");
const SRC = path.join(ROOT, "logo.svg");
const OUT = path.resolve(import.meta.dirname, "../assets/icon.png");

const SIZE = 1024;
const PLUM = "#3C0B2A";
/* 76%. Apple's own icons sit a little inside the corner radius; past about
   80% a wide wordmark starts to feel like it is pressing on the edges. */
const LOCKUP_SHARE = 0.76;

const svg = fs.readFileSync(SRC, "utf8");
const browser = await pw.chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const page = await browser.newPage({ viewport: { width: SIZE, height: SIZE }, deviceScaleFactor: 1 });
await page.setContent(`<style>
  html,body{margin:0;width:${SIZE}px;height:${SIZE}px;background:${PLUM};overflow:hidden}
  .wrap{width:${SIZE}px;height:${SIZE}px;display:flex;align-items:center;justify-content:center}
  svg{display:block;width:${Math.round(SIZE * LOCKUP_SHARE)}px;height:auto}
</style><div class="wrap">${svg}</div>`);
await page.screenshot({ path: OUT, type: "png", omitBackground: false });
await browser.close();
console.log(`wrote assets/icon.png — ${SIZE}px, lockup at ${(LOCKUP_SHARE * 100).toFixed(0)}% of the canvas, ` +
            `${(fs.statSync(OUT).size / 1024).toFixed(0)}KB`);
