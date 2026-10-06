/**
 * Every key the app asks for, checked against the packs.
 *
 * A key the packs do not have is not a crash — the lookup falls through to the
 * English — but it IS a line that stays in English when somebody has chosen
 * Urdu, and on a screen where everything around it changed that reads as a bug.
 * So it has to be visible here rather than discovered on a phone.
 *
 *   node scripts/check-i18n.mjs
 */
import fs from "node:fs"; import path from "node:path";
const SRC = path.resolve(import.meta.dirname, "../src");
const I18N = path.resolve(SRC, "i18n");
const packs = Object.fromEntries(["en", "ur", "gu", "ar"].map(c =>
  [c, JSON.parse(fs.readFileSync(path.join(I18N, `${c}.json`), "utf8"))]));

/* No pack may carry HTML.
 *
 * The app renders *bold* and _italic_ and nothing else, so a <b> reaches the
 * reader as four literal characters. The packs were lifted from the website,
 * where these are data-i18n-html strings with real markup in them: English was
 * converted when it was written, and the three translations were not. Thirty-six
 * strings in each language — including the time under NEXT JAMĀʿAH on the home
 * screen — showed "<b>1:05 pm</b>" to every Urdu, Gujarati and Arabic reader,
 * and no check saw it because nothing was missing or empty. */
{
  let html = 0;
  for (const [code, pack] of Object.entries(packs)) {
    for (const [k, v] of Object.entries(pack)) {
      if (typeof v === "string" && /<\/?[a-z][^>]*>/i.test(v)) {
        if (html < 8) console.log(`  HTML IN A PACK  ${code}  ${k}  ::  ${v.slice(0, 60)}`);
        html++;
      }
    }
  }
  if (html) {
    console.log(`::error::${html} pack strings contain HTML. The app renders *bold* and _italic_, not tags.`);
    process.exitCode = 1;
  }
}

const files = [];
(function walk(d) { for (const f of fs.readdirSync(d)) {
  const p = path.join(d, f);
  if (fs.statSync(p).isDirectory()) { if (f !== "i18n" && f !== "data") walk(p); }
  else if (/\.jsx?$/.test(f)) files.push(p);
} })(SRC);

/* Keys reach the lookup two ways: t("key", "English") in a screen, and
 * {k:"key", t:"English"} in a hand-written block. Both count. */
const used = new Map();
for (const f of files) {
  const src = fs.readFileSync(f, "utf8");
  for (const m of src.matchAll(/\bt\(\s*"([a-z0-9_.]+)"/gi)) add(m[1], f);
  /* A dotted name is a pack key. A bare word is a React list id — the chips on
   * the prayer-times screen are k:"today", k:"fri", k:"month", and their labels
   * are separate t() calls that ARE translated. Reporting those three for ever
   * is worse than not checking them: four permanent false alarms are exactly
   * where a real miss goes unnoticed. */
  for (const m of src.matchAll(/\bk:\s*"([a-z0-9_.]+)"/gi)) if (m[1].includes(".")) add(m[1], f);
  /* t(`prayer.${k}`, …) and friends — the stems are checked by hand below. */
}
function add(k, f) {
  /* A name ending in a dot is the literal half of a key built by
   * concatenation — T("date.fulldow." + n). The whole keys it makes are in
   * DYNAMIC below; the stem itself is not a key and never will be. */
  if (k.endsWith(".")) return;
  if (!used.has(k)) used.set(k, new Set()); used.get(k).add(path.relative(SRC, f));
}

/* Keys built at runtime from a variable. Expanded here so they are checked too. */
const DYNAMIC = [
  ...["fajr", "sunrise", "zuhr", "asr", "maghrib", "isha"].map(p => `prayer.${p}`),
  /* date.fulldow.<0-6>, built from the day number. */
  ...Array.from({ length: 7 }, (_, i) => `date.fulldow.${i}`),
  ...Array.from({ length: 114 }, (_, i) => `surah.${i + 1}.name`),
];
for (const k of DYNAMIC) add(k, "(built at runtime)");

/* "Missing" means no pack has it at all. A key the English pack lacks but Urdu
 * carries is fine — the English reads from the fallback in the source, which is
 * exactly where a surah's own name already is. */
const anywhere = k => packs.en[k] || packs.ur[k] || packs.gu[k] || packs.ar[k];
const missing = [...used.keys()].filter(k => !anywhere(k)).sort();
const untranslated = [...used.keys()].filter(k => anywhere(k) && !packs.ur[k]).sort();

console.log(`${used.size} keys used across ${files.length} files`);
console.log(`${used.size - missing.length} are in at least one pack`);
console.log(`${used.size - missing.length - untranslated.length} are in the Urdu pack too\n`);

if (missing.length) {
  console.log(`NOT IN ANY PACK — these stay English in every language (${missing.length}):`);
  for (const k of missing) console.log("  " + k.padEnd(44) + [...used.get(k)].join(" "));
}
if (untranslated.length) {
  console.log(`\nEnglish only — no Urdu/Gujarati/Arabic (${untranslated.length}):`);
  for (const k of untranslated) console.log("  " + k.padEnd(44) + [...used.get(k)].join(" "));
}
