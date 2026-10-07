/**
 * Taiyabah Masjid — boot an iPhone and an iPad, install the app, photograph it.
 * Copyright (c) 2026 Yameen Bux. All rights reserved. See LICENSE.md.
 *
 * "It compiled" and "it opens on a phone" are different claims, and this repo
 * has mistaken the first for the second before: a debug APK built cleanly,
 * installed cleanly, and then sat on the splash screen for ever because it had
 * no JavaScript in it. The Android smoke job exists because of that morning.
 * This is its iOS counterpart.
 *
 * It needs no Apple developer account. A simulator runs unsigned builds, so
 * everything short of distribution can be proved while enrolment is pending.
 *
 * Runs on a macOS runner only — xcrun and simctl do not exist anywhere else.
 *
 * It used to stop at "the process is alive", which is a weaker claim than it
 * sounds: an app stuck on its splash screen is alive, and so is one showing a
 * white rectangle. So it reads the screenshot it just took.
 *
 * What it can claim is modest and worth stating exactly. simctl cannot tap, so
 * this never gets past the first screen — at 14 seconds that is the first-run
 * reminder offer, the same one the Android smoke job answers "Not now" to. The
 * two thresholds say "a real screen drew", not "the right screen drew": a
 * laid-out screen covers its full height in text and shape, a splash screen
 * puts a logo in the middle and leaves the edges flat, and a dead launch
 * leaves a single colour.
 *
 * Checking WHICH screen, and whether its icons drew, stays with the Android
 * smoke job, which has uiautomator to find elements by name and can tap. Both
 * platforms ship the same subsetted icon font and the same JavaScript, so the
 * font is covered there for both.
 *
 * The thresholds are far below what a real screen produces, measured not
 * guessed: the app at iPhone and iPad sizes gives 7198 and 11954 colours with
 * 664 and 1122 along the bottom, a white screen gives 1 and 1, and a cream
 * splash with an antialiased logo gives 90 and 1.
 */
import { execFileSync, execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { decode, colours } from "./png.mjs";

const root = path.resolve(import.meta.dirname, "..");
const OUT = path.join(root, "ios-shots");
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

const sh = (cmd, args, opts = {}) =>
  execFileSync(cmd, args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], ...opts });

/* The .app the build step produced. Found rather than assumed, because the
   product name follows expo.name and this should not need editing when that
   changes. */
const products = path.join(root, "ios", "build", "Build", "Products");
if (!fs.existsSync(products)) {
  console.error(`no build products at ${products} — did the build step run?`);
  process.exit(1);
}
const dir = fs.readdirSync(products).find(d => d.includes("iphonesimulator"));
const appDir = path.join(products, dir);
const app = fs.readdirSync(appDir).find(f => f.endsWith(".app"));
if (!app) { console.error(`no .app inside ${appDir}`); process.exit(1); }
const APP = path.join(appDir, app);
const plist = path.join(APP, "Info.plist");
const bundleId = sh("/usr/libexec/PlistBuddy", ["-c", "Print :CFBundleIdentifier", plist]).trim();
console.log(`app: ${app}\nbundle: ${bundleId}\n`);

/* A phone and a tablet, because supportsTablet is true now and an iPad running
   a stretched phone layout is exactly the thing being checked for. */
const DEVICES = [
  { label: "iphone", match: /^iPhone 16 Pro$/ },
  { label: "ipad",   match: /^iPad Pro 13-inch/ },
];

const devices = JSON.parse(sh("xcrun", ["simctl", "list", "devices", "available", "--json"])).devices;
const all = Object.entries(devices).flatMap(([runtime, list]) =>
  list.map(d => ({ ...d, runtime })));

let failures = 0;
for (const want of DEVICES) {
  const dev = all.find(d => want.match.test(d.name));
  if (!dev) {
    console.error(`FAIL  no simulator matching ${want.match} is available`);
    console.error("      available: " + [...new Set(all.map(d => d.name))].join(", "));
    failures++; continue;
  }
  console.log(`--- ${dev.name} ---`);
  try {
    if (dev.state !== "Booted") sh("xcrun", ["simctl", "boot", dev.udid]);
    sh("xcrun", ["simctl", "bootstatus", dev.udid, "-b"]);
    sh("xcrun", ["simctl", "install", dev.udid, APP]);
    sh("xcrun", ["simctl", "launch", dev.udid, bundleId]);

    /* Give the bundle time to load and the first screen time to draw. A
       splash-screen screenshot proves nothing, which is the failure this whole
       script exists to catch. */
    await new Promise(r => setTimeout(r, 14000));

    const shot = path.join(OUT, `${want.label}-home.png`);
    sh("xcrun", ["simctl", "io", dev.udid, "screenshot", shot]);
    const bytes = fs.statSync(shot).size;
    console.log(`  shot: ${path.basename(shot)} (${Math.round(bytes / 1024)} KB)`);

    /* Did anything draw, and did the app get past its splash screen? */
    const img = decode(shot);
    const whole = colours(img);
    const strip = colours(img, 0, Math.round(img.height * 0.88), img.width, Math.round(img.height * 0.12));
    console.log(`  ink: ${whole} colours overall, ${strip} along the bottom ` +
                `(${img.width}x${img.height})`);
    if (whole < 100) {
      console.error(`  FAIL  the screen holds ${whole} colours — that is a blank or flat ` +
                    `rectangle, not the app`);
      failures++;
    } else if (strip < 10) {
      console.error(`  FAIL  the screen is busy in the middle and flat along the bottom ` +
                    `(${strip} colours) — that is the shape of a splash screen, not of a ` +
                    `laid-out one, so the app most likely never finished starting`);
      failures++;
    }

    /* Is it actually running, or did it launch and die? */
    const running = sh("xcrun", ["simctl", "spawn", dev.udid, "launchctl", "list"], { stdio: ["ignore","pipe","ignore"] })
      .split("\n").some(l => l.includes(bundleId));
    if (!running) { console.error(`  FAIL  ${bundleId} is not running — it launched and exited`); failures++; }
    else console.log("  still running after 14s");

    /* A crash log written in the last couple of minutes is the app falling
       over on launch, which a screenshot of a white screen would not show. */
    const crashDir = `${process.env.HOME}/Library/Logs/DiagnosticReports`;
    if (fs.existsSync(crashDir)) {
      const recent = fs.readdirSync(crashDir)
        .filter(f => /Taiyabah|TaiyabahMasjid/i.test(f))
        .filter(f => Date.now() - fs.statSync(path.join(crashDir, f)).mtimeMs < 180000);
      if (recent.length) { console.error(`  FAIL  crash report(s): ${recent.join(", ")}`); failures++; }
    }
  } catch (e) {
    console.error(`  FAIL  ${String(e.message).split("\n")[0]}`);
    failures++;
  }
}

console.log(failures ? `\n${failures} device(s) failed` : "\nthe app built, installed, launched and drew on both");
process.exit(failures ? 1 : 0);
