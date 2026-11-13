/* What time a nikāḥ is asked for.
 * Copyright (c) 2026 Yameen Bux. All rights reserved. See LICENSE.md.
 *
 * WHY THIS IS NOT A PRAYER ANY MORE. The form offers two dates — a first
 * choice and an alternative — and the clock time of a jamāʿah is different on
 * each of them. The screen only ever had one date to work from, so it printed
 * the FIRST date's times under every option and those times were wrong the
 * moment the family cared about the second. "After Zuhr" is true on any date;
 * "12:45pm" is true on one. The masjid chose to ask for the clock time
 * directly rather than keep a label that has to be recomputed per date.
 *
 * Its own module, with no imports, because it is arithmetic the form control,
 * the validator and the payload all have to agree on, and because the same
 * window is enforced again in Postgres (db/161). Two places that must agree
 * is one place that must be tested.
 *
 * Minutes since midnight is the only representation used for sums. "HH:MM" is
 * what crosses the wire, because that is what nikah_requests.preferred_time
 * has always held and widening it to a time type would rewrite history for no
 * gain.
 */

/* THE WINDOW IS A GUESS AND THE MASJID SHOULD CORRECT IT. 8am is before Fajr
 * jamāʿah never runs this late and after the earliest anyone would come; 10pm
 * is after the latest Isha jamāʿah in midsummer, which is the real reason the
 * top is not 9pm. Nothing outside it is refused by the office — it is the
 * range the clicker will travel, so a family cannot ask for 3am by accident. */
export const MIN_MINUTES = 8 * 60;    // 08:00
export const MAX_MINUTES = 22 * 60;   // 22:00
export const STEP_MINUTES = 15;

/* 2pm. Early afternoon is the commonest nikāḥ slot and starting there means
 * most families press the clicker twice rather than twenty times. It is a
 * starting point, never a submitted value: the form will not send a time the
 * family has not seen. */
export const DEFAULT_MINUTES = 14 * 60;

const isNum = n => typeof n === "number" && Number.isFinite(n);

/** Hold a value inside the window, snapped to the step. */
export function clamp(mins) {
  if (!isNum(mins)) return DEFAULT_MINUTES;
  const snapped = Math.round(mins / STEP_MINUTES) * STEP_MINUTES;
  return Math.min(Math.max(snapped, MIN_MINUTES), MAX_MINUTES);
}

/** Move by whole minutes and stay inside the window. Ends stop, they do not
 *  wrap: a clicker that jumps from 10pm back to 8am looks broken. */
export function step(mins, delta) {
  return clamp((isNum(mins) ? mins : DEFAULT_MINUTES) + (isNum(delta) ? delta : 0));
}

/** True when a further press would change anything — so the control can grey
 *  out rather than pretend. */
export function canStep(mins, delta) {
  const now = clamp(mins);
  return step(now, delta) !== now;
}

/** "14:30" → 870. Anything else → null, so a bad value fails a check rather
 *  than silently becoming midnight. */
export function parseHM(s) {
  const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(String(s ?? "").trim());
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

/** 870 → "14:30". What goes to Postgres. */
export function formatHM(mins) {
  const v = clamp(mins);
  const h = Math.floor(v / 60), mi = v % 60;
  return String(h).padStart(2, "0") + ":" + String(mi).padStart(2, "0");
}

/** 870 → "2:30pm". What a person reads. Lower-case am/pm to match the prayer
 *  table and the rest of the app, which never shouts A.M. at anybody. */
export function pretty(mins) {
  const v = clamp(mins);
  const h24 = Math.floor(v / 60), mi = v % 60;
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return h12 + ":" + String(mi).padStart(2, "0") + (h24 < 12 ? "am" : "pm");
}

/** Does this "HH:MM" sit in the window, on the step? The form asks before
 *  sending and db/161 asks again on arrival. */
export function isAllowed(hhmm) {
  const v = parseHM(hhmm);
  return v !== null && v >= MIN_MINUTES && v <= MAX_MINUTES && v % STEP_MINUTES === 0;
}
