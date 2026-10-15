/**
 * Taiyabah Masjid — the Live Activity's two halves still agree.
 * Copyright (c) 2026 Yameen Bux. All rights reserved. See LICENSE.md.
 *
 * ActivityKit needs the app target and the widget extension to agree on one
 * type. They are separate compilation units with no shared framework, so the
 * declaration is written out twice — and drift between the two copies does
 * NOT fail a build. Each target compiles its own copy perfectly well. What
 * happens instead is that Activity.request succeeds, nothing appears on the
 * phone, and there is nothing anywhere to say why.
 *
 * There is no Swift toolchain on Linux and no ActivityKit on it either, so
 * none of this can be compiled here. What CAN be checked mechanically is
 * checked here, and the rest is honest about being unverified until the iOS
 * build runs.
 *
 *   node scripts/check-live-activity.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const root = path.resolve(import.meta.dirname, "..");
const WIDGET = "targets/widget/activity.swift";
const MODULE = "modules/live-activity/ios/TaiyabahLiveActivityModule.swift";
const INDEX = "targets/widget/index.swift";
const JS = "modules/live-activity/index.js";

const fail = [];
const say = (m) => fail.push(m);
const read = (rel) => {
  const f = path.join(root, rel);
  if (!fs.existsSync(f)) { say(`${rel} is missing`); return null; }
  return fs.readFileSync(f, "utf8");
};

const widget = read(WIDGET), mod = read(MODULE), index = read(INDEX), js = read(JS);
if (!widget || !mod || !index || !js) {
  for (const m of fail) console.error("  " + m);
  process.exit(1);
}

/* 1. The shared declaration, character for character. */
const block = (src, rel) => {
  const m = src.match(/\/\* ─── shared-with-app:begin[\s\S]*?shared-with-app:end[^\n]*\n?/);
  if (!m) { say(`${rel} has no shared-with-app block, so nothing can be compared`); return null; }
  return m[0];
};
const a = block(widget, WIDGET), b = block(mod, MODULE);
if (a && b && a !== b) {
  const al = a.split("\n"), bl = b.split("\n");
  const i = al.findIndex((l, n) => l !== bl[n]);
  say(`the shared ActivityKit type has drifted between ${WIDGET} and ${MODULE}.\n` +
      `      first difference at line ${i + 1} of the block:\n` +
      `        ${WIDGET}: ${JSON.stringify(al[i] ?? "(end of block)")}\n` +
      `        ${MODULE}: ${JSON.stringify(bl[i] ?? "(end of block)")}\n` +
      `      They must match exactly or the activity never appears, with no build error.`);
}

/* 2. Exactly one @main in the widget extension. Two is a compile error; none
      means neither widget is registered and the extension does nothing. */
const mains = [...widget.matchAll(/^@main\b/gm), ...index.matchAll(/^@main\b/gm)];
if (mains.length !== 1) {
  say(`the widget extension declares ${mains.length} @main entry points; it needs exactly one ` +
      `(the WidgetBundle in ${WIDGET}, now that there are two widgets in it)`);
}

/* 3. Every widget in the extension has to be in the bundle, or it is built
      and then never offered to anyone. */
