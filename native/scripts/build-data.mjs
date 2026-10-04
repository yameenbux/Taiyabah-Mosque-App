/**
 * Taiyabah Masjid — data the native app bundles
 * Copyright (c) 2026 Yameen Bux. All rights reserved. See LICENSE.md.
 *
 * What goes in the APK and what comes over the wire is a deliberate split:
 *
 *   bundled   the whole Qur'an text with translation (2.6MB), every surah and
 *             book heading, the timetable, the mushaf's page map. All of it
 *             works on a phone with no signal, in the masjid, which is where
 *             people actually use it.
 *   streamed  the 848 mushaf page images (66MB) and Bukhārī's 97 book files
 *             (8.7MB). Bundling those would nearly triple the download for
 *             content most people never open, and expo-image caches a page to
 *             disk the first time it is read.
 *
 *   node scripts/build-data.mjs
 */
import fs from "node:fs"; import path from "node:path";
const ROOT = path.resolve(import.meta.dirname, "../..");
const OUT  = path.resolve(import.meta.dirname, "../src/data");
const rd = p => JSON.parse(fs.readFileSync(path.join(ROOT, p), "utf8"));
const wr = (name, v) => {
  const p = path.join(OUT, name);
  fs.writeFileSync(p, JSON.stringify(v));
  console.log(name.padEnd(22), (fs.statSync(p).size / 1024).toFixed(0).padStart(6) + " KB");
};

/* --- the Qur'an ---------------------------------------------------------- */
const sIdx = rd("quran/surahs/index.json");
wr("quran-index.json", { script: sIdx.script, translation: sIdx.translation, surahs: sIdx.surahs });

/* One file rather than 114, because Metro cannot require a path it works out at
 * runtime. Verses are kept as [n, arabic, english] triples: the key names were
 * a third of the bytes. */
const text = {};
for (const s of sIdx.surahs) {
  const j = rd(`quran/surahs/${s.n}.json`);
  text[s.n] = j.verses.map(v => [v.n, v.ar, v.en]);
}
wr("quran-text.json", text);

const mush = rd("quran/mushaf/indopak13/index.json");
wr("mushaf.json", { id: mush.id, name: mush.name, ext: mush.ext, pages: mush.pages, lines: mush.lines,
                    width: mush.width, height: mush.height, juzPage: mush.juzPage, surahPage: mush.surahPage,
                    licence: mush.licence });

/* --- Ṣaḥīḥ al-Bukhārī ---------------------------------------------------- */
const bIdx = rd("quran/hadith/bukhari/index.json");
const books = rd("quran/hadith/bukhari/books.json");
wr("bukhari.json", { name: bIdx.name, nameAr: bIdx.nameAr, count: bIdx.count, books: bIdx.books,
                     source: bIdx.source, licence: bIdx.licence, list: books });

/* --- the timetable, copied so the two cannot drift ----------------------- */
fs.copyFileSync(path.join(ROOT, "data/timetable-2026.json"), path.join(OUT, "timetable-2026.json"));
console.log("timetable-2026.json".padEnd(22),
  (fs.statSync(path.join(OUT, "timetable-2026.json")).size / 1024).toFixed(0).padStart(6) + " KB");

const total = fs.readdirSync(OUT).reduce((n, f) => n + fs.statSync(path.join(OUT, f)).size, 0);
console.log("\nbundled data total   " + (total / 1024 / 1024).toFixed(1) + " MB");
