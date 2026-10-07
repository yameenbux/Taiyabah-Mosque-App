/**
 * Taiyabah Masjid — what app.json declares, the built app has to carry.
 * Copyright (c) 2026 Yameen Bux. All rights reserved. See LICENSE.md.
 *
 * app.json asks for entitlements and Info.plist keys; `expo prebuild` writes
 * them into a generated Xcode project; the build copies them into the .app.
 * Three steps, none of which fails loudly if a key is dropped — and the
 * consequences are not cosmetic:
 *
 *   - no NSLocationWhenInUseUsageDescription and iOS does not warn, it KILLS
 *     the app the moment the Qibla screen asks for a location;
 *   - no NSMotionUsageDescription and the same happens to the compass;
 *   - no aps-environment and push silently never arrives, which looks exactly
 *     like "nobody has sent one yet";
 *   - no App Group and the widget cannot read the prayer times;
 *   - no ITSAppUsesNonExemptEncryption and every single upload stops to ask
 *     the export-compliance question by hand.
 *
 * The Android job already proves prebuild wrote what app.json asked for. This
 * is that, for iOS, and it reads the BUILT artefact rather than the generated
 * project, because the question is what ships.
 *
 *   node scripts/check-ios-config.mjs <path to the built .app>
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const app = process.argv[2];
if (!app) { console.error("usage: check-ios-config.mjs <path to .app>"); process.exit(2); }
if (!fs.existsSync(app)) { console.error(`no such app: ${app}`); process.exit(2); }

const root = path.resolve(import.meta.dirname, "..");
const declared = JSON.parse(fs.readFileSync(path.join(root, "app.json"), "utf8")).expo.ios || {};

/**
 * The smallest XML plist parser that answers "which keys, and what strings".
 * Enough for a flat <dict> of strings, booleans and arrays of strings, which
 * is all an Info.plist or an .entitlements file is at this level.
 */
function parseXmlPlist(text) {
  const dict = text.match(/<dict>([\s\S]*)<\/dict>/);
  if (!dict) return null;
  const out = {};
  const re = /<key>([^<]*)<\/key>\s*(<true\s*\/>|<false\s*\/>|<string>([\s\S]*?)<\/string>|<array>([\s\S]*?)<\/array>)/g;
  const unescape = v => v.replace(/&lt;/g, "<").replace(/&gt;/g, ">")
                         .replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&");
  for (const m of dict[1].matchAll(re)) {
    const key = unescape(m[1]);
    if (m[2].startsWith("<true")) out[key] = true;
    else if (m[2].startsWith("<false")) out[key] = false;
    else if (m[3] !== undefined) out[key] = unescape(m[3]);
    else out[key] = [...m[4].matchAll(/<string>([\s\S]*?)<\/string>/g)].map(a => unescape(a[1]));
  }
  return out;
}

/**
 * A plist's keys and string values, however it is encoded. plutil is
 * authoritative and is there on macOS, where this runs; an XML plist is
 * parsed directly, which is what makes the value checks testable off a Mac;
 * and a binary plist with no plutil falls back to a byte search, which can
 * still answer "is this present" because both encodings store key names and
 * string values as plain bytes.
 */
function reader(file) {
  try {
    const json = JSON.parse(execFileSync("plutil", ["-convert", "json", "-o", "-", file], { encoding: "utf8" }));
    const flat = new Set();
    (function walk(v) {
      if (Array.isArray(v)) v.forEach(walk);
      else if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) { flat.add(k); walk(x); }
      else flat.add(String(v));
    })(json);
    return { how: "plutil", json, has: s => flat.has(String(s)) };
  } catch {
    const text = fs.readFileSync(file, "utf8");
    const json = text.startsWith("<?xml") ? parseXmlPlist(text) : null;
    if (json) {
      const flat = new Set();
      (function walk(v) {
        if (Array.isArray(v)) v.forEach(walk);
        else if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) { flat.add(k); walk(x); }
        else flat.add(String(v));
      })(json);
      return { how: "XML plist", json, has: s => flat.has(String(s)) };
    }
    const bytes = fs.readFileSync(file, "latin1");
    return { how: "byte search", json: null, has: s => bytes.includes(String(s)) };
  }
}

const problems = [];
const check = (r, file, what, why) => {
  if (r.has(what)) console.log(`  ok      ${what}`);
  else { console.log(`  MISSING ${what}`); problems.push(`${path.basename(file)} has no ${what} — ${why}`); }
};

/* ---- Info.plist, from inside the built bundle ---- */
const info = path.join(app, "Info.plist");
if (!fs.existsSync(info)) { console.error(`FAIL  ${app} contains no Info.plist`); process.exit(1); }
const ip = reader(info);
console.log(`Info.plist (read by ${ip.how}):`);

for (const key of Object.keys(declared.infoPlist || {})) {
  if (key === "UIBackgroundModes") continue;           // checked by value below
  check(ip, info, key, "app.json declares it and prebuild did not carry it through");
}
for (const mode of declared.infoPlist?.UIBackgroundModes || [])
  check(ip, info, mode, "app.json declares it as a background mode");
check(ip, info, declared.bundleIdentifier, "the bundle identifier should be the one app.json names");

/* A declared usage string that arrived EMPTY is as fatal as one that is
   absent, and only plutil can see the difference. */
if (ip.json) {
  for (const [key, want] of Object.entries(declared.infoPlist || {})) {
    if (typeof want !== "string") continue;
    const got = ip.json[key];
    if (typeof got === "string" && got.trim() === "")
      problems.push(`${key} is present but empty — iOS treats that as missing and kills the app`);
  }
}

/* ---- entitlements, from the generated project ---- */
const want = declared.entitlements || {};
if (Object.keys(want).length) {
  const ios = path.join(root, "ios");
  const found = fs.existsSync(ios)
    ? fs.readdirSync(ios, { recursive: true }).filter(f => String(f).endsWith(".entitlements")).map(f => path.join(ios, String(f)))
    : [];
  if (!found.length) {
    problems.push(`app.json declares ${Object.keys(want).join(", ")} but prebuild wrote no .entitlements file at all`);
    console.log("\nentitlements: NONE GENERATED");
  } else {
    const text = found.map(f => fs.readFileSync(f, "utf8")).join("\n");
    console.log(`\nentitlements (${found.map(f => path.basename(f)).join(", ")}):`);
    for (const [key, value] of Object.entries(want)) {
      const values = Array.isArray(value) ? value : [value];
      for (const v of [key, ...values.filter(v => typeof v === "string")]) {
        if (text.includes(v)) console.log(`  ok      ${v}`);
        else { console.log(`  MISSING ${v}`); problems.push(`no entitlement "${v}" — app.json declares it`); }
      }
    }
  }
}

console.log("");
for (const p of problems) console.log(`FAIL  ${p}`);
if (problems.length) {
  console.log(`\n${problems.length} thing(s) app.json declares did not reach the built app.`);
  process.exit(1);
}
console.log("everything app.json declares for iOS is in the built app");
