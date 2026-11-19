/* Taiyabah Masjid — build the Ṣaḥīḥ al-Bukhārī reference pack.
   Copyright (c) 2026 Yameen Bux. All rights reserved (this script).

   WHY THIS WAS REBUILT
   The first pack was a flat list: 7,008 numbered paragraphs, no books, no
   chapters, no way in except a number you already knew. That is not a
   readable Bukhārī, it is a database dump with a scrollbar.

   This one is built from editions that carry the structure:

       Arabic    https://github.com/fawazahmed0/hadith-api  (ara-bukhari)
                 The Unlicense — released into the public domain
       English   https://github.com/fawazahmed0/hadith-api  (eng-bukhari)
                 Dr Muhammad Muhsin Khan's translation, published by
                 Darussalam, still in copyright — shipped by PERMISSION
                 obtained by Taiyabah Masjid, not because it is open.

   The two editions share one hadith-numbering scheme, so the English for a
   hadith is looked up by its number and lands against the right Arabic with
   nothing to align by text.

   WHAT THIS EDITION GIVES THAT THE FLAT LIST DID NOT
     * 97 books (kutub), each named, each with its hadith range
     * the standard numbering to 7563 — the numbers people actually cite,
       and the ones sunnah.com uses, so a reference here matches a reference
       anywhere else. The old pack's 1–7008 matched nothing.
     * full tashkīl on the Arabic, and the English translation beside it

   ENGLISH IS LICENSED, NOT OPEN. The Arabic is a 9th-century work and
   belongs to nobody; the English is a modern translation that does. It is
   included here only because the masjid has been given permission to use it,
   and the credit below records that — see LICENCE.txt. If that permission
   ever lapses, rebuild with --no-english and the pack ships Arabic alone.

   NO COMMENTARY, AND WHY
   The previous source carried Ibn Ḥajar's Fatḥ al-Bārī keyed to its own
   1–7008 numbering. Carrying it over means matching the two editions by
   text, and they do not match: an exact full-text comparison aligns 22.7%,
   and positional windows align none at all, because the editions differ in
   length and internal punctuation. Attaching commentary on a fuzzy match
   would put the wrong scholar's words under the wrong hadith. It is left
   out until there is a commentary keyed to the standard numbering.

       node scripts/build-bukhari.mjs [ara-bukhari.json] [eng-bukhari.json]
       node scripts/build-bukhari.mjs --no-english [ara-bukhari.json]
*/
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from "node:fs";

const argv = process.argv.slice(2);
const NO_ENGLISH = argv.includes("--no-english");
const paths = argv.filter(a => !a.startsWith("--"));
const SRC = paths[0] || "/tmp/ara-bukhari.json";
const ENG = paths[1] || "/tmp/eng-bukhari.json";
const OUT = "quran/hadith/bukhari";

/* Must match the app's own normaliser exactly, or a search for a word typed
   without diacritics will never find the word that has them.

   Written with ranges that are checked below rather than trusted: a class
   like [ؚ-ٰ] looks like "the diacritics" and silently swallows
   every Arabic letter. That mistake cost an afternoon. */
const DIACRITICS = /[ؐ-ًؚ-ٰٟۖ-ۭ࣓-ࣿـ]/gu;
export const searchable = s => s
  .replace(DIACRITICS, "")
  .replace(/[آأإٱ]/gu, "ا")
  .replace(/ة/gu, "ه")
  .replace(/ى/gu, "ي")
  .replace(/\s+/gu, " ")
  .trim();

/* The English index line. Lower-cased, whitespace collapsed, and the
   honorific glyph ﷺ dropped so a search for "messenger" is not broken by the
   bracketed (ﷺ) that follows it. Nothing else is stripped: the reader's query
   is folded the same way before it is matched. */
export const enSearchable = s => s
  .replace(/ﷺ/gu, " ")
  .toLowerCase()
  .replace(/\s+/gu, " ")
  .trim();

/* A letter must survive normalisation. If this ever fails the class above has
   eaten the alphabet, and every search would match everything. */
function assertNormaliserSane() {
  const probe = "حَدَّثَنَا الْحُمَيْدِيُّ";
  const out = searchable(probe);
  if (!/[ء-ي]{5}/.test(out) || out.length < 10)
    throw new Error(`the search normaliser is destroying Arabic letters: "${probe}" -> "${out}"`);
  if (/[ً-ْ]/.test(out))
    throw new Error("the search normaliser is leaving diacritics in");
  if (enSearchable("The Messenger (ﷺ) said") !== "the messenger ( ) said")
    throw new Error("the English normaliser is not folding as the reader's query will be");
}

