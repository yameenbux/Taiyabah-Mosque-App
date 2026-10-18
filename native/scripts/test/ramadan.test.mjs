/**
 * Taiyabah Masjid — which night of Ramadan the screen is on.
 * Copyright (c) 2026 Yameen Bux. All rights reserved. See LICENSE.md.
 *
 * The one that matters is the rollover. Taraweeh for the twenty-fourth night
 * is prayed on the evening of 24 Ramadan and runs past midnight; a screen that
 * turns over at midnight folds the night away while people are still praying
 * it. So "one minute before Fajr" and "one minute after" are asserted on both
 * sides, against the masjid's own Fajr time for that day.
 *
 * THE REAL TIMETABLE IS USED WHEREVER IT CAN BE. Ramadan 1447 is in the
 * bundled file, so the dates, the Fajr times and the length of the month are
 * the committee's own rather than numbers invented here. Only the cases the
 * bundled year cannot show — a twenty-nine-day month, two Ramadans in one
 * file — are built as fixtures, and those are marked as such.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { ramadanState, activeDate, hijriOf, isRamadanMonth } from "../../src/ramadan.js";

const DAYS = JSON.parse(
  fs.readFileSync(path.join(import.meta.dirname, "../../src/data/timetable-2026.json"), "utf8")
).days;

/* 1 Ramadan 1447 is 18 February 2026 in the masjid's own timetable. */
const FIRST = "2026-02-18";
const at = (iso, h, mi) => {
  const [Y, M, D] = iso.split("-").map(Number);
  return new Date(Y, M - 1, D, h, mi, 0, 0);
};

test("the bundled timetable really does carry Ramadan 1447", () => {
  assert.equal(hijriOf(DAYS[FIRST]).day, 1);
  assert.ok(isRamadanMonth(hijriOf(DAYS[FIRST]).month));
});

test("outside Ramadan there is no state at all", () => {
  assert.equal(ramadanState(at("2026-06-01", 12, 0), DAYS), null);
  assert.equal(ramadanState(at("2026-01-05", 12, 0), DAYS), null);
});

test("the month is counted out of the timetable, not assumed to be 30", () => {
  const s = ramadanState(at(FIRST, 12, 0), DAYS);
  const last = ramadanState(at("2026-03-19", 12, 0), DAYS);
  assert.equal(s.total, 30);              /* the committee's 1447 is 30 days */
  assert.equal(last.night, 30);
  assert.equal(last.nightsToEid, 0);
});

/* ---- the rollover, which is the reason the module exists ---------------- */

test("a moment before Fajr still belongs to the night before", () => {
  /* 8 Ramadan is 25 Feb 2026; its Fajr is the masjid's own figure. */
  const iso = "2026-02-25";
  assert.equal(hijriOf(DAYS[iso]).day, 8);
  const [h, mi] = DAYS[iso].begins.fajr.split(":").map(Number);

  const justBefore = at(iso, h, mi - 1);
  const justAfter = at(iso, h, mi);

  assert.equal(activeDate(justBefore, DAYS), "2026-02-24");
  assert.equal(ramadanState(justBefore, DAYS).night, 7);

  assert.equal(activeDate(justAfter, DAYS), iso);
  assert.equal(ramadanState(justAfter, DAYS).night, 8);
});

test("midnight is NOT the boundary — half past twelve is still last night", () => {
  const s = ramadanState(at("2026-02-25", 0, 30), DAYS);
  assert.equal(s.night, 7, "00:30 on the 25th is still the night of the 24th");
});

test("late evening is already tonight", () => {
  assert.equal(ramadanState(at("2026-02-24", 22, 0), DAYS).night, 7);
});

/* ---- the shape the screen folds --------------------------------------- */

test("past, tonight and ahead account for every night exactly once", () => {
  for (const night of [1, 2, 15, 29, 30]) {
    const iso = Object.keys(DAYS).sort().find(k => {
      const h = hijriOf(DAYS[k]);
      return h && h.year === 1447 && isRamadanMonth(h.month) && h.day === night;
    });
    const s = ramadanState(at(iso, 12, 0), DAYS);
    assert.equal(s.night, night);
    assert.equal(s.past.length + 1 + s.ahead.length, s.total);
    assert.equal(s.past.length, night - 1);
    assert.equal(s.ahead.length, s.total - night);
    if (s.past.length) assert.equal(s.past[0].night, 1);
    if (s.ahead.length) assert.equal(s.ahead[s.ahead.length - 1].night, s.total);
  }
});

