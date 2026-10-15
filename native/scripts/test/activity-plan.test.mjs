/**
 * Taiyabah Masjid — the Dynamic Island appears when it should and not when it
 * should not.
 * Copyright (c) 2026 Yameen Bux. All rights reserved. See LICENSE.md.
 *
 * The two failures worth guarding are opposites and both are bad: an island
 * that never appears, and an island that sits on somebody's phone all day.
 * The second is worse — it is the reason people turn Live Activities off, and
 * once they have, they do not turn them back on.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { activityPlan, samePlan, LEAD_MINUTES, GRACE_MINUTES } from "../../src/activity-plan.js";

const MIN = 60000;
const NOW = Date.parse("2026-10-16T12:00:00Z");
const next = { key: "zuhr", name: "Jumuʿah" };
const plan = (iqamahMin, adhanMin) => activityPlan(next, {
  now: NOW,
  iqamahMs: NOW + iqamahMin * MIN,
  adhanMs: adhanMin === undefined ? undefined : NOW + adhanMin * MIN,
});

test("inside the window, it runs", () => {
  for (const m of [1, 10, 28, 45, 59, 60]) assert.ok(plan(m, m - 28), `${m} min away`);
});

test("too far out, nothing — an island occupied all afternoon gets switched off", () => {
  for (const m of [61, 90, 120, 240, 600]) assert.equal(plan(m, m - 28), null, `${m} min away`);
});

test("the jamāʿah has been, so there is nothing to count down to", () => {
  for (const m of [0, -1, -30]) assert.equal(plan(m, m - 28), null, `${m} min away`);
});

test("nothing at all without a next jamāʿah or an iqāmah instant", () => {
  assert.equal(activityPlan(null, { now: NOW, iqamahMs: NOW + MIN }), null);
  assert.equal(activityPlan(next, { now: NOW }), null);
  assert.equal(activityPlan(next, { now: NOW, iqamahMs: NaN }), null);
});

test("the ring runs from the adhān to the iqāmah", () => {
  const p = plan(20, -8);                       /* adhān 8 min ago, iqāmah in 20 */
  assert.equal(p.adhanMs, NOW - 8 * MIN);
  assert.equal(p.iqamahMs, NOW + 20 * MIN);
});

test("but never further back than the window itself", () => {
  /* December Isha: the adhān is nearly two hours before the jamāʿah. The ring
     takes the last hour of that, or it would appear already half spent. */
  const p = plan(20, -93);
  assert.equal(p.adhanMs, p.iqamahMs - LEAD_MINUTES * MIN);
  assert.ok(p.adhanMs > NOW - 93 * MIN, "the ring should not start at the adhān here");
});

test("no adhān time still gives a ring, not an absent one", () => {
  const p = plan(20);
  assert.equal(p.adhanMs, NOW + 20 * MIN - LEAD_MINUTES * MIN);
  assert.ok(p.adhanMs < p.iqamahMs);
});

test("an adhān at or after the iqāmah is nonsense and is not used", () => {
  for (const bad of [20, 30]) {
    const p = plan(20, bad);
    assert.ok(p.adhanMs < p.iqamahMs, `adhān +${bad} must not sit on or past the iqāmah`);
  }
});

test("it dismisses itself a few minutes after the jamāʿah", () => {
  const p = plan(20, -8);
  assert.equal(p.endMs, p.iqamahMs + GRACE_MINUTES * MIN);
  assert.ok(p.endMs > p.iqamahMs, "it must outlive the jamāʿah, not vanish on the second");
});

test("re-opening the app does not stack a second island on the same prayer", () => {
  const a = plan(30, 2), b = plan(30, 2);
  assert.ok(samePlan(a, b));
});

