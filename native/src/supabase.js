/* The same project the web app talks to, read with the same publishable key.
 *
 * This key is meant to be public: every policy that matters lives in the
 * database as row-level security, which is why 63 tables have it on and 47 of
 * them are deny-all. The secret key never comes near an app anyone installs.
 */
const URL = "https://phenbhmobxwyvdeshvqw.supabase.co";
const ANON = "sb_publishable_mOPuQKVP8WCTGGJdQK1yJw_e0MSu3_W";

/* A fetch rather than the full client: the app reads two public views and
 * nothing else, and the SDK is 100KB to do what one request does. */
export async function readView(view, { select = "*", order, limit } = {}) {
  const q = new URLSearchParams({ select });
  if (order) q.set("order", order);
  if (limit) q.set("limit", String(limit));
  const res = await fetch(`${URL}/rest/v1/${view}?${q}`, {
    headers: { apikey: ANON, Authorization: `Bearer ${ANON}` },
  });
  if (!res.ok) throw new Error(`${view}: ${res.status}`);
  return res.json();
}
