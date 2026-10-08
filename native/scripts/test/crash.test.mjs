/**
 * Taiyabah Masjid — the one path whose job is to tell us when something breaks.
 * Copyright (c) 2026 Yameen Bux. All rights reserved. See LICENSE.md.
 *
 * app_crashes held ZERO rows on the day the native app went to production. Not
 * one report, ever. The code looked right — and "looks right" is what every
 * other check in this repository exists to refuse.
 *
 * report_app_crash() drops a report with no message, no app_version, or a
 * platform that is not android or ios, and it drops it SILENTLY: it returns
 * {ok:false} rather than raising, because an app that is already crashing must
 * not be handed a second error to deal with. That is the right behaviour and
 * it is also why nothing would ever have told us the shape was wrong.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { crashPayload, firstTime, forgetReported, shortMessage, wouldBeAccepted }
  from "../../src/crash-report.js";

const env = { version: "2.0.0", build: 7, platform: "android",
              osVersion: "Android 16", device: "Pixel 6", screen: "Qibla" };

test("a report carries everything the function requires", () => {
  const p = crashPayload(new Error("Cannot read properties of undefined"), env);
  assert.ok(wouldBeAccepted(p), "would be refused by report_app_crash()");
  assert.equal(p.message, "Cannot read properties of undefined");
  assert.equal(p.app_version, "2.0.0");
  assert.equal(p.build, "7");
  assert.equal(p.platform, "android");
  assert.equal(p.screen, "Qibla");
});

test("an app version that never arrived still makes a reportable crash", () => {
  /* Constants.expoConfig is undefined in some launch paths. A report with no
     version is thrown away by the function, so "unknown" beats nothing. */
  const p = crashPayload(new Error("boom"), { ...env, version: undefined });
  assert.equal(p.app_version, "unknown");
  assert.ok(wouldBeAccepted(p));
});

test("the platform is only ever android or ios", () => {
  /* The web export runs the same code. "web" is not a platform the function
     accepts, and a report it refuses is a crash nobody hears about. */
  for (const platform of ["web", "windows", undefined]) {
    const p = crashPayload(new Error("boom"), { ...env, platform });
    assert.equal(p.platform, "android");
    assert.ok(wouldBeAccepted(p));
  }
  assert.equal(crashPayload(new Error("boom"), { ...env, platform: "ios" }).platform, "ios");
});

test("a thrown string, not an Error, still reports", () => {
  /* `throw "nope"` is legal JavaScript and happens in libraries. */
  const p = crashPayload("nope", env);
  assert.equal(p.message, "nope");
  assert.equal(p.stack, null);
  assert.ok(wouldBeAccepted(p));
});

test("a message with no words is not a report", () => {
  assert.equal(shortMessage(new Error("   ")), "");
  assert.equal(shortMessage(null), "");
  assert.equal(shortMessage(undefined), "");
  assert.ok(!wouldBeAccepted(crashPayload(new Error("  "), env)));
});

test("a runaway message is cut to what the column holds", () => {
  const p = crashPayload(new Error("x".repeat(5000)), env);
  assert.equal(p.message.length, 500);
  assert.ok(wouldBeAccepted(p));
});

test("newlines in a message become one line", () => {
  assert.equal(shortMessage(new Error("two\n  lines\there")), "two lines here");
});

test("a stack is capped, and an empty one is null rather than empty", () => {
  const e = new Error("boom");
  e.stack = "s".repeat(20000);
  assert.equal(crashPayload(e, env).stack.length, 8000);
  const bare = new Error("boom");
  bare.stack = "";
  assert.equal(crashPayload(bare, env).stack, null);
});

test("the same fault twice in one run is reported once", () => {
  forgetReported();
  assert.equal(firstTime("boom", "Qibla"), true);
  assert.equal(firstTime("boom", "Qibla"), false);
  /* The same message on a different screen is a different fault. */
  assert.equal(firstTime("boom", "Notices"), true);
  /* And a different fault on the same screen is too. */
  assert.equal(firstTime("other", "Qibla"), true);
});

test("forgetting is complete, so a test cannot poison the next one", () => {
  forgetReported();
  assert.equal(firstTime("boom", "Qibla"), true);
  forgetReported();
  assert.equal(firstTime("boom", "Qibla"), true);
});

test("the masjid is not set here — rpc() puts it on every write", () => {
  /* If a call site ever sets it, two places decide which masjid a crash
     belongs to, and one of them will be wrong. */
  assert.equal("masjid" in crashPayload(new Error("boom"), env), false);
});

/* ---- the wiring, read from the source ------------------------------------
 * The payload is tested above and the live function accepts it (see the
 * commit message for that check). What neither proves is that anything ever
 * CALLS it. React's componentDidCatch cannot be exercised from Node without a
 * renderer, so this reads the file instead: blunt, but it fails the day
 * somebody deletes the line, which is the failure that would put the app back
 * to crashing in silence. */
import fs from "node:fs";
import path from "node:path";

const SRC = path.resolve(import.meta.dirname, "../../src");

test("the error boundary still reports what it catches", () => {
  const src = fs.readFileSync(path.join(SRC, "Boundary.jsx"), "utf8");
  assert.match(src, /import\s*\{\s*reportCrash\s*\}\s*from\s*"\.\/crash"/,
    "Boundary no longer imports reportCrash");
  assert.match(src, /componentDidCatch\s*\([^)]*\)\s*\{[^}]*reportCrash\(/s,
    "componentDidCatch no longer reports the error it caught");
  assert.match(src, /reportCrash\([^)]*screen:/,
    "the report no longer says which screen threw");
});

test("every screen in the app is wrapped in a boundary", () => {
  /* A screen outside one throws to the root, which React Native answers with
     a blank white screen and no report at all. Two navigators wrap their
     screens and name them; one more wraps the provider and the navigation
     container, for a fault that happens outside any screen. */
  const app = fs.readFileSync(path.join(SRC, "App.jsx"), "utf8");
  const named = app.match(/<Boundary screen=/g) || [];
  assert.ok(named.length >= 2,
    `only ${named.length} navigator(s) wrap their screens in a named boundary`);
  assert.match(app, /<Boundary>/,
    "nothing wraps the provider and the navigation container any more");
});
