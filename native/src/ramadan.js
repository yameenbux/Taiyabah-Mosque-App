/**
 * Where we are in Ramadan — behind, tonight, and still to come.
 * Copyright (c) 2026 Yameen Bux. All rights reserved. See LICENSE.md.
 *
 * WHAT THIS IS FOR. The Ramadan screen shows one night pinned at the top with
 * everything still ahead beneath it, and folds the nights already kept into a
 * single row. Deciding WHICH night that is turns out to be the whole problem,
 * so it lives here, on its own, where it can be tested — rather than inside a
 * screen where it cannot.
 *
 * THE ROLLOVER IS AT FAJR, NOT MIDNIGHT, and this is the reason the module
 * exists. Taraweeh for the twenty-fourth night is prayed on the EVENING of
 * the day the timetable calls 24 Ramadan, and it carries on past midnight for
 * anyone sitting with the Qur'an afterwards. Roll the screen over at midnight
 * and the night folds itself away while people are still in the masjid
 * praying it. So a moment before Fajr still belongs to the night before, and
 * the day the screen is "on" is the day whose fast is about to begin.
 *
 * NOTHING IS IMPORTED ON PURPOSE. It takes `now` and the timetable's own days
 * as arguments, so the tests run the real code under plain Node and a wrong
 * answer is a failing test rather than something somebody notices in Ramadan.
 * The same reason qibla.js is written this way.
 *
 * THE LENGTH OF THE MONTH IS NOT ASSUMED. Ramadan is twenty-nine days or
 * thirty, and which one is the masjid's business, not this file's: the total
 * is counted out of the timetable the committee published. A thirty-day month
 * reads one juz a night and ends on juz 30; a twenty-nine-day month does not,
 * and that is the committee's arrangement to make rather than ours to paper
 * over.
 */

/* The timetable writes "7 Ramadan 1447 AH", but Ramadhan and Ramaḍān both
   turn up in real calendars, so all three are matched.

   The letters are written out rather than stripped of their marks with an
   NFD normalise: a ̀-ͯ range in the source reads, to
   check-glyphs.mjs, as a combining mark the app draws and no bundled font
   has — a false failure on a character that is never drawn at all. This also
   matches how Home.jsx already finds the first of the month. */
const RAMADAN = /^rama[dḍ]h?[aā]n$/i;

export function isRamadanMonth(name) {
  return RAMADAN.test(String(name || "").trim());
}

/* { day, month, year } out of a timetable record's hijri line, or null. */
export function hijriOf(rec) {
  const m = String((rec && rec.hijri) || "").match(/^(\d+)\s+(.+?)\s+(\d+)/);
  if (!m) return null;
  return { day: parseInt(m[1], 10), month: m[2].trim(), year: parseInt(m[3], 10) };
}

const pad = n => String(n).padStart(2, "0");
const isoOf = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/* THE DAY THE SCREEN IS ON. Before Fajr, that is still yesterday — see the
   rollover note above. A day the timetable does not carry, or one with no Fajr
   in it, is left alone rather than guessed at. */
export function activeDate(now, days) {
  const today = isoOf(now);
  const fajr = days && days[today] && days[today].begins && days[today].begins.fajr;
  if (!fajr) return today;
  const [h, mi] = String(fajr).split(":").map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(mi)) return today;
  if (now.getHours() * 60 + now.getMinutes() >= h * 60 + mi) return today;
  const y = new Date(now.getTime());
  y.setDate(y.getDate() - 1);
  return isoOf(y);
}

/* Every day of ONE Ramadan, in order. Filtered by the AH year as well as the
   month, because a timetable can hold two of them: the Islamic year is eleven
   days shorter, so a Gregorian year occasionally carries Ramadan twice. */
function monthDays(days, year) {
  return Object.keys(days || {})
    .filter(iso => {
      const h = hijriOf(days[iso]);
      return h && h.year === year && isRamadanMonth(h.month);
    })
    .sort();
}

/**
 * The whole picture for a moment in Ramadan, or null outside it.
 *
 *   night        which night is being prayed, 1-based
 *   total        how many days this Ramadan has, counted from the timetable
 *   juz          the juz for tonight, never above 30
 *   lastTen      is tonight one of the last ten
 *   odd          is tonight an odd night (only meaningful in the last ten)
 *   nightsToEid  how many nights are left after tonight
 *   past         the nights already kept, oldest first
 *   tonight      { night, iso, juz }
 *   ahead        the nights still to come
 */
