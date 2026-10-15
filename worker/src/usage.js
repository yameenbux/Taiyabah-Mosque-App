/**
 * Taiyabah Masjid — counting what the app is used for, without counting people.
 * Copyright (c) 2026 Yameen Bux. All rights reserved. See LICENSE.md.
 *
 * THE QUESTION THIS EXISTS TO ANSWER is "does anybody actually use the Qur'an
 * reader?", and after it, "which parts of this are worth the maintenance?".
 * Until now there was no way to answer either, which made every decision
 * about what to build next a guess.
 *
 * WHAT IT MAY NOT DO. The privacy notice tells the congregation that the
 * Qur'an, the qibla and the rest "work without an account and without sending
 * anything about you anywhere", and that there is "no tracking of any kind".
 * That promise is kept here, by construction rather than by intention:
 *
 *   - Nothing is added to any request. The app sends nothing new. These are
 *     counts of requests the masjid's own server was already receiving.
 *   - No identifier is recorded, derived, hashed or held — not an IP, not a
 *     user agent, not a device id, not a session. There is nothing in a row
 *     that could be joined to a person, because there is nothing in a row but
 *     a date, a feature name, a platform and a number.
 *   - A row is a running total. Individual requests are never stored, so
 *     there is no event log that could later be mined for a pattern.
 *   - The write function is granted to the service role ONLY. The app itself
 *     cannot call it even if some future version tried to, which keeps this
 *     server-side by permission and not merely by habit.
 *
 * FEATURES ARE AN ALLOWLIST, not whatever a URL happens to say. A crafted
 * request must not be able to invent rows in the masjid's database, and a
 * fixed list also means the feature names stay comparable across a rename.
 *
 * HOW IT ADDS UP. Writing a row per request would be thousands of database
 * calls a day for a number nobody reads in real time. Instead each isolate
 * keeps a small tally and flushes it, so a day of muṣḥaf reading becomes a
 * few hundred increments. An isolate that is evicted before it flushes loses
 * what it was holding; that is accepted, deliberately, because this is a
 * measure of direction and not a ledger.
 *
 * NOTHING HERE MAY BREAK A REQUEST. Counting a page view is worth nothing
 * next to serving it. Every path out of this module swallows its own errors
 * and returns; the caller is not given anything to handle.
 */

/* The only feature names that can ever reach the database. Adding one is a
   deliberate act; a typo in a caller is a dropped count, not a new row. */
export const FEATURES = new Set([
  "mushaf",        /* a page of the muṣḥaf */
  "hadith",        /* a book or a search of the Bukhārī collection */
  "poster",        /* a notice's poster image */
  "metals",        /* the live gold and silver rates, for the zakat screen */
  "prefs",         /* somebody changed their notification switches */
]);

/* NOT HERE, and the reason matters more than the list does.
 *
 *   notices   — /api/notice is the OFFICE publishing one, behind a session
 *               token. The congregation reads notices straight from Supabase
 *               and never touches this Worker to do it. Counting that route
 *               would have produced a number that looked like "how many
 *               people read the notices" and actually meant "how often the
 *               office posted", which is worse than having no number at all.
 *   timetable — read from Supabase directly too, so nothing server-side here
 *               can see it. It would have been the best proxy for how many
 *               installs are live, and it is simply not observable from here.
 *
 * Both were on this list until the routes were read rather than assumed. */

/* Platforms are a closed set for the same reason. "other" is where anything
   unrecognised goes, so the total always adds up. */
export const PLATFORMS = new Set(["ios", "android", "web", "other"]);

/* Flush when either is reached. Small enough that an evicted isolate loses
   little, large enough that a busy minute is a handful of calls. */
export const FLUSH_AT = 50;
export const FLUSH_EVERY_MS = 60_000;

/* Per-isolate, which is the whole trick: no coordination, no locks, no KV
   write limits, and an upper bound on what any one eviction can cost. */
const tally = new Map();
let oldest = 0;

