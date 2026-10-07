/**
 * Taiyabah Masjid — a form may never say "sent" when it was not sent.
 * Copyright (c) 2026 Yameen Bux. All rights reserved. See LICENSE.md.
 *
 * rpc() answers {ok:true, data} or {ok:false, message} — never the row the
 * Postgres function returned. The charity collection form stored that answer
 * whole and tested it for truthiness, so a request Postgres had REFUSED drew
 * "Your request has been sent", and the reference it told people to keep was
 * never there to print. Three forms read r.ok; that one did not, and nothing
 * here noticed.
 *
 * So this reads the screens. Every rpc() a person waits on has to look at .ok
 * before it decides anything, and no screen may hand the whole answer to a
 * "sent" or "done" state.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const SRC = path.resolve(import.meta.dirname, "../../src");
const files = [];
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (/\.jsx?$/.test(e.name)) files.push(p);
  }
})(SRC);

/* Fire-and-forget, by design: a crash report has nobody waiting on a screen
 * for it, and a failed report must never become a second crash. */
const IGNORES_ITS_ANSWER = new Set(["crash.js"]);

const callSites = [];
for (const file of files) {
  const src = fs.readFileSync(file, "utf8");
  const lines = src.split("\n");
  lines.forEach((line, i) => {
    if (!/\brpc\(\s*["'`]/.test(line)) return;
    if (/export async function rpc/.test(line)) return;
    callSites.push({ file: path.basename(file), rel: path.relative(SRC, file),
                     line: i + 1, after: lines.slice(i, i + 60).join("\n") });
  });
}

test("every form in the app calls rpc() — the list is not empty", () => {
  assert.ok(callSites.length >= 4, `found ${callSites.length} rpc() call sites`);
});

for (const site of callSites) {
  if (IGNORES_ITS_ANSWER.has(site.file)) continue;
  test(`${site.rel}:${site.line} looks at whether the write succeeded`, () => {
    assert.match(site.after, /\.ok\b/,
      "an rpc() a person is waiting on must test .ok before it reports anything");
  });
  test(`${site.rel}:${site.line} does not hand the raw answer to a success state`, () => {
    /* setState({ done: r }) / { sent: r } — the shape of the bug. */
    const raw = /(?:sent|done)\s*:\s*r\s*[,}]/.exec(site.after);
    assert.equal(raw, null,
      raw ? `"${raw[0]}" stores rpc()'s envelope, which is truthy even when ok is false` : "");
  });
  test(`${site.rel}:${site.line} reads the reference out of data`, () => {
    /* If it prints a reference at all, it has to come from r.data. */
    if (!/reference/.test(site.after)) return;
    assert.match(site.after, /r\.data\.reference|r\.data\b/,
      "the reference lives in r.data, not on the envelope");
  });
}

/* The one control a person must tick to agree to anything. */
test("the form checkbox announces as a checkbox, not as a button", () => {
  const src = fs.readFileSync(path.join(SRC, "form.jsx"), "utf8");
  const check = src.slice(src.indexOf("export function Check("),
                          src.indexOf("export function Calendar("));
  assert.match(check, /accessibilityRole="checkbox"/,
    "Press defaults to the button role, which says nothing about ticked or not");
  assert.match(check, /accessibilityState=\{\{\s*checked:/,
    "and a checkbox that never reports checked is worse than a button");
});

/* Sent takes title, body, reference and extra, and renders no children. The
 * charity collection screen handed it the reference as a child, which is
 * valid JSX, compiles, draws the success screen — and silently loses the one
 * thing the office needs to find the request again. */
test("no screen hands the success card children it will throw away", () => {
  const offenders = [];
  for (const file of files) {
    const src = fs.readFileSync(file, "utf8");
    if (src.includes("</Sent>")) offenders.push(path.relative(SRC, file));
  }
  assert.deepEqual(offenders, [],
    "pass reference={...} and extra={...} — Sent does not render children");
});
