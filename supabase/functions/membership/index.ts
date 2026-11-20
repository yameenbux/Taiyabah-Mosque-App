// Membership lock-down — the only door to the register.
//
// A member proves control of the email on their record, then sees their own
// household's records and nothing else. There is no password and no account:
// a six-digit code to the email on file, then a session token the app keeps.
// This matches the masjid's rule that asking 1,490 men to hold an account to
// pay once a year is how the Excel sheet wins.
//
// Three actions, all through the service role (the four member_* tables are
// RLS deny-all, so the app's publishable key can read none of them):
//   request-code { masjid, email }            -> { ok }            (always neutral)
//   verify-code  { masjid, email, code }       -> { ok, token } | { ok:false, reason }
//   area         { masjid, token }             -> { ok, members[], as_of } | { ok:false }
//
// NEUTRALITY. request-code answers the same whether or not the email is on the
// register, and whether or not a code was actually sent. Otherwise the screen
// becomes a way to confirm that a named person is a member of this masjid, and
// membership is special-category data. verify-code never says which part was
// wrong.
//
// Deployed to project phenbhmobxwyvdeshvqw, function slug `membership`,
// verify_jwt=false. Needs the RESEND_API_KEY secret to send mail; without it
// request-code still answers neutrally and the member can ring the office.

import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";

const SENDER = "Taiyabah Masjid <noreply@send.masjidone.co.uk>";
const REPLY_TO = "support@ysbdesigns.uk";

const CODE_TTL_MIN = 10;      // a code is good for ten minutes
const SESSION_TTL_DAYS = 60;  // then the member logs in again
const MAX_ATTEMPTS = 5;       // guesses per code
const MAX_SENDS_PER_HOUR = 3; // codes per email per hour
const GLOBAL_SENDS_PER_MIN = 30; // a soft ceiling on the whole masjid

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const db = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

function normEmail(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const e = raw.trim().toLowerCase();
  if (!e || e.length > 254 || !e.includes("@") || e.includes(" ")) return null;
  return e;
}

async function sha256hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function sixDigits(): string {
  // crypto-random, uniform over 000000..999999
  const n = crypto.getRandomValues(new Uint32Array(1))[0] % 1000000;
  return n.toString().padStart(6, "0");
}

function newToken(): string {
  const b = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...b)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function audit(masjid: string, email_norm: string | null, event: string) {
  try { await db.from("member_audit").insert({ masjid, email_norm, event }); } catch { /* audit is best-effort */ }
}

async function sendEmail(to: string, code: string): Promise<boolean> {
  if (!RESEND_API_KEY) return false;
  const text =
    `Assalamu alaikum,\n\n` +
    `Your Taiyabah Masjid membership code is ${code}.\n\n` +
    `Enter it in the app to see your membership. It lasts ${CODE_TTL_MIN} minutes.\n\n` +
    `If you did not ask for this, you can ignore this email — nobody can see your record without this code.\n\n` +
    `Taiyabah Masjid · Bolton Central Islamic Society`;
  const html =
    `<div style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;max-width:440px;margin:0 auto;color:#2A2430">` +
    `<p style="font-size:15px">Assalamu alaikum,</p>` +
    `<p style="font-size:15px">Your Taiyabah Masjid membership code is:</p>` +
    `<p style="font-size:34px;letter-spacing:8px;font-weight:700;margin:18px 0;color:#3C0B2A">${code}</p>` +
    `<p style="font-size:14px;color:#6B6069">Enter it in the app to see your membership. It lasts ${CODE_TTL_MIN} minutes.</p>` +
    `<p style="font-size:13px;color:#6B6069">If you did not ask for this, you can ignore this email — nobody can see your record without this code.</p>` +
    `<hr style="border:none;border-top:1px solid #E4DECF;margin:18px 0">` +
    `<p style="font-size:12px;color:#9A8F98">Taiyabah Masjid · Bolton Central Islamic Society · Registered charity 1041569</p>` +
    `</div>`;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Authorization": `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: SENDER, to, reply_to: REPLY_TO, subject: `Your membership code: ${code}`, text, html }),
    });
    return res.ok;
  } catch { return false; }
}

