/**
 * Taiyabah Masjid — the split muṣḥaf is the same muṣḥaf.
 * Copyright (c) 2026 Yameen Bux. All rights reserved. See LICENSE.md.
 *
 * Splitting 2.3MB of scripture into 114 files is the kind of change that can
 * drop a verse without anybody noticing for months. These compare the files
 * the app now reads against the single file they were cut from, verse for
 * verse, so a bad split fails here rather than in somebody's ṣalāh.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import whole from "../../src/data/quran-text.json" with { type: "json" };
import { surah } from "../../src/data/quran-index.js";

/* FIRST in the file on purpose: it asserts what has NOT been loaded, and the
   tests below deliberately load all 114. */
test("opening one sūrah does not parse the other 113 — the whole point", () => {
  const loaded = () => Object.keys(require.cache)
    .filter(k => /[\\/]quran[\\/]\d+\.json$/.test(k)).length;
  assert.equal(loaded(), 0, "something had already parsed a sūrah before this ran");
  const f = surah(1);
  assert.equal(f.length, 7);
  assert.equal(loaded(), 1,
    "opening al-Fātiḥah parsed more than one file — the requires are not lazy");
  surah(114);
  assert.equal(loaded(), 2, "a second sūrah should add exactly one more");
});

test("all 114 sūrahs are there, and nothing else is", () => {
  assert.equal(Object.keys(whole).length, 114);
  for (let n = 1; n <= 114; n++)
    assert.ok(surah(n).length > 0, `sūrah ${n} came back empty`);
  assert.deepEqual(surah(0), []);
  assert.deepEqual(surah(115), []);
});

test("6,236 āyāt — the canonical count, which the split must not change", () => {
  let total = 0;
  for (let n = 1; n <= 114; n++) total += surah(n).length;
  assert.equal(total, 6236);
});

test("every verse is identical to the file it was cut from", () => {
  for (let n = 1; n <= 114; n++)
    assert.deepEqual(surah(n), whole[String(n)], `sūrah ${n} differs from the source`);
});

test("al-Fātiḥah still opens with the basmalah", () => {
  const f = surah(1);
  assert.equal(f.length, 7);
  assert.ok(f[0][1].includes("بِسۡمِ"), `expected the basmalah, got ${f[0][1]}`);
});
