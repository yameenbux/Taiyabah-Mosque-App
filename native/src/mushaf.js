/**
 * Taiyabah Masjid — which sūrah a muṣḥaf page belongs to.
 * Copyright (c) 2026 Yameen Bux. All rights reserved. See LICENSE.md.
 *
 * WHY THIS EXISTS. The 13-line muṣḥaf could be favourited, but what it kept
 * was a PAGE NUMBER — a list reading "Page 247, Page 408, Page 611". Nobody
 * remembers a sūrah by its page in one particular printing, so the list was
 * unreadable and the committee reported the feature as missing altogether.
 * They asked for sūrah favourites instead, and a sūrah favourite needs one
 * thing the app did not have: given a page, which sūrah is it.
 *
 * mushaf.json already carries surahPage — the page each of the 114 sūrahs
 * OPENS on. Inverting it answers the question with no new data and nothing to
 * keep in step: the sūrah you are in is the one that opened at or before the
 * page you are looking at, nearest to it.
 *
 * EIGHT PAGES OPEN MORE THAN ONE SŪRAH — page 844 opens al-ʿAṣr, al-Humaza
 * AND al-Fīl — so at the end of the muṣḥaf "which sūrah is this page" has no
 * single answer. This returns the FIRST of them, because that is where the
 * reader starts the page, and because it is what the web app's own
 * mushafAt() has always returned when it names the page you are on. The two
 * platforms have to agree or the same page is labelled two different things.
 *
 * It is still a judgement rather than a fact, so the screen never acts on it
 * silently: the control names the sūrah it is about to keep, and so does the
 * note afterwards, so a reader who wanted one of the others can see that and
 * pick it from the sūrah list instead.
 *
 * PAGE 1 BELONGS TO NO SŪRAH. In this printing al-Fātiḥa opens on page 2 and
 * page 1 is the frontispiece, so surahAt(1) is null rather than a guess, and
 * the screen offers nothing to favourite there.
 */
import MUSHAF from "./data/mushaf.json";

/* Sorted once: the sūrahs in the order their pages run. Object key order is
   insertion order for integer-like keys in practice, but this file is
   generated and must not depend on that. */
const OPENS = Object.entries(MUSHAF.surahPage)
  .map(([n, page]) => ({ n: Number(n), page: Number(page) }))
  .filter(s => Number.isFinite(s.n) && Number.isFinite(s.page))
  .sort((a, b) => a.page - b.page || a.n - b.n);

export const PAGES = MUSHAF.pages;

/** The page a sūrah opens on, or 0 if there is no such sūrah. */
export function pageOf(surah) {
  return Number(MUSHAF.surahPage[String(surah)] || 0);
}

/**
 * The sūrah a page belongs to, or null for a page before the first one opens.
 *
 * @param {number} page  1-based, as the reader sees it
 * @returns {number|null} a sūrah number 1–114
 */
export function surahAt(page) {
  const p = Number(page);
  if (!Number.isFinite(p)) return null;
  let i = -1;
  for (let k = 0; k < OPENS.length; k++) {
    if (OPENS[k].page > p) break;
    i = k;
  }
  if (i < 0) return null;
  /* Walk back over any sūrahs sharing this one's opening page, so a page that
     opens three of them reports the first. Mirrors mushafAt() in index.html
     line for line. */
  while (i > 0 && OPENS[i - 1].page === OPENS[i].page) i--;
  return OPENS[i].n;
}

/**
 * Turn a list of favourited PAGES into a list of favourited SŪRAHS.
 *
 * This runs once, on the saved preferences of anybody who used the old
 * page-based favourites — see the migration in store.jsx. A page becomes the
 * sūrah it sat in, duplicates collapse (three favourited pages of al-Baqara
 * are one favourite now), and a page that belongs to no sūrah is dropped.
 * Nothing is thrown away silently that could have been kept.
 */
export function surahsFromPages(pages) {
  const out = [];
  for (const p of Array.isArray(pages) ? pages : []) {
    const n = surahAt(p);
    if (n && !out.includes(n)) out.push(n);
  }
  return out.sort((a, b) => a - b);
}
