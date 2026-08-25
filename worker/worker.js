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

/* Diagnostic reports congregants send in. Capped so one report cannot fill a
   KV value, and expiring so old ones do not accumulate unattended. */
const REPORT_MAX = 12000;
const REPORT_TTL_SECONDS = 60 * 60 * 24 * 60;   // two months

/* ---------------- preferences as a single tag ----------------

   A tag per category is what this app used to write, and OneSignal refused it:

     409 entitlements-tag-limit — "The tags for this user exceed the limit for
     this organization's plan."

   Five categories, fewer tag slots than that, so nothing was stored and every
   targeted send matched nobody. The 409s once blamed on overlapping writes
   were this same limit.

   So all preferences live in ONE tag: four flags in a fixed order, then the
   reminder minutes zero padded.

     p = "110110"  ->  jamaah on, janazah on, announcements off, events on,
                       remind 10 minutes before

   Forty-eight values exist. Tag filters only test a value for equality, so
   targeting a category means listing every value in which its flag is set and
   OR-ing them — 24 for a category, 8 for a reminder at a given offset. Verbose
   to send, but it holds within a one-tag plan, which nothing keyed per
   category can do. */
const PREF_TAG = "p";
const PREF_ORDER = ["jamaah", "janazah", "announcements", "events"];
const PREF_MINUTES = ["05", "10", "15"];

/* Tags from older builds, cleared on write so they stop occupying slots a
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

const TIMETABLE_URL = "https://taiyabahapp.ysbdesigns.uk/data/timetable-2026.json";
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

  // Advance reminders target one offset group (5/10/15). The "jamāʿah is
  // now" alert has no offset — it goes to everyone who has jamāʿah
  // reminders switched on, since that preference is about how much warning
  // they want, not whether they want to know it has started.
  // jamaah switched on, and this exact offset chosen
  const filters = anyOfFilter(prefValues(0, tagMins == null ? null : tagMins));

  const res = await fetch("https://api.onesignal.com/notifications", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Key ${env.ONESIGNAL_REST_API_KEY}` },
    body: JSON.stringify({
      app_id: env.ONESIGNAL_APP_ID,
      headings: { en: title },
      contents: { en: body },
      filters,
      url: "https://taiyabahapp.ysbdesigns.uk/",
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

/* The app displays times embedded in index.html; this scheduler reads
   data/timetable-2026.json. They are generated from the same source and
   must always agree — but if an annual refresh ever updated one and not
   the other, notifications would fire at times the app doesn't show.
   That failure would be silent and would undermine the one thing people
   trust this app for, so the scheduler verifies a match before sending
   and stays quiet rather than announcing a time nobody can see. */
