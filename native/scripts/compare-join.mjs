#!/usr/bin/env node
/**
 * Puts each web/native pair side by side in one image.
 *
 * compare-all.mjs writes the two halves; this joins them. It uses the browser
 * that is already here rather than ImageMagick, which is on the CI runner but
 * not on this machine — and a comparison you have to flick between two files to
 * see is a comparison nobody makes.
 *
 *   node scripts/compare-join.mjs [dir]
 */
import pw from "/opt/node22/lib/node_modules/playwright/index.js";
import fs from "node:fs"; import path from "node:path";

const DIR = process.argv[2] || process.env.CMP_DIR || path.resolve(import.meta.dirname, "../../.compare");
const names = [...new Set(fs.readdirSync(DIR)
  .filter(f => /-(web|native)\.png$/.test(f))
  .map(f => f.replace(/-(web|native)\.png$/, "")))].sort();

const browser = await pw.chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
for (const name of names) {
  const web = path.join(DIR, `${name}-web.png`), nat = path.join(DIR, `${name}-native.png`);
  if (!fs.existsSync(web) || !fs.existsSync(nat)) { console.log(`  skip ${name} (only one half)`); continue; }
  const b64 = f => "data:image/png;base64," + fs.readFileSync(f).toString("base64");
  const page = await browser.newPage({ viewport: { width: 1000, height: 800 } });
  await page.setContent(`<!doctype html><meta charset="utf-8">
    <style>
      body{margin:0;background:#2b2b2b;font:600 13px/1.4 system-ui,sans-serif;color:#eee}
      .row{display:flex;gap:10px;padding:10px}
      .col{flex:1;min-width:0}
      .lab{padding:6px 2px;letter-spacing:.08em;text-transform:uppercase;font-size:11px}
      .w .lab{color:#8fd19e} .n .lab{color:#f0c36d}
      img{width:100%;display:block;border-radius:4px}
    </style>
    <div class="row">
      <div class="col w"><div class="lab">web app — ${name}</div><img src="${b64(web)}"></div>
      <div class="col n"><div class="lab">native app — ${name}</div><img src="${b64(nat)}"></div>
    </div>`);
  await page.waitForTimeout(250);
  await page.screenshot({ path: path.join(DIR, `SIDE-${name}.png`), fullPage: true });
  await page.close();
  process.stdout.write(`  SIDE-${name}.png\n`);
}
await browser.close();
console.log(`${names.length} pairs joined in ${DIR}`);
