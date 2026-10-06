/* Where the prayer times come from.
 * Copyright (c) 2026 Yameen Bux. All rights reserved. See LICENSE.md.
 *
 * THE TIMETABLE USED TO BE A FILE INSIDE THE APP and nothing else, which gave
 * it a hard stop: 365 days, 1 January to 31 December 2026, and on New Year's
 * Day 2027 the app has no prayer times at all. Fixing that meant a new
 * release, a Play review, and every single person updating — anybody who did
 * not would simply have no times.
 *
 * The committee's own database has held the published timetable all along —
 * prayer_year() is the same call the website makes — so the app asks for it
 * instead. The committee uploads next year once from the admin side, presses
 * publish, and every phone has it the next time it has signal. Nobody is
 * waiting on a release and nobody is left behind.
 *
 * The bundled file stays as the floor, not the ceiling: a phone that has
 * never had signal still shows 2026 correctly, exactly as it does today. The
 * downloaded year is laid OVER it, so this can only ever be an improvement on
 * what is already there.
 */
import BUNDLED from "./data/timetable-2026.json";
import { call } from "./supabase";

/* Required where it is used rather than at the top, so that importing this
 * module — and so prayer.js, and so anything that needs the prayer arithmetic
 * — does not drag a native storage module in with it. A module that reads
 * from disk should do it when asked, not when loaded, and it is what lets the
 * tests run the real code under plain Node. */
const store = () => require("@react-native-async-storage/async-storage").default;

const CACHE = "timetable.years";       // { [year]: { days, at } }
const MAX_AGE_DAYS = 400;              // a year is still a year; older is stale

/* The day map everything reads, seeded from the file that ships with the app.
 * Downloaded years are merged in on top, so a year we have both ways takes the
 * committee's current version rather than the one frozen at build time. */
let DAYS = { ...BUNDLED.days };

const listeners = new Set();
const announce = () => { for (const fn of listeners) { try { fn(); } catch {} } };

/* Screens read the timetable synchronously, so when a download lands they have
 * to be told to look again. */
export function onTimetable(fn) { listeners.add(fn); return () => listeners.delete(fn); }

export function dayRecord(iso) { return DAYS[iso] || null; }

/* The whole map, for the one caller that has to scan it — Home looking for
   the first of Ramadan. */
export function allDays() { return DAYS; }

/* Which years we can actually answer for — what the "outside the published
 * timetable" message needs in order to say WHICH years are published. */
export function yearsHeld() {
  const ys = new Set();
  for (const k of Object.keys(DAYS)) ys.add(Number(k.slice(0, 4)));
  return [...ys].sort();
}

/* "Official 2027 Salah Timetable (1448–1449 AH)" — built from the figures
 * rather than carried as a string, because the string that shipped with the
 * app names 2026 and would have sat under every year after it saying so. The
 * hijri span comes out of the days themselves. The committee's own note on a
 * year is NOT used: it is an internal record ("Seeded from build-inputs…"),
 * not something to put in front of a congregation. */
export function sourceFor(year) {
  const keys = Object.keys(DAYS).filter(k => k.startsWith(`${year}-`)).sort();
  if (!keys.length) return null;
  const ah = k => (DAYS[k]?.hijri?.match(/(\d+)\s*AH/) || [])[1];
  const a = ah(keys[0]), b = ah(keys[keys.length - 1]);
  const span = a && b ? (a === b ? ` (${a} AH)` : ` (${a}\u2013${b} AH)`) : "";
  return `Official ${year} Salah Timetable${span}`;
}

const pad = n => String(n).padStart(2, "0");

/* prayer_year() hands back one compact array per day, in the column order the
 * table declares. Written out rather than destructured so that a column added
 * to the middle of it one day is a visible break here instead of a silently
 * shifted time. */
function fromRows(year, rows) {
  const days = {};
  for (const r of rows) {
    if (!Array.isArray(r) || r.length < 14) continue;
    const [month, day, hijri,
           fajrB, fajrJ, sunrise,
           zuhrB, zuhrJ, asrB, asrJ,
           maghrib, ishaB, ishaJ, jummah] = r;
    const rec = {
      hijri: hijri || "",
      begins: { fajr: fajrB, sunrise, zuhr: zuhrB, asr: asrB, maghrib, isha: ishaB },
      /* Maghrib's jamāʿah is the minute it begins — the masjid's practice, and
         why the table carries one column for it rather than two. */
      jamaat: { fajr: fajrJ, zuhr: zuhrJ, asr: asrJ, maghrib, isha: ishaJ },
    };
    if (jummah) {
      const [first, second] = String(jummah).split(",").map(s => s.trim());
      if (first) rec.jummah = second ? { first, second } : { first };
    }
    days[`${year}-${pad(month)}-${pad(day)}`] = rec;
  }
  return days;
}

const merge = days => { if (days && Object.keys(days).length) { DAYS = { ...DAYS, ...days }; return true; } return false; };

const readCache = async () => {
  try { return JSON.parse(await store().getItem(CACHE)) || {}; } catch { return {}; }
};

/* Restore what we downloaded last time BEFORE asking for anything. A phone
 * with no signal in January 2027 then still has the year it fetched in
 * December, which is the entire point. */
export async function restoreTimetable() {
  const cache = await readCache();
  let any = false;
  for (const [year, held] of Object.entries(cache)) {
    if (!held?.days) continue;
    if (Date.now() - (held.at || 0) > MAX_AGE_DAYS * 864e5) continue;
    any = merge(held.days) || any;
  }
  if (any) announce();
}

/* Asks for one year and keeps it. An unpublished year comes back empty — the
 * committee uploading next year's figures does not put them in front of
 * anybody until they press publish — so an empty answer is left alone rather
 * than cached over something that works. */
export async function fetchYear(year) {
  try {
    const rows = await call("prayer_year", { p_year: year });
    if (!Array.isArray(rows) || rows.length === 0) return false;

    const days = fromRows(year, rows);
    if (!merge(days)) return false;

    const cache = await readCache();
    cache[year] = { days, at: Date.now() };
    await store().setItem(CACHE, JSON.stringify(cache)).catch(() => {});
    announce();
    return true;
  } catch {
    return false;                      // no signal is not an error worth showing
  }
}

/* This year and next. Next year is asked for ALL year rather than in December,
 * because the phone that matters is the one that will not have signal when it
 * is needed, and the committee publishes when they publish. Before they have,
 * the answer is empty and costs one request. */
export async function syncTimetable(now = new Date()) {
  const y = now.getFullYear();
  await fetchYear(y);
  await fetchYear(y + 1);
}
