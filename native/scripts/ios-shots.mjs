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
 */
import { execFileSync, execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const OUT = path.join(root, ".ios-shots");
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
