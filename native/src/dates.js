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

/* "in 8h 35m".
 *
 * It used to be glued together from an "in" and two unit words, on the grounds
 * that a pack then only had to carry the units. That only works in English.
 * Urdu puts the "in" last — ‌‌"45 منٹ میں", not "میں 45 منٹ" — and no amount of
 * translating the word "in" on its own can move it there. So each shape is one
 * sentence with the numbers dropped into it, and a pack can put them wherever
 * its language puts them. This is the most-read line on the busiest screen;
 * getting it backwards would be the first thing anybody noticed. */
export function countdown(t, minutes) {
  if (minutes < 60)
    return t("time.in_min", "in {n} min").replace("{n}", String(minutes));
  const h = Math.floor(minutes / 60), m = minutes % 60;
  return (m
    ? t("time.in_hm", "in {h}h {m}m").replace("{m}", String(m).padStart(2, "0"))
    : t("time.in_h", "in {h}h")
  ).replace("{h}", String(h));
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
