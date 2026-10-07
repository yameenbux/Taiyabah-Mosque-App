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
import { noteReach, reach, offline, onReach, resetReach, setProbe, wokeUp } from "../../src/reach.js";

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


/* ---- getting back ------------------------------------------------------
   The reported bug, as a test. On a real phone on a desk on wifi the bar
   "sticks to the screen and cannot be removed", because nothing ever asked
   again: the only thing that could clear it was a request that happened to
   succeed, and a screen whose request already failed does not repeat it. */

test("while it cannot reach the masjid, it keeps asking", async t => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  resetReach();
  let asked = 0;
  setProbe(async () => { asked += 1; });

  noteReach(false); noteReach(false);
  assert.equal(offline(), true, "two failures should raise it");
  assert.equal(asked, 0, "but it should not ask instantly");

  t.mock.timers.tick(5000);
  await Promise.resolve(); await Promise.resolve();
  assert.equal(asked, 1, "first retry after five seconds");

  t.mock.timers.tick(10000);
  await Promise.resolve(); await Promise.resolve();
  assert.equal(asked, 2, "then backs off to ten");

  /* stop the loop while the mock clock is still installed: tearing the
     registry down first leaves this module holding a handle it thinks is live,
     and the next test's probe never gets scheduled. */
  resetReach();
  setProbe(null);
  t.mock.timers.reset();
});

test("the moment anything answers, it stops asking and the bar goes", async t => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  resetReach();
  let asked = 0;
  /* a probe that succeeds, the way go() reports any answer at all */
  setProbe(async () => { asked += 1; noteReach(true); });

  noteReach(false); noteReach(false);
  t.mock.timers.tick(5000);
  await Promise.resolve(); await Promise.resolve();

  assert.equal(offline(), false, "an answer clears it");
  const soFar = asked;
  t.mock.timers.tick(120000);
  await Promise.resolve(); await Promise.resolve();
  assert.equal(asked, soFar, "and it must not keep polling a working connection");

  /* stop the loop while the mock clock is still installed: tearing the
     registry down first leaves this module holding a handle it thinks is live,
     and the next test's probe never gets scheduled. */
  resetReach();
  setProbe(null);
  t.mock.timers.reset();
});

test("coming back to the app asks again at once rather than waiting out the backoff", async t => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  resetReach();
  let asked = 0;
  setProbe(async () => { asked += 1; });

  noteReach(false); noteReach(false);
  /* let it back off a long way */
  for (const ms of [5000, 10000, 20000, 40000]) {
    t.mock.timers.tick(ms);
    await Promise.resolve(); await Promise.resolve();
  }
  const beforeWake = asked;

  wokeUp();
  t.mock.timers.tick(5000);
  await Promise.resolve(); await Promise.resolve();
  assert.equal(asked, beforeWake + 1, "waking should reset the wait to five seconds");

  /* stop the loop while the mock clock is still installed: tearing the
     registry down first leaves this module holding a handle it thinks is live,
     and the next test's probe never gets scheduled. */
  resetReach();
  setProbe(null);
  t.mock.timers.reset();
});

test("with no probe registered it simply does not poll, and nothing throws", t => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  resetReach();
  setProbe(null);
  noteReach(false); noteReach(false);
  assert.equal(offline(), true);
  t.mock.timers.tick(600000);
  assert.equal(offline(), true, "still offline, still quiet");
  t.mock.timers.reset();
});
