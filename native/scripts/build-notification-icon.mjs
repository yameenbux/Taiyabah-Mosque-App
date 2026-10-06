/* The small icon Android puts in the status bar.
 *
 * Android does not draw this icon, it draws its SHAPE: everything opaque is
 * filled with the system's own colour and everything else is dropped. So a
 * colour logo handed over here arrives as a solid white square, which is what
 * every app that skips this step ships. It has to be authored as a silhouette
 * on transparency, which is what this makes — the masjid's mark, white, with
 * the safe padding Android expects so nothing is clipped by the circle.
 */
import fs from "node:fs";
import path from "node:path";
import pw from "/opt/node22/lib/node_modules/playwright/index.js";

const root = path.resolve(import.meta.dirname, "..");
const svg = fs.readFileSync(path.resolve(root, "..", "logo.svg"), "utf8");

/* 96px is Android's xxhdpi size for a status bar icon; the glyph sits in the
 * middle 75% because the system may mask it to a circle. */
const PAGE = `<!doctype html><meta charset="utf-8">
<style>
  html,body{margin:0;width:96px;height:96px;background:transparent}
  .wrap{width:96px;height:96px;display:flex;align-items:center;justify-content:center}
  .glyph{width:72px;height:72px;display:flex;align-items:center;justify-content:center}
  /* Everything opaque becomes the system's colour, so flatten to pure white. */
  .glyph svg,.glyph svg *{fill:#fff !important;stroke:#fff !important;opacity:1 !important}
</style>
<div class="wrap"><div class="glyph">${svg}</div></div>`;

const browser = await pw.chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const page = await browser.newPage({ viewport: { width: 96, height: 96 },
                                     deviceScaleFactor: 1 });
await page.setContent(PAGE, { waitUntil: "load" });
const out = path.join(root, "assets/notification-icon.png");
await page.screenshot({ path: out, omitBackground: true });
await browser.close();

const { size } = fs.statSync(out);
if (size < 200) { console.error("the icon came out empty — logo.svg may not have rendered"); process.exit(1); }
console.log(`notification-icon.png written — 96×96, ${(size / 1024).toFixed(1)}KB, white on transparent`);
