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
import { decode, colours, ascii, palette, dominant } from "./png.mjs";

const root = path.resolve(import.meta.dirname, "..");
const OUT = path.join(root, "ios-shots");
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

const sh = (cmd, args, opts = {}) =>
  execFileSync(cmd, args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], ...opts });

/**
 * Why the app died, printed into the job log.
 *
 * An .ips is two JSON documents one after the other: a header line, then the
 * report. What matters is the exception, the termination reason — which is
 * where a missing framework or a failed dynamic link says so in plain words —
 * and the top of whichever thread crashed.
 */
function report(file) {
  let head = {}, body = {};
  try {
    const text = fs.readFileSync(file, "utf8");
    const nl = text.indexOf("\n");
    head = JSON.parse(text.slice(0, nl));
    body = JSON.parse(text.slice(nl + 1));
  } catch (e) {
    console.error(`    (could not read ${path.basename(file)}: ${e.message})`);
    return;
  }
  const say = (k, v) => { if (v) console.error(`    ${k}: ${v}`); };
  say("app", `${head.app_name || "?"} ${head.app_version || ""} (${head.bundleID || "?"})`);
  say("exception", [body.exception?.type, body.exception?.signal, body.exception?.subtype]
        .filter(Boolean).join(" "));
  say("reason", body.termination?.reason || body.exception?.message);
  say("namespace", body.termination?.namespace);
  if (body.asi) for (const [lib, lines] of Object.entries(body.asi))
    for (const l of lines) say(`runtime (${lib})`, l);
  say("last exception", (body.legacyInfo?.exceptionMessage || "").trim());

  /* The faulting thread's top frames, with the image each sits in, which is
     usually the whole answer: our binary, Hermes, or something else entirely. */
  const idx = body.faultingThread ?? 0;
  const frames = body.threads?.[idx]?.frames || [];
  const images = body.usedImages || [];
  if (frames.length) {
    console.error(`    thread ${idx} (faulting):`);
    for (const f of frames.slice(0, 12)) {
      const img = images[f.imageIndex] || {};
      console.error(`      ${(img.name || "?").padEnd(22)} ${f.symbol || "0x" + (f.imageOffset ?? 0).toString(16)}`);
    }
  }
}

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

    /* Wait for the screen to settle rather than for a fixed number of
       seconds. A fixed wait is a guess that is either wasteful or wrong, and
       on this job it was very nearly wrong: at fourteen seconds the iPad
       scored twenty colours along its bottom edge against a threshold of ten,
       which is the shape of a splash screen that had not finished. So keep
       photographing until the screen looks laid out, and say how long it
       took — a number that drifts upward is worth knowing about. */
    const shot = path.join(OUT, `${want.label}-home.png`);
    const began = Date.now();
    let img, whole = 0, strip = 0, waited = 0;
    for (let attempt = 0; attempt < 12; attempt++) {
      await new Promise(r => setTimeout(r, attempt === 0 ? 8000 : 4000));
      sh("xcrun", ["simctl", "io", dev.udid, "screenshot", shot]);
      img = decode(shot);
      whole = colours(img);
      strip = colours(img, 0, Math.round(img.height * 0.88), img.width, Math.round(img.height * 0.12));
      waited = Math.round((Date.now() - began) / 1000);
      if (whole >= 100 && strip >= 10) break;
    }
    const bytes = fs.statSync(shot).size;
    console.log(`  shot: ${path.basename(shot)} (${Math.round(bytes / 1024)} KB) after ${waited}s`);
    console.log(`  ink: ${whole} colours overall, ${strip} along the bottom ` +
                `(${img.width}x${img.height})`);
    console.log(`  palette: ${palette(img).join("  ")}`);

    /* The artefact is uploaded, but the client that reads these logs cannot
       follow GitHub's redirect to blob storage, so the picture is printed as
       well. Dark to light, left to right, top to bottom. */
    console.log(ascii(img, 30, 44).split("\n").map(l => "  | " + l).join("\n"));
    /* The React Native error screen: a wall of black with a red banner of
       message text across it. It is what a build with no embedded JavaScript
       draws, it is NOT blank and NOT a splash, so every other test here passes
       on it — which is exactly what happened for five green runs. This app
       never shows a black screen: the lightest theme is cream and the darkest
       card is #24091A, nowhere near it. */
    const top = dominant(img);
    const nearBlack = top.r < 16 && top.g < 16 && top.b < 16;
    if (nearBlack && top.share > 0.4) {
      console.error(`  FAIL  ${Math.round(top.share * 100)}% of the screen is ${top.hex} — ` +
                    `this app has no black screen, so that is the React Native error ` +
                    `screen. The usual cause is a build with no embedded JavaScript ` +
                    `(Debug rather than Release), which launches and survives and runs ` +
                    `none of this project's code.`);
      failures++;
    } else if (whole < 100) {
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
    if (!running) {
      console.error(`  FAIL  ${bundleId} is not running — it launched and exited`);
      /* A React Native fatal does not reach the crash report as anything but
         an abort; the message it printed on the way down is in the device log,
         and that message is usually the entire diagnosis. */
      try {
        const out = sh("xcrun", ["simctl", "spawn", dev.udid, "log", "show", "--last", "4m",
                                 "--style", "compact",
                                 "--predicate", `processImagePath CONTAINS "${app.split("/").pop().replace(".app", "")}"`],
                       { stdio: ["ignore", "pipe", "ignore"], maxBuffer: 64 * 1024 * 1024 })
          .split("\n").filter(l => l.trim()).slice(-80);
        if (out.length) {
          console.error("    what the device log says:");
          /* 220 characters cut the one line that matters in half: an Invariant
             Violation says which module is missing and then, past the cut, the
             stack that says who asked for it. The React Native lines are the
             whole diagnosis, so they are printed whole. */
          for (const l of out) {
            const keep = /com\.facebook\.react|Invariant|Exception|Error|fatal/i.test(l) ? 4000 : 200;
            console.error(`      ${l.slice(0, keep)}`);
          }
        }
      } catch (e) { console.error(`    (device log unavailable: ${String(e.message).split("\n")[0]})`); }
      failures++;
    } else console.log("  still running");

    /* A crash log written in the last couple of minutes is the app falling
       over on launch, which a screenshot of a white screen would not show.
       Naming the file was useless from here — the report lives on the runner
       and the artefact cannot be fetched — so the reason is printed instead. */
    const crashDir = `${process.env.HOME}/Library/Logs/DiagnosticReports`;
    if (fs.existsSync(crashDir)) {
      const recent = fs.readdirSync(crashDir)
        .filter(f => /Taiyabah|TaiyabahMasjid/i.test(f))
        .filter(f => Date.now() - fs.statSync(path.join(crashDir, f)).mtimeMs < 180000);
      if (recent.length) {
        console.error(`  FAIL  crash report(s): ${recent.join(", ")}`);
        for (const f of recent.slice(0, 2)) report(path.join(crashDir, f));
        failures++;
      }
    }
  } catch (e) {
    console.error(`  FAIL  ${String(e.message).split("\n")[0]}`);
    failures++;
  }
}

console.log(failures ? `\n${failures} device(s) failed` : "\nthe app built, installed, launched and drew on both");
process.exit(failures ? 1 : 0);
