/**
 * Taiyabah Masjid — App Store screenshots, taken by machine.
 *
 * WHY THIS IS NOT ios-shots.mjs. That script is a GATE: it boots the app and
 * proves it opened rather than dying on a red error screen, and it must stay
 * cheap enough to run on every push. This one is an ASSET PRODUCER: it exists
 * to hand App Store Connect the images it refuses to accept a submission
 * without. They photograph the same app and share nothing else — different
 * devices, different sizes, different definition of success — so they are kept
 * apart rather than merged into something that does neither job well.
 *
 * APPLE'S SIZES ARE NOT NEGOTIABLE. A submission needs one 6.9" iPhone set,
 * and — because app.json sets supportsTablet — a 13" iPad set as well. Those
 * are 1320x2868 and 2064x2752, and anything else is rejected at upload. A
 * screenshot taken on somebody's own phone is therefore usually the wrong
 * size: a 6.1" iPhone gives 1170x2532, which App Store Connect will not take.
 * The simulator is the only way to get the right pixels without owning one of
 * each device, so the sizes are asserted here rather than discovered later.
 *
 * HOW IT NAVIGATES, GIVEN SIMCTL CANNOT TAP. It cannot, which is why the gate
 * script only ever photographs the first screen. The way past that is the
 * app's own deep links: `simctl openurl taiyabah://qibla` routes through the
 * linking config in src/App.jsx. So the set of screens this can photograph is
 * exactly the set that is reachable by link, and adding one here means adding
 * one there.
 *
 * THE FIRST-RUN CARD HAD TO GO. On a fresh install the app offers to turn on
 * jamaat reminders, and that card sits over everything — it would be in every
 * screenshot. Rather than change the app for the sake of its own marketing,
 * the preference that records the offer as already made is written straight
 * into the simulator's data container before first launch. The provider in
 * store.jsx merges whatever it reads over DEFAULTS, so writing the single key
 * askedPush leaves every other preference at its default.
 *
 * WHAT A PASS HERE DOES AND DOES NOT MEAN. It means a file exists, at exactly
 * the size Apple requires, holding more than a trivial amount of data. It does
 * NOT mean the screen is the right screen or that it looks good: no check here
 * can tell a beautiful Qibla compass from a beautiful error message. Somebody
 * has to look at these before they go on the App Store.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const OUT = path.join(root, "store-shots");

const sh = (cmd, args, opts = {}) =>
  execFileSync(cmd, args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], ...opts });

const annotate = (level, msg, max = 900) =>
  console.log(`::${level}::${String(msg).replace(/\r?\n/g, " ").slice(0, max)}`);

const wait = ms => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);

/* Read a PNG's IHDR. Cheaper and more honest than decoding the image: the
 * dimensions are the thing Apple actually enforces, and they live in fixed
 * bytes at the head of every PNG. */
function pngSize(file) {
  const fd = fs.openSync(file, "r");
  const head = Buffer.alloc(24);
  fs.readSync(fd, head, 0, 24, 0);
  fs.closeSync(fd);
  if (head.toString("ascii", 1, 4) !== "PNG") throw new Error(`${file} is not a PNG`);
  return { w: head.readUInt32BE(16), h: head.readUInt32BE(20) };
}

/* ---- the app that was just built for the simulator ---------------------- */

const products = path.join(root, "ios", "build", "Build", "Products");
if (!fs.existsSync(products)) {
  annotate("error", `No simulator build at ${products} — run the build step first`);
  process.exit(1);
}
const dir = fs.readdirSync(products).find(d => d.includes("iphonesimulator"));
const appDir = path.join(products, dir);
const app = fs.readdirSync(appDir).find(f => f.endsWith(".app"));
const APP = path.join(appDir, app);
const bundleId = sh("/usr/libexec/PlistBuddy",
  ["-c", "Print :CFBundleIdentifier", path.join(APP, "Info.plist")]).trim();

/* ---- what to photograph -------------------------------------------------
 *
 * Ordered the way the App Store shows them, because the first two are what
 * most people ever see. Home and the timetable lead, since prayer times are
 * why somebody downloads a masjid app at all; the rest follow in the order a
 * congregation would care about them. */
const SHOTS = [
  { name: "1-home",      url: "taiyabah://home",      why: "today's times and the next jamaat" },
  { name: "2-timetable", url: "taiyabah://times",     why: "the full prayer timetable" },
  { name: "3-mushaf",    url: "taiyabah://mushaf",    why: "the Qur'an" },
  { name: "4-qibla",     url: "taiyabah://qibla",     why: "Qibla direction" },
  { name: "5-zakat",     url: "taiyabah://zakat",     why: "zakat calculator" },
  { name: "6-alerts",    url: "taiyabah://alerts",    why: "choosing which notifications to get" },
];

