/**
 * Taiyabah Masjid — the Text-size control is authoritative, and the two scales
 * must never multiply.
 * Copyright (c) 2026 Yameen Bux. All rights reserved. See LICENSE.md.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { wantedScale, fontSize, SCALE_CEILING } from "../../src/scale.js";

/* What the screen actually draws: React Native multiplies the size it is
 * handed by the phone's own font scale, and fontSize() has divided that scale
 * out, so the rendered size is the reader's chosen size whatever the phone is
 * set to. */
const drawn = (n, chosen, os) => fontSize(n, chosen, os) * os;

test("neither setting touched is the designed size", () => {
  assert.equal(Math.round(drawn(16, 1, 1)), 16);
});

test("the app's own control enlarges", () => {
  assert.ok(drawn(16, 1.42, 1) > 22, "Extra large should be noticeably bigger");
});

test("the reader's choice wins whatever the phone is set to", () => {
  /* The whole bug: on a phone set to large text the control used to do nothing,
     because the OS scale overrode every choice at or below it. Now each choice
     renders at its own size, within a pixel of rounding, at any phone scale. */
  for (const os of [1, 1.3, 1.5, 2, 3.2]) {
    for (const chosen of [1.0, 1.12, 1.26, 1.42]) {
      assert.ok(Math.abs(drawn(16, chosen, os) - 16 * chosen) <= os,
        `at phone scale ${os}, "${chosen}" drew ${drawn(16, chosen, os)} not ~${16 * chosen}`);
    }
  }
});

test("Extra large is really bigger than Small, on every phone", () => {
  for (const os of [1, 1.3, 1.5, 2, 3.2]) {
    assert.ok(drawn(16, 1.42, os) > drawn(16, 1.0, os) + 3,
      `at phone scale ${os} the control barely moved`);
  }
});

test("THE TWO DO NOT MULTIPLY — this is the original bug", () => {
  /* The phone at 1.3 with "Extra large" (1.42) chosen must give 1.42, never the
     product 16 x 1.3 x 1.42 = 29.5px that broke every layout. */
  const both = drawn(16, 1.42, 1.3);
  assert.ok(both <= Math.round(16 * 1.42) + 1, `expected the chosen size, got ${both}px`);
  assert.ok(both < 16 * 1.3 * 1.42, "must be less than the product");
});

test("the ceiling caps a choice that would break the layout", () => {
  assert.equal(wantedScale(1.42), 1.42, "an in-range choice is left alone");
  for (const over of [1.5, 2, 3.2]) {
    assert.equal(wantedScale(over), SCALE_CEILING, "a choice above the ceiling is capped");
  }
});

test("nonsense from the platform does not produce nonsense sizes", () => {
  for (const bad of [0, -1, NaN, undefined, null]) {
    assert.equal(fontSize(16, 1, bad), 16, `osScale ${String(bad)} broke it`);
    assert.ok(Number.isFinite(fontSize(16, bad, 1)), `chosen ${String(bad)} broke it`);
  }
});
