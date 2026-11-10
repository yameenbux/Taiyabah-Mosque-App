/**
 * Taiyabah Masjid — a Jumuʿah donation has to land on a Friday.
 *
 * A real donor set up "Friday Pay" on Sunday 8 November 2026 and was charged
 * that Sunday, because the Payment Link behind it bills every seven days from
 * checkout. These assertions are the rule that was missing: whatever day
 * somebody signs up, the first charge is a Friday and it has not already gone.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { nextFridayAnchor, describeAnchor, ANCHOR_HOUR_UTC } from "../src/friday.js";

const FRIDAY = 5;
const at = iso => new Date(iso);
const dayOf = secs => new Date(secs * 1000).getUTCDay();

test("whatever day it is, the anchor is a Friday", () => {
  /* A whole week, hour by hour — 168 starts, every one must land on a Friday. */
  for (let h = 0; h < 168; h++) {
    const now = new Date(Date.UTC(2026, 10, 8, h, 30, 0));   /* from Sun 8 Nov 2026 */
    assert.equal(dayOf(nextFridayAnchor(now)), FRIDAY,
      `${now.toISOString()} did not anchor to a Friday`);
  }
});

test("and it is always in the future, which Stripe requires", () => {
  for (let h = 0; h < 168; h++) {
    const now = new Date(Date.UTC(2026, 10, 8, h, 30, 0));
    assert.ok(nextFridayAnchor(now) * 1000 > now.getTime(),
      `${now.toISOString()} anchored to the past`);
  }
});

test("the Sunday that caused this bills on the Friday, not that Sunday", () => {
  /* Sunday 8 November 2026, the real signup. */
  const now = at("2026-11-08T17:44:00Z");
  const a = new Date(nextFridayAnchor(now) * 1000);
  assert.equal(a.getUTCDay(), FRIDAY);
  assert.equal(a.toISOString().slice(0, 10), "2026-11-13");
  assert.equal(describeAnchor(nextFridayAnchor(now), now).days, 5);
});

test("Friday morning means this Jumuʿah, not next week", () => {
  const now = at("2026-11-13T06:00:00Z");           /* Friday, before the anchor hour */
  const a = new Date(nextFridayAnchor(now) * 1000);
  assert.equal(a.toISOString().slice(0, 10), "2026-11-13");
  assert.equal(a.getUTCHours(), ANCHOR_HOUR_UTC);
  assert.equal(describeAnchor(nextFridayAnchor(now), now).days, 0);
});

test("Friday afternoon has missed it and waits a week", () => {
  const now = at("2026-11-13T12:00:00Z");           /* Friday, after the anchor hour */
  const a = new Date(nextFridayAnchor(now) * 1000);
  assert.equal(a.toISOString().slice(0, 10), "2026-11-20");
  assert.equal(describeAnchor(nextFridayAnchor(now), now).days, 7);
});

test("Thursday waits a day, Saturday waits six", () => {
  assert.equal(describeAnchor(nextFridayAnchor(at("2026-11-12T20:00:00Z")), at("2026-11-12T20:00:00Z")).days, 1);
  assert.equal(describeAnchor(nextFridayAnchor(at("2026-11-14T09:00:00Z")), at("2026-11-14T09:00:00Z")).days, 6);
});

test("the anchor hour is Friday morning in Bolton in both halves of the year", () => {
  /* British Summer Time is UTC+1, so 09:00 UTC is 10:00 local; in winter it is
     09:00 local. Either way it is Friday morning and before Jumuʿah — which a
     midnight anchor would not be for a donor whose clock runs behind. */
  for (const iso of ["2026-06-30T00:00:00Z", "2026-12-01T00:00:00Z"]) {
    const a = new Date(nextFridayAnchor(at(iso)) * 1000);
    const local = a.toLocaleString("en-GB", { timeZone: "Europe/London", weekday: "long", hour: "2-digit", hour12: false });
    assert.match(local, /^Friday/, `${iso} -> ${local}`);
    const hour = Number(a.toLocaleString("en-GB", { timeZone: "Europe/London", hour: "2-digit", hour12: false }));
    assert.ok(hour >= 9 && hour <= 11, `${iso} landed at ${hour} local`);
  }
});

test("a year of Fridays, so no month boundary or leap day slips through", () => {
  const start = Date.UTC(2026, 0, 1);
  for (let d = 0; d < 400; d++) {
    const now = new Date(start + d * 86400000 + 13 * 3600000);
    const secs = nextFridayAnchor(now);
    assert.equal(dayOf(secs), FRIDAY, now.toISOString());
    assert.ok(secs * 1000 > now.getTime(), now.toISOString());
    /* Never further away than a week and a bit — a bug that skipped a Friday
       would show up as a gap, not as a wrong weekday. */
    assert.ok(secs * 1000 - now.getTime() <= 8 * 86400000, now.toISOString());
  }
});

test("a date it cannot read throws rather than inventing a Friday", () => {
  assert.throws(() => nextFridayAnchor(new Date("not a date")), /not a date/);
});

/* --- the Stripe call itself ----------------------------------------------
 * Two parameters carry the whole fix, and both look optional in a diff. */

import { fridayCheckoutForm, AMOUNTS } from "../src/friday.js";

const built = (over = {}) =>
  fridayCheckoutForm({ amount: "10", fund: "general",
                       anchor: nextFridayAnchor(at("2026-11-08T17:44:00Z")), ...over });

test("the charge is anchored to the Friday, not to today", () => {
  const f = built().form;
  const anchored = Number(f["subscription_data[billing_cycle_anchor]"]);
  assert.equal(new Date(anchored * 1000).getUTCDay(), FRIDAY);
  assert.equal(f.mode, "subscription");
  assert.equal(f["line_items[0][price_data][recurring][interval]"], "week");
});

test("proration is OFF, or Stripe takes money today anyway", () => {
  /* The donor's complaint was a payment on the wrong day. A prorated part
     payment on the wrong day is the same complaint, harder to explain. */
  assert.equal(built().form["subscription_data[proration_behavior]"], "none");
});

test("the amount is in pence and only an offered one is accepted", () => {
  assert.equal(built({ amount: "25" }).form["line_items[0][price_data][unit_amount]"], "2500");
  for (const bad of ["7", "0", "-5", "1000000", "", null, undefined, "10.50", "ten"])
    assert.ok(built({ amount: bad }).error, `${bad} should be refused`);
  for (const good of AMOUNTS) assert.ok(built({ amount: good }).form, good);
});

test("an unknown fund falls back to the general fund rather than being passed on", () => {
  assert.equal(built({ fund: "../../etc" }).form.client_reference_id, "general");
  assert.equal(built({ fund: "lillah" }).form.client_reference_id, "lillah");
});

test("without a product id the donations still share one name", () => {
  assert.match(built().form["line_items[0][price_data][product_data][name]"], /Jumu/);
  const withProduct = built({ product: "prod_abc123" }).form;
  assert.equal(withProduct["line_items[0][price_data][product]"], "prod_abc123");
  assert.equal(withProduct["line_items[0][price_data][product_data][name]"], undefined);
});
