/**
 * Taiyabah Masjid — the home-screen widget names the jamāʿah the app would.
 * Copyright (c) 2026 Yameen Bux. All rights reserved. See LICENSE.md.
 *
 * THE BUG THIS EXISTS FOR. A WidgetKit timeline is a list of entries, each
 * with a date, and the system shows the LAST entry whose date has passed.
 * targets/widget/index.swift built that list with
 *
 *     date: out.isEmpty ? from : slot.at.addingTimeInterval(-1)
 *
 * — an entry became visible one second before ITS OWN prayer. So the entry
 * naming Isha stayed on screen from the evening until one second before
 * Fajr, naming a jamāʿah that had already been, for eleven hours. And since
 * its `at` was by then in the past, and Text(style: .timer) counts UP from a
 * past date, it sat there all night with a number climbing away from a
 * prayer that had finished.
 *
 * WHAT THIS CAN AND CANNOT CHECK. There is no Swift toolchain on Linux and
 * none can be fetched here, so this does NOT run the widget's own code the
 * way check-android-logic.mjs compiles and runs the Android widget's Java.
 * It models the two scheduling rules over the real timetable and asserts
 * which one agrees with the app. A transcription error in the Swift would
 * slip past it; a wrong rule would not, and the rule is what was wrong.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "../..");
const table = JSON.parse(
  fs.readFileSync(path.join(root, "targets/widget/timetable.json"), "utf8"));

const ORDER = ["fajr", "zuhr", "asr", "maghrib", "isha"];
const mins = hhmm => { const [h, m] = hhmm.split(":").map(Number); return h * 60 + m; };

/** daySlots() from index.swift: the day's jamāʿahs in order, Jumuʿah expanded. */
function daySlots(rec) {
  const out = [];
  for (const key of ORDER) {
    if (key === "zuhr" && rec.jummah?.first) {
      const second = rec.jummah.second || null;
      out.push({ name: second ? "1st Jumuʿah" : "Jumuʿah", at: mins(rec.jummah.first) });
      if (second) out.push({ name: "2nd Jumuʿah", at: mins(second) });
      continue;
    }
    if (rec.jamaat?.[key]) out.push({ name: key, at: mins(rec.jamaat[key]) });
  }
  return out.sort((a, b) => a.at - b.at);
}

/** What the app answers: the first jamāʿah strictly after now (src/prayer.js). */
function appSays(slots, now) {
  return slots.find(s => s.at > now) ?? null;
}

/** What the widget shows: the last entry whose date has passed. `rule` maps
 *  an index to the minute that entry becomes visible. */
function widgetSays(slots, now, rule) {
  let shown = null;
  slots.forEach((s, i) => { if (rule(slots, i) <= now) shown = s; });
  return shown;
}

const NEW = (slots, i) => (i === 0 ? -Infinity : slots[i - 1].at);

const days = Object.entries(table.days);

/* ---------------------------------------------------------------------------
 * The old rule, modelled as the Swift actually had it — which is NOT simply
 * "its own prayer minus a second". The first entry of a timeline got `from`,
 * the moment the timeline was generated, and only entries 1..n got
 * slot.at - 1s. Getting that wrong overstates the damage, so it is modelled
 * properly here: one timeline generated at a moment, 60 entries deep (the
 * `limit`), reloaded only after the last of them.
 * ------------------------------------------------------------------------ */
function flatSlots() {
  const out = [];
  for (const [iso, rec] of days.sort((a, b) => a[0] < b[0] ? -1 : 1)) {
    const base = Date.parse(iso + "T00:00:00Z") / 60000;
    for (const s of daySlots(rec)) out.push({ name: s.name, at: base + s.at, iso });
  }
  return out;
}

test("the old rule showed a jamāʿah that had already been, for most of the time", () => {
  const all = flatSlots();
  const LIMIT = 60;
  let wrong = 0, total = 0;

  /* One timeline: generated just after some jamāʿah, holding the next 60. */
  const startIndex = 10;
  const from = all[startIndex].at - 30;            // generated 30 min before entry 0
  const entries = all.slice(startIndex, startIndex + LIMIT);
  const oldDate = i => (i === 0 ? from : entries[i].at - 1 / 60);

  for (let m = from; m < entries[entries.length - 1].at; m++) {
    total++;
    let shown = null;
    entries.forEach((e, i) => { if (oldDate(i) <= m) shown = e; });
    const truth = all.find(s => s.at > m);
    if (shown?.name !== truth?.name) wrong++;
  }

  const share = wrong / total;
  assert.ok(share > 0.9,
    `the old rule should be wrong almost always — it was wrong ${(share * 100).toFixed(1)}%`);
  console.log(`      old rule, one real timeline of ${LIMIT} entries: wrong at ` +
              `${wrong.toLocaleString()} of ${total.toLocaleString()} minutes ` +
              `(${(share * 100).toFixed(1)}%) — correct only until its first entry passed`);
});

test("the new rule agrees with the app at every minute of the year", () => {
  let checked = 0;
  for (const [iso, rec] of days) {
    const slots = daySlots(rec);
    if (!slots.length) continue;
    for (let m = slots[0].at; m < slots[slots.length - 1].at; m++) {
      const w = widgetSays(slots, m, NEW);
      const a = appSays(slots, m);
      assert.equal(w?.name, a?.name,
        `${iso} ${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")} — ` +
        `widget says ${w?.name}, app says ${a?.name}`);
      checked++;
    }
  }
  console.log(`      ${days.length} days, ${checked.toLocaleString()} minutes, widget and app agree at every one`);
});

test("an entry is never shown after its own jamāʿah has passed", () => {
  /* The property that was violated: whatever is on screen must still be in
     the future, or the countdown runs backwards. */
  for (const [iso, rec] of days) {
    const slots = daySlots(rec);
    if (!slots.length) continue;
    for (let m = slots[0].at; m < slots[slots.length - 1].at; m++) {
      const w = widgetSays(slots, m, NEW);
      if (w) assert.ok(w.at > m, `${iso}: at minute ${m} the widget shows ${w.name} at ${w.at}, already past`);
    }
  }
});

test("Friday shows both Jumuʿah sittings in order", () => {
  const friday = daySlots(table.days["2026-10-16"]);
  const names = friday.map(s => s.name);
  assert.ok(names.includes("1st Jumuʿah") && names.includes("2nd Jumuʿah"),
    `Friday slots were ${names.join(", ")}`);
  assert.ok(!names.includes("zuhr"), "Zuhr should be replaced by the Jumuʿah sittings");
  const first = friday.find(s => s.name === "1st Jumuʿah");
  const second = friday.find(s => s.name === "2nd Jumuʿah");
  assert.ok(first.at < second.at, "the sittings are out of order");
  /* And the widget turns over between them, rather than skipping one. */
  assert.equal(widgetSays(friday, first.at - 1, NEW).name, "1st Jumuʿah");
  assert.equal(widgetSays(friday, first.at, NEW).name, "2nd Jumuʿah");
});
