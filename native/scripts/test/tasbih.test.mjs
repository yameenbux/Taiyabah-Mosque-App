/**
 * Taiyabah Masjid — the tasbīḥ counter walks the dhikr that is actually there.
 * Copyright (c) 2026 Yameen Bux. All rights reserved. See LICENSE.md.
 *
 * src/tasbih.js writes none of its own Arabic: it slices the four phrases out
 * of athkar.json's "After Every Ṣalāh" entry, which carries its counts inline
 * as ﴿٣٣﴾. That is the whole point — all 142 supplications are published
 * awaiting two ʿulamā signatures and are fingerprinted so an approved wording
 * cannot change unnoticed, and a counter holding a second copy of four of them
 * would sit outside that entirely, free to drift.
 *
 * So these tests assert the derivation, not a hard-coded list. If somebody
 * edits that dhikr, the counter follows it or this fails — which is the only
 * two outcomes worth having.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import ATHKAR from "../../src/data/athkar.json" with { type: "json" };
import { sequence, total, at } from "../../src/tasbih.js";

test("the four phrases come out of the dhikr, in order, with its own counts", () => {
  const steps = sequence();
  assert.equal(steps.length, 4);
  assert.deepEqual(steps.map(s => s.count), [33, 33, 33, 1]);
  assert.equal(total(), 100, "the tasbīḥ comes to a hundred");
  for (const s of steps) {
    assert.ok(s.ar && s.ar.length > 2, `a phrase came out empty: ${JSON.stringify(s)}`);
    assert.ok(s.en && s.en.length > 2, `a meaning came out empty: ${JSON.stringify(s)}`);
  }
});

/* THE PHRASES MUST BE THE DHIKR'S OWN WORDS, not a paraphrase of them. This
   is the assertion that makes the derivation worth anything: every phrase the
   counter shows appears verbatim inside the entry the ʿulamā are being asked
   to sign. A retyped copy with one letter different would pass every other
   test here and fail this one. */
test("every phrase appears verbatim in the reviewed dhikr", () => {
  const item = ATHKAR.sections.find(s => s.id === "after-salah")
                      .items.find(it => /﴿[٠-٩]+﴾/.test(it.ar || ""));
  assert.ok(item, "the dhikr with inline counts is no longer in After Every Ṣalāh");
  for (const s of sequence())
    assert.ok(item.ar.includes(s.ar),
      `the counter would show words the dhikr does not contain: ${s.ar}`);
});

test("at() walks 0 → 100 without losing or repeating a tap", () => {
  const steps = sequence();
  assert.equal(at(0, steps).i, 0);
  assert.equal(at(0, steps).into, 0);

  //  mid-first-step
  assert.equal(at(17, steps).i, 0);
  assert.equal(at(17, steps).into, 17);

  //  ON a boundary the finished step is reported, not the next one — somebody
  //  who has just said the thirty-third is looking at a completed step.
  const b = at(33, steps);
  assert.equal(b.i, 0, "tap 33 moved the label on before the step was acknowledged");
  assert.equal(b.stepComplete, true);
  assert.equal(b.complete, false);

  assert.equal(at(34, steps).i, 1, "tap 34 should be the first of the second phrase");
  assert.equal(at(34, steps).into, 1);
  assert.equal(at(66, steps).i, 1);
  assert.equal(at(67, steps).i, 2);
  assert.equal(at(99, steps).i, 2);
  assert.equal(at(99, steps).stepComplete, true);

  const end = at(100, steps);
  assert.equal(end.i, 3, "the hundredth is the tahlīl");
  assert.equal(end.complete, true);
  assert.equal(end.done, 100);
});

test("at() cannot be pushed past the end or below zero", () => {
  assert.equal(at(1000).done, 100);
  assert.equal(at(1000).complete, true);
  assert.equal(at(-5).done, 0);
  assert.equal(at(-5).i, 0);
});

/* Every tap from 1 to 100 must land in exactly one step, and the steps must
   account for all hundred between them. A fencepost error in at() would show
   here as a missing or doubled tap rather than as a wrong label somewhere. */
test("the hundred taps distribute across the four steps exactly", () => {
  const steps = sequence();
  const seen = new Array(steps.length).fill(0);
  for (let n = 1; n <= 100; n++) seen[at(n, steps).i]++;
  assert.deepEqual(seen, [33, 33, 33, 1]);
});
