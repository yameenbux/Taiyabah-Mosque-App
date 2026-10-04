/**
 * The web app and the native app, side by side, on the same instant.
 *
 * Comparing them was confusing while each ran on its own clock: on Monday the
 * web app shows "Monday & Thursday fasting" and on Sunday the native app shows
 * "Optional fasting tomorrow", which looks like a missing banner and is not.
 * So both browsers are pinned to the same moment before the shot is taken, and
 * what is left on screen is a real difference.
 *
 *   node scripts/compare.mjs                     # Monday 5 Oct 2026, 2pm
 *   node scripts/compare.mjs 2026-10-09T17:30    # a Friday, for the Jumuʿah card
 */
import pw from "/opt/node22/lib/node_modules/playwright/index.js";
import http from "node:http"; import fs from "node:fs"; import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "../..");
const DIST = path.resolve(import.meta.dirname, "../dist");
const OUT  = path.join(ROOT, ".shots");
const WHEN = process.argv[2] || "2026-10-05T14:00:00";
fs.mkdirSync(OUT, { recursive: true });

const TYPES = { ".js": "text/javascript", ".html": "text/html", ".ttf": "font/ttf", ".png": "image/png",
                ".json": "application/json", ".svg": "image/svg+xml", ".css": "text/css",
                ".webp": "image/webp", ".webmanifest": "application/manifest+json", ".woff2": "font/woff2" };
const serve = (root, port, spa) => new Promise(res => {
  const s = http.createServer((q, r) => {
    let p = path.join(root, decodeURIComponent(q.url.split("?")[0]));
    if (!fs.existsSync(p)) { if (spa) p = path.join(root, "index.html"); else { r.statusCode = 404; r.end(); return; } }
    if (fs.statSync(p).isDirectory()) p = path.join(p, "index.html");
    r.setHeader("Content-Type", TYPES[path.extname(p)] || "application/octet-stream");
    fs.createReadStream(p).pipe(r);
  });
  s.listen(port, () => res(s));
});

/* Freeze the clock before a single line of either app runs. Both read the time
 * on their first render, so an override applied afterwards would be too late. */
const FREEZE = ts => `(() => {
  const FIXED = ${ts};
  const Real = Date;
  function Fake(...a) { return a.length ? new Real(...a) : new Real(FIXED); }
  Fake.prototype = Real.prototype;
  Fake.now = () => FIXED;
  Fake.parse = Real.parse; Fake.UTC = Real.UTC;
  Object.setPrototypeOf(Fake, Real);
  window.Date = Fake;
})();`;

const ts = new Date(WHEN).getTime();
const webSrv = await serve(ROOT, 4191, false);
const natSrv = await serve(DIST, 4192, true);
const browser = await pw.chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });

const shoot = async (url, file, after) => {
  const page = await browser.newPage({ viewport: { width: 414, height: 2400 }, deviceScaleFactor: 2 });
  await page.addInitScript(FREEZE(ts));
  await page.goto(url, { waitUntil: "networkidle" }).catch(() => {});
  await page.waitForTimeout(3200);
  if (after) await after(page);
  await page.screenshot({ path: path.join(OUT, file) });
  await page.close();
};

await shoot("http://localhost:4191/index.html", "CMP-web-home.png");
await shoot("http://localhost:4192/", "CMP-native-home.png");
await shoot("http://localhost:4191/index.html", "CMP-web-more.png",
  p => p.locator("#nav-more").click({ timeout: 5000 }).then(() => p.waitForTimeout(1200)).catch(() => {}));
await shoot("http://localhost:4192/", "CMP-native-more.png", async p => {
  const all = p.getByText("More", { exact: true });
  for (let i = 0, n = await all.count(); i < n; i++) {
    const el = all.nth(i);
    if (!(await el.isVisible())) continue;
    try { await el.click({ timeout: 2500 }); await p.waitForTimeout(900); return; } catch {}
  }
});

await browser.close(); webSrv.close(); natSrv.close();
console.log(`both apps pinned to ${new Date(ts).toString()}`);
console.log("wrote .shots/CMP-{web,native}-{home,more}.png");
