/* Taiyabah Masjid — extract Qur'anic duʿās from the verified sūrah text.

   The Arabic here is NOT typed. Transcribing Qur'anic text by hand is how the
   40 Rabbanā picked up errors, and how seven of these nineteen candidates
   failed their first check — the IndoPak mus-haf writes a dagger alif where
   other printings write a full alif, so a hand-typed "الصالحين" never matches
   the "الصّٰلِحِيۡنَ" on the page.

   So each duʿā is identified by sūrah, āyah and a span of words, and lifted
   verbatim out of quran/surahs/. Run this and paste the output; then
   scripts/verify-quran-duas.mjs holds it to the same text for ever after.

       node scripts/build-quran-duas.mjs
*/
import { readFileSync } from "node:fs";

/* Each duʿā: id, label, meaning, and the span(s) of the āyah it is lifted
   from as [sūrah, āyah, firstWord, lastWord] with 0-based word indices.
   Mūsā's duʿā runs across two āyāt, so a duʿā may carry more than one span. */
export const DUAS = [
  { id:"yunus", lead:true,     src:"Sūrah al-Anbiyā' 21:87",  spans:[[21,87,14,22]],
    label:"The duʿā of Yūnus",
    en:"There is no god but You. Glory be to You. I have surely been among the wrongdoers." },
  { id:"knowledge", lead:true, src:"Sūrah Ṭā Hā 20:114",      spans:[[20,114,14,16]],
    label:"Before studying",
    en:"My Lord, increase me in knowledge." },
  { id:"ease",      src:"Sūrah Ṭā Hā 20:25–26",    spans:[[20,25,1,4],[20,26,0,2]],
    label:"Before speaking",
    en:"My Lord, expand my breast for me, and make my task easy for me." },
  { id:"salah",     src:"Sūrah Ibrāhīm 14:40",     spans:[[14,40,0,5]],
    label:"To be steadfast in prayer",
    en:"My Lord, make me one who establishes prayer, and my offspring too." },
  { id:"righteous", src:"Sūrah aṣ-Ṣāffāt 37:100",  spans:[[37,100,0,4]],
    label:"For righteous children",
    en:"My Lord, grant me one of the righteous." },
  { id:"childless", src:"Sūrah al-Anbiyā' 21:89",  spans:[[21,89,4,10]],
    label:"When childless",
    en:"My Lord, do not leave me alone, and You are the best of inheritors." },
  { id:"parents",   src:"Sūrah Nūḥ 71:28",         spans:[[71,28,0,3]],
    label:"Forgiveness for one's parents",
    en:"My Lord, forgive me and my parents." },
  { id:"mercy", lead:true,     src:"Sūrah al-Mu'minūn 23:118",spans:[[23,118,1,6]],
    label:"Asking for mercy",
    en:"My Lord, forgive and have mercy, for You are the best of those who show mercy." },
  { id:"afraid",    src:"Sūrah Āl ʿImrān 3:173",   spans:[[3,173,13,16]],
    label:"When afraid",
    en:"Allah is sufficient for us, and He is the best disposer of affairs." },
  { id:"trust",     src:"Sūrah at-Tawbah 9:129",   spans:[[9,129,3,14]],
    label:"Placing your trust",
    en:"Allah is sufficient for me. There is no god but He. In Him I place my trust, and He is the Lord of the Mighty Throne." },
  { id:"sincerity", lead:true, src:"Sūrah al-Isrā' 17:80",    spans:[[17,80,1,13]],
    label:"Setting out with sincerity",
    en:"My Lord, cause me to enter by a truthful entrance and to leave by a truthful exit, and grant me from Yourself a helping authority." },
  { id:"illness",   src:"Sūrah al-Anbiyā' 21:83",  spans:[[21,83,4,9]],
    label:"In illness",
    en:"Affliction has touched me, and You are the most merciful of those who show mercy." },
  { id:"wisdom",    src:"Sūrah ash-Shuʿarā' 26:83",spans:[[26,83,0,5]],
    label:"For wisdom and good company",
    en:"My Lord, grant me wisdom and join me with the righteous." },
  { id:"need",      src:"Sūrah al-Qaṣaṣ 28:24",    spans:[[28,24,7,14]],
    label:"When in need",
    en:"My Lord, I am in need of whatever good You send down to me." },
  { id:"family",    src:"Sūrah al-Aʿrāf 7:151",    spans:[[7,151,1,10]],
    label:"For yourself and your family",
    en:"My Lord, forgive me and my brother, and admit us into Your mercy, for You are the most merciful of those who show mercy." },
  { id:"paradise",  src:"Sūrah ash-Shuʿarā' 26:85",spans:[[26,85,0,4]],
    label:"For Paradise",
    en:"And make me among the inheritors of the Garden of Delight." },
  { id:"gratitude", src:"Sūrah al-Aḥqāf 46:15",    spans:[[46,15,21,44]],
    label:"Gratitude, and for one's children",
    en:"My Lord, enable me to be grateful for Your favour which You have bestowed upon me and upon my parents, and to do righteous deeds that please You, and make my offspring righteous for me. I turn to You in repentance, and I am of those who submit." },
];

