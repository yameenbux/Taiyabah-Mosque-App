/* The same project the web app talks to, read with the same publishable key.
 *
 * This key is meant to be public: every policy that matters lives in the
 * database as row-level security, which is why 63 tables have it on and 47 of
 * them are deny-all. The secret key never comes near an app anyone installs.
 */
const URL = "https://phenbhmobxwyvdeshvqw.supabase.co";
const ANON = "sb_publishable_mOPuQKVP8WCTGGJdQK1yJw_e0MSu3_W";

const HEAD = { apikey: ANON, Authorization: `Bearer ${ANON}`, "Content-Type": "application/json" };

/* Nothing here waits for ever. A request that hangs on a bad connection has to
 * come back as an error the screen can show, not a spinner the user watches. */
async function go(path, init, ms = 12000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(`${URL}/rest/v1/${path}`, { ...init, signal: ctrl.signal, headers: HEAD });
  } finally { clearTimeout(timer); }
}

/* A fetch rather than the full client: the app reads a handful of public views
 * and calls a handful of functions, and the SDK is 100KB to do what one
 * request does. */
export async function readView(view, { select = "*", order, limit } = {}) {
  const q = new URLSearchParams({ select });
  if (order) q.set("order", order);
  if (limit) q.set("limit", String(limit));
  const res = await go(`${view}?${q}`, { method: "GET" });
  if (!res.ok) throw new Error(`${view}: ${res.status}`);
  return res.json();
}

/* Every write the app makes goes through a Postgres function, never a table.
 * The function is what takes the lock, enforces the horizon, holds the slot and
 * refuses the second person — and it is what speaks to the applicant directly
 * when something is wrong. So where it gives a sentence, we show that sentence
 * rather than an apology over the top of it. */
export async function rpc(fn, payload) {
  const res = await go(`rpc/${fn}`, { method: "POST", body: JSON.stringify({ payload }) });
  const body = await res.text();
  if (res.ok) { try { return { ok: true, data: JSON.parse(body) || {} }; } catch { return { ok: true, data: {} }; } }
  let message = null;
  try { const j = JSON.parse(body); if (j && j.message && /^[A-Z]/.test(j.message)) message = j.message; } catch {}
  return { ok: false, status: res.status, message, body };
}

/* Is the office taking these requests at all? Asked of Postgres rather than a
 * flag somebody edits by hand, so the app and the website cannot drift. An
 * empty payload is a safe question: the function validates before it touches
 * the table, so it raises "please choose a date" and writes nothing. */
export async function isOpen(fn) {
  try {
    const r = await rpc(fn, {});
    if (r.ok) return true;
    return !(r.status === 404 || /PGRST202/.test(r.body || ""));
  } catch { return false; }
}
