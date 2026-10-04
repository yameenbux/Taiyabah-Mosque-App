/**
 * The masjid's wordmark, as a bitmap the app can bundle.
 *
 * logo.svg is the authoritative artwork — two colours, outlines, 30KB — but
 * react-native-svg cannot load an .svg file without a bundler transform, and
 * adding one for a single image is not worth the build risk. So it is rendered
 * here at 3× on a transparent background, which is sharper than any size the
 * top bar will ever show it at.
 *
 *   node scripts/build-logo.mjs
 */
import pw from "/opt/node22/lib/node_modules/playwright/index.js";
import fs from "node:fs"; import path from "node:path";
const ROOT = path.resolve(import.meta.dirname, "../..");
const SRC = path.join(ROOT, "logo.svg");
const OUT = path.resolve(import.meta.dirname, "../assets/logo.png");

const svg = fs.readFileSync(SRC, "utf8");
const m = svg.match(/viewBox="0 0 (\d+) (\d+)"/);
const [w, h] = [Number(m[1]), Number(m[2])];
const SCALE = 3, WIDTH = 420;                 // 140pt wide in the bar, at 3×

const browser = await pw.chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const page = await browser.newPage({ viewport: { width: WIDTH, height: Math.round(WIDTH * h / w) } });
await page.setContent(
  `<style>html,body{margin:0;background:transparent}svg{display:block;width:${WIDTH}px;height:auto}</style>${svg}`);
await page.locator("svg").screenshot({ path: OUT, omitBackground: true });
await browser.close();
console.log(`wrote assets/logo.png — ${WIDTH}px wide, ${(fs.statSync(OUT).size / 1024).toFixed(0)}KB`);
