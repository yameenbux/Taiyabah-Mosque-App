/**
 * Taiyabah Masjid — the prayer arithmetic.
 * Copyright (c) 2026 Yameen Bux. All rights reserved. See LICENSE.md.
 *
 * This is the busiest screen in the app and the one thing a congregation
 * would notice being wrong within minutes. It had no test at all.
 *
 * These exercise the real src/prayer.js, not a copy of it.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { nowLondon, londonInstant, pretty, nextJamaah, dayFor } from "../../src/prayer.js";

/* 5 October 2026 is a Monday; the bundled timetable has Zuhr jamāʿah at 13:45
 * and Asr at 17:30, which is what the app showed in every comparison. */
const OCT5 = "2026-10-05";

test("a day's record comes back with both columns", () => {
  const d = dayFor(new Date(2026, 9, 5, 12, 0, 0));
  assert.ok(d, "5 October 2026 should be in the bundled timetable");
  assert.equal(d.begins.fajr, "05:44");
  assert.equal(d.jamaat.zuhr, "13:45");
  /* Maghrib's jamāʿah IS the minute it begins — the masjid's practice, and
     the thing somebody would "fix" without knowing. */
  assert.equal(d.begins.maghrib, d.jamaat.maghrib);
});

test("a date outside the timetable is null, not a guess", () => {
  assert.equal(dayFor(new Date(2027, 0, 1, 12, 0, 0)), null);
  assert.equal(dayFor(new Date(2025, 11, 31, 12, 0, 0)), null);
});

test("pretty() is 12-hour with am/pm, and midnight and noon are not confused", () => {
  assert.equal(pretty("05:44"), "5:44 am");
  assert.equal(pretty("13:45"), "1:45 pm");
  assert.equal(pretty("00:30"), "12:30 am");
  assert.equal(pretty("12:00"), "12:00 pm");
  assert.equal(pretty("12:30"), "12:30 pm");
});

test("nextJamaah picks the next one still to come", () => {
  /* 11:00 on 5 Oct: Fajr (06:45) has gone, Zuhr (13:45) is next. */
  const n = nextJamaah(new Date(2026, 9, 5, 11, 0, 0));
  assert.equal(n.key, "zuhr");
  assert.equal(n.tomorrow, false);
});

test("after the last jamāʿah of the day it rolls to tomorrow's Fajr", () => {
  /* 23:30, after Isha. The next one is Fajr, and it must say so — getting
     this wrong shows "Fajr in -5h" or sends somebody to the masjid at
     midnight. */
  const n = nextJamaah(new Date(2026, 9, 5, 23, 30, 0));
  assert.equal(n.key, "fajr");
  assert.equal(n.tomorrow, true);
});

test("the minute a jamāʿah starts, it is no longer next", () => {
  const before = nextJamaah(new Date(2026, 9, 5, 13, 44, 0));
  const after  = nextJamaah(new Date(2026, 9, 5, 13, 46, 0));
  assert.equal(before.key, "zuhr");
  assert.notEqual(after.key, "zuhr");
});

test("londonInstant reads a timetable time as London's clock, not the phone's", () => {
  /* 5 October is inside British Summer Time, so 13:45 London is 12:45 UTC.
     This is the bug that showed a device in Dubai "Fajr in 15 min" when it
     was three hours away. */
  const d = new Date(2026, 9, 5, 12, 0, 0);
  const inst = londonInstant(d, "13:45");
  assert.equal(inst.toISOString(), "2026-10-05T12:45:00.000Z");
});

test("londonInstant handles winter, when London is UTC", () => {
  const d = new Date(2026, 0, 15, 12, 0, 0);
  const inst = londonInstant(d, "13:45");
  assert.equal(inst.toISOString(), "2026-01-15T13:45:00.000Z");
});

test("nowLondon returns London's wall clock", () => {
  const real = new Date("2026-07-01T10:00:00.000Z");   // BST: London is 11:00
  const l = nowLondon(real);
  assert.equal(l.getHours(), 11);
});
