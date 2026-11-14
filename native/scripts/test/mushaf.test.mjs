/**
 * Taiyabah Masjid — a page knows which sūrah it is in.
 * Copyright (c) 2026 Yameen Bux. All rights reserved. See LICENSE.md.
 *
 * src/mushaf.js inverts mushaf.json's surahPage so that the muṣḥaf can keep
 * SŪRAH favourites instead of page numbers. The whole feature rests on that
 * inversion being right at the boundaries — the page a sūrah opens on, the
 * page before it, the first page of the book and the last — because those
 * are exactly the places an off-by-one hides: anywhere in the middle of
 * al-Baqara the answer is obviously right whether the code is or not.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import MUSHAF from "../../src/data/mushaf.json" with { type: "json" };
import { surahAt, pageOf, surahsFromPages, PAGES } from "../../src/mushaf.js";

/* A PAGE CAN OPEN MORE THAN ONE SŪRAH, and in this printing eight pages do —
   page 844 opens al-ʿAṣr, al-Humaza AND al-Fīl. So "the sūrah this page is
   in" has no single answer at the end of the muṣḥaf, and surahAt() answers
   with the FIRST sūrah to open on it — where the reader starts the page, and
   what the web app's mushafAt() has always returned, so that the two
   platforms cannot label the same page differently. The
   first version of this test asserted that every sūrah's opening page
   reports that sūrah, which no implementation could satisfy, and it is what
   turned the three-opening pages up in the first place.

   The screen never relies on the guess being the reader's intention — it
   names the sūrah on the button and in the note that follows, so a reader
   who wanted one of the others can see that and pick it from the Sūrah
   list instead. */
test("a page reports the first sūrah to open on it", () => {
  for (let n = 1; n <= 114; n++) {
    const p = pageOf(n);
    assert.ok(p > 0, `sūrah ${n} has no opening page in mushaf.json`);
    /* the lowest-numbered sūrah sharing this opening page */
    let first = n;
    while (first > 1 && pageOf(first - 1) === p) first--;
    assert.equal(surahAt(p), first,
      `page ${p} opens sūrahs from ${first} but surahAt() said ${surahAt(p)}`);
  }
});

test("the eight shared opening pages each report their last sūrah", () => {
  const shared = new Map();
  for (let n = 1; n <= 114; n++) {
    const p = pageOf(n);
    shared.set(p, (shared.get(p) || []).concat(n));
  }
  const many = [...shared.entries()].filter(([, ns]) => ns.length > 1);
  assert.equal(many.length, 8,
    "the muṣḥaf's shared opening pages changed — check this printing");
  for (const [p, ns] of many)
    assert.equal(surahAt(p), Math.min(...ns),
      `page ${p} carries sūrahs ${ns.join(", ")}`);
});

/* THE PAGE BEFORE AN OPENING must belong to an EARLIER sūrah. This is the
   assertion that catches an off-by-one: a <= written as < would still pass
   the test above for most sūrahs and fail here for all of them. */
test("the page before an opening belongs to an earlier sūrah", () => {
  for (let n = 2; n <= 114; n++) {
    const p = pageOf(n);
    const before = surahAt(p - 1);
    if (p - 1 < pageOf(1)) continue;           // the frontispiece, handled below
    assert.ok(before !== null && before < n,
      `page ${p - 1} is before sūrah ${n} opens but surahAt() said ${before}`);
  }
});

test("a page before the first sūrah opens belongs to none", () => {
  const first = pageOf(1);
  for (let p = 1; p < first; p++)
    assert.equal(surahAt(p), null, `page ${p} is before the muṣḥaf starts`);
  assert.equal(surahAt(0), null);
  assert.equal(surahAt(-3), null);
});

test("the last page of the book is the last sūrah", () => {
  assert.equal(surahAt(PAGES), 114);
  assert.equal(PAGES, MUSHAF.pages);
  /* Past the end reads as the last sūrah rather than throwing: the screen
     clamps before it ever asks, and a counter that throws here would take the
     reader's page with it. */
  assert.equal(surahAt(PAGES + 50), 114);
});

test("surahAt never skips: every page from the first onwards has an answer", () => {
  const first = pageOf(1);
  let prev = 0;
  for (let p = first; p <= PAGES; p++) {
    const n = surahAt(p);
    assert.ok(n !== null, `page ${p} fell through with no sūrah`);
    assert.ok(n >= prev, `page ${p} went backwards: ${prev} then ${n}`);
    prev = n;
  }
  assert.equal(prev, 114, "walking every page should finish on an-Nās");
});

test("surahAt rejects what is not a number rather than guessing", () => {
  assert.equal(surahAt(undefined), null);
  assert.equal(surahAt(null), null);
  assert.equal(surahAt("not a page"), null);
  assert.equal(surahAt(NaN), null);
});

test("pageOf is the inverse, and says 0 for a sūrah that does not exist", () => {
  assert.equal(pageOf(1), MUSHAF.surahPage["1"]);
  assert.equal(pageOf(114), MUSHAF.surahPage["114"]);
  assert.equal(pageOf(0), 0);
  assert.equal(pageOf(115), 0);
  assert.equal(pageOf("nonsense"), 0);
});

/* THE MIGRATION. Anybody already using the old favourites has page numbers
   saved, and they must come across as the sūrahs those pages sat in rather
   than being dropped on the floor. */
test("old page favourites migrate to the sūrahs those pages were in", () => {
  const baqara = pageOf(2), imran = pageOf(3), nas = pageOf(114);
  assert.deepEqual(surahsFromPages([baqara, imran, nas]), [2, 3, 114]);

  /* Three pages of the same sūrah are ONE favourite, not three. */
  assert.deepEqual(surahsFromPages([baqara, baqara + 1, baqara + 2]), [2]);

  /* Sorted, whatever order they were kept in. */
  assert.deepEqual(surahsFromPages([nas, baqara]), [2, 114]);

  /* A page belonging to no sūrah is dropped, and junk does not throw. */
  assert.deepEqual(surahsFromPages([1]), pageOf(1) === 1 ? [1] : []);
  assert.deepEqual(surahsFromPages([]), []);
  assert.deepEqual(surahsFromPages(null), []);
  assert.deepEqual(surahsFromPages(["x", undefined]), []);
});
