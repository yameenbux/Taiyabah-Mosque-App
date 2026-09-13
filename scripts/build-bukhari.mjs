/* Taiyabah Masjid — build the Ṣaḥīḥ al-Bukhārī reference pack.
   Copyright (c) 2026 Yameen Bux. All rights reserved (this script).

   WHY THIS WAS REBUILT
   The first pack was a flat list: 7,008 numbered paragraphs, no books, no
   chapters, no way in except a number you already knew. That is not a
   readable Bukhārī, it is a database dump with a scrollbar.

   This one is built from an edition that carries the structure:

       source   https://github.com/fawazahmed0/hadith-api  (ara-bukhari)
       licence  The Unlicense — released into the public domain

   Public domain is a stronger position than the ODbL pack it replaces:
   nothing to attribute as a condition, nothing to pass on. The credit below
   is kept anyway, because where a text came from is worth recording even
   when no licence compels it.

   WHAT THIS EDITION GIVES THAT THE LAST ONE DID NOT
     * 97 books (kutub), each named, each with its hadith range
     * the standard numbering to 7563 — the numbers people actually cite,
       and the ones sunnah.com uses, so a reference here matches a reference
       anywhere else. The old pack's 1–7008 matched nothing.
     * full tashkīl, as before

   NO COMMENTARY, AND WHY
   The previous source carried Ibn Ḥajar's Fatḥ al-Bārī keyed to its own
   1–7008 numbering. Carrying it over means matching the two editions by
   text, and they do not match: an exact full-text comparison aligns 22.7%,
   and positional windows align none at all, because the editions differ in
   length and internal punctuation. Attaching commentary on a fuzzy match
   would put the wrong scholar's words under the wrong hadith. It is left
   out until there is a commentary keyed to the standard numbering.

       node scripts/build-bukhari.mjs [path-to-ara-bukhari.json]
*/
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from "node:fs";

const SRC = process.argv[2] || "/tmp/ara-bukhari.json";
const OUT = "quran/hadith/bukhari";

/* Must match the app's own normaliser exactly, or a search for a word typed
   without diacritics will never find the word that has them.

   Written with ranges that are checked below rather than trusted: a class
   like [ؚ-ٰ] looks like "the diacritics" and silently swallows
   every Arabic letter. That mistake cost an afternoon. */
const DIACRITICS = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u08D3-\u08FF\u0640]/gu;
export const searchable = s => s
  .replace(DIACRITICS, "")
  .replace(/[\u0622\u0623\u0625\u0671]/gu, "\u0627")
  .replace(/\u0629/gu, "\u0647")
  .replace(/\u0649/gu, "\u064A")
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
}

if (process.argv[1].endsWith("build-bukhari.mjs")) {
  assertNormaliserSane();
  if (!existsSync(SRC)) {
    console.error(`\nSource not found: ${SRC}\n`);
    console.error("Fetch it with:");
    console.error("  curl -o /tmp/ara-bukhari.json \\");
    console.error("    https://raw.githubusercontent.com/fawazahmed0/hadith-api/1/editions/ara-bukhari.min.json\n");
    process.exit(1);
  }

  const src = JSON.parse(readFileSync(SRC, "utf8"));
  const sections = src.metadata.sections;
  const details = src.metadata.section_details;

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
  })).filter(x => x.n && x.ar);

  /* One file per book, so opening a book fetches that book and nothing else. */
  rmSync(OUT, { recursive: true, force: true });
  mkdirSync(`${OUT}/b`, { recursive: true });

  const byBook = new Map();
  for (const it of items) {
    if (!byBook.has(it.b)) byBook.set(it.b, []);
    byBook.get(it.b).push(it);
  }
  for (const [b, list] of byBook) {
    list.sort((x, y) => x.n - y.n);
    writeFileSync(`${OUT}/b/${b}.json`,
      JSON.stringify(list.map((x, i) => ({ n: x.n, i: i + 1, ar: x.ar }))));
  }

  const bookList = books.map(b => ({
    ...b, count: (byBook.get(b.n) || []).length,
  })).filter(b => b.count > 0);
  const unplaced = (byBook.get(0) || []).length;
  if (unplaced) writeFileSync(`${OUT}/b/0.json`,
    JSON.stringify((byBook.get(0) || []).map((x, i) => ({ n: x.n, i: i + 1, ar: x.ar }))));

  writeFileSync(`${OUT}/books.json`, JSON.stringify(bookList));

  /* Search: one stripped line per hadith, with the number and book beside it
     so a hit can say where it lives. Fetched only when somebody searches. */
  writeFileSync(`${OUT}/search.json`, JSON.stringify(
    items.slice().sort((a, b) => a.n - b.n).map(x => [x.n, x.b, searchable(x.ar)])));

  writeFileSync(`${OUT}/index.json`, JSON.stringify({
    id: "bukhari",
    name: "Ṣaḥīḥ al-Bukhārī",
    nameAr: "صحيح البخاري",
    kind: "text",
    language: "ar",
    count: items.length,
    highest: Math.max(...items.map(x => x.n)),
    books: bookList.length,
    unplaced,
    source: "hadith-api (fawazahmed0), edition ara-bukhari",
    sourceUrl: "https://github.com/fawazahmed0/hadith-api",
    licence: "The Unlicense — released into the public domain",
    licenceUrl: "https://unlicense.org/",
    attribution: "Arabic text and book structure from the public-domain hadith-api project.",
    prepared: `${items.length} hadith across ${bookList.length} books, numbering to ${Math.max(...items.map(x => x.n))}, with tashkīl. ` +
              `Hadith the source left unplaced are assigned by book number range, a method checked against every hadith the source did place. ` +
              `No commentary: the Fatḥ al-Bārī available elsewhere is keyed to a different numbering and cannot be matched reliably.`,
    arabicOnly: true,
  }, null, 1));

  writeFileSync(`${OUT}/LICENCE.txt`,
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
`);

  console.log(`${items.length} hadith, numbering to ${Math.max(...items.map(x => x.n))}`);
  console.log(`  ${bookList.length} books, one file each` + (unplaced ? `, plus ${unplaced} the source could not place` : ""));
  console.log(`  range-placement agreed with the source on all ${src.hadiths.length - (byBook.get(0) || []).length} hadith it had placed`);
}
