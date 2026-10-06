/* Which reminder the home screen is showing, and why.
 *
 * The list and its predicates are lifted verbatim from the web app (see
 * scripts/extract-reminders.mjs); this is the context they are tested against,
 * ported from the web app's reminderCtx().
 */
import { REMINDERS, setReminderTranslator } from "./reminders-data";
import { dayFor, nowLondon } from "./prayer";

const minusMins = (hhmm, n) => {
  const [h, m] = hhmm.split(":").map(Number);
  let v = h * 60 + m - n; if (v < 0) v += 1440;
  return `${String(Math.floor(v / 60)).padStart(2, "0")}:${String(v % 60).padStart(2, "0")}`;
};
const at = (d, hhmm) => {
  const [h, m] = hhmm.split(":").map(Number);
  const x = new Date(d); x.setHours(h, m, 0, 0); return x;
};

export function context(now = nowLondon()) {
  const rec = dayFor(now);
  if (!rec) return null;
  const hm = (rec.hijri || "").match(/^(\d+)\s+(.+?)\s+\d+/);
  const c = { dow: now.getDay(), live: true,
              hDay: hm ? parseInt(hm[1], 10) : 0, hMonth: hm ? hm[2] : "" };

  /* Tomorrow, for the day-before fasting notices — "optional fasting tomorrow"
   * is only useful the night before. */
  const tmr = new Date(now); tmr.setDate(tmr.getDate() + 1);
  const tRec = dayFor(tmr);
  if (tRec) {
    const thm = (tRec.hijri || "").match(/^(\d+)\s+(.+?)\s+\d+/);
    c.tDow = tmr.getDay();
    c.tDay = thm ? parseInt(thm[1], 10) : 0;
    c.tMonth = thm ? thm[2] : "";
    c.suhoor = tRec.begins.fajr ? minusMins(tRec.begins.fajr, 10) : null;
  } else { c.tDow = -1; c.tDay = 0; c.tMonth = ""; }

  c.afterFajr     = now >= at(now, rec.begins.fajr);
  c.beforeSunrise = now <  at(now, rec.begins.sunrise);
  c.afterAsr      = now >= at(now, rec.begins.asr);
  c.beforeMaghrib = now <  at(now, rec.begins.maghrib);
  return c;
}

/* Everything that applies right now. A predicate that throws is simply not
 * shown — one bad date test must not take the whole strip down. */
export function current(now = nowLondon()) {
  const c = context(now);
  if (!c) return { list: [], c: null };
  return { list: REMINDERS.filter(r => { try { return r.when(c); } catch { return false; } }), c };
}

export { setReminderTranslator };
