/**
 * Taiyabah Masjid — the next-year watchdog's rules
 * Copyright (c) 2026 Yameen Bux. All rights reserved. See LICENSE.md.
 *
 * The script that runs this check cannot be run here — the sandbox has no route
 * to Supabase. What CAN be checked here is the part that decides, which is the
 * part that would be wrong in a way nobody noticed: a watchdog that never barks.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { verdict, daysInYear, clientConfig } from "../next-year-published.mjs";

const day = (y, m, d) => new Date(Date.UTC(y, m - 1, d));
const errs = v => v.lines.filter(l => l.level === "error").map(l => l.text);

test("a complete this year and next year passes", () => {
  const v = verdict({ today: day(2026, 12, 31), counts: { 2026: 365, 2027: 365 } });
  assert.equal(v.exit, 0);
  assert.deepEqual(errs(v), []);
});

test("before November, a missing next year is only a notice", () => {
  const v = verdict({ today: day(2026, 10, 8), counts: { 2026: 365, 2027: 0 } });
  assert.equal(v.exit, 0, "October must not fail the job");
  assert.deepEqual(errs(v), []);
  assert.match(v.lines[1].text, /24 days away/);
});

test("on 1 November, a missing next year fails", () => {
  const v = verdict({ today: day(2026, 11, 1), counts: { 2026: 365, 2027: 0 } });
  assert.equal(v.exit, 1);
  assert.equal(errs(v).length, 1);
  assert.match(errs(v)[0], /STILL NOT PUBLISHED/);
  assert.match(errs(v)[0], /2026's times as though they were 2027's/);
});

test("the last day of October still does not fail", () => {
  assert.equal(verdict({ today: day(2026, 10, 31), counts: { 2026: 365, 2027: 0 } }).exit, 0);
});

test("December, still missing, still fails", () => {
  assert.equal(verdict({ today: day(2026, 12, 20), counts: { 2026: 365, 2027: 0 } }).exit, 1);
});

test("this year missing is an error whatever the date", () => {
  for (const m of [1, 5, 10, 11, 12]) {
    const v = verdict({ today: day(2026, m, 15), counts: { 2026: 0, 2027: 365 } });
    assert.equal(v.exit, 1, `month ${m}`);
    assert.match(errs(v)[0], /falling back to the file the app shipped with/);
  }
});

test("a part-published year is an error even in January", () => {
  const v = verdict({ today: day(2026, 1, 3), counts: { 2026: 365, 2027: 200 } });
  assert.equal(v.exit, 1);
  assert.match(errs(v)[0], /only 200 of 365 days/);
});

test("duplicated days are caught, not mistaken for plenty", () => {
  const v = verdict({ today: day(2026, 3, 1), counts: { 2026: 730, 2027: 365 } });
  assert.equal(v.exit, 1);
  assert.match(errs(v)[0], /730 rows for a 365-day year/);
});

test("a check that could not ask fails loudly rather than passing", () => {
  const v = verdict({ today: day(2026, 6, 1), counts: { 2026: null, 2027: null } });
  assert.equal(v.exit, 1, "a broken check must never look like a clean bill of health");
  assert.equal(errs(v).length, 2);
  for (const e of errs(v)) assert.match(e, /the check itself is broken/);
});

test("a year absent from counts entirely is the same as unaskable", () => {
  const v = verdict({ today: day(2026, 6, 1), counts: {} });
  assert.equal(v.exit, 1);
});

test("leap years want 366 days, and 2028 is one", () => {
  assert.equal(daysInYear(2027), 365);
  assert.equal(daysInYear(2028), 366);
  assert.equal(daysInYear(2100), 365, "a century that is not a leap year");
  assert.equal(daysInYear(2000), 366);
  const v = verdict({ today: day(2027, 11, 1), counts: { 2027: 365, 2028: 365 } });
  assert.equal(v.exit, 1, "365 days is short for 2028");
  assert.match(errs(v)[0], /only 365 of 366 days/);
});

test("the nag month is adjustable without touching the wording", () => {
  const v = verdict({ today: day(2026, 9, 1), counts: { 2026: 365, 2027: 0 }, nagFrom: 9 });
  assert.equal(v.exit, 1);
  assert.match(errs(v)[0], /past 1 September/);
});

test("it reads the project and key out of the app's own client", () => {
  const cfg = clientConfig();
  assert.match(cfg.url, /^https:\/\/[a-z]+\.supabase\.co$/);
  assert.match(cfg.key, /^sb_publishable_/, "only ever the publishable key");
  assert.doesNotMatch(cfg.key, /service_role|secret/);
});

test("a client file without the constants is an error, not a silent empty call", () => {
  assert.throws(() => clientConfig("const something = 1;"), /src\/supabase\.js/);
});
