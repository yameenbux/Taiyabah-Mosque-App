#!/usr/bin/env node
/* Build the Qur'an data the app reads.
 *
 * Scripture is never typed by hand here, and never trusted on arrival. Every
 * fetch is checked against the canonical ayah counts below before a single
 * file is written, so a truncated download or a bad edition fails loudly
 * rather than shipping a Qur'an with a verse missing.
 *
 * Arabic: ara-quranindopak — the King Fahd Complex Nastaliq (IndoPak) text,
 * converted to standard Unicode. This is the script the Indo-Pak community
 * reads, and being standard Unicode it renders in Noto Sans Arabic rather
 * than needing a proprietary font.
 *
 *   node scripts/fetch-quran.mjs
 */
import { writeFileSync, mkdirSync, rmSync, existsSync } from "node:fs";

/* ---- the translation the app shows ------------------------------------
 * Mufti Taqi Usmani — the translation most of this community actually reads,
 * which the masjid has instructed be used in place of the earlier one.
 *
 * IT IS IN COPYRIGHT. Unlike Abdullah Yusuf Ali (1934), which used to sit here
 * because it is out of copyright and ships without permission, this is a modern
 * work. It is shipped because Taiyabah Masjid has WRITTEN PERMISSION from the
 * rights-holder to distribute it in the app — the same footing the Bukhārī
 * English stands on. The store copyright statements say so; keep them true.
 *
 * It is fetched from quran.com (translation id 84, "Mufti Taqi Usmani"), which
 * carries the full text with its punctuation and diacritics intact. That exact
 * edition was verified verse-for-verse against the central-mosque.com PDF the
 * masjid supplied: identical wording on all 6,236 ayahs, the only differences
 * being the quotation marks and macrons the PDF's text layer had flattened.
 *
 * The punctuation check below still stands guard. It was added after the old
 * fawazahmed0 edition turned out to be a stripped derivative — every ayah's
 * closing mark shaved off, 1,112 verses left with an unclosed quotation mark,
 * the disjointed-letter openings losing their first letter ("A. L. M." → "L.
 * M") — so 6,215 of 6,236 verses were wrong in a way no count-based check could
 * see. Usmani ends 97% of its verses on a mark of punctuation; a source that
 * drops below 95% is not his text, whatever its ayah count says.
 */
const TRANSLATION_LABEL = "Mufti Taqi Usmani";

const RAW = "https://raw.githubusercontent.com";
const ARABIC_URL = `${RAW}/fawazahmed0/quran-api/1/editions/ara-quranindopak.json`;
const META_URL   = `${RAW}/semarketir/quranjson/master/source/surah.json`;
/* The translation is quran.com's edition 84 (Mufti Taqi Usmani): a single JSON
   array of 6,236 entries in the standard Hafs mushaf order, which maps onto the
   canonical counts below. The punctuation guard checks it on arrival. */
const TRANS_URL = "https://api.quran.com/api/v4/quran/translations/84";

/* Ayah counts per surah, Kufan/Hafs numbering. The check, not the data. */
const CANON = [7,286,200,176,120,165,206,75,129,109,123,111,43,52,99,128,111,110,98,135,
112,78,118,64,77,227,93,88,69,60,34,30,73,54,45,83,182,88,75,85,54,53,89,59,37,35,38,29,
18,45,60,49,62,55,78,96,29,22,24,13,14,11,11,18,12,12,30,52,52,44,28,28,20,56,40,31,50,
40,46,42,29,19,36,25,22,17,19,26,30,20,15,21,11,8,8,19,5,8,8,11,11,8,3,9,5,4,7,3,6,3,5,4,5,6];

/* What each surah's name means, for readers who don't know the Arabic. */
const MEANING = ["The Opening","The Cow","The Family of ʿImrān","The Women","The Table Spread",
"The Cattle","The Heights","The Spoils of War","The Repentance","Jonah","Hūd","Joseph","The Thunder",
"Abraham","The Rocky Tract","The Bee","The Night Journey","The Cave","Mary","Ṭā Hā","The Prophets",
"The Pilgrimage","The Believers","The Light","The Criterion","The Poets","The Ant","The Story",
"The Spider","The Romans","Luqmān","The Prostration","The Combined Forces","Sheba","The Originator",
"Yā Sīn","Those Ranged in Ranks","Ṣād","The Groups","The Forgiver","Explained in Detail",
"The Consultation","The Gold Adornments","The Smoke","The Kneeling","The Sand Dunes","Muḥammad",
"The Victory","The Rooms","Qāf","The Winnowing Winds","The Mount","The Star","The Moon",
"The Most Merciful","The Inevitable","The Iron","The Pleading Woman","The Exile","The Examined One",
"The Ranks","Friday","The Hypocrites","Mutual Loss and Gain","Divorce","The Prohibition","The Dominion",
"The Pen","The Reality","The Ascending Stairways","Noah","The Jinn","The Enshrouded One",
"The Cloaked One","The Resurrection","Man","Those Sent Forth","The Great News","Those Who Pull Out",
"He Frowned","The Overthrowing","The Cleaving","Those Who Deal in Fraud","The Splitting Open",
"The Great Constellations","The Night Comer","The Most High","The Overwhelming","The Dawn",
"The City","The Sun","The Night","The Morning Brightness","The Relief","The Fig","The Clot",
"The Night of Decree","The Clear Proof","The Earthquake","Those That Run","The Striking Hour",
"Competition for More","The Declining Day","The Traducer","The Elephant","Quraysh",
"Small Kindnesses","The Abundance","The Disbelievers","The Help","The Palm Fibre","Sincerity",
"The Daybreak","Mankind"];

