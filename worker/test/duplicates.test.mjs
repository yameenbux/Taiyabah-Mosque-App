/**
 * Taiyabah Masjid — a jamāʿah reminder arrives once.
 * Copyright (c) 2026 Yameen Bux. All rights reserved. See LICENSE.md.
 *
 * The app schedules its jamāʿah and Sūrah al-Kahf reminders on the phone, so
 * a push for the same prayer is a second copy of a notification the person
 * already has. A browser subscriber has no local reminders at all and would
 * get nothing without the push — and they are the majority. So the two
 * reminders the app arms itself go to browsers only, and everything else goes
 * to everybody.
 *
 * Getting that wrong in either direction is silent. Too broad and every app
 * user hears the same prayer announced twice; too narrow and a whole platform
 * quietly stops being reminded. Neither shows up in a dashboard, which says
 * "delivered" for both.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { reminderPayload, TOPICS } from "../worker.js";

const APP = "test-app-id";
const PLATFORMS = ["isIos", "isAndroid", "isHuawei", "isAdm"];

test("a reminder the app arms itself is sent to browsers only", () => {
  const p = reminderPayload(APP, {
    title: "Isha Jamāʿah in 10 min", body: "…", tagMins: 10, webOnly: true,
  });
  assert.equal(p.isAnyWeb, true, "browser subscribers must still be reminded");
  for (const k of PLATFORMS)
    assert.equal(p[k], false, `${k} must be excluded — the app arms this one itself`);
});

test("a reminder with no local counterpart still reaches everyone", () => {
  const p = reminderPayload(APP, { title: "Jamāʿah Time Now", body: "…", tagMins: null });
  for (const k of [...PLATFORMS, "isAnyWeb"])
    assert.equal(k in p, false,
      `${k} is set, so this would reach only some platforms — nothing schedules ` +
      "this one locally, so every subscriber needs the push");
});

test("restricting the platform does not stop honouring the switches", () => {
  /* The platform flag is an extra condition, never a replacement for the tag
     filter. If it ever became one, a web subscriber who switched jamāʿah off
     would start being reminded. */
  const p = reminderPayload(APP, { title: "x", body: "y", tagMins: 10, webOnly: true });
  assert.ok(Array.isArray(p.filters) && p.filters.length > 1);
  for (const entry of p.filters)
    if (!entry.operator) assert.equal(entry.key, "p");
});

/* ---- and the call sites, which is where this would actually regress ---- */

const src = fs.readFileSync(path.resolve(import.meta.dirname, "../worker.js"), "utf8")
  .replace(/\/\*[\s\S]*?\*\//g, " ")
  .replace(/^\s*\/\/.*$/gm, " ");

/* Each sendReminder(env, {…}) CALL, as written. The function's own
   declaration opens with the same text, and is told apart by the fact that a
   call names its title — `title:` — while the declaration only passes one
   along. */
const calls = src.split("sendReminder(env, {").slice(1)
  .map(chunk => chunk.slice(0, chunk.indexOf("});")))
  .filter(chunk => /title:/.test(chunk));

test("every scheduled send is accounted for", () => {
  assert.equal(calls.length, 3,
    "a scheduled send was added or removed — decide whether the app also arms " +
    "it locally, and set webOnly accordingly");
});

test("the two the app arms locally are web-only; the one it does not is not", () => {
  const find = needle => {
    const hit = calls.filter(c => c.includes(needle));
    assert.equal(hit.length, 1, `expected exactly one send for ${needle}`);
    return hit[0];
  };

  assert.match(find("Jamāʿah in ${mins} min"), /webOnly:\s*true/,
    "the advance jamāʿah reminder is armed on the phone too — without webOnly " +
    "every app user gets it twice");
  assert.match(find('"Sūrah al-Kahf"'), /webOnly:\s*true/,
    "the app arms Sūrah al-Kahf on Friday morning — without webOnly it arrives twice");
  assert.doesNotMatch(find('"Jamāʿah Time Now"'), /webOnly/,
    "nothing arms this one locally, so restricting it would leave app users " +
    "with no alert at the jamāʿah itself");
});

test("Kahf is targeted by the Kahf switch, not by the jamāʿah one", () => {
  const p = reminderPayload(APP, {
    title: "Sūrah al-Kahf", body: "…", idx: TOPICS.kahf.idx, tagMins: null, webOnly: true,
  });
  const jamaah = reminderPayload(APP, { title: "x", body: "y", idx: TOPICS.jamaah.idx });
  assert.notDeepEqual(p.filters, jamaah.filters);
});
