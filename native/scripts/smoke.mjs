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
/* NOT a dotted directory: upload-artifact skips hidden files by default, which
 * is why the first two runs produced an empty artifact and nothing to read. */
const OUT = process.env.SMOKE_DIR || path.resolve(import.meta.dirname, "../../smoke-out");
const PKG = "com.taiyabahmasjid.app.dev";
fs.mkdirSync(OUT, { recursive: true });

/* A CI job's log is not reachable through the API, and the first version of
 * this script died before its first screenshot — which left an empty artifact
 * and nothing to read. So everything it prints is also written to a file inside
 * the artifact, and anything that goes wrong is echoed as a ::error:: workflow
 * command, because those become check annotations and annotations ARE readable. */
const LOGFILE = path.join(OUT, "run.log");
fs.writeFileSync(LOGFILE, `smoke run — ${new Date().toISOString()}\napk: ${APK}\n\n`);
const say = line => { console.log(line); fs.appendFileSync(LOGFILE, line + "\n"); };
const annotate = line =>
  String(line).split("\n").slice(0, 8).forEach(l => console.log(`::error::${l}`));

const adb = (args, opts = {}) => {
  try {
    return execFileSync("adb", args, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024, ...opts });
  } catch (e) {
    /* adb writes the useful half of its complaints to stderr, and execFileSync
     * throws them away unless they are asked for by name. */
    const detail = [e.stdout, e.stderr].filter(Boolean).join("\n").trim();
    e.message = `adb ${args.slice(0, 3).join(" ")} failed: ${detail || e.message}`;
    throw e;
  }
};
const sleep = ms => execSync(`sleep ${ms / 1000}`);

let step = 0, failures = [], shots = 0;
const log = (mark, msg) => say(`${mark} ${msg}`);
const fail = msg => { failures.push(msg); log("FAIL", msg); annotate(msg); };

/* ---------- the screen, as Android sees it ------------------------------- */

let dumpFailures = 0;
function dump() {
  let last = "";
  for (let tries = 0; tries < 4; tries++) {
    try {
      adb(["shell", "uiautomator", "dump", "/sdcard/ui.xml"], { stdio: ["ignore", "pipe", "ignore"] });
      const xml = adb(["shell", "cat", "/sdcard/ui.xml"]);
      if (xml.includes("<node")) return xml;
      last = xml.slice(0, 200);
    } catch (e) { last = e.message.slice(0, 200); }
    sleep(900);
  }
  /* An empty read and an empty screen look identical downstream, and they are
   * completely different problems — so they are counted apart. */
  dumpFailures++;
  say("  (could not read the screen: " + last + ")");
  return "";
}

/* uiautomator writes XML, so "Sadaqah & Lillah" arrives as "Sadaqah &amp;
 * Lillah". Without this, every label with an ampersand or an apostrophe in it
 * would be reported missing when it is on screen. */
const unescapeXml = s => s
  .replace(/&lt;/g, "<").replace(/&gt;/g, ">")
  .replace(/&quot;/g, '"').replace(/&apos;/g, "'")
  .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
  .replace(/&amp;/g, "&");

