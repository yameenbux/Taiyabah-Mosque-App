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
