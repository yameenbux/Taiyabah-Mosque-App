/**
 * Taiyabah Masjid — when the Dynamic Island should be showing, and what.
 * Copyright (c) 2026 Yameen Bux. All rights reserved. See LICENSE.md.
 *
 * A Live Activity is started by the app and then runs on its own: the
 * countdown is a timer iOS ticks itself, so nothing has to be pushed to it,
 * ever. That is the whole reason this costs the masjid nothing — no APNs, no
 * OneSignal, no server. The price of it is that the app has to be open at the
 * moment the activity starts, which is why the only question this file
 * answers is: given the next jamāʿah and the time now, should one be running,
 * and between which two instants?
 *
 * IT LIVES HERE RATHER THAN WITH THE NATIVE CALL so that plain Node can
 * import it. The module that talks to ActivityKit reaches for a native
 * binding on its first line; this file imports nothing at all, so the rule
 * below is tested as the app's own code rather than as a copy of it. Same
 * reason plan.js is separate from reminders.js.
 */

/* How early the island is allowed to appear.
   
   This was 120, chosen to cover the widest adhān-to-iqāmah gap the masjid's
   timetable actually has — 113 minutes, Isha in December, when the prayer
   comes in early and the jamāʿah stays at eight o'clock. Covering it made the
   ring mean exactly "the wait between the adhān and the iqāmah", which was
   tidy. It also meant the island could sit on somebody's phone for two hours,
   and the test below put the worst case at 42% of a day.

   Nobody needs a two-hour countdown. The question a countdown answers is
   "have I still got time to get there?", and that question is live in the
   last half hour, not from mid-afternoon. So the window is an hour, and for
   almost every prayer in the year that IS the whole wait from the adhān —
   only the long winter Ishas get the last hour of theirs instead. */
export const LEAD_MINUTES = 60;

export const GRACE_MINUTES = 5;

const MIN = 60000;

/**
 * `next` is what prayer.js's nextJamaah() returns, plus the two instants it
 * refers to. Returns null when nothing should be on screen — which is most of
 * the day, and is the answer that keeps this off people's phones.
 */
export function activityPlan(next, { now = Date.now(), iqamahMs, adhanMs } = {}) {
  if (!next || !Number.isFinite(iqamahMs)) return null;

  /* Already been. Nothing to count down to. */
  if (iqamahMs <= now) return null;

  /* Too far out: an island occupied all afternoon is one people switch off. */
  if (iqamahMs - now > LEAD_MINUTES * MIN) return null;

  /* The ring fills across the wait — from the adhān, or from an hour out on
     the days when the adhān is further back than that. Never longer than the
     window the island itself is allowed, or it would appear already part
     spent. When the timetable has no begins time at all, the lead window
     stands in, so the ring still means something rather than being absent. */
  const ceiling = iqamahMs - LEAD_MINUTES * MIN;
  const from = Number.isFinite(adhanMs) && adhanMs < iqamahMs
    ? Math.max(adhanMs, ceiling)
    : ceiling;

  return {
    name: next.name,
    key: next.key,
    adhanMs: from,
    iqamahMs,
    /* iOS dismisses it itself at this instant, so nothing has to come back
       later and tidy up — which matters, because nothing would. */
    endMs: iqamahMs + GRACE_MINUTES * MIN,
  };
}

/**
 * Whether a plan that is already running still describes the right prayer.
 * Starting a second activity for the same jamāʿah every time somebody opens
 * the app would stack them up; iOS would show the newest and keep the rest.
 */
export function samePlan(a, b) {
  if (!a || !b) return false;
  return a.key === b.key && a.iqamahMs === b.iqamahMs;
}
