/**
 * Taiyabah Masjid — a notification trigger that arrives when it is meant to.
 * Copyright (c) 2026 Yameen Bux. All rights reserved. See LICENSE.md.
 *
 * expo-notifications treats a trigger it does not recognise as "deliver now".
 * There is no error and no warning, so the only sign is a phone that buzzes
 * thirty-six times and then never reminds anybody of anything again. These
 * assert the three things that keep that from coming back: our triggers carry
 * a type, the type strings are the ones the installed package matches on, and
 * nothing in the app hand-rolls a trigger object around the helpers.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { at, weekly, DATE, WEEKLY, FRIDAY } from "../../src/triggers.js";

const root = path.resolve(import.meta.dirname, "../..");

test("every trigger this app builds carries a type", () => {
  const built = [
    at(new Date("2026-01-01T05:00:00Z")),
    at(new Date("2026-01-01T05:00:00Z"), "prayer"),
    weekly({ weekday: FRIDAY, hour: 7, minute: 30 }),
    weekly({ weekday: FRIDAY, hour: 7, minute: 30, channelId: "prayer" }),
  ];
  for (const t of built)
    assert.ok(t.type, `a trigger came out with no type: ${JSON.stringify(t)} — ` +
                      "expo-notifications would deliver that one immediately");
});

test("a channel is set only when one is asked for", () => {
  /* iOS has no channels and parseTrigger copies the key straight through, so
     an undefined channelId must not appear at all. */
  assert.equal("channelId" in at(new Date()), false);
  assert.equal(at(new Date(), "prayer").channelId, "prayer");
  assert.equal("channelId" in weekly({ weekday: 6, hour: 7, minute: 30 }), false);
});

test("the date trigger keeps the moment it was given", () => {
  const when = new Date("2026-03-14T18:42:00Z");
  assert.equal(at(when).date, when);
});

test("Sūrah al-Kahf is on a Friday, counting from Sunday as expo does", () => {
  /* Sunday is 1, so Friday is 6. Off by one here puts it on Thursday. */
  assert.equal(FRIDAY, 6);
  assert.equal(weekly({ weekday: FRIDAY, hour: 7, minute: 30 }).weekday, 6);
});

test("the type strings still match the installed expo-notifications", () => {
  /* Read, not imported: importing drags expo-modules-core in and this test
     stops being able to run in Node. If the package ever renames these, our
     triggers would silently become "deliver now" again — so compare. */
  const src = fs.readFileSync(
    path.join(root, "node_modules/expo-notifications/build/Notifications.types.js"), "utf8");
  const enumFor = name => {
    const m = src.match(new RegExp(`SchedulableTriggerInputTypes\\["${name}"\\]\\s*=\\s*"([^"]+)"`));
    return m && m[1];
  };
  assert.equal(enumFor("DATE"), DATE);
  assert.equal(enumFor("WEEKLY"), WEEKLY);
});

test("expo-notifications still treats an unknown trigger as deliver-now", () => {
  /* The assumption the whole file rests on. If a future version starts
     throwing instead, this test fails and the comments need rewriting — which
     is the right outcome, because they would then be wrong. */
  const src = fs.readFileSync(
    path.join(root, "node_modules/expo-notifications/build/scheduleNotificationAsync.js"), "utf8");
  const tail = src.slice(src.indexOf("export function parseTrigger"));
  assert.match(tail.slice(0, tail.indexOf("function parseCalendarTrigger")),
    /Platform\.select\(\{\s*default:\s*null/,
    "parseTrigger no longer falls through to null — re-read src/triggers.js");
});

test("nothing builds a trigger by hand around the helpers", () => {
  for (const file of ["src/reminders.js", "src/FirstRun.jsx", "src/screens/Alerts.jsx"]) {
    const src = fs.readFileSync(path.join(root, file), "utf8");
    for (const m of src.matchAll(/trigger:\s*([^\n]*)/g)) {
      const value = m[1];
      if (value.includes("//") || value.trim().startsWith("/*")) continue;
      assert.match(value, /\b(at|weekly)\(/,
        `${file} builds a trigger by hand: ${value.trim()} — use src/triggers.js`);
    }
  }
});
