/* The prayer engine, ported from the web app's own logic so the two cannot
 * disagree. One timetable, one set of rules.
 *
 * The timetable is the committee's published one, keyed by date. Maghrib's
 * jamāʿah is the same minute it begins — that is the masjid's practice, not a
 * rounding error, and the data says so explicitly in `notes`.
 */
import TT from "./data/timetable-2026.json";

/* EVERY TIME IN THIS APP IS LONDON'S, not the phone's.
 *
 * Ported from the web app, which learned it the hard way: a device in Dubai
 * showed Fajr "in 15 min" when it was three hours away, and one in New York
 * showed the previous day's timetable altogether. The published timetable is
 * London wall-clock with BST baked in, so the question "what time is it" has
 * to be asked of London.
 *
 * nowLondon() returns an instant whose ordinary local getters read as London's
 * wall clock, so everything downstream — the day key, the next jamāʿah, the
 * countdown — works unchanged. On a phone already set to London the shift is
 * exactly zero, so nothing changes for almost everyone. */
function londonParts(real) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London", hour12: false,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  }).formatToParts(real);
  const g = t => Number(parts.find(x => x.type === t).value);
  return { y: g("year"), mo: g("month"), d: g("day"),
           /* some engines hand back 24 at midnight */
           h: g("hour") % 24, mi: g("minute"), s: g("second") };
}

export function nowLondon() {
  try {
    const real = new Date();
    const p = londonParts(real);
    const asUTC = Date.UTC(p.y, p.mo - 1, p.d, p.h, p.mi, p.s);
    return new Date(asUTC + real.getTimezoneOffset() * 60000);
  } catch { return new Date(); }   // no Intl timezone data: fall back rather than break
}

/* The real instant at which a London wall-clock time on a London calendar day
 * occurs — which is what an alarm has to be set for. Only the reminders need
 * this; everything on screen works in London's own terms. */
export function londonInstant(date, hhmm) {
  const [h, mi] = hhmm.split(":").map(Number);
  const guess = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), h, mi, 0);
  try {
    const p = londonParts(new Date(guess));
    const offset = Date.UTC(p.y, p.mo - 1, p.d, p.h, p.mi, p.s) - guess;
    return new Date(guess - offset);
  } catch { const x = new Date(date); x.setHours(h, mi, 0, 0); return x; }
}

export const NAMES = {
  fajr:    { en: "Fajr",    ar: "الفجر" },
  sunrise: { en: "Sunrise", ar: "الشروق" },
  zuhr:    { en: "Zuhr",    ar: "الظهر" },
  asr:     { en: "Asr",     ar: "العصر" },
  maghrib: { en: "Maghrib", ar: "المغرب" },
  isha:    { en: "Isha",    ar: "العشاء" },
};
export const ORDER = ["fajr", "zuhr", "asr", "maghrib", "isha"];

const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export function dayFor(date = nowLondon()) {
  return TT.days[iso(date)] || null;
}

const mins = hhmm => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

/* 24h to the way people actually say it. */
export function pretty(hhmm) {
  let [h, m] = hhmm.split(":").map(Number);
  const suffix = h >= 12 ? "pm" : "am";
  h = h % 12 || 12;
  return `${h}:${String(m).padStart(2, "0")} ${suffix}`;
}

/* Which jamāʿah is next, and how long until it.
 * After the last one of the day it rolls to tomorrow's Fajr, because "next"
 * has to mean something at 11pm too. */
export function nextJamaah(now = nowLondon()) {
  const today = dayFor(now);
  if (!today) return null;
  const nowM = now.getHours() * 60 + now.getMinutes();

  for (const key of ORDER) {
    const at = today.jamaat[key];
    if (at && mins(at) > nowM) {
      return { key, at, minutesAway: mins(at) - nowM, begins: today.begins[key], tomorrow: false };
    }
  }
  const t = new Date(now); t.setDate(t.getDate() + 1);
  const tom = dayFor(t);
  if (!tom) return null;
  return {
    key: "fajr", at: tom.jamaat.fajr, begins: tom.begins.fajr, tomorrow: true,
    minutesAway: 24 * 60 - nowM + mins(tom.jamaat.fajr),
  };
}

/* The countdown lives in dates.js now: it is the one string on the home screen
 * that is built from a number, and it has to be sayable in four languages. */
