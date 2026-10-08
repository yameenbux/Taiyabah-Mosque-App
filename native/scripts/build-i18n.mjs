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

/* The app renders *bold* and _italic_; it does not parse HTML. The English
 * from the markup comes through clean(), which converts them — but the
 * lang/src packs and the strings lifted from script source have not had that
 * pass, and 112 pack entries were carrying raw <b> and <i> tags that would
 * have printed as tags on screen in Urdu, Gujarati and Arabic. */
const tagsToMarkers = s => s
  .replace(/<\s*(b|strong)\s*>([\s\S]*?)<\s*\/\s*\1\s*>/gi, (_, __, t) => "*" + t.trim() + "*")
  .replace(/<\s*(i|em)\s*>([\s\S]*?)<\s*\/\s*\1\s*>/gi, (_, __, t) => "_" + t.trim() + "_")
  .replace(/<br\s*\/?>/gi, "\n")
  .replace(/<[^>]+>/g, "")
  .replace(/[ \t]+/g, " ").trim();

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

/* --- the website's own JavaScript ---------------------------------------- *
 * Some of the site's wording is never in the markup: it is written by its
 * scripts, as t("hallhire.book", "Book"). The extraction above aborts scripts
 * and reads data-i18n attributes, so none of those strings reached the packs —
 * the hall booking's whole availability flow, fifteen strings, plus the text
 * size names on System Preferences, which had to be patched in by hand when
 * they turned up missing in all four languages. This takes them from the
 * source text instead, and only where the markup has not already given a
 * better one. */
{
  const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
  /* (?!\s*\+) — a string built by concatenation across lines would otherwise
     be recorded as its first half: "It is four digits after the year," with
     the rest lost. Better no entry than a truncated sentence. */
  const re = /\bt\(\s*"([a-z0-9_.]+)"\s*,\s*"((?:[^"\\]|\\.)*)"(?!\s*\+)/g;
  let found = 0;
  for (const m of html.matchAll(re)) {
    const k = m[1];
    if (en[k]) continue;
    /* The markup path runs clean(), which turns <b> into *bold* and <i> into
       _italic_ — the two things the app's Rich renderer understands. A string
       lifted from script source has had no such pass, so it would arrive
       carrying tags the app would print literally. */
    try { en[k] = tagsToMarkers(JSON.parse(`"${m[2]}"`)); found++; } catch {}
  }
  console.log(`${found} strings taken from the website's scripts`);
}

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
      if (typeof s === "string" && s.trim() && s.trim() !== "keep") { packs[code][k] = tagsToMarkers(s); kept[code]++; }
    }
  }
}

/* --- translations this app's own screens were given ---------------------- *
 * The Help screen, the forms' own wording, the alerts: words the website does
 * not have, translated for this app and held here in lang/src's own shape.
 * They used to live only in the built packs, which meant a routine run of
 * this script silently deleted 162 keys in three languages — 486 strings —
 * and nothing would have said so until somebody switched to Urdu. */
{
  const extra = JSON.parse(fs.readFileSync(path.join(OUT, "app-extra.json"), "utf8"));
  let n = 0;
  for (const [k, v] of Object.entries(extra)) {
    if (!Array.isArray(v)) continue;
    for (const [code, i] of Object.entries(IDX)) {
      const t = typeof v[i] === "string" ? v[i].trim() : "";
      if (t && t !== "keep") { packs[code][k] = tagsToMarkers(t); n++; }
    }
  }
  console.log(`${n} translations merged from app-extra.json`);
}

/* --- the strings this app introduced ------------------------------------- *
 * Forms, reminders, the compass, the muṣḥaf reader: screens the web app never
 * had, so their words are nowhere in lang/src. They are collected here anyway,
 * for two reasons — the English pack is then the complete list of what the app
 * can say, and TODO-translate.json is a file somebody can be handed. */
const srcDir = path.resolve(import.meta.dirname, "../src");
const srcFiles = [];
(function walk(d) { for (const f of fs.readdirSync(d)) {
  const p = path.join(d, f);
  if (fs.statSync(p).isDirectory()) { if (f !== "i18n" && f !== "data") walk(p); }
  else if (/\.jsx?$/.test(f)) srcFiles.push(p);
} })(srcDir);

const own = {};
for (const f of srcFiles) {
  const code = fs.readFileSync(f, "utf8");
  const re = /\bt\(\s*"([a-z0-9_.]+)"\s*,\s*((?:"(?:[^"\\]|\\.)*"|`(?:[^`\\]|\\.)*`)(?:\s*\+\s*(?:"(?:[^"\\]|\\.)*"|`(?:[^`\\]|\\.)*`))*)/gis;
  for (const m of code.matchAll(re)) {
    if (en[m[1]] || own[m[1]] || /\$\{/.test(m[2])) continue;
    try { own[m[1]] = String(eval(m[2])); } catch {}
  }
  for (const m of code.matchAll(/\bk:\s*"([a-z0-9_.]+)",\s*t:\s*"((?:[^"\\]|\\.)*)"/g)) {
    if (!en[m[1]] && !own[m[1]]) own[m[1]] = m[2].replace(/\\"/g, '"');
  }
}
Object.assign(en, own);

/* A key is only waiting for a translator if it is actually missing one. Twelve
 * of this app's own strings have since been given Urdu, Gujarati and Arabic in
 * app-extra.json; without this filter they would still be listed as untranslated
 * and a reviewer handed the file would waste their time on words already done. */
const todo = Object.fromEntries(
  Object.entries(own).filter(([k]) => !Object.keys(packs).every(code => packs[code][k])));
fs.writeFileSync(path.join(OUT, "TODO-translate.json"), JSON.stringify(todo, null, 1));

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
console.log(`${Object.keys(todo).length} strings are this app's own and have no translation yet —`);
console.log(`they are listed in src/i18n/TODO-translate.json, and show in English meanwhile.`);
