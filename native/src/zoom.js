/**
 * Taiyabah Masjid — the arithmetic behind pinching a muṣḥaf page
 * Copyright (c) 2026 Yameen Bux. All rights reserved. See LICENSE.md.
 *
 * The gestures live in the screen, where they need React Native. The sums live
 * here, where they do not — so the part that can be wrong in a way nobody sees
 * (a page that pans off the edge and will not come back, a double tap that
 * lands somewhere other than the word you tapped) is covered by tests that run
 * in plain Node.
 *
 * EVERY FUNCTION HERE IS A WORKLET. Reanimated runs the gesture callbacks on
 * the UI thread, and a worklet that calls an ordinary imported function throws
 * there — "tried to synchronously call a non-worklet function". The directive
 * is what lets the Babel plugin copy these across. Node treats it as a plain
 * string statement and ignores it, so the tests are unaffected.
 *
 * Pure throughout: no imports, no state, no React Native.
 */

export const MIN = 1;      /* fitted to the screen; you cannot zoom out past it */
export const MAX = 4;      /* 13-line text at 4x is already larger than print  */
export const DOUBLE = 2.5; /* where a double tap lands                         */

export function clampScale(s, min, max) {
  "worklet";
  const lo = min === undefined ? 1 : min;
  const hi = max === undefined ? 4 : max;
  if (typeof s !== "number" || !isFinite(s)) return lo;
  return Math.min(hi, Math.max(lo, s));
}

/**
 * How far the page may be dragged at a given scale.
 *
 * At 1x there is nothing to pan: the page is fitted, so the limit is zero and
 * any drag belongs to the pager underneath. Above 1x the overhang is half the
 * extra size, because the image is centred.
 */
export function panLimit(viewport, scale) {
  "worklet";
  if (typeof viewport !== "number" || !(viewport > 0)) return 0;
  return Math.max(0, (viewport * clampScale(scale) - viewport) / 2);
}

/** Keep the page inside its own edges, so it can never be lost off-screen. */
export function clampOffset(offset, viewport, scale) {
  "worklet";
  const lim = panLimit(viewport, scale);
  if (typeof offset !== "number" || !isFinite(offset)) return 0;
  return Math.min(lim, Math.max(-lim, offset));
}

/**
 * Zoom about a point rather than about the middle.
 *
 * Pinching between two fingers, or double-tapping a word, should keep THAT
 * spot still — which is the difference between reading and chasing the page
 * around. `focal` is measured from the centre of the view.
 */
export function zoomAbout(focal, offset, from, to) {
  "worklet";
  const a = clampScale(from), b = clampScale(to);
  if (typeof focal !== "number" || !isFinite(focal)) return 0;
  if (typeof offset !== "number" || !isFinite(offset)) return 0;
  /* the point under the finger, in the page's own coordinates, held fixed */
  return focal - ((focal - offset) / a) * b;
}

/** A double tap zooms in; a second one puts the page back. */
export function nextDoubleTapScale(scale, to) {
  "worklet";
  const target = to === undefined ? 2.5 : to;
  return clampScale(scale) > 1.01 ? 1 : clampScale(target);
}

/**
 * Everything a double tap changes, in one answer.
 *
 * Returning to 1x must also recentre: leaving an offset behind at 1x is how a
 * page ends up permanently nudged to one side with no way to straighten it.
 */
export function doubleTap(o) {
  "worklet";
  const next = nextDoubleTapScale(o.scale, o.to);
  if (next === 1) return { scale: 1, x: 0, y: 0 };
  return {
    scale: next,
    x: clampOffset(zoomAbout(o.x, o.ox, o.scale, next), o.width, next),
    y: clampOffset(zoomAbout(o.y, o.oy, o.scale, next), o.height, next),
  };
}

/**
 * Whether the pager underneath should be allowed to turn the page.
 *
 * Zoomed in, a sideways drag means "look at the rest of this page", not "turn
 * it". Letting both happen at once is how you lose your place mid-āyah.
 */
export function pagerEnabled(scale) {
  "worklet";
  return clampScale(scale) <= 1.01;
}
