/**
 * Taiyabah Masjid — the two text scales must never multiply.
 * Copyright (c) 2026 Yameen Bux. All rights reserved. See LICENSE.md.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { wantedScale, fontSize, SCALE_CEILING } from "../../src/scale.js";

/* What React Native will actually draw: it multiplies by the phone's scale
 * after we have handed it a size. */
const drawn = (n, chosen, os) => fontSize(n, chosen, os) * os;

test("neither setting touched is the designed size", () => {
  assert.equal(drawn(16, 1, 1), 16);
});

test("the app's own control still enlarges", () => {
  assert.ok(drawn(16, 1.42, 1) > 22, "Extra large should be noticeably bigger");
});

test("THE TWO DO NOT MULTIPLY — this is the bug", () => {
  /* Android at its largest (1.3) with "Extra large" (1.42) chosen in the app
     used to give 16 x 1.3 x 1.42 = 29.5px, and every layout broke. */
  const both = drawn(16, 1.42, 1.3);
  assert.ok(both < 25, `expected the bigger of the two, got ${both}px`);
  assert.ok(both < 16 * 1.3 * 1.42, "must be less than the product");
});

test("it never renders smaller than the phone asked for", () => {
  /* Somebody who set Android to large text has said something about their
     eyesight. Choosing "Small" in the app must not undo it. */
  for (const os of [1.15, 1.3, 1.5, 2]) {
    const small = drawn(16, 1.0, os);
    assert.ok(small >= Math.min(16 * os, 16 * SCALE_CEILING) - 0.5,
      `at phone scale ${os} the text shrank to ${small}px`);
  }
});

test("the ceiling holds however extreme the phone is set", () => {
  /* Within one rounded pixel, AMPLIFIED by the phone's scale — and that is
     the real contract, not a fudge. fontSize() hands React Native a whole
     number and React Native then multiplies it, so at a phone scale of 3.2 a
     single pixel of rounding becomes 3.2px on screen. 25.6px against a 24px
     ceiling is the worst it gets, and it is not worth making every font size
     in the app fractional to close. */
  for (const os of [1.5, 2, 3.2]) {
    assert.ok(drawn(16, 1.42, os) <= 16 * SCALE_CEILING + os,
      `phone at ${os} escaped the ceiling by more than rounding explains`);
    assert.equal(wantedScale(1.42, os), SCALE_CEILING,
      "the wanted scale itself must be exactly the ceiling");
  }
});

test("nonsense from the platform does not produce nonsense sizes", () => {
  for (const bad of [0, -1, NaN, undefined, null]) {
    assert.equal(fontSize(16, 1, bad), 16, `osScale ${String(bad)} broke it`);
    assert.ok(Number.isFinite(fontSize(16, bad, 1)), `chosen ${String(bad)} broke it`);
  }
});
