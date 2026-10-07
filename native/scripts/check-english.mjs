#!/usr/bin/env node
/**
 * Taiyabah Masjid — does the app's English match the website's English?
 * Copyright (c) 2026 Yameen Bux. All rights reserved. See LICENSE.md.
 *
 * The lookup is `t(key, english)` and it returns `pack[key] || english`. For
 * English readers there IS no pack — prefs.lang === "en" leaves it null by
 * design — so the second argument is not a fallback at all: it is what every
 * English reader sees, always. en.json is only a backstop for a key called
 * with no wording at the call site.
 *
 * Which means check-screens, which verifies that a key exists in the packs,
 * cannot see this class of difference: the key resolves, the Urdu is right,
 * and the English on screen is still whatever somebody typed at the call site
 * rather than what the masjid wrote on its website. "Price per gram of silver
 * today (£)" against the site's "Price per gram today (£)"; "Check today's
 * price" against "check price".
 *
 * So this compares every call site's English with en.json — which is built
 * from the website's own markup — and reports where they differ.
 *
 *   node scripts/check-english.mjs [--strict]
 */
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const EN = JSON.parse(fs.readFileSync(path.join(root, "src/i18n/en.json"), "utf8"));

/* Differences that are deliberate, each with the reason. A screen may word
 * something better than the website did and still borrow its Urdu. */
const ALLOWED = new Map([
  ["sysprefs.display_language",
   "the hero's title; the sheet header already says System Preferences"],
]);

const files = [];
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (/\.jsx?$/.test(e.name)) files.push(p);
  }
})(path.join(root, "src"));

/* t("key", "english") — a plain double- or backtick-quoted second argument.
 * A template literal with a ${} in it is interpolated at run time and cannot
 * be compared, so those are listed separately rather than silently passed. */
const CALL = /\bt\(\s*"([a-z0-9_.]+)"\s*,\s*("(?:[^"\\]|\\.)*"|`(?:[^`\\$]|\\.)*`)\s*\)/gs;

const diffs = [], dynamic = [], unknown = [];

for (const f of files) {
  const src = fs.readFileSync(f, "utf8");
  for (const m of src.matchAll(CALL)) {
    const [, key, raw] = m;
    const rel = path.relative(root, f);
    const line = src.slice(0, m.index).split("\n").length;
    if (raw.startsWith("`") && raw.includes("${")) { dynamic.push([rel, line, key]); continue; }
    const said = JSON.parse(raw.startsWith("`") ? `"${raw.slice(1, -1).replace(/"/g, '\\"')}"` : raw);
    const want = EN[key];
    if (want === undefined) { unknown.push([rel, line, key]); continue; }
    /* The packs carry *emphasis* markers the website writes as <b>; the
     * website's own text has the tags stripped by the pack builder, so
     * compare with the markers taken out and the whitespace normalised. */
    const norm = s => s.replace(/\*/g, "").replace(/ /g, " ").replace(/\s+/g, " ").trim();
    if (norm(said) !== norm(want) && !ALLOWED.has(key))
      diffs.push([rel, line, key, said, want]);
  }
}

for (const [f, line, key, said, want] of diffs) {
  console.log(`\n  ${f}:${line}  ${key}`);
  console.log(`     app: ${said}`);
  console.log(`     web: ${want}`);
}
if (dynamic.length) {
  console.log(`\n  ${dynamic.length} interpolated — not comparable:`);
  for (const [f, line, key] of dynamic) console.log(`     ${f}:${line}  ${key}`);
}
if (unknown.length) {
  console.log(`\n  ${unknown.length} keys not in en.json (the app's own wording):`);
  for (const [f, line, key] of unknown.slice(0, 12)) console.log(`     ${f}:${line}  ${key}`);
  if (unknown.length > 12) console.log(`     … and ${unknown.length - 12} more`);
}

console.log(`\n${diffs.length} differences from the website's English` +
            (ALLOWED.size ? ` (${ALLOWED.size} allowed)` : ""));
if (diffs.length && process.argv.includes("--strict")) process.exit(1);
