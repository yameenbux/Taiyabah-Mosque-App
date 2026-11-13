/**
 * Taiyabah Masjid — a pooled event must not be read inside a state updater.
 * Copyright (c) 2026 Yameen Bux. All rights reserved. See LICENSE.md.
 *
 * WHAT WENT WRONG, 13 November 2026. The muṣḥaf page bar measured itself like
 * this:
 *
 *     onLayout={e => setBar(h => {
 *       const next = e.nativeEvent.layout.height;   //  <-- too late
 *       return h === next ? h : next;
 *     })}
 *
 * React may run that updater after the handler has already returned, and React
 * Native recycles the synthetic event the moment it does — so `e.nativeEvent`
 * is null by the time the line runs, and the app throws "Cannot read property
 * 'layout' of null". It is intermittent by construction: whether the updater
 * runs inside the handler or after it depends on batching, which depends on
 * the device and on what else is rendering. So it passes on a simulator and
 * crashes on somebody's OnePlus.
 *
 * It was reported SEVEN times — three from iOS 27.2.1 on 2.2.0, four from
 * Android 11 on 2.1.0 — into a table that no screen read. Nobody saw it for
 * five weeks, and it was in the build about to go to both stores.
 *
 * THE RULE. Read the event's values in the handler, then hand the plain values
 * to the updater:
 *
 *     onLayout={e => {
 *       const next = e.nativeEvent.layout.height;
 *       setBar(h => (h === next ? h : next));
 *     }}
 *
 * This check finds any `setX(... => ...)` whose updater body mentions
 * `nativeEvent`. It does not try to understand the code — it does not need to,
 * because there is no case where reading a pooled event inside an updater is
 * correct.
 *
 * Run:  node scripts/check-events.mjs
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const files = [];
(function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) { if (name !== "node_modules") walk(p); }
    else if (/\.(jsx?|tsx?)$/.test(name)) files.push(p);
  }
})("src");

const problems = [];
let updaters = 0;

/*  Comments and strings are blanked before scanning. The first version of this
    check did not do that, and it flagged the explanatory comment written
    directly above the very line it had just helped fix — the comment quotes the
    broken code on purpose. A check that cannot tell code from prose about code
    reports a fault that is not there, which is the fastest way to get a check
    ignored.

    Each comment or string is replaced by spaces of the same length, so every
    byte offset and line number still lines up with the real file. */
function blankCommentsAndStrings(src) {
  const out = src.split("");
  let i = 0;
  const blank = (from, to) => { for (let k = from; k < to && k < out.length; k++) if (out[k] !== "\n") out[k] = " "; };
  while (i < src.length) {
    const c = src[i], d = src[i + 1];
    if (c === "/" && d === "*") { const e = src.indexOf("*/", i + 2); const end = e === -1 ? src.length : e + 2; blank(i, end); i = end; continue; }
    if (c === "/" && d === "/") { let e = src.indexOf("\n", i); if (e === -1) e = src.length; blank(i, e); i = e; continue; }
    if (c === '"' || c === "'" || c === "`") {
      let k = i + 1;
      while (k < src.length) {
        if (src[k] === "\\") { k += 2; continue; }
        if (src[k] === c) break;
        k++;
      }
      blank(i, k + 1); i = k + 1; continue;
    }
    i++;
  }
  return out.join("");
}

for (const file of files) {
  const src = blankCommentsAndStrings(readFileSync(file, "utf8"));

  /*  Every `setSomething(` followed by an arrow function — that arrow is the
      updater form, the one React may defer.  */
  for (const m of src.matchAll(/\bset[A-Z]\w*\(\s*(?:\(\s*\w*\s*\)|\w+)\s*=>/g)) {
    const open = src.indexOf("{", m.index + m[0].length - 2);
    const arrowEnd = m.index + m[0].length;

    /*  Brace-match the updater body. An expression-bodied arrow (no `{`) is
        bounded by the setter's own closing paren instead.  */
    let body, depth = 0, i;
    if (open !== -1 && src.slice(arrowEnd, open).trim() === "") {
      for (i = open; i < src.length; i++) {
        if (src[i] === "{") depth++;
        else if (src[i] === "}") { depth--; if (depth === 0) break; }
      }
      body = src.slice(open, i + 1);
    } else {
      depth = 1;
      for (i = arrowEnd; i < src.length && depth > 0; i++) {
        if (src[i] === "(") depth++;
        else if (src[i] === ")") depth--;
      }
      body = src.slice(arrowEnd, i);
    }
    updaters++;

    if (/\bnativeEvent\b/.test(body)) {
      const line = src.slice(0, m.index).split("\n").length;
      problems.push(
        `${file}:${line} — ${m[0].trim()} reads nativeEvent inside the updater. ` +
        `React may run that updater after the handler returns, by which time the ` +
        `synthetic event is recycled and nativeEvent is null. Read the value in the ` +
        `handler first, then pass the plain value to the updater.`);
    }
  }
}

for (const p of problems) console.error("  FAIL  " + p);
if (problems.length) {
  console.error(`\n${problems.length} pooled-event read(s) inside a state updater.`);
  process.exit(1);
}
console.log(`no pooled event is read inside a state updater (${updaters} updater callbacks across ${files.length} files)`);