/** London's date, because that is the day the masjid is counting in. */
export function dayKey(at = new Date()) {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Europe/London", year: "numeric", month: "2-digit", day: "2-digit",
    }).format(at);
  } catch {
    return at.toISOString().slice(0, 10);
  }
}

/**
 * Which platform a request came from, read from the user agent that was
 * already in it. Nothing is stored but this one word, and the user agent
 * itself is never written anywhere.
 */
export function platformOf(userAgent) {
  const ua = String(userAgent || "").toLowerCase();
  if (!ua) return "other";
  /* The app names itself; these checks come first so an Expo app on an iPad
     is not read as a desktop browser. */
  if (ua.includes("okhttp") || ua.includes("android")) return "android";
  if (ua.includes("cfnetwork") || ua.includes("darwin") ||
      ua.includes("iphone") || ua.includes("ipad") || ua.includes("ios")) return "ios";
  if (ua.includes("mozilla")) return "web";
  return "other";
}

/** The feature a path belongs to, or null if it is not one we count. */
export function featureOf(pathname) {
  const p = String(pathname || "");
  if (p.startsWith("/quran/mushaf/")) return "mushaf";
  if (p.startsWith("/quran/hadith/")) return "hadith";
  if (p.startsWith("/api/poster/")) return "poster";
  if (p === "/api/metals") return "metals";
  if (p === "/api/set-my-tags") return "prefs";
  return null;
}

/** Everything held but not yet written, as rows. Exported for the tests. */
export function pending() {
  return [...tally.entries()].map(([key, n]) => {
    const [day, feature, platform] = key.split("|");
    return { day, feature, platform, n };
  });
}

export function reset() { tally.clear(); oldest = 0; }

/** Add one. Never throws, never waits, never touches the response. */
export function count(feature, platform, now = Date.now(), at = new Date()) {
  try {
    if (!FEATURES.has(feature)) return false;
    const plat = PLATFORMS.has(platform) ? platform : "other";
    const key = `${dayKey(at)}|${feature}|${plat}`;
    tally.set(key, (tally.get(key) || 0) + 1);
    if (!oldest) oldest = now;
    return true;
  } catch { return false; }
}

/** Whether what is held is worth a database call yet. */
export function due(now = Date.now()) {
  if (!tally.size) return false;
  let total = 0;
  for (const n of tally.values()) total += n;
  return total >= FLUSH_AT || (oldest && now - oldest >= FLUSH_EVERY_MS);
}

/**
 * Write the tally away and clear it. The rows are taken BEFORE the call and
 * the tally emptied immediately, so requests arriving during the write are
 * counted toward the next flush rather than being written twice or lost.
 */
export async function flush(env, rpc) {
  const rows = pending();
  if (!rows.length) return { ok: true, rows: 0 };
  reset();
  try {
    const res = await rpc(env, "bump_usage", { payload: { rows } });
    if (res?.error) return { ok: false, rows: rows.length, error: res.error };
    return { ok: true, rows: rows.length };
  } catch (e) {
    /* The counts are gone. That is the right trade: holding them and retrying
       would mean an unbounded buffer in an isolate that may never be asked to
       serve again, to protect a number nobody reads in real time. */
    return { ok: false, rows: rows.length, error: String(e).slice(0, 120) };
  }
}

/**
 * The one call a route makes. Counts, and flushes in the background when it
 * is worth it — `ctx.waitUntil` so the response is never held up by it.
 *
 * `rpc` is passed in rather than imported so this module knows nothing about
 * Supabase, and so a test can watch what it would have written.
 */
export function note(env, ctx, request, rpc, pathname) {
  try {
    const feature = featureOf(pathname ?? new URL(request.url).pathname);
    if (!feature) return false;
    count(feature, platformOf(request?.headers?.get?.("user-agent")));
    if (due() && ctx?.waitUntil && rpc) ctx.waitUntil(flush(env, rpc));
    return true;
  } catch { return false; }
}
