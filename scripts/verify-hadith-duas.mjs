/* Taiyabah Masjid — hold the hadith duʿās to the text they were lifted from.
   Copyright (c) 2026 Yameen Bux. All rights reserved. See LICENSE.md.

   Two levels, because the source editions are ~44 MB and are not committed:

     ALWAYS   quran/duas.js must match the SHA-256 recorded in
              quran/duas-hadith-sources.json for every duʿā. This needs
              nothing but the repository, so the release check runs it on a
              clean clone. It catches a duʿā edited by hand after the fact.

     WHEN THE SOURCE IS PRESENT
              the Arabic is re-extracted from the hadith editions and must
              come out byte-identical. This is what
              catches a wrong hash, and it is the check that actually ties
              the app to the primary text.

       node scripts/verify-hadith-duas.mjs [dir-with-ara-*.json]
*/
import { readFileSync, existsSync } from "node:fs";
import { DUAS, arabicFor, sha, srcOf, spansOf, assertTidySane } from "./build-hadith-duas.mjs";

const SRC_DIR = process.argv[2] || "/tmp";
const fail = [];
const ok = n => console.log(`  ok   ${n}`);

const app = (() => { const w = {}; new Function("window", readFileSync("quran/duas.js", "utf8"))(w); return w.DUAS; })();
const rec = JSON.parse(readFileSync("quran/duas-hadith-sources.json", "utf8"));

const findItem = (cat, label) => {
  const c = app.categories.find(x => x.id === cat);
  return c && c.items.find(i => i.label === label);
};

/* 1. Every recorded duʿā is still in the app, unedited. */
for (const r of rec.duas) {
  const it = findItem(r.cat, r.label);
  if (!it) { fail.push(`${r.cat}/"${r.label}" is no longer in quran/duas.js`); continue; }
  if (sha(it.ar) !== r.sha)
    fail.push(`${r.cat}/"${r.label}": the Arabic in duas.js no longer matches the text it was lifted from`);
  else if (it.src !== r.src)
    fail.push(`${r.cat}/"${r.label}": cited as "${it.src}" but lifted from "${r.src}"`);
  else ok(`${r.cat}/${r.label}`);
}

/* 2. The table in the builder and the recorded provenance have not drifted. */
if (rec.duas.length !== DUAS.length)
  fail.push(`the builder has ${DUAS.length} duʿās but ${rec.duas.length} are recorded — re-run scripts/build-hadith-duas.mjs`);

/* 3. None of them duplicates a duʿā that was already in the app. */
const seen = new Map();
for (const c of app.categories) for (const it of c.items) {
  const key = it.ar.replace(/[ً-ْٰـ]/gu, "").replace(/\s+/gu, " ").trim();
  if (seen.has(key)) fail.push(`duplicate duʿā: "${it.label}" repeats "${seen.get(key)}"`);
  else seen.set(key, it.label);
}
if (!fail.length) ok(`no duʿā duplicates another (${seen.size} distinct)`);

/* 4. With the source present, re-extract and compare byte for byte. */
const needed = [...new Set(DUAS.map(d => spansOf(d)[0][0]))];
if (needed.every(k => existsSync(`${SRC_DIR}/ara-${k}.json`))) {
  assertTidySane();
  for (const d of DUAS) {
    const it = findItem(d.cat, d.label);
    if (!it) continue;
    const ar = arabicFor(d);
    if (ar !== it.ar) fail.push(`${d.label}: re-extracting from the source gives different Arabic`);
    if (srcOf(d) !== it.src) fail.push(`${d.label}: citation drifted`);
  }
  ok(`all ${DUAS.length} re-extracted from the source and matched byte for byte`);
} else {
  console.log(`  --   source editions not in ${SRC_DIR}; hash check only.`);
  console.log(`       for e in ${needed.join(" ")}; do curl -o ${SRC_DIR}/ara-$e.json \\`);
  console.log(`         https://raw.githubusercontent.com/fawazahmed0/hadith-api/1/editions/ara-$e.min.json; done`);
}

if (fail.length) { console.error("\n" + fail.map(f => "  FAIL " + f).join("\n") + "\n"); process.exit(1); }
console.log(`\n${rec.duas.length} hadith duʿās verified.`);