export function ramadanState(now, days) {
  const iso = activeDate(now, days);
  const rec = days && days[iso];
  const h = hijriOf(rec);
  if (!h || !isRamadanMonth(h.month)) return null;

  const month = monthDays(days, h.year);
  const total = month.length;
  if (!total) return null;

  const night = h.day;
  const entry = n => ({ night: n, iso: month[n - 1] || null, juz: Math.min(n, 30) });

  return {
    night,
    total,
    juz: Math.min(night, 30),
    lastTen: night > total - 10,
    odd: night % 2 === 1,
    nightsToEid: total - night,
    past: Array.from({ length: night - 1 }, (_, i) => entry(i + 1)),
    tonight: entry(night),
    ahead: Array.from({ length: total - night }, (_, i) => entry(night + 1 + i)),
  };
}

/* ---- when the section opens, and when it closes again ------------------ */

/**
 * WHY IT OPENS BEFORE THE MONTH DOES.
 *
 * The obvious rule — open on the first night — is wrong, and for one reason:
 * i'tikaf. Places are limited and have to be booked, and a booking screen
 * that appears on the first night gives the committee no lead time and gives
 * the congregation no warning. The taraweeh leaders are settled about a month
 * beforehand, so by then there is a real schedule to read as well.
 *
 * Ten days is the window. It is long enough for i'tikaf to be booked and the
 * rota to be read before anybody is fasting, and short enough that the
 * countdown — which by then has been running for months — still gets to do
 * its job. Below thirty days the poster changes its own tune without opening
 * anything.
 *
 * IT STAYS OPEN ONE DAY PAST THE END, because Eid al-Fitr and the fitrana
 * deadline are on that screen and both matter on the morning after the last
 * night. Then it closes and the poster comes back, counting to next year.
 */
export const OPEN_DAYS_BEFORE = 10;
export const OPEN_DAYS_AFTER = 1;
export const NEAR_DAYS = 30;

const DAY = 86400000;
const asDate = iso => { const [Y, M, D] = iso.split("-").map(Number); return new Date(Y, M - 1, D); };
const daysBetween = (a, b) => Math.round((asDate(b) - asDate(a)) / DAY);

/* The first night of the next Ramadan the timetable carries, on or after the
   given day — or null, which is the state the app is in until the committee
   publishes the year Ramadan falls in. */
export function nextFirstNight(now, days) {
  const today = isoOf(now);
  let best = null;
  for (const iso of Object.keys(days || {})) {
    if (iso < today) continue;
    const h = hijriOf(days[iso]);
    if (!h || h.day !== 1 || !isRamadanMonth(h.month)) continue;
    if (!best || iso < best) best = iso;
  }
  return best;
}

/**
 * Whether the Ramadan section is open, and what the guard should say when it
 * is not.
 *
 *   { open: true,  state }                 inside the month (or its edges)
 *   { open: false, phase, daysUntil, iso } outside it
 *
 * `phase` is one of "awaiting" (no date published yet), "close" (within
 * thirty days) or "far". The design carries a fourth, "tonight", for the
 * moment the moon is sighted; nothing here produces it, because by then the
 * section has been open for ten days.
 */
export function ramadanAccess(now, days) {
  const state = ramadanState(now, days);
  if (state) return { open: true, state };

  /* Just past the end: Eid and the fitrana deadline are still wanted. */
  for (let back = 1; back <= OPEN_DAYS_AFTER; back++) {
    const then = new Date(now.getTime() - back * DAY);
    const was = ramadanState(then, days);
    if (was && was.night === was.total) return { open: true, state: was, trailing: true };
  }

  const iso = nextFirstNight(now, days);
  if (!iso) return { open: false, phase: "awaiting", daysUntil: null, iso: null };

  const daysUntil = daysBetween(isoOf(now), iso);
  if (daysUntil <= OPEN_DAYS_BEFORE) return { open: true, state: null, early: true, daysUntil, iso };
  return { open: false, phase: daysUntil <= NEAR_DAYS ? "close" : "far", daysUntil, iso };
}
