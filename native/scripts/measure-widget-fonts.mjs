/**
 * Taiyabah Masjid — real glyph advances for the Android widget's type.
 * Copyright (c) 2026 Yameen Bux. All rights reserved. See LICENSE.md.
 *
 * The widget check has to know how wide a string will be, and it was guessing:
 * every lower-case letter counted as 0.52em. In Roboto an "m" is 0.86em and an
 * "i" is 0.26em, so "7:15pm" came out about a tenth narrower than it really
 * is — the check was optimistic in the one direction a check must never be,
 * and a time on somebody's home screen would have ellipsized to "7:15…".
 *
 * So measure them, once, and keep the numbers. Roboto is what Android draws
 * for a default TextView and Noto Serif for android:fontFamily="serif".
 * Neither is installed here, and a browser asked for a font it has not got
 * does not say so — it quietly substitutes one and measures THAT, which is
 * how the first run of this produced Liberation Sans metrics and called them
 * Roboto. So the fonts are fetched before anything is measured, and the run
 * fails if what came back is not what was asked for.
 *
 * The output, scripts/lib/font-metrics.json, is committed. This only needs
 * running again if the widget starts drawing a character it has not measured.
 *
 *   node scripts/measure-widget-fonts.mjs      (rewrites lib/font-metrics.json)
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { chromium } from "playwright";

const root = path.resolve(import.meta.dirname, "..");
const outFile = path.join(root, "scripts/lib/font-metrics.json");

/* Everything the widget can draw: the timetable's digits and punctuation, the
   prayer names, and the ʿayn and macron the transliterations use. */
const CHARS = [..."0123456789:apmAJMFZIRGHSTUDBCEKLNOPQVWXY bcdefghijklnoqrstuvwxyz'’ʿāĀūīḥṣṭẓʾ-"];

/* The two typefaces Android draws, straight from the registry, so this does
   not depend on a font happening to be installed. */
const PACKAGES = { "Roboto": "@fontsource/roboto@5.1.0", "Noto Serif": "@fontsource/noto-serif@5.1.0" };
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "widget-fonts-"));
const faces = [];
for (const [family, pkg] of Object.entries(PACKAGES)) {
  const slug = pkg.split("/")[1].split("@")[0];
  const into = path.join(dir, slug);
  fs.mkdirSync(into, { recursive: true });
  execFileSync("npm", ["pack", pkg, "--silent"], { cwd: into, stdio: ["ignore", "ignore", "inherit"] });
  const tgz = fs.readdirSync(into).find((f) => f.endsWith(".tgz"));
  execFileSync("tar", ["-xzf", tgz, "-C", into], { cwd: into });
  for (const weight of [400, 700]) {
    const file = path.join(into, "package/files", `${slug}-latin-${weight}-normal.woff2`);
    const data = fs.readFileSync(file).toString("base64");
    faces.push(`@font-face{font-family:'${family}';font-weight:${weight};font-style:normal;` +
               `src:url(data:font/woff2;base64,${data}) format('woff2')}`);
  }
}

const browser = await chromium.launch();
const page = await browser.newPage();
await page.setContent(`<!doctype html><html><head><meta charset="utf-8">
<style>${faces.join("")}</style></head><body></body></html>`);
/* A face that nothing has drawn with yet sits "unloaded", so ask for each
   one explicitly before asking whether it arrived. */
await page.evaluate(async ([families, chars]) => {
  for (const f of families) for (const w of [400, 700]) await document.fonts.load(`${w} 16px '${f}'`, chars);
  await document.fonts.ready;
}, [Object.keys(PACKAGES), CHARS.join("")]);

/* A browser silently substitutes a font it has not got, so prove each one
   loaded rather than trusting that it did. */
const loaded = await page.evaluate(() => [...document.fonts].map((f) => `${f.family} ${f.weight} ${f.status}`));
for (const family of Object.keys(PACKAGES)) {
  for (const weight of [400, 700]) {
    if (!loaded.includes(`${family} ${weight} loaded`)) {
      console.error(`FAIL  ${family} ${weight} did not load — measuring it would have measured a substitute`);
      console.error(`      the browser has: ${loaded.join(", ") || "nothing"}`);
      await browser.close();
      process.exit(1);
    }
  }
}
console.log(`loaded ${loaded.length} faces: ${loaded.join(", ")}`);

const measure = (family, weight) =>
  page.evaluate(([family, weight, chars]) => {
    const c = document.createElement("canvas").getContext("2d");
    c.font = `${weight} 1000px ${family}`;
    const out = {};
    /* At 1000px the rounding noise is below a thousandth of an em. */
    for (const ch of chars) out[ch] = c.measureText(ch).width / 1000;
    return out;
  }, [family, weight, CHARS]);

const metrics = {
  "_note": "advances in em, measured from the real Roboto and Noto Serif; regenerate with scripts/measure-widget-fonts.mjs",
  "sans-400": await measure("Roboto", 400),
  "sans-700": await measure("Roboto", 700),
  "serif-400": await measure("'Noto Serif'", 400),
  "serif-700": await measure("'Noto Serif'", 700),
};
await browser.close();
fs.rmSync(dir, { recursive: true, force: true });

fs.writeFileSync(outFile, JSON.stringify(metrics, null, 1) + "\n");
const w = (k, ch) => metrics[k][ch].toFixed(3);
console.log(`wrote ${path.relative(root, outFile)}`);
console.log(`  Roboto 400: m=${w("sans-400", "m")} i=${w("sans-400", "i")} 7=${w("sans-400", "7")} :=${w("sans-400", ":")}`);
console.log(`  Roboto 700: m=${w("sans-700", "m")} 1=${w("sans-700", "1")}`);
console.log(`  Noto Serif: m=${w("serif-400", "m")} J=${w("serif-400", "J")}`);
