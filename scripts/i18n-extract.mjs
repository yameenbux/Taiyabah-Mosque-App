#!/usr/bin/env node
/* Find every user-visible string in index.html, and tag the ones that can be
 * tagged safely.
 *
 * Only elements whose entire content is a single run of text are touched: if
 * an element contains other elements, rewriting it risks mangling the markup,
 * so it is reported instead of changed. Anything inside <script>, <style> or
 * <svg> is left alone, as is anything already carrying data-i18n.
 *
 *   node scripts/i18n-extract.mjs           report coverage
 *   node scripts/i18n-extract.mjs --apply   add data-i18n attributes
 *   node scripts/i18n-extract.mjs --keys    print the English key map as JSON
 */
import { readFileSync, writeFileSync } from "node:fs";

const FILE = "index.html";
const apply = process.argv.includes("--apply");
const dumpKeys = process.argv.includes("--keys");

let html = readFileSync(FILE, "utf8");

/* Blank out regions we must never touch, keeping offsets identical so the
   positions we find still line up with the real document. */
const blanked = html.replace(/<(script|style|svg)\b[\s\S]*?<\/\1>|<!--[\s\S]*?-->/gi,
  m => " ".repeat(m.length));

const decode = s => s
  .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
  .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&middot;/g, "·")
  .replace(/&hellip;/g, "…").replace(/&mdash;/g, "—").replace(/&ndash;/g, "–")
  .replace(/&rsquo;/g, "’").replace(/&lsquo;/g, "‘").replace(/&ldquo;/g, "“")
  .replace(/&rdquo;/g, "”").replace(/&nbsp;/g, " ").replace(/&times;/g, "×")
  .replace(/&rarr;/g, "→").replace(/&larr;/g, "←").replace(/&rsaquo;/g, "›")
  /* Numeric entities too: the app writes ʿ as &#703;, and leaving those
     encoded puts "703" in the middle of keys and ships the raw entity to the
     translator as if it were a word. */
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
  .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)));

/* A key that reads like the thing it names, prefixed by the sheet it lives in
   so the packs stay navigable at four hundred entries. */
const slug = t => decode(t)
  .normalize("NFD").replace(/[\u0300-\u036f]/g, "")   // ā -> a, ṣ -> s
  .toLowerCase()
  .replace(/[^a-z0-9\s]/g, " ")
  .trim().split(/\s+/).filter(Boolean).slice(0, 5).join("_").slice(0, 46);

function sectionAt(pos) {
  const before = blanked.slice(0, pos);
  const ids = [...before.matchAll(/<div class="sheet" id="([a-z0-9-]+)"/gi)];
  const closes = (before.match(/<\/div>/g) || []).length;
  if (!ids.length) return "app";
  return ids[ids.length - 1][1].replace(/-/g, "");
}

const ELEMENT = /<(h1|h2|h3|h4|p|span|button|div|li|label|option|strong|em|small|td|th|a)\b([^>]*)>([^<>]+)<\/\1>/gi;

const found = [];
const seenKey = new Map();
for (const m of blanked.matchAll(ELEMENT)) {
  const [full, tag, attrs, text] = m;
  if (/data-i18n=/.test(attrs)) continue;
  const clean = decode(text).trim();
  if (!clean || clean.length < 2) continue;
  if (!/[A-Za-z]{2,}/.test(clean)) continue;         // numbers/punctuation only
  if (/^[؀-ࣿ\s·—–]+$/.test(clean)) continue; // Arabic script stays as-is
  const base = `${sectionAt(m.index)}.${slug(clean)}`;
  let key = base, i = 2;
  while (seenKey.has(key) && seenKey.get(key) !== clean) key = `${base}_${i++}`;
  seenKey.set(key, clean);
  found.push({ key, text: clean, tag, attrs, raw: text, index: m.index, length: full.length });
}

if (dumpKeys) {
  const map = {};
  for (const f of found) map[f.key] = f.text;
  for (const m of html.matchAll(/data-i18n="([^"]+)"[^>]*>([^<>]+)</g)) map[m[1]] = decode(m[2]).trim();
  console.log(JSON.stringify(map, null, 1));
  process.exit(0);
}

console.log(`${found.length} untagged visible strings in ${FILE}`);
if (!apply) {
  const bySection = {};
  for (const f of found) (bySection[f.key.split(".")[0]] ??= []).push(f);
  for (const [sec, items] of Object.entries(bySection).sort((a, b) => b[1].length - a[1].length))
    console.log(`  ${sec.padEnd(14)} ${String(items.length).padStart(3)}`);
  console.log("\nrun with --apply to tag them");
  process.exit(0);
}

/* Rewrite back to front so earlier offsets stay valid. */
let out = html;
for (const f of [...found].sort((a, b) => b.index - a.index)) {
  const open = `<${f.tag}${f.attrs}>`;
  const tagged = `<${f.tag}${f.attrs} data-i18n="${f.key}">`;
  out = out.slice(0, f.index) + tagged + f.raw + `</${f.tag}>` + out.slice(f.index + f.length);
}
writeFileSync(FILE, out);
console.log(`tagged ${found.length} elements`);
