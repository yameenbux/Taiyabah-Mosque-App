#!/usr/bin/env node
/**
 * Every screen, web app beside native app, on the same instant.
 *
 * compare.mjs did this for the home screen and the menu. This does it for all
 * of them, because "it looks different" is not a thing you can answer one
 * screenshot at a time — and three bugs in a row got through five checkers and
 * were obvious the moment somebody looked at a picture.
 *
 * Both are driven by the SAME visible label. If the app has renamed a row, the
 * native side simply will not be found, and that is a difference worth knowing
 * about on its own.
 *
 *   node scripts/compare-all.mjs                  # Monday 5 Oct 2026, 2pm
 *   node scripts/compare-all.mjs 2026-10-09T17:30 # a Friday
 */
import pw from "/opt/node22/lib/node_modules/playwright/index.js";
import http from "node:http"; import fs from "node:fs"; import path from "node:path";
import { execFileSync } from "node:child_process";

const ROOT = path.resolve(import.meta.dirname, "../..");
const DIST = path.resolve(import.meta.dirname, "../dist");
const OUT  = process.env.CMP_DIR || path.resolve(ROOT, ".compare");
const WHEN = process.argv[2] || "2026-10-05T14:00:00";
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

const TYPES = { ".js":"text/javascript",".html":"text/html",".ttf":"font/ttf",".png":"image/png",
  ".json":"application/json",".svg":"image/svg+xml",".css":"text/css",".webp":"image/webp",
  ".webmanifest":"application/manifest+json",".woff2":"font/woff2",".jpg":"image/jpeg",".jpeg":"image/jpeg" };
const serve = (root, port, spa) => new Promise(res => {
  const s = http.createServer((q, r) => {
    const u = decodeURIComponent(q.url.split("?")[0]);
    let p = u.startsWith("/__fonts/")
      ? path.resolve(import.meta.dirname, "../assets/fonts", path.basename(u))
      : path.join(root, u);
    if (!fs.existsSync(p)) { if (spa) p = path.join(root, "index.html"); else { r.statusCode = 404; r.end(); return; } }
    if (fs.statSync(p).isDirectory()) p = path.join(p, "index.html");
    r.setHeader("Content-Type", TYPES[path.extname(p)] || "application/octet-stream");
    fs.createReadStream(p).pipe(r);
  });
  s.listen(port, () => res(s));
});

const FREEZE = ts => `(() => {
  const FIXED = ${ts}; const Real = Date;
  function Fake(...a) { return a.length ? new Real(...a) : new Real(FIXED); }
  Fake.prototype = Real.prototype; Fake.now = () => FIXED;
  Fake.parse = Real.parse; Fake.UTC = Real.UTC; Object.setPrototypeOf(Fake, Real);
  window.Date = Fake;
})();`;

/* name, the words to tap, and where they live: a home tile or a menu row.
 * The labels are the web app's, which is the point — the native app is meant
 * to use the same ones. */
const SCREENS = [
  ["home",       null,                        null],
  ["quran",      /^Holy Qur.an$/,             "tile"],
  ["athkar",     /^Daily Adhk/,               "tile"],
  ["bukhari",    /al-Bukh/,                   "tile"],
  ["qibla",      /^Qibla$/,                   "tile"],
  ["madrasah",   /^Madrasah$/,                "tile"],
  ["nikah",      /^Nik.*Services$/,           "tile"],
  ["funeral",    /^Funeral Services$/,        "tile"],
  ["hallhire",   /^Hall Booking$/,            "tile"],
  ["collect",    /^Charity Collections$/,     "tile"],
  ["donate",     /^Donate$/,                  "tile"],
  ["giving",     /^Sadaqah & Lillah$/,        "tile"],
  ["timetable",  /^Full prayer timetable$/,   "menu"],
  ["videos",     /^Videos & bayaans$/,        "menu"],
  ["zakat",      /^Zakat calculator$/,        "menu"],
  ["admissions", /^Admissions & Fees$/,       "menu"],
  ["holidays",   /^Holiday Planner$/,         "menu"],
  ["about",      /^About us$/,                "menu"],
  ["membership", /^Membership$/,              "menu"],
  ["contact",    /^Contact us$/,              "menu"],
  ["lifestages", /^Birth, Marriage & Death$/, "menu"],
  ["advice",     /^Imams. Advice$/,           "menu"],
  ["education",  /^Education$/,               "menu"],
  ["alerts",     /^Notifications$/,           "menu"],
  ["prefs",      /^System Preferences$/,      "menu"],
  /* The other three tabs and the live page. On the website all four wear the
     same app bar as Home — the wordmark, the society's name and the bell —
     so they belong in this list as much as any sheet does. */
  ["times",      /^Prayer Times$/,            null],
  ["notices",    /^Notices$/,                 null],
  ["more",       /^More$/,                    null],
  ["live",       /^Listen live$/,             "tile"],
];

const ts = new Date(WHEN).getTime();
const webSrv = await serve(ROOT, 4291, false);
const natSrv = await serve(DIST, 4292, true);
const browser = await pw.chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });

/* THE NATIVE SIDE HAD NO FONTS.
 *
 * On a device the five text faces are registered by the expo-font config
 * plugin before a line of JavaScript runs — they are built into the APK, not
 * fetched. `expo export --platform web` knows nothing about that plugin, so
 * the bundle it writes has no @font-face at all and the browser drew every
 * word of the native side in its default SERIF. Months of these screenshots
 * were comparing Hanken Grotesk against whatever Chromium falls back to, so
 * any reading of weight or letterform taken off them was worthless.
 *
 * The same five files the APK carries are served here and declared under the
 * exact family names theme.js asks for. */
