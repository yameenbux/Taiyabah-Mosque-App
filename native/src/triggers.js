/**
 * Taiyabah Masjid — when a local notification is to be delivered.
 * Copyright (c) 2026 Yameen Bux. All rights reserved. See LICENSE.md.
 *
 * WHY THIS IS ITS OWN FILE, AND WHY IT IS PURE.
 *
 * expo-notifications takes a `trigger` and runs it through parseTrigger().
 * Every shape it understands is matched on a `type` field — "date", "weekly",
 * "daily" and the rest — and anything it does not recognise falls off the end
 * of that function into:
 *
 *     Platform.select({ default: null, android: { type: 'channel', … } })
 *
 * A null trigger does not mean "never". It means DELIVER IT NOW. So a trigger
 * object with no `type` is not rejected, not warned about, and not ignored —
 * it is a notification that arrives the instant it is scheduled.
 *
 * This app asked for `{ date: when }`, which is what the old API took and what
 * every example written before SDK 50 still shows. Arming a week of reminders
 * schedules five prayers a day for seven days plus the Friday Kahf reminder:
 * up to thirty-six notifications, every one of them delivered at once, every
 * time the reminders were armed — which is on granting permission, on pressing
 * Save, and on every flick of a switch. That is the burst people were getting,
 * and it also meant NOT ONE REAL REMINDER WAS EVER SCHEDULED: they had all
 * been spent on the spot.
 *
 * So the trigger is built here, by a function, in a file with no imports —
 * which means a plain Node test can check what comes out of it, and does. The
 * one thing that must never happen again is an object reaching
 * scheduleNotificationAsync without a `type`.
 */

/* Copied from expo-notifications' SchedulableTriggerInputTypes rather than
 * imported, because importing it would drag expo-modules-core in and this file
 * would stop being testable in Node. scripts/test/triggers.test.mjs reads the
 * installed package and fails if these strings ever stop matching it. */
export const DATE = "date";
export const WEEKLY = "weekly";

/* One notification, at one moment. `channelId` is Android's and is left off
 * everywhere else: iOS has no notion of a channel and parseTrigger copies the
 * key straight through. */
export function at(when, channelId) {
  const t = { type: DATE, date: when };
  if (channelId) t.channelId = channelId;
  return t;
}

/* The same time every week. expo-notifications counts weekdays from Sunday,
 * so Friday is 6 — the off-by-one that would put the Sūrah al-Kahf reminder on
 * Thursday is worth naming where the number is written. */
export function weekly({ weekday, hour, minute, channelId }) {
  const t = { type: WEEKLY, weekday, hour, minute };
  if (channelId) t.channelId = channelId;
  return t;
}

export const FRIDAY = 6;
