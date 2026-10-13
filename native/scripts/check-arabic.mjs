/**
 * Taiyabah Masjid — every Arabic letter the app ships has a glyph to draw it.
 * Copyright (c) 2026 Yameen Bux. All rights reserved. See LICENSE.md.
 *
 * check-icons.mjs does this for the icon font, and it exists because a missing
 * glyph does not fail a build — it draws an empty box on somebody's screen. The
 * same hole was open on the other side of the app, and something fell through
 * it: the IndoPak muṣḥaf uses Arabic Extended-A as well as the main Arabic
 * block — the waqf signs, sajda and rukūʿ marks, the sakta, the disputed
 * end-of-āyah mark, U+08D4 to U+08E2 — and Amiri has a glyph for none of them.
 * 1,031 of the 6,236 āyāt carry at least one, so roughly one verse in six had a
 * box sitting in the middle of it, and Āyat al-Kursī had one in both the
 * Qurʼan and the morning adhkār.
 *
 * A box in the middle of scripture does not read as a font being short of a
 * glyph. It reads as the text being wrong.
 *
 * So: for every Arabic character in everything the app bundles, is there a
 * bundled font that can draw it? And is it in a file drawn by a font that can?
 * The second question is the one that matters. Noto Naskh Arabic covers the
 * Qurʼanic marks and Amiri does not, so a mark is only safe if it appears in a
 * file whose screen asks for F.quranic. QURANIC below is that list, and adding
 * a mark anywhere else stops the build with the name of the file it is in.
 *
 * Urdu and Gujarati are not checked. Neither script is in any bundled font —
 * both are drawn by the system, which has them on every phone the app supports
 * and which this cannot inspect.
 *
 *   node scripts/check-arabic.mjs
 */
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");

/* Which font draws which data. The screens are named so that a failure points
 * at the code to change, not just at the file that tripped it. */
const QURANIC = [
  ["src/data/quran-text.json", "Quran.jsx — Surah"],
  ["src/data/quran/", "Quran.jsx — Surah"],
  ["src/data/quran-index.json", "Quran.jsx — Surahs"],
  ["src/data/athkar.json", "Reader.jsx — AthkarSet"],
  ["src/data/duas.json", "Reader.jsx — Duas"],
  ["src/data/rabbanas.json", "Reader.jsx — Rabbanas"],
  ["src/data/bukhari.json", "Bukhari.jsx"],
];

/* ---- the smallest TTF reader that answers "which characters are in here" ----
 * Lifted from check-icons.mjs rather than shared, for the reason given there:
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

const AMIRI = codepoints(path.join(root, "assets/fonts/Amiri.ttf"));
const NOTO = codepoints(path.join(root, "assets/fonts/NotoNaskhArabic.ttf"));

/* The Arabic script, wherever Unicode has put it. */
const isArabic = cp =>
  (cp >= 0x0600 && cp <= 0x06FF) || (cp >= 0x0750 && cp <= 0x077F) ||
  (cp >= 0x0870 && cp <= 0x08FF) || (cp >= 0xFB50 && cp <= 0xFDFF) ||
  (cp >= 0xFE70 && cp <= 0xFEFF);

const files = [];
const walk = d => {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.name.endsWith(".json")) files.push(p);
  }
};
walk(path.join(root, "src/data"));
walk(path.join(root, "src/i18n"));

const strings = (o, f) => {
  if (typeof o === "string") f(o);
  else if (Array.isArray(o)) o.forEach(x => strings(x, f));
  else if (o && typeof o === "object") Object.values(o).forEach(x => strings(x, f));
};

const nowhere = new Map();   /* no bundled font has it at all */
const wrongFont = new Map(); /* only Noto has it, and Amiri draws this file */
const note = (into, cp, rel, sample) => {
  const key = cp;
  if (!into.has(key)) into.set(key, { count: 0, files: new Set(), sample });
  const m = into.get(key);
  m.count++; m.files.add(rel);
};

let checked = 0;
for (const file of files) {
  const rel = path.relative(root, file).replace(/\\/g, "/");
  const quranic = QURANIC.find(([p]) => rel === p || rel.startsWith(p));
  let doc;
  try { doc = JSON.parse(fs.readFileSync(file, "utf8")); } catch { continue; }
  strings(doc, s => {
    for (const ch of s) {
      const cp = ch.codePointAt(0);
      if (!isArabic(cp)) continue;
      checked++;
      if (AMIRI.has(cp)) continue;
      if (!NOTO.has(cp)) { note(nowhere, cp, rel, s.slice(0, 60)); continue; }
      if (!quranic) note(wrongFont, cp, rel, s.slice(0, 60));
    }
  });
}

const u = cp => `U+${cp.toString(16).toUpperCase().padStart(4, "0")}`;
const say = (m, what) => {
  for (const [cp, v] of [...m.entries()].sort((a, b) => b[1].count - a[1].count))
    console.log(`FAIL  ${u(cp)} ${what} — ${v.count}x in ${[...v.files].slice(0, 4).join(", ")}` +
                `${v.files.size > 4 ? ` +${v.files.size - 4} more` : ""}\n      e.g. ${v.sample}`);
};

say(nowhere, "is in no bundled font and will draw as an empty box");
say(wrongFont, "needs the Qurʼanic face, and this file is drawn in Amiri");

if (nowhere.size || wrongFont.size) {
  if (nowhere.size)
    console.log(`\nNo font the app ships can draw ${nowhere.size} of the characters in its own data.`);
  if (wrongFont.size)
    console.log(`\n${wrongFont.size} character(s) only Noto Naskh Arabic has appear in a file Amiri draws.` +
                `\nEither set that screen's fontFamily to F.quranic and add the file to QURANIC at the` +
                `\ntop of this script, or take the character out of the data.`);
  process.exit(1);
}

console.log(`all ${checked.toLocaleString("en-GB")} Arabic characters the app bundles have a glyph in the font that draws them`);
