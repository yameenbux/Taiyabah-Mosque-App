/**
 * Taiyabah Masjid — the nikāḥ clicker's arithmetic.
 * Copyright (c) 2026 Yameen Bux. All rights reserved. See LICENSE.md.
 *
 * THE BUG THIS REPLACES was not arithmetic at all: the screen printed each
 * prayer's clock time taken from the FIRST of the two dates a family may
 * offer, so the times under "After Asr" were wrong whenever the office ended
 * up using the alternative date. There is no date in this module on purpose —
 * a wall-clock time means the same thing on both of them, which is the whole
 * reason the masjid moved to one.
 *
 * The window is asserted as literals rather than read from the module, so
 * widening it has to come past this file AND past db/161, which enforces the
 * same range in Postgres. A window the app and the database disagree about is
 * a form that passes validation and then throws on submit.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  MIN_MINUTES, MAX_MINUTES, STEP_MINUTES, DEFAULT_MINUTES,
  clamp, step, canStep, parseHM, formatHM, pretty, isAllowed,
} from "../../src/nikah-time.js";

test("the window is 08:00 to 22:00 in quarter hours", () => {
  assert.equal(MIN_MINUTES, 480);
  assert.equal(MAX_MINUTES, 1320);
  assert.equal(STEP_MINUTES, 15);
  assert.equal(formatHM(MIN_MINUTES), "08:00");
  assert.equal(formatHM(MAX_MINUTES), "22:00");
});

test("the default is 2pm and is inside the window", () => {
  assert.equal(DEFAULT_MINUTES, 840);
  assert.equal(pretty(DEFAULT_MINUTES), "2:00pm");
  assert.ok(isAllowed(formatHM(DEFAULT_MINUTES)));
});

test("clamp snaps to the step and holds the ends", () => {
  assert.equal(clamp(841), 840);          // 2:01pm snaps back to 2:00
  assert.equal(clamp(848), 855);          // 2:08pm snaps up to 2:15
  assert.equal(clamp(0), MIN_MINUTES);    // midnight is pulled to 8am
  assert.equal(clamp(23 * 60), MAX_MINUTES);
  assert.equal(clamp(undefined), DEFAULT_MINUTES);
  assert.equal(clamp(NaN), DEFAULT_MINUTES);
});

test("stepping stops at the ends rather than wrapping", () => {
  assert.equal(step(MIN_MINUTES, -15), MIN_MINUTES, "8am does not become 10pm");
  assert.equal(step(MAX_MINUTES, +15), MAX_MINUTES, "10pm does not become 8am");
  assert.equal(step(MIN_MINUTES, -60), MIN_MINUTES);
  assert.equal(step(840, +15), 855);
  assert.equal(step(840, -60), 780);
});

test("canStep tells the control when to grey out", () => {
  assert.equal(canStep(MIN_MINUTES, -15), false);
  assert.equal(canStep(MIN_MINUTES, +15), true);
  assert.equal(canStep(MAX_MINUTES, +15), false);
  assert.equal(canStep(MAX_MINUTES, -15), true);
});

test("an hour press crosses noon and midnight-side boundaries correctly", () => {
  assert.equal(pretty(step(parseHM("11:30"), +60)), "12:30pm", "11:30am + 1h is PM");
  assert.equal(pretty(step(parseHM("12:30"), -60)), "11:30am");
  assert.equal(pretty(parseHM("12:00")), "12:00pm", "noon is 12pm, not 0pm");
});

test("parseHM accepts only a real 24-hour clock", () => {
  assert.equal(parseHM("08:00"), 480);
  assert.equal(parseHM("22:00"), 1320);
  assert.equal(parseHM(" 14:30 "), 870);
  for (const bad of ["24:00", "8:00", "14:60", "2:30pm", "", null, undefined, "abc", "14:3"])
    assert.equal(parseHM(bad), null, `${JSON.stringify(bad)} should not parse`);
});

test("formatHM round-trips through parseHM", () => {
  for (let m = MIN_MINUTES; m <= MAX_MINUTES; m += STEP_MINUTES)
    assert.equal(parseHM(formatHM(m)), m);
});

test("pretty reads the way the prayer table does", () => {
  assert.equal(pretty(parseHM("08:00")), "8:00am");
  assert.equal(pretty(parseHM("09:15")), "9:15am");
  assert.equal(pretty(parseHM("12:00")), "12:00pm");
  assert.equal(pretty(parseHM("13:45")), "1:45pm");
  assert.equal(pretty(parseHM("22:00")), "10:00pm");
});

test("isAllowed is the same gate the database applies", () => {
  assert.ok(isAllowed("08:00"));
  assert.ok(isAllowed("14:30"));
  assert.ok(isAllowed("22:00"));
  assert.equal(isAllowed("07:45"), false, "before the window");
  assert.equal(isAllowed("22:15"), false, "after the window");
  assert.equal(isAllowed("14:20"), false, "off the quarter hour");
  assert.equal(isAllowed("2:30pm"), false, "display form is not wire form");
  assert.equal(isAllowed(null), false);
});
