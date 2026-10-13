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
import { wants, verdict, nativeSdkOk } from "../check-arch.mjs";

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

/* --- the Kotlin window ----------------------------------------------------
 * Found by compiling: 5.3.6 pins native SDK 5.7.3, built with Kotlin 2.2,
 * against this project's kotlinVersion 1.9.25. 5.4.3 pins 5.7.7, which went
 * back to 1.9.25. Nothing in the version numbers says so. */

test("the three SDKs OneSignal built with Kotlin 2.2 are rejected at 1.9", () => {
  for (const sdk of ["5.7.1", "5.7.2", "5.7.3"])
    assert.equal(nativeSdkOk(sdk, "1.9.25").ok, false, sdk);
});

test("the ones either side of that window are fine", () => {
  for (const sdk of ["5.6.1", "5.6.2", "5.7.7", "5.9.3"])
    assert.equal(nativeSdkOk(sdk, "1.9.25").ok, true, sdk);
});

test("and they would be fine if we ever compile with Kotlin 2", () => {
  assert.equal(nativeSdkOk("5.7.3", "2.0.21").ok, true);
});

test("the message says which way out", () => {
  assert.match(nativeSdkOk("5.7.3", "1.9.25").message, /5\.7\.7 and later/);
});
