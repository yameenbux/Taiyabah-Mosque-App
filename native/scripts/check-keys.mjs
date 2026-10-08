/**
 * Taiyabah Masjid — does the app hold the same key the website holds?
 * Copyright (c) 2026 Yameen Bux. All rights reserved. See LICENSE.md.
 *
 * From the day the native app was first wired up until 8 October 2026,
 * src/supabase.js carried a publishable key the project answers 401 "Invalid
 * API key" to, while index.html carried the right one. Nothing said so. The app
 * authenticated to nothing for months: published prayer times fell back to the
 * timetable bundled into the app, notices stayed empty, every form submission
 * failed, and not one crash was ever reported — app_crashes sat empty and was
 * read as good news.
 *
 * Every one of those paths is deliberately written to degrade quietly rather
 * than shout, which is right when somebody is on a train and wrong when the key
 * is bad, because the two are indistinguishable from inside the app. So the
 * check cannot be "does it work" — it has to be "do these two files agree", and
 * that is answerable here, with no network and no secrets.
 *
 *   node scripts/check-keys.mjs
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "../..");
const read = p => fs.readFileSync(path.join(ROOT, p), "utf8");

const KEY = /sb_publishable_[A-Za-z0-9_]{8,}/g;
const keysIn = p => [...new Set(read(p).match(KEY) || [])];

/* The website is the reference: it is deployed continuously and somebody would
 * notice within the hour if its key were wrong. */
const WEBSITE = "index.html";
const MUST_MATCH = ["native/src/supabase.js", "portal/config.js"];

let bad = 0;
const say = (ok, line) => { console.log(`${ok ? "✓" : "✗"} ${line}`); if (!ok) bad++; };

const site = keysIn(WEBSITE);
if (site.length !== 1) {
  say(false, `${WEBSITE} holds ${site.length} publishable keys — there should be exactly one`);
  process.exit(1);
}
const want = site[0];
console.log(`the website's key ends …${want.slice(-6)}\n`);

for (const f of MUST_MATCH) {
  const got = keysIn(f);
  if (!got.length) say(false, `${f} holds no publishable key at all`);
  else if (got.length > 1) say(false, `${f} holds ${got.length} different keys — one of them must be stale`);
  else if (got[0] !== want) say(false, `${f} ends …${got[0].slice(-6)}, the website ends …${want.slice(-6)} — the app would get 401 Invalid API key and fail silently everywhere`);
  else say(true, `${f} matches the website`);
}

/* The other half of the rule: a secret key must never be in anything that
 * reaches a browser or a phone. Checked by shape, so a newly-minted one is
 * caught without anybody adding it to a list.
 *
 * Deliberately NOT the bare word "service_role": index.html and portal/config.js
 * both carry a comment saying never to put that key there, which is the right
 * thing for those files to say, and a check that fires on the warning against
 * the mistake is a check people learn to ignore. So: a secret key by its
 * prefix, or a JWT that actually declares itself service_role once decoded. */
const SECRET = /\bsb_secret_[A-Za-z0-9_]{8,}/;
const JWT = /\beyJ[A-Za-z0-9_-]{8,}\.([A-Za-z0-9_-]{16,})\.[A-Za-z0-9_-]{8,}/g;
const serviceRoleJwt = body => {
  for (const m of body.matchAll(JWT)) {
    try {
      if (/"role"\s*:\s*"service_role"/.test(Buffer.from(m[1], "base64url").toString("utf8")))
        return true;
    } catch {}
  }
  return false;
};
const WALK = ["native/src", "native/plugins", "portal", "index.html", "sw.js", "admin.html"];
const offenders = [];
function walk(rel) {
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) return;
  if (fs.statSync(abs).isDirectory()) {
    for (const f of fs.readdirSync(abs)) if (f !== "node_modules") walk(path.join(rel, f));
    return;
  }
  if (!/\.(js|jsx|mjs|cjs|ts|tsx|html|json)$/.test(rel)) return;
  const body = fs.readFileSync(abs, "utf8");
  /* This file names the shapes it looks for. */
  if (rel.endsWith("check-keys.mjs")) return;
  if (SECRET.test(body)) offenders.push(`${rel} contains a secret key (sb_secret_…)`);
  else if (serviceRoleJwt(body)) offenders.push(`${rel} contains a JWT whose role is service_role`);
}
for (const r of WALK) walk(r);

console.log();
if (offenders.length) for (const o of offenders) say(false, o);
else say(true, "no secret key or service_role reference in anything that ships");

process.exit(bad ? 1 : 0);
