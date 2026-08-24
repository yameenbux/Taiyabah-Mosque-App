/**
 * Taiyabah Masjid — notification sender (Cloudflare Worker)
 * Copyright (c) 2026 Yameen Bux. All rights reserved. See LICENSE.md.
 *
 * Holds the OneSignal REST API key so it never reaches a browser. That key can
 * message the entire congregation, so it lives only in Worker secrets.
 *
 * Endpoints
 *   GET  /api/health
 *   POST /api/login   { password }            -> { token }
 *   POST /api/send    { topic, title, body }  -> { ok, id, recipients }
 *
 * Secrets (wrangler secret put ...)
 *   ONESIGNAL_APP_ID, ONESIGNAL_REST_API_KEY, ADMIN_PASSWORD_HASH, SESSION_SECRET
 * Vars (wrangler.toml)
 *   ALLOWED_ORIGIN
 */

const SESSION_HOURS = 8;

/* ---------------- preferences as a single tag ----------------

   Every category used to be its own tag. OneSignal refused that with

     409 entitlements-tag-limit — "The tags for this user exceed the limit
     for this organization's plan."

   so nothing was ever stored and every targeted send matched nobody. The
   plan allows fewer tags than the app has categories, which is also what the
   409s blamed on write collisions really were.

   So all preferences live in ONE tag. Its value is four flags in a fixed
   order followed by the reminder minutes, zero padded:

     p = "110110"  ->  jamaah on, janazah on, announcements off,
                       events on, remind 10 minutes before

   Forty-eight values exist in total. Tag filters can only test a value for
   equality, so targeting a category means listing every value in which that
   flag is set and OR-ing them — 24 for a category, 8 for a reminder at a
   given offset. Verbose to send, but it holds within a one-tag plan, which
   nothing keyed per category can do. */
const PREF_TAG = "p";
const PREF_ORDER = ["jamaah", "janazah", "announcements", "events"];
const PREF_MINUTES = ["05", "10", "15"];

/* Tags from an older build, cleared on write so they stop occupying slots a
   tight plan cannot spare. server_test is left over from /api/force-tag. */
const LEGACY_TAGS = ["jamaah", "jamaah_mins", "janazah", "announcements", "events", "server_test"];

const pad2 = m => String(m).padStart(2, "0");

function encodePrefs(t) {
  return PREF_ORDER.map(k => (t[k] === "1" ? "1" : "0")).join("") + pad2(t.jamaah_mins);
}

function decodePrefs(v) {
  if (typeof v !== "string" || !/^[01]{4}(05|10|15)$/.test(v)) return null;
  const out = {};
  PREF_ORDER.forEach((k, i) => { out[k] = v[i]; });
  out.jamaah_mins = String(parseInt(v.slice(4), 10));
  return out;
}

/* Every encoded value whose `index` flag is set, optionally pinned to one
   reminder offset. */
function prefValues(index, mins) {
  const want = mins == null ? null : pad2(mins);
  const out = [];
  for (let bits = 0; bits < 16; bits++) {
    const flags = [0, 1, 2, 3].map(i => (bits >> (3 - i)) & 1);
    if (flags[index] !== 1) continue;
    for (const m of PREF_MINUTES) {
      if (want && m !== want) continue;
      out.push(flags.join("") + m);
    }
  }
  return out;
}

/* OneSignal ORs adjacent filters only when an explicit operator sits between
   them; without it they AND, which would match nobody. */
function anyOfFilter(values) {
  const f = [];
  values.forEach((v, i) => {
    if (i) f.push({ operator: "OR" });
    f.push({ field: "tag", key: PREF_TAG, relation: "=", value: v });
  });
  return f;
}

const TOPICS = {
  janazah:       { idx: 1, label: "Janāzah" },
  jamaah:        { idx: 0, label: "Jamāʿah reminders" },
  announcements: { idx: 2, label: "Announcements" },
  events:        { idx: 3, label: "Events & talks" },
};

/* ---------------- helpers ---------------- */
const enc = new TextEncoder();
const b64url = buf => btoa(String.fromCharCode(...new Uint8Array(buf)))
  .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const fromB64url = s => Uint8Array.from(
  atob(s.replace(/-/g, "+").replace(/_/g, "/")), c => c.charCodeAt(0));
