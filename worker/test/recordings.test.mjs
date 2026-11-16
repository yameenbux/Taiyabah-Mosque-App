/**
 * Taiyabah Masjid — the recordings parser must not drift or invent.
 *
 * These prove the two things the feature stands on: that the date, time and
 * length of a recording come from its slug (so they cannot be knocked loose by
 * a change to the table's columns), and that a category name a caller sends can
 * never point the Worker at anything but the masjid's own archive.
 *
 * The HTML here is trimmed from the real pages at emasjidlive.co.uk — same
 * columns, same slug shape, same "+"/"%27" encoding in the folder names.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseRecordings, parseCategories, fromSlug, categoryName,
  isCategoryPath, MP3_BASE, DEFAULT_CATEGORIES,
} from "../src/recordings.js";

const ROW = (slug, title, date, time, cat, dur) =>
  `<tr><td data-sort="1794253800">${date}</td><td>${time}</td>` +
  `<td>${title}</td><td>${cat}</td><td>${dur}</td>` +
  `<td><a href="https://emasjidlive.co.uk/recordings/player/${slug}">Play</a></td></tr>`;

const CAT_PAGE = `<table><thead><tr><th>Date</th><th>Time</th><th>Title</th><th>Category</th><th>Length</th><th></th></tr></thead><tbody>` +
  ROW("taiyabahmasjid-20261109-Monday-195000-2115-uploaded",
      "Surah Al Imran Ayah: 110 How to nurture the ummah",
      "Mon, 9 Nov 2026", "19:50:00 GMT", "Dars-e-Quran", "00:35:15") +
  ROW("taiyabahmasjid-20261102-Monday-195000-1914-uploaded",
      "Silence &amp; sin",
      "Mon, 2 Nov 2026", "19:50:00 GMT", "Dars-e-Quran", "00:31:54") +
  `</tbody></table>`;

test("date, time and duration are read from the slug, not the columns", () => {
  const m = fromSlug("taiyabahmasjid-20261109-Monday-195000-2115-uploaded");
  assert.equal(m.date, "2026-11-09");
  assert.equal(m.day, "Monday");
  assert.equal(m.time, "19:50");
  assert.equal(m.durationSec, 2115);                       // 35:15
  assert.equal(m.mp3, `${MP3_BASE}/taiyabahmasjid-20261109-Monday-195000-2115-uploaded.mp3`);
});

test("a slug that is not ours yields nothing", () => {
  assert.equal(fromSlug("something-else"), null);
  assert.equal(fromSlug(""), null);
  assert.equal(fromSlug("taiyabahmasjid-2026-Monday-195000-2115-uploaded"), null);
});

test("a category page parses into recordings, newest first", () => {
  const recs = parseRecordings(CAT_PAGE, "Dars-e-Quran");
  assert.equal(recs.length, 2);
  assert.equal(recs[0].title, "Surah Al Imran Ayah: 110 How to nurture the ummah");
  assert.equal(recs[0].date, "2026-11-09");
  assert.equal(recs[0].durationSec, 2115);
  assert.equal(recs[0].mp3, `${MP3_BASE}/taiyabahmasjid-20261109-Monday-195000-2115-uploaded.mp3`);
  assert.equal(recs[0].category, "Dars-e-Quran");
  // entities in the title are decoded
  assert.equal(recs[1].title, "Silence & sin");
});

test("the title is found by what it is not, so a reordered table still works", () => {
  // Title moved to the LAST text column, before the Play link.
  const reordered =
    `<tr><td>Mon, 9 Nov 2026</td><td>19:50:00 GMT</td><td>00:35:15</td><td>Dars-e-Quran</td>` +
    `<td>How to nurture the ummah</td>` +
    `<td><a href="/recordings/player/taiyabahmasjid-20261109-Monday-195000-2115-uploaded">Play</a></td></tr>`;
  const recs = parseRecordings(reordered, "Dars-e-Quran");
  assert.equal(recs.length, 1);
  assert.equal(recs[0].title, "How to nurture the ummah");
  assert.equal(recs[0].date, "2026-11-09");        // still right, from the slug
});

test("rows without a recording slug are dropped, and duplicates collapse", () => {
  const noise =
    `<tr><td>heading</td></tr>` +
    `<tr><td><a href="/some/other/link">Play</a></td></tr>` +
    ROW("taiyabahmasjid-20261109-Monday-195000-2115-uploaded", "One", "Mon, 9 Nov 2026", "19:50:00", "Bayans", "00:35:15") +
    ROW("taiyabahmasjid-20261109-Monday-195000-2115-uploaded", "One again", "Mon, 9 Nov 2026", "19:50:00", "Bayans", "00:35:15");
  const recs = parseRecordings(noise, "Bayans");
  assert.equal(recs.length, 1);
  assert.equal(recs[0].title, "One");
});

test("categories come off the top page, decoded, in order", () => {
  const top =
    `<a href="/recordings/taiyabahmasjid/Dars-e-Quran">Dars-e-Quran</a>` +
    `<a href="/recordings/taiyabahmasjid/Jumu%27ah+Bayans">Jumu'ah Bayans</a>` +
    `<a href="https://emasjidlive.co.uk/recordings/taiyabahmasjid/Ramadhan+2026">Ramadhan 2026</a>` +
    `<a href="/recordings/taiyabahmasjid/player/taiyabahmasjid-20261109-Monday-195000-2115-uploaded">Play</a>` +
    `<a href="/recordings/taiyabahmasjid/Dars-e-Quran">dup</a>`;
  const cats = parseCategories(top);
  assert.deepEqual(cats.map(c => c.name), ["Dars-e-Quran", "Jumu'ah Bayans", "Ramadhan 2026"]);
  assert.equal(cats[1].path, "Jumu%27ah+Bayans");     // raw segment kept for the fetch
});

test("categoryName decodes + and %27 the way eMasjid encodes them", () => {
  assert.equal(categoryName("Jumu%27ah+Bayans"), "Jumu'ah Bayans");
  assert.equal(categoryName("Ramadhan+2026"), "Ramadhan 2026");
  assert.equal(categoryName("Qira%27at"), "Qira'at");
});

test("only real category segments are fetchable — no host, no traversal", () => {
  assert.ok(isCategoryPath("Dars-e-Quran"));
  assert.ok(isCategoryPath("Jumu%27ah+Bayans"));
  assert.equal(isCategoryPath("../../etc/passwd"), false);
  assert.equal(isCategoryPath("a/b"), false);
  assert.equal(isCategoryPath("http://evil.example"), false);
  assert.equal(isCategoryPath(""), false);
  assert.equal(isCategoryPath(null), false);
});

test("a fallback set of categories exists for when the top page cannot be read", () => {
  assert.ok(DEFAULT_CATEGORIES.length >= 1);
  for (const c of DEFAULT_CATEGORIES) assert.ok(c.name && c.path);
});
