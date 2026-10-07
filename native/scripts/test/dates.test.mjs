/**
 * Taiyabah Masjid — dates, countdowns and the Hijri label.
 * Copyright (c) 2026 Yameen Bux. All rights reserved. See LICENSE.md.
 *
 * The countdown is the most-read line on the busiest screen. Its whole design
 * is that a language can put the number where its grammar wants it — Urdu
 * says "45 منٹ میں", not "میں 45 منٹ" — so each shape is one sentence with
 * the figures dropped into it. A test that only ever ran in English would
 * miss the thing that matters, so these check the placeholders survive.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { countdown, hijri, dayMonthYear, longDate, shortDate, fullDow, monthYear }
  from "../../src/dates.js";

/* The app's own lookup: a key and the English to fall back on. */
const en = (k, fallback) => fallback;

/* A pack that puts the figures somewhere else entirely, the way Urdu does. */
const ur = (k, fallback) => ({
  "time.in_min": "{n} منٹ میں",
  "time.in_hm": "{h} گھنٹے {m} منٹ میں",
  "time.in_h": "{h} گھنٹے میں",
  "date.ah": "ھ",
  "date.hijri.6": "رجب",
}[k] ?? fallback);

test("under an hour counts in minutes", () => {
  assert.equal(countdown(en, 1), "in 1 min");
  assert.equal(countdown(en, 45), "in 45 min");
  assert.equal(countdown(en, 59), "in 59 min");
});

test("an hour and over counts in hours and minutes", () => {
  assert.equal(countdown(en, 60), "in 1h");
  assert.equal(countdown(en, 90), "in 1h 30m");
  assert.equal(countdown(en, 125), "in 2h 05m");
});

test("a whole number of hours does not say 00m", () => {
  assert.equal(countdown(en, 120), "in 2h");
  assert.equal(countdown(en, 180), "in 3h");
});

test("the minutes are padded, so 2h 5m does not read as 2h 5", () => {
  assert.ok(countdown(en, 125).includes("05m"));
});

test("a language can put the figures where its grammar wants them", () => {
  /* This is the whole reason the countdown is a sentence per shape rather
     than glued together from an "in" and two unit words. */
  assert.equal(countdown(ur, 45), "45 منٹ میں");
  assert.equal(countdown(ur, 90), "1 گھنٹے 30 منٹ میں");
  assert.equal(countdown(ur, 120), "2 گھنٹے میں");
});

test("no placeholder is ever left on screen", () => {
  for (const pack of [en, ur])
    for (const mins of [0, 1, 59, 60, 61, 90, 125, 600, 1439])
      assert.ok(!/\{[nhm]\}/.test(countdown(pack, mins)),
        `${mins} minutes left a placeholder: ${countdown(pack, mins)}`);
});

test("the Hijri label is taken apart and translated, not shown as typed", () => {
  assert.equal(hijri(en, "12 Rajab 1447 AH"), "12 Rajab 1447 AH");
  assert.equal(hijri(ur, "12 Rajab 1447 AH"), "12 رجب 1447 ھ");
});

test("an unrecognised Hijri string is shown rather than lost", () => {
  /* Better the raw string than a blank where the date should be. */
  assert.equal(hijri(en, "something unexpected"), "something unexpected");
  assert.equal(hijri(en, ""), "");
  assert.equal(hijri(en, null), "");
});

test("the stepper's date is the website's shape: day, full month, year", () => {
  /* Not "Mon 5 Oct 2026" — the weekday is the line above it. */
  assert.equal(dayMonthYear(en, new Date(2026, 9, 5)), "5 October 2026");
});

test("the long date carries the weekday and the short one abbreviates", () => {
  assert.equal(longDate(en, new Date(2026, 9, 5)), "Monday 5 October 2026");
  assert.equal(shortDate(en, new Date(2026, 9, 5)), "Mon 5 Oct");
  assert.equal(fullDow(en, new Date(2026, 9, 5)), "Monday");
  assert.equal(monthYear(en, new Date(2026, 9, 5)), "October 2026");
});
