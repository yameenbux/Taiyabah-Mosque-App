/**
 * Does the "no connection" notice GO AWAY when the connection comes back?
 *
 * WHY THIS EXISTS. A person testing the Android build reported that "the
 * connection error sticks to the screen and cannot be removed". It did: the
 * bar appeared after three failed requests and nothing ever asked again, so on
 * a phone that had been out of signal for a moment the app said it was offline
 * until it was killed — and, because the hall and nikāḥ calendars wait on an
 * answer that never came, every day in both of them stayed dead.
 *
 * reach.test.mjs covers the state machine. This covers the app: the real
 * screens, the real supabase.js, the real bar, in the exported web build.
 *
 *   node scripts/offline-recovery.mjs
 */
import pw from "/opt/node22/lib/node_modules/playwright/index.js";
import http from "node:http"; import fs from "node:fs"; import path from "node:path";

const DIST = path.resolve(import.meta.dirname, "../dist");
if (!fs.existsSync(path.join(DIST, "index.html")))
  { console.error("no dist/ — run: npx expo export --platform web --output-dir dist"); process.exit(1); }
const TYPES = { ".js": "text/javascript", ".html": "text/html", ".ttf": "font/ttf",
                ".png": "image/png", ".json": "application/json", ".css": "text/css" };
const server = http.createServer((req, res) => {
  let p = path.join(DIST, decodeURIComponent(req.url.split("?")[0]));
  if (!fs.existsSync(p) || fs.statSync(p).isDirectory()) p = path.join(DIST, "index.html");
  res.setHeader("Content-Type", TYPES[path.extname(p)] || "application/octet-stream");
  fs.createReadStream(p).pipe(res);
});
await new Promise(r => server.listen(4178, r));

const browser = await pw.chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const page = await browser.newPage({ viewport: { width: 390, height: 820 } });

/* The masjid is unreachable. Not "slow": refused, which is what a phone with
   no signal gets. */
let reachable = false, asked = 0;
await page.route(/supabase\.co/, route => (asked++, reachable)
  ? route.fulfill({ status: 200, contentType: "application/json",
                    body: /\/rpc\//.test(route.request().url()) ? "{}" : "[]" })
  : route.abort());

const problems = [];
const BAR = /No connection\./;

await page.goto("http://localhost:4178/", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(3000);
for (let i = 0; i < 10; i++) {
  const notNow = page.getByText(/^Not now$/).first();
  if (await notNow.isVisible().catch(() => false)) { await notNow.click().catch(() => {}); break; }
  await page.waitForTimeout(300);
}

const barUp = async () => await page.getByText(BAR).first().isVisible().catch(() => false);
const until = async (want, ms, what) => {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { if (await barUp() === want) return true; await page.waitForTimeout(500); }
  problems.push(what);
  return false;
};

/* 1. It appears. Three failures are needed, so the app is given several things
      to ask for: the notices tab fetches on open, the hall calendar asks what
      is taken, and the home screen asks for the day's notices. */
for (const tab of [/^Notices$/, /^Home$/, /^Notices$/]) {
  await page.getByText(tab).first().click({ timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(1200);
}
console.log(`··   ${asked} request(s) to the masjid were refused`);
const appeared = await until(true, 30000, "the bar never appeared while the masjid was unreachable");
if (appeared) console.log("ok   the bar appeared while the masjid was unreachable");

/* 2. It goes away ON ITS OWN once the masjid answers again — no tap, no
      reload, no second screen. The probe backs off 5s, 10s, 20s…, so it has
      forty seconds to notice. */
reachable = true;
if (!appeared) {
  /* Without the first half there is nothing to watch go away, and "the bar is
     not showing" would pass this on its own — the shape of check that passes
     while the thing it checks is broken. */
  problems.push("the bar going away was not checked: it never appeared");
} else {
  console.log("··   the masjid is answering again; nothing has been tapped");
  if (await until(false, 45000, "the bar stayed up after the masjid came back — this is the fault that was reported"))
    console.log("ok   the bar went away by itself");
}

await browser.close(); server.close();
if (problems.length) {
  console.log(`\n${problems.length} problem(s):`);
  problems.forEach(p => console.log("  · " + p));
  process.exit(1);
}
console.log("\nthe notice appears when the masjid cannot be reached, and clears itself when it can");
