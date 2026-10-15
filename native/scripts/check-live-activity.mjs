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

if (fail.length) {
  console.error(`\n${fail.length} problem(s) with the Live Activity:\n`);
  for (const m of fail) console.error("  " + m);
  console.error("");
  process.exit(1);
}
console.log("the Live Activity's app and widget halves agree, and the bundle registers both widgets");
