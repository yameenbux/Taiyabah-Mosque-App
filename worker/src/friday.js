/**
 * Taiyabah Masjid — which Friday a Jumuʿah donation should land on.
 *
 * WHY THIS EXISTS. "Friday Pay" sent the donor to a static Stripe Payment
 * Link. A Payment Link charges at checkout and then every seven days from that
 * moment, so somebody who set it up on a Sunday was charged that Sunday and
 * every Sunday after — while the button they pressed said "Donate £10 every
 * Friday". That happened to a real donor on 8 November 2026.
 *
 * A static link cannot fix it. The delay to the next Friday is one day on a
 * Thursday and seven on a Saturday, and `trial_period_days` is a fixed integer
 * baked into the link. You would need a different link for each day of the
 * week.
 *
 * Stripe does support this properly. A subscription's `billing_cycle_anchor`
 * is documented as setting "the day of week for `week` intervals" — so a
 * weekly subscription anchored to any Friday bills every Friday, for good.
 * That parameter needs a Checkout Session created server-side, which is what
 * this Worker route is for.
 *
 * TWO RULES STRIPE IMPOSES, both of which this function has to respect:
 *
 *   1. The anchor must be strictly in the FUTURE. An anchor of "today" that
 *      has already passed is rejected.
 *   2. With a future anchor, Stripe PRORATES by default — it charges a part
 *      amount now for the days before the anchor. That is the original
 *      complaint wearing a smaller number, so the caller must also send
 *      proration_behavior: "none". This module cannot enforce that; the route
 *      does, and a test holds it there.
 */

/* 09:00 UTC on the Friday. Nine in the morning GMT, ten under British Summer
 * Time — both comfortably Friday morning in Bolton, and both before Jumuʿah.
 * A midnight anchor would sit within an hour of Thursday for a donor whose
 * phone is an hour behind, and a donation "for Jumuʿah" that reads as Thursday
 * is the sort of thing somebody writes in about. */
export const ANCHOR_HOUR_UTC = 9;
const FRIDAY = 5;                 /* Date.getUTCDay(): Sunday is 0 */

/**
 * Pure: the Unix timestamp, in SECONDS, of the Friday this subscription should
 * first be charged on. Always strictly after `now`, and always a Friday.
 *
 * On a Friday before the anchor hour it is today — somebody setting up a
 * Jumuʿah donation on Friday morning means this Jumuʿah, not next week's.
 * After it, the day has gone and it is the following Friday.
 *
 * @param {Date|number} now
 * @returns {number} seconds since the epoch
 */
export function nextFridayAnchor(now = new Date()) {
  const t = now instanceof Date ? now : new Date(now);
  if (Number.isNaN(t.getTime())) throw new TypeError("nextFridayAnchor: not a date");

  const anchor = new Date(Date.UTC(
    t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate(), ANCHOR_HOUR_UTC, 0, 0, 0,
  ));

  /* Days forward to land on a Friday. 0 when today already is one. */
  let ahead = (FRIDAY - anchor.getUTCDay() + 7) % 7;
  anchor.setUTCDate(anchor.getUTCDate() + ahead);

  /* Today's Friday may already be behind us — Friday afternoon, or any later
     day whose `ahead` landed us back on this week. Stripe rejects an anchor
     that is not in the future, so step a week. */
  if (anchor.getTime() <= t.getTime()) anchor.setUTCDate(anchor.getUTCDate() + 7);

  return Math.floor(anchor.getTime() / 1000);
}

/**
 * Pure: how the wait should be described to the donor before they pay.
 *
 * The button used to promise "every Friday" over a mechanism that did nothing
 * of the kind. Whatever it says now has to be checkable against what this
 * module actually returns, so the words are produced here rather than written
 * out separately on each of the two platforms and left to drift.
 *
 * @param {number} anchorSeconds  from nextFridayAnchor()
 * @param {Date|number} now
 */
export function describeAnchor(anchorSeconds, now = new Date()) {
  const t = now instanceof Date ? now : new Date(now);
  const a = new Date(anchorSeconds * 1000);
  const days = Math.round((Date.UTC(a.getUTCFullYear(), a.getUTCMonth(), a.getUTCDate())
                         - Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate()))
                         / 86400000);
  const date = a.toLocaleDateString("en-GB", {
    weekday: "long", day: "numeric", month: "long", timeZone: "UTC",
  });
  return {
    days,
    date,
    /* "today" only ever means a Friday morning before the anchor hour. */
    phrase: days === 0 ? "this Friday" : days === 7 ? "next Friday" : `Friday ${date.replace("Friday ", "")}`,
  };
}

/** The amounts the screens offer. A caller does not get to invent one. */
export const AMOUNTS = ["5", "10", "25", "50", "100"];
export const FUNDS = ["general", "sadaqah", "lillah"];

/**
 * Pure: the form body for Stripe's Checkout Session, or an error to return.
 *
 * Kept out of the route and exported so the two parameters that carry the
 * whole fix can be asserted directly:
 *
 *   subscription_data[billing_cycle_anchor]  puts the charge on a Friday
 *   subscription_data[proration_behavior]    stops Stripe taking a part
 *                                            payment TODAY for the days in
 *                                            between, which is the original
 *                                            complaint at a smaller number
 *
 * Dropping either one looks harmless in a diff. test/friday.test.mjs is what
 * notices.
 */
export function fridayCheckoutForm({ amount, fund, anchor, product, returnUrl }) {
  const amt = String(amount ?? "").trim();
  if (!AMOUNTS.includes(amt)) return { error: "That is not one of the amounts offered.", status: 400 };
  if (!Number.isInteger(anchor) || anchor <= 0) return { error: "No first Friday was worked out.", status: 500 };

  const site = returnUrl || "https://taiyabahapp.ysbdesigns.uk/";
  const form = {
    mode: "subscription",
    "subscription_data[billing_cycle_anchor]": String(anchor),
    "subscription_data[proration_behavior]": "none",
    client_reference_id: FUNDS.includes(String(fund || "")) ? String(fund) : "general",
    success_url: site + "?gave=friday",
    cancel_url: site + "?gave=cancelled",
    "line_items[0][quantity]": "1",
    "line_items[0][price_data][currency]": "gbp",
    "line_items[0][price_data][unit_amount]": String(Number(amt) * 100),
    "line_items[0][price_data][recurring][interval]": "week",
  };
  if (product) form["line_items[0][price_data][product]"] = product;
  else form["line_items[0][price_data][product_data][name]"] = "Taiyabah Masjid — Jumuʿah donation";
  return { form };
}
