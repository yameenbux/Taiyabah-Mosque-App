/**
 * Every screen of the app, measured — not photographed.
 *
 * WHY THIS EXISTS. Six faults were found on a Huawei by a person holding it,
 * and four of them were layout: a greeting clipped off the top of the hero,
 * text cut off at the sides of the nikāḥ form, two screens with no way back.
 * Nothing in this repository was looking for any of them. shots.mjs walks the
 * same screens and writes PNGs, which only help if somebody opens all 37.
 *
 * This walks the same screens in the same exported web build — the real app,
 * the real styles, react-native-web mapping flexbox the way Yoga does — and
 * asks of every element that carries words:
 *
 *   · is it WIDER than the box clipping it?      (text cut off at the sides)
 *   · is it TALLER than the box clipping it?     (the Salam, cut off at the top)
 *   · is it off the right edge, or left of 0?    (pushed off by a sibling)
 *   · is it ellipsised because it ran out of room?
 *
 * and of every pushed screen: does it offer a way back at all?
 *
 * The device sweep in smoke.mjs asks the same questions of the same screens on
 * a real Android. It is the honest one — but it can only read what is on the
 * glass, it needs an emulator and twenty minutes, and it cannot see a box's
 * overflow. This sees the whole page at once and runs in two minutes, so it is
 * the one to run while fixing.
 *
 *   node scripts/sweep.mjs [width] [--open]
 */
import pw from "/opt/node22/lib/node_modules/playwright/index.js";
import http from "node:http"; import fs from "node:fs"; import path from "node:path";

const WIDTH = Number(process.argv[2]) || 360;      // the narrow end of what people carry
/* THE WORST CASE PEOPLE ACTUALLY HAVE. src/scale.js takes the LARGER of the
 * phone's own font setting and the one chosen in the app, capped at 1.5 — so a
 * Huawei set to its biggest text draws this app at 1.5x whatever the screen is.
 * That is the state the nikāḥ form was photographed in, and sweeping at 1x
 * would never show it. */
const SCALE = Number((process.argv.find(a => a.startsWith("--scale=")) || "").split("=")[1]) || 1;
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
await new Promise(r => server.listen(4174, r));

const browser = await pw.chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const page = await browser.newPage({ viewport: { width: WIDTH, height: 760 } });
const errors = [];
page.on("pageerror", e => errors.push(String(e.message).split("\n")[0]));
page.on("console", m => { if (m.type() === "error") errors.push(m.text().slice(0, 160)); });

/* THE FORMS ONLY EXIST IF POSTGRES ANSWERS.
 *
 * isOpen() asks the masjid whether a form is taking requests, and this
 * environment cannot reach supabase.co at all. So every sweep before this one
 * measured the CLOSED state of the nikāḥ, hall booking, charity collection and
 * imāms' advice screens — a phone number and an email row — and never saw one
 * field of the four longest screens in the app. That is where the fault
 * reported from a real phone was.
 *
 * A plain 200 is what the masjid says when a form is open. Nothing leaves this
 * machine either way: the route answers every call, so no request_* function is
 * ever really called. */
