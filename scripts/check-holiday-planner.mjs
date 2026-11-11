#!/usr/bin/env node
/**
 * Taiyabah Masjid — the downloaded planner cannot outlive the data it shows.
 * Copyright (c) 2026 Yameen Bux. All rights reserved. See LICENSE.md.
 *
 * planner/ holds a PDF and two images, committed, served by the website and
 * linked from both apps. They are a SNAPSHOT. Nothing about editing
 * native/src/madrasah-data.js rebuilds them, and nothing about looking at the
 * repository reveals that they are out of date — the screen quietly starts
 * saying one thing while the sheet a parent printed in September says another.
 *
 * That is the whole failure this guards against. The builder stamps a
 * fingerprint of the data into planner/planner.json; this recomputes it and
 * fails, naming what moved:
 *
 *     CHANGED  closure  ramadan  (Ramadhan Holidays)
 *     ADDED    event    mawlid-1449 — not on the printed sheet
 *
 *   node scripts/build-holiday-planner.mjs     # the fix is always a rebuild
 *
 * WHAT IT CANNOT SEE. Whether the dates are RIGHT — only whether the sheet
 * and the app agree about them. mawlid being dated before the year opens is
 * a question for the madrasah; this check would pass it happily, because the
 * screen and the sheet are both wrong in the same way.
 */
import fs from "node:fs";
import path from "node:path";
import { madrasahData, parts, labelOf } from "./lib/holiday-fingerprint.mjs";

const root = path.resolve(import.meta.dirname, "..");
const OUT = path.join(root, "planner");
const SIDECAR = path.join(OUT, "planner.json");

if (!fs.existsSync(SIDECAR)) {
  console.error("planner/planner.json is missing — the holiday planner has never been built.\n" +
                "  node scripts/build-holiday-planner.mjs");
  process.exit(1);
}

const rec = JSON.parse(fs.readFileSync(SIDECAR, "utf8"));
const data = await madrasahData();
const now = parts(data);
const was = rec.built_from || {};

const bad = [];
if (was.year !== now.year) bad.push(["CHANGED", "year", "", `${data.MAD_YEAR.from} → ${data.MAD_YEAR.to}`]);
for (const kind of ["closures", "events"]) {
  const a = was[kind] || {}, b = now[kind] || {};
  for (const id of Object.keys(b)) {
    if (!(id in a)) bad.push(["ADDED", kind.slice(0, -1), id, labelOf(data, kind, id) + " — not on the printed sheet"]);
    else if (a[id] !== b[id]) bad.push(["CHANGED", kind.slice(0, -1), id, labelOf(data, kind, id)]);
  }
  for (const id of Object.keys(a)) if (!(id in b)) bad.push(["REMOVED", kind.slice(0, -1), id, "still on the printed sheet"]);
}

/* A sidecar that matches the data is worth nothing if the files it describes
   are not actually there — a stale .gitignore or a half-finished commit. */
const missing = (rec.files || []).filter(f => !fs.existsSync(path.join(OUT, f)));

/* THE FILENAME CARRIES THE YEAR, so every link to it is a hostage to the next
   madrasah year. The app hard-codes it in a const and the website in an href;
   when MAD_YEAR rolls over the builder writes a new filename and both links
   quietly start pointing at a file that is no longer there. A 404 behind a
   button labelled "Download the holiday planner" is the kind of fault nobody
   reports and everybody hits, so the links are checked against what was built
   rather than trusted. */
const pdf = (rec.files || []).find(f => f.endsWith(".pdf")) || "";
const linkers = [
  ["native/src/screens/Holidays.jsx", "the app's PLANNER const"],
  ["index.html", "the website's download link"],
];
for (const [file, what] of linkers) {
  const src = fs.readFileSync(path.join(root, file), "utf8");
  const hrefs = [...src.matchAll(/planner\/([A-Za-z0-9._-]+\.pdf)/g)].map(m => m[1]);
  if (!hrefs.length) bad.push(["NO LINK", "link", file, `${what} does not point at planner/`]);
  else for (const h of new Set(hrefs))
    if (h !== pdf) bad.push(["STALE", "link", file, `${what} names ${h}, but the sheet built is ${pdf}`]);
}

if (bad.length || missing.length) {
  console.error(`\nThe holiday planner in planner/ no longer matches native/src/madrasah-data.js ` +
                `(built ${rec.issued || "?"}):\n`);
  for (const [what, kind, id, label] of bad)
    console.error(`  ${what.padEnd(8)} ${kind.padEnd(8)} ${String(id).padEnd(12)} ${label ? "(" + label + ")" : ""}`);
  for (const f of missing) console.error(`  MISSING  file     ${f}`);
  console.error(`\n  ${bad.length + missing.length} difference(s). Rebuild the sheet so the download says what\n` +
                `  the screen says, and commit it in the same change:\n` +
                `    node scripts/build-holiday-planner.mjs\n`);
  process.exit(1);
}

console.log(`holiday planner matches the madrasah data — ${Object.keys(now.closures).length} closures, ` +
            `${Object.keys(now.events).length} Islamic dates, issued ${rec.issued}`);
