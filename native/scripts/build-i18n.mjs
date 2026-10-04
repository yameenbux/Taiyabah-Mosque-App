/**
 * Taiyabah Masjid — language packs for the native app
 * Copyright (c) 2026 Yameen Bux. All rights reserved. See LICENSE.md.
 *
 * English comes out of index.html (the source of truth for the copy); Urdu,
 * Gujarati and Arabic come out of lang/src/*.json, which is where the web app
 * keeps them. Nothing is retyped and nothing is machine-translated here — the
 * native app inherits exactly the words the community already sees.
 *
 *   node scripts/build-i18n.mjs
 */
import pw from "/opt/node22/lib/node_modules/playwright/index.js";
import fs from "node:fs"; import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "../..");
const OUT  = path.resolve(import.meta.dirname, "../src/i18n");
fs.mkdirSync(OUT, { recursive: true });

/* --- English, straight off the markup ------------------------------------ */
const browser = await pw.chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const page = await browser.newPage();
await page.route("**/*", r => (r.request().resourceType() === "script" ? r.abort() : r.continue()));
await page.goto("file://" + path.join(ROOT, "index.html"), { waitUntil: "domcontentloaded" });
const en = await page.evaluate(() => {
  const out = {};
  const clean = el => {
    let s = "";
    for (const n of el.childNodes) {
      if (n.nodeType === 3) s += n.nodeValue.replace(/\s+/g, " ");
      else if (n.nodeType === 1) {
        const t = n.tagName.toLowerCase();
        if (t === "svg") continue;
        if (t === "br") { s += "\u0001"; continue; }
        const inner = clean(n);
        s += (t === "b" || t === "strong") ? "*" + inner.trim() + "*"
           : (t === "i" || t === "em")     ? "_" + inner.trim() + "_" : inner;
      }
    }
    return s;
  };
  for (const el of document.querySelectorAll("[data-i18n],[data-i18n-html]")) {
    const k = el.getAttribute("data-i18n") || el.getAttribute("data-i18n-html");
    const t = clean(el).replace(/[ \t]+/g, " ").replace(/ ?\u0001 ?/g, "\n").trim();
    if (k && t && !out[k]) out[k] = t;
  }
  /* aria-labels carry the only wording some controls have */
  for (const el of document.querySelectorAll("[data-i18n-attr]")) {
    for (const pair of el.getAttribute("data-i18n-attr").split(",")) {
      const [attr, k] = pair.split(":").map(x => x.trim());
      const v = el.getAttribute(attr);
      if (k && v && !out[k]) out[k] = v;
    }
  }
  return out;
});
await browser.close();

/* --- the three packs, as the web app already holds them ------------------ */
const IDX = { ur: 0, gu: 1, ar: 2 };
const packs = { ur: {}, gu: {}, ar: {} };
let rows = 0, kept = { ur: 0, gu: 0, ar: 0 };
for (const f of fs.readdirSync(path.join(ROOT, "lang/src")).sort()) {
  const src = JSON.parse(fs.readFileSync(path.join(ROOT, "lang/src", f), "utf8"));
  for (const [k, v] of Object.entries(src)) {
    if (k.startsWith("_") || !Array.isArray(v)) continue;
    rows++;
    for (const [code, i] of Object.entries(IDX)) {
      const s = v[i];
      /* " keep" is the pack's own marker for "show the English" — bank
       * details, phone numbers, proper nouns. Leaving the key out is exactly
       * right: the lookup falls through to English. */
      if (typeof s === "string" && s.trim() && s.trim() !== "keep") { packs[code][k] = s.trim(); kept[code]++; }
    }
  }
}

fs.writeFileSync(path.join(OUT, "en.json"), JSON.stringify(en, null, 1));
for (const [code, p] of Object.entries(packs))
  fs.writeFileSync(path.join(OUT, `${code}.json`), JSON.stringify(p, null, 1));

const enKeys = Object.keys(en).length;
console.log(`en  ${String(enKeys).padStart(5)} strings  (from index.html)`);
for (const [code, n] of Object.entries(kept)) {
  const covered = Object.keys(packs[code]).filter(k => en[k]).length;
  console.log(`${code}  ${String(n).padStart(5)} strings  ${String(Math.round(100 * covered / enKeys)).padStart(3)}% of the English keys`);
}
console.log(`\n${rows} rows read from lang/src — wrote src/i18n/{en,ur,gu,ar}.json`);
