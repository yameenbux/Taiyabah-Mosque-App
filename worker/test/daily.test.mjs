/**
 * Taiyabah Masjid — "£1 a day" must never become a charge a day.
 *
 * The interval assertion here is the whole reason this file exists. A daily
 * subscription on £1 hands Stripe about £78 a year in the 20p-per-transaction
 * fee against about £8 billed monthly, so a well-meant change from "month" to
 * "day" — to make the code match the word on the button — would cost the
 * masjid roughly £70 a year for every donor on the tier. src/daily.js carries
 * the arithmetic; these tests make the mistake fail out loud.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { dailyCheckoutForm, monthlyPence, PER_DAY, DAYS_PER_MONTH } from "../src/daily.js";

const ok = (over = {}) => {
  const built = dailyCheckoutForm({ perDay: "1", ...over });
  assert.equal(built.error, undefined, built.error);
  return built.form;
};

test("the interval is a month, never a day", () => {
  for (const perDay of PER_DAY) {
    const form = ok({ perDay });
    assert.equal(form["line_items[0][price_data][recurring][interval]"], "month",
      `£${perDay} a day was set to bill per ${form["line_items[0][price_data][recurring][interval]"]}`);
  }
});

test("a month of giving is thirty days of the daily figure", () => {
  assert.equal(monthlyPence("1"), 3000);
  assert.equal(monthlyPence("2"), 6000);
  assert.equal(monthlyPence("3"), 9000);
  assert.equal(DAYS_PER_MONTH, 30);
  for (const perDay of PER_DAY)
    assert.equal(ok({ perDay })["line_items[0][price_data][unit_amount]"], String(Number(perDay) * 100 * 30));
});

test("nobody is charged more than the daily figure implies", () => {
  /* Thirty days a month is 360 days a year, not 365. Erring under the stated
     rate is deliberate; erring over it would be taking money unasked. */
  for (const perDay of PER_DAY)
    assert.ok(monthlyPence(perDay) * 12 <= Number(perDay) * 100 * 365,
      `£${perDay} a day bills more over a year than a pound a day comes to`);
});

test("the amount is never taken from the caller", () => {
  for (const bad of ["4", "0", "-1", "1.5", "100", "", " ", null, undefined, {}, ["1"], "1; DROP"]) {
    const built = dailyCheckoutForm({ perDay: bad });
    assert.equal(built.status, 400, `${JSON.stringify(bad)} was accepted as a tier`);
    assert.equal(built.form, undefined);
  }
});

test("surrounding whitespace is forgiven, not the number", () => {
  assert.equal(dailyCheckoutForm({ perDay: " 2 " }).error, undefined);
  assert.equal(dailyCheckoutForm({ perDay: " 2 0 " }).status, 400);
});

test("an unknown fund falls back to general rather than travelling through", () => {
  assert.equal(ok({ fund: "sadaqah" }).client_reference_id, "sadaqah");
  assert.equal(ok({ fund: "lillah" }).client_reference_id, "lillah");
  assert.equal(ok({ fund: "newbuild" }).client_reference_id, "general");
  assert.equal(ok({ fund: "" }).client_reference_id, "general");
  assert.equal(ok({}).client_reference_id, "general");
});

test("there is no billing anchor and so no proration to explain", () => {
  const form = ok();
  assert.equal(form["subscription_data[billing_cycle_anchor]"], undefined);
  assert.equal(form["subscription_data[proration_behavior]"], undefined);
});

test("the site is told how the donor came back", () => {
  const form = ok({ returnUrl: "https://example.test/" });
  assert.equal(form.success_url, "https://example.test/?gave=daily");
  assert.equal(form.cancel_url, "https://example.test/?gave=cancelled");
  /* No return URL configured still has to go somewhere real. */
  assert.match(ok().success_url, /^https:\/\/\S+\?gave=daily$/);
});

test("the receipt says which tier the donor chose", () => {
  assert.match(ok({ perDay: "2" })["line_items[0][price_data][product_data][name]"], /£2 a day/);
  /* With a configured product the name comes from Stripe, not from us. */
  const form = ok({ product: "prod_abc" });
  assert.equal(form["line_items[0][price_data][product]"], "prod_abc");
  assert.equal(form["line_items[0][price_data][product_data][name]"], undefined);
});

test("it is a subscription in pounds", () => {
  const form = ok();
  assert.equal(form.mode, "subscription");
  assert.equal(form["line_items[0][price_data][currency]"], "gbp");
  assert.equal(form["line_items[0][quantity]"], "1");
});