test("every night carries the date the timetable gives it", () => {
  const s = ramadanState(at("2026-03-13", 12, 0), DAYS);
  assert.equal(s.night, 24);
  assert.equal(s.tonight.iso, "2026-03-13");
  assert.equal(s.past[0].iso, FIRST);
  assert.equal(s.ahead[0].iso, "2026-03-14");
});

/* ---- the last ten, and the juz ---------------------------------------- */

test("the last ten begins at 21 in a thirty-day month", () => {
  assert.equal(ramadanState(at("2026-03-09", 12, 0), DAYS).night, 20);
  assert.equal(ramadanState(at("2026-03-09", 12, 0), DAYS).lastTen, false);
  assert.equal(ramadanState(at("2026-03-10", 12, 0), DAYS).night, 21);
  assert.equal(ramadanState(at("2026-03-10", 12, 0), DAYS).lastTen, true);
});

test("the odd nights of the last ten are 21, 23, 25, 27 and 29", () => {
  const odd = [];
  for (let d = 10; d <= 19; d++) {
    const s = ramadanState(at(`2026-03-${String(d).padStart(2, "0")}`, 12, 0), DAYS);
    if (s.lastTen && s.odd) odd.push(s.night);
  }
  assert.deepEqual(odd, [21, 23, 25, 27, 29]);
});

test("the juz follows the night and never goes past 30", () => {
  assert.equal(ramadanState(at(FIRST, 12, 0), DAYS).juz, 1);
  assert.equal(ramadanState(at("2026-03-13", 12, 0), DAYS).juz, 24);
  assert.equal(ramadanState(at("2026-03-19", 12, 0), DAYS).juz, 30);
});

/* ---- what the bundled year cannot show: FIXTURES, built here ----------- */

const fixture = (startIso, length, year) => {
  const out = {};
  const [Y, M, D] = startIso.split("-").map(Number);
  for (let i = 0; i < length; i++) {
    const d = new Date(Y, M - 1, D + i);
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    out[iso] = { hijri: `${i + 1} Ramadan ${year} AH`, begins: { fajr: "05:00" }, jamaat: {} };
  }
  return out;
};

test("a twenty-nine-day Ramadan ends on night 29, and the last ten starts at 20", () => {
  const days = fixture("2027-02-08", 29, 1448);
  const last = ramadanState(at("2027-03-08", 12, 0), days);
  assert.equal(last.night, 29);
  assert.equal(last.total, 29);
  assert.equal(last.nightsToEid, 0);
  assert.equal(last.ahead.length, 0);

  const twenty = ramadanState(at("2027-02-27", 12, 0), days);
  assert.equal(twenty.night, 20);
  assert.equal(twenty.lastTen, true, "in a 29-day month the last ten begins at 20");
});

test("two Ramadans in one file do not bleed into each other", () => {
  /* A real possibility: the Islamic year is 11 days shorter, so a Gregorian
     year occasionally carries Ramadan twice. Each must count its own length. */
  const days = { ...fixture("2030-01-05", 30, 1451), ...fixture("2030-12-26", 29, 1452) };
  const first = ramadanState(at("2030-01-10", 12, 0), days);
  const second = ramadanState(at("2030-12-30", 12, 0), days);
  assert.equal(first.total, 30);
  assert.equal(second.total, 29);
  assert.equal(second.night, 5);
  assert.equal(second.past.length, 4);
});

test("the month is recognised however the calendar spells it", () => {
  for (const spelling of ["Ramadan", "Ramadhan", "Ramaḍān", "ramadan"]) {
    assert.ok(isRamadanMonth(spelling), `${spelling} should be Ramadan`);
  }
  for (const other of ["Shaban", "Shawwal", "Rajab", ""]) {
    assert.equal(isRamadanMonth(other), false, `${other} is not Ramadan`);
  }
});

test("a day the timetable does not carry is left alone rather than guessed", () => {
  assert.equal(ramadanState(at("2099-03-01", 12, 0), DAYS), null);
  assert.equal(activeDate(at("2099-03-01", 2, 0), DAYS), "2099-03-01");
});
