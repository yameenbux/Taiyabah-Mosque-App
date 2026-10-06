/**
 * Taiyabah Masjid — the timetable the app reads from.
 * Copyright (c) 2026 Yameen Bux. All rights reserved. See LICENSE.md.
 *
 * The prayer times used to be a file inside the app. They come from the
 * committee's database now, laid over that file, which puts a conversion
 * between the database and every prayer time anybody reads.
 *
 * scripts/check-timetable.mjs compares a real downloaded year against the
 * bundled one, day for day — that is the stronger check and it needs figures
 * fetched by somebody who can reach Supabase. These cover what can be tested
 * without a network: that the floor is there, and that the label under the
 * month describes the year it is actually showing.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { dayRecord, yearsHeld, sourceFor, allDays } from "../../src/timetable.js";

test("the bundled year is the floor — a phone with no signal still works", () => {
  /* This is what makes reading from the database safe: it can only ever add
     to what already ships. */
  assert.deepEqual(yearsHeld(), [2026]);
  assert.equal(Object.keys(allDays()).length, 365);
});

test("a day comes back whole", () => {
  const d = dayRecord("2026-10-05");
  assert.ok(d);
  assert.equal(d.begins.fajr, "05:44");
  assert.equal(d.jamaat.zuhr, "13:45");
  assert.ok(d.hijri.endsWith("AH"), `hijri looked wrong: ${d.hijri}`);
});

test("a day it does not have is null, not an empty object", () => {
  assert.equal(dayRecord("2027-01-01"), null);
  assert.equal(dayRecord("nonsense"), null);
});

test("every Friday carries its Jumuʿah times and no other day does", () => {
  let fridays = 0, strays = 0;
  for (const [iso, d] of Object.entries(allDays())) {
    const dow = new Date(iso + "T12:00:00Z").getUTCDay();
    if (d.jummah) { dow === 5 ? fridays++ : strays++; }
  }
  assert.equal(strays, 0, "a non-Friday carried Jumuʿah times");
  assert.equal(fridays, 52, `expected 52 Fridays with Jumuʿah, got ${fridays}`);
});

test("Maghrib's jamāʿah is the minute it begins, every day of the year", () => {
  /* The masjid's practice, not a rounding error — and the thing somebody
     would "correct" without knowing. */
  for (const [iso, d] of Object.entries(allDays()))
    assert.equal(d.jamaat.maghrib, d.begins.maghrib, `${iso} disagreed`);
});

test("the source line names the year being shown, not the one that shipped", () => {
  /* It used to be the bundled file's string, which named 2026 and would have
     sat under every later year saying so. */
  const s = sourceFor(2026);
  assert.ok(s.includes("2026"), s);
  assert.ok(/\d{4}.*AH/.test(s), `the hijri span is missing: ${s}`);
  assert.equal(sourceFor(2027), null, "a year it does not hold has no source");
});
