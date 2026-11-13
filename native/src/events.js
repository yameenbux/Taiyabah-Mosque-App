/* What the masjid has on, and what the masjid has said.
 * Copyright (c) 2026 Yameen Bux. All rights reserved. See LICENSE.md.
 *
 * ONE TABLE, TWO SCREENS. `notices` carries both, and until now both screens
 * were the same screen: the bell in the top bar opened NoticesTab, which is
 * the Notices tab, so the app had two ways to reach one list and no way to
 * reach anything else. The split is `topic`, which the masjid already sets
 * and which the notification switches already name — jamaah, janazah,
 * announcements, events, kahf. Only 'events' is an event.
 *
 * Its own module, with no imports, because the Events screen, the
 * Notifications screen and the tests all have to agree about what an event
 * is, and because getting the day boundary wrong is the kind of bug that
 * shows up once a month at 11pm.
 *
 * DAYS ARE LOCAL, NOT UTC. event_at is a timestamptz; an event at 7pm on the
 * 30th in British Summer Time is 18:00Z, and asking UTC for the date still
 * gives the 30th — but one at 00:30 on the 1st is 23:30Z on the 31st, and a
 * calendar that puts it under the wrong month is worse than no calendar. So
 * every day key is built from the device's own local parts.
 */

export const EVENT_TOPIC = "events";

const isDate = d => d instanceof Date && !Number.isNaN(d.getTime());

/** The timestamp a post is filed under, or null if it has none. */
export function when(row) {
  const raw = row && row.event_at;
  if (!raw) return null;
  const d = raw instanceof Date ? raw : new Date(raw);
  return isDate(d) ? d : null;
}

/** "YYYY-MM-DD" in the reader's own timezone, or null for an undated post. */
export function dayKey(row) {
  const d = when(row);
  if (!d) return null;
  return d.getFullYear() + "-" +
         String(d.getMonth() + 1).padStart(2, "0") + "-" +
         String(d.getDate()).padStart(2, "0");
}

/** Is this post an event — the thing that belongs on the calendar? */
export function isEvent(row) {
  return !!row && row.topic === EVENT_TOPIC;
}

/** The two screens, from one list. Order is preserved within each. */
export function split(rows) {
  const all = Array.isArray(rows) ? rows : [];
  return {
    events: all.filter(isEvent),
    notifications: all.filter(r => r && !isEvent(r)),
  };
}

/* Upcoming first, soonest at the top, because that is the question somebody
 * opens this screen to answer. Everything already past goes below, most
 * recent first — notices_live has filtered out anything expired, so what
 * remains is recent enough to still be worth reading. Undated posters go
 * last: they are the pre-2026-11 backlog that db/162 grandfathered, and
 * they are shown rather than hidden because a poster nobody can find is the
 * same as a poster that was never put up.
 *
 * `now` is a parameter so the tests do not depend on the day they run. */
export function order(rows, now = new Date()) {
  const events = (Array.isArray(rows) ? rows : []).filter(isEvent);
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const dated = events.filter(r => when(r));
  const undated = events.filter(r => !when(r));
  const ts = r => when(r).getTime();
  const dayOf = r => {
    const d = when(r);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  };
  return {
    upcoming: dated.filter(r => dayOf(r) >= start).sort((a, b) => ts(a) - ts(b)),
    past:     dated.filter(r => dayOf(r) <  start).sort((a, b) => ts(b) - ts(a)),
    undated,
  };
}

/** One entry per day that has something on, in the order given.
 *  [{ key: "2026-12-05", at: Date|null, items: [...] }] */
export function groupByDay(rows) {
  const out = [];
  const seen = new Map();
  for (const r of (Array.isArray(rows) ? rows : [])) {
    const key = dayKey(r) || "undated";
    let g = seen.get(key);
    if (!g) { g = { key, at: when(r), items: [] }; seen.set(key, g); out.push(g); }
    g.items.push(r);
  }
  return out;
}

/** Which day numbers in this month carry an event, so the grid can dot them.
 *  A Set of integers, 1..31. */
export function daysWithEvents(rows, year, month) {
  const out = new Set();
  for (const r of (Array.isArray(rows) ? rows : [])) {
    if (!isEvent(r)) continue;
    const d = when(r);
    if (d && d.getFullYear() === year && d.getMonth() === month) out.add(d.getDate());
  }
  return out;
}

/** The month to open the calendar on: the soonest upcoming event's month, or
 *  this month when there is nothing ahead. Opening on a month with no dots at
 *  all makes the screen look broken. */
export function openingMonth(rows, now = new Date()) {
  const { upcoming } = order(rows, now);
  const d = upcoming.length ? when(upcoming[0]) : now;
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
