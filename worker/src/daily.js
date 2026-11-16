/**
 * Taiyabah Masjid — daily giving, billed monthly.
 * Copyright (c) 2026 Yameen Bux. All rights reserved. See LICENSE.md.
 *
 * "£1 a day" is the ask. ONE CHARGE A MONTH is how it is taken, and the gap
 * between those two sentences is the whole point of this file.
 *
 * WHY NOT A DAILY CHARGE. Stripe takes roughly 1.5% + 20p from a UK card.
 * The percentage is nothing; the 20p is everything, because it is charged per
 * transaction and does not care how small the transaction is:
 *
 *            billed daily                    billed monthly
 *   £1/day   365 charges, ~£78 in fees       12 charges, ~£8 in fees
 *   £2/day   365 charges, ~£84 in fees       12 charges, ~£10 in fees
 *   £3/day   365 charges, ~£91 in fees       12 charges, ~£13 in fees
 *
 * On £1 a day that is SEVENTY POUNDS A YEAR, PER DONOR, decided by nothing
 * but the billing interval. A hundred donors on daily billing would hand
 * Stripe about £7,000 a year for no benefit to anybody.
 *
 * The donor is not short-changed and is not misled: they are told both
 * numbers on the button — "£1 a day · billed £30 a month" — they pay the same
 * money, and their statement carries one line a month instead of thirty.
 *
 * It also avoids a second, quieter problem. A daily subscription is 365
 * chances a year for a card to be declined, expire or be blocked by a bank
 * that does not like identical small charges. Twelve attempts churn far less
 * than three hundred and sixty-five.
 *
 * SO: DO NOT "FIX" THIS TO interval: "day". It will look like a bug — the
 * product says daily and the code says month — and changing it would quietly
 * cost the masjid more than any other line in this repository. The test file
 * asserts the interval for that reason.
 *
 * THIRTY, NOT 30.44. A month is not thirty days and a year is not 360, so
 * £30 a month is £360 a year where £1 every day would be £365. The shortfall
 * is deliberate: a round thirty is what a donor can check in their head, and
 * erring under the stated rate is the honest direction to err. Nobody is ever
 * charged more than the daily figure implies.
 */

/** Re-exported rather than redeclared: one list, so the two routes cannot drift. */
export { FUNDS } from "./friday.js";
import { FUNDS } from "./friday.js";

/** How many days of giving one monthly charge stands for. See the header. */
export const DAYS_PER_MONTH = 30;

/**
 * The tiers the screens offer, as pence per day. A caller does not get to
 * invent one: the amount a donor is charged is never taken from the client.
 */
export const PER_DAY = ["1", "2", "3"];

/** £1 a day -> 3000 pence a month. Exported so the screens can show both. */
export function monthlyPence(perDay) {
  return Number(perDay) * 100 * DAYS_PER_MONTH;
}

/**
 * Pure: the form body for Stripe's Checkout Session, or an error to return.
 *
 * NO billing_cycle_anchor here, unlike Friday Pay. That one exists because a
 * Jumuʿah gift has to land on a Friday; daily giving has no such day, so the
 * first month starts the moment the donor signs up and renews on the same
 * date after. Adding an anchor would delay the first charge for no reason and
 * drag proration back in with it.
 */
export function dailyCheckoutForm({ perDay, fund, product, returnUrl }) {
  /* typeof before String(): String(["1"]) is "1", so a bare coercion lets an
     array past the tier check. It happens to arrive at the right amount here,
     but a guard on the masjid's money should refuse what it does not
     recognise rather than quietly flatten it into something it does. */
  const per = typeof perDay === "string" || typeof perDay === "number"
    ? String(perDay).trim()
    : "";
  if (!PER_DAY.includes(per))
    return { error: "That is not one of the amounts offered.", status: 400 };

  const site = returnUrl || "https://taiyabahapp.ysbdesigns.uk/";
  const form = {
    mode: "subscription",
    client_reference_id: FUNDS.includes(String(fund || "")) ? String(fund) : "general",
    /* ?gave= marks how the donor came back. NOTHING READS IT: a thank-you
       panel was built on it and taken out again, because it cluttered the
       home page. The marker stays because Friday Pay has always set one and
       the two routes should not differ for no reason — but do not assume
       anything acts on it. */
    success_url: site + "?gave=daily",
    cancel_url: site + "?gave=cancelled",
    "line_items[0][quantity]": "1",
    "line_items[0][price_data][currency]": "gbp",
    "line_items[0][price_data][unit_amount]": String(monthlyPence(per)),
    "line_items[0][price_data][recurring][interval]": "month",
  };
  /* The receipt should say what the donor agreed to, in their words. A
     product named only "donation" leaves somebody staring at £30 on a
     statement with no way to connect it to the pound a day they chose. */
  if (product) form["line_items[0][price_data][product]"] = product;
  else form["line_items[0][price_data][product_data][name]"] =
    `Taiyabah Masjid — daily giving (£${per} a day)`;
  return { form };
}