const hex2buf = h => Uint8Array.from(h.match(/.{2}/g).map(b => parseInt(b, 16)));

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

/* PBKDF2-SHA256 — available in Workers; scrypt is not */
async function verifyPassword(password, stored) {
  const [saltHex, keyHex, iterStr] = String(stored).split(":");
  if (!saltHex || !keyHex) return false;
  // Workers refuse PBKDF2 above 100,000 iterations — clamp rather than throw,
  // so an older hash still verifies instead of taking the whole login down.
  const iterations = Math.min(parseInt(iterStr || "100000", 10) || 100000, 100000);
  const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: hex2buf(saltHex), iterations, hash: "SHA-256" }, key, 256);
  return timingSafeEqual(new Uint8Array(bits), hex2buf(keyHex));
}

async function hmac(secret, data) {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return crypto.subtle.sign("HMAC", key, enc.encode(data));
}
async function issueToken(secret) {
  const payload = b64url(enc.encode(JSON.stringify({ exp: Date.now() + SESSION_HOURS * 3600e3 })));
  return `${payload}.${b64url(await hmac(secret, payload))}`;
}
async function validToken(token, secret) {
  if (!token || !token.includes(".")) return false;
  const [payload, sig] = token.split(".");
  const expect = b64url(await hmac(secret, payload));
  if (!timingSafeEqual(enc.encode(sig), enc.encode(expect))) return false;
  try {
    return JSON.parse(new TextDecoder().decode(fromB64url(payload))).exp > Date.now();
  } catch { return false; }
}

/* Best-effort rate limiting. Workers isolates are short-lived and there may be
   several, so this slows abuse rather than guaranteeing a ceiling. The password
   plus an 8-hour session is the real control. */
const hits = new Map();
function limit(key, max, windowMs) {
  const now = Date.now();
  const rec = hits.get(key) || { n: 0, reset: now + windowMs };
  if (now > rec.reset) { rec.n = 0; rec.reset = now + windowMs; }
  rec.n++; hits.set(key, rec);
  return rec.n <= max;
}

function cors(origin, allowed) {
  const list = (allowed || "").split(",").map(s => s.trim()).filter(Boolean);
  const h = {
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  };
  if (origin && list.includes(origin)) {
    h["Access-Control-Allow-Origin"] = origin;
    h["Vary"] = "Origin";
  }
  return h;
}
const json = (data, status, headers) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });

/* The categories a phone may set on itself, and the only values accepted for
   each. Everything arriving at /api/tags is rebuilt from this table rather
   than merged, so no caller can invent a tag, write to an unrelated key, or
   store a value a filter would never match. */
const PREF_TAGS = ["jamaah", "janazah", "announcements", "events"];
const REMINDER_MINUTES = ["5", "10", "15"];

