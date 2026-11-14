/**
 * Taiyabah Masjid — the app and the website draw the same five prayer glyphs.
 * Copyright (c) 2026 Yameen Bux. All rights reserved. See LICENSE.md.
 *
 * The Today strip exists twice: index.html draws it from its own STRIP_ICONS,
 * native/src/prayer-icons.jsx draws it from that file's. Nothing imports
 * across — the website is one file with no build step, and the app cannot
 * reach into it — so the only thing keeping the two honest is this.
 *
 * It is here because the two have already drifted, repeatedly and quietly:
 * the app drew ONE sun for four of the five prayers while the website drew
 * four different ones, and nobody saw it until a screenshot was laid beside a
 * phone. A difference in artwork never fails a build and never throws; it just
 * means the committee signs off on one picture and the congregation gets
 * another.
 *
 * So this compares the `d` of every path, in order, in both files, and fails
 * on the first that differs. It deliberately compares STRINGS and not rendered
 * shapes: two `d` values that draw the same curve by different arithmetic are
 * still two drawings, and the next edit to one of them will not be mirrored.
 *
 * WHAT IT CANNOT SEE. Stroke width, colour and size are set at the call site
 * in each app, not in the data, so this says nothing about them. It also
 * cannot tell you the glyphs are any good — only that there is one of them,
 * not two.
 */
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const site = fs.readFileSync(path.join(root, "..", "index.html"), "utf8");
const app = fs.readFileSync(path.join(root, "src/prayer-icons.jsx"), "utf8");

/* Both files write the table the same way on purpose — `key: [ "d", "d" ]` —
   so one reader serves both. Anything cleverer here would be a third place
   that has to agree with the other two. */
function table(src, where) {
  const block = src.match(/const STRIP_ICONS = \{([\s\S]*?)\n\};/);
  if (!block) {
    console.error(`could not find a STRIP_ICONS table in ${where}`);
    process.exit(1);
  }
  const out = {};
  for (const m of block[1].matchAll(/(\w+)\s*:\s*\[([\s\S]*?)\]\s*,/g))
    out[m[1]] = [...m[2].matchAll(/"((?:[^"\\]|\\.)*)"/g)].map(d => d[1]);
  return out;
}

const a = table(app, "native/src/prayer-icons.jsx");
const b = table(site, "index.html");

/* The five the strip draws, in the order it draws them. Named here rather
   than taken from either file, so a prayer dropped from BOTH is still a
   failure instead of a quietly shorter list that agrees with itself. */
const ORDER = ["fajr", "zuhr", "asr", "maghrib", "isha"];

/* Glyphs both tables must carry, identically, that are NOT columns in the
   strip. Sunrise is the only one: it is not a prayer and has no jamāʿah, so
   it is drawn on the line under the strip rather than in it — but it is the
   same drawing on both platforms and has exactly the same reason to be kept
   in step as the five above it. Listed rather than waved through, so a glyph
   cannot be added to one table alone and excused as "extra". */
const OFF_STRIP = ["sunrise"];
const ALL = [...ORDER, ...OFF_STRIP];

const fail = [];
for (const k of ALL) {
  const x = a[k], y = b[k];
  if (!x?.length) { fail.push(`${k}: no paths in native/src/prayer-icons.jsx`); continue; }
  if (!y?.length) { fail.push(`${k}: no paths in index.html`); continue; }
  if (x.length !== y.length) {
    fail.push(`${k}: the app draws ${x.length} path(s), the website ${y.length}`);
    continue;
  }
  for (let i = 0; i < x.length; i++)
    if (x[i] !== y[i])
      fail.push(`${k} path ${i + 1} differs\n      app: ${x[i]}\n      web: ${y[i]}`);
}
/* A key in one table and not the other is drift too, and the loop above only
   walks the five it already knows about. */
for (const [name, tbl] of [["the app", a], ["the website", b]])
  for (const k of Object.keys(tbl))
    if (!ALL.includes(k))
      fail.push(`${name} has a "${k}" glyph nothing is known to draw — add it to ORDER or ` +
                `OFF_STRIP here, or remove it`);

if (fail.length) {
  console.error(`\n${fail.length} prayer-icon difference(s) between the app and the website:\n`);
  for (const m of fail) console.error("  " + m);
  console.error("\n  Both tables have to say the same thing: native/src/prayer-icons.jsx" +
                "\n  and the STRIP_ICONS block in index.html.\n");
  process.exit(1);
}
const n = ALL.reduce((s, k) => s + a[k].length, 0);
console.log(`the app and the website draw the same ${ORDER.length} prayer glyphs `
          + `and ${OFF_STRIP.length} off the strip (${n} paths)`);
