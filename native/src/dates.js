/* Dates and countdowns in the reader's own language.
 *
 * toLocaleDateString() would give an Urdu speaker a Gregorian date in English
 * unless the device locale happens to match, and the packs have had proper day
 * and month names all along — so they are used rather than the browser's.
 */
export function longDate(t, d) {
  return `${t(`date.fulldow.${d.getDay()}`, DOW[d.getDay()])} ${d.getDate()} ` +
         `${t(`date.fullmon.${d.getMonth()}`, MON[d.getMonth()])} ${d.getFullYear()}`;
}
export function shortDate(t, d) {
  return `${t(`date.dow.${d.getDay()}`, DOW[d.getDay()].slice(0, 3))} ${d.getDate()} ` +
         `${t(`date.mon.${d.getMonth()}`, MON[d.getMonth()].slice(0, 3))}`;
}
export function monthYear(t, d) {
  return `${t(`date.fullmon.${d.getMonth()}`, MON[d.getMonth()])} ${d.getFullYear()}`;
}

/* "in 8h 35m". Built from parts rather than one sentence, so a pack only has
 * to carry the two unit words. */
export function countdown(t, minutes) {
  if (minutes < 60) return `${t("time.in", "in")} ${minutes} ${t("time.min", "min")}`;
  const h = Math.floor(minutes / 60), m = minutes % 60;
  return m
    ? `${t("time.in", "in")} ${h}${t("time.h", "h")} ${String(m).padStart(2, "0")}${t("time.m", "m")}`
    : `${t("time.in", "in")} ${h}${t("time.h", "h")}`;
}

/* The timetable stores the Hijri date as one English string — "23 Rabi al-Thani
 * 1448 AH". The packs translate the month names, so it is taken apart and put
 * back together rather than shown as typed. Lifted from the web app's own
 * hijriLabel(), so the two cannot disagree. */
const HIJRI = ["Muharram", "Safar", "Rabi al-Awwal", "Rabi al-Thani",
  "Jumada al-Awwal", "Jumada al-Thani", "Rajab", "Sha'ban", "Ramadan", "Shawwal",
  "Dhul Qa'dah", "Dhul Hijjah"];
export function hijri(t, raw) {
  const m = String(raw || "").match(/^(\d+)\s+(.+?)\s+(\d+)\s*AH$/);
  if (!m) return String(raw || "");
  const i = HIJRI.indexOf(m[2]);
  return `${m[1]} ${i < 0 ? m[2] : t(`date.hijri.${i}`, m[2])} ${m[3]} ${t("date.ah", "AH")}`;
}

const DOW = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MON = ["January", "February", "March", "April", "May", "June",
             "July", "August", "September", "October", "November", "December"];
export { DOW, MON };
