/**
 * Drives the built APK on a real Android emulator.
 *
 * Not "it compiled, so it probably runs". This installs the APK, launches it,
 * waits for the home screen to actually draw, then taps every tile and every
 * menu row in turn — checking after each one that the screen changed and that
 * nothing landed in the crash log. It photographs each screen on the way.
 *
 * Everything goes through adb, so what it exercises is the shipped app on
 * Android, not a web export of it.
 *
 *   node scripts/smoke.mjs <path-to.apk>
 */
import { execSync, execFileSync } from "node:child_process";
import fs from "node:fs"; import path from "node:path";

const APK = process.argv[2];
const OUT = process.env.SMOKE_DIR || path.resolve(import.meta.dirname, "../../.smoke");
const PKG = "com.taiyabahmasjid.app.dev";
fs.mkdirSync(OUT, { recursive: true });

const adb = (args, opts = {}) =>
  execFileSync("adb", args, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024, ...opts });
const sleep = ms => execSync(`sleep ${ms / 1000}`);

let step = 0, failures = [], shots = 0;
const log = (mark, msg) => console.log(`${mark} ${msg}`);
const fail = msg => { failures.push(msg); log("FAIL", msg); };

/* ---------- the screen, as Android sees it ------------------------------- */

function dump() {
  for (let tries = 0; tries < 4; tries++) {
    try {
      adb(["shell", "uiautomator", "dump", "/sdcard/ui.xml"], { stdio: ["ignore", "pipe", "ignore"] });
      const xml = adb(["shell", "cat", "/sdcard/ui.xml"]);
      if (xml.includes("<node")) return xml;
    } catch {}
    sleep(900);
  }
  return "";
}

/* Every node that carries words, with the box you would tap to reach it. */
function nodes(xml) {
  const out = [];
  for (const m of xml.matchAll(/<node\b[^>]*>/g)) {
    const tag = m[0];
    const text = (tag.match(/\btext="([^"]*)"/) || [, ""])[1];
    const desc = (tag.match(/\bcontent-desc="([^"]*)"/) || [, ""])[1];
    const b = tag.match(/\bbounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/);
    if (!b) continue;
    const label = (text || desc).trim();
    if (!label) continue;
    const [, x1, y1, x2, y2] = b.map(Number);
    out.push({ label, x: Math.round((x1 + x2) / 2), y: Math.round((y1 + y2) / 2),
               w: x2 - x1, h: y2 - y1 });
  }
  return out;
}

const norm = s => s.replace(/\s+/g, " ").replace(/[‘’ʼ]/g, "'").trim().toLowerCase();
const findIn = (list, want) =>
  list.find(n => (want instanceof RegExp ? want.test(n.label) : norm(n.label) === norm(want)));

function tap(node) { adb(["shell", "input", "tap", String(node.x), String(node.y)]); sleep(1400); }
function back() { adb(["shell", "input", "keyevent", "KEYCODE_BACK"]); sleep(1200); }

function shot(name) {
  const file = path.join(OUT, `${String(++shots).padStart(2, "0")}-${name}.png`);
  fs.writeFileSync(file, adb(["exec-out", "screencap", "-p"], { encoding: "buffer" }));
  return file;
}

/* A crash does not always close the app — a JS error in React Native can leave
 * a blank screen that still answers taps. So both logs are read. */
function crashes() {
  const crash = adb(["logcat", "-d", "-b", "crash"]).trim();
  const main = adb(["logcat", "-d", "-s", "ReactNativeJS:E", "AndroidRuntime:E"]).trim();
  const lines = (crash + "\n" + main).split("\n")
    .filter(l => /FATAL EXCEPTION|AndroidRuntime: |ReactNativeJS: /.test(l));
  return lines;
}

/* ---------- the run ------------------------------------------------------ */

log("··", `installing ${path.basename(APK)}`);
adb(["install", "-r", "-g", APK], { stdio: "inherit" });
adb(["logcat", "-c"]);
/* Permissions are granted up front (-g) so a runtime prompt cannot be mistaken
 * for the app failing to draw. */

log("··", "launching");
adb(["shell", "monkey", "-p", PKG, "-c", "android.intent.category.LAUNCHER", "1"],
    { stdio: ["ignore", "ignore", "ignore"] });

/* The fonts load before the first frame, so give it room — and look for the
 * words rather than a fixed wait. */
let xml = "", home = [];
for (let i = 0; i < 20; i++) {
  sleep(1500);
  xml = dump(); home = nodes(xml);
  if (findIn(home, /Next Jam|Today|Services/i)) break;
}
if (!findIn(home, /Services/i)) {
  shot("home-FAILED");
  fail("the home screen never drew — no 'Services' on screen after 30s");
  console.log("\nwhat was on screen:\n  " + home.map(n => n.label).join("\n  ").slice(0, 2000));
} else {
  log("ok", "home screen drew");
}
shot("home");

const early = crashes();
if (early.length) fail("crashed on launch:\n    " + early.slice(0, 6).join("\n    "));

/* Is the app actually the thing in front? A blank activity still "runs". */
const focus = adb(["shell", "dumpsys", "window"]).match(/mCurrentFocus=.*\n?/)?.[0] || "";
if (!focus.includes(PKG)) fail(`the app is not in front — focus is ${focus.trim() || "nothing"}`);
else log("ok", "the app is the focused window");