/* Apple's required sizes, asserted rather than hoped for. If a runner image
 * ever ships a differently-sized device under the same name, that is a silent
 * way to produce a whole set App Store Connect will reject, and it would only
 * surface at upload. */
const DEVICES = [
  { label: "iphone-6.9", match: /^iPhone 16 Pro Max$/,   w: 1320, h: 2868 },
  { label: "ipad-13",    match: /^iPad Pro 13-inch/,     w: 2064, h: 2752 },
];

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

const devices = JSON.parse(sh("xcrun", ["simctl", "list", "devices", "available", "--json"])).devices;
const all = Object.entries(devices).flatMap(([, list]) => list);

let failed = 0;
let taken = 0;

for (const want of DEVICES) {
  const dev = all.find(d => want.match.test(d.name));
  if (!dev) {
    annotate("error", `No simulator matching ${want.match} on this runner — cannot produce the ${want.label} set Apple requires`);
    failed++;
    continue;
  }

  const outDir = path.join(OUT, want.label);
  fs.mkdirSync(outDir, { recursive: true });

  try {
    if (dev.state !== "Booted") sh("xcrun", ["simctl", "boot", dev.udid]);
    sh("xcrun", ["simctl", "bootstatus", dev.udid, "-b"]);
    sh("xcrun", ["simctl", "install", dev.udid, APP]);

    /* Suppress the first-run card by recording the offer as already made.
     * AsyncStorage keeps small values in a single manifest, so one file is the
     * whole of it. Best effort: if the layout ever changes, the card appears in
     * the screenshots and a human sees it immediately, which is a visible
     * failure rather than a silent one. */
    try {
      const data = sh("xcrun", ["simctl", "get_app_container", dev.udid, bundleId, "data"]).trim();
      const store = path.join(data, "Documents", "RCTAsyncLocalStorage_V1");
      fs.mkdirSync(store, { recursive: true });
      fs.writeFileSync(path.join(store, "manifest.json"),
        JSON.stringify({ "taiyabah.prefs.v1": JSON.stringify({ askedPush: true }) }));
    } catch (e) {
      annotate("warning", `${want.label}: could not pre-set preferences (${e.message}) — the first-run card may appear in these shots`);
    }

    /* The clock, battery and signal every Apple screenshot shows. Cosmetic,
     * but a 14% battery and "No SIM" in a listing look like an afterthought. */
    try {
      sh("xcrun", ["simctl", "status_bar", dev.udid, "override",
        "--time", "09:41", "--batteryState", "charged", "--batteryLevel", "100",
        "--cellularMode", "active", "--cellularBars", "4",
        "--dataNetwork", "wifi", "--wifiMode", "active", "--wifiBars", "3"]);
    } catch { /* cosmetic only; never worth failing a set over */ }

    sh("xcrun", ["simctl", "launch", dev.udid, bundleId]);
    /* The splash takes itself away on a timer and the first paint needs the
     * saved preferences to come back, so the first shot waits longer than the
     * rest. */
    wait(12000);

    for (const shot of SHOTS) {
      const file = path.join(outDir, `${shot.name}.png`);
      try {
        sh("xcrun", ["simctl", "openurl", dev.udid, shot.url]);
        wait(3500);
        sh("xcrun", ["simctl", "io", dev.udid, "screenshot", file]);

        const { w, h } = pngSize(file);
        const bytes = fs.statSync(file).size;

        if (w !== want.w || h !== want.h) {
          annotate("error", `${want.label}/${shot.name}: ${w}x${h}, but App Store Connect requires ${want.w}x${want.h}`);
          failed++;
          continue;
        }
        /* A solid colour compresses to almost nothing, so a near-empty file is
         * the one kind of wrong screenshot detectable without looking. */
        if (bytes < 40_000) {
          annotate("error", `${want.label}/${shot.name}: only ${bytes} bytes — almost certainly a blank or solid-colour screen`);
          failed++;
          continue;
        }
        taken++;
        annotate("notice", `${want.label}/${shot.name}.png — ${shot.why} (${w}x${h}, ${Math.round(bytes / 1024)}KB)`);
      } catch (e) {
        annotate("error", `${want.label}/${shot.name} failed: ${e.message}`);
        failed++;
      }
    }
  } catch (e) {
    annotate("error", `${want.label}: ${e.message}`);
    failed++;
  } finally {
    try { sh("xcrun", ["simctl", "shutdown", dev.udid]); } catch { /* already down */ }
  }
}

annotate("notice", `${taken} screenshot(s) written to native/store-shots. Look at them before uploading — nothing here can tell a good screen from a bad one.`);
if (failed) {
  annotate("error", `${failed} screenshot(s) could not be produced`);
  process.exit(1);
}