async function requestCode(masjid: string, email: string) {
  const nowIso = new Date().toISOString();
  // global soft ceiling
  const since = new Date(Date.now() - 60_000).toISOString();
  const { count: globalCount } = await db.from("member_otp")
    .select("id", { count: "exact", head: true }).eq("masjid", masjid).gte("created_at", since);
  if ((globalCount ?? 0) >= GLOBAL_SENDS_PER_MIN) return json({ ok: true });

  // per-email hourly ceiling
  const hourAgo = new Date(Date.now() - 3_600_000).toISOString();
  const { count: emailCount } = await db.from("member_otp")
    .select("id", { count: "exact", head: true })
    .eq("masjid", masjid).eq("email_norm", email).gte("created_at", hourAgo);
  if ((emailCount ?? 0) >= MAX_SENDS_PER_HOUR) { await audit(masjid, email, "blocked"); return json({ ok: true }); }

  // is this email on the register at all? If not, send nothing and say the same.
  const { data: member } = await db.from("members")
    .select("id").eq("masjid", masjid).eq("email_norm", email).limit(1).maybeSingle();
  if (!member) { await audit(masjid, email, "no_member"); return json({ ok: true }); }

  const code = sixDigits();
  const code_hash = await sha256hex(`${masjid}:${email}:${code}`);
  const expires_at = new Date(Date.now() + CODE_TTL_MIN * 60_000).toISOString();
  const { error: insErr } = await db.from("member_otp")
    .insert({ masjid, email_norm: email, code_hash, expires_at, created_at: nowIso });
  if (insErr) return json({ ok: false, error: "server" }, 200);

  const sent = await sendEmail(email, code);
  await audit(masjid, email, sent ? "sent" : "failed");
  // Neutral either way; if the send provider is down the app still shows the
  // code screen and the member can retry or ring the office.
  return json({ ok: true });
}

async function verifyCode(masjid: string, email: string, code: string) {
  if (!/^[0-9]{6}$/.test(code)) return json({ ok: false, reason: "bad" });
  const { data: otp } = await db.from("member_otp")
    .select("id, code_hash, attempts, expires_at, consumed_at")
    .eq("masjid", masjid).eq("email_norm", email)
    .is("consumed_at", null).gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (!otp) { await audit(masjid, email, "failed"); return json({ ok: false, reason: "expired" }); }
  if (otp.attempts >= MAX_ATTEMPTS) { await audit(masjid, email, "blocked"); return json({ ok: false, reason: "locked" }); }

  await db.from("member_otp").update({ attempts: otp.attempts + 1 }).eq("id", otp.id);
  const code_hash = await sha256hex(`${masjid}:${email}:${code}`);
  if (code_hash !== otp.code_hash) { await audit(masjid, email, "failed"); return json({ ok: false, reason: "bad" }); }

  // Good. Burn the code, mint a session.
  await db.from("member_otp").update({ consumed_at: new Date().toISOString() }).eq("id", otp.id);
  const token = newToken();
  const token_hash = await sha256hex(token);
  const expires_at = new Date(Date.now() + SESSION_TTL_DAYS * 86_400_000).toISOString();
  const { error } = await db.from("member_session").insert({ token_hash, masjid, email_norm: email, expires_at });
  if (error) return json({ ok: false, reason: "server" });
  await audit(masjid, email, "verified");
  return json({ ok: true, token });
}

async function area(masjid: string, token: string) {
  if (typeof token !== "string" || token.length < 20) return json({ ok: false });
  const token_hash = await sha256hex(token);
  const { data: sess } = await db.from("member_session")
    .select("id, email_norm, expires_at")
    .eq("masjid", masjid).eq("token_hash", token_hash)
    .gt("expires_at", new Date().toISOString()).maybeSingle();
  if (!sess) return json({ ok: false });

  // slide the session forward so an active member is not logged out mid-use
  await db.from("member_session").update({ last_used_at: new Date().toISOString() }).eq("id", sess.id);

  const { data: rows } = await db.from("members")
    .select("id, full_name, status, note, total_invoiced_p, total_paid_p, outstanding_p, as_of")
    .eq("masjid", masjid).eq("email_norm", sess.email_norm)
    .order("full_name", { ascending: true });
  const members = (rows ?? []).map((r) => ({
    id: r.id, name: r.full_name, status: r.status, note: r.note,
    invoiced_p: r.total_invoiced_p, paid_p: r.total_paid_p, outstanding_p: r.outstanding_p,
    as_of: r.as_of,
  }));
  const as_of = members.reduce((a: string | null, m: any) => m.as_of && (!a || m.as_of > a) ? m.as_of : a, null);
  return json({ ok: true, members, as_of });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ ok: false, error: "method" }, 405);
  let body: any;
  try { body = await req.json(); } catch { return json({ ok: false, error: "bad_json" }, 400); }

  const masjid = typeof body?.masjid === "string" ? body.masjid : "";
  if (!masjid) return json({ ok: false, error: "masjid" }, 400);
  const action = body?.action;

  try {
    if (action === "request-code") {
      const email = normEmail(body?.email);
      if (!email) return json({ ok: false, error: "email" }, 200); // malformed email, tell the app to re-ask
      return await requestCode(masjid, email);
    }
    if (action === "verify-code") {
      const email = normEmail(body?.email);
      if (!email) return json({ ok: false, reason: "bad" });
      return await verifyCode(masjid, email, String(body?.code ?? ""));
    }
    if (action === "area") {
      return await area(masjid, String(body?.token ?? ""));
    }
    return json({ ok: false, error: "action" }, 400);
  } catch (e) {
    console.error("membership error", e);
    return json({ ok: false, error: "server" }, 200);
  }
});
