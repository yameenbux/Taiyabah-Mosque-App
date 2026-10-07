/**
 * Taiyabah Masjid — the icon subset has to contain the icons.
 * Copyright (c) 2026 Yameen Bux. All rights reserved. See LICENSE.md.
 *
 * The app ships Ionicons cut from 442KB to 33KB. A glyph left out of that cut
 * does not fail a build and does not throw on a phone — it draws nothing, in
 * one place, and only the person holding the phone finds out.
 *
 * It happened. The tab bar shipped four blank spaces past three green CI runs,
 * because the thing that lists the glyphs and the thing that checks the font
 * both read from the same list: the check agreed with the bug.
 *
 * So these tests do not ask the extractor what it found. They name icons that
 * are definitely drawn — read off the source by hand — and insist the shipped
 * font can draw them. Each one is a bug that reached a real device.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "../..");
const glyphMap = JSON.parse(fs.readFileSync(
  path.join(root, "node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/glyphmaps/Ionicons.json"), "utf8"));

/** Which codepoints the shipped font can actually draw, from its own cmap. */
function shipped() {
  const b = fs.readFileSync(path.join(root, "assets/fonts/ionicons.ttf"));
  const n = b.readUInt16BE(4);
  let cmap = 0;
  for (let i = 0; i < n; i++) {
    const p = 12 + i * 16;
    if (b.toString("ascii", p, p + 4) === "cmap") { cmap = b.readUInt32BE(p + 8); break; }
  }
  assert.ok(cmap, "the shipped font has no cmap table");
  const out = new Set();
  const tables = b.readUInt16BE(cmap + 2);
  for (let i = 0; i < tables; i++) {
    const sub = cmap + b.readUInt32BE(cmap + 4 + i * 8 + 4);
    const format = b.readUInt16BE(sub);
    if (format === 4) {
      const segX2 = b.readUInt16BE(sub + 6);
      const ends = sub + 14, starts = ends + segX2 + 2;
      for (let s = 0; s < segX2 / 2; s++) {
        const end = b.readUInt16BE(ends + s * 2), start = b.readUInt16BE(starts + s * 2);
        if (start === 0xFFFF) continue;
        for (let c = start; c <= end && c !== 0xFFFF; c++) out.add(c);
      }
    } else if (format === 12) {
      const groups = b.readUInt32BE(sub + 12);
      for (let g = 0; g < groups; g++) {
        const p = sub + 16 + g * 12;
        for (let c = b.readUInt32BE(p); c <= b.readUInt32BE(p + 4); c++) out.add(c);
      }
    }
  }
  return out;
}

const have = shipped();
const canDraw = name => {
  assert.ok(name in glyphMap, `"${name}" is not an Ionicons name at all — fix the test`);
  return have.has(glyphMap[name]);
};

/* App.jsx builds each tab's icon as `focused ? name : `${name}-outline``, so
   every tab needs BOTH forms: the filled one for the tab you are on and the
   outline for the three you are not. All eight were missing. */
test("the tab bar can draw all four icons, selected and not", () => {
  for (const base of ["home", "time", "document-text", "ellipsis-horizontal"]) {
    assert.ok(canDraw(base), `tab bar "${base}" (selected) is not in the shipped font`);
    assert.ok(canDraw(`${base}-outline`), `tab bar "${base}-outline" (unselected) is not in the shipped font`);
  }
});

/* Blocks.jsx picks these by looking at the link itself. */
test("a link row can draw the icon its href earns", () => {
  for (const n of ["logo-youtube", "mail-outline", "globe-outline", "call-outline", "open-outline"])
    assert.ok(canDraw(n), `"${n}" is chosen by Blocks.jsx for a link but is not in the shipped font`);
});

/* ui.jsx appends "-outline" to whatever sheets.json named, so the data file's
   bare names are never what gets drawn. */
test("every row icon named in sheets.json can be drawn in the form ui.jsx asks for", () => {
  const sheets = fs.readFileSync(path.join(root, "src/data/sheets.json"), "utf8");
  const named = [...new Set([...sheets.matchAll(/"icon"\s*:\s*"([a-z][a-z0-9-]*)"/g)].map(m => m[1]))];
  assert.ok(named.length, "sheets.json named no icons — has the shape changed?");
  for (const n of named)
    assert.ok(canDraw(`${n}-outline`), `sheets.json names "${n}", so ui.jsx draws "${n}-outline", which is not in the shipped font`);
});

/* Icons written straight onto one of our own components as a plain attribute.
   The old extractor read `icon:` object keys and never `icon="..."`. */
test("icons written as a plain JSX attribute are in the font", () => {
  for (const n of ["trash-outline", "bookmark-outline", "calendar-outline",
                   "notifications-outline", "cloud-offline-outline"])
    assert.ok(canDraw(n), `icon="${n}" is written in a screen but is not in the shipped font`);
});

/* The subset is only worth its risk if it stays small. */
test("the subset is still a subset", () => {
  const kb = fs.statSync(path.join(root, "assets/fonts/ionicons.ttf")).size / 1024;
  assert.ok(kb < 120, `the icon font is ${Math.round(kb)}KB — the subset has stopped being one`);
});

/* And the extractor must still agree, so `npm run check` keeps its teeth. */
test("the extractor finds everything the font ships for", () => {
  const found = new Set(JSON.parse(execFileSync("node",
    [path.join(root, "scripts/icon-names.mjs"), "--json"], { encoding: "utf8" })));
  for (const base of ["home", "time", "document-text", "ellipsis-horizontal"])
    assert.ok(found.has(`${base}-outline`), `the extractor still cannot see "${base}-outline"`);
});
