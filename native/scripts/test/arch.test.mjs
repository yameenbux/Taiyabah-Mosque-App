/**
 * Taiyabah Masjid — the OneSignal version and the New Architecture flag
 * Copyright (c) 2026 Yameen Bux. All rights reserved. See LICENSE.md.
 *
 * Both halves of this pair have now broken the app once each: 5.4 without the
 * flag killed Android on launch, and moving to 5.3 while leaving the flag on
 * killed the Android build. So the rule is pinned here rather than grepped for
 * inline in three workflows.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { wants, verdict } from "../check-arch.mjs";

test("5.4 and above needs the New Architecture", () => {
  for (const v of ["5.4.0", "5.4.3", "^5.4.3", "5.5.1", "5.4.7"])
    assert.equal(wants(v).newArch, true, v);
});

test("5.3 and below wants it off", () => {
  for (const v of ["5.3.6", "5.3.0", "~5.3.6", "5.2.9", "5.0.0"])
    assert.equal(wants(v).newArch, false, v);
});

test("the pairing that was shipped and worked", () => {
  assert.equal(verdict("^5.4.3", true).ok, true);
});

test("the two pairings that each broke the app", () => {
  /* abaf811: 5.4.3 on the old architecture — crashed on launch, blank screen */
  assert.equal(verdict("^5.4.3", false).ok, false);
  /* ffea1e4: 5.3.6 with the flag left on — Android would not compile */
  assert.equal(verdict("5.3.6", true).ok, false);
});

test("the pairing being tried now", () => {
  assert.equal(verdict("5.3.6", false).ok, true);
});

test("a mismatch says which way to move, and that it is both or neither", () => {
  const m = verdict("5.3.6", true).message;
  assert.match(m, /newArchEnabled=false/);
  assert.match(m, /Change both or neither/);
});

test("a version it cannot read fails rather than guessing", () => {
  for (const bad of ["", null, undefined, "latest", "6.0.0", "file:../x"])
    assert.equal(verdict(bad, true).ok, false, String(bad));
});
