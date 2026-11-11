/**
 * The dot on the bell: the two rules that decide whether it lights.
 *
 * Both are the kind of mistake nobody reports. A dot that is always on gets
 * ignored within a week and then a janāzah notice arrives and is ignored too;
 * a dot that never lights is indistinguishable from a masjid that has
 * announced nothing. Neither shows up in a screenshot.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { unseenCount, pruneCleared } from "../../src/notices-unread.js";

const A = "aaa", B = "bbb", C = "ccc";

test("a fresh install is not shown a dot for history it never missed", () => {
  /* seen === null means "never loaded", NOT "seen nothing". Getting this
     wrong lights the bell with every notice ever published the first time
     somebody opens the app. */
  assert.equal(unseenCount([A, B, C], null, []), 0);
  assert.equal(unseenCount([A, B, C], undefined, []), 0);
});

test("an empty array is not the same as null — it means seen nothing", () => {
  assert.equal(unseenCount([A, B, C], [], []), 3);
});

test("only what has arrived since the last look counts", () => {
  assert.equal(unseenCount([A, B, C], [B, C], []), 1);
  assert.equal(unseenCount([A, B, C], [A, B, C], []), 0);
});

test("a cleared notice counts as read", () => {
  /* Otherwise clearing the list leaves the dot lit by the very notice the
     reader has just dealt with. */
  assert.equal(unseenCount([A, B, C], [], [A, B, C]), 0);
  assert.equal(unseenCount([A, B, C], [], [A]), 2);
});

test("nothing live means nothing to report", () => {
  assert.equal(unseenCount([], [], []), 0);
  assert.equal(unseenCount(null, [], []), 0);
});

test("cleared ids are pruned once the notice retires", () => {
  /* A notice expires server-side and its id would otherwise sit in the store
     for ever — a list that only grows, naming things nobody can see. */
  assert.deepEqual(pruneCleared([A, B], [B]), [B]);
  assert.deepEqual(pruneCleared([A, B], [C]), []);
});

test("pruning returns the SAME array when nothing changed", () => {
  /* The caller compares by identity to decide whether to write to storage.
     A fresh equal array here is a disk write on every render. */
  const kept = [A, B];
  assert.equal(pruneCleared(kept, [A, B]), kept);
  assert.equal(pruneCleared(kept, []), kept);        // nothing to prune against yet
  const none = [];
  assert.equal(pruneCleared(none, [A]), none);       // an empty list is handed straight back
});
