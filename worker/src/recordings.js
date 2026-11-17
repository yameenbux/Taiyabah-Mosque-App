/**
 * Taiyabah Masjid — the masjid's own recordings, read off eMasjid Live.
 * Copyright (c) 2026 Yameen Bux. All rights reserved. See LICENSE.md.
 *
 * WHAT THIS IS. The masjid broadcasts and records to eMasjid Live, and that
 * platform already keeps a public, dated archive of every dars, bayaan and
 * khatm at emasjidlive.co.uk/recordings/taiyabahmasjid. This file turns that
 * archive — which is a set of server-rendered HTML tables built for a browser
 * — into clean JSON the app and the website can draw a native list from.
 *
 * WHY THE WORKER AND NOT THE APP. Two reasons, and either on its own would be
 * enough. The website is served from a different origin, so a browser cannot
 * fetch emasjidlive.co.uk from it (CORS); the Worker can fetch anything and
 * hand back JSON with our own CORS. And the parsing lives in ONE place: when
 * eMasjid changes a column or a class name, this file is the only thing that
 * has to follow, not two clients shipped to phones that cannot be patched.
 *
 * WHY WE DO NOT TOUCH THE LIVE STREAM. eMasjid sells an "App Autoplay Licence"
 * for putting their LIVE broadcast inside an app; the in-app live player stays
 * on the masjid's own RadioCast feed and this file never reaches for the live
 * endpoint. Recordings are the masjid's own content, published openly by the
 * platform the masjid pays for, and that is all this reads.
 *
 * THE ONE FACT THAT MAKES THIS ROBUST. Every recording's play link carries a
 * slug like
 *
 *     taiyabahmasjid-20261109-Monday-195000-2115-uploaded
 *
 * and that slug is canonical: the date (2026-11-09), the day (Monday), the
 * time (19:50:00) and the DURATION IN SECONDS (2115 = 35:15) are all in it,
 * and the audio file is that slug with ".mp3" on the end under
 * recordings.emasjidlive.uk/taiyabahmasjid/. So we read date, time and length
 * from the slug — which cannot drift even if the table's columns are reordered
 * — and take only the human title from the table, where it is the one thing
 * the slug does not hold. Everything here is PURE so test/recordings.test.mjs
 * can prove it against fixed HTML with no network.
 */

/** The masjid, everywhere. One site, one slug — not taken from any request. */
export const MASJID = "taiyabahmasjid";

/** Where the recordings archive and the audio files live. Fixed hosts: the
 *  route only ever fetches under RECORDINGS_BASE, so a category name from a
 *  caller can never point the Worker at another host. */
export const RECORDINGS_BASE = `https://emasjidlive.co.uk/recordings/${MASJID}`;
export const MP3_BASE = `https://recordings.emasjidlive.uk/${MASJID}`;

/* A category path is the raw URL segment eMasjid uses after the masjid slug,
   e.g. "Dars-e-Quran" or "Jumu%27ah+Bayans". We never let anything else
   through to the fetch: no slashes, no dots, no host — just the characters a
   category segment is actually made of. This is what stops the route from
   being turned into an open proxy. */
