/**
 * Taiyabah Masjid — does a downloaded year read the same as the bundled one?
 * Copyright (c) 2026 Yameen Bux. All rights reserved. See LICENSE.md.
 *
 * The app now prefers the committee's published timetable over the file it
 * ships with, which means a conversion sits between the database and every
 * prayer time anybody reads. A column inserted into the middle of
 * prayer_times, or a jummah written "12:45 / 13:40" instead of "12:45,13:40",
 * would shift times by one field and nothing would look obviously broken.
 *
 * So: take the year as prayer_year() returns it, convert it the way the app
 * does, and compare every single day against the file that has been shipping
 * all along. 365 of 365 or it is wrong.
 *
 *   node scripts/check-timetable.mjs <year.json> <year>
 *
 * where year.json is the raw output of `select public.prayer_year(2026)`.
 * Kept out of CI deliberately: the sandbox cannot reach Supabase, so the
 * figures have to be fetched by somebody who can.
 */
import fs from "node:fs";
/* The bundled file is chosen by the year being checked, not fixed at 2026.
   Hardcoded, this tool could only ever check the one year — so the moment a
   second year shipped it would have compared 2027's download against 2026's
   file and reported 365 differences, which reads as a broken database rather
   than a broken comparison. */
const bundledFor = year => {
  const f = `src/data/timetable-${year}.json`;
  if (!fs.existsSync(f))
    throw new Error(`no bundled timetable for ${year} — nothing to compare the download against`);
  return JSON.parse(fs.readFileSync(f, "utf8"));
};

const pad = n => String(n).padStart(2, "0");
function fromRows(year, rows) {
  const days = {};
  for (const r of rows) {
    if (!Array.isArray(r) || r.length < 14) continue;
    const [month, day, hijri, fajrB, fajrJ, sunrise, zuhrB, zuhrJ,
           asrB, asrJ, maghrib, ishaB, ishaJ, jummah] = r;
    const rec = {
      hijri: hijri || "",
      begins: { fajr: fajrB, sunrise, zuhr: zuhrB, asr: asrB, maghrib, isha: ishaB },
      jamaat: { fajr: fajrJ, zuhr: zuhrJ, asr: asrJ, maghrib, isha: ishaJ },
    };
    if (jummah) {
      const [first, second] = String(jummah).split(",").map(s => s.trim());
      if (first) rec.jummah = second ? { first, second } : { first };
    }
    days[`${year}-${pad(month)}-${pad(day)}`] = rec;
  }
  return days;
}

/* The year is an argument with NO DEFAULT, for the reason parse_timetable.py
   gives: a default silently checks last year's figures and reports success. */
const year = Number(process.argv[3]);
if (!process.argv[2] || !Number.isInteger(year)) {
  console.error("usage: node scripts/check-timetable.mjs <year.json> <year>\n" +
                "       e.g. node scripts/check-timetable.mjs out.json 2027\n" +
                "       where out.json is `select public.prayer_year('taiyabah', 2027)`");
  process.exit(2);
}
const BUNDLED = bundledFor(year);
const rows = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const got = fromRows(year, rows);

let same = 0, diff = [];
for (const iso of Object.keys(BUNDLED.days)) {
  const a = BUNDLED.days[iso], b = got[iso];
  if (!b) { diff.push(`${iso}: missing from the database`); continue; }
  if (JSON.stringify(a) === JSON.stringify(b)) { same++; continue; }
  diff.push(`${iso}\n    file: ${JSON.stringify(a)}\n    db:   ${JSON.stringify(b)}`);
}
console.log(`days in the bundled file : ${Object.keys(BUNDLED.days).length}`);
console.log(`days from the database   : ${Object.keys(got).length}`);
console.log(`identical                : ${same}`);
if (diff.length) { console.log(`\nDIFFERENCES (${diff.length}):`); diff.slice(0, 6).forEach(d => console.log("  " + d)); }
else console.log(`\nthe database and the bundled file agree on every day of ${year}`);
