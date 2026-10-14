/**
 * Taiyabah Masjid — the screens that go inside the App Store frames.
 * Copyright (c) 2026 Yameen Bux. All rights reserved. See LICENSE.md.
 *
 * store-shots.mjs takes these on an iOS simulator, which is the right way and
 * needs a Mac. This takes them from the app's own web export in Chromium,
 * which is the same bundle, the same components and the same data — the
 * machinery compare-all.mjs has used for months to look at every screen beside
 * the website.
 *
 * WHY IT EXISTS AT ALL. The first set of listing images went out with the home
 * screen inside all five frames, under five different headlines, because the
 * simulator was never navigating and nothing looked at what came out. A
 * headline promising the muṣḥaf over a picture of the home screen is a
 * misrepresentation — Apple cares, and it is in any case simply untrue. So
 * this writes a contact sheet as well as the shots, and the shots are meant to
 * be LOOKED AT before they are framed.
 *
 * WHAT MAKES THE RENDER HONEST:
 *
 *   the fonts      served from assets/fonts under the family names theme.js
 *                  asks for, because `expo export --platform web` knows
 *                  nothing about the expo-font plugin and would otherwise
 *                  draw every word in Chromium's default serif
 *   the clock      frozen, so the times on the screen are a real jamāʿah
 *                  evening rather than whenever this happened to run
 *   the muṣḥaf     served from quran/mushaf/ in this repository rather than
 *                  fetched, so the page is the real page and not the
 *                  "needs a connection" card
 *   the size       402x874 at a device scale factor of 3 is 1206x2622, which
 *                  is exactly what an iPhone 16 Pro screenshot is and exactly
 *                  what App Store Connect's medium-display tab takes
 *
 *   node scripts/store-web-shots.mjs            # both devices
 *   SHOT_ONLY=3-mushaf node scripts/store-web-shots.mjs
 */
import pw from "/opt/node22/lib/node_modules/playwright/index.js";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { decode } from "./png.mjs";

const native = path.resolve(import.meta.dirname, "..");
const repo = path.resolve(native, "..");
const DIST = path.join(native, "dist");
const OUT = process.env.SHOTS_DIR || path.join(native, "store-shots");

if (!fs.existsSync(path.join(DIST, "index.html")))
  throw new Error("no web export — run: npx expo export --platform web --output-dir dist");

/* A jamāʿah evening: ʿIshāʾ at 8:15, twenty-eight minutes off. Chosen because
 * the home screen is mostly a countdown, and a countdown reading "in 4 hours"
 * says nothing about what the app is for. */
/* WITH THE Z. Without it Node reads the string as the container's local
 * time, which is UTC, and 19:47 UTC is 20:47 in Bolton — past ʿIshāʾ, so the
 * home screen counted down to Fajr "in 10h 13m" instead. The masjid is on
 * British Summer Time in October. */
const WHEN = process.env.SHOT_WHEN || "2026-10-13T18:47:00Z";

const TYPES = { ".js": "text/javascript", ".html": "text/html", ".ttf": "font/ttf",
  ".png": "image/png", ".json": "application/json", ".svg": "image/svg+xml",
  ".css": "text/css", ".webp": "image/webp", ".woff2": "font/woff2",
  ".jpg": "image/jpeg", ".webmanifest": "application/manifest+json" };

