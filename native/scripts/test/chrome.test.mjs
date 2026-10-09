/**
 * Taiyabah Masjid — the tab bar and the system navigation bar
 * Copyright (c) 2026 Yameen Bux. All rights reserved. See LICENSE.md.
 *
 * The bug these cover shipped to Play and was found by a committee member on a
 * Samsung: icons showing, every label hidden behind Android's three-button
 * navigation. It is the kind that survives testing because the inset it
 * depends on is near zero on the emulator and on gesture-navigation phones —
 * so the numbers are pinned here, at the insets real phones actually report.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { barContent, tabBar, tabBarFor, aboveTabBar, LABEL, GAP } from "../../src/chrome.js";

/* What Android reports for the two navigation modes, and iOS for the home
   indicator. These are the sizes the bug lives and dies by. */
const GESTURE = 24, THREE_BUTTON = 48, IPHONE = 34, OLD_ANDROID = 0;

test("the bar is its design height when the system reserves nothing", () => {
  assert.equal(barContent({ line: 14 }), 64);
  assert.equal(tabBar({ line: 14, inset: OLD_ANDROID }).height, 64);
  assert.equal(tabBar({ line: 14, inset: OLD_ANDROID }).paddingBottom, 0);
});

test("whatever the system reserves is ADDED, never taken out of the labels", () => {
  for (const inset of [GESTURE, THREE_BUTTON, IPHONE]) {
    const bar = tabBar({ line: 14, inset });
    assert.equal(bar.content, 64, `content shrank at inset ${inset}`);
    assert.equal(bar.height, 64 + inset);
    assert.equal(bar.paddingBottom, inset);
  }
});

test("three-button navigation is the case that broke, and it is the tallest", () => {
  const three = tabBar({ line: 14, inset: THREE_BUTTON }).height;
  const gesture = tabBar({ line: 14, inset: GESTURE }).height;
  assert.ok(three > gesture,
    "if these ever match, the inset is being ignored again and the labels will go");
  assert.equal(three - gesture, THREE_BUTTON - GESTURE);
});

test("padding is there as well as height, or the content floats above the nav", () => {
  const bar = tabBar({ line: 14, inset: THREE_BUTTON });
  assert.equal(bar.height - bar.paddingBottom, bar.content,
    "the usable area must be exactly the content height");
});

test("the bar still grows with the text size", () => {
  assert.equal(barContent({ line: 14 }), 64);
  assert.equal(barContent({ line: 20 }), 70, "six points of line, six points of bar");
  assert.ok(barContent({ line: 26 }) > barContent({ line: 20 }));
});

test("a wrapped two-word label gets its second line", () => {
  assert.equal(barContent({ line: 14, wraps: true }), 64 + 14);
  assert.equal(barContent({ line: 20, wraps: true }), 70 + 20);
});

test("Urdu and Arabic get the taller bar their descenders need", () => {
  assert.equal(barContent({ rtl: true, line: 22 }), 74);
  assert.ok(barContent({ rtl: true, line: 22 }) > barContent({ rtl: false, line: 14 }));
});

test("the worst case — Arabic, largest text, wrapped, three buttons — still adds up", () => {
  const bar = tabBar({ rtl: true, line: 34, wraps: true, inset: THREE_BUTTON });
  assert.equal(bar.content, 74 + 12 + 34);
  assert.equal(bar.height, bar.content + THREE_BUTTON);
  assert.equal(bar.paddingBottom, THREE_BUTTON);
});

test("a nonsense inset is treated as none, never as a negative bar", () => {
  for (const bad of [NaN, -20, undefined, null, "48"]) {
    const bar = tabBar({ line: 14, inset: bad });
    assert.equal(bar.paddingBottom, 0, `${String(bad)} leaked through`);
    assert.ok(bar.height >= bar.content);
  }
});

test("a missing line height falls back to the design size rather than NaN", () => {
  for (const bad of [undefined, NaN, null]) {
    assert.equal(barContent({ line: bad }), 64);
    assert.equal(barContent({ rtl: true, line: bad }), 74);
  }
});

/* --- what has to clear the bar --------------------------------------------
 * The offline notice is positioned against the window, not laid out above the
 * tab bar, so it has to clear the bar's whole height. It was a constant 86 —
 * fine while the bar ignored the inset, behind the bar the moment it stopped. */

test("the bar and the notice are computed from one set of label metrics", () => {
  const fs = n => n;                       /* text size at default */
  for (const rtl of [false, true]) {
    const bar = tabBarFor({ rtl, fs, inset: THREE_BUTTON });
    assert.equal(bar.height, tabBar({ rtl, line: LABEL.line(rtl),
                                      wraps: fs(LABEL.size(rtl)) >= LABEL.wrapAt(rtl),
                                      inset: THREE_BUTTON }).height);
    assert.equal(aboveTabBar({ rtl, fs, inset: THREE_BUTTON }), bar.height + GAP);
  }
});

test("the notice clears the bar at every navigation mode — the 86 bug", () => {
  const fs = n => n;
  for (const inset of [OLD_ANDROID, GESTURE, THREE_BUTTON, IPHONE]) {
    const bar = tabBarFor({ fs, inset }).height;
    assert.ok(aboveTabBar({ fs, inset }) > bar,
      `notice at ${aboveTabBar({ fs, inset })} is behind a ${bar}-tall bar at inset ${inset}`);
  }
  /* the case that regressed: the old constant really was behind the bar */
  assert.ok(86 < tabBarFor({ fs: n => n, inset: THREE_BUTTON }).height,
    "if this ever passes, the bar stopped honouring the inset again");
});

test("the notice clears the bar at the largest text and in Arabic too", () => {
  const big = n => n * 1.8;
  for (const rtl of [false, true])
    for (const inset of [OLD_ANDROID, GESTURE, THREE_BUTTON, IPHONE])
      assert.ok(aboveTabBar({ rtl, fs: big, inset }) > tabBarFor({ rtl, fs: big, inset }).height,
        `behind the bar at rtl=${rtl} inset=${inset}`);
});

test("a missing text scaler is the identity, not NaN", () => {
  assert.equal(tabBarFor({ inset: 0 }).height, 64);
  assert.equal(aboveTabBar({ inset: 0 }), 64 + GAP);
  for (const bad of [undefined, null, 2, "fs"])
    assert.equal(tabBarFor({ fs: bad, inset: 0 }).height, 64, `${String(bad)} leaked through`);
});