function cleanPrefTags(input) {
  if (!input || typeof input !== "object") return null;
  const out = {};
  for (const k of PREF_TAGS) {
    const v = String(input[k]);
    if (v !== "0" && v !== "1") return null;
    out[k] = v;
  }
  const mins = String(input.jamaah_mins);
  if (!REMINDER_MINUTES.includes(mins)) return null;
  out.jamaah_mins = mins;
  return out;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/* subscription id -> the user record that owns it */
async function onesignalIdFor(subscriptionId, env) {
  const res = await fetch(
    `https://api.onesignal.com/apps/${env.ONESIGNAL_APP_ID}/subscriptions/${subscriptionId}/user/identity`,
    { headers: { Authorization: `Key ${env.ONESIGNAL_REST_API_KEY}` } });
  if (!res.ok) return null;
  const data = await res.json().catch(() => ({}));
  return (data && data.identity && data.identity.onesignal_id) || null;
}

/* ---------------- worker ---------------- */
export default {
  async fetch(request, env) {
    // Always answer with CORS headers — a thrown error would otherwise return a
    // Cloudflare error page with none, which the browser reports only as an
    // opaque CORS failure and hides the real cause.
    const ch0 = cors(request.headers.get("Origin"), env.ALLOWED_ORIGIN);
    try {
      return await handle(request, env);
    } catch (err) {
      return json({ error: "Server error: " + (err && err.message ? err.message : String(err)) }, 500, ch0);
    }
  },

  /* Fires every minute (Cron Trigger, set in wrangler.toml). Checks whether
     any prayer's jamāʿah time is due — or due in 5/10/15 minutes, matching
     each subscriber's own preference — and sends if so. */
  async scheduled(_event, env, ctx) {
    ctx.waitUntil(runJamaahReminders(env));
  },
};

/* ================= scheduled jamāʿah reminders ================= */

const TIMETABLE_URL = "https://yameenbux.github.io/Taiyabah-Mosque-App/data/timetable-2026.json";
const PRAYER_NAMES = { fajr: "Fajr", zuhr: "Zuhr", asr: "Asr", maghrib: "Maghrib", isha: "Isha" };
const OFFSETS = [5, 10, 15];      // must match the choices in the app's UI
const DEDUP_TTL_SECONDS = 60 * 60 * 26;   // a little over a day — always covers the next run

function londonNow() {
  // Cron Triggers always fire on UTC wall-clock; converting per run sidesteps
  // BST entirely rather than trying to compute the offset ourselves.
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(new Date());
  const get = t => parts.find(p => p.type === t).value;
  return { date: `${get("year")}-${get("month")}-${get("day")}`, hm: `${get("hour")}:${get("minute")}` };
}

function minusMinutes(hm, n) {
  const [h, m] = hm.split(":").map(Number);
  let v = h * 60 + m - n;
  if (v < 0) v += 1440;
  return `${String(Math.floor(v / 60)).padStart(2, "0")}:${String(v % 60).padStart(2, "0")}`;
}

async function sendReminder(env, { key, tagMins, title, body }) {
  const already = await env.SENT_KV.get(key);
  if (already) return { skipped: true };

  const res = await fetch("https://api.onesignal.com/notifications", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Key ${env.ONESIGNAL_REST_API_KEY}` },
    body: JSON.stringify({
      app_id: env.ONESIGNAL_APP_ID,
      headings: { en: title },
      contents: { en: body },
      // jamaah switched on AND this exact offset chosen
      filters: anyOfFilter(prefValues(0, tagMins)),
      url: "https://yameenbux.github.io/Taiyabah-Mosque-App/",
    }),
  });
  const data = await res.json().catch(() => ({}));

  // Mark as sent even on failure — a bad send retried every minute for the
  // rest of the window is worse than one missed reminder.
  await env.SENT_KV.put(key, "1", { expirationTtl: DEDUP_TTL_SECONDS });

  if (!res.ok || data.errors) {
    const msg = Array.isArray(data.errors) ? data.errors.join(", ") : `OneSignal ${res.status}`;
    return { sent: false, error: msg };
  }
  return { sent: true, recipients: data.recipients ?? 0 };
}

async function runJamaahReminders(env) {
  const { date, hm } = londonNow();
  const results = [];

  let rec;
  try {
    const res = await fetch(TIMETABLE_URL, { cf: { cacheTtl: 0 } });
    if (!res.ok) throw new Error(`timetable fetch ${res.status}`);
    const data = await res.json();
    rec = data.days && data.days[date];
  } catch (e) {
    console.error("reminder run: couldn't load timetable —", e.message);
    return { error: e.message };
  }
  if (!rec) return { skipped: "no timetable entry for " + date };   // e.g. past year end

  const isFriday = new Date(date + "T12:00:00Z").getUTCDay() === 5;

  for (const prayer of Object.keys(PRAYER_NAMES)) {
    const jamaat = rec.jamaat[prayer];
    if (!jamaat) continue;

    const isJumuah = isFriday && prayer === "zuhr" && rec.jummah && rec.jummah.first;
    const label = isJumuah ? "Jumuʿah" : PRAYER_NAMES[prayer];
    // On Fridays the Zuhr *jamaat* field already reflects 1st Jumuʿah, so the
    // existing offset math still applies — only the wording changes.

    for (const mins of OFFSETS) {
      if (minusMinutes(jamaat, mins) !== hm) continue;
      const key = `sent:${date}:${prayer}:${mins}`;
      const r = await sendReminder(env, {
        key, tagMins: mins,
        title: `${label} Jamāʿah in ${mins} min`,
        body: `${label} jamāʿah is at ${jamaat}.`,
      });
      results.push({ prayer: label, mins, ...r });
    }
  }
  if (results.length) console.log("reminder run", date, hm, JSON.stringify(results));
  return { date, hm, results };
}

async function handle(request, env) {
  {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin");
    const ch = cors(origin, env.ALLOWED_ORIGIN);
    const ip = request.headers.get("CF-Connecting-IP") || "?";

    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: ch });

    if (url.pathname === "/api/health") {
      return json({
        ok: true,
        // The App ID is a public identifier — it ships inside every page that
        // loads the OneSignal SDK. Reporting it here lets the admin screen
        // confirm the sender is aimed at the same OneSignal app the phones
        // registered with; a mismatch sends into an app with no subscribers,
        // which looks exactly like nobody being signed up. The REST key stays
        // secret and is only ever reported as present or absent.
        appId: env.ONESIGNAL_APP_ID || null,
        configured: {
          appId: !!env.ONESIGNAL_APP_ID,
          restKey: !!env.ONESIGNAL_REST_API_KEY,
          passwordHash: !!env.ADMIN_PASSWORD_HASH,
          sessionSecret: !!env.SESSION_SECRET,
          allowedOrigin: env.ALLOWED_ORIGIN || null,
        },
        yourOrigin: request.headers.get("Origin") || null,
      }, 200, ch);
    }

    if (url.pathname === "/api/login" && request.method === "POST") {
      if (!limit(`login:${ip}`, 8, 15 * 60e3))
        return json({ error: "Too many attempts. Try again in a few minutes." }, 429, ch);
      let body = {};
      try { body = await request.json(); } catch {}
      if (typeof body.password !== "string" || !(await verifyPassword(body.password, env.ADMIN_PASSWORD_HASH)))
        return json({ error: "Incorrect password" }, 401, ch);
      return json({ token: await issueToken(env.SESSION_SECRET), expiresInHours: SESSION_HOURS }, 200, ch);
    }

    if (url.pathname === "/api/send" && request.method === "POST") {
      const token = (request.headers.get("Authorization") || "").replace(/^Bearer /, "");
      if (!(await validToken(token, env.SESSION_SECRET)))
        return json({ error: "Not signed in" }, 401, ch);
      if (!limit(`send:${ip}`, 20, 60 * 60e3))
        return json({ error: "Send limit reached for this hour." }, 429, ch);

      let body = {};
      try { body = await request.json(); } catch {}
      const t = TOPICS[body.topic];
      if (!t) return json({ error: "Unknown topic" }, 400, ch);
      const title = typeof body.title === "string" ? body.title.trim() : "";
      const message = typeof body.body === "string" ? body.body.trim() : "";
      if (!title || title.length > 70)  return json({ error: "Title must be 1–70 characters" }, 400, ch);
      if (!message || message.length > 220) return json({ error: "Message must be 1–220 characters" }, 400, ch);

      const res = await fetch("https://api.onesignal.com/notifications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Key ${env.ONESIGNAL_REST_API_KEY}`,
        },
        body: JSON.stringify({
          app_id: env.ONESIGNAL_APP_ID,
          headings: { en: title },
          contents: { en: message },
          filters: anyOfFilter(prefValues(t.idx)),
          url: "https://yameenbux.github.io/Taiyabah-Mosque-App/",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.errors) {
        const message = Array.isArray(data.errors) ? data.errors.join(", ")
          : data.errors ? JSON.stringify(data.errors) : `OneSignal returned ${res.status}`;
        return json({ error: message }, 502, ch);
      }
      return json({ ok: true, id: data.id, recipients: data.recipients ?? null, topic: t.label }, 200, ch);
    }

    /* Where a phone records which categories it wants.

       This deliberately does not go through the browser SDK. Its addTags()
       writes were accepted locally and never stored: the dashboard showed a
       subscription carrying only server_test — the tag /api/force-tag wrote
       server to server — while the phone listed a full set. Every targeted
       send therefore matched nobody, even though each phone believed it was
       signed up. The REST path below is the one that demonstrably works on
       these same subscriptions, so preferences take it too.

       Unauthenticated by necessity — congregants have no password, and the
       page holds no key worth stealing. What bounds it: a caller must already
       know a subscription's UUID, the tags are rebuilt from a fixed table so
       only real categories and matchable values can be stored, CORS keeps
       browsers off it from other origins, and it is rate limited per address.
       At worst someone holding another person's subscription id could change
       that person's categories — the same exposure the browser SDK has by
       design, and the reason this never accepts anything but preferences.

       POST /api/tags { subscriptionId, tags } -> { ok, tags } */
    if (url.pathname === "/api/tags" && request.method === "POST") {
      if (!limit(`tags:${ip}`, 60, 60 * 60e3))
        return json({ error: "Too many preference updates. Try again later." }, 429, ch);

      let body = {};
      try { body = await request.json(); } catch {}

      const subId  = String(body.subscriptionId || "");
      const sentUid = String(body.oneSignalId || "");
      if (!UUID.test(subId) && !UUID.test(sentUid))
        return json({ error: "Bad subscription id" }, 400, ch);

      const tags = cleanPrefTags(body.tags);
      if (!tags) return json({ error: "Bad categories" }, 400, ch);

      /* Prefer the user id the app already holds. /api/force-tag wrote by user
         id and that tag is what showed up in the dashboard, so this is the path
         known to work on these records; resolving a subscription id first only
         adds a call that can fail. Fall back to that resolution when the SDK
         hasn't surfaced a user id, and as a last resort treat the id we were
         given as a user id — telling the two apart from the dashboard is not
         obvious, and guessing wrong is a silent dead end. */
      let oneSignalId = UUID.test(sentUid) ? sentUid : null;
      let idSource = oneSignalId ? "user id from app" : null;
      if (!oneSignalId && UUID.test(subId)) {
        oneSignalId = await onesignalIdFor(subId, env);
        idSource = oneSignalId ? "resolved from subscription" : null;
      }
      if (!oneSignalId && UUID.test(subId)) { oneSignalId = subId; idSource = "id used as-is"; }
      if (!oneSignalId)
        return json({ error: "OneSignal doesn't recognise this device" }, 404, ch);

      const encoded = encodePrefs(tags);
      const userUrl =
        `https://api.onesignal.com/apps/${env.ONESIGNAL_APP_ID}/users/by/onesignal_id/${oneSignalId}`;

      const patch = body => fetch(userUrl, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Key ${env.ONESIGNAL_REST_API_KEY}`,
        },
        body: JSON.stringify({ properties: { tags: body } }),
      });

      /* An empty value deletes a tag, so the same write that stores the
         preference clears the per-category tags an older build left behind.
         If the plan counts those removals against the limit, fall back to
         writing the one tag alone — storing the preference matters more than
         tidying up, and a later write can retry the cleanup. */
      const withCleanup = { [PREF_TAG]: encoded };
      for (const k of LEGACY_TAGS) withCleanup[k] = "";

      let res = await patch(withCleanup);
      let cleaned = res.ok;
      if (!res.ok) res = await patch({ [PREF_TAG]: encoded });

      if (!res.ok) {
        const detail = await res.json().catch(() => ({}));
        return json({ error: `OneSignal returned ${res.status}`, via: idSource,
                      tried: oneSignalId, detail }, 502, ch);
      }

      /* Read back rather than trusting the write. Reporting a stored state the
         app can check is the whole point — assuming success is what hid this
         fault for so long. */
      const check = await fetch(
        `https://api.onesignal.com/apps/${env.ONESIGNAL_APP_ID}/users/by/onesignal_id/${oneSignalId}`,
        { headers: { Authorization: `Key ${env.ONESIGNAL_REST_API_KEY}` } });
      const stored = check.ok
        ? ((await check.json().catch(() => ({}))).properties || {}).tags || {}
        : null;

      // decoded from what OneSignal returned, so the app checks stored state
      const prefs = stored ? decodePrefs(stored[PREF_TAG]) : null;

      return json({ ok: true, onesignal_id: oneSignalId, via: idSource,
                    cleaned, tags: stored, prefs }, 200, ch);
    }

    /* Decisive test: writes a tag DIRECTLY via OneSignal's server-to-server
       REST API, completely bypassing the browser SDK, IndexedDB, and every
       client-side code path. If this succeeds where the client always
       409s, the bug is in the client SDK call. If this ALSO 409s, the
       problem is on OneSignal's side for this app/subscription, not ours.
       GET /api/force-tag?id=<onesignal_id> */
    if (url.pathname === "/api/force-tag" && request.method === "GET") {
      const token = (request.headers.get("Authorization") || "").replace(/^Bearer /, "");
      if (!(await validToken(token, env.SESSION_SECRET))) return json({ error: "Not signed in" }, 401, ch);

      const id = url.searchParams.get("id");
      if (!id) return json({ error: "Pass ?id=<OneSignal ID>" }, 400, ch);

      const res = await fetch(`https://api.onesignal.com/apps/${env.ONESIGNAL_APP_ID}/users/by/onesignal_id/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Key ${env.ONESIGNAL_REST_API_KEY}`,
        },
        body: JSON.stringify({ properties: { tags: { server_test: "1" } } }),
      });
      const data = await res.json().catch(() => ({}));
      return json({ status: res.status, ok: res.ok, response: data }, 200, ch);
    }

    /* Ground-truth diagnostic: asks OneSignal's own server what tags it
       actually has stored for a subscription, bypassing the browser SDK,
       its local IndexedDB cache, and any client-side "success" reporting
       entirely. Accepts either the OneSignal ID or the Subscription ID
       shown on the dashboard — whichever was pasted, since telling the two
       apart isn't obvious and getting it wrong wastes time.
       GET /api/check-tags?id=<uuid> */
    if (url.pathname === "/api/check-tags" && request.method === "GET") {
      const token = (request.headers.get("Authorization") || "").replace(/^Bearer /, "");
      if (!(await validToken(token, env.SESSION_SECRET))) return json({ error: "Not signed in" }, 401, ch);

      const id = url.searchParams.get("id");
      if (!id) return json({ error: "Pass ?id=<the OneSignal ID or Subscription ID from the dashboard>" }, 400, ch);

      const authHeaders = { Authorization: `Key ${env.ONESIGNAL_REST_API_KEY}` };
      const base = `https://api.onesignal.com/apps/${env.ONESIGNAL_APP_ID}`;

      // try it directly as a OneSignal ID first
      let res = await fetch(`${base}/users/by/onesignal_id/${id}`, { headers: authHeaders });

      if (res.status === 404) {
        // fall back: resolve it as a Subscription ID instead
        const idRes = await fetch(`${base}/subscriptions/${id}/user/identity`, { headers: authHeaders });
        if (idRes.ok) {
          const idData = await idRes.json();
          const resolvedId = idData && idData.identity && idData.identity.onesignal_id;
          if (resolvedId) {
            res = await fetch(`${base}/users/by/onesignal_id/${resolvedId}`, { headers: authHeaders });
          }
        }
      }

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        return json({ error: `OneSignal returned ${res.status}`, detail: data }, 502, ch);
      }
      const heldTags = (data.properties && data.properties.tags) || {};
      return json({
        ok: true,
        onesignal_id: data.identity && data.identity.onesignal_id,
        tags: heldTags,
        prefs: decodePrefs(heldTags[PREF_TAG]),
        subscriptions: (data.subscriptions || []).map(s => ({
          id: s.id, type: s.type, enabled: s.enabled,
        })),
      }, 200, ch);
    }

    if (url.pathname === "/api/test-reminders" && request.method === "POST") {
      const token = (request.headers.get("Authorization") || "").replace(/^Bearer /, "");
      if (!(await validToken(token, env.SESSION_SECRET))) return json({ error: "Not signed in" }, 401, ch);
      const result = await runJamaahReminders(env);
      return json(result, 200, ch);
    }

    return json({ error: "Not found", receivedPath: url.pathname, receivedMethod: request.method }, 404, ch);
  }
}
