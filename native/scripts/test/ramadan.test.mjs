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

/* ---- when the section opens ------------------------------------------- */

import { ramadanAccess, nextFirstNight, ESTIMATE,
         OPEN_DAYS_BEFORE, NEAR_DAYS } from "../../src/ramadan.js";

test("with no Ramadan published it counts to the estimate instead", () => {
  /* The state the app is really in today: its calendar stops in Rajab 1448
     and Ramadan 1448 falls in a year the committee has not published. The
     screen's whole job is to count, so it counts — to ESTIMATE, flagged. */
  const now = at("2026-10-18", 12, 0);
  assert.equal(nextFirstNight(now, DAYS), null, "nothing published to find");
  const a = ramadanAccess(now, DAYS);
  assert.equal(a.open, false);
  assert.equal(a.estimated, true);
  assert.equal(a.iso, ESTIMATE);
  assert.ok(a.daysUntil > 0, "there is a real number to put on the screen");
});

test("THE ESTIMATE MAY COUNT AND MAY NEVER OPEN", () => {
  /* The property the whole arrangement rests on. A guessed date that is a day
     out would put i'tikaf booking and the taraweeh rota live on the wrong
     night, so no distance from the estimate — not ten days, not one, not the
     morning of — is allowed to unlock the section. Only a date out of the
     committee's own timetable can do that. */
  const [Y, M, D] = ESTIMATE.split("-").map(Number);
  for (const back of [40, 30, OPEN_DAYS_BEFORE + 1, OPEN_DAYS_BEFORE, 3, 1, 0]) {
    const a = ramadanAccess(new Date(Y, M - 1, D - back, 12, 0), DAYS);
    assert.equal(a.open, false, `${back} days before the estimate must stay shut`);
    assert.equal(a.estimated, true);
  }
});

test("a date the committee published always beats the estimate", () => {
  /* Published 20 January, a fortnight before the estimate. The screen counts
     to theirs, drops the flag, and the ten-day door works again. */
  const days = { ...DAYS, ...fixture("2027-01-20", 30, 1448) };
  const a = ramadanAccess(at("2026-12-01", 12, 0), days);
  assert.equal(a.iso, "2027-01-20");
  assert.ok(!a.estimated, "a real date is not flagged as a guess");
  assert.equal(ramadanAccess(at("2027-01-10", 12, 0), days).open, true, "ten days out it opens");
});

test("once the estimate is behind us too, there is nothing honest left", () => {
  /* The estimate passed and still no timetable arrived. Counting to a date in
     the past would run backwards or sit at zero, so the screen says so. */
  const [Y, M, D] = ESTIMATE.split("-").map(Number);
  const a = ramadanAccess(new Date(Y, M - 1, D + 1, 12, 0), DAYS);
  assert.equal(a.open, false);
  assert.equal(a.phase, "awaiting");
  assert.equal(a.daysUntil, null);
  assert.equal(a.iso, null);
});

test("far out it counts, and says so, without opening", () => {
  const a = ramadanAccess(at("2025-11-01", 12, 0), { ...DAYS, ...fixture("2026-02-18", 30, 1447) });
  assert.equal(a.open, false);
  assert.equal(a.phase, "far");
  assert.ok(a.daysUntil > NEAR_DAYS);
});

test("inside thirty days the guard changes its tune but still guards", () => {
  const days = fixture("2027-02-08", 29, 1448);
  const a = ramadanAccess(at("2027-01-20", 12, 0), days);
  assert.equal(a.open, false);
  assert.equal(a.phase, "close");
  assert.equal(a.daysUntil, 19);
});

test("it opens ten days early, so i'tikaf can be booked before anybody fasts", () => {
  const days = fixture("2027-02-08", 29, 1448);
  const shut = ramadanAccess(at("2027-01-28", 12, 0), days);   /* 11 days out */
  const open = ramadanAccess(at("2027-01-29", 12, 0), days);   /* 10 days out */
  assert.equal(shut.open, false, "eleven days out is still the poster");
  assert.equal(open.open, true, "ten days out the section opens");
  assert.equal(open.early, true);
  assert.equal(open.daysUntil, OPEN_DAYS_BEFORE);
  assert.equal(open.state, null, "open early, but no night is being prayed yet");
});

test("during the month it is open and carries the night", () => {
  const a = ramadanAccess(at("2026-03-13", 12, 0), DAYS);
  assert.equal(a.open, true);
  assert.equal(a.state.night, 24);
});

test("it stays open the day after the last night, for Eid and fitrana", () => {
  const eid = ramadanAccess(at("2026-03-20", 12, 0), DAYS);   /* 1 Shawwal */
  assert.equal(eid.open, true);
  assert.equal(eid.trailing, true);
  assert.equal(eid.state.night, 30);

  const after = ramadanAccess(at("2026-03-21", 12, 0), DAYS);
  assert.equal(after.open, false, "two days past the end it is shut again");
});

test("once shut it counts to the NEXT Ramadan, not the one just gone", () => {
  const days = { ...fixture("2026-02-18", 30, 1447), ...fixture("2027-02-08", 29, 1448) };
  const a = ramadanAccess(at("2026-06-01", 12, 0), days);
  assert.equal(a.open, false);
  assert.equal(a.iso, "2027-02-08");
  assert.equal(a.phase, "far");
});

/* ---- the countdown itself --------------------------------------------- */

import { firstNightBegins, countdown } from "../../src/ramadan.js";

test("the month begins at Maghrib on the eve, not at midnight", () => {
  /* 1 Ramadan 1447 is 18 Feb 2026; the eve is the 17th, and the masjid's own
     Maghrib for that day is what the countdown has to run to. */
  const eve = DAYS["2026-02-17"];
  assert.ok(eve, "the eve is in the timetable");
  const [h, mi] = eve.begins.maghrib.split(":").map(Number);

  const t = firstNightBegins(FIRST, DAYS);
  assert.equal(t.getFullYear(), 2026);
  assert.equal(t.getMonth(), 1);
  assert.equal(t.getDate(), 17, "the eve, not the first of the month");
  assert.equal(t.getHours(), h);
  assert.equal(t.getMinutes(), mi);
});

test("with no eve in the timetable it falls back to the day itself", () => {
  const days = fixture("2027-02-08", 29, 1448);   /* nothing before the 8th */
  const t = firstNightBegins("2027-02-08", days);
  assert.equal(t.getDate(), 8);
  assert.equal(t.getHours(), 0);
});

test("the countdown floors, and stops at zero rather than going negative", () => {
  const then = new Date(2027, 1, 7, 18, 0, 0);

  const a = countdown(new Date(2027, 1, 4, 11, 30, 0), then);
  assert.deepEqual([a.days, a.hours, a.minutes], [3, 6, 30]);
  assert.equal(a.done, false);

  const b = countdown(new Date(2027, 1, 7, 17, 59, 30), then);
  assert.deepEqual([b.days, b.hours, b.minutes], [0, 0, 0]);
  assert.equal(b.done, false, "thirty seconds left is not done");

  const past = countdown(new Date(2027, 1, 9, 12, 0, 0), then);
  assert.deepEqual([past.days, past.hours, past.minutes], [0, 0, 0]);
  assert.equal(past.done, true);
});