/* Two things follow a fragment out of a running āyah, and they are not the
   same kind of thing.

   1. PAUSE MARKS. The small waqf signs — ۖ ۚ ؕ ࣖ and their kin — are page
      furniture telling a reciter where they may stop. They are not letters
      and not part of the duʿā, so they come off. The sukūn ۡ and the madd ٘
      are NOT in this set: those are how the word is read.

   2. AN ASSIMILATED SHADDA. "وَقُلۡ رَّبِّ زِدۡنِيۡ عِلۡمًا" carries a shadda on the
      rāʾ only because of the lām before it. Standing alone the duʿā is
      "رَبِّ زِدۡنِيۡ عِلۡمًا", which is how every printed duʿā collection sets it.
      This is a change to a letter mark, so it is never automatic: it is
      declared per duʿā with `lead:true`, listed in the table above where it
      can be seen and reviewed, and it applies only to the very first letter. */
const PAUSE = /[\u06D6-\u06DC\u06DD\u06DE\u0615\u0617\u08D6\u08D7\u200B-\u200F\u061C]/gu;
const tidy = s => s.replace(PAUSE, "").replace(/\s+/g, " ").trim();
/* The shadda does not sit next to its letter: the vowel comes between them
   (لَّ is U+0644 U+064E U+0651), so the letter and any vowel are kept and only
   the shadda is taken off. Any later shadda in the word — the bāʾ of رَبِّ —
   is untouched. */
const dropLeadingShadda = s => s.replace(/^(.[\u064B-\u0652\u0658\u0670]?)\u0651/u, "$1");

export function extract(s, a, from, to) {
  const sura = JSON.parse(readFileSync(`quran/surahs/${s}.json`, "utf8"));
  const v = sura.verses.find(x => x.n === a);
  if (!v) throw new Error(`${s}:${a} not found`);
  const words = v.ar.trim().split(/\s+/);
  if (to >= words.length) throw new Error(`${s}:${a} has ${words.length} words, asked for ${to}`);
  return { text: tidy(words.slice(from, to + 1).join(" ")), verse: v.ar, words: words.length };
}

export const arabicFor = d => {
  const joined = d.spans.map(([s, a, f, t]) => extract(s, a, f, t).text).join(" ");
  return d.lead ? dropLeadingShadda(joined) : joined;
};

if (process.argv[1].endsWith("build-quran-duas.mjs")) {
  const esc = x => x.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  for (const d of DUAS) {
    console.log(`      { label: "${esc(d.label)}",`);
    console.log(`        ar: "${arabicFor(d)}",`);
    console.log(`        en: "${esc(d.en)}",`);
    console.log(`        src: "${esc(d.src)}" },`);
  }
}
