/**
 * Every name a source file uses, actually defined somewhere.
 *
 * Written the day a one-line change shipped `tabBar({...})` into the tab
 * navigator and forgot to import it. Nothing caught it: the file parses — a
 * free identifier is perfectly legal JavaScript — the bundle builds, because
 * Metro only resolves the imports that ARE written, and the test suite does
 * not mount React Native. The first thing that would have noticed is a phone,
 * with a red screen, on the one component every screen in the app sits inside.
 *
 * Babel already knows the answer: after it has walked a file, scope.globals is
 * exactly the set of names referenced but never bound. Everything here is
 * deciding which of those are real globals and which are a missing import.
 *
 *   node scripts/check-imports.mjs
 */
import babel from "@babel/core";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");

/* Genuinely global at runtime, so not a missing import. Deliberately a list
   rather than "anything capitalised": the bug this catches is a capitalised
   helper that was never imported. */
const GLOBALS = new Set([
  /* language */
  "globalThis", "undefined", "Infinity", "NaN", "Object", "Array", "String",
  "Number", "Boolean", "Symbol", "BigInt", "Math", "JSON", "Date", "RegExp",
  "Error", "TypeError", "RangeError", "SyntaxError", "Promise", "Map", "Set",
  "WeakMap", "WeakSet", "Proxy", "Reflect", "Intl", "Function",
  "parseInt", "parseFloat", "isNaN", "isFinite", "eval",
  "encodeURIComponent", "decodeURIComponent", "encodeURI", "decodeURI",
  "ArrayBuffer", "Uint8Array", "Int8Array", "Uint16Array", "Uint32Array",
  "Float32Array", "Float64Array", "DataView", "structuredClone",
  /* the runtime React Native gives us */
  "console", "setTimeout", "clearTimeout", "setInterval", "clearInterval",
  "requestAnimationFrame", "cancelAnimationFrame", "queueMicrotask",
  "fetch", "Headers", "Request", "Response", "AbortController", "AbortSignal",
  "FormData", "Blob", "File", "FileReader", "URL", "URLSearchParams",
  "TextEncoder", "TextDecoder", "atob", "btoa", "performance", "navigator",
  "__DEV__", "process", "require", "module", "exports", "__dirname",
  /* Hermes has these; a browser build would have more */
  "WebSocket", "XMLHttpRequest", "Event", "EventTarget",
]);

/* Babel tells us what it found; the plugin is the whole of the analysis. */
function freeNames(file) {
  let out = [];
  babel.transformFileSync(file, {
    cwd: root, babelrc: false, configFile: false,
    presets: [["babel-preset-expo", {}]],
    /* Before the presets, so the names are the ones the author wrote rather
       than whatever the JSX and Reanimated transforms leave behind. */
    plugins: [{ visitor: { Program(p) { out = Object.keys(p.scope.globals); } } }],
  });
  return out;
}

const files = [];
(function walk(d) {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f);
    if (fs.statSync(p).isDirectory()) { if (!/node_modules|dist|android|\.expo/.test(p)) walk(p); }
    else if (/\.(jsx?|mjs)$/.test(f)) files.push(p);
  }
})(path.join(root, "src"));
files.push(path.join(root, "index.js"));
files.sort();

let bad = 0;
for (const f of files) {
  const rel = path.relative(root, f);
  let free;
  try { free = freeNames(f); }
  catch (e) { /* parse-check.mjs is the one that reports syntax */ continue; }
  const missing = free.filter(n => !GLOBALS.has(n)).sort();
  if (!missing.length) continue;
  bad++;
  console.log(`FAIL  ${rel}\n      used but never defined or imported: ${missing.join(", ")}`);
  if (process.env.GITHUB_ACTIONS)
    console.log(`::error file=native/${rel}::used but never defined or imported: ${missing.join(", ")}`);
}
console.log(bad ? `\n${bad} file(s) use a name that is not there`
                : `\nall ${files.length} files: every name accounted for`);
process.exit(bad ? 1 : 0);
