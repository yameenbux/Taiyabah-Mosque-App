/* The prayer engine, ported from the web app's own logic so the two cannot
 * disagree. One timetable, one set of rules.
 *
 * The timetable is the committee's published one, keyed by date. Maghrib's
 * jamāʿah is the same minute it begins — that is the masjid's practice, not a
 * rounding error, and the data says so explicitly in `notes`.
 */
import TT from "./data/timetable-2026.json";

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

export function dayFor(date = new Date()) {
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
export function nextJamaah(now = new Date()) {
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

export function countdown(minutes) {
  if (minutes < 60) return `in ${minutes} min`;
  const h = Math.floor(minutes / 60), m = minutes % 60;
  return m ? `in ${h}h ${String(m).padStart(2, "0")}m` : `in ${h}h`;
}