const LICENCE_AR_ONLY =
`Ṣaḥīḥ al-Bukhārī — Arabic text and book structure
=================================================

Source      hadith-api, edition "ara-bukhari"
            https://github.com/fawazahmed0/hadith-api

Licence     The Unlicense — a dedication of the work to the public domain.
            https://unlicense.org/

            Anyone is free to copy, modify, publish, use, compile, sell or
            distribute this, for any purpose, commercial or not.

There is no condition attached to this text and nothing that must be passed
on. The credit above is kept because provenance is worth recording, not
because a licence demands it.

The Arabic hadith text is a 9th-century work and belongs to nobody.

NO ENGLISH TRANSLATION IS INCLUDED. The same project publishes English and
Urdu editions, and its public-domain dedication cannot extend to translations
it did not own: the widely circulated English Bukhārī is a modern work still
in copyright. Only the Arabic is shipped.

NO COMMENTARY IS INCLUDED. See scripts/build-bukhari.mjs for why.
`;

const LICENCE_BILINGUAL =
`Ṣaḥīḥ al-Bukhārī — Arabic text, book structure, and English translation
=======================================================================

ARABIC TEXT AND BOOK STRUCTURE
------------------------------
Source      hadith-api, edition "ara-bukhari"
            https://github.com/fawazahmed0/hadith-api

Licence     The Unlicense — a dedication of the work to the public domain.
            https://unlicense.org/

The Arabic hadith text is a 9th-century work and belongs to nobody. There is
no condition attached to it and nothing that must be passed on. The credit is
kept because provenance is worth recording, not because a licence demands it.

ENGLISH TRANSLATION
-------------------
Translation Dr Muhammad Muhsin Khan
Publisher   Darussalam
Source      hadith-api, edition "eng-bukhari"
            https://github.com/fawazahmed0/hadith-api

Licence     IN COPYRIGHT. This translation is a modern work and is NOT public
            domain. PERMISSION GRANTED: Taiyabah Masjid has obtained permission
            to use it, and that permission is what makes the English here
            lawful to ship. The Arabic's public-domain status does not, and
            cannot, extend to it.

            If that permission ever lapses, rebuild the pack with
            --no-english and the English is removed cleanly, Arabic intact.

NO COMMENTARY IS INCLUDED. See scripts/build-bukhari.mjs for why.
`;

