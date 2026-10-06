/**
 * Finds the real key for a string this app invented a name for.
 *
 * A lot of the screens were written with keys like `home.holy_quran` when the
 * language packs have had the very same words under a different name for a
 * year. Rather than guess at the mapping by eye across 300 strings, match on
 * the English: if the fallback text in the source is word-for-word a string the
 * pack already holds, that pack key is the right one, and using it brings Urdu,
 * Gujarati and Arabic with it at no cost.
 *
 *   node scripts/map-i18n.mjs          # report
 *   node scripts/map-i18n.mjs --write  # rewrite the sources
 */
import fs from "node:fs"; import path from "node:path";
const SRC = path.resolve(import.meta.dirname, "../src");
const EN = JSON.parse(fs.readFileSync(path.join(SRC, "i18n/en.json"), "utf8"));
const UR = JSON.parse(fs.readFileSync(path.join(SRC, "i18n/ur.json"), "utf8"));
const WRITE = process.argv.includes("--write");

/* Compare on the words, not the punctuation: the markup uses curly quotes and
 * the source files mostly do not, and that difference is not a difference. */
const norm = s => String(s).toLowerCase()
  .replace(/[\u2018\u2019\u02bc']/g, "'").replace(/[\u201c\u201d]/g, '"')
  .replace(/[\u2014\u2013]/g, "-").replace(/[*_]/g, "")
  .replace(/\s+/g, " ").replace(/[.,:;!?]+$/, "").trim();

const byText = new Map();
for (const [k, v] of Object.entries(EN)) {
  const n = norm(v);
  if (!n) continue;
  /* Prefer a key that has an Urdu translation, and among those the shortest
   * name — the packs carry a few near-duplicates. */
  const prev = byText.get(n);
  if (!prev || (UR[k] && !UR[prev]) || (!!UR[k] === !!UR[prev] && k.length < prev.length)) byText.set(n, k);
}

const files = [];
(function walk(d) { for (const f of fs.readdirSync(d)) {
  const p = path.join(d, f);
  if (fs.statSync(p).isDirectory()) { if (f !== "i18n" && f !== "data") walk(p); }
  else if (/\.jsx?$/.test(f)) files.push(p);
} })(SRC);

let mapped = 0, unmatched = [];
for (const f of files) {
  let src = fs.readFileSync(f, "utf8"), out = src;
  /* t("key", "English")  —  across a line break, which the formatting uses a lot */
  const re = /\bt\(\s*"([a-z0-9_.]+)"\s*,\s*((?:"(?:[^"\\]|\\.)*"|`(?:[^`\\]|\\.)*`)(?:\s*\+\s*(?:"(?:[^"\\]|\\.)*"|`(?:[^`\\]|\\.)*`))*)/gis;
  out = out.replace(re, (whole, key, lit) => {
    if (EN[key]) return whole;                       // already a real key
    if (/\$\{/.test(lit)) return whole;              // interpolated: no fixed English
    let text;
    try { text = String(eval(lit)); } catch { return whole; }   // the literal, unescaped
    const real = byText.get(norm(text));
    if (!real) { unmatched.push([key, text.slice(0, 60), path.relative(SRC, f)]); return whole; }
    mapped++;
    return whole.replace(`"${key}"`, `"${real}"`);
  });
  /* {k: "key", t: "English"} in hand-written blocks */
  out = out.replace(/\bk:\s*"([a-z0-9_.]+)",\s*t:\s*"((?:[^"\\]|\\.)*)"/g, (whole, key, text) => {
    if (EN[key]) return whole;
    const real = byText.get(norm(text.replace(/\\"/g, '"')));
    if (!real) { unmatched.push([key, text.slice(0, 60), path.relative(SRC, f)]); return whole; }
    mapped++;
    return whole.replace(`"${key}"`, `"${real}"`);
  });
  if (out !== src && WRITE) fs.writeFileSync(f, out);
}

console.log(`${mapped} key(s) ${WRITE ? "rewritten to" : "can be rewritten to"} a key the packs already translate`);
if (unmatched.length) {
  console.log(`\n${unmatched.length} string(s) are new to this app — no pack has them:`);
  const seen = new Set();
  for (const [k, text, f] of unmatched) {
    if (seen.has(k)) continue; seen.add(k);
    console.log("  " + k.padEnd(40) + JSON.stringify(text));
  }
}
