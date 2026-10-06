/**
 * Taiyabah Masjid — "offline" has to mean something precise.
 * Copyright (c) 2026 Yameen Bux. All rights reserved. See LICENSE.md.
 *
 * A bar that says "can't reach the masjid" when the masjid is fine is worse
 * than no bar: it teaches people to ignore it, and then it is ignored on the
 * day it is right.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { noteReach, reach, offline, onReach, resetReach } from "../../src/reach.js";

test("a fresh app is not offline — it is simply unasked", () => {
  resetReach();
  assert.equal(reach(), "unknown");
  assert.equal(offline(), false);
});

test("one failure is a blip and says nothing", () => {
  /* A request cancelled because a screen unmounted must not put a red bar on
     the screen that replaced it. */
  resetReach();
  noteReach(false);
  assert.equal(offline(), false);
});

test("two failures in a row is a condition", () => {
  resetReach();
  noteReach(false); noteReach(false);
  assert.equal(offline(), true);
});

test("one success clears it immediately", () => {
  resetReach();
  noteReach(false); noteReach(false);
  assert.equal(offline(), true);
  noteReach(true);
  assert.equal(offline(), false);
  assert.equal(reach(), "reachable");
});

test("a success resets the patience, so blips never accumulate into a lie", () => {
  /* One failure an hour, each followed by a success, is a working app. */
  resetReach();
  for (let i = 0; i < 20; i++) { noteReach(false); noteReach(true); }
  assert.equal(offline(), false);
});

test("listeners hear every change and no repeats", () => {
  resetReach();
  const seen = [];
  const off = onReach(s => seen.push(s));
  noteReach(false);            // still unknown — below patience
  noteReach(false);            // -> unreachable
  noteReach(false);            // already unreachable, no repeat
  noteReach(true);             // -> reachable
  noteReach(true);             // already reachable, no repeat
  off();
  noteReach(false); noteReach(false);   // unsubscribed: nothing more
  assert.deepEqual(seen, ["unreachable", "reachable"]);
});

test("a thrown listener cannot stop the others being told", () => {
  resetReach();
  const seen = [];
  const a = onReach(() => { throw new Error("a screen unmounted mid-notify"); });
  const b = onReach(s => seen.push(s));
  noteReach(false); noteReach(false);
  a(); b();
  assert.deepEqual(seen, ["unreachable"]);
});