const bundle = widget.match(/struct\s+\w+\s*:\s*WidgetBundle\s*\{[\s\S]*?\n\}/);
if (!bundle) say(`${WIDGET} has no WidgetBundle, so only one widget can be registered`);
else {
  const declared = [...widget.matchAll(/^struct\s+(\w+)\s*:\s*Widget\s*\{/gm),
                    ...index.matchAll(/^struct\s+(\w+)\s*:\s*Widget\s*\{/gm)].map((m) => m[1]);
  for (const name of declared) {
    if (!new RegExp(`\\b${name}\\s*\\(`).test(bundle[0]))
      say(`${name} is a Widget but is not in the WidgetBundle, so nobody will ever be offered it`);
  }
}

/* 4. The JS side and the Swift side have to name the same module and the same
      functions. A rename on one side is a runtime no-op on the other: the
      optional native module simply resolves to null and every call quietly
      returns false, which looks exactly like a phone that does not support
      Live Activities. */
const swiftName = mod.match(/Name\("([^"]+)"\)/)?.[1];
const jsName = js.match(/requireOptionalNativeModule\("([^"]+)"\)/)?.[1];
if (!swiftName) say(`${MODULE} does not declare a module Name()`);
else if (swiftName !== jsName)
  say(`${JS} asks for the native module "${jsName}" but ${MODULE} is called "${swiftName}" — ` +
      `every call would silently return false, indistinguishable from an unsupported phone`);

const configured = JSON.parse(read("modules/live-activity/expo-module.config.json")).apple?.modules || [];
const swiftClass = mod.match(/class\s+(\w+)\s*:\s*Module\b/)?.[1];
if (swiftClass && !configured.includes(swiftClass))
  say(`expo-module.config.json lists ${JSON.stringify(configured)} but the class is ${swiftClass}, ` +
      `so autolinking will not find it`);

for (const fn of ["isAvailable", "start", "end"]) {
  const inSwift = new RegExp(`(?:Async)?Function\\("${fn}"\\)`).test(mod);
  const inJs = new RegExp(`native[?.]*\\.${fn}\\b`).test(js);
  if (inSwift && !inJs) say(`the native module exposes ${fn}() but ${JS} never calls it`);
  if (!inSwift && inJs) say(`${JS} calls ${fn}() but the native module does not expose it`);
}

/* 5. The app's Info.plist has to opt in, or ActivityKit refuses at runtime
      with no build-time warning at all. */
const appJson = JSON.parse(read("app.json"));
if (appJson.expo?.ios?.infoPlist?.NSSupportsLiveActivities !== true)
  say(`app.json does not set ios.infoPlist.NSSupportsLiveActivities to true, ` +
      `so iOS refuses to start the activity at runtime and says nothing at build time`);

/* Swift with its comments and string literals blanked out, line numbering
   preserved. Both checks below need it: scanning raw source finds the thing
   being warned about inside the comment explaining the warning. */
const stripped = (src) => {
  let out = "", i = 0;
  while (i < src.length) {
    const two = src.slice(i, i + 2);
    if (two === "//") { while (i < src.length && src[i] !== "\n") { out += " "; i++; } continue; }
    if (two === "/*") {
      let nest = 1; out += "  "; i += 2;
      while (i < src.length && nest) {
        if (src.slice(i, i + 2) === "/*") { nest++; out += "  "; i += 2; continue; }
        if (src.slice(i, i + 2) === "*/") { nest--; out += "  "; i += 2; continue; }
        out += src[i] === "\n" ? "\n" : " "; i++;
      }
      continue;
    }
    if (src[i] === '"') {
      out += " "; i++;
      while (i < src.length && src[i] !== '"') { if (src[i] === "\\") { out += " "; i++; } out += src[i] === "\n" ? "\n" : " "; i++; }
      out += " "; i++;
      continue;
    }
    out += src[i]; i++;
  }
  return out;
};

/* 6. Braces and parens balanced, outside comments and strings. It is a poor
      substitute for a compiler, but there is no Swift on Linux and an
      unbalanced brace is the one error that is both easy to make in a file
      this nested and certain to cost a whole build cycle to discover. */
for (const [rel, src] of [[WIDGET, widget], [MODULE, mod], [INDEX, index]]) {
  const code = stripped(src);
  const depth = { "{": 0, "(": 0, "[": 0 };
  const close = { "}": "{", ")": "(", "]": "[" };
  let line = 1, broke = false;
  for (let i = 0; i < code.length && !broke; i++) {
    const c = code[i];
    if (c === "\n") { line++; continue; }
    if (c in depth) depth[c]++;
    else if (c in close) {
      depth[close[c]]--;
      if (depth[close[c]] < 0) { say(`${rel} closes a ${c} that was never opened, at line ${line}`); broke = true; }
    }
  }
  if (!broke) for (const [open, n] of Object.entries(depth))
    if (n > 0) say(`${rel} leaves ${n} ${open} unclosed`);
}

/* 7. A ClosedRange built from Date() against a stored instant. Swift traps
      when the lower bound is above the upper one, and this activity outlives
      its own iqāmah on purpose — so `Date()...state.iqamah` is a crash in the
      widget extension for the few minutes after every single jamāʿah. Both
      ends have to be instants that are already known to be in order. */
for (const [rel, src] of [[WIDGET, widget], [MODULE, mod], [INDEX, index]]) {
  const code = stripped(src);
  for (const m of code.matchAll(/\bDate\(\)\s*\.\.\./g)) {
    const line = code.slice(0, m.index).split("\n").length;
    say(`${rel}:${line} builds a range starting at Date(). If the other end is ever in the past ` +
        `Swift traps, and this activity deliberately outlives its iqāmah — use the two stored instants instead`);
  }
}

/* 8. Two Swift files in one target are one module. A file-private type in
      one and an internal type of the SAME NAME in the other does not fail to
      compile — Swift shadows, the narrower declaration wins inside its own
      file, and the diagnostics you get later point anywhere but here.
      index.swift and activity.swift both declared `Mark` and `Until`, with
      different members, and nothing said a word. */
{
  const names = (src) => {
    const out = new Map();
    for (const m of stripped(src).matchAll(/^\s*(?:private |fileprivate |public |internal )?(?:struct|enum|class|actor|protocol|typealias)\s+(\w+)/gm))
      out.set(m[1], (stripped(src).slice(0, m.index).split("\n").length));
    return out;
  };
  const a = names(widget), b = names(index);
  for (const [name, line] of a)
    if (b.has(name))
      say(`both ${WIDGET}:${line} and ${INDEX}:${b.get(name)} declare a type called ${name}. ` +
          `They are one module, so one shadows the other instead of failing — rename one.`);
}

/* 9. A date rendered by SwiftUI's own styling follows the PHONE's 24-hour
      setting and region, so the same jamāʿah reads "13:30" on the Lock Screen
      and "1:30pm" on the screen behind it. The app formats times one way
      everywhere; so must this. These are fixed instants, not counters, so
      there is no cost to formatting them. */
for (const [rel, src] of [[WIDGET, widget]]) {
  for (const m of stripped(src).matchAll(/\bstyle:\s*\.(time|date)\b/g)) {
    const line = stripped(src).slice(0, m.index).split("\n").length;
    say(`${rel}:${line} renders a date with SwiftUI's own styling, which follows the phone's ` +
        `24-hour setting — use pretty(), so it matches every other screen in the app`);
  }
}

/* 10. ActivityKit arrived in iOS 16.1, and the APP target does not deploy
       that high — Expo SDK 52 defaults to 15.1 and nothing here raises it. A
       type conforming to ActivityAttributes therefore has to say when it
       exists, or the app target does not compile at all. The widget
       extension deploys to 17.0 and would never have noticed. */
for (const [rel, src] of [[WIDGET, widget], [MODULE, mod]]) {
  const code = stripped(src);
  for (const m of code.matchAll(/(?:^|\n)([^\n]*)\n\s*(?:public |internal )?struct\s+(\w+)\s*:\s*ActivityAttributes/g)) {
    if (!/@available\(\s*iOS\s*1[6-9]/.test(m[1]))
      say(`${rel}: struct ${m[2]} conforms to ActivityAttributes with no @available line above it. ` +
          `ActivityKit is iOS 16.1+ and the app target deploys lower, so this will not compile.`);
  }
}

/* 11. The local module is a CocoaPod. A pod that declares a higher iOS
       platform than the app makes `pod install` refuse the whole workspace —
       not this pod, the whole thing. Everything needing a later iOS is
       guarded in the Swift, so the podspec must match the app. */
{
  const podspec = read("modules/live-activity/ios/TaiyabahLiveActivity.podspec");
  const want = parseFloat((podspec?.match(/:ios\s*=>\s*'([\d.]+)'/) || [])[1]);
  const props = (appJson.expo?.plugins || []).find(
    (p) => Array.isArray(p) && p[0] === "expo-build-properties");
  /* Expo SDK 52's own default when nothing sets it. */
  const app = parseFloat(props?.[1]?.ios?.deploymentTarget ?? "15.1");
  if (!(want <= app))
    say(`the podspec asks for iOS ${want} but the app deploys to ${app}, so pod install will refuse ` +
        `the whole workspace. Lower the podspec and guard the newer APIs in Swift instead.`);
}

/* 12. Everything here has to actually BE in the repository. The native half
       of this module lived under modules/live-activity/ios/, and .gitignore
       carried a bare `ios/` — which git matches at any depth, not just the
       prebuild output it was written for. So the JavaScript and the module
       config were committed and the Swift and the podspec were not. Nothing
       failed locally, because the files were on this disk; the build would
       have gone looking for a module class that is not in the repository.

       Checked against git rather than the filesystem for exactly that
       reason: "it works here" is the failure mode. */
{
  const mustShip = [WIDGET, MODULE, INDEX, JS,
                    "modules/live-activity/expo-module.config.json",
                    "modules/live-activity/ios/TaiyabahLiveActivity.podspec"];
  let tracked = null;
  try {
    tracked = new Set(execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard", "."],
                                   { cwd: root, encoding: "utf8" }).split("\n").filter(Boolean));
  } catch { /* not a git checkout: nothing to say */ }
  if (tracked) {
    for (const rel of mustShip) {
      if (!fs.existsSync(path.join(root, rel))) { say(`${rel} does not exist`); continue; }
      if (!tracked.has(rel))
        say(`${rel} is on this disk but git will not ship it — it is covered by a .gitignore rule. ` +
            `The build would be missing it.`);
    }
  }
}

if (fail.length) {
  console.error(`\n${fail.length} problem(s) with the Live Activity:\n`);
  for (const m of fail) console.error("  " + m);
  console.error("");
  process.exit(1);
}
console.log("the Live Activity's app and widget halves agree, and the bundle registers both widgets");
