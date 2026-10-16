/**
 * Taiyabah Masjid — a panel that says a form is shut is only drawn when it is.
 * Copyright (c) 2026 Yameen Bux. All rights reserved. See LICENSE.md.
 *
 * The website keeps each form's closed state in a `hidden` div whose id ends
 * -closed, and reveals it when the server says that form is shut. The
 * extractor lifts those panels out like any other block, which is deliberate:
 * the sheet is where the app gets the closed state's own words, so the app
 * and the site read identically when a form really is closed.
 *
 * The price of that is a filter. A panel in the sheet is drawn on EVERY
 * render unless the screen takes it out while the form is open, and a screen
 * that forgets shows a live form underneath a banner saying it is not open.
 *
 * Which is what shipped. Advice.jsx filtered its panel and Collect.jsx did
 * not, so Charity Collections drew "Requests are taken by phone for now. This
 * form is not open yet." above a form that was submitting to the admin
 * portal. Nothing failed; it just quietly contradicted itself.
 *
 * So: every closed-panel string that reaches a sheet must be named by a
 * CLOSED_NOTICE in the screen that draws that sheet. Naming it is not proof
 * that the filter is right, but it is proof that somebody wired one, and the
 * screen cannot forget the panel exists.
 */
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const site = fs.readFileSync(path.join(root, "..", "index.html"), "utf8");
const sheets = JSON.parse(fs.readFileSync(path.join(root, "src/data/sheets.json"), "utf8"));
const screensDir = path.join(root, "src/screens");
const screens = Object.fromEntries(fs.readdirSync(screensDir)
  .filter(f => f.endsWith(".jsx"))
  .map(f => [f, fs.readFileSync(path.join(screensDir, f), "utf8")]));

const fail = [];

/* Every hidden #*-closed panel on the website, and the i18n keys inside it. */
const panels = [];
for (const m of site.matchAll(/<div\s+id="([\w-]*-closed)"[^>]*\bhidden\b[^>]*>([\s\S]*?)<\/div>\s*<\/div>/g)) {
  const keys = [...m[2].matchAll(/data-i18n="([^"]+)"/g)].map(k => k[1]);
  if (keys.length) panels.push({ id: m[1], keys });
}
if (!panels.length)
  fail.push("no hidden #*-closed panels found in index.html — has the markup changed shape?");

for (const { id, keys } of panels) {
  /* Which sheet, if any, carries this panel's words. */
  for (const [name, sheet] of Object.entries(sheets)) {
    const blob = JSON.stringify(sheet);
    const landed = keys.filter(k => blob.includes(`"${k}"`));
    if (!landed.length) continue;

    const named = Object.entries(screens).filter(([, src]) =>
      landed.some(k => new RegExp(`CLOSED_NOTICE\\s*=\\s*"${k.replace(/\./g, "\\.")}"`).test(src)));

    if (!named.length)
      fail.push(
        `#${id} reached the "${name}" sheet (${landed[0]}) but no screen names it as a CLOSED_NOTICE. ` +
        `<Blocks> will draw it on every render, so the form underneath will sit below a banner ` +
        `saying it is not open.`);
  }
}

if (fail.length) {
  console.error(`\n${fail.length} closed-state problem(s):\n`);
  for (const m of fail) console.error("  " + m);
  console.error("");
  process.exit(1);
}
console.log(`all ${panels.length} of the website's closed-state panels are filtered by the screen that draws them`);
