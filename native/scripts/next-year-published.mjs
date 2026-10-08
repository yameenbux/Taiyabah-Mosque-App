/**
 * Taiyabah Masjid — is next year's prayer timetable published yet?
 * Copyright (c) 2026 Yameen Bux. All rights reserved. See LICENSE.md.
 *
 * The app prefers the committee's published timetable over the file it ships
 * with, and only 2026 has ever been published. On 1 January 2027 every phone
 * would fall back to the bundled 2026 file and quietly show last year's times —
 * no error, no blank screen, just wrong times for a congregation that trusts
 * them. Nobody would be told. That is the failure this script exists to prevent.
 *
 * It asks the database the same question the app asks, through the same
 * publishable key and the same function, and from 1 November it FAILS rather
 * than warns, so there are two clear months to get the next year in.
 *
 *   node scripts/next-year-published.mjs          # ask the live database
 *
 * The verdict is kept apart from the asking, because this repository's sandbox
 * cannot reach Supabase — so the rules are unit-tested (scripts/test/
 * next-year.test.mjs) and only the fetching needs a runner with the internet.
 */
import fs from "node:fs";
import path from "node:path";

/* One source of truth for the project and the key: the app's own client. The
 * key is publishable by design — row-level security is the real gate. */
export function clientConfig(src = fs.readFileSync(
  path.resolve(import.meta.dirname, "../src/supabase.js"), "utf8")) {
  const url = src.match(/const URL\s*=\s*"([^"]+)"/)?.[1];
  const key = src.match(/const ANON\s*=\s*"([^"]+)"/)?.[1];
  if (!url || !key) throw new Error("could not read URL/ANON out of src/supabase.js");
  return { url, key };
}

export const daysInYear = y =>
  (y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0)) ? 366 : 365;

/**
 * The rules, with no network and no clock of their own.
 *
 * counts  { [year]: number | null }  — days the database returned; null means
 *                                     the question could not be asked at all
 * today   a Date
 * nagFrom the month from which a missing next year is an error, 1-based
 */
export function verdict({ today, counts, nagFrom = 11 }) {
  const lines = [];
  const now = today.getFullYear();
  const next = now + 1;

  const look = (year, label) => {
    const got = counts[year];
    const want = daysInYear(year);
    if (got === null || got === undefined)
      return { bad: true, text: `${year} (${label}): could not ask the database — the check itself is broken, so nothing here is proof of anything` };
    if (got === 0)      return { bad: false, empty: true, text: `${year} (${label}): nothing published` };
    if (got < want)     return { bad: true, text: `${year} (${label}): only ${got} of ${want} days — a part-published year leaves gaps the app cannot fill` };
    if (got > want)     return { bad: true, text: `${year} (${label}): ${got} rows for a ${want}-day year — duplicated days would make the app pick one at random` };
    return { ok: true, text: `${year} (${label}): all ${got} days published` };
  };

  /* The year that is running is never optional: if it is not whole, phones are
     already showing times from the bundled file or nothing at all. */
  const a = look(now, "this year");
  if (a.ok) lines.push({ level: "notice", text: a.text });
  else lines.push({ level: "error", text: a.empty ? `${now} (this year): nothing published — phones are falling back to the file the app shipped with` : a.text });

  const b = look(next, "next year");
  if (b.ok) lines.push({ level: "notice", text: b.text });
  else if (b.bad) lines.push({ level: "error", text: b.text });
  else {
    /* Empty, and whether that is a problem depends on the date. */
    const due = new Date(Date.UTC(now, nagFrom - 1, 1));
    if (today < due) {
      const days = Math.ceil((due - today) / 86400000);
      lines.push({ level: "notice", text: `${next}: not published yet. Not due to worry until 1 ${due.toLocaleString("en-GB", { month: "long", timeZone: "UTC" })} — ${days} day${days === 1 ? "" : "s"} away.` });
    } else {
      lines.push({ level: "error", text: `${next}: STILL NOT PUBLISHED, and it is past 1 ${due.toLocaleString("en-GB", { month: "long", timeZone: "UTC" })}. On 1 January every phone will show ${now}'s times as though they were ${next}'s. The committee needs to publish the ${next} timetable in the admin page.` });
    }
  }

  return { exit: lines.some(l => l.level === "error") ? 1 : 0, lines };
}

/* --- the asking ---------------------------------------------------------- */
export async function daysPublished(year, { url, key }, fetchImpl = fetch) {
  const res = await fetchImpl(`${url}/rest/v1/rpc/prayer_year`, {
    method: "POST",
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ p_year: year }),
  });
  if (!res.ok) throw new Error(`prayer_year(${year}) answered ${res.status}`);
  const rows = await res.json();
  if (!Array.isArray(rows)) throw new Error(`prayer_year(${year}) did not return a list`);
  return rows.length;
}

if (import.meta.filename === process.argv[1]) {
  const cfg = clientConfig();
  const today = new Date();
  const years = [today.getFullYear(), today.getFullYear() + 1];
  const counts = {};
  for (const y of years) {
    try { counts[y] = await daysPublished(y, cfg); }
    catch (e) { counts[y] = null; console.log(`  (asking about ${y} failed: ${e.message})`); }
  }
  const { exit, lines } = verdict({ today, counts });
  const ci = !!process.env.GITHUB_ACTIONS;
  for (const l of lines) {
    console.log(`${l.level === "error" ? "✗" : "✓"} ${l.text}`);
    if (ci) console.log(`::${l.level}::${l.text}`);
  }
  process.exit(exit);
}
