/* ============================================================================
   Taiyabah Masjid — notification sender service
   ----------------------------------------------------------------------------
   The trustee compose screen (admin.html) is served from GitHub Pages as a
   static file, so it can never hold the OneSignal REST API key — anyone
   viewing the page source would be able to message the whole congregation.
   This Worker is the one place that key lives.

   Routes:
     POST /api/login   { password }              -> { token }
     POST /api/send     Bearer token, { topic, title, body } -> { id, recipients }

   Auth is a signed, expiring bearer token (HMAC-SHA256 over header+payload,
   verified with a constant-time comparison) rather than a session store —
   there is no database here, so nothing to provision.

   Required secrets (set with `wrangler secret put <NAME>`):
     TRUSTEE_PASSWORD        shared password trustees sign in with
     SESSION_SECRET          random string used to sign/verify tokens
     ONESIGNAL_APP_ID        Taiyabah Masjid's OneSignal app id
     ONESIGNAL_REST_API_KEY  OneSignal REST API key (server-side only)
   ========================================================================= */

const ALLOWED_ORIGIN = "https://yameenbux.github.io";
const TOKEN_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours
const TOPICS = new Set(["jamaah", "janazah", "announcements", "events"]);

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders() },
  });
}

function badRequest(msg) {
  return json({ error: msg }, 400);
}

/* ---------- base64url helpers ---------- */
function toB64url(bytes) {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function fromB64url(str) {
  const b64 = str.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((str.length + 3) % 4);
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}
function utf8(str) {
  return new TextEncoder().encode(str);
}

async function hmac(secret, data) {
  const key = await crypto.subtle.importKey(
    "raw", utf8(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, utf8(data));
  return new Uint8Array(sig);
}

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

/* ---------- tokens: base64url(payload) + "." + base64url(hmac) ---------- */
async function issueToken(secret) {
  const payload = JSON.stringify({ exp: Date.now() + TOKEN_TTL_MS });
  const payloadB64 = toB64url(utf8(payload));
  const sig = await hmac(secret, payloadB64);
  return `${payloadB64}.${toB64url(sig)}`;
}

async function verifyToken(secret, token) {
  if (!token || typeof token !== "string" || !token.includes(".")) return false;
  const [payloadB64, sigB64] = token.split(".");
  const expected = await hmac(secret, payloadB64);
  const given = fromB64url(sigB64);
  if (!timingSafeEqual(expected, given)) return false;
  try {
    const { exp } = JSON.parse(new TextDecoder().decode(fromB64url(payloadB64)));
    return typeof exp === "number" && Date.now() < exp;
  } catch {
    return false;
  }
}

/* password check via HMAC digest comparison, so neither length nor content
   of the real password is exposed by timing */
async function passwordMatches(secret, given, expected) {
  const [a, b] = await Promise.all([hmac(secret, given), hmac(secret, expected)]);
  return timingSafeEqual(a, b);
}

function bearerToken(req) {
  const h = req.headers.get("Authorization") || "";
  const m = /^Bearer\s+(.+)$/i.exec(h);
  return m ? m[1] : "";
}

async function handleLogin(req, env) {
  let body;
  try { body = await req.json(); } catch { return badRequest("Invalid JSON body"); }
  const password = typeof body.password === "string" ? body.password : "";
  if (!password) return badRequest("Password required");

  const ok = await passwordMatches(env.SESSION_SECRET, password, env.TRUSTEE_PASSWORD);
  if (!ok) return json({ error: "Incorrect password" }, 401);

  const token = await issueToken(env.SESSION_SECRET);
  return json({ token });
}

async function handleSend(req, env) {
  const authed = await verifyToken(env.SESSION_SECRET, bearerToken(req));
  if (!authed) return json({ error: "Please sign in again" }, 401);

  let body;
  try { body = await req.json(); } catch { return badRequest("Invalid JSON body"); }
  const { topic, title, body: msg } = body;
  if (!TOPICS.has(topic)) return badRequest("Unknown topic");
  if (!title || !msg) return badRequest("Title and message are required");

  const res = await fetch("https://onesignal.com/api/v1/notifications", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Key ${env.ONESIGNAL_REST_API_KEY}`,
    },
    body: JSON.stringify({
      app_id: env.ONESIGNAL_APP_ID,
      headings: { en: title },
      contents: { en: msg },
      filters: [{ field: "tag", key: topic, relation: "=", value: "1" }],
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail = Array.isArray(data.errors) ? data.errors.join("; ") : (data.errors || "OneSignal rejected the request");
    return json({ error: detail }, 502);
  }

  return json({ id: data.id, recipients: data.recipients ?? null });
}

export default {
  async fetch(req, env) {
    if (req.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders() });
    }

    const { pathname } = new URL(req.url);
    if (req.method === "POST" && pathname === "/api/login") return handleLogin(req, env);
    if (req.method === "POST" && pathname === "/api/send") return handleSend(req, env);

    return json({ error: "Not found" }, 404);
  },
};
