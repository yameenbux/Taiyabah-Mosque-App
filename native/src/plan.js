/**
 * Taiyabah Masjid — what the three notification switches ask for.
 * Copyright (c) 2026 Yameen Bux. All rights reserved. See LICENSE.md.
 *
 * Turning {jamaah, mins, kahf, ramadan} into the shape arm() takes was written out by
 * hand at each call site, and there are three of them now — the first-run
 * card, the settings screen, and the keeper that re-arms the week on launch.
 * One mapping in three places is the standing invitation to change two of
 * them.
 *
 * IT LIVES HERE RATHER THAN IN reminders.js so that plain Node can import it.
 * reminders.js reaches for expo-notifications on its first line, which the
 * test runner cannot load; this file imports nothing but the prayer order, so
 * the mapping is tested as the app's own code rather than as a copy of it.
 */
import { ORDER } from "./prayer";

export function plan(alerts) {
  const per = {};
  /* `mins` may legitimately be 0 — a reminder at the moment the jamāʿah
     stands. arm() filters on undefined, null and false, so a zero survives. */
  if (alerts?.jamaah) for (const k of ORDER) per[k] = alerts.mins;
  return { per, extras: { kahf: !!alerts?.kahf, ramadan: !!alerts?.ramadan } };
}