test("but the next prayer is a different activity", () => {
  const a = plan(30, 2);
  const b = activityPlan({ key: "asr", name: "Asr" },
                         { now: NOW, iqamahMs: NOW + 30 * MIN, adhanMs: NOW + 2 * MIN });
  assert.equal(samePlan(a, b), false);
  /* and so is the same prayer tomorrow */
  assert.equal(samePlan(a, plan(31, 2)), false);
  assert.equal(samePlan(a, null), false);
  assert.equal(samePlan(null, null), false);
});

test("the lead window covers every adhān-to-iqāmah gap the masjid actually has", async () => {
  const { default: table } = await import("../../targets/widget/timetable.json", { with: { type: "json" } });
  let widest = 0, widestDay = "";
  for (const [iso, rec] of Object.entries(table.days)) {
    for (const key of ["fajr", "zuhr", "asr", "maghrib", "isha"]) {
      const b = rec.begins?.[key], j = rec.jamaat?.[key];
      if (!b || !j) continue;
      const mins = (s) => { const [h, m] = s.split(":").map(Number); return h * 60 + m; };
      const gap = mins(j) - mins(b);
      if (gap > widest) { widest = gap; widestDay = `${iso} ${key}`; }
    }
  }
  assert.ok(widest > 0, "the timetable should have some adhān-to-iqāmah gaps");
  /* The island never appears before the adhān. Where the wait is shorter than
     the window — which is most prayers — the ring IS the whole wait; where it
     is longer, the ring is the last hour of it. Either way it must never
     start before the prayer has come in. */
  assert.ok(LEAD_MINUTES <= widest,
    `LEAD_MINUTES is ${LEAD_MINUTES} but the widest real adhān-to-iqāmah gap is only ${widest} min (${widestDay}), ` +
    `so on every other day the island would appear before the adhān`);
});

/* ── the whole year, through the real rule ───────────────────────────────── */

test("across a real year the island is offered once per jamāʿah, and briefly", async () => {
  const { default: table } = await import("../../targets/widget/timetable.json", { with: { type: "json" } });
  const mins = (s) => { const [h, m] = s.split(":").map(Number); return h * 60 + m; };
  const MS = 60000;

  let offered = 0, days = 0, longest = 0;
  let onScreenMinutes = 0;
  for (const [iso, rec] of Object.entries(table.days)) {
    if (!rec.jamaat) continue;
    days++;
    const midnight = Date.parse(`${iso}T00:00:00Z`);
    for (const key of ["fajr", "zuhr", "asr", "maghrib", "isha"]) {
      const j = rec.jamaat[key], b = rec.begins?.[key];
      if (!j) continue;
      const iqamahMs = midnight + mins(j) * MS;
      const adhanMs = b ? midnight + mins(b) * MS : undefined;

      /* Walk the whole day a minute at a time and ask the real rule. */
      let shown = 0;
      for (let m = 0; m < 24 * 60; m++) {
        const p = activityPlan({ key, name: key }, { now: midnight + m * MS, iqamahMs, adhanMs });
        if (p) {
          shown++;
          assert.ok(p.adhanMs < p.iqamahMs, `${iso} ${key}: the ring has no span`);
          assert.ok(p.endMs > p.iqamahMs, `${iso} ${key}: it would vanish on the jamāʿah`);
        }
      }
      if (shown) offered++;
      onScreenMinutes += shown;
      longest = Math.max(longest, shown);
    }
  }

  assert.equal(offered, days * 5, "every jamāʿah of the year should have a window");
  assert.ok(longest <= LEAD_MINUTES + 1,
    `the longest window is ${longest} min, which is longer than the ${LEAD_MINUTES} min the rule allows`);
  /* The honest figure for "how much of the day could this be on screen", if
     somebody opened the app at the start of every single window. */
  const share = onScreenMinutes / (days * 24 * 60);
  assert.ok(share < 0.25,
    `the island could be on screen ${(share * 100).toFixed(0)}% of the day, which is too much of somebody's phone`);
  console.log(`      ${days} days, ${offered} windows, longest ${longest} min, at most ${(share * 100).toFixed(0)}% of a day`);
});