async function timetableMatchesApp(rec, date) {
  try {
    const res = await fetch("https://taiyabahapp.ysbdesigns.uk/index.html", { cf: { cacheTtl: 0 } });
    if (!res.ok) return { ok: true, note: "app unreachable, proceeding" };
    const html = await res.text();
    const m = html.match(/"\d{4}-\d{2}-\d{2}"\s*:\s*\{[^}]*\}[^}]*\}[^}]*\}/g);
    if (!m) return { ok: true, note: "couldn't parse app data, proceeding" };
    // find this date's block in the app's embedded data
    const block = m.find(b => b.startsWith('"' + date + '"'));
    if (!block) return { ok: true, note: "date not in app data, proceeding" };
    for (const [prayer, t] of Object.entries(rec.jamaat)) {
      if (!block.includes('"' + t + '"')) {
        return { ok: false, note: `${prayer} jamāʿah ${t} not found in the app's own timetable` };
      }
    }
    return { ok: true };
  } catch (e) {
    return { ok: true, note: "check failed, proceeding: " + e.message };
  }
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

  // Never announce a time the app itself isn't showing.
  const match = await timetableMatchesApp(rec, date);
  if (!match.ok) {
    console.error("reminder run HALTED — timetable mismatch:", match.note);
    return { halted: "timetable mismatch", detail: match.note, date, hm };
  }

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

    // At the jamāʿah time itself. tagMins is null so this reaches everyone
    // with jamāʿah reminders on, whatever advance warning they chose.
    if (jamaat === hm) {
      const key = `sent:${date}:${prayer}:now`;
      const r = await sendReminder(env, {
        key, tagMins: null,
        title: "Jamāʿah Time Now",
        body: `${label} jamāʿah is starting now at the masjid.`,
      });
      results.push({ prayer: label, mins: "now", ...r });
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
          url: "https://taiyabahapp.ysbdesigns.uk/",
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

    /* The real fix: this is now how every device sets its own tags.
       The browser SDK's own tag-write call is unreliable (see /api/force-tag
       above, and github.com/OneSignal/OneSignal-Website-SDK/issues/1093) —
       consistently 409s across every device and browser tested, despite the
       exact same subscription being trivially writable server-to-server.
       So writing tags is moved server-side entirely: the app tells us its
       own OneSignal ID and desired preferences, we do the actual PATCH here
       with the REST key, exactly like the proven-working force-tag test.

       Deliberately PUBLIC — any subscribed device calls this for itself,
       there's no admin login for a congregant turning their own reminders
       on or off. Kept safe by: rate limiting per IP, a shape check on the
       id, and a strict allow-list — this endpoint can only ever set these
       five known keys to their five known valid values. It cannot be used
       to write arbitrary data to a subscription, on this app or any other.
       POST /api/set-my-tags  { id, jamaah, jamaah_mins, janazah, announcements, events } */
    if (url.pathname === "/api/set-my-tags" && request.method === "POST") {
      /* Rate limited per device rather than per address. Everyone on the
         masjid's wifi shares one public IP, so a per-IP cap counts a whole
         congregation as a single caller: ten people opening the app a few
         times each is enough to exhaust it, and the writes that get refused
         leave those devices untagged — indistinguishable from the fault this
         endpoint exists to fix. The per-device cap is what actually bounds
         abuse here; the address cap stays as a backstop, set high enough that
         a room full of people never reaches it. */
      const ip = request.headers.get("CF-Connecting-IP") || "?";
      if (!limit(`tags-ip:${ip}`, 600, 60 * 60e3))
        return json({ error: "Too many attempts from this network. Try again shortly." }, 429, ch);

      let body = {};
      try { body = await request.json(); } catch {}

      const id = typeof body.id === "string" ? body.id : "";
      if (!/^[0-9a-f-]{20,50}$/i.test(id)) return json({ error: "Missing or malformed id" }, 400, ch);

      if (!limit(`tags-id:${id}`, 40, 60 * 60e3))
        return json({ error: "Too many preference updates for this device. Try again shortly." }, 429, ch);

      const bit = v => (v === true || v === "1" || v === 1) ? "1" : "0";
      const mins = ["5", "10", "15"].includes(String(body.jamaah_mins)) ? String(body.jamaah_mins) : "10";
      const tags = {
        jamaah:        bit(body.jamaah),
        jamaah_mins:   mins,
        janazah:       bit(body.janazah),
        announcements: bit(body.announcements),
        events:        bit(body.events),
      };

      /* Stored as one tag, not five — see the note on PREF_TAG. The app still
         sends the five preferences and still gets them back, so nothing on the
         phone needs to know how they are packed. */
      const encoded = encodePrefs(tags);

      /* The app sends whichever id it can obtain. Usually that is the user id,
         but the Web SDK does not always surface one, in which case it sends
         the subscription id instead — a device with a working subscription
         must never be left untaggable over which identifier came to hand.
         Try it as a user id, and resolve it as a subscription id if that
         record does not exist. */
      const base = `https://api.onesignal.com/apps/${env.ONESIGNAL_APP_ID}`;
      const auth = { Authorization: `Key ${env.ONESIGNAL_REST_API_KEY}` };
      let userId = id, resolvedVia = "id as given";

      const probe = await fetch(`${base}/users/by/onesignal_id/${id}`, { headers: auth });
      if (probe.status === 404) {
        const idRes = await fetch(`${base}/subscriptions/${id}/user/identity`, { headers: auth });
        if (idRes.ok) {
          const idData = await idRes.json().catch(() => ({}));
          const resolved = idData && idData.identity && idData.identity.onesignal_id;
          if (resolved) { userId = resolved; resolvedVia = "resolved from subscription id"; }
        }
      }

      const userUrl = `${base}/users/by/onesignal_id/${userId}`;
      const patch = body => fetch(userUrl, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Key ${env.ONESIGNAL_REST_API_KEY}`,
        },
        body: JSON.stringify({ properties: { tags: body } }),
      });

      /* An empty value deletes a tag, so the same write clears the
         per-category tags older builds left behind. If the plan counts those
         removals against the limit, fall back to writing the one tag alone —
         storing the preference matters more than tidying up. */
      const withCleanup = { [PREF_TAG]: encoded };
      for (const k of LEGACY_TAGS) withCleanup[k] = "";

      let res = await patch(withCleanup);
      const cleaned = res.ok;
      if (!res.ok) res = await patch({ [PREF_TAG]: encoded });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) return json({ error: `OneSignal returned ${res.status}`, tried: userId, via: resolvedVia, detail: data }, 502, ch);

      /* Read back rather than trusting the write: assuming success is exactly
         what hid the tag-limit failure for so long. */
      const check = await fetch(userUrl, { headers: { Authorization: `Key ${env.ONESIGNAL_REST_API_KEY}` } });
      const stored = check.ok
        ? ((await check.json().catch(() => ({}))).properties || {}).tags || {}
        : null;
      const prefs = stored ? decodePrefs(stored[PREF_TAG]) : null;

      if (stored && !prefs)
        return json({ error: "OneSignal did not store the categories", stored }, 502, ch);

      return json({ ok: true, cleaned, via: resolvedVia, tags: prefs || tags, stored }, 200, ch);
    }

    /* A congregant sending their own diagnostics in.

       Every fault this app has had was invisible until someone photographed
       the Having trouble panel and sent it over. This does that properly:
       the panel's own text, plus whatever the person wants to say about it.

       Unauthenticated, because a congregant has no password and the whole
       point is that it works on a phone that is misbehaving. Bounded by a
       size cap, a rate limit, and by storing only the two fields it is sent —
       nothing here is echoed back to any caller, so it cannot be used to keep
       or serve content for anyone else. Reports expire on their own.

       POST /api/report { report, note } */
    if (url.pathname === "/api/report" && request.method === "POST") {
      if (!limit(`report:${ip}`, 20, 60 * 60e3))
        return json({ error: "Too many reports from this network just now." }, 429, ch);

      let body = {};
      try { body = await request.json(); } catch {}

      const report = typeof body.report === "string" ? body.report.slice(0, REPORT_MAX) : "";
      const note   = typeof body.note   === "string" ? body.note.slice(0, 500)         : "";
      if (!report.trim()) return json({ error: "Nothing to send" }, 400, ch);

      const at = new Date().toISOString();
      const ref = at.slice(0, 19).replace(/[:T-]/g, "") + "-" +
                  Math.random().toString(36).slice(2, 6).toUpperCase();

      await env.SENT_KV.put(`report:${ref}`, JSON.stringify({ ref, at, note, report }),
        { expirationTtl: REPORT_TTL_SECONDS });

      /* Email as well, when a sender is configured. Deliberately after the
         store and deliberately not fatal: a report that reached the admin
         screen is not lost because an email provider was down or unset. */
      let emailed = false, emailError = null;
      if (env.RESEND_API_KEY && env.REPORT_EMAIL) {
        try {
          const r = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${env.RESEND_API_KEY}`,
            },
            body: JSON.stringify({
              from: env.REPORT_FROM || "Taiyabah App <onboarding@resend.dev>",
              to: [env.REPORT_EMAIL],
              subject: `Taiyabah app diagnostic ${ref}`,
              text: [note ? `They said:\n${note}\n` : "(no note)\n",
                     `Reference: ${ref}`, `Sent: ${at}`, "", report].join("\n"),
            }),
          });
          emailed = r.ok;
          if (!r.ok) emailError = `Resend returned ${r.status}`;
        } catch (e) { emailError = e && e.message ? e.message : String(e); }
      }

      // the reference is the person's receipt, so they can quote it
      return json({ ok: true, ref, emailed, emailError }, 200, ch);
    }

    /* Reports, newest first. Admin only — these carry device identifiers. */
    if (url.pathname === "/api/reports" && request.method === "GET") {
      const token = (request.headers.get("Authorization") || "").replace(/^Bearer /, "");
      if (!(await validToken(token, env.SESSION_SECRET))) return json({ error: "Not signed in" }, 401, ch);

      const list = await env.SENT_KV.list({ prefix: "report:", limit: 60 });
      const items = [];
      for (const k of list.keys) {
        const v = await env.SENT_KV.get(k.name);
        if (v) { try { items.push(JSON.parse(v)); } catch {} }
      }
      items.sort((a, b) => (a.at < b.at ? 1 : -1));
      return json({ ok: true, count: items.length, reports: items }, 200, ch);
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
      return json({
        ok: true,
        onesignal_id: data.identity && data.identity.onesignal_id,
        tags: (data.properties && data.properties.tags) || {},
        prefs: decodePrefs((((data.properties || {}).tags) || {})[PREF_TAG]),
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
