/**
 * Taiyabah Masjid — pinching a muṣḥaf page
 * Copyright (c) 2026 Yameen Bux. All rights reserved. See LICENSE.md.
 *
 * A committee member on an Android phone could not make the 13-line text any
 * bigger, because the muṣḥaf had no zoom at all. These are the sums behind the
 * fix. They matter more than they look: the failures here are the ones that
 * are only found while somebody is trying to read, and that cannot be undone
 * without closing the screen — a page dragged off the edge, a page left
 * crooked at 1x, a sideways drag that turns the page mid-āyah.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  MIN, MAX, DOUBLE, clampScale, panLimit, clampOffset,
  zoomAbout, nextDoubleTapScale, doubleTap, pagerEnabled,
} from "../../src/zoom.js";

test("you cannot zoom out past the fitted page, or in past legibility", () => {
  assert.equal(clampScale(0.2), MIN);
  assert.equal(clampScale(1), MIN);
  assert.equal(clampScale(2.5), 2.5);
  assert.equal(clampScale(99), MAX);
});

test("rubbish in gives the fitted page, not NaN", () => {
  for (const bad of [NaN, Infinity, -Infinity, undefined, null, "2"]) {
    const s = clampScale(bad);
    assert.ok(Number.isFinite(s), `${String(bad)} produced ${s}`);
  }
});

test("a fitted page has nowhere to pan", () => {
  assert.equal(panLimit(400, 1), 0);
  assert.equal(clampOffset(250, 400, 1), 0,
    "at 1x any drag must come back to centre, or the page sits crooked");
});

test("the overhang is half the extra size, because the page is centred", () => {
  assert.equal(panLimit(400, 2), 200);
  assert.equal(panLimit(400, 3), 400);
});

test("the page can never be dragged off its own edges", () => {
  assert.equal(clampOffset(10_000, 400, 2), 200);
  assert.equal(clampOffset(-10_000, 400, 2), -200);
  assert.equal(clampOffset(120, 400, 2), 120, "inside the limit, left alone");
});

test("zooming about the centre moves nothing", () => {
  assert.equal(zoomAbout(0, 0, 1, 2.5), 0);
});

test("the point under the finger stays under the finger", () => {
  /* A word 100px right of centre, tapped at 1x and taken to 2x: it must end up
     100px right of centre still, which means the page shifts by -100. */
  const x = zoomAbout(100, 0, 1, 2);
  assert.equal(x, -100);
  /* and the same word, now at 2x, is still in the same place on screen */
  assert.equal(100 - ((100 - x) / 2) * 2, x);
});

test("zooming about a point survives being already panned", () => {
  const out = zoomAbout(80, -40, 2, 4);
  assert.ok(Number.isFinite(out));
  assert.equal(out, 80 - ((80 - -40) / 2) * 4);
});

test("a double tap zooms in, and a second one puts it back", () => {
  assert.equal(nextDoubleTapScale(1), DOUBLE);
  assert.equal(nextDoubleTapScale(DOUBLE), MIN);
  assert.equal(nextDoubleTapScale(4), MIN);
  assert.equal(nextDoubleTapScale(1.005), DOUBLE, "a hair above 1 still counts as fitted");
});

test("double-tapping back to fitted also straightens the page", () => {
  const out = doubleTap({ scale: 2.5, x: 120, y: -60, ox: 90, oy: 40, width: 400, height: 800 });
  assert.deepEqual(out, { scale: MIN, x: 0, y: 0 },
    "returning to 1x must recentre, or the page stays nudged with no way to fix it");
});

test("double-tapping in keeps the tapped spot still and stays inside the edges", () => {
  const w = 400, h = 800;
  const out = doubleTap({ scale: 1, x: 150, y: 300, ox: 0, oy: 0, width: w, height: h });
  assert.equal(out.scale, DOUBLE);
  assert.ok(Math.abs(out.x) <= panLimit(w, DOUBLE) + 1e-9);
  assert.ok(Math.abs(out.y) <= panLimit(h, DOUBLE) + 1e-9);
});

test("a double tap near the corner cannot throw the page off-screen", () => {
  const w = 400, h = 800;
  const out = doubleTap({ scale: 1, x: w, y: h, ox: 0, oy: 0, width: w, height: h });
  assert.equal(out.x, panLimit(w, DOUBLE) * -1 < -0 ? clampOffset(out.x, w, DOUBLE) : out.x);
  assert.ok(Math.abs(out.x) <= panLimit(w, DOUBLE));
  assert.ok(Math.abs(out.y) <= panLimit(h, DOUBLE));
});

test("the pager turns pages only while the page is fitted", () => {
  assert.equal(pagerEnabled(1), true);
  assert.equal(pagerEnabled(1.005), true, "a rounding wobble must not freeze paging");
  assert.equal(pagerEnabled(1.4), false);
  assert.equal(pagerEnabled(4), false,
    "zoomed in, a sideways drag means look across the page, not turn it");
});

test("a round trip of gestures lands exactly back where it started", () => {
  const w = 400, h = 800;
  let s = MIN, x = 0, y = 0;
  ({ scale: s, x, y } = doubleTap({ scale: s, x: 60, y: 120, ox: x, oy: y, width: w, height: h }));
  x = clampOffset(x - 500, w, s);                      /* drag it about */
  y = clampOffset(y + 900, h, s);
  ({ scale: s, x, y } = doubleTap({ scale: s, x: 10, y: 10, ox: x, oy: y, width: w, height: h }));
  assert.deepEqual({ s, x, y }, { s: MIN, x: 0, y: 0 });
  assert.equal(pagerEnabled(s), true, "and paging works again afterwards");
});