const get = async (url) => {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${url} -> HTTP ${r.status}`);
  return r.json();
};

/* quran.com returns { translations: [ { text }, ... ] } in mushaf order. Map
   that order onto chapter/verse with the canonical counts, and strip any inline
   footnote markup so only the verse text is written. */
const getTranslation = async () => {
  const r = await fetch(TRANS_URL);
  if (!r.ok) throw new Error(`${TRANS_URL} -> HTTP ${r.status}`);
  const { translations } = await r.json();
  if (!Array.isArray(translations) || translations.length !== 6236)
    throw new Error(`translation: ${translations ? translations.length : "no"} entries, expected 6236`);
  const rows = [];
  let i = 0;
  for (let n = 1; n <= 114; n++)
    for (let v = 1; v <= CANON[n - 1]; v++)
      rows.push({ chapter: n, verse: v,
                  text: String(translations[i++].text || "").replace(/<[^>]*>/g, "").trim() });
  console.log(`  translation from ${TRANS_URL} (Mufti Taqi Usmani · quran.com id 84)`);
  return rows;
};

/* Group a flat list of {chapter, verse, text} into 114 arrays, and refuse
   anything that does not match the canonical counts exactly. */
function groupAndVerify(rows, label) {
  const by = new Map();
  for (const r of rows) {
    if (!by.has(r.chapter)) by.set(r.chapter, []);
    by.get(r.chapter).push(r);
  }
  const problems = [];
  if (by.size !== 114) problems.push(`${label}: ${by.size} surahs, expected 114`);
  for (let n = 1; n <= 114; n++) {
    const got = (by.get(n) || []).sort((a, b) => a.verse - b.verse);
    if (got.length !== CANON[n - 1])
      problems.push(`${label}: surah ${n} has ${got.length} ayahs, expected ${CANON[n - 1]}`);
    const numbering = got.map(v => v.verse);
    if (numbering.some((v, i) => v !== i + 1))
      problems.push(`${label}: surah ${n} verse numbering is not 1..${got.length}`);
    if (got.some(v => !String(v.text || "").trim()))
      problems.push(`${label}: surah ${n} has an empty ayah`);
    by.set(n, got);
  }
  if (problems.length) {
    for (const p of problems.slice(0, 20)) console.error("  " + p);
    throw new Error(`${label} failed verification (${problems.length} problem(s)) — nothing written`);
  }
  return by;
}

console.log("fetching…");
const [arabicDoc, transRows, meta] = await Promise.all([get(ARABIC_URL), getTranslation(), get(META_URL)]);

const arabic = groupAndVerify(arabicDoc.quran, "arabic (IndoPak)");
const trans  = groupAndVerify(transRows, "translation (Mufti Taqi Usmani)");
console.log(`  arabic      ${arabicDoc.quran.length} ayahs — verified`);
console.log(`  translation ${transRows.length} ayahs — verified`);

/* THE CHECK THAT WAS MISSING. Counting ayahs cannot see a translation whose
   sentences have all been filed off: 6,236 verses arrived, every one of them
   non-empty, and every one of them ended mid-sentence. Usmani ends 97% of his
   verses on a mark of punctuation. A source that does not is not his text,
   whatever its ayah count says, and must not be written over the one we have. */
const ENDS_WELL = /[.!?:;,)"'\u2019\u201d-]$/;
const ended = transRows.filter(r => ENDS_WELL.test(r.text)).length;
const pct = (100 * ended / transRows.length);
console.log(`  translation ${pct.toFixed(1)}% of ayahs end on a mark of punctuation`);
if (pct < 95) throw new Error(
  `translation looks stripped of its punctuation: only ${pct.toFixed(1)}% of ayahs ` +
  `end on one, where Usmani's text is 97% — nothing written`);

if (meta.length !== 114) throw new Error(`metadata has ${meta.length} surahs, expected 114`);
meta.forEach((m, i) => {
  if (Number(m.count) !== CANON[i]) throw new Error(`metadata surah ${i + 1} count ${m.count} != ${CANON[i]}`);
});
console.log("  metadata    114 surahs — verified");

const dir = "quran/surahs";
if (existsSync(dir)) rmSync(dir, { recursive: true });
mkdirSync(dir, { recursive: true });

const index = [];
for (let n = 1; n <= 114; n++) {
  const m = meta[n - 1];
  const entry = {
    n,
    name: m.titleAr,
    nameEn: m.title.replace(/-/g, "-"),
    meaning: MEANING[n - 1],
    revealed: m.type === "Madaniyah" ? "Madinah" : "Makkah",
    ayahs: CANON[n - 1],
  };
  index.push(entry);
  const ar = arabic.get(n), en = trans.get(n);
  writeFileSync(`${dir}/${n}.json`, JSON.stringify({
    ...entry,
    translation: TRANSLATION_LABEL,
    verses: ar.map((a, i) => ({ n: a.verse, ar: a.text, en: en[i].text })),
  }));
}
writeFileSync(`${dir}/index.json`, JSON.stringify({
  script: "IndoPak (King Fahd Complex Nastaliq, Unicode)",
  translation: TRANSLATION_LABEL,
  surahs: index,
}, null, 1));

console.log(`\nwrote ${dir}/index.json and 114 surah files`);
