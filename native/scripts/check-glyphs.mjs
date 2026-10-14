/**
 * Taiyabah Masjid — every character the app's own code writes can be drawn.
 * Copyright (c) 2026 Yameen Bux. All rights reserved. See LICENSE.md.
 *
 * THE FAULT THIS EXISTS FOR, which three green checks walked past.
 *
 * Rows that leave the app ended in "↗", written as a literal character in the
 * source. U+2197 is in none of the eight fonts the app bundles. It looked
 * right on iOS only because the fonts were not actually loading — the text was
 * being drawn in San Francisco, which has the character. The moment their name
 * tables were fixed and the real Hanken Grotesk started being used, iOS did
 * what it does with a character no named font can draw: it fell through to
 * Apple Color Emoji and drew a blue rounded square. A colour emoji ignores the
 * colour it is given, so every gold arrow in the app turned blue at once.
 *
 * check-icons.mjs asks this question of the icon font and check-arabic.mjs
 * asks it of the Arabic the app bundles. Neither looks at the ordinary text
 * the app's own source writes, which is where that arrow lived.
 *
 * SCOPE, and why it is drawn here. This reads the app's SOURCE — string and
 * template literals in src/, with comments stripped first, because prose about
 * a character is not the same as drawing one. It does not read the language
 * packs: Urdu and Gujarati are in no bundled font and are drawn by the system
 * on every phone the app supports, which is a deliberate decision recorded in
 * check-arabic.mjs. A character the app TYPES OUT ITSELF is different — it is
 * a choice somebody made in a component, and it should be one the app can keep.
 *
 *   node scripts/check-glyphs.mjs
 */
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");

/* Lifted from check-icons.mjs rather than shared, for the reason given there:
 * this has to run wherever the build runs, and the alternative is a Python
 * dependency in CI, which is a thing that breaks on a Tuesday. */
function codepoints(file) {
  const b = fs.readFileSync(file);
  const numTables = b.readUInt16BE(4);
  let cmapOff = 0;
  for (let i = 0; i < numTables; i++) {
    const p = 12 + i * 16;
    if (b.toString("ascii", p, p + 4) === "cmap") { cmapOff = b.readUInt32BE(p + 8); break; }
  }
  if (!cmapOff) throw new Error(`${file} has no cmap table`);
  const n = b.readUInt16BE(cmapOff + 2);
  const out = new Set();
  for (let i = 0; i < n; i++) {
    const rec = cmapOff + 4 + i * 8;
    const sub = cmapOff + b.readUInt32BE(rec + 4);
    const format = b.readUInt16BE(sub);
    if (format === 4) {
      const segX2 = b.readUInt16BE(sub + 6), seg = segX2 / 2;
      const ends = sub + 14, starts = ends + segX2 + 2;
      for (let s = 0; s < seg; s++) {
        const end = b.readUInt16BE(ends + s * 2), start = b.readUInt16BE(starts + s * 2);
        if (start === 0xFFFF) continue;
        for (let c = start; c <= end && c !== 0xFFFF; c++) out.add(c);
      }
    } else if (format === 12) {
      const groups = b.readUInt32BE(sub + 12);
      for (let g = 0; g < groups; g++) {
        const p = sub + 16 + g * 12;
        const start = b.readUInt32BE(p), end = b.readUInt32BE(p + 4);
        for (let c = start; c <= end; c++) out.add(c);
      }
    }
  }
  return out;
}

/* Every text font the app bundles. The icon font is not one of them: nothing
 * types an icon codepoint as a character, it is asked for by name. */
const fonts = fs.readdirSync(path.join(root, "assets/fonts"))
  .filter(f => f.endsWith(".ttf") && f !== "ionicons.ttf");
const drawable = new Set();
for (const f of fonts) for (const c of codepoints(path.join(root, "assets/fonts", f))) drawable.add(c);

/* Scripts drawn by the system rather than by a bundled font — see the header
 * and check-arabic.mjs. A phone that can show Urdu at all can show these. */
const SYSTEM_DRAWN = cp =>
  (cp >= 0x0900 && cp <= 0x0DFF) ||    // Devanagari through Sinhala, Gujarati among them
  (cp >= 0x4E00 && cp <= 0x9FFF);      // CJK, if a translation ever brings any

const files = [];
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { if (e.name !== "data" && e.name !== "i18n") walk(p); }
    else if (/\.(js|jsx)$/.test(e.name)) files.push(p);
  }
})(path.join(root, "src"));

/* Comments first. A header explaining that something used to be a "↗" is not
 * the app drawing one, and a check that cannot tell the difference is a check
 * that punishes you for writing down what went wrong. */
const strip = s => s.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/^\s*\/\/.*$/gm, " ");

/* EVERY character of what is left, not only the ones inside quotes.
 *
 * The first version of this file looked at string and template literals, ran
 * green against the very arrow it was written for, and would have shipped it
 * again. The arrow is not in a string: it is JSX text — `<Text>↗</Text>` —
 * and so is most of the prose a screen actually renders. Anything outside a
 * comment that is not ASCII is either drawn or is about to be. */
const bad = new Map();

for (const file of files) {
  const src = strip(fs.readFileSync(file, "utf8"));
  for (const ch of src) {
    const cp = ch.codePointAt(0);
    if (cp < 0x80 || drawable.has(cp) || SYSTEM_DRAWN(cp)) continue;
    const where = path.relative(root, file);
    if (!bad.has(cp)) bad.set(cp, { ch, files: new Set() });
    bad.get(cp).files.add(where);
  }
}

if (bad.size) {
  console.error(`\n${bad.size} character(s) the app writes that NO bundled font can draw:\n`);
  for (const [cp, { ch, files: fl }] of [...bad].sort((a, b) => a[0] - b[0])) {
    console.error(`  U+${cp.toString(16).toUpperCase().padStart(4, "0")}  ${ch}   ${[...fl].join(", ")}`);
  }
  console.error(
    "\niOS draws a character no named font has by falling through to Apple Color\n" +
    "Emoji — a blue rounded square that ignores the colour it was given. Use an\n" +
    "Ionicon instead (see ExtArrow in src/ui.jsx), or a character the fonts have.\n");
  process.exit(1);
}

console.log(`every character the app's source draws is in one of its ${fonts.length} bundled fonts`);
