/**
 * The six faults somebody found holding a Huawei, each one checked.
 *
 * WHY THIS EXISTS. On 7 October a person installed the test APK and in ten
 * minutes found six things: the salām clipped off the top of the home screen,
 * no way back from the compass, a "no connection" notice that would not go
 * away, two calendars whose days could not be pressed, no way back from the
 * new-build appeal, and text cut off at the sides of the nikāḥ form. Every one
 * of them had been through a green run of everything in this repository.
 *
 * The sweeps now look for each CLASS of fault — clipped text, a screen with no
 * way out — across every screen. This file is narrower and blunter: it opens
 * the exact screens that were reported and asks the exact question that was
 * asked, in the words it was asked in. If one of these six ever comes back,
 * this says so by name.
 *
 * The third, the stuck notice, is scripts/offline-recovery.mjs: it needs the
 * masjid to go away and come back, which is a different kind of test.
 *
 *   node scripts/reported-faults.mjs
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
await new Promise(r => server.listen(4182, r));

/* The text size the phone that found these was set to, as well as the one it
 * ships with: src/scale.js takes the larger of the phone's and the app's, so a
 * phone asking for big text draws this app at 1.5. */
const SCALE = Number((process.argv.find(a => a.startsWith("--scale=")) || "").split("=")[1]) || 1;

const browser = await pw.chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
/* The masjid answers, so the forms are drawn rather than their closed state.
 * Nothing leaves this machine: every call is answered here. */
await page.route(/supabase\.co/, route => route.fulfill({ status: 200,
  contentType: "application/json", body: /\/rpc\/request_/.test(route.request().url()) ? "{}" : "[]" }));
if (SCALE !== 1)
  await page.addInitScript(`try { localStorage.setItem("taiyabah.prefs.v1", JSON.stringify({ scale: ${SCALE} })); } catch {}`);
await page.goto("http://localhost:4182/", { waitUntil: "networkidle" });
await page.waitForTimeout(3000);
for (let i = 0; i < 10; i++) {
  const notNow = page.getByText(/^Not now$/).first();
  if (await notNow.isVisible().catch(() => false)) { await notNow.click().catch(() => {}); break; }
  await page.waitForTimeout(300);
}

const results = [];
const ok = (yes, line) => { results.push(`${yes ? "ok  " : "FAIL"} ${line}`); return yes; };

const tapText = async re => {
  const all = page.getByText(re); const n = await all.count();
  for (let i = 0; i < n; i++) {
    const el = all.nth(i);
    if (!(await el.isVisible())) continue;
    try { await el.click({ timeout: 2500 }); await page.waitForTimeout(600); return true; } catch {}
    for (const role of ["button", "tab"]) {
      try { await el.locator(`xpath=ancestor-or-self::*[@role="${role}"]`).first().click({ timeout: 1200 });
            await page.waitForTimeout(600); return true; } catch {}
    }
  }
  return false;
};
const back = async () => {
  const all = page.getByLabel("Back");
  for (let i = await all.count(); i-- > 0;) {
    const b = all.nth(i);
    if (await b.isVisible()) { await b.click(); await page.waitForTimeout(600); return true; }
  }
  return false;
};
const home = async () => { for (let i = 0; i < 4; i++) if (!(await back())) break;
                           await tapText(/^Home$/); await page.waitForTimeout(400); };
const hasWayBack = async () => {
  for (const sel of ['[aria-label="Back"]', '[aria-label="Close"]']) {
    const l = page.locator(sel); const n = await l.count();
    for (let i = 0; i < n; i++) if (await l.nth(i).isVisible()) return true;
  }
  return await page.getByText(/^Done$/).first().isVisible().catch(() => false);
};

/* 1. "The Salam at the top being cut off." */
await home();
ok(await page.evaluate(() => {
  const el = [...document.querySelectorAll("div")].find(e =>
    [...e.childNodes].some(n => n.nodeType === 3 && /السَّلَامُ/.test(n.textContent)));
  if (!el) return false;
  /* Whole, and not cut by anything clipping it. */
  for (let p = el; p; p = p.parentElement) {
    const s = getComputedStyle(p);
    if (!/hidden|clip/.test(s.overflowY)) continue;
    if (p.scrollHeight > p.clientHeight + 1 && p.contains(el)) return false;
  }
  return el.scrollHeight <= el.clientHeight + 1 && el.scrollWidth <= el.clientWidth + 1;
}), "1. the salām on the home screen is whole, not cut off at the top");

/* 2. "Compass does not have a back button." */
await home(); await tapText(/^Qibla$/);
ok(await hasWayBack(), "2. the compass offers a way back");

/* 5. "No back button on the new build donation page." */
await home(); await tapText(/^Donate$/);
ok(await hasWayBack(), "5. the new-build appeal offers a way back");

/* 4 and 6. "Unable to click a date on the calendar." */
for (const [n, name, tile, says] of [[4, "hall booking", /^Hall Booking$/, /\d{1,2} (January|February|March|April|May|June|July|August|September|October|November|December) \d{4}/],
                                     [6, "nikāḥ", /^Nik.*Services$/, /1st choice/i]]) {
  await home(); await tapText(tile); await page.waitForTimeout(900);
  const days = page.locator('[role="button"]').filter({ hasText: /^(1[5-9]|2[0-8])$/ });
  let pressed = false;
  const count = await days.count();
  for (let i = 0; i < count; i++) {
    const d = days.nth(i);
    if (!(await d.isVisible().catch(() => false))) continue;
    if (await d.getAttribute("aria-disabled") === "true") continue;
    await d.scrollIntoViewIfNeeded().catch(() => {});
    try { await d.click({ timeout: 2000 }); pressed = true; break; } catch {}
  }
  await page.waitForTimeout(800);
  ok(pressed, `${n}. a day on the ${name} calendar can be pressed`);
  const text = await page.evaluate(() => document.body.textContent);
  ok(says.test(text), `${n}. the ${name} screen names the day that was chosen`);
}

/* 6, the other half. "Text is being cut off on the sides on this page." */
ok(await page.evaluate(() => {
  const bad = [];
  for (const el of document.querySelectorAll("div, span, p, h1, h2, h3, a, button, label")) {
    if (el.closest('[aria-hidden="true"]')) continue;
    if (![...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) continue;
    const s = getComputedStyle(el);
    if (s.visibility === "hidden" || s.display === "none") continue;
    if (/hidden|clip/.test(s.overflowX) && el.scrollWidth > el.clientWidth + 1) bad.push(el.textContent.slice(0, 30));
    if (el.getBoundingClientRect().right > document.documentElement.clientWidth + 1) bad.push(el.textContent.slice(0, 30));
  }
  return bad.length === 0;
}), "6. nothing on the nikāḥ screen is cut off at the sides");

await browser.close(); server.close();
console.log(`the six faults reported from a phone, at ${SCALE === 1 ? "the usual text size" : "text x" + SCALE}:\n`);
results.forEach(r => console.log("  " + r));
console.log("\n  ··   3. the stuck 'no connection' notice: scripts/offline-recovery.mjs");
if (results.some(r => r.startsWith("FAIL"))) process.exit(1);
