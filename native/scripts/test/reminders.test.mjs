/**
 * Taiyabah Masjid — the switches mean what the scheduler thinks they mean.
 * Copyright (c) 2026 Yameen Bux. All rights reserved. See LICENSE.md.
 *
 * plan() turns the three things somebody can set — jamāʿah on or off, how many
 * minutes before, and the Friday Kahf reminder — into the shape arm() takes.
 * It was written out by hand at each call site until there were three of them,
 * which is one mapping in three places and the standing invitation to change
 * two of them.
 *
 * plan() lives in src/plan.js rather than beside arm(), precisely so that
 * this can import the app's own function instead of a copy of it: reminders.js
 * reaches for expo-notifications on its first line and plain Node cannot load
 * that. A copy of the mapping tested here would be a fourth copy.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { plan } from "../../src/plan.js";
import { ORDER } from "../../src/prayer.js";

const root = path.resolve(import.meta.dirname, "../..");

/* Comments stripped before anything is asserted about what the code CALLS.
 * The first version of the check below failed on this very file's own header,
 * which explains in prose that arm() calls ask() — a test that reads the
 * commentary is a test that punishes you for explaining yourself. */
const code = file => fs.readFileSync(path.join(root, file), "utf8")
  .replace(/\/\*[\s\S]*?\*\//g, " ")
  .replace(/^\s*\/\/.*$/gm, " ");

test("jamāʿah on arms every prayer at the chosen number of minutes", () => {
  const { per, extras } = plan({ jamaah: true, mins: 15, kahf: false });
  assert.deepEqual(Object.keys(per).sort(), [...ORDER].sort());
  for (const k of ORDER) assert.equal(per[k], 15);
  assert.equal(extras.kahf, false);
});

test("jamāʿah off arms no prayers at all", () => {
  const { per } = plan({ jamaah: false, mins: 10, kahf: true });
  assert.deepEqual(per, {});
});

test("Kahf is independent of the jamāʿah switch", () => {
  assert.equal(plan({ jamaah: false, kahf: true }).extras.kahf, true);
  assert.equal(plan({ jamaah: true, mins: 5, kahf: false }).extras.kahf, false);
});

test("zero minutes means at the jamāʿah, not off", () => {
  /* arm() filters on `undefined | null | false`, so 0 has to survive — a
     reminder set for the moment the jamāʿah stands is a real choice. */
  const { per } = plan({ jamaah: true, mins: 0, kahf: false });
  assert.equal(per.fajr, 0);
  assert.equal(Object.keys(per).length, 5);
});

test("nothing set at all does not throw", () => {
  assert.deepEqual(plan(undefined), { per: {}, extras: { kahf: false } });
  assert.deepEqual(plan({}), { per: {}, extras: { kahf: false } });
});

test("the week is armed on launch, not only from the settings screen", () => {
  /* The fault this guards: arm() had two callers, the first-run card and the
     Notifications screen, so reminders expired seven days after being switched
     on and nothing said so. Something mounted for the life of the app has to
     re-arm them. */
  assert.match(code("src/App.jsx"), /<KeepReminders\s*\/>/,
    "nothing re-arms the reminders on launch — see src/keep-reminders.jsx");

  const keeper = code("src/keep-reminders.jsx");
  assert.match(keeper, /AppState\.addEventListener/,
    "the keeper does not re-arm when the app returns to the foreground");
  assert.match(keeper, /getPermissionsAsync/,
    "the keeper must READ permission");
  assert.doesNotMatch(keeper, /requestPermissionsAsync|\bask\(/,
    "the keeper must never REQUEST permission — that dialog can be raised once, " +
    "and FirstRun.jsx owns the moment it is raised");
});