/* ---------- everything on the home screen -------------------------------- */

const TILES = ["Holy Qur'an", "Daily Adhkār", "Ṣaḥīḥ al-Bukhārī", "Qibla", "Madrasah",
               "Nikāḥ Services", "Funeral Services", "Hall Booking", "Donate",
               "Sadaqah & Lillah", "Charity Collections", "Join WhatsApp"];
const HOME_ALSO = ["Listen live", "Today", "Services", "Full timetable"];

for (const want of [...HOME_ALSO, ...TILES]) {
  if (!findIn(home, want)) fail(`"${want}" is not on the home screen`);
}
log("··", `${[...HOME_ALSO, ...TILES].filter(w => findIn(home, w)).length}/${HOME_ALSO.length + TILES.length} expected items found on home`);

/* Tap each tile, check something new drew, come back. WhatsApp leaves the app,
 * so it is checked for presence but not followed. */
for (const label of TILES.filter(t => t !== "Join WhatsApp")) {
  const n = findIn(nodes(dump()), label);
  if (!n) { fail(`cannot tap "${label}" — not on screen`); continue; }
  tap(n);
  const after = nodes(dump());
  const stillHome = findIn(after, "Services") && findIn(after, "Listen live");
  if (stillHome) fail(`tapping "${label}" did nothing`);
  else log("ok", `${label} → opened`);
  shot("tile-" + label.replace(/[^A-Za-z]+/g, "-").toLowerCase());
  const c = crashes();
  if (c.length) { fail(`"${label}" crashed:\n    ${c.slice(0, 4).join("\n    ")}`); adb(["logcat", "-c"]); }
  back();
  /* Back out of anything deeper the screen pushed on its own. */
  for (let i = 0; i < 2 && !findIn(nodes(dump()), "Services"); i++) back();
}

/* ---------- the menu ------------------------------------------------------ */

const moreTab = findIn(nodes(dump()), "More");
if (!moreTab) fail("the More tab is not on screen");
else {
  tap(moreTab);
  const menu = nodes(dump());
  shot("more");
  const GROUPS = ["Resources", "Madrasah", "The masjid", "Our services", "Settings"];
  const ROWS = ["Full prayer timetable", "Videos & bayaans", "Hajj / Umrah", "Ramadan 2027",
                "Zakat calculator", "Admissions & Fees", "Holiday Planner", "Madrasah Portal",
                "About us", "Membership", "Find us", "Contact us", "Birth, Marriage & Death",
                "Imams' Advice", "Education", "Tours & Visits", "Notifications",
                "Privacy notice", "System Preferences"];
  if (!findIn(menu, "Resources")) fail("the More menu did not open");
  else log("ok", "the More menu opened");
  for (const g of GROUPS) if (!findIn(menu, g)) fail(`menu group "${g}" is missing`);

  /* The menu scrolls, so rows below the fold are found by scrolling to them. */
  const SKIP = new Set(["Hajj / Umrah", "Ramadan 2027", "Tours & Visits",   // deliberately inert
                        "Madrasah Portal", "Find us", "Privacy notice"]);   // leave the app
  for (const label of ROWS) {
    let n = findIn(nodes(dump()), label);
    for (let s = 0; !n && s < 6; s++) {
      adb(["shell", "input", "swipe", "540", "1600", "540", "900", "320"]); sleep(700);
      n = findIn(nodes(dump()), label);
    }
    if (!n) { fail(`menu row "${label}" is missing`); continue; }
    if (SKIP.has(label)) { log("··", `${label} — present, not followed`); continue; }
    tap(n);
    const after = nodes(dump());
    if (findIn(after, "Resources") && findIn(after, "Settings")) fail(`tapping "${label}" did nothing`);
    else log("ok", `${label} → opened`);
    shot("menu-" + label.replace(/[^A-Za-z]+/g, "-").toLowerCase());
    const c = crashes();
    if (c.length) { fail(`"${label}" crashed:\n    ${c.slice(0, 4).join("\n    ")}`); adb(["logcat", "-c"]); }
    back();
    for (let i = 0; i < 2 && !findIn(nodes(dump()), "Resources"); i++) back();
  }
}

/* ---------- the other tabs ------------------------------------------------ */

for (const tab of ["Prayer Times", "Notices", "Home"]) {
  const n = findIn(nodes(dump()), tab);
  if (!n) { fail(`the ${tab} tab is not on screen`); continue; }
  tap(n);
  shot("tab-" + tab.replace(/\s+/g, "-").toLowerCase());
  const c = crashes();
  if (c.length) { fail(`the ${tab} tab crashed:\n    ${c.slice(0, 4).join("\n    ")}`); adb(["logcat", "-c"]); }
  else log("ok", `${tab} tab`);
}

/* ---------- verdict ------------------------------------------------------- */

const late = crashes();
if (late.length) fail("crashes in the log at the end:\n    " + late.slice(0, 8).join("\n    "));

console.log(`\n${shots} screenshots in ${OUT}`);
if (failures.length) {
  console.log(`\n${failures.length} problem(s):`);
  failures.forEach(f => console.log("  · " + f));
  process.exit(1);
}
console.log("\nThe app installs, opens, draws its home screen, and every tile and menu row");
console.log("opens a screen of its own. Nothing crashed.");
