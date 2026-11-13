/**
 * Taiyabah Masjid — every navigate() goes somewhere.
 * Copyright (c) 2026 Yameen Bux. All rights reserved. See LICENSE.md.
 *
 * THE BUG THIS EXISTS FOR. The Notices tab was renamed to EventsTab. The
 * default in TopBar was updated; two screens that passed their OWN onBell
 * were not, and went on calling navigate("NoticesTab"). React Navigation
 * does not throw for an unknown route — it does nothing — so the bell on
 * the Home screen, the first thing anybody opens, became a button that
 * silently did not work. Nothing failed. No test went red. It was found by
 * driving the app and wondering why the dot never appeared.
 *
 * Renaming a route is exactly the kind of change that looks complete after
 * grep tells you the old name is gone from the file you were editing. This
 * reads every navigate("…") literal in src/ and insists the name is a screen
 * the app actually registers.
 *
 * Only string literals are checked. navigate(someVariable) is skipped on
 * purpose — ROUTE in Blocks.jsx is a table of those and check-dead-rows.mjs
 * already proves every entry in it resolves.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const SRC = path.resolve(import.meta.dirname, "../../src");
const APP = path.join(SRC, "App.jsx");

const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => {
  const full = path.join(dir, e.name);
  if (e.isDirectory()) return walk(full);
  return /\.(jsx?|tsx?)$/.test(e.name) ? [full] : [];
});

/** Every name the app registers: Stack screens, Tab screens, and the sheets. */
function registered() {
  const app = fs.readFileSync(APP, "utf8");
  const names = new Set();
  for (const m of app.matchAll(/<(?:Stack|Tab)\.Screen\s+name="([A-Za-z0-9_]+)"/g))
    names.add(m[1]);
  //  The sheets are registered from a map rather than written out one by one.
  const sheet = app.slice(app.indexOf("const SHEET = {"));
  for (const m of sheet.slice(0, sheet.indexOf("};")).matchAll(/([A-Za-z0-9_]+)\s*:\s*"/g))
    names.add(m[1]);
  return names;
}

test("the app registers the screens this test expects to find", () => {
  const names = registered();
  //  A guard on the guard: if the parsing above silently stopped matching,
  //  every assertion below would pass against an empty set.
  assert.ok(names.size > 20, `only found ${names.size} registered screens — the parser has drifted`);
  for (const must of ["HomeTab", "EventsTab", "Notifications", "Alerts", "About"])
    assert.ok(names.has(must), `${must} is not registered — has it been renamed?`);
});

test("every navigate(\"…\") in src names a screen the app registers", () => {
  const names = registered();
  const bad = [];
  for (const file of walk(SRC)) {
    /* Comments are stripped first. The ROUTE table in Blocks.jsx carries a
       comment explaining that navigate("Donate") matched nothing and why it
       was changed — scanning the raw text reports that explanation as a
       fault, which would teach the next person to ignore this check. */
    const text = fs.readFileSync(file, "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/(^|[^:"'`\\])\/\/[^\n]*/g, "$1");
    for (const m of text.matchAll(/\bnavigate\(\s*["'`]([A-Za-z0-9_]+)["'`]/g)) {
      if (!names.has(m[1])) {
        const line = text.slice(0, m.index).split("\n").length;
        bad.push(`${path.relative(SRC, file)}:${line} navigate("${m[1]}")`);
      }
    }
  }
  assert.deepEqual(bad, [],
    "these go to a screen that is not registered, and React Navigation will " +
    "do nothing rather than complain:\n  " + bad.join("\n  "));
});
