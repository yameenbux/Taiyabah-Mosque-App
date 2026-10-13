/**
 * Taiyabah Masjid — every font the app asks for is one iOS can find.
 * Copyright (c) 2026 Yameen Bux. All rights reserved. See LICENSE.md.
 *
 * The two platforms find a bundled font in completely different ways, and only
 * one of them looks at the file name.
 *
 *   Android  expo-font copies the file to assets/fonts/<name>.ttf and React
 *            Native resolves fontFamily:"X" to assets/fonts/X.ttf. The file
 *            name IS the family, so anything that is bundled works.
 *
 *   iOS      expo-font only lists the file in UIAppFonts. iOS registers it
 *            under the names inside the FONT, and RCTFont.mm tries the family
 *            name, then UIFont fontWithName: (PostScript or full name), and if
 *            neither answers it logs "Unrecognized font family" and draws in
 *            the system font.
 *
 * So a font can be bundled, loaded, listed and still not be used — on one
 * platform only, with no error anybody sees. That is not hypothetical: Hanken
 * Grotesk calls itself "Hanken Grotesk" and the app asks for
 * "HankenGroteskSemiBold", so every word of sans text in this app was drawn on
 * iPhone in San Francisco, in all four weights, for as long as the fonts have
 * been bundled by the plugin. It looks like a typeface, so it reads as a
 * design choice rather than as a fault.
 *
 * This asserts the three things that have to line up:
 *
 *   1. every family theme.js asks for has a file in assets/fonts/
 *   2. every one of those files is listed in app.json, or it is not in the build
 *   3. every one of those files answers to its own file name, or iOS cannot
 *      find it — scripts/name-fonts.py is what fixes that
 *
 *   node scripts/check-fonts.mjs
 */
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const FONTS = path.join(root, "assets/fonts");

/* ---- the names a TTF calls itself ----------------------------------------
 * Parsed here rather than with fontTools for the reason check-icons.mjs gives:
 * this runs wherever the build runs, and a Python dependency in CI is a thing
 * that breaks on a Tuesday. */
function fontNames(file) {
  const b = fs.readFileSync(file);
  const numTables = b.readUInt16BE(4);
  let off = 0;
  for (let i = 0; i < numTables; i++) {
    const p = 12 + i * 16;
    if (b.toString("ascii", p, p + 4) === "name") { off = b.readUInt32BE(p + 8); break; }
  }
  if (!off) throw new Error(`${file} has no name table`);
  const count = b.readUInt16BE(off + 2);
  const strings = off + b.readUInt16BE(off + 4);
  const out = new Map();
  for (let i = 0; i < count; i++) {
    const r = off + 6 + i * 12;
    const platform = b.readUInt16BE(r), nameID = b.readUInt16BE(r + 6);
    const len = b.readUInt16BE(r + 8), o = b.readUInt16BE(r + 10);
    const raw = b.subarray(strings + o, strings + o + len);
    /* platform 1 is one byte per character; platform 0 and 3 are UTF-16BE */
    const s = platform === 1 ? raw.toString("latin1") : Buffer.from(raw).swap16().toString("utf16le");
    if (!out.has(nameID)) out.set(nameID, s);
  }
  return { family: out.get(1), full: out.get(4), postscript: out.get(6), typographic: out.get(16) };
}

const problems = [];

/* ---- 1. what the app asks for -------------------------------------------- */
const theme = fs.readFileSync(path.join(root, "src/theme.js"), "utf8");
const block = theme.slice(theme.indexOf("export const F = {"));
const asked = [...block.slice(0, block.indexOf("\n};")).matchAll(/^\s*\w+:\s*"([^"]+)"/gm)].map(m => m[1]);
if (asked.length < 5) problems.push(`could not read the font families out of theme.js (found ${asked.length})`);

/* @expo/vector-icons asks for this one itself; it is bundled so that it is
   registered at all, which is why it is not in theme.js. */
const want = [...new Set([...asked, "Ionicons"])];

/* ---- 2. what the build carries ------------------------------------------- */
const appJson = JSON.parse(fs.readFileSync(path.join(root, "app.json"), "utf8"));
const listed = new Set(
  (appJson.expo?.plugins || [])
    .filter(p => Array.isArray(p) && p[0] === "expo-font")
    .flatMap(p => p[1]?.fonts || [])
    .map(f => path.basename(f)));
if (!listed.size) problems.push("app.json lists no fonts under the expo-font plugin");

const onDisk = fs.readdirSync(FONTS).filter(f => f.endsWith(".ttf") || f.endsWith(".otf"));
for (const f of onDisk)
  if (!listed.has(f))
    problems.push(`assets/fonts/${f} is in the repository but not listed in app.json — it will not be in the build`);
for (const f of listed)
  if (!onDisk.includes(f))
    problems.push(`app.json lists ${f}, which is not in assets/fonts/`);

/* ---- 3. does iOS stand a chance of finding it? ---------------------------- */
const resolved = [];
for (const family of want) {
  const file = onDisk.find(f => path.basename(f, path.extname(f)).toLowerCase() === family.toLowerCase());
  if (!file) {
    problems.push(`theme.js asks for "${family}" and there is no assets/fonts/${family}.ttf`);
    continue;
  }
  const n = fontNames(path.join(FONTS, file));
  /* RCTFont: family name first, then UIFont fontWithName: — which takes the
     PostScript name or the full name. Nothing else is tried. */
  if (n.family === family || n.postscript === family || n.full === family) { resolved.push(family); continue; }
  problems.push(
    `"${family}" would draw in the SYSTEM FONT on iOS — ${file} calls itself ` +
    `family=${JSON.stringify(n.family)}, postscript=${JSON.stringify(n.postscript)}. ` +
    `Run: python3 scripts/name-fonts.py --write`);
  /* A typographic family left in place is how four weights collapse back into
     one, so say so rather than let the next person wonder. */
  if (n.typographic)
    problems.push(`  …and ${file} still declares a typographic family ${JSON.stringify(n.typographic)}`);
}

for (const p of problems) console.log(`FAIL  ${p}`);
if (problems.length) {
  console.log(`\n${problems.length} problem(s). A font that iOS cannot find does not fail — it draws in` +
              `\nSan Francisco and looks like somebody's choice, which is how this hid for months.`);
  process.exit(1);
}
console.log(`all ${resolved.length} font families the app asks for are bundled and answer to their own name`);