await page.route(/supabase\.co/, route => {
  const url = route.request().url();
  route.fulfill({ status: 200, contentType: "application/json",
                  body: /\/rpc\//.test(url) ? "{}" : "[]" });
});

/* Written before the app boots, so the first paint is already at this size —
 * the prefs live in AsyncStorage, which on the web is localStorage. */
if (SCALE !== 1)
  await page.addInitScript(`try { localStorage.setItem("taiyabah.prefs.v1", JSON.stringify({ scale: ${SCALE} })); } catch {}`);
await page.goto("http://localhost:4174/", { waitUntil: "networkidle" });
await page.waitForTimeout(2500);

/* The first-run reminder offer covers the bottom half of whatever is behind it,
 * so every measurement after it would be a measurement of the same card. */
for (let i = 0; i < 12; i++) {
  const notNow = page.getByText(/^Not now$/).first();
  if (await notNow.isVisible().catch(() => false)) { await notNow.click({ timeout: 2000 }).catch(() => {}); break; }
  await page.waitForTimeout(300);
}
await page.waitForTimeout(400);

/* ---------- the measurements ---------------------------------------------- */

const AUDIT = `() => {
  const vw = document.documentElement.clientWidth;
  const found = [];
  const push = s => { if (!found.includes(s)) found.push(s); };
  const scrollsX = el => { for (let p = el; p; p = p.parentElement) {
      const s = getComputedStyle(p); if (/auto|scroll/.test(s.overflowX)) return true; } return false; };
  const scrollsY = el => { for (let p = el; p; p = p.parentElement) {
      const s = getComputedStyle(p); if (/auto|scroll/.test(s.overflowY)) return true; } return false; };
  for (const el of document.querySelectorAll("div, span, p, h1, h2, h3, h4, a, button, label")) {
    /* A screen you have navigated away from stays mounted. Anything hidden,
       from either side, is not what the person is looking at. */
    if (el.closest('[aria-hidden="true"]')) continue;
    /* The tab bar is drawn by react-navigation, not by this app, and on the web
       it gives a 14px box to a 16px line box. On a phone the native tab bar
       does not, and check-contrast/check-targets cover its labels. */
    const inTabBar = !!el.closest('[role="tab"],[role="tablist"]');
    const words = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim());
    if (!words) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) continue;
    const s = getComputedStyle(el);
    if (s.visibility === "hidden" || s.display === "none" || s.opacity === "0") continue;
    const text = el.textContent.trim().replace(/\\s+/g, " ").slice(0, 46);
    const clipX = /hidden|clip/.test(s.overflowX), clipY = /hidden|clip/.test(s.overflowY);
    if (clipX && el.scrollWidth > el.clientWidth + 1 && !scrollsX(el))
      push('cut off at the sides — "' + text + '" (' + el.scrollWidth + 'px of words in ' + el.clientWidth + 'px)');
    if (clipY && !inTabBar && el.scrollHeight > el.clientHeight + 1 && !scrollsY(el))
      push('cut off top or bottom — "' + text + '" (' + el.scrollHeight + 'px of words in ' + el.clientHeight + 'px)');
    if (r.right > vw + 1 && !scrollsX(el))
      push('runs off the right edge — "' + text + '" (ends at ' + Math.round(r.right) + ' of ' + vw + ')');
    if (r.left < -1 && !scrollsX(el))
      push('starts left of the screen — "' + text + '" (' + Math.round(r.left) + ')');
  }
  /* Every pushed screen has to offer a way out. */
  const vis = el => el && el.getBoundingClientRect().width > 0 && !el.closest('[aria-hidden="true"]');
  const onTab = [...document.querySelectorAll('[role="tab"],[role="tablist"] *')].some(vis);
  const wayOut = [...document.querySelectorAll('[aria-label="Back"],[aria-label="Close"],[aria-label="Done"]')].some(vis)
    || [...document.querySelectorAll("div,span,button")].some(e =>
         vis(e) && /^(back|done|close)$/i.test((e.textContent || "").trim()));
  return { found, onTab, wayOut };
}`;

const problems = [];
let screens = 0;
const check = async where => {
  screens++;
  const { found, onTab, wayOut } = await page.evaluate(eval(AUDIT));
  for (const f of found) problems.push(`${where}: ${f}`);
  if (!onTab && !wayOut) problems.push(`${where}: no way back — no Back, Done or Close on the screen`);
  process.stdout.write(found.length || (!onTab && !wayOut) ? "!" : ".");
};

/* ---------- getting about (the same walk shots.mjs makes) ----------------- */

const tapText = async (text, { exact = false } = {}) => {
  const all = typeof text === "string" ? page.getByText(text, { exact }) : page.getByText(text);
  const n = await all.count();
  for (let i = 0; i < n; i++) {
    const el = all.nth(i);
    if (!(await el.isVisible())) continue;
    try { await el.click({ timeout: 2500 }); await page.waitForTimeout(500); return; } catch {}
    for (const role of ["tab", "button", "radio"]) {
      try {
        const anc = el.locator(`xpath=ancestor-or-self::*[@role="${role}"]`).first();
        await anc.click({ timeout: 1200 }); await page.waitForTimeout(500); return;
      } catch {}
    }
    try { await el.click({ timeout: 1200, force: true }); await page.waitForTimeout(500); return; } catch {}
  }
  throw new Error(`nothing tappable for ${text}`);
};
const back = async () => {
  const all = page.getByLabel("Back");
  for (let i = await all.count(); i-- > 0;) {
    const b = all.nth(i);
    if (await b.isVisible()) { await b.click(); await page.waitForTimeout(550); return true; }
  }
  return false;
};
const toHome = async () => {
  for (let i = 0; i < 4; i++) if (!(await back())) break;
  await tapText(/^Home$/).catch(() => {});
  await page.waitForTimeout(350);
};
const toMenu = async () => {
  for (let i = 0; i < 4; i++) if (!(await back())) break;
  await tapText("More").catch(() => {});
  await page.waitForTimeout(350);
};

await check("home");
for (const [name, label] of [["prayer times", /^Prayer Times$/], ["notices", /^Notices$/], ["more", /^More$/]]) {
  try { await tapText(label); await page.waitForTimeout(400); await check("tab " + name); }
  catch { problems.push(`tab ${name}: could not open`); process.stdout.write("?"); }
}

const TILES = [
  ["quran", /^Holy Qur.an$/], ["adhkar", /^Daily Adhk/], ["bukhari", /al-Bukh/],
  ["qibla", /^Qibla$/], ["madrasah", /^Madrasah$/], ["nikah", /^Nik.*Services$/],
  ["funeral", /^Funeral Services$/], ["hall booking", /^Hall Booking$/],
  ["new build", /^Donate$/], ["giving", /^Sadaqah & Lillah$/],
  ["collections", /^Charity Collections$/], ["listen live", /^Listen live$/],
];
for (const [name, label] of TILES) {
  try { await toHome(); await tapText(label); await page.waitForTimeout(500); await check("tile " + name); }
  catch (e) { problems.push(`tile ${name}: could not open — ${String(e.message).split("\n")[0].slice(0, 60)}`); process.stdout.write("?"); }
}

const MENU = [
  ["timetable", /^Full prayer timetable$/], ["videos", /^Videos & bayaans$/],
  ["zakat", /^Zakat calculator$/], ["admissions", /^Admissions & Fees$/],
  ["holidays", /^Holiday Planner$/], ["about", /^About us$/], ["membership", /^Membership$/],
  ["contact", /^Contact us$/], ["birth marriage death", /^Birth, Marriage & Death$/],
  ["advice", /^Imams. Advice$/], ["education", /^Education$/], ["notifications", /^Notifications$/],
  ["system preferences", /^System Preferences$/], ["help", /^Help$/],
];
for (const [name, label] of MENU) {
  try { await toMenu(); await tapText(label); await page.waitForTimeout(500); await check("menu " + name); }
  catch (e) { problems.push(`menu ${name}: could not open — ${String(e.message).split("\n")[0].slice(0, 60)}`); process.stdout.write("?"); }
}
/* Three screens only reachable from inside another one. */
for (const [name, path_] of [["everyday duas", [/^Daily Adhk/, /^Everyday Du/]],
                             ["rabbanas", [/^Daily Adhk/, /Rabban/]],
                             ["curriculum", [/^Madrasah$/, /What is taught|Curriculum/]],
                             /* The reader is the screen people spend the longest
                                in and neither sweep had ever opened it. */
                             ["quran reader", [/^Holy Qur.an$/, /^Al-F(a|ā)ti/]],
                             ["bukhari book", [/al-Bukh/, /Revelation|Belief|^Book 1/]]]) {
  try { await toHome(); for (const step of path_) await tapText(step); await page.waitForTimeout(500); await check(name); }
  catch (e) { problems.push(`${name}: could not open`); process.stdout.write("?"); }
}

await browser.close(); server.close();

const seen = [...new Set(errors)];
console.log(`\n\nswept ${screens} screens at ${WIDTH}px, text x${SCALE}`);
console.log(seen.length ? "runtime errors:\n  ! " + seen.slice(0, 10).join("\n  ! ") : "no runtime errors");
if (problems.length) {
  console.log(`\n${problems.length} problem(s):`);
  problems.forEach(p => console.log("  · " + p));
  process.exit(1);
}
console.log("\nnothing clipped, nothing off the edge, every pushed screen has a way back");