const FONTS = ["HankenGrotesk", "HankenGroteskMedium", "HankenGroteskSemiBold", "HankenGroteskBold", "Fraunces", "Amiri"];
const FACES = FONTS.map(f =>
  `@font-face{font-family:"${f}";src:url("/__fonts/${f}.ttf") format("truetype");font-display:block}`
).join("\n");

const newPage = async (url, side) => {
  const page = await browser.newPage({ viewport: { width: 414, height: 1500 }, deviceScaleFactor: 1.6 });
  await page.addInitScript(FREEZE(ts));
  /* CMP_SCALE renders the native side at a chosen text size, so the biggest
     one the app offers can be looked at rather than assumed to fit. */
  /* CMP_THEME=dark renders the native side in dark mode, so it can be looked
     at rather than reasoned about. */
  if (side === "native" && process.env.CMP_THEME)
    await page.addInitScript(th => {
      const KEY = "taiyabah.prefs.v1";
      try {
        const cur = JSON.parse(window.localStorage.getItem(KEY) || "{}");
        window.localStorage.setItem(KEY, JSON.stringify({ ...cur, theme: th }));
      } catch {}
    }, process.env.CMP_THEME);
  if (side === "native" && process.env.CMP_SCALE)
    await page.addInitScript(sc => {
      const KEY = "taiyabah.prefs.v1";
      try {
        const cur = JSON.parse(window.localStorage.getItem(KEY) || "{}");
        window.localStorage.setItem(KEY, JSON.stringify({ ...cur, scale: Number(sc) }));
      } catch {}
    }, process.env.CMP_SCALE);
  await page.goto(url, { waitUntil: "networkidle" }).catch(() => {});
  if (side === "native") {
    await page.addStyleTag({ content: FACES });
    await page.evaluate(fs => Promise.all(fs.map(f => document.fonts.load(`16px "${f}"`))), FONTS);
    await page.evaluate(() => document.fonts.ready);
  }
  await page.waitForTimeout(2600);
  return page;
};

/* The app's first-run card covers whatever is behind it. */
const clearFirstRun = async page => {
  for (let i = 0; i < 10; i++) {
    const b = page.getByText(/^Not now$/).first();
    if (await b.isVisible().catch(() => false)) { await b.click().catch(() => {}); await page.waitForTimeout(400); return; }
    await page.waitForTimeout(250);
  }
};

const tapByText = async (page, rx) => {
  const all = page.getByText(rx);
  for (let i = 0, n = await all.count(); i < n; i++) {
    const el = all.nth(i);
    if (!(await el.isVisible().catch(() => false))) continue;
    try { await el.click({ timeout: 2000 }); await page.waitForTimeout(900); return true; } catch {}
    for (const role of ["tab", "button"]) {
      try {
        await el.locator(`xpath=ancestor-or-self::*[@role="${role}"]`).first().click({ timeout: 1200 });
        await page.waitForTimeout(900); return true;
      } catch {}
    }
    try { await el.click({ timeout: 1200, force: true }); await page.waitForTimeout(900); return true; } catch {}
  }
  return false;
};

const results = [];
/* CMP_ONLY=videos,membership renders just those, so a single screen can be
   re-measured in seconds instead of re-shooting all 25. */
const ONLY = (process.env.CMP_ONLY || "").split(",").map(x => x.trim()).filter(Boolean);
const PICK = ONLY.length ? SCREENS.filter(s => ONLY.includes(s[0])) : SCREENS;
if (ONLY.length && PICK.length !== ONLY.length)
  throw new Error("CMP_ONLY names a screen that is not in the list: " +
                  ONLY.filter(o => !SCREENS.some(s => s[0] === o)).join(", "));

for (const [name, rx, where] of PICK) {
  for (const side of ["web", "native"]) {
    const page = await newPage(side === "web" ? "http://localhost:4291/index.html" : "http://localhost:4292/", side);
    if (side === "native") await clearFirstRun(page);
    let ok = true;
    if (rx) {
      if (where === "menu") {
        if (side === "web") await page.locator("#nav-more").click({ timeout: 4000 }).catch(() => {});
        else await tapByText(page, /^More$/);
        await page.waitForTimeout(900);
      }
      ok = await tapByText(page, rx);
    }
    await page.waitForTimeout(800);
    const file = path.join(OUT, `${name}-${side}.png`);
    await page.screenshot({ path: file, fullPage: true });
    await page.close();
    if (!ok) results.push(`  MISS  ${name} (${side}) — nothing matched ${rx}`);
  }
  /* Side by side, which is the only way the difference is actually visible. */
  const a = path.join(OUT, `${name}-web.png`), b = path.join(OUT, `${name}-native.png`);
  try {
    const bin = (() => { try { execFileSync("magick", ["-version"], { stdio: "ignore" }); return "magick"; } catch { return "convert"; } })();
    execFileSync(bin, [a, b, "-background", "#888", "-splice", "8x0+0+0", "+append",
                       path.join(OUT, `SIDE-${name}.png`)]);
  } catch (e) { results.push(`  (no side-by-side for ${name}: ${String(e.message).slice(0, 60)})`); }
  process.stdout.write(`  ${name}\n`);
}

await browser.close(); webSrv.close(); natSrv.close();
if (results.length) { console.log("\nnotes:"); for (const r of results) console.log(r); }
console.log(`\nboth apps pinned to ${new Date(ts).toString()}`);
console.log(`${PICK.length} screens, web and native, in ${OUT}`);
