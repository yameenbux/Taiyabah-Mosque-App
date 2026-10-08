/**
 * The six (now seven) phone screenshots the Play listing shows, from the real app.
 *
 * THE ASPECT RATIO IS A HARD REQUIREMENT. The Console takes 9:16 or 16:9 and
 * refuses anything else; the first set was 1080 × 2400 — the shape of a real
 * modern phone, which is 9:20 — and was rejected. A 540 × 960 viewport at
 * deviceScaleFactor 2 is exactly 1080 × 1920, and the text renders at phone
 * density rather than being scaled up from something small.
 *
 * Two things that have spoiled a set before, both handled here:
 *   · the service worker, which can serve an old build under a new version;
 *   · a screen that cannot reach the masjid, which draws a red bar across the
 *     frame and reads as a broken app. Every call is answered locally, so
 *     nothing leaves this machine and no screen is caught mid-apology.
 *
 * Look at every frame before using it. This writes straight into
 * store/screenshots, replacing what is there.
 *
 *   node scripts/store-shots.mjs
 */
import pw from "/opt/node22/lib/node_modules/playwright/index.js";
import http from "node:http"; import fs from "node:fs"; import path from "node:path";

const DIST = path.resolve(import.meta.dirname, "../dist");
const OUT  = path.resolve(import.meta.dirname, "../../store/screenshots");
if (!fs.existsSync(path.join(DIST, "index.html")))
  { console.error("no dist/ — run: npx expo export --platform web --output-dir dist"); process.exit(1); }
fs.mkdirSync(OUT, { recursive: true });

const TYPES = { ".js": "text/javascript", ".html": "text/html", ".ttf": "font/ttf",
                ".png": "image/png", ".json": "application/json", ".css": "text/css" };
const server = http.createServer((req, res) => {
  let p = path.join(DIST, decodeURIComponent(req.url.split("?")[0]));
  if (!fs.existsSync(p) || fs.statSync(p).isDirectory()) p = path.join(DIST, "index.html");
  res.setHeader("Content-Type", TYPES[path.extname(p)] || "application/octet-stream");
  fs.createReadStream(p).pipe(res);
});
await new Promise(r => server.listen(4187, r));

const browser = await pw.chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });

async function open({ dark = false } = {}) {
  const ctx = await browser.newContext({
    viewport: { width: 540, height: 960 }, deviceScaleFactor: 2,
    serviceWorkers: "block",
  });
  await ctx.route(/supabase\.co/, r => r.fulfill({ status: 200, contentType: "application/json",
    body: /\/rpc\/request_/.test(r.request().url()) ? "{}" : "[]" }));
  const page = await ctx.newPage();
  if (dark)
    await page.addInitScript(`try { localStorage.setItem("taiyabah.prefs.v1", JSON.stringify({ theme: "dark" })); } catch {}`);
  await page.goto("http://localhost:4187/", { waitUntil: "networkidle" });
  await page.waitForTimeout(3200);
  /* The first-run reminder offer covers the bottom half of the first frame. */
  for (let i = 0; i < 12; i++) {
    const notNow = page.getByText(/^Not now$/).first();
    if (await notNow.isVisible().catch(() => false)) { await notNow.click().catch(() => {}); break; }
    await page.waitForTimeout(300);
  }
  await page.waitForTimeout(600);
  return { ctx, page };
}

const tapText = async (page, re) => {
  const all = page.getByText(re); const n = await all.count();
  for (let i = 0; i < n; i++) {
    const el = all.nth(i);
    if (!(await el.isVisible())) continue;
    try { await el.click({ timeout: 2500 }); await page.waitForTimeout(700); return true; } catch {}
    for (const role of ["button", "tab"]) {
      try { await el.locator(`xpath=ancestor-or-self::*[@role="${role}"]`).first().click({ timeout: 1200 });
            await page.waitForTimeout(700); return true; } catch {}
    }
  }
  throw new Error(`nothing tappable for ${re}`);
};

/* The order the listing shows them in, with the caption each frame is for. */
const SHOTS = [
  ["01-home",        null,                    "Every prayer, and the next one counting down"],
  ["02-times",       /^Prayer Times$/,        "Beginning and jamāʿah times, today and all year"],
  ["03-quran",       /^Holy Qur.an$/,         "The whole Qurʼan, and it works offline"],
  ["04-adhkar",      /^Daily Adhk/,           "Morning, evening and after-prayer adhkār"],
  ["05-giving",      /^Sadaqah & Lillah$/,    "Give to the masjid in seconds"],
  /* NOT the charity collection screen. It is a good screen, but the masjid is
     taking those requests by phone just now and the website says so on it —
     a listing frame that reads "this form is not open yet" is an advert for
     the one thing the app cannot do. The hall is open, and its calendar shows
     at a glance what the app is for. */
  ["06-hall", /^Hall Booking$/, "See which days are free and book the hall",
   /^Available$/],
];

const done = [];
for (const [name, where, caption, scrollTo] of SHOTS) {
  const { ctx, page } = await open();
  try {
    if (where) await tapText(page, where);
    await page.waitForTimeout(1400);
    /* Some screens open on their prose. Bring the thing the caption promises
       into the frame rather than photographing the paragraph above it. */
    if (scrollTo) {
      await page.getByText(scrollTo).first().scrollIntoViewIfNeeded().catch(() => {});
      await page.waitForTimeout(700);
    }
    await page.screenshot({ path: path.join(OUT, name + ".png") });
    done.push(`${name}.png — ${caption}`);
  } catch (e) {
    console.error(`MISS ${name}: ${String(e.message).split("\n")[0].slice(0, 70)}`);
  }
  await ctx.close();
}

/* Seven, because dark mode is new and is the first thing somebody scrolling a
   store listing at night will care about. */
{
  const { ctx, page } = await open({ dark: true });
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(OUT, "07-dark.png") });
  done.push("07-dark.png — Light or dark, whichever suits the hour");
  await ctx.close();
}

await browser.close(); server.close();
console.log(`${done.length} screenshot(s) in ${OUT}, 1080 × 1920 each:\n`);
done.forEach(d => console.log("  " + d));
