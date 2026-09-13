/* Taiyabah Masjid — hold the Qurʼanic duʿās to the verified Qurʼan.
   Copyright (c) 2026 Yameen Bux. All rights reserved. See LICENSE.md.

   The "From the Qurʼan" category in quran/duas.js is generated, not written:
   every word is lifted out of quran/surahs/ by scripts/build-quran-duas.mjs.
   This checks two things that could quietly come apart afterwards.

     1. The file still says what the builder produces. A hand-edit to an ar:
        line — a "helpful" correction, a stray keystroke — is caught here.

     2. What the builder produces is genuinely in the āyah it cites. Compared
        letter by letter, ignoring the diacritics and pause marks that differ
        between printings, exactly as the 40 Rabbanā are checked.

   Run after any change:   node scripts/verify-quran-duas.mjs
*/
import { readFileSync } from "node:fs";
import { DUAS, arabicFor } from "./build-quran-duas.mjs";

const norm = s => s
  .replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u08D3-\u08FF\u0640\u200B-\u200F]/gu, "")
  .replace(/[\u0622\u0623\u0625\u0671\u0672\u0673]/gu, "\u0627")
  .replace(/\u0629/gu, "\u0647")
  .replace(/\u0649/gu, "\u064A")
  .replace(/\s+/gu, "");

/* Read the category out of the data file the app actually ships. */
const src = readFileSync("quran/duas.js", "utf8");
const sandbox = { window: {} };
new Function("window", src)(sandbox.window);
const cat = sandbox.window.DUAS.categories.find(c => c.id === "quran");

const problems = [];
if (!cat) problems.push('quran/duas.js has no "quran" category — the Qurʼanic duʿās are gone');
else if (cat.items.length !== DUAS.length)
  problems.push(`the file carries ${cat.items.length} Qurʼanic duʿās, the builder defines ${DUAS.length}`);
else DUAS.forEach((d, i) => {
  const item = cat.items[i];
  const built = arabicFor(d);

  if (item.ar !== built)
    problems.push(`${d.src} — the Arabic in quran/duas.js is not what the builder produces. `
                + `Do not hand-edit it: change the span in build-quran-duas.mjs and regenerate.`);

  if (item.tr)
    problems.push(`${d.src} — a Qurʼanic duʿā has picked up a transliteration; scripture is not given an invented pronunciation guide here`);

  /* …and the built text really is in the āyāt cited. */
  for (const [s, a, f, t] of d.spans) {
    const sura = JSON.parse(readFileSync(`quran/surahs/${s}.json`, "utf8"));
    const v = sura.verses.find(x => x.n === a);
    if (!v) { problems.push(`${d.src} — āyah ${s}:${a} is not in the sūrah file`); continue; }
    const piece = norm(d.spans.length === 1 ? built : v.ar.trim().split(/\s+/).slice(f, t + 1).join(" "));
    if (!norm(v.ar).includes(piece))
      problems.push(`${d.src} — the text does not appear verbatim in āyah ${s}:${a}`);
  }
});

/* And it must not repeat one of the forty. */
const rab = norm(readFileSync("quran/rabbanas.js", "utf8"));
for (const d of DUAS)
  if (rab.includes(norm(arabicFor(d))))
    problems.push(`${d.src} — duplicates one of the 40 Rabbanā`);

if (problems.length) {
  console.error(`\n${problems.length} problem(s) with the Qurʼanic duʿās:\n`);
  problems.forEach(p => console.error("  FAIL  " + p));
  process.exit(1);
}
console.log(`${DUAS.length} Qurʼanic duʿās checked against the verified Qurʼan`);
console.log("  every one appears verbatim in the āyah it cites, and none repeats a Rabbanā");
