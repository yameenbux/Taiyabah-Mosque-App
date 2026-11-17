/**
 * Taiyabah Masjid — the report a person sends when something will not work.
 * Copyright (c) 2026 Yameen Bux. All rights reserved. See LICENSE.md.
 *
 * The crash reporter fires on its own when the app falls over; this is the half
 * a person starts, from "Report a problem". report_app_issue() drops a report
 * with no app_version or a platform that is not android or ios, and drops it
 * SILENTLY — so, as with the crash path, the shape is checked HERE rather than
 * discovered later from an empty table.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { pushCrumb, formatLog, issuePayload, issueWouldBeAccepted }
  from "../../src/diagnostics-core.js";

const env = { version: "2.3.0", build: 31, platform: "android", osVersion: "Android 14", device: "Pixel 7" };

test("a report carries everything the function requires", () => {
  const p = issuePayload({ note: "audio won't play", screen: "Recordings", log: "-2s opened Live", ...env });
  assert.equal(p.app_version, "2.3.0");
  assert.equal(p.platform, "android");
  assert.equal(p.note, "audio won't play");
  assert.equal(p.screen, "Recordings");
  assert.equal(p.build, "31");
  assert.ok(issueWouldBeAccepted(p));
});

test("no note and no screen is still a valid report — the log alone is worth sending", () => {
  const p = issuePayload({ log: "-1s opened Qibla", ...env });
  assert.equal(p.note, null);
  assert.equal(p.screen, null);
  assert.ok(issueWouldBeAccepted(p));
});

test("the platform is only ever android or ios", () => {
  assert.equal(issuePayload({ ...env, platform: "web" }).platform, "android");
  assert.equal(issuePayload({ ...env, platform: "ios" }).platform, "ios");
  assert.ok(!issueWouldBeAccepted({ app_version: "2.3.0", platform: "web" }));
});

test("a missing app version is not a report the function will accept", () => {
  const p = issuePayload({ platform: "ios", device: "iPhone" });
  assert.equal(p.app_version, "unknown");
  assert.ok(!issueWouldBeAccepted(p));
});

test("a note too long for the column is cut here, not refused there", () => {
  const p = issuePayload({ note: "x".repeat(2000), ...env });
  assert.equal(p.note.length, 1000);
});

test("empty words become null so the database's nullif has nothing to do", () => {
  const p = issuePayload({ note: "   ", screen: "", ...env });
  assert.equal(p.note, null);
  assert.equal(p.screen, null);
});

test("the trail is a ring: it keeps the newest and drops the oldest", () => {
  const trail = [];
  for (let i = 0; i < 30; i++) pushCrumb(trail, `event ${i}`, 24);
  assert.equal(trail.length, 24);
  assert.equal(trail[0].s, "event 6");            // 0..5 fell off the front
  assert.equal(trail[trail.length - 1].s, "event 29");
});

test("a blank crumb is not recorded, and whitespace is squeezed to one line", () => {
  const trail = [];
  pushCrumb(trail, "   ");
  pushCrumb(trail, null);
  assert.equal(trail.length, 0);
  pushCrumb(trail, "played   a\nrecording");
  assert.equal(trail[0].s, "played a recording");
});

test("the log reads newest last, each line stamped with how long ago", () => {
  const now = 100000;
  const trail = [
    { t: now - 5000, s: "opened Live" },
    { t: now - 1000, s: "stream error" },
  ];
  const out = formatLog(trail, now);
  const lines = out.split("\n");
  assert.ok(lines[0].includes("opened Live"));
  assert.ok(lines[0].startsWith("-5s"));
  assert.ok(lines[1].includes("stream error"));
  assert.ok(lines[1].startsWith("-1s"));
});

test("an empty trail is an empty log, not a crash", () => {
  assert.equal(formatLog([]), "");
  assert.equal(formatLog(null), "");
});