/* Every node that carries words, with the box you would tap to reach it. */
function nodes(xml) {
  const out = [];
  for (const m of xml.matchAll(/<node\b[^>]*>/g)) {
    const tag = m[0];
    const text = (tag.match(/\btext="([^"]*)"/) || [, ""])[1];
    const desc = (tag.match(/\bcontent-desc="([^"]*)"/) || [, ""])[1];
    const b = tag.match(/\bbounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/);
    if (!b) continue;
    const label = unescapeXml(text || desc).trim();
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

/* uiautomator only reports what is on the glass, and both the home screen and
 * the menu are longer than the glass. So looking once and declaring a label
 * missing is wrong — it has to be looked for, scrolled to, and only then given
 * up on. The first version of this test did exactly that and reported nine
 * things missing that were simply further down. */
function toTop() {
  for (let i = 0; i < 6; i++) { adb(["shell", "input", "swipe", "540", "700", "540", "2000", "240"]); sleep(260); }
  sleep(500);
}
function seek(label, { swipes = 9, fromTop = true } = {}) {
  if (fromTop) toTop();
  let n = findIn(nodes(dump()), label);
  for (let i = 0; i < swipes && !n; i++) {
    adb(["shell", "input", "swipe", "540", "1800", "540", "800", "300"]);
    sleep(600);
    n = findIn(nodes(dump()), label);
  }
  return n;
}
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

/* Everything below runs inside this, so a throw leaves a log, a picture and an
 * annotation rather than an empty artifact. */
try {
try { say("device: " + adb(["devices", "-l"]).trim()); } catch (e) { say(String(e.message)); }
try { say("api level: " + adb(["shell", "getprop", "ro.build.version.sdk"]).trim()); } catch {}

/* Permissions are granted up front so a runtime prompt cannot be mistaken for
 * the app failing to draw — but -g refuses outright on some images when a
 * manifest asks for a permission it cannot grant that way, and an install that
 * throws takes the whole run with it. So it falls back to a plain install. */
log("··", `installing ${path.basename(APK)}`);
try {
  say(adb(["install", "-r", "-g", APK]).trim());
} catch (e) {
  say("install -g refused (" + e.message.slice(0, 160) + ") — installing without it");
  say(adb(["install", "-r", APK]).trim());
  for (const perm of ["android.permission.ACCESS_FINE_LOCATION",
                      "android.permission.ACCESS_COARSE_LOCATION",
                      "android.permission.POST_NOTIFICATIONS"]) {
    try { adb(["shell", "pm", "grant", PKG, perm]); } catch { /* not all are grantable */ }
  }
}
adb(["logcat", "-c"]);

log("··", "launching");
adb(["shell", "monkey", "-p", PKG, "-c", "android.intent.category.LAUNCHER", "1"],
    { stdio: ["ignore", "ignore", "ignore"] });
/* One picture before any assertion, so there is always something to look at. */
sleep(6000);
shot("first-frame");

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
  if (dumpFailures) fail(`could not read the screen at all (${dumpFailures} failed dumps) — ` +
                         "so whether the app drew is unknown");
  else fail("the home screen never drew — nothing matching 'Services' after 30s");
  const seen = home.map(n => n.label).filter(Boolean);
  say("\nwhat WAS on screen (" + seen.length + " items):\n  " + seen.join("\n  ").slice(0, 3000));
  annotate("on screen instead: " + (seen.length ? seen.slice(0, 12).join(" | ") : "(nothing at all)"));
  try {
    const focus = adb(["shell", "dumpsys", "window"]).match(/mCurrentFocus=.*/)?.[0] || "(none)";
    say("focus: " + focus); annotate("focused window: " + focus);
  } catch {}
  try {
    const tail = adb(["logcat", "-d", "-t", "300"]);
    fs.writeFileSync(path.join(OUT, "logcat-launch.txt"), tail);
    const interesting = tail.split("\n")
      .filter(l => /ReactNative|Expo|FATAL|AndroidRuntime|taiyabah|Font|SoLoader/i.test(l));
    say("\nrelevant logcat:\n" + interesting.slice(-40).join("\n"));
    annotate("logcat: " + interesting.slice(-6).join(" ⏎ ").slice(0, 900));
  } catch {}
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

let found = 0;
for (const want of [...HOME_ALSO, ...TILES]) {
  if (seek(want)) found++;
  else fail(`"${want}" is nowhere on the home screen, even after scrolling`);
}
log("··", `${found}/${HOME_ALSO.length + TILES.length} expected items found on the home screen`);
shot("home-bottom");

/* Tap each tile, check something new drew, come back. WhatsApp leaves the app,
 * so it is checked for presence but not followed. */
for (const label of TILES.filter(t => t !== "Join WhatsApp")) {
  const n = seek(label);
  if (!n) { fail(`cannot tap "${label}" — not found on the home screen`); continue; }
  tap(n);
  const after = nodes(dump());
  /* The tab bar is the tell: a pushed screen covers it, so if it is still there
   * the tap went nowhere. */
  const stillHome = findIn(after, "Home") && findIn(after, "Notices") && findIn(after, "More");
  if (stillHome) fail(`tapping "${label}" did nothing`);
  else log("ok", `${label} → opened`);
  shot("tile-" + label.replace(/[^A-Za-z]+/g, "-").toLowerCase());
  const c = crashes();
  if (c.length) { fail(`"${label}" crashed:\n    ${c.slice(0, 4).join("\n    ")}`); adb(["logcat", "-c"]); }
  back();
  for (let i = 0; i < 2 && !findIn(nodes(dump()), "Home"); i++) back();
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
    const n = seek(label);
    if (!n) { fail(`menu row "${label}" is missing, even after scrolling`); continue; }
    if (SKIP.has(label)) { log("··", `${label} — present, not followed`); continue; }
    tap(n);
    const after = nodes(dump());
    if (findIn(after, "Resources")) fail(`tapping "${label}" did nothing`);
    else log("ok", `${label} → opened`);
    shot("menu-" + label.replace(/[^A-Za-z]+/g, "-").toLowerCase());
    const c = crashes();
    if (c.length) { fail(`"${label}" crashed:\n    ${c.slice(0, 4).join("\n    ")}`); adb(["logcat", "-c"]); }
    back();
    for (let i = 0; i < 2 && !seek("Resources", { swipes: 3 }); i++) back();
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

try { fs.writeFileSync(path.join(OUT, "last-screen.xml"), dump()); } catch {}
say(`\n${shots} screenshots in ${OUT}`);
if (failures.length) {
  say(`\n${failures.length} problem(s):`);
  failures.forEach(f => say("  · " + f));
  process.exit(1);
}
say("\nThe app installs, opens, draws its home screen, and every tile and menu row");
say("opens a screen of its own. Nothing crashed.");

} catch (err) {
  say("\nthe run stopped early: " + (err && err.message ? err.message : String(err)));
  annotate("the smoke run stopped early: " + (err && err.message ? err.message : String(err)));
  try { shot("where-it-stopped"); } catch {}
  try { fs.writeFileSync(path.join(OUT, "last-screen.xml"), dump()); } catch {}
  try { fs.writeFileSync(path.join(OUT, "logcat-tail.txt"),
                         adb(["logcat", "-d", "-t", "400"])); } catch {}
  process.exit(1);
}