const CATEGORY_SEGMENT = /^[A-Za-z0-9%+._'()&-]{1,120}$/;

/* The canonical recording slug. taiyabahmasjid-YYYYMMDD-Day-HHMMSS-SECONDS. */
const SLUG = /^taiyabahmasjid-(\d{4})(\d{2})(\d{2})-([A-Za-z]+)-(\d{2})(\d{2})(\d{2})-(\d+)-uploaded$/;

/** True if a caller's ?c= value is a shape we will fetch. */
export function isCategoryPath(c) {
  return typeof c === "string" && CATEGORY_SEGMENT.test(c) && !c.includes("..");
}

/** The browsing name for a category segment: "Jumu%27ah+Bayans" -> "Jumu'ah
 *  Bayans". eMasjid encodes spaces as "+" and an apostrophe as "%27"; a bare
 *  decodeURIComponent would leave the "+" as a literal plus. */
export function categoryName(path) {
  let s = String(path || "").replace(/\+/g, " ");
  try { s = decodeURIComponent(s); } catch { /* leave it as-is on bad escapes */ }
  return s.trim();
}

/** Pull date, day, time and length out of a slug. null if it is not one of
 *  ours — which is how a stray row with a "Play" link to something else is
 *  dropped rather than shown as a broken card. */
export function fromSlug(slug) {
  const m = SLUG.exec(String(slug || ""));
  if (!m) return null;
  const [, y, mo, d, day, hh, mm, ss, sec] = m;
  return {
    slug,
    date: `${y}-${mo}-${d}`,
    day,
    time: `${hh}:${mm}`,
    durationSec: Number(sec),
    mp3: `${MP3_BASE}/${slug}.mp3`,
  };
}

/* Strip tags and collapse whitespace to the text a cell shows. */
const cellText = c => c.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

/* HTML entities the titles actually contain. The archive is plain text in
   Latin script with the odd apostrophe and ampersand, so a small table beats
   pulling a decoder in. */
export function unescapeHtml(s) {
  return String(s).replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#039;|&apos;/g, "'").replace(/&nbsp;/g, " ");
}

const DATE_RE = /^[A-Za-z]{3,9},?\s+\d{1,2}\s+[A-Za-z]{3,9}\s+\d{4}$/; // Mon, 9 Nov 2026
const TIME_RE = /^\d{1,2}:\d{2}(:\d{2})?(\s*[A-Za-z]{2,4})?$/;          // 19:50:00 GMT
const DUR_RE  = /^\d{1,2}:\d{2}(:\d{2})?$/;                              // 00:35:15

/**
 * Parse one category page into recordings, newest first (the order the page
 * already uses). Pure: give it the HTML, get rows back.
 *
 * The title is taken as the first table cell that is not the date, the time,
 * the duration, the category name or the word "Play". That is deliberately not
 * "the third column": if eMasjid ever reorders the table, date/time/length
 * still come from the slug and the title is still found by what it is not,
 * rather than by where it sat.
 */
export function parseRecordings(htmlStr, catName) {
  const html = String(htmlStr || "");
  const out = [];
  const seen = new Set();
  const rows = html.match(/<tr\b[\s\S]*?<\/tr>/gi) || [];
  for (const tr of rows) {
    const slugM = tr.match(/\/recordings\/player\/(taiyabahmasjid-[0-9A-Za-z-]+?-uploaded)/);
    if (!slugM) continue;
    const meta = fromSlug(slugM[1]);
    if (!meta || seen.has(meta.slug)) continue;

    const cells = (tr.match(/<td\b[^>]*>[\s\S]*?<\/td>/gi) || []).map(cellText).filter(Boolean);
    const cat = catName || "";
    let title = "";
    for (const c of cells) {
      if (DATE_RE.test(c) || TIME_RE.test(c) || DUR_RE.test(c)) continue;
      if (c === cat || /^play$/i.test(c)) continue;
      title = c; break;
    }
    title = unescapeHtml(title).trim();

    seen.add(meta.slug);
    out.push({
      title: title || prettyFromSlug(meta),
      category: cat,
      date: meta.date,
      day: meta.day,
      time: meta.time,
      durationSec: meta.durationSec,
      mp3: meta.mp3,
    });
  }
  return out;
}

/* A last-resort label if a row somehow has no title cell: the date, which is
   always true and never blank, so a card is never nameless. */
function prettyFromSlug(meta) {
  return `${meta.day} ${meta.date}`;
}

/**
 * Parse the top-level archive page into its categories, in the page's own
 * order. Each is { name, path } — path is the raw segment used to fetch it.
 * The masjid-slug-only links (the page's own "all" and header links) are
 * dropped; we want the folders under it.
 */
export function parseCategories(htmlStr) {
  const html = String(htmlStr || "");
  const re = new RegExp(`href="(?:https://emasjidlive\\.co\\.uk)?/recordings/${MASJID}/([^"/][^"]*)"`, "gi");
  const out = [];
  const seen = new Set();
  let m;
  while ((m = re.exec(html))) {
    const path = m[1];
    // A player link is not a category; its segment is "player" + the slug.
    if (/^player(\/|$)/i.test(path)) continue;
    if (!isCategoryPath(path) || seen.has(path)) continue;
    seen.add(path);
    out.push({ name: categoryName(path), path });
  }
  return out;
}

/* If the top-level page cannot be read or its markup moves, the feature should
   still open on the categories that have carried the archive for years, rather
   than show nothing. These are only a fallback — a good parse always wins. */
export const DEFAULT_CATEGORIES = [
  { name: "Dars-e-Quran", path: "Dars-e-Quran" },
  { name: "Dars-E-Hadith", path: "Dars-E-Hadith" },
  { name: "Bayans", path: "Bayans" },
  { name: "Jumu'ah Bayans", path: "Jumu%27ah+Bayans" },
];
