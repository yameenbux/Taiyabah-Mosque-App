#!/usr/bin/env node
/* The two tasbīḥ counters must slice the dhikr the same way.
 * Copyright (c) 2026 Yameen Bux. All rights reserved. See LICENSE.md.
 *
 * The counter exists twice — index.html's tbSequence() for the web app and
 * native/src/tasbih.js for the phones — because the two platforms share no
 * runtime. Neither writes the four phrases down: both cut them out of
 * athkar.json's "After Every Ṣalāh" entry, which carries its counts inline as
 * ﴿٣٣﴾, so that the words under somebody's thumb are the words the ʿulamā are
 * being asked to sign and cannot drift from them.
 *
 * TWO IMPLEMENTATIONS OF ONE RULE IS THE RISK THIS CHECK COVERS. They can
 * drift from EACH OTHER while both still look right in isolation — a regex
 * tightened on one side, a capital added on the other — and the symptom is a
 * phone and a browser showing a different third phrase, which nobody would
 * find by reading either file. So rather than assert a hard-coded list (which
 * would be a third copy of the very text neither file is allowed to hold),
 * this runs BOTH derivations against the real data and compares them.
 *
 * It does that by lifting tbSequence() straight out of index.html as text and
 * running it under Node with a stubbed window. That is deliberate: a copy of
 * the web function here would be the fourth copy and could rot quietly, where
 * this fails the moment the shipped one changes shape.
 *
 *   node scripts/check-tasbih.mjs
 */
import { readFileSync } from "node:fs";
import path from "node:path";

/* Resolved from this file, not from the shell: the gate runs it from native/
   (`node ../scripts/check-tasbih.mjs`) and a developer runs it from the
   repository root, and both must read the same four files. */
const root = path.resolve(import.meta.dirname, "..");
const read = f => readFileSync(path.join(root, f), "utf8");

const problems = [], notes = [];
const fail = m => problems.push(m);
const ok = m => notes.push(m);

const html = read("index.html");

/* ---- the native side, run the same way as the web side --------------- */
/* NOT `await import("../native/src/tasbih.js")`. That module is written for
 * Metro — `import ATHKAR from "./data/athkar.json"`, which plain Node refuses
 * without an import attribute — and the gate's unit tests reach it through a
 * loader hook in native/scripts/. Rather than drag that hook in here, the
 * module's own text is run with its one import bound by hand, which is
 * exactly what is done to tbSequence() below. One mechanism, both sides.
 *
 * It also pins something worth pinning: tasbih.js must import NOTHING but
 * athkar.json. If it grows a second dependency this throws rather than
 * quietly starting to need a bundler. */
let native = null, nativeTotal = null;
try {
  const text = read("native/src/tasbih.js");
  const imports = [...text.matchAll(/^\s*import\s.*$/gm)].map(m => m[0].trim());
  if (imports.length !== 1 || !/data\/athkar\.json/.test(imports[0]))
    throw new Error(`expected its one import to be athkar.json, found: ${imports.join(" | ") || "none"}`);
  const body = text.replace(/^\s*import\s.*$/gm, "").replace(/^export /gm, "");
  const mod = new Function("ATHKAR", `${body}\nreturn { sequence, total, at };`)(
    JSON.parse(read("native/src/data/athkar.json")));
  native = mod.sequence();
  nativeTotal = mod.total();
  if (nativeTotal !== 100)
    fail(`native/src/tasbih.js totals ${nativeTotal}, not a hundred`);
} catch (e) {
  fail(`native/src/tasbih.js could not derive the tasbīḥ: ${e.message}`);
}

/* ---- the web side, lifted from the file that ships ------------------- */

/* Brace-matched rather than regexed to the next "}": the function contains
   several of its own, and a lazy match would cut it off mid-loop. */
function lift(name) {
  const start = html.indexOf(`function ${name}(){`);
  if (start < 0) return null;
  let i = html.indexOf("{", start), depth = 0;
  for (let j = i; j < html.length; j++) {
    if (html[j] === "{") depth++;
    else if (html[j] === "}" && --depth === 0) return html.slice(start, j + 1);
  }
  return null;
}

const text = lift("tbSequence");
let web = null;
if (!text) {
  fail("index.html no longer defines tbSequence() — the web counter has moved or gone");
} else {
  const ATHKAR = read("quran/athkar.js");
  const win = {};
  /* The generated file is `window.ATHKAR = {…}` and nothing else, so it runs
     against a bare object with no DOM in sight. */
  new Function("window", ATHKAR)(win);
  try {
    web = new Function("window", `let tbSeq = null; ${text} return tbSequence();`)(win);
  } catch (e) {
    fail(`index.html's tbSequence() threw under Node: ${e.message}`);
  }
  if (web === null && !problems.length)
    fail("index.html's tbSequence() returned null — it could not find the dhikr it slices");
}

/* ---- and they must agree -------------------------------------------- */
if (native && web) {
  if (native.length !== web.length) {
    fail(`the app derives ${native.length} phrases and the website ${web.length}`);
  } else {
    let same = true;
    native.forEach((s, i) => {
      const w = web[i];
      if (s.ar !== w.ar) { fail(`phrase ${i + 1}: the app shows "${s.ar}" and the website "${w.ar}"`); same = false; }
      if (s.en !== w.en) { fail(`meaning ${i + 1}: the app shows "${s.en}" and the website "${w.en}"`); same = false; }
      if (s.count !== w.count) { fail(`count ${i + 1}: the app says ${s.count} and the website ${w.count}`); same = false; }
    });
    if (same)
      ok(`both counters derive the same ${native.length} phrases `
         + `(${native.map(s => s.count).join("+")} = ${native.reduce((a, s) => a + s.count, 0)}) `
         + `from the same reviewed dhikr`);
  }
}

/* ---- and neither may keep its own copy of the words ------------------ */
/* THE POINT OF ALL OF THIS. If somebody "simplifies" either counter by
   pasting the four phrases in as a literal, every check above still passes
   and the fingerprint over the 142 supplications stops covering the words on
   the counter. The phrases are short and unmistakable, so the simplest guard
   is to look for them where they must not be. */
if (native) {
  const FILES = ["index.html", "native/src/screens/Tasbih.jsx",
                 "native/src/tasbih.js", "native/src/screens/HajjCounter.jsx"];
  /* tasbih.js quotes the dhikr once, in its header comment, to explain what it
     slices — that is documentation, not a second source the screen reads. */
  const stripComments = s => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  let planted = 0;
  for (const f of FILES) {
    const body = stripComments(read(f));
    for (const s of native)
      if (body.includes(s.ar)) {
        fail(`${f} contains the phrase "${s.ar}" as text — the counters must derive `
             + `the words from athkar.json, never hold their own copy`);
        planted++;
      }
  }
  if (!planted)
    ok("no file writes the four phrases down; both counters cut them out of athkar.json");
}

for (const n of notes) console.log("  ok    " + n);
if (problems.length) {
  console.error("\ntasbīḥ counter problems:\n");
  for (const p of problems) console.error("  ✗  " + p);
  process.exit(1);
}
console.log("\ntasbīḥ checks passed.");