const serve = (root, port, spa) => new Promise(res => {
  const s = http.createServer((q, r) => {
    const u = decodeURIComponent(q.url.split("?")[0]);
    let p = u.startsWith("/__fonts/")
      ? path.join(native, "assets/fonts", path.basename(u))
      : path.join(root, u);
    if (!fs.existsSync(p)) {
      if (spa) p = path.join(root, "index.html");
      else { r.statusCode = 404; r.end(); return; }
    }
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

/* The families theme.js names. Without these the native web render draws in
 * Chromium's default serif and every measurement taken off it is worthless. */
const FONTS = ["HankenGrotesk", "HankenGroteskMedium", "HankenGroteskSemiBold",
               "HankenGroteskBold", "Fraunces", "Amiri", "NotoNaskhArabic"];
const FACES = FONTS.map(f =>
  `@font-face{font-family:"${f}";src:url("/__fonts/${f}.ttf") format("truetype");font-display:block}`
).join("\n");

/* The five the frames ask for, each with the taps that reach it. `tile` is the
 * grid on the home screen, `menu` is behind More. */
const SHOTS = [
  { name: "1-home",      steps: [] },
  { name: "2-timetable", steps: [["menu", /^Full prayer timetable$/]] },
  /* OPENED AT A PAGE OF QURʼAN, through the app's own deep link rather than
     by tapping. Page 1 of this muṣḥaf is its title page, and a frame whose
     headline promises 114 sūrahs in thirteen lines over a picture of a cover
     is the same misrepresentation the home screen was, just quieter. The link
     is the one App.jsx publishes — Mushaf: "mushaf" — so this is the app
     routing itself, not the harness reaching inside it. */
  { name: "3-mushaf",    path: "/mushaf?page=3", steps: [] },
  /* Past the explainer to the nisab, which is the part the headline is about. */
  { name: "5-zakat",     steps: [["menu", /^Zakat calculator$/], ["scroll", 760]] },
  { name: "6-alerts",    steps: [["menu", /^Notifications$/]] },
  /* Candidates. Not every one of these ends up in a frame — PANELS in
     store-frames.mjs picks five — but they are cheap to take and the point of
     having them is to choose by looking rather than by imagining. */
  { name: "7-qibla",     steps: [["tile", /^Qibla$/]] },
  { name: "8-athkar",    steps: [["tile", /^Daily Adhk/], ["row", /^Morning & Evening$/]] },
  { name: "9-donate",    steps: [["tile", /^Donate$/]] },
  { name: "10-bukhari",  steps: [["tile", /al-Bukh/]] },
  { name: "11-surah",    path: "/quran", steps: [["row", /^English Translation$/],
                                                 ["text", /^Ar-Rahman$|^Ar-Rahmaan$|^Al-Mulk$/]] },
];

const DEVICES = [
  /* SHORT BY THE STATUS BAR, which store-frames.mjs draws on top. The app is
     rendered in the height below it and the bar is composited above, so the
     two never fight over the same pixels and the sum is exactly the size App
     Store Connect asks for. 59pt on the phone, 24pt on the iPad. */
  { dir: "iphone",  w: 402,  h: 874 - 59,   dsf: 3, bar: 59 },  /* 1206 x 2445 (+177) */
  { dir: "ipad-13", w: 1032, h: 1376 - 24, dsf: 2, bar: 24 },   /* 2064 x 2704 (+48)  */
];

const ts = new Date(WHEN).getTime();
const appSrv = await serve(DIST, 4392, true);
const repoSrv = await serve(repo, 4391, false);
const browser = await pw.chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });

const tap = async (page, rx) => {
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

const only = (process.env.SHOT_ONLY || "").split(",").map(s => s.trim()).filter(Boolean);
const pick = only.length ? SHOTS.filter(s => only.includes(s.name)) : SHOTS;
const report = [];

for (const d of DEVICES) {
  const dir = path.join(OUT, d.dir);
  fs.mkdirSync(dir, { recursive: true });
  for (const shot of pick) {
    /* NOTIFICATIONS ALREADY ALLOWED. Without it the alerts screen draws the
       "Enable notifications" button over switches faded to inert, which is the
       state somebody sees for about four seconds and never again — not the
       screen the listing is advertising. Granting it is also what keeps the
       first-run card from appearing at all. */
    const ctx = await browser.newContext({
      viewport: { width: d.w, height: d.h }, deviceScaleFactor: d.dsf,
      permissions: ["notifications"] });
    const page = await ctx.newPage();
    await page.addInitScript(FREEZE(ts));

    /* THE MASJID IS REACHABLE. Not because anything is faked — the notices
       and the published timetable really do come from Supabase — but because
       this container cannot reach it, and an app that correctly says "No
       connection" is not what the App Store listing is advertising. An empty
       list is the honest stand-in: it is what a reader with nothing new to
       see gets, and it keeps the offline bar off the screen. */
    await page.route("**://*.supabase.co/**", route =>
      route.fulfill({ status: 200, contentType: "application/json",
                      body: route.request().method() === "POST" ? "{}" : "[]" }));

    /* A PRICE FOR THE METAL, because this container cannot reach the price
       feeds and the zakat screen correctly says so — "Couldn't fetch today's
       price" in a red box is the truth about this machine and a libel on the
       app, which fetches it fine on a phone.
       
       These are SAMPLE PRICES, not quotes: £25.82 and £1,987.50 the troy
       ounce, which is roughly where silver and gold have been. What the screen
       then shows is the app's own arithmetic on them — 612.36g of silver at
       that price — so the nisab in the picture is a real calculation of a
       stated price, which is the most a screenshot of a live-price calculator
       can ever be. goldprice.org quotes both metals already in pounds, so one
       route covers it and no exchange rate is involved. */
    await page.route("**://data-asg.goldprice.org/**", route =>
      route.fulfill({ status: 200, contentType: "application/json",
        body: JSON.stringify({ items: [{ curr: "GBP", xauPrice: 1987.50, xagPrice: 25.82 }] }) }));

    /* The muṣḥaf fetches its pages from the masjid's origin. They are in this
       repository, so they are served from here — the alternative is a frame
       whose headline promises 848 pages over a card saying it needs a
       connection. */
    await page.route("**://taiyabahapp.ysbdesigns.uk/**", async route => {
      const rel = new URL(route.request().url()).pathname;
      const file = path.join(repo, rel);
      if (fs.existsSync(file))
        return route.fulfill({ status: 200, body: fs.readFileSync(file),
          contentType: TYPES[path.extname(file)] || "application/octet-stream" });
      return route.fulfill({ status: 404, body: "" });
    });

    await page.goto(`http://localhost:4392${shot.path || "/"}`,
                    { waitUntil: "networkidle" }).catch(() => {});
    await page.addStyleTag({ content: FACES });
    await page.evaluate(f => Promise.all(f.map(x => document.fonts.load(`16px "${x}"`))), FONTS);
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(2600);

    /* The first-run card covers whatever is behind it. */
    for (let i = 0; i < 10; i++) {
      const b = page.getByText(/^Not now$/).first();
      if (await b.isVisible().catch(() => false)) { await b.click().catch(() => {}); await page.waitForTimeout(500); break; }
      await page.waitForTimeout(250);
    }

    let reached = true;
    for (const [where, what] of shot.steps) {
      if (where === "scroll") {
        await page.mouse.move(d.w / 2, d.h / 2);
        await page.mouse.wheel(0, what);
        await page.waitForTimeout(900);
        continue;
      }
      if (where === "label") {
        const b = page.getByLabel(what).first();
        if (!(await b.click({ timeout: 4000 }).then(() => true).catch(() => false))) { reached = false; break; }
        await page.waitForTimeout(1100);
        continue;
      }
      if (where === "menu") { await tap(page, /^More$/); await page.waitForTimeout(900); }
      /* "text" and "tile" and "row" all just tap a visible label; the names are
         there so the table reads like the journey somebody actually makes. */
      if (!(await tap(page, what))) { reached = false; break; }
    }
    await page.waitForTimeout(1600);

    const file = path.join(dir, `${shot.name}.png`);
    await page.screenshot({ path: file });

    /* What colour the top of this screen actually is, read off the rendered
       pixels rather than asked of the DOM — elementFromPoint walked past the
       header's gradient and came back with the page background, so every bar
       would have been cream over plum. The muṣḥaf's header is nearly black;
       every other screen's is plum. */
    const img = decode(file);
    const px = (img.width >> 1) * img.channels + 2 * img.width * img.channels;
    const top = `rgb(${img.pixels[px]}, ${img.pixels[px + 1]}, ${img.pixels[px + 2]})`;
    const kb = Math.round(fs.statSync(file).size / 1024);
    report.push({ device: d.dir, shot: shot.name, reached, kb, top, bar: d.bar });
    console.log(`${reached ? "  ok  " : "FAIL  "}${d.dir.padEnd(8)} ${shot.name.padEnd(13)} ${String(kb).padStart(4)}KB  bar ${top}`);
    await ctx.close();
  }
}

await browser.close();
appSrv.close();
repoSrv.close();

/* Two shots that come out the same size to within a whisker are the same
 * screen, which is exactly how five identical frames shipped. A live
 * countdown defeats a hash; it does not defeat this. */
const byDevice = {};
for (const r of report) (byDevice[r.device] ||= []).push(r);
let same = 0;
for (const [device, rows] of Object.entries(byDevice))
  for (let i = 0; i < rows.length; i++)
    for (let j = i + 1; j < rows.length; j++) {
      const a = rows[i], b = rows[j];
      if (Math.abs(a.kb - b.kb) / Math.max(a.kb, b.kb) < 0.004) {
        console.log(`::warning::${device}: ${a.shot} and ${b.shot} are within 0.4% of the same size — same screen?`);
        same++;
      }
    }

/* The frame composer needs the bar height and the colour to draw it in.
 *
 * MERGED, NOT REPLACED. Written whole, a SHOT_ONLY run — which is the normal
 * way to re-take one screen — threw away the entries for the other nine, and
 * the composer then silently drew no status bar at all on any panel but the
 * one just taken. A partial run must not delete what it did not look at. */
const barFile = path.join(OUT, "status-bar.json");
const before = fs.existsSync(barFile) ? JSON.parse(fs.readFileSync(barFile, "utf8")) : {};
fs.writeFileSync(barFile, JSON.stringify(
  { ...before, ...Object.fromEntries(report.map(r => [`${r.device}/${r.shot}`, { top: r.top, bar: r.bar }])) },
  null, 1));

const failed = report.filter(r => !r.reached);
if (failed.length) {
  console.log(`\n${failed.length} shot(s) never reached their screen: ` +
              failed.map(f => `${f.device}/${f.shot}`).join(", "));
  process.exit(1);
}
console.log(`\n${report.length} shots written to ${OUT}` + (same ? ` — ${same} pair(s) to look at` : ""));
console.log("LOOK AT THEM before framing. That is the step that was missing.");
