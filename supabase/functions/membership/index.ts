// Membership lock-down — member login by email code, now reading the canonical
// register (masjid_members + membership_years/payments). A member proves control
// of the email on their record, then sees their own household's records with a
// LIVE balance computed by membership_state. No password, no account.
//
//   request-code { masjid, email }       -> { ok }            (always neutral)
//   verify-code  { masjid, email, code }  -> { ok, token } | { ok:false, reason }
//   area         { masjid, token }        -> { ok, members[], as_of, year } | { ok:false }
//
// Each member in `area` carries a `this_year` block — whether the current
// membership year has been charged to them, and whether it is settled — so the
// app can show "paid for this year" rather than inferring it from a total that
// reads the same for a member who has paid and a member never charged.
//
// The four member_* OTP tables stay deny-all; this runs as service_role.

import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";

const SENDER = "Taiyabah Masjid <noreply@send.masjidone.co.uk>";
const REPLY_TO = "support@ysbdesigns.uk";

// slug -> masjid_members.masjid_id. Hardcoded so the login does not depend on a
// read of the masjids table.
const MASJID_IDS: Record<string, string> = {
  taiyabah: "f1a55e9e-2215-4831-b9b9-c257e9b1fe0e",
};

const CODE_TTL_MIN = 10;
const SESSION_TTL_DAYS = 60;
const MAX_ATTEMPTS = 5;
const MAX_SENDS_PER_HOUR = 3;
const GLOBAL_SENDS_PER_MIN = 30;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const db = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });
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
  const n = crypto.getRandomValues(new Uint32Array(1))[0] % 1000000;
  return n.toString().padStart(6, "0");
}
function newToken(): string {
  const b = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...b)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
async function audit(masjid: string, email_norm: string | null, event: string) {
  try { await db.from("member_audit").insert({ masjid, email_norm, event }); } catch { /* best effort */ }
}
async function sendEmail(to: string, code: string): Promise<boolean> {
  if (!RESEND_API_KEY) return false;
  const text =
    `Assalamu alaikum,\n\nYour Taiyabah Masjid membership code is ${code}.\n\n` +
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
    `<p style="font-size:12px;color:#9A8F98">Taiyabah Masjid · Bolton Central Islamic Society · Registered charity 1041569</p></div>`;
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
  const masjidId = MASJID_IDS[masjid];
  if (!masjidId) return json({ ok: true });
  const since = new Date(Date.now() - 60_000).toISOString();
  const { count: globalCount } = await db.from("member_otp")
    .select("id", { count: "exact", head: true }).eq("masjid", masjid).gte("created_at", since);
  if ((globalCount ?? 0) >= GLOBAL_SENDS_PER_MIN) return json({ ok: true });
  const hourAgo = new Date(Date.now() - 3_600_000).toISOString();
  const { count: emailCount } = await db.from("member_otp")
    .select("id", { count: "exact", head: true })
    .eq("masjid", masjid).eq("email_norm", email).gte("created_at", hourAgo);
  if ((emailCount ?? 0) >= MAX_SENDS_PER_HOUR) { await audit(masjid, email, "blocked"); return json({ ok: true }); }

  // On the register? Match the normalised email on the canonical table.
  const { data: member } = await db.from("masjid_members")
    .select("id").eq("masjid_id", masjidId).eq("email_norm", email).limit(1).maybeSingle();
  if (!member) { await audit(masjid, email, "no_member"); return json({ ok: true }); }

  const code = sixDigits();
  const code_hash = await sha256hex(`${masjid}:${email}:${code}`);
  const expires_at = new Date(Date.now() + CODE_TTL_MIN * 60_000).toISOString();
  const { error: insErr } = await db.from("member_otp")
    .insert({ masjid, email_norm: email, code_hash, expires_at });
  if (insErr) return json({ ok: false, error: "server" }, 200);
  const sent = await sendEmail(email, code);
  await audit(masjid, email, sent ? "sent" : "failed");
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
  const masjidId = MASJID_IDS[masjid];
  const token_hash = await sha256hex(token);
  const { data: sess } = await db.from("member_session")
    .select("id, email_norm, expires_at").eq("masjid", masjid).eq("token_hash", token_hash)
    .gt("expires_at", new Date().toISOString()).maybeSingle();
  if (!sess || !masjidId) return json({ ok: false });
  await db.from("member_session").update({ last_used_at: new Date().toISOString() }).eq("id", sess.id);

  // The membership year the office is currently on, so "this year" means the
  // same thing in the app as on the office screen.
  const { data: cy } = await db.rpc("membership_current_year", { p_masjid: masjidId });
  const currentYear = Number(cy) || new Date().getUTCFullYear();

  const { data: rows } = await db.from("masjid_members")
    .select("id, full_name, note").eq("masjid_id", masjidId)
    .eq("email_norm", sess.email_norm).is("left_on", null)
    .order("full_name", { ascending: true });
  const today = new Date().toISOString().slice(0, 10);
  const members = [];
  for (const r of rows ?? []) {
    const { data: st } = await db.rpc("membership_state", { p_member: r.id });
    const years = (st && Array.isArray(st.years)) ? st.years : [];
    const invoiced = years.reduce((a: number, y: any) => a + (y.net_p || 0), 0);
    const paid = years.reduce((a: number, y: any) => a + (y.paid_p || 0), 0);
    // This year's own line, if the office has charged it to this member.
    const ty = years.find((y: any) => Number(y.year) === currentYear) || null;
    const this_year = {
      year: currentYear,
      charged: !!ty,
      settled: !!(ty && (ty.settled || ty.waived)),
      net_p: ty ? (ty.net_p || 0) : 0,
      paid_p: ty ? (ty.paid_p || 0) : 0,
      outstanding_p: ty ? (ty.outstanding_p || 0) : 0,
    };
    members.push({
      id: r.id, name: r.full_name, status: r.note,
      invoiced_p: invoiced, paid_p: paid,
      outstanding_p: (st && st.outstanding_p) || 0, as_of: today,
      this_year,
    });
  }
  return json({ ok: true, members, as_of: today, year: currentYear });
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
      if (!email) return json({ ok: false, error: "email" }, 200);
      return await requestCode(masjid, email);
    }
    if (action === "verify-code") {
      const email = normEmail(body?.email);
      if (!email) return json({ ok: false, reason: "bad" });
      return await verifyCode(masjid, email, String(body?.code ?? ""));
    }
    if (action === "area") return await area(masjid, String(body?.token ?? ""));
    return json({ ok: false, error: "action" }, 400);
  } catch (e) {
    console.error("membership error", e);
    return json({ ok: false, error: "server" }, 200);
  }
});
