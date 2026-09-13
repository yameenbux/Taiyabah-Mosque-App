/* Taiyabah Masjid — build the Ṣaḥīḥ al-Bukhārī reference pack.
   Copyright (c) 2026 Yameen Bux. All rights reserved (this script).

   THE DATA IS NOT OURS AND IS NOT "ALL RIGHTS RESERVED".
   It comes from the Open Hadith Data project, which publishes it under the
   Open Database License 1.0 with its contents under the Database Contents
   License 1.0. That licence travels with the data: the pack it builds carries
   its own LICENCE.txt and an attribution the app shows on screen. Do not
   fold this into the repository's own code licence.

       source   https://github.com/mhashim6/Open-Hadith-Data
       licence  https://opendatacommons.org/licenses/odbl/1-0/
                https://opendatacommons.org/licenses/dbcl/1-0/

   WHY ARABIC ONLY.
   The Arabic is 9th-century and belongs to nobody. Every English dataset
   found was either scraped from a site whose translation is in copyright, or
   asserted "public domain" over a 20th-century translation that plainly is
   not. So this pack ships the Arabic and says so, rather than shipping a
   translation the masjid could not evidence rights to.

   WHAT IS LEFT OUT.
   The source CSV carries a third column: Ibn Ḥajar's Fatḥ al-Bārī. It is
   classical and out of copyright, but it is 36 MB — five times the hadith
   text — and putting scholarly commentary in front of a congregation is an
   editorial decision for the imam, not a side effect of a build script. The
   builder reads past it deliberately.

       node scripts/build-bukhari.mjs [path-to-csv]
*/
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from "node:fs";

const CSV = process.argv[2] ||
  "/home/user/mhashim6/open-hadith-data/Sahih_Al-Bukhari/sahih_al-bukhari_ahadith_mushakkala_mufassala.utf8.csv";
const OUT = "quran/hadith/bukhari";
const PER_CHUNK = 100;

/* The source marks narrator names by wrapping them in U+200F so an app can
   highlight them. We do not highlight, and a stray right-to-left mark inside
   an Arabic run is a rendering hazard, so they come out. */
const RLM = /‏/g;

/* A minimal CSV reader. The field text is Arabic containing commas and
   quotes, so splitting on commas would shred it. */
function parseCsv(text) {
  const rows = [];
  let row = [], field = "", inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
    else if (c !== "\r") field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows.filter(r => r.length && r[0].trim());
}

/* Search has to work without diacritics — nobody types them. The index is a
   stripped copy, built from the very text that is displayed so the two can
   never drift apart. */
const DIACRITICS = /[ؐ-ًؚ-ٰٟۖ-ۭ࣓-ࣿـ]/gu;
export const searchable = s => s
  .replace(DIACRITICS, "")
  .replace(/[آأإٱ]/gu, "ا")
  .replace(/ة/gu, "ه")
  .replace(/ى/gu, "ي")
  .replace(/\s+/gu, " ")
  .trim();

if (process.argv[1].endsWith("build-bukhari.mjs")) {
  if (!existsSync(CSV)) {
    console.error(`\nSource CSV not found: ${CSV}\n`);
    console.error("Get it with:");
    console.error("  git clone --depth 1 https://github.com/mhashim6/Open-Hadith-Data\n");
    process.exit(1);
  }

  const rows = parseCsv(readFileSync(CSV, "utf8"));
  const items = rows.map(r => ({
    n: Number(r[0]),
    ar: (r[1] || "").replace(RLM, "").replace(/\s+/g, " ").trim(),
  })).filter(x => x.n && x.ar);

  /* The numbering must be the source's own, unbroken: a reference whose
     numbers skip is worse than no reference. */
  const gaps = items.filter((x, i) => x.n !== i + 1);
  if (gaps.length) { console.error(`numbering is not 1..n — first break at ${gaps[0].n}`); process.exit(1); }

  rmSync(OUT, { recursive: true, force: true });
  mkdirSync(`${OUT}/c`, { recursive: true });

  const chunks = Math.ceil(items.length / PER_CHUNK);
  for (let c = 0; c < chunks; c++) {
    const slice = items.slice(c * PER_CHUNK, (c + 1) * PER_CHUNK);
    writeFileSync(`${OUT}/c/${c + 1}.json`, JSON.stringify(slice));
  }

  writeFileSync(`${OUT}/search.json`,
    JSON.stringify(items.map(x => searchable(x.ar))));

  writeFileSync(`${OUT}/index.json`, JSON.stringify({
    id: "bukhari",
    name: "Ṣaḥīḥ al-Bukhārī",
    nameAr: "صحيح البخاري",
    kind: "text",
    language: "ar",
    count: items.length,
    perChunk: PER_CHUNK,
    chunks,
    source: "Open Hadith Data (mhashim6/Open-Hadith-Data)",
    sourceUrl: "https://github.com/mhashim6/Open-Hadith-Data",
    licence: "Open Database License 1.0; contents under Database Contents License 1.0",
    licenceUrl: "https://opendatacommons.org/licenses/odbl/1-0/",
    attribution: "Arabic text from the Open Hadith Data project, used under the Open Database License 1.0.",
    prepared: "Hadith text with tashkīl, narrator-highlight marks removed, numbering 1–" + items.length +
              ". Ibn Ḥajar's Fatḥ al-Bārī commentary in the source is deliberately not included.",
    arabicOnly: true,
  }, null, 1));

  /* ODbL: the licence has to travel with the data. */
  writeFileSync(`${OUT}/LICENCE.txt`,
`Ṣaḥīḥ al-Bukhārī — Arabic text
==============================

This data is NOT covered by the Taiyabah Masjid app's own licence. It is
third-party open data, included under its own terms.

Source      Open Hadith Data
            https://github.com/mhashim6/Open-Hadith-Data

Licence     Open Database License (ODbL) v1.0  — the database
            https://opendatacommons.org/licenses/odbl/1-0/
            Database Contents License (DbCL) v1.0 — the contents
            https://opendatacommons.org/licenses/dbcl/1-0/

What that means for anyone reusing this pack:

  * Attribute the Open Hadith Data project.
  * If you distribute this database, or a database derived from it, it must
    be offered under the ODbL as well.
  * Do not lock it up behind a technical measure that stops others
    exercising these rights.

The Arabic hadith text itself is a 9th-century work and belongs to nobody.
No English translation is included: no openly licensed one was found, and
the widely circulated ones are modern works still in copyright.
`);

  const bytes = readFileSync(`${OUT}/search.json`).length +
    Array.from({ length: chunks }, (_, i) => readFileSync(`${OUT}/c/${i + 1}.json`).length).reduce((a, b) => a + b, 0);
  console.log(`${items.length} hadith -> ${chunks} chunks of ${PER_CHUNK}`);
  console.log(`  ${(bytes / 1048576).toFixed(2)} MB on disk, fetched a chunk at a time`);
  console.log(`  licence and attribution written to ${OUT}/`);
}
