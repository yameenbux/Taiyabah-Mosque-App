/**
 * Taiyabah Masjid — the app does not re-download the year on every launch.
 * Copyright (c) 2026 Yameen Bux. All rights reserved. See LICENSE.md.
 *
 * syncTimetable() runs on every launch and asks for two years. One year is
 * 45KB. fetchYear() used to go to the database every single time, cache or no
 * cache — so a congregation of five thousand opening the app four times a day
 * is about 27GB a month, against a free allowance of five.
 *
 * Nothing about that fails loudly. It arrives as the database refusing to
 * answer partway through a month, and the app showing prayer times that have
 * quietly stopped being updated — in the first week after the app is
 * announced, which is exactly when five thousand people install it.
 *
 * So: a second launch must cost nothing, and an unpublished year must not be
 * asked for on a loop either.
 */
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { fetchYear, syncTimetable } from "../../src/timetable.js";
import { __reset } from "./stubs/async-storage.mjs";

/* One day of the published timetable, in the column order prayer_year() uses. */
const ROW = [1, 1, "1447 AH", "05:50", "06:20", "07:30", "12:10", "12:30",
             "14:30", "15:00", "16:20", "18:00", "18:30", ""];

let calls;
function serve(rowsFor) {
  calls = [];
  globalThis.fetch = async (url, opts) => {
    const body = JSON.parse(opts?.body || "{}");
    const year = body?.payload?.p_year ?? body?.p_year;
    calls.push(year);
    const rows = rowsFor(year);
    /* call() reads text() and parses it itself — see src/supabase.js. */
    return { ok: true, status: 200, text: async () => JSON.stringify(rows),
             json: async () => rows };
  };
}

beforeEach(() => __reset());

test("a year already held is not fetched again on the next launch", async () => {
  serve(y => (y === 2026 ? [ROW] : []));
  assert.equal(await fetchYear(2026), true, "the first fetch should have landed");
  const afterFirst = calls.length;

  assert.equal(await fetchYear(2026), false, "it went back to the database");
  assert.equal(calls.length, afterFirst,
    "a year the phone already holds was downloaded again — at 45KB a launch " +
    "across a congregation this is the whole free allowance in a week");
});

test("an unpublished year is not asked for on every launch", async () => {
  serve(() => []);                       // nothing published at all
  await fetchYear(2027);
  const afterFirst = calls.length;
  assert.ok(afterFirst > 0, "it should ask once");

  await fetchYear(2027);
  await fetchYear(2027);
  assert.equal(calls.length, afterFirst,
    "an unpublished year was re-asked immediately; next year is unpublished " +
    "for most of the year, so this is every launch of every phone");
});

test("a full launch asks for at most two years, and a second launch for none", async () => {
  serve(y => (y === 2026 ? [ROW] : []));
  await syncTimetable(new Date("2026-06-15T12:00:00Z"));
  assert.ok(calls.length <= 2, `a launch made ${calls.length} requests`);

  const afterFirst = calls.length;
  await syncTimetable(new Date("2026-06-15T12:05:00Z"));
  assert.equal(calls.length, afterFirst, "the second launch went back to the database");
});

test("pulling to refresh still overrides every interval", async () => {
  serve(y => (y === 2026 ? [ROW] : []));
  await fetchYear(2026);
  const afterFirst = calls.length;
  assert.equal(await fetchYear(2026, { force: true }), true,
    "an explicit refresh must not be throttled");
  assert.equal(calls.length, afterFirst + 1);
});

test("the committee publishing next year still reaches a phone", async () => {
  /* The interval must not become a reason somebody never gets 2027. */
  serve(() => []);
  await fetchYear(2027);
  serve(y => (y === 2027 ? [ROW] : []));   // now published
  assert.equal(await fetchYear(2027, { force: true }), true,
    "a published year did not land");
});
