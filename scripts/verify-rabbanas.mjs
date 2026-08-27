#!/usr/bin/env node
/* Check the 40 Rabbanā against the verified Qur'an text.
 *
 * quran/rabbanas.js was transcribed from page images and carries a warning
 * saying so. Each entry is a phrase from a verse, not a whole verse, so it
 * cannot simply be replaced — but it can be checked: strip the diacritics and
 * the phrase must appear inside the verse it cites.
 *
 *   node scripts/verify-rabbanas.mjs
 */
import { readFileSync } from "node:fs";

const SURAH = ["Al-Fatiha","Al-Baqarah","Aal-Imran","An-Nisa","Al-Maidah","Al-Anam","Al-Araf",
"Al-Anfal","At-Tawbah","Yunus","Hud","Yusuf","Ar-Rad","Ibrahim","Al-Hijr","An-Nahl","Al-Isra",
"Al-Kahf","Maryam","Ta-Ha","Al-Anbiya","Al-Hajj","Al-Muminun","An-Nur","Al-Furqan","Ash-Shuara",
"An-Naml","Al-Qasas","Al-Ankabut","Ar-Rum","Luqman","As-Sajdah","Al-Ahzab","Saba","Fatir","Ya-Sin",
"As-Saffat","Sad","Az-Zumar","Ghafir","Fussilat","Ash-Shura","Az-Zukhruf","Ad-Dukhan","Al-Jathiyah",
"Al-Ahqaf","Muhammad","Al-Fath","Al-Hujurat","Qaf","Adh-Dhariyat","At-Tur","An-Najm","Al-Qamar",
"Ar-Rahman","Al-Waqiah","Al-Hadid","Al-Mujadila","Al-Hashr","Al-Mumtahanah","As-Saff","Al-Jumuah",
"Al-Munafiqun","At-Taghabun","At-Talaq","At-Tahrim","Al-Mulk","Al-Qalam","Al-Haqqah","Al-Maarij",
"Nuh","Al-Jinn","Al-Muzzammil","Al-Muddaththir","Al-Qiyamah","Al-Insan","Al-Mursalat","An-Naba",
"An-Naziat","Abasa","At-Takwir","Al-Infitar","Al-Mutaffifin","Al-Inshiqaq","Al-Buruj","At-Tariq",
"Al-Ala","Al-Ghashiyah","Al-Fajr","Al-Balad","Ash-Shams","Al-Layl","Ad-Duha","Ash-Sharh","At-Tin",
"Al-Alaq","Al-Qadr","Al-Bayyinah","Az-Zalzalah","Al-Adiyat","Al-Qariah","At-Takathur","Al-Asr",
"Al-Humazah","Al-Fil","Quraysh","Al-Maun","Al-Kawthar","Al-Kafirun","An-Nasr","Al-Masad","Al-Ikhlas",
"Al-Falaq","An-Nas"];

/* Compare consonantal skeletons. Diacritics, hamza seats and the alif
   variants differ legitimately between printings and would otherwise drown
   out the thing being checked: whether the words are the same words. */
const bare = s => s
  /* Strip every mark that is annotation rather than letter: the small high
     marks (0610–061A) which include the pause signs, the harakat and
     superscript alif (064B–065F, 0670), tatweel, the Qur'anic annotation
     signs (06D6–06ED — the IndoPak sukun lives here), the Extended-A marks
     this text uses, and the bidi controls. Two printings of the same words
     differ in every one of these; only the letters should decide. */
  .replace(/[ؐ-ًؚ-ٰٟـۖ-ۭࢠ-ࣿ​-‏]/g, "")
  .replace(/[آأإٱٲٳ]/g, "ا")   // alif variants -> alif
  .replace(/ة/g, "ه")                                     // ta marbuta -> ha
  .replace(/ى/g, "ي")                                     // alif maqsura -> ya
  /* One printing writes the hamza seat as a single character (ؤ, ئ), the other
     writes the plain letter and a combining hamza that the strip above has
     already removed. Reduce both to the bare letter so they agree. */
  .replace(/ؤ/g, "و")
  .replace(/ئ/g, "ي")
  .replace(/\s+/g, "");

/* The references are written with full transliteration — "Āl ʿImrān",
   "Al-Māʾidah" — so fold the Latin diacritics away before matching, or every
   one of them reads as an unknown sūrah. */
const norm = n => n.normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLowerCase()
  .replace(/[^a-z]/g, "");
const lookup = new Map(SURAH.map((n, i) => [norm(n), i + 1]));
/* Transliterations differ in ways folding diacritics does not fix — doubled
   vowels, elided articles. Name the handful that occur rather than guess. */
for (const [alias, n] of Object.entries({
  "alimran": 3, "aliimran": 3, "alimraan": 3, "maidah": 5, "araf": 7,
  "yunus": 10, "ibrahim": 14, "taha": 20, "furqan": 25, "muminun": 23,
  "fatir": 35, "ghafir": 40, "hashr": 59, "mumtahanah": 60, "tahrim": 66,
})) if (!lookup.has(alias)) lookup.set(alias, n);

const src = readFileSync("quran/rabbanas.js", "utf8");
global.window = {};
new Function("window", src)(global.window);
const list = global.window.RABBANAS;

let okCount = 0;
const problems = [];
for (const r of list) {
  // a reference may span verses: "Al-Furqān 65–66"
  const m = String(r.ref).match(/^(.*?)\s+(\d+)(?:\s*[–—-]\s*(\d+))?$/);
  if (!m) { problems.push(`#${r.n}: cannot read reference "${r.ref}"`); continue; }
  const sNum = lookup.get(norm(m[1]));
  if (!sNum) { problems.push(`#${r.n}: unknown sūrah "${m[1]}"`); continue; }
  const from = Number(m[2]), to = Number(m[3] || m[2]);
  const verses = JSON.parse(readFileSync(`quran/surahs/${sNum}.json`, "utf8")).verses;
  const span = verses.filter(x => x.n >= from && x.n <= to);
  if (!span.length) { problems.push(`#${r.n}: ${r.ref} — no such āyah`); continue; }
  if (bare(span.map(x => x.ar).join("")).includes(bare(r.ar))) okCount++;
  else problems.push({ n: r.n, ref: r.ref, got: r.ar, expect: span.map(x => x.ar).join(" ") });
}

console.log(`${list.length} rabbanā entries checked against the verified Qur'an`);
console.log(`  matched : ${okCount}`);
if (problems.length) {
  console.log(`  to review: ${problems.length}`);
  for (const p of problems) {
    if (typeof p === "string") { console.log("    " + p); continue; }
    console.log(`\n    #${p.n} ${p.ref}`);
    console.log(`      in the app : ${p.got}`);
    console.log(`      the āyah   : ${p.expect.slice(0, 150)}`);
  }
} else {
  console.log("  every entry appears verbatim in the āyah it cites");
}
process.exit(problems.length ? 1 : 0);