if (process.argv[1].endsWith("build-bukhari.mjs")) {
  assertNormaliserSane();
  if (!existsSync(SRC)) {
    console.error(`\nArabic source not found: ${SRC}\n`);
    console.error("Fetch it with:");
    console.error("  curl -o /tmp/ara-bukhari.json \\");
    console.error("    https://raw.githubusercontent.com/fawazahmed0/hadith-api/1/editions/ara-bukhari.min.json\n");
    process.exit(1);
  }
  if (!NO_ENGLISH && !existsSync(ENG)) {
    console.error(`\nEnglish source not found: ${ENG}\n`);
    console.error("Fetch it with:");
    console.error("  curl -o /tmp/eng-bukhari.json \\");
    console.error("    https://raw.githubusercontent.com/fawazahmed0/hadith-api/1/editions/eng-bukhari.min.json\n");
    console.error("Or rebuild Arabic-only with --no-english.\n");
    process.exit(1);
  }

  const src = JSON.parse(readFileSync(SRC, "utf8"));
  const sections = src.metadata.sections;
  const details = src.metadata.section_details;

  /* English, keyed by the hadith number the two editions share. */
  let enByNum = new Map();
  if (!NO_ENGLISH) {
    const eng = JSON.parse(readFileSync(ENG, "utf8"));
    for (const h of eng.hadiths)
      enByNum.set(h.hadithnumber, String(h.text).replace(/\s+/g, " ").trim());
  }

  const books = Object.keys(details)
    .map(Number).filter(n => n > 0).sort((a, b) => a - b)
    .map(n => ({
      n,
      name: sections[String(n)] || `Book ${n}`,
      first: details[String(n)].hadithnumber_first,
      last: details[String(n)].hadithnumber_last,
    }));

  /* 311 hadith in this edition carry book 0 — the source failed to place
     them. They are real hadith with real numbers, so rather than lose them
     they are placed by which book's number range contains them.

     That is only safe because it was checked against the 7,278 hadith the
     source DID place: the range never disagrees with the source's own book,
     not once. Six fall in gaps between ranges and stay unplaced; they are
     still reachable by number and by search. */
  const bookOf = n => (books.find(b => n >= b.first && n <= b.last) || {}).n || 0;
  let disagreements = 0;
  for (const h of src.hadiths) {
    const stated = h.reference.book;
    if (stated > 0 && bookOf(h.hadithnumber) !== stated) disagreements++;
  }
  if (disagreements)
    throw new Error(`placing hadith by number range contradicts the source ${disagreements} time(s) — do not ship this`);

  const items = src.hadiths.map(h => ({
    n: h.hadithnumber,
    b: h.reference.book > 0 ? h.reference.book : bookOf(h.hadithnumber),
    ar: String(h.text).replace(/\s+/g, " ").trim(),
    en: enByNum.get(h.hadithnumber) || "",
  })).filter(x => x.n && x.ar);

  /* If English is meant to ship, every hadith must have it. A pack that is
     bilingual for some hadith and not others is worse than one that is
     honestly Arabic-only — the reader cannot tell which they are getting. */
  if (!NO_ENGLISH) {
    const without = items.filter(x => !x.en);
    if (without.length)
      throw new Error(`${without.length} hadith have no English (first: ${without[0].n}) — the English edition does not cover this Arabic edition; do not ship a half-translated pack`);
  }

  /* One file per book, so opening a book fetches that book and nothing else. */
  rmSync(OUT, { recursive: true, force: true });
  mkdirSync(`${OUT}/b`, { recursive: true });

  const row = x => NO_ENGLISH ? { n: x.n, i: x.i, ar: x.ar } : { n: x.n, i: x.i, ar: x.ar, en: x.en };

  const byBook = new Map();
  for (const it of items) {
    if (!byBook.has(it.b)) byBook.set(it.b, []);
    byBook.get(it.b).push(it);
  }
  for (const [b, list] of byBook) {
    list.sort((x, y) => x.n - y.n);
    writeFileSync(`${OUT}/b/${b}.json`,
      JSON.stringify(list.map((x, i) => row({ ...x, i: i + 1 }))));
  }

  const bookList = books.map(b => ({
    ...b, count: (byBook.get(b.n) || []).length,
  })).filter(b => b.count > 0);
  const unplaced = (byBook.get(0) || []).length;

  writeFileSync(`${OUT}/books.json`, JSON.stringify(bookList));

  /* Search: one stripped line per hadith, with the number and book beside it
     so a hit can say where it lives. Arabic always; English too when it ships,
     as a fourth element, so an older reader that destructures [n, b, text]
     keeps working and a newer one can match either language. Fetched only
     when somebody searches. */
  writeFileSync(`${OUT}/search.json`, JSON.stringify(
    items.slice().sort((a, b) => a.n - b.n).map(x =>
      NO_ENGLISH ? [x.n, x.b, searchable(x.ar)]
                 : [x.n, x.b, searchable(x.ar), enSearchable(x.en)])));

  const highest = Math.max(...items.map(x => x.n));

  writeFileSync(`${OUT}/index.json`, JSON.stringify({
    id: "bukhari",
    name: "Ṣaḥīḥ al-Bukhārī",
    nameAr: "صحيح البخاري",
    kind: "text",
    language: NO_ENGLISH ? "ar" : "ar+en",
    count: items.length,
    highest,
    books: bookList.length,
    unplaced,
    source: "hadith-api (fawazahmed0), edition ara-bukhari",
    sourceUrl: "https://github.com/fawazahmed0/hadith-api",
    licence: "The Unlicense — released into the public domain",
    licenceUrl: "https://unlicense.org/",
    attribution: "Arabic text and book structure from the public-domain hadith-api project.",
    english: NO_ENGLISH ? null : {
      translation: "Dr Muhammad Muhsin Khan",
      publisher: "Darussalam",
      source: "hadith-api (fawazahmed0), edition eng-bukhari",
      sourceUrl: "https://github.com/fawazahmed0/hadith-api",
      licence: "In copyright, included by permission obtained by Taiyabah Masjid",
      attribution: "English translation by Dr Muhammad Muhsin Khan (Darussalam), used by permission.",
    },
    prepared: `${items.length} hadith across ${bookList.length} books, numbering to ${highest}, with tashkīl` +
              (NO_ENGLISH ? "" : " and Dr Muhsin Khan's English translation") + ". " +
              `Hadith the source left unplaced are assigned by book number range, a method checked against every hadith the source did place. ` +
              `No commentary: the Fatḥ al-Bārī available elsewhere is keyed to a different numbering and cannot be matched reliably.`,
    arabicOnly: NO_ENGLISH,
  }, null, 1));

  writeFileSync(`${OUT}/LICENCE.txt`, NO_ENGLISH ? LICENCE_AR_ONLY : LICENCE_BILINGUAL);

  console.log(`${items.length} hadith, numbering to ${highest}` + (NO_ENGLISH ? " (Arabic only)" : " (Arabic + English)"));
  console.log(`  ${bookList.length} books, one file each` + (unplaced ? `, plus ${unplaced} the source could not place` : ""));
  console.log(`  range-placement agreed with the source on all ${src.hadiths.length - (byBook.get(0) || []).length} hadith it had placed`);
  if (!NO_ENGLISH) console.log(`  English: Dr Muhsin Khan's translation, by permission`);
}
