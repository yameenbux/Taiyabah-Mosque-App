/**
 * Taiyabah Masjid — drawer icon extractor
 * Copyright (c) 2026 Yameen Bux. All rights reserved. See LICENSE.md.
 *
 * The More screen's twenty rows each carry a hand-drawn SVG on the website —
 * a mortar board for Education, a heart for Birth/Marriage/Death, a card for
 * Membership. The native screen had been drawing the nearest glyph in an icon
 * font instead, which gave Education a rosette, Birth/Marriage/Death a branch
 * diagram and System Preferences a set of sliders where the site has a globe.
 *
 * This pulls each row's own drawing, keyed by the row's data-i18n key, so the
 * same markup that names the row supplies its picture. It also takes the three
 * social marks at the foot of the drawer — Ionicons has no X, so the native
 * screen had been showing the old Twitter bird: a different company's logo
 * standing in for this one.
 *
 *   node scripts/extract-drawer.mjs
 */
import pw from "/opt/node22/lib/node_modules/playwright/index.js";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "../..");
const OUT = path.resolve(import.meta.dirname, "../src/data");

const browser = await pw.chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const page = await browser.newPage();
await page.goto("file://" + path.join(ROOT, "index.html"), { waitUntil: "domcontentloaded" });

const data = await page.evaluate(() => {
  const out = { rows: {}, social: {} };

  for (const row of document.querySelectorAll("#drawer .dr-row")) {
    const svg = row.querySelector(".dr-ico svg");
    /* The row's key is on .dr-t, or on the span inside it when the row also
       carries a note — the madrasah portal is the only one of those. */
    const t = row.querySelector(".dr-t");
    const keyed = t && (t.getAttribute("data-i18n") ? t : t.querySelector("[data-i18n]"));
    if (!svg || !keyed) continue;
    out.rows[keyed.getAttribute("data-i18n")] = svg.outerHTML.replace(/\s+/g, " ").trim();
  }

  for (const a of document.querySelectorAll("#drawer .dr-soc a, #drawer .dr-social a")) {
    const svg = a.querySelector("svg");
    const href = a.getAttribute("href") || "";
    const name = /instagram/i.test(href) ? "instagram"
               : /youtube|youtu\.be/i.test(href) ? "youtube"
               : /twitter|x\.com/i.test(href) ? "x" : null;
    if (svg && name) out.social[name] = svg.outerHTML.replace(/\s+/g, " ").trim();
  }

  return out;
});

await browser.close();

const n = Object.keys(data.rows).length, s = Object.keys(data.social).length;
if (!n) throw new Error("no drawer rows found — has the markup changed?");
fs.writeFileSync(path.join(OUT, "drawer.json"), JSON.stringify(data, null, 1) + "\n");
console.log(`${n} drawer rows, ${s} social marks → src/data/drawer.json`);
