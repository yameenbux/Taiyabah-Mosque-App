/**
 * Taiyabah Masjid — every icon the app draws is in the font it ships.
 * Copyright (c) 2026 Yameen Bux. All rights reserved. See LICENSE.md.
 *
 * assets/fonts/ionicons.ttf is a SUBSET: 432KB of Ionicons cut to the 48
 * glyphs this app actually draws, which is 16KB. That is a good trade and a
 * dangerous one, because a glyph left out does not fail the build — it draws
 * an empty box on somebody's screen, and only on the one screen that uses it.
 *
 * So this reads the shipped font's own character map and checks it against
 * every icon name the source can reach. Add an icon, forget to regenerate the
 * font, and the build stops here instead of shipping a blank square.
 *
 * It parses the TTF directly rather than shelling out to fontTools, because
 * this has to run wherever the build runs and a Python dependency in CI is a
 * thing that breaks on a Tuesday.
 *
 * TO REGENERATE after adding an icon:
 *   pip install fonttools
 *   node scripts/icon-names.mjs --json      # the names
 *   pyftsubset tools/ionicons-full.ttf \
 *     --output-file=assets/fonts/ionicons.ttf \
 *     --unicodes="<U+XXXX,...>" --no-hinting --desubroutinize
 *
 *   node scripts/check-icons.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const root = path.resolve(import.meta.dirname, "..");
const FONT = path.join(root, "assets/fonts/ionicons.ttf");
const MAP = path.join(root, "node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/glyphmaps/Ionicons.json");

/* ---- the smallest TTF reader that answers "which characters are in here" ---- */
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

const glyphMap = JSON.parse(fs.readFileSync(MAP, "utf8"));
const wanted = JSON.parse(execFileSync("node", [path.join(root, "scripts/icon-names.mjs"), "--json"], { encoding: "utf8" }));

/* Names the app passes to <Ionicons> that Ionicons has never heard of are the
 * app's OWN hand-drawn glyphs, which travel as SVG and not in this font. */
const ionicons = wanted.filter(n => n in glyphMap);
const have = codepoints(FONT);
const missing = ionicons.filter(n => !have.has(glyphMap[n]));

const kb = Math.round(fs.statSync(FONT).size / 1024);
for (const n of missing)
  console.log(`FAIL  "${n}" (U+${glyphMap[n].toString(16).toUpperCase()}) is drawn by the app but is not in the shipped font`);
if (missing.length) {
  console.log(`\n${missing.length} icon(s) would draw as an empty box. Regenerate the subset — see the header of this file.`);
  process.exit(1);
}
console.log(`all ${ionicons.length} Ionicons glyphs the app draws are in the ${kb}KB subset`);
