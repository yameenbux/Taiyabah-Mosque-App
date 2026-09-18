#!/usr/bin/env node
/* Pre-release checks for the notification path.
 *
 * Three of the faults that reached real phones were configuration, not logic,
 * and each one failed silently:
 *
 *   - wrangler.toml gained a duplicate `main`, so every deploy failed and the
 *     live Worker quietly stayed on an older build
 *   - the app moved to its own domain while ALLOWED_ORIGIN still named the old
 *     one, so every call came back with no CORS headers
 *   - the app called an endpoint the deployed Worker did not have
 *
 * None of them would fail a unit test, and all three are visible from the
 * files alone. Run this before shipping: `node scripts/check-release.mjs`.
 */
import { readFileSync, existsSync } from "node:fs";
import { execSync, execFileSync } from "node:child_process";
import { createHash } from "node:crypto";

const R = (p) => readFileSync(p, "utf8");
const problems = [];
const notes = [];
const fail = (m) => problems.push(m);
const ok   = (m) => notes.push(m);

/* ---- 1. wrangler.toml is valid and names one entry point ---- */
let workerEntry = null;
if (!existsSync("worker/wrangler.toml")) fail("worker/wrangler.toml is missing");
else {
  const toml = R("worker/wrangler.toml");
  const bare = toml.split("\n").filter(l => !l.trim().startsWith("#"));
  for (const key of ["main", "compatibility_date", "name"]) {
    const n = bare.filter(l => new RegExp(`^\\s*${key}\\s*=`).test(l)).length;
    if (n > 1) fail(`wrangler.toml defines "${key}" ${n} times — Wrangler rejects the whole file`);
  }
  const m = bare.find(l => /^\s*main\s*=/.test(l));
  workerEntry = m && m.split("=")[1].trim().replace(/["']/g, "");
  if (!workerEntry) fail("wrangler.toml has no `main`");
  else if (!existsSync(`worker/${workerEntry}`)) fail(`wrangler.toml points main at "${workerEntry}", which does not exist`);
  else ok(`Worker entry point: ${workerEntry}`);
}

/* ---- 2. the app's origin is allowed by the Worker ---- */
const origins = [];
if (existsSync("CNAME")) origins.push("https://" + R("CNAME").trim());
if (workerEntry && existsSync("worker/wrangler.toml")) {
  const line = R("worker/wrangler.toml").split("\n").find(l => /^\s*ALLOWED_ORIGIN\s*=/.test(l));
  const allowed = line ? line.split("=").slice(1).join("=").trim().replace(/["']/g, "").split(",").map(s => s.trim()) : [];
  for (const o of origins) {
    if (!allowed.includes(o)) fail(`the app is served from ${o}, but ALLOWED_ORIGIN does not list it — every call from the app will be blocked by CORS`);
    else ok(`origin allowed: ${o}`);
  }
}

/* ---- 3. every endpoint the app calls exists in the Worker that deploys ---- */
if (workerEntry && existsSync(`worker/${workerEntry}`)) {
  const worker = R(`worker/${workerEntry}`);
  const called = new Set();
  for (const f of ["index.html", "admin.html"]) {
    if (!existsSync(f)) continue;
    for (const m of R(f).matchAll(/["'`](\/api\/[a-z0-9-]+)/gi)) called.add(m[1]);
  }
  for (const path of [...called].sort()) {
    if (!worker.includes(`"${path}"`)) fail(`the app calls ${path}, but ${workerEntry} does not serve it`);
    else ok(`endpoint served: ${path}`);
  }
  if (!worker.includes('"/api/health"'))
    fail(`${workerEntry} has no /api/health — the deploy workflow curls it and will fail the job`);
}

/* ---- 3b. OneSignal's worker is served at every path it may be asked for ----
 * OneSignal stores the service worker path in its own dashboard, which can name
 * a path this repo no longer serves. When it does, init() fails with "load
 * failed" and nothing about the app looks wrong. Serving the file at each known
 * path keeps push working whatever the dashboard says. */
for (const dir of ["push/onesignal", "Taiyabah-Mosque-App/push/onesignal"]) {
  for (const f of ["OneSignalSDKWorker.js", "OneSignalSDKUpdaterWorker.js"]) {
    if (!existsSync(`${dir}/${f}`)) fail(`${dir}/${f} is missing — if OneSignal asks for this path, init() fails and no device can subscribe`);
    else if (!R(`${dir}/${f}`).includes("importScripts")) fail(`${dir}/${f} does not importScripts the OneSignal SDK`);
    else ok(`push worker served: ${dir}/${f}`);
  }
}

/* ---- 3c. the Qur'an is complete ----
 * Scripture with a sūrah missing, or an āyah dropped by a half-written file,
 * must never reach a phone. The counts are canonical (Kufan/Hafs); the files
 * are checked against them, not the other way round. Rebuild with
 * `node scripts/fetch-quran.mjs`, which verifies before it writes. */
const AYAHS = [7,286,200,176,120,165,206,75,129,109,123,111,43,52,99,128,111,110,98,135,
112,78,118,64,77,227,93,88,69,60,34,30,73,54,45,83,182,88,75,85,54,53,89,59,37,35,38,29,
18,45,60,49,62,55,78,96,29,22,24,13,14,11,11,18,12,12,30,52,52,44,28,28,20,56,40,31,50,
40,46,42,29,19,36,25,22,17,19,26,30,20,15,21,11,8,8,19,5,8,8,11,11,8,3,9,5,4,7,3,6,3,5,4,5,6];
if (existsSync("quran/surahs/index.json")) {
  let bad = 0, total = 0;
  const idx = JSON.parse(R("quran/surahs/index.json"));
  if (!idx.surahs || idx.surahs.length !== 114) { fail(`quran index lists ${idx.surahs ? idx.surahs.length : 0} sūrahs, expected 114`); bad++; }
  for (let n = 1; n <= 114; n++) {
    const f = `quran/surahs/${n}.json`;
    if (!existsSync(f)) { fail(`${f} is missing`); bad++; continue; }
    let d; try { d = JSON.parse(R(f)); } catch { fail(`${f} is not valid JSON`); bad++; continue; }
    const got = (d.verses || []).length;
    if (got !== AYAHS[n - 1]) { fail(`sūrah ${n} has ${got} āyāt, expected ${AYAHS[n - 1]}`); bad++; continue; }
    if (d.verses.some(v => !String(v.ar || "").trim())) { fail(`sūrah ${n} has an empty Arabic āyah`); bad++; continue; }
    total += got;
  }
  if (!bad) ok(`Qur'an complete: 114 sūrahs, ${total} āyāt, all counts canonical`);
} else {
  notes.push("Qur'an data not present — run node scripts/fetch-quran.mjs");
}

/* ---- 3d. the 40 Rabbanā still match the Mus-haf ---- */
if (existsSync("quran/rabbanas.js") && existsSync("quran/surahs/1.json")) {
  try {
    execSync("node scripts/verify-rabbanas.mjs", { stdio: "pipe" });
    ok("40 Rabbanā verified against the Qur'an text");
  } catch (e) {
    const out = String(e.stdout || "") + String(e.stderr || "");
    fail("a Rabbanā duʿā no longer matches the āyah it cites — run node scripts/verify-rabbanas.mjs"
      + (out.match(/#\d+[^\n]*/) ? ` (${out.match(/#\d+[^\n]*/)[0].trim()})` : ""));
  }
}

/* ---- 3e. translations cover every string ----
 * A missing key falls back to English rather than crashing, which is exactly
 * why it needs checking: a half-translated screen looks deliberate and nobody
 * reports it. */
if (existsSync("scripts/check-i18n.mjs")) {
  try {
    const out = execSync("node scripts/check-i18n.mjs", { encoding: "utf8" });
    ok(out.trim().split("\n").filter(l => l.includes("ok")).map(l => l.replace(/^\s*ok\s+/, "")).join("; ")
       || "translations complete");
  } catch (e) {
    const out = String(e.stdout || "") + String(e.stderr || "");
    for (const line of out.split("\n").filter(l => l.includes("FAIL")))
      fail("i18n — " + line.replace(/^\s*FAIL\s+/, "").trim());
  }
}

/* ---- 3f. no CSS custom property is used without being defined ----
 * var(--brand) was used in three rules and defined nowhere. A missing custom
 * property does not fail loudly: the whole declaration is dropped, so an
 * element renders unpainted — white text on no background — and looks like a
 * design choice rather than a bug. */
for (const f of ["index.html", "admin.html"]) {
  if (!existsSync(f)) continue;
  // strip comments first — a variable named in a comment is not a use
  const src = R(f).replace(/\/\*[\s\S]*?\*\//g, " ");
  const defined = new Set([...src.matchAll(/(--[a-z0-9-]+)\s*:/gi)].map(m => m[1]));
  // var(--x, something) carries its own fallback and is fine undefined
  const used = new Set([...src.matchAll(/var\(\s*(--[a-z0-9-]+)\s*\)/gi)].map(m => m[1]));
  const undef = [...used].filter(v => !defined.has(v));
  if (undef.length) fail(`${f} uses CSS variables that are never defined: ${undef.join(", ")}`);
  else ok(`${f} — all ${used.size} CSS variables are defined`);
}

/* ---- 3g. every Arabic mark we ship has a glyph in the font that will render it ----
 * The Google-served Amiri webfont contains NONE of the IndoPak waqf marks
 * (U+08D4-U+08E2 — rukuʿ, qif, waqfa, sakta, sajda …); Noto Naskh Arabic
 * contains all of them except U+08E2, which Google excludes from the subset
 * range outright. So scripture must render with the .quranic stack (Noto Naskh
 * first) and U+08E2 must be stripped at render time. A mark in the wrong stack
 * is a tofu box sitting in the middle of the Qur'an on a worshipper's phone. */
{
  const EXT_A = /[ࡰ-ࣿ]/;
  const src = existsSync("index.html") ? R("index.html") : "";
  if (src) {
    // 1. no element on the Amiri-only stack carries a mark Amiri cannot draw
    let offenders = 0;
    for (const m of src.matchAll(/class="[^"]*\barabic\b[^"]*"[^>]*>([^<]*)</g))
      if (EXT_A.test(m[1])) { offenders++; fail(`index.html renders "${m[1].trim().slice(0, 30)}" with the Amiri-only .arabic stack, but it contains marks Amiri has no glyph for`); }

    // 2. U+08E2 is stripped before display, and nothing wider than that is
    const strip = src.match(/const UNRENDERABLE_MARKS = ([^;]+);/);
    if (!strip) fail("index.html no longer strips U+08E2 — it will render as a tofu box in every mus-haf font");
    else if (!/^\/\\u08E2\/g$/.test(strip[1].trim()))
      fail(`index.html strips more than U+08E2 from scripture (${strip[1].trim()}) — genuine waqf marks would be deleted from the Qur'an`);
    else if (!offenders) ok("Arabic marks — scripture is on the Noto Naskh stack and only the unrenderable U+08E2 is stripped");
  }

  // 3. the page actually asks for the font that has the glyphs
  if (src && !/fonts\.googleapis\.com[^"']*Noto\+Naskh\+Arabic/.test(src))
    fail("index.html no longer loads Noto Naskh Arabic — every waqf mark in the Qur'an becomes a tofu box");
}

/* ---- 3h. no selector is silently overridden by a second copy of itself ----
 * The 40 Rabbanā list carried two full sets of .rb-* rules: a card design and
 * an older flat-list design further down the sheet. The later block re-declared
 * padding as "14px 0", so the cards kept their background and border but lost
 * their horizontal padding — the number badge and the Arabic ended up 1px from
 * the card edge, which reads as text cut off at the edges. Nothing errors; the
 * cascade just quietly picks the last one. */
for (const f of ["index.html", "admin.html"]) {
  if (!existsSync(f)) continue;
  const css = [...R(f).matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map(m => m[1]).join("\n")
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    // rules inside @media / @supports / @keyframes are deliberate overrides
    .replace(/@(?:media|supports|keyframes|font-face)[^{]*\{(?:[^{}]|\{[^{}]*\})*\}/g, " ");
  const seen = new Map();
  const clashes = [];
  for (const m of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const sel = m[1].split(/\s+/).join(" ").trim();
    const props = new Set([...m[2].matchAll(/(^|;)\s*([a-z-]+)\s*:/g)].map(x => x[2]));
    const before = seen.get(sel);
    if (before) {
      const both = [...props].filter(p => before.has(p));
      if (both.length) clashes.push(`${sel} (re-declares ${both.slice(0, 4).join(", ")})`);
      both.forEach(p => before.add(p));
      props.forEach(p => before.add(p));
    } else seen.set(sel, props);
  }
  if (clashes.length)
    fail(`${f} declares the same selector twice with conflicting properties — the second silently wins: ${clashes.slice(0, 3).join("; ")}`);
  else ok(`${f} — no selector is overridden by a second copy of itself`);
}

/* ---- 3i. the donation links go somewhere that actually takes money ----
 * A Stripe link in test mode is a complete, convincing checkout that collects
 * nothing at all, and nothing on screen would tell anybody — not the donor,
 * not the masjid, until the money never arrives. The old shop links are the
 * other half of it: /product/ pages on a WordPress site the masjid has moved
 * off. Both are invisible faults, so both are checked.
 *
 * The five links are the masjid's own, shared with the website. If a tier's
 * link is ever changed, this is the check that will say so. */
{
  const DONATE = {
    "https://buy.stripe.com/eVqaEX0Z63PGb3E2cSf3a01": "Bronze £250",
    "https://buy.stripe.com/3cI7sLgY4fyo2x8eZEf3a02": "Silver £500",
    "https://buy.stripe.com/fZubJ123a4TK5Jk18Of3a03": "Gold £1,000",
    "https://buy.stripe.com/28EbJ1cHOcmc5Jk04Kf3a04": "Platinum £5,000",
    "https://buy.stripe.com/6oU3cvbDK1Hy2x8g3If3a05": "any other amount",
    /* Everyday giving. One link per amount per frequency, because a Stripe
       Payment Link carries its own fixed price and cannot be handed an amount
       in the URL. Copied from the website's index_template.html; a guessed
       link either 404s or sends somebody's ṣadaqah to the wrong place. */
    "https://donate.stripe.com/3cI6oH8ry5XO2x84l0f3a09": "one-off £5",
    "https://donate.stripe.com/cNi7sL7nu71S8Vw3gWf3a0a": "one-off £10",
    "https://donate.stripe.com/aFaeVd37egCs2x8eZEf3a0b": "one-off £25",
    "https://donate.stripe.com/eVq3cvfU03PG8VwdVAf3a0c": "one-off £50",
    "https://donate.stripe.com/28EcN5cHOcmc7Rs4l0f3a0d": "one-off £100",
    "https://donate.stripe.com/6oU00j7nueuk2x8bNsf3a0o": "one-off, donor chooses",
    "https://donate.stripe.com/dRmcN523aeukc7I6t8f3a0f": "monthly £5",
    "https://donate.stripe.com/4gMcN55fm71S0p018Of3a0e": "monthly £10",
    "https://donate.stripe.com/14A8wPgY4gCs9ZAeZEf3a0g": "monthly £25",
    "https://donate.stripe.com/5kQ00jdLScmc9ZAaJof3a0h": "monthly £50",
    "https://donate.stripe.com/dRm9ATgY4bi86NocRwf3a0i": "monthly £100",
    "https://donate.stripe.com/28E5kD8ry2LCdbM04Kf3a0j": "Friday Pay £5",
    "https://donate.stripe.com/5kQfZhdLSbi81t418Of3a0k": "Friday Pay £10",
    "https://donate.stripe.com/dRm3cv5fm71S9ZA9Fkf3a0l": "Friday Pay £25",
    "https://donate.stripe.com/dRmaEX37e9a0b3E8Bgf3a0m": "Friday Pay £50",
    "https://donate.stripe.com/3cIaEXfU0cmc2x8dVAf3a0n": "Friday Pay £100",
  };
  /* Money the masjid is owed, not money it is given. These are Payment Links
     for SERVICES, and the distinction is not bookkeeping pedantry: a hall
     deposit or a nikāḥ fee put through a donation link is misstated in the
     charity's accounts and would carry a Gift Aid claim it is not entitled to.
     They are listed separately here so that nobody can quietly move one set
     into the other. */
  const SERVICE = {
    "https://book.stripe.com/3cIdR9cHOfyo5Jk7xcf3a06": "hall deposit £100",
    "https://buy.stripe.com/5kQ6oHfU02LC0p05p4f3a07":  "nik\u0101\u1E25 fee, member £100",
    "https://buy.stripe.com/28EcN58ry85W1t4cRwf3a08":  "nik\u0101\u1E25 fee, non-member £200",
  };
  const src = existsSync("index.html") ? R("index.html") : "";
  if (src) {
    /* All three Stripe hosts: the hall deposit is on book.stripe.com and
       everyday giving on donate.stripe.com, and a test-mode link on either
       would ship just as invisibly as one on buy.stripe.com. */
    const found = [...src.matchAll(/https:\/\/(?:buy|book|donate)\.stripe\.com\/[A-Za-z0-9_]+/g)].map(m => m[0]);
    const uniq = [...new Set(found)];
    const test = uniq.filter(u => u.includes("test_"));
    if (test.length) fail(`Stripe link in TEST MODE — it takes no money and looks identical: ${test.join(", ")}`);

    const missing = Object.keys(DONATE).filter(u => !uniq.includes(u));
    const gone = Object.keys(SERVICE).filter(u => !uniq.includes(u));
    const extra = uniq.filter(u => !(u in DONATE) && !(u in SERVICE));
    if (missing.length) fail(`donation link missing from index.html: ${missing.map(u => DONATE[u]).join(", ")}`);
    if (gone.length) fail(`payment link missing from index.html: ${gone.map(u => SERVICE[u]).join(", ")}`);
    if (extra.length) fail(`unrecognised Stripe link in index.html — check it is the masjid's: ${extra.join(", ")}`);

    /* A service payment must never be offered as a donation, or the other way
       about. Checked by where the link sits, not by what it is called. */
    const donateArea = (src.match(/<div class="tiers">[\s\S]*?\n\s*<\/div>/) || [""])[0];
    if (!/buy\.stripe\.com/.test(donateArea))
      fail("the donations tier block could not be found, so nothing is checking that a fee has not been put among the gifts");
    for (const u of Object.keys(SERVICE))
      if (donateArea.includes(u))
        fail(`${SERVICE[u]} is on the donations screen — a fee is not a gift, and Gift Aid would be claimed on it wrongly`);

    const old = [...src.matchAll(/https:\/\/(?:www\.)?taiyabahmasjid\.com\/product\/[^"']*/g)].map(m => m[0]);
    if (old.length) fail(`donation still points at the old shop: ${[...new Set(old)].join(", ")}`);

    /* GIFT AID. The rule here used to be a flat ban: Stripe cannot produce or
       store an HMRC declaration, so the app must not promise the donor one.
       That changed on 12 September 2026, when the committee had every donation
       Payment Link built with a Stripe custom field — a Gift Aid dropdown, Yes
       or No — and the full declaration in the product description beside it.
       Stripe collects the name and address on that same screen and sends all
       of it, signed, to the masjid's webhook. So the promise is now honest.

       What must not happen is the promise drifting onto a screen where the
       money is not a gift. Gift Aid on a hall deposit or a nikāḥ fee is relief
       claimed on something the masjid was owed, and HMRC would want it back.
       So: every Gift Aid mention that reaches a screen has to sit inside the
       everyday giving sheet, and that sheet may carry donation links only.

       Comments discuss Gift Aid at length and none of it reaches a screen, so
       they are blanked — but blanked to the same LENGTH, because the test is
       where a mention sits, and shortening the text ahead of it would move
       every offset after it. */
    const blank = m => " ".repeat(m.length);
    const onScreen = src.replace(/<!--[\s\S]*?-->/g, blank)
                        .replace(/\/\*[\s\S]*?\*\//g, blank);
    const gvAt = src.indexOf('<div class="sheet" id="giving"');
    const gvEnd = gvAt === -1 ? -1 : src.indexOf('<div class="sheet" id="', gvAt + 30);
    if (gvAt === -1 || gvEnd === -1) {
      fail("the everyday giving sheet could not be found, so nothing is checking where Gift Aid is promised");
    } else {
      const stray = [...onScreen.matchAll(/Gift\s*Aid/gi)]
        .filter(m => m.index < gvAt || m.index >= gvEnd)
        .map(m => JSON.stringify(src.slice(Math.max(0, m.index - 60), m.index + 40).replace(/\s+/g, " ")));
      if (stray.length)
        fail(`Gift Aid is promised outside the everyday giving sheet — relief cannot be claimed on a fee: ${stray.slice(0, 2).join(" … ")}`);
      const gvLinks = [...new Set([...src.slice(gvAt, gvEnd)
        .matchAll(/https:\/\/(?:buy|book|donate)\.stripe\.com\/[A-Za-z0-9_]+/g)].map(m => m[0]))];
      const fees = gvLinks.filter(u => u in SERVICE);
      if (fees.length)
        fail(`the giving sheet offers ${fees.map(u => SERVICE[u]).join(", ")} — a fee is not a gift, and it sits beside a Gift Aid promise`);
    }

    if (!test.length && !missing.length && !extra.length && !old.length)
      ok(`donations — all ${uniq.length} Stripe links present, live mode, no old shop links`);
  }
}

/* ---- 3j. a new build can actually reach an installed phone ----

   Every one of these was missing at once, and the result was a phone that
   had been running the app for months showing English where a translation
   existed: it was serving index.html out of a cache nothing ever refilled,
   from a worker nothing ever asked to update, with a pack that was only
   re-checked at a launch the app never had. Each line below is one of the
   ways that build got stuck; none of them announce themselves. ---- */
{
  const sw  = readFileSync("sw.js", "utf8");
  const app = readFileSync("index.html", "utf8");
  const missing = [];
  if (!/new Request\([^)]*cache:\s*["']reload["']/.test(sw))
    missing.push('sw.js installs the shell through the browser cache (no cache: "reload") — a new version can be filled with the old build');
  if (!/clients\.matchAll\(\{\s*type:\s*["']window["']\s*\}\)[\s\S]{0,400}?\.navigate\(/.test(sw))
    missing.push("sw.js activates without sending its windows back through the door — a phone stays a release behind until it is relaunched twice");
  if (!/\.update\(\)/.test(app))
    missing.push("index.html never calls registration.update() — a resumed app never asks whether there is a newer build");
  if (!/visibilitychange/.test(app) || !/refreshPack\(activeLang\)/.test(app))
    missing.push("index.html doesn't re-check the language pack when it comes back to the front");
  if (!/packCache\[code\]/.test(app))
    missing.push("index.html reads the pack back out of storage instead of using the one it just downloaded — a phone that can't store it re-applies the old words every launch");
  if (missing.length) missing.forEach(fail);
  else ok("update path — a new build and new words reach an installed phone without a reinstall");
}

/* ---- 3k. the holiday planner's prose still matches its dates ----

   The screen tells a parent the madrasah teaches 180 days, 36 weeks, and that
   the two long breaks are 33 and 40 days. Those are four sentences written by
   hand next to a list of dates edited by hand, once a year, by different
   people. Nothing makes them agree, and a parent who plans a trip around a
   sentence that no longer matches the calendar beside it loses their child's
   place over it. So the sentences are checked against the dates. ---- */
{
  const html = readFileSync("index.html", "utf8");
  const grab = (name) => {
    const m = html.match(new RegExp(`const ${name}\\s*=\\s*\\[`));
    if (!m) return null;
    let i = html.indexOf("[", m.index), depth = 0, end = i;
    for (; end < html.length; end++) {
      if (html[end] === "[") depth++;
      else if (html[end] === "]") { depth--; if (!depth) break; }
    }
    return new Function(`return ${html.slice(i, end + 1)}`)();
  };
  const closures = grab("MAD_CLOSURES");
  if (!closures) fail("the holiday planner's closure list is gone from index.html");
  else {
    const P = (v) => { const a = v.split("-"); return new Date(+a[0], +a[1] - 1, +a[2]); };
    const len = (c) => Math.round((P(c.to) - P(c.from)) / 86400000) + 1;
    const shut = new Set();
    for (const c of closures) {
      const d = P(c.from), e = P(c.to);
      while (d <= e) { shut.add(d.toDateString()); d.setDate(d.getDate() + 1); }
    }
    let teach = 0;
    const d = P("2026-09-01"), end = P("2027-08-31");
    while (d <= end) {
      const w = d.getDay();
      if (w >= 1 && w <= 5 && !shut.has(d.toDateString())) teach++;
      d.setDate(d.getDate() + 1);
    }
    const say = (en) => html.includes(en);
    const wrong = [];
    if (teach !== 180) wrong.push(`the dates give ${teach} teaching days, the screen says 180`);
    if (teach % 5 || teach / 5 !== 36) wrong.push(`the dates give ${(teach/5).toFixed(1)} weeks, the screen says 36`);
    const ram = closures.find(c => c.id === "ramadhan"), sum = closures.find(c => c.id === "endofyear");
    if (ram && len(ram) !== 33) wrong.push(`the Ramadhan break is ${len(ram)} days, the screen says 33`);
    if (sum && len(sum) !== 40) wrong.push(`the summer break is ${len(sum)} days, the screen says 40`);
    if (!say("teaches 180 days this year") || !say("36 weeks"))
      wrong.push("the planner's opening sentence no longer states 180 days over 36 weeks");
    if (!say("Ramadhan (33 days)") || !say("summer (40 days)"))
      wrong.push("the two-long-breaks sentence no longer states 33 and 40 days");
    if (wrong.length) wrong.forEach(w => fail("holiday planner — " + w));
    else ok(`holiday planner — ${teach} teaching days over ${teach/5} weeks, and the prose agrees with the dates`);
  }
}

/* ---- 3l. the nikāḥ form cannot appear before the office can receive it ----

   The request writes to a Postgres function that is not applied yet. If the
   form is ever shown without that being true, a family picks a date, fills in
   their details, presses send on the most significant booking they will make
   this year, and is handed an error. The app therefore asks the server whether
   the function exists and gates the form on the answer — in two places, since
   two different paths can reveal it. Both are checked, because losing either
   one restores exactly that failure without anything looking wrong. ---- */
{
  const app = readFileSync("index.html", "utf8");
  const missing = [];
  if (!/function nkProbe\(\)/.test(app) || !/PGRST202/.test(app))
    missing.push("nkProbe is gone — the app no longer asks whether the office can receive a request, so the form's state is a guess");
  if (!/form\.hidden = !\(NK\.open && NK\.d1 && NK\.slot\)/.test(app))
    missing.push("nkRenderPicks reveals the form on date+slot alone, without checking NK.open");
  if (!/f\.hidden = !\(open && !NK\.sent && NK\.d1 && NK\.slot\)/.test(app))
    missing.push("nkShow reveals the form without checking the server's answer");
  /* Treating an unreadable answer as "open" is the dangerous default. */
  if (!/catch\(\(\) => \{ clearTimeout\(timer\); NK\.open = false; return false; \}\)/.test(app))
    missing.push("nkProbe no longer fails closed — an offline phone would be shown a form that cannot send");
  /* Withholding the form is right. Withholding it and leaving nothing to press
     is not: the explanation first sat above the calendar, so a person scrolled
     past it, chose a day and a prayer, and reached the bottom with no button
     and no reason given. The note has to come after the picks, where the
     button would be, and it has to carry a way to reach the office. */
  const closed = app.indexOf('id="nk-closed"');
  const clear  = app.indexOf('id="nk-clear"');
  if (closed < 0 || clear < 0 || closed < clear)
    missing.push("the phone-only note is not below the date and prayer picks — someone who chooses both reaches the bottom of the screen with nothing to press");
  const block = app.slice(closed, closed + 3000);
  if (!/href="tel:01204535997"/.test(block) || !/id="nk-email"/.test(block))
    missing.push("the phone-only note offers no way to reach the office; it is a dead end");
  if (!/function nkClosedSummary\(\)/.test(app) || !/mail\.href = "mailto:/.test(app))
    missing.push("the office email no longer carries the chosen dates and prayer, so a person has to read them back off the screen");

  if (missing.length) missing.forEach(fail);
  else ok("nikāḥ requests — gated on the server, failing closed, and never a dead end when closed");
}

/* ---- 3m. the 13-line mushaf is licensed before it ships ----
   The Qur'an's text is nobody's copyright, but a printed edition is a
   different thing: its calligraphy is an artistic work and, here, its
   typographical arrangement carries 25 years under CDPA s.15. The pages most
   easily found online are scans of somebody's edition, uploaded by a stranger
   with no rights to give. A masjid redistributing those from its own app is a
   long way from one person downloading a PDF.

   So the app treats a pack with no stated source and licence as not installed
   at all, and this check makes sure that gate is still there — and that the
   development fixture, which is real Qur'anic text at arbitrary line breaks
   and must never be read from, has not been committed by accident. ---- */
{
  const app = readFileSync("index.html", "utf8");
  const bad = [];

  if (!/if\(!m \|\| !\(m\.pages > 0\) \|\| !m\.source \|\| !m\.licence\) throw new Error/.test(app))
    bad.push("loadMushafMeta no longer refuses a pack with no source and licence — an unlicensed mushaf could ship and render");
  if (!/MUSHAF\.state = "missing"/.test(app))
    bad.push("the mushaf no longer falls back to the not-installed state, so a missing pack would leave a blank page");
  if (!/id="mu-missing"/.test(app) || !/id="mu-to-translation"/.test(app))
    bad.push("the not-installed state is gone or offers no way onward — that is a dead end");

  const dir = "quran/mushaf/indopak13";
  if (existsSync(dir + "/index.json")) {
    let meta = null;
    try { meta = JSON.parse(readFileSync(dir + "/index.json", "utf8")); }
    catch (e) { bad.push("the mushaf pack's index.json does not parse"); }
    if (meta) {
      if (!meta.source)  bad.push("the mushaf pack names no source");
      if (!meta.licence) bad.push("the mushaf pack states no licence");
      if (!(meta.pages > 0)) bad.push("the mushaf pack declares no page count");
      /* the dev fixture labels itself; it must never reach a phone */
      const label = JSON.stringify(meta);
      if (/TEST FIXTURE|dev harness|not for distribution/i.test(label))
        bad.push("the development fixture has been committed — its line breaks are arbitrary and it must never be read from");

      /* The sūrah mapping was read off the printed page headers one page at a
         time, because no reliable way to infer it existed. A wrong entry sends
         someone to the wrong sūrah, which is worse than having no jump at all,
         so its shape is checked on every release. */
      const sp = meta.surahPage;
      if (sp) {
        const keys = Object.keys(sp).map(Number).sort((a, b) => a - b);
        if (keys.length !== 114 || keys[0] !== 1 || keys[113] !== 114)
          bad.push(`the sūrah mapping does not cover 1-114 (has ${keys.length})`);
        let prev = 0, back = 0, oob = 0;
        for (const k of keys) {
          const v = sp[k];
          if (!(v >= 1 && v <= meta.pages)) oob++;
          if (v < prev) back++;
          prev = v;
        }
        if (oob) bad.push(`${oob} sūrah(s) point outside the mushaf's ${meta.pages} pages`);
        if (back) bad.push(`${back} sūrah(s) start earlier than the one before — the mapping is out of order`);
        /* the juz table was derived separately, from the PDFs' own page counts,
           so where the two must agree they are a real cross-check */
        const jp = meta.juzPage || {};
        for (const [juz, surah] of [["15", 17], ["30", 78]]) {
          if (jp[juz] && sp[surah] && jp[juz] !== sp[surah])
            bad.push(`juz ${juz} starts at page ${jp[juz]} but sūrah ${surah}, which opens it, is mapped to ${sp[surah]}`);
        }
      }

    }
  }

  /* Sideways is worth having because the long edge of the screen takes the
     width of the page, which is what makes the writing larger, and because the
     page scrolls rather than jumping a screenful at a time. Both have been
     asked for by name, so both are checked for directly. */
  if (!/function mushafScrollBy\(/.test(app) || !/requestAnimationFrame\(mushafGlide\)/.test(app))
    bad.push("the sideways reader no longer scrolls the page, so it would be back to stepping through it a screenful at a time");
  if (!/while\(MU_LAND\.off >= ph && MUSHAF\.page < total\)/.test(app))
    bad.push("scrolling no longer carries on into the next page, so reading would stop dead at the foot of every page");
  if (!/const pad = Math\.max\(8, Math\.round\(W \* 0\.025\)\)/.test(app))
    bad.push("the sideways page no longer keeps air down both sides");
  if (!/rotate\(\$\{turn \? 90 : 0\}deg\)/.test(app))
    bad.push("the sideways reader no longer turns the page in software, so it would do nothing for a phone with rotation lock on");
  /* Favourites are only useful if you can reach them from wherever you are
     reading; sideways they were unreachable until this was added. */
  if (!/function renderMushafFavs\(/.test(app) || !/id="ml-fav"/.test(app))
    bad.push("the sideways reader offers no way into the favourites, so a page kept there could not be returned to without leaving it");
  if (/mushaf\.saved_pages|View saved pages/.test(app))
    bad.push("the mushaf still calls them saved pages somewhere — one name for one thing");
  /* These were one thing once, and collapsing them again would take the
     everyday bookmark away from people who use nothing else. The bookmark is
     one page and lives on the bar; favourites are a list and are added from
     the list. */
  if (!/const MU_MARK = "mushaf\.mark"/.test(app) || !/function toggleMushafMark\(/.test(app))
    bad.push("the mushaf has no bookmark of its own again — favourites are not a substitute for where you are up to");
  if (!/'mu-bm'\)\.addEventListener\('click',toggleMushafMark\)/.test(app))
    bad.push("the ribbon on the bar is no longer the bookmark");
  if (!/id="mu-fav-add"/.test(app) || !/id="ml-fav-add"/.test(app))
    bad.push("favourites cannot be added from the list, so nothing adds them now the ribbon is the bookmark");
  if (!/id="mu-mark"/.test(app) || !/id="ml-mark"/.test(app))
    bad.push("nothing offers the way back to the bookmark, which is the whole point of having one");

  if (bad.length) bad.forEach(fail);
  else ok("13-line mushaf — refuses to render a pack that names no source and licence, and says so rather than showing a blank page");
}

/* ---- 3n. the tab bar can find the bottom of the screen again ----
   A phone came back with the bar stranded 278pt up the screen, over the page:
   WebKit had anchored it to where the visual viewport ended while the keyboard
   was up and never put it back. Nothing in the app moves the bar, so nothing in
   the app was going to move it back either — it takes the bar out of the layout
   for a frame when the viewport changes, which makes the browser work it out
   again. Losing that would bring the stranded bar back. ---- */
{
  const app = readFileSync("index.html", "utf8");
  const bad = [];
  if (!/function repinTabbar\(/.test(app))
    bad.push("repinTabbar is gone — a bar stranded up the screen by the keyboard would stay there");
  if (!/visualViewport\.addEventListener\('resize', repinTabbar\)/.test(app))
    bad.push("nothing listens for the viewport changing, which is when the bar is left behind");
  if (!/addEventListener\('focusout'/.test(app))
    bad.push("nothing listens for a field losing focus — the other moment the keyboard goes away");
  if (!/initTabbarPin\(\);/.test(app))
    bad.push("initTabbarPin is never called, so none of it is wired up");
  if (bad.length) bad.forEach(fail);
  else ok("tab bar — recovers its place on the screen after the keyboard has been up");
}

/* ---- 3o. the nisab does not rest on one website staying up ----
   A phone came back with "Couldn't fetch today's price": all three figures
   were asked for together, so whichever one was missing took the other two
   down with it, and a price from that morning was thrown away rather than
   offered. Each figure has spares now, and a good answer from earlier stands
   in — with the check that a figure is plausible before it is used, which is
   what makes a spare we cannot reach from here safe to keep. ---- */
{
  const app = readFileSync("index.html", "utf8");
  const bad = [];
  const fx = (app.match(/const FX_SOURCES = \[([\s\S]*?)\];/) || [])[1] || "";
  if ((fx.match(/url:/g) || []).length < 2)
    bad.push("the exchange rate has no spare source — one website going down would take the nisab with it");
  if (!/function lastGoodPrices\(/.test(app) || !/ZK_LAST_MAX_DAYS/.test(app))
    bad.push("a price that worked earlier is no longer kept, so a moment's outage leaves the reader with nothing");
  if (!/inRange\(v, range\)/.test(app))
    bad.push("firstSane no longer range-checks what a provider returns — a wrong nisab is worse than no nisab");
  if (/Promise\.all\(\[\s*fetchJSON\("https:\/\/api\.gold-api/.test(app))
    bad.push("the three figures are asked for together again, so any one of them can take the other two down");
  if (bad.length) bad.forEach(fail);
  else ok("zakat nisab — the metal price survives a provider going down, and says so when it is standing on an older figure");
}

/* ---- 3p. every row in the menu that goes somewhere has its icon ----
   The Madrasah Portal was added as a link rather than copied from a button
   beside it, and went out without one: a blank where every other row has a
   glyph, which reads as something half-finished. The rows still to come are
   marked "soon" and deliberately bare; every other one is checked. ---- */
{
  const app = readFileSync("index.html", "utf8");
  const rows = [...app.matchAll(/<(a|button) class="dr-row([^"]*)"[^>]*>([\s\S]*?)<\/\1>/g)];
  const bare = rows
    .filter(m => !/\bsoon\b/.test(m[2]) && !m[3].includes("dr-ico"))
    .map(m => (m[3].match(/data-i18n="([^"]+)"/) || [,"?"])[1]);
  if (!rows.length) fail("no menu rows found to check — the markup has moved");
  else if (bare.length) fail(`${bare.length} menu row(s) have no icon: ${bare.join(", ")}`);
  else ok(`menu — all ${rows.length} rows carry an icon, bar the ones marked coming soon`);
}

/* ---- 3q. a tile that stands for several things asks which ----
   Daily Adhkār opened on the morning athkār with the other sets behind tabs
   nobody had been told about, and Madrasah opened on Admissions & Fees as
   though the holiday planner and the portal were not there. Each row on those
   two menus has to lead somewhere: a menu row wired to nothing is worse than
   no menu. ---- */
{
  const app = readFileSync("index.html", "utf8");
  const bad = [];
  for (const [name, view] of [["Daily Adhkār", "ak-mode-view"], ["Madrasah", "madrasah"]]) {
    const m = app.match(new RegExp(`id="${view}"[\\s\\S]*?<\\/div>\\s*\\n\\s*<\\/div>`));
    const ids = [...(m ? m[0] : "").matchAll(/<(?:button|a) class="md-row"[^>]*id="([^"]+)"/g)].map(x => x[1]);
    if (ids.length < 3) { bad.push(`the ${name} menu has ${ids.length} row(s) — it is meant to offer a choice`); continue; }
    for (const id of ids) {
      const wired = new RegExp(`'${id}'\\)\\.addEventListener`).test(app);
      const link  = new RegExp(`id="${id}"[^>]*href="https?:`).test(app);
      if (!wired && !link) bad.push(`${name}: the "${id}" row goes nowhere`);
    }
  }
  if (!/a\.md-row\{text-decoration:none/.test(app))
    bad.push("a menu row that is a link would come out underlined and a different colour from the rows beside it");
  if (bad.length) bad.forEach(fail);
  else ok("tile menus — Daily Adhkār and Madrasah both offer their choices, and every row leads somewhere");
}

/* ---- 3r. the hall says the same thing here as it does on the website ----
   The app and the website are one hall, one diary and one price list, and the
   app has been wrong about all three at different times: it invented a rate
   the masjid never charged, and it kept a morning/evening split months after
   the masjid moved to whole-day hire.

   What has to hold:
     - the app quotes no total. The published charges depend on whether the
       utensils were used and how many people ate, which a phone cannot know;
       the rate card is printed as printed and the office quotes the figure.
     - a booking goes through request_hall_booking(), not an insert. The
       function is what takes the lock and the thirty-minute hold; an insert
       let two families both be sent to Stripe for one Saturday.
     - the deposit link carries client_reference_id, or Stripe takes £100 and
       nobody knows whose it is.
     - one hall is Monday to Thursday. There is no weekend rate for it, so the
       app must not sell it.
     - the terms the checkbox asks people to agree to are actually on screen.
     - nobody is asked their religious affiliation to hire a room. ---- */
{
  const app = readFileSync("index.html", "utf8");
  const bad = [];

  if (/\bBK_PRICING\b/.test(app) || /\bbkPrice\s*\(/.test(app))
    bad.push("the app is working out a hire fee again — the office quotes it, this screen does not");
  if (/\bBK_SESSIONS\b/.test(app) || /\bbkSlotFree\b/.test(app))
    bad.push("the morning/evening split is back — the masjid lets the venue by the day");
  if (/data-member=|BK\.member/.test(app))
    bad.push("the membership question is back on the hire form: it decides nothing, and nobody should be asked their religion to book a room");

  const submit = (app.match(/function bkSubmit\(e\)[\s\S]*?\n\}/) || [""])[0];
  if (!/rpc\/request_hall_booking/.test(submit))
    bad.push("the booking no longer goes through request_hall_booking() — nothing would take the hold, and two people could pay for one date");
  if (!/hire_type/.test(submit) || !/halls_count/.test(submit))
    bad.push("the request does not say what is being hired, so the office cannot price it");

  const done = (app.match(/function bkDone\([\s\S]*?\n\}/) || [""])[0];
  if (!/client_reference_id/.test(done))
    bad.push("the deposit link has lost client_reference_id — Stripe would take £100 that matches no booking");
  if (!/if\(problem \|\| !ref\)/.test(done))
    bad.push("a pay button could be offered for a booking that never reached the database");

  if (!/function bkOfferedOn/.test(app) || !/count === 1 && bkIsWeekendRate/.test(app))
    bad.push("one hall is being offered at the weekend, which the masjid does not sell and the database refuses");

  for (const [what, needle] of [
    ["the £350 / £500 / £600 weekday rates", /&pound;350[\s\S]{0,600}&pound;500[\s\S]{0,600}&pound;600/],
    ["the £600 / £700 weekend rates",        /&pound;600[\s\S]{0,400}&pound;700/],
    ["the £125 kitchen-only rate",           /&pound;125/],
    ["the 45p per person utility charge",    /45p per person/],
    ["the £100 deposit",                     /deposit_paid_online/],
    ["the terms of hire",                    /hallhire\.t8_h/],
  ]) if (!needle.test(app)) bad.push(`the hall screen has lost ${what}, which the website publishes`);

  if (!/id="bk-terms"/.test(app) || !/id="bk-terms-link"/.test(app))
    bad.push("the agreement checkbox links to terms that are not on the screen — a signature on a blank page");

  /* .bk-done a is purple, and it out-specifies a bare .bk-pay: the button came
     out as a solid purple block with its label invisible on it. */
  if (!/\.bk-done \.bk-pay\{/.test(app))
    bad.push("the deposit button is styled below .bk-done a, so its label would be purple on purple");

  if (bad.length) bad.forEach(fail);
  else ok("hall hire — whole-day booking, the masjid's own rate card, the deposit that holds the date, and the terms behind the checkbox");
}

/* ---- 3s. paying the nikāḥ fee is paying, not booking ----
   The hall calendar can sell a date outright because the app can see what is
   free. A nikāḥ cannot: the masjid does not publish that diary, so neither the
   app nor the website knows whether a day is available, and a payment must
   never be allowed to agree one. Migration 018 says the same thing in SQL and
   carries a warning against anybody "making it consistent with the hall".

   What has to hold:
     - the pay box says, in its own words, that the office rings first.
     - a payment carries client_reference_id. It is the only thing tying the
       money to a request; without it Stripe takes £100 and nobody knows whose.
     - the reference is checked before anybody is sent to Stripe, so a typo
       does not pay against a reference that cannot be matched.
     - the box stays hidden unless both Payment Links exist. A pay button that
       goes nowhere is worse than no pay button.
     - the nikāḥ calendar still shows no availability at all. ---- */
{
  const app = readFileSync("index.html", "utf8");
  const bad = [];

  const pay = (app.match(/function initNikahPay\(\)[\s\S]*?\n\}/) || [""])[0];
  if (!pay) bad.push("the nikāḥ fee can no longer be paid in the app");
  if (!/NK_PAY_LINKS\.member \|\| !NK_PAY_LINKS\.non_member\) return/.test(pay))
    bad.push("the pay box would show with a missing Payment Link — a pay button that goes nowhere");
  if (!/"client_reference_id=" \+ encodeURIComponent/.test(pay))
    bad.push("a nikāḥ payment carries no reference — Stripe would take the money and nobody could match it");
  if (!/\^NK-\\d\{2\}-\\d\{4\}\$/.test(pay))
    bad.push("the reference is not checked before checkout, so a typo pays against nothing");
  if (!/nikah\.once_the_office_has_rung/.test(app))
    bad.push("the pay box no longer says the office rings first, so paying reads as booking");
  for (const k of ["nikah.the_nikah_fee", "nikah.members_of_the_masjid", "nikah.non_members"])
    if (!app.includes(k)) bad.push(`the published nikāḥ rate has lost "${k}"`);

  /* 010 has a test that fails if availability colouring ever appears on the
     nikāḥ calendar. The app must not invent it either. */
  const cal = (app.match(/function nkRenderCal\(\)[\s\S]*?\n\}/) || [""])[0];
  if (/data-state=|nkDayState|hall_availability/.test(cal))
    bad.push("the nikāḥ calendar is colouring days by availability — the masjid does not publish that diary, so it would be invented");

  if (bad.length) bad.forEach(fail);
  else ok("nikāḥ fee — the published rate, payable online against a checked reference, and paying still does not book a date");
}

/* ---- 3t. the language packs on disk are the ones the source would build ----
   check-i18n reads lang/src/*.json. The app reads lang/ur.js. Edit the source,
   forget to run build-lang, and every check passes while phones download a
   pack that is missing the strings just written — which is exactly how two new
   lines sat in English on an otherwise Urdu screen while the coverage check
   reported everything present. ---- */
{
  const built = ["ur", "gu", "ar"].map(c => `lang/${c}.js`).filter(existsSync);
  if (!built.length) fail("no language packs are built — every reader gets English");
  else {
    const before = built.map(f => readFileSync(f, "utf8"));
    try {
      execSync("node scripts/build-lang.mjs", { stdio: "pipe" });
      const stale = built.filter((f, i) => readFileSync(f, "utf8") !== before[i]);
      /* Put back exactly what was there, so the check reports and never edits. */
      built.forEach((f, i) => writeFileSync(f, before[i]));
      if (stale.length)
        fail(`${stale.join(", ")} ${stale.length === 1 ? "is" : "are"} behind lang/src — ` +
             "run node scripts/build-lang.mjs, or phones download a pack missing the newest strings");
      else ok(`language packs — all ${built.length} match what lang/src would build`);
    } catch (e) {
      built.forEach((f, i) => writeFileSync(f, before[i]));
      fail("scripts/build-lang.mjs will not run: " + String(e.stderr || e).split("\n")[0]);
    }
  }
}

/* ---- 3u. Android can prove the app owns the domain ----
   A Trusted Web Activity shows the site with no browser address bar only if
   /.well-known/assetlinks.json on the domain names the app's signing
   certificate. Get it wrong and the app still runs, but with a browser bar
   pinned across the top, which reads to everybody as broken.

   The trap is GitHub Pages: it runs Jekyll, and Jekyll skips any directory
   whose name begins with a dot. Without a .nojekyll file at the root, the
   assetlinks file is simply never published, and nothing anywhere says so.
   That is the failure this check exists for. ---- */
{
  const links = ".well-known/assetlinks.json";
  if (!existsSync(links)) {
    /* Nothing to verify yet — the file arrives with the Android build. */
  } else if (!existsSync(".nojekyll")) {
    fail(".well-known/assetlinks.json exists but .nojekyll does not — GitHub Pages will not serve a dot-directory, so Android link verification silently fails and the app shows a browser bar");
  } else {
    let doc = null;
    try { doc = JSON.parse(readFileSync(links, "utf8")); } catch (e) { doc = undefined; }
    const entry = Array.isArray(doc) ? doc[0] : null;
    const target = entry && entry.target;
    const prints = (target && target.sha256_cert_fingerprints) || [];
    if (doc === undefined) fail("assetlinks.json is not valid JSON — Android will reject it outright");
    else if (!target || target.namespace !== "android_app" || !target.package_name)
      fail("assetlinks.json does not name an android_app package");
    else if (!prints.length)
      fail("assetlinks.json lists no signing certificate, so it verifies nothing");
    else if (prints.some(p => /^REPLACE_/.test(p)))
      ok("Android asset links — structure and .nojekyll in place; the signing fingerprint is still a placeholder, to be filled from Play App Signing");
    else if (!prints.every(p => /^([0-9A-F]{2}:){31}[0-9A-F]{2}$/i.test(p)))
      fail("a signing fingerprint in assetlinks.json is not 32 colon-separated hex bytes — Android will not match it");
    else
      ok(`Android asset links — ${target.package_name} verified against ${prints.length} signing certificate(s), and .nojekyll lets Pages serve them`);
  }
}

/* ---- 3v. notification preferences are positional and append-only ----
   Every subscriber's preferences live in ONE OneSignal tag, because the plan
   has too few tag slots to key them per category. The value is a run of flags
   read back BY POSITION. So inserting a category in the middle, or reordering
   two, silently rewrites what everybody asked for: announcements start
   arriving as janāzah alerts, people who opted out of events start getting
   them, and nothing looks wrong anywhere — not in the console, not in the app,
   not in a test that only checks the new category works.

   This check pins the order. Appending is fine and needs the list below
   extended; anything else is a fault. It also holds the app and the Worker to
   the same names, since the app posts them and the Worker packs them. ---- */
{
  const BASELINE = ["jamaah", "janazah", "announcements", "events", "kahf"];
  const w = existsSync("worker/worker.js") ? readFileSync("worker/worker.js", "utf8") : "";
  const m = w.match(/const PREF_ORDER\s*=\s*\[([^\]]*)\]/);
  if (!m) fail("PREF_ORDER has gone from the Worker — nothing decides what each preference flag means");
  else {
    const order = [...m[1].matchAll(/"([^"]+)"/g)].map(x => x[1]);
    const bad = [];
    BASELINE.forEach((name, i) => {
      if (order[i] !== name)
        bad.push(`preference ${i} should be "${name}" and is "${order[i] ?? "missing"}" — every stored value is read by position, so this silently rewrites what subscribers asked for`);
    });
    if (order.length < BASELINE.length)
      bad.push(`PREF_ORDER lost ${BASELINE.length - order.length} preference(s); removing one shifts every flag after it`);

    /* The app posts these names to /api/set-my-tags and the Worker packs them.
       A name in one and not the other means the answer is never stored. */
    const app = readFileSync("index.html", "utf8");
    const payload = (app.match(/function pushTopicTags\(p\)\{[\s\S]*?\n\}/) || [""])[0];
    for (const name of order) {
      if (!new RegExp(`\\b${name}\\s*:`).test(payload))
        bad.push(`the app never sends "${name}", so that preference is stored as off for everybody`);
      if (!new RegExp(`\\b${name}\\s*:\\s*bit\\(body\\.${name}\\)`).test(w) && name !== "jamaah_mins")
        bad.push(`the Worker never reads "${name}" from the app's request`);
    }

    /* Widening the flags leaves older values in the wild; they have to keep
       matching, or the categories people already rely on stop arriving. */
    if (!/LEGACY_FLAGS/.test(w))
      bad.push("nothing keeps the older, narrower preference values matching — existing subscribers would stop receiving janāzah and announcement alerts");

    if (bad.length) bad.forEach(fail);
    else ok(`notification preferences — ${order.length} flags, in the order subscribers' stored values expect, and the app and Worker agree on every name`);
  }
}

/* ---- 3w. a notice is kept, and the poster bucket is not writable by the app ----
   The Notices tab said "coming soon" for a year because a push is delivered and
   then gone. Now it keeps them — which means the app reads a table, and the
   office writes one, and those must not be the same key.

   The app ships its publishable Supabase key in plain sight. Anything that key
   can write, anyone who opens the app can write, and a masjid's announcements
   board is a bad thing to leave open. So the app reads a VIEW and the Worker
   writes through a FUNCTION on the service key. This checks the two never swap.

   The write path is the part that was wrong in the first release. The Worker
   inserted straight into the table, on the reasoning that the service key
   bypasses Row Level Security — which it does, and which is not the same as
   being granted INSERT. It holds no table privileges anywhere in this project,
   so the first send from the office died with 42501 and the office got a
   notification with nothing behind it.

   The tempting fix is `grant insert on public.notices to service_role`. That
   key sits in an internet-facing Worker; a grant widens it from "can do
   nothing" to "can write a table", and the next table added inherits the same
   assumption. So this check also fails that fix. ---- */
{
  const app = readFileSync("index.html", "utf8");
  const w = existsSync("worker/worker.js") ? readFileSync("worker/worker.js", "utf8") : "";
  const sql = existsSync("db/001_notices.sql") ? readFileSync("db/001_notices.sql", "utf8") : "";
  const fn  = existsSync("db/002_publish_notice.sql") ? readFileSync("db/002_publish_notice.sql", "utf8") : "";
  const bad = [];

  /* These migrations explain themselves at length, and the explanations quote
     the very things being checked for — "security definer", and the grant that
     must never be made. Match the SQL, not the prose about it. A check that
     passes because of a comment is worse than no check. */
  const stripSql = t => t.replace(/--[^\n]*/g, " ").replace(/\/\*[\s\S]*?\*\//g, " ");
  const sqlCode = stripSql(sql);
  const fnCode  = stripSql(fn);

  if (!/notices_live/.test(app))
    bad.push("the app no longer reads notices_live, so the Notices tab shows nothing");
  if (/rest\/v1\/notices\?/.test(app) || /from\("notices"\)/.test(app))
    bad.push("the app is reading the notices TABLE rather than the notices_live view — the view is what decides which columns the public gets");
  /* The publishable key must never appear on a write to notices. */
  const writes = [...app.matchAll(/method:\s*"(POST|PATCH|PUT|DELETE)"[\s\S]{0,400}?notices/g)];
  if (writes.length)
    bad.push("the app appears to write to notices with the publishable key — anyone who opens the app could then post an announcement");

  if (sql) {
    if (!/alter table public\.notices enable row level security/.test(sqlCode))
      bad.push("Row Level Security is not enabled on notices, so the public key could read and write the raw table");
    if (!/revoke all on public\.notices from anon/.test(sqlCode))
      bad.push("the notices table is not revoked from the anon role");
    if (!/grant select on public\.notices_live to anon/.test(sqlCode))
      bad.push("notices_live is not readable by the app's key, so the tab would always be empty");
    /* The fix that must never be taken. */
    if (/grant[^;]*\b(insert|update|delete|all)\b[^;]*on\s+public\.notices\b[^;]*to[^;]*service_role/i.test(sqlCode))
      bad.push("the migration grants the service key write access to the notices table — publish_notice() exists so that key can publish a notice and nothing else; a grant hands an internet-facing Worker the whole table");
  } else bad.push("db/001_notices.sql is missing — nothing documents how the notices table is meant to be set up");

  /* The one privilege the Worker has, and the guards that keep it to one. */
  if (fn) {
    if (!/security definer/i.test(fnCode))
      bad.push("publish_notice is not security definer, so it runs as the caller — which holds no privileges on notices and cannot write");
    if (!/set\s+search_path\s*=/i.test(fnCode))
      bad.push("publish_notice does not pin its search_path — a security definer function without one can be redirected through a schema someone else controls");
    if (!/revoke all on function public\.publish_notice\(jsonb\) from public/i.test(fnCode))
      bad.push("EXECUTE on publish_notice is not revoked from PUBLIC — Postgres grants it by default, which would make it callable with the key that ships inside the app");
    if (!/grant execute on function public\.publish_notice\(jsonb\) to service_role/i.test(fnCode))
      bad.push("publish_notice is not executable by service_role, so the Worker cannot save a notice");
  } else bad.push("db/002_publish_notice.sql is missing — without it the service key has no way to write a notice at all");

  if (w) {
    if (!/SUPABASE_SERVICE_KEY/.test(w))
      bad.push("the Worker has no service key for notices, so nothing can write one");
    if (!/env\.SUPABASE_SERVICE_KEY\)\s*\n?\s*return json\(\{ error: "Notices are not configured/.test(w)
        && !/!env\.SUPABASE_URL \|\| !env\.SUPABASE_SERVICE_KEY/.test(w))
      bad.push("the Worker does not check the notices configuration before using it, so a missing secret fails obscurely");
    for (const field of ["big_picture", "ios_attachments", "chrome_web_image"])
      if (!w.includes(field))
        bad.push(`a poster would not reach one platform: ${field} is missing from the send`);
    if (!/rpc\/\$\{fn\}|rpc\/publish_notice/.test(w) || !/"publish_notice"/.test(w))
      bad.push("the Worker does not save the notice through publish_notice() — the service key holds no INSERT on the table, so this fails with 42501 after the poster has already been uploaded");
    if (/\/rest\/v1\/notices\b/.test(w))
      bad.push("the Worker is writing the notices table directly again — that is the 42501 that broke the first send");
    /* A notice that fails to save must not leave its poster behind. */
    if (!/deletePoster/.test(w))
      bad.push("a failed notice would leave its uploaded poster in the bucket for ever, with nothing pointing at it");
    /* Every subscriber today is Safari web push, which will not draw the
       poster in the banner. The tap is the only way to the picture, so it must
       land on the notice itself rather than on the tab. */
    if (!/#notice=\$\{id\}/.test(w))
      bad.push("the notice notification does not deep-link to the notice it is about — on Safari web push the banner carries no poster, so a tap that lands on the home screen loses the picture entirely");
  }

  /* ...and the app has to act on that link. It had no hash handling at all
     when notices shipped, so #notices in the notification did nothing. */
  if (!/ntOpenFromHash/.test(app))
    bad.push("the app ignores the #notice= link a notification arrives with, so tapping one opens the home screen instead of the poster");
  if (!/addEventListener\("hashchange", ntOpenFromHash\)/.test(app))
    bad.push("the app only reads #notice= at startup — a notification tapped while the app is already open changes the hash without reloading, and would be ignored");

  /* The unread dot, and the thing that broke it.

     The tab bar's click handler used to repeat switchTab's body rather than
     call it. The two drifted: the notices refresh was added to switchTab, so
     tapping the Notices tab never reloaded them — and later the unread dot
     never cleared, because the code that clears it lives there too. Nothing
     failed loudly; the tab simply showed yesterday's list under a red dot.
     One way into a tab, enforced here. */
  if (!/switchTab\(name\);/.test(app))
    bad.push("the tab bar no longer goes through switchTab — a second copy of that logic drifts from the first, which is how tapping Notices stopped refreshing them");
  for (const [re, why] of [
    [/data-new/,      "the unread dot has no state to show — a notice nobody saw looks identical to one everybody read"],
    [/ntUpdateDot/,   "nothing sets the unread dot"],
    [/ntMarkAllSeen/, "nothing clears the unread dot, so it would burn permanently once lit"],
    [/NT_SEEN/,       "what this phone has already seen is not recorded, so the dot cannot mean anything"],
  ]) if (!re.test(app)) bad.push(why);
  /* Which notices a person has read is theirs. It is kept on the phone and
     must never be sent anywhere. */
  if (/(body|payload)[\s\S]{0,120}NT_SEEN|NT_SEEN[\s\S]{0,120}fetch\(/.test(app))
    bad.push("what this phone has read appears to be leaving it — that belongs on the device and nowhere else");

  /* The service key must never be committed, anywhere. Comments are stripped
     first: the files carry warnings that say "never put the service_role key
     here", and a check that fires on its own warning teaches people to ignore
     it. Only a value that looks like a real key counts. */
  for (const f of ["index.html", "admin.html", "worker/wrangler.toml"]) {
    if (!existsSync(f)) continue;
    const code = readFileSync(f, "utf8")
      .replace(/<!--[\s\S]*?-->/g, " ")
      .replace(/\/\*[\s\S]*?\*\//g, " ")
      .replace(/^\s*(\/\/|#).*$/gm, " ");
    const leak = /sb_secret_[A-Za-z0-9_-]{10,}/.test(code)
              || /["'`]eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/.test(code)
              || /SUPABASE_SERVICE_KEY\s*[:=]\s*["'`][^"'`\s]{12,}/.test(code);
    if (leak)
      bad.push(`${f} looks like it carries a Supabase service key — that key bypasses every access rule and must live only in Cloudflare's secret store`);
  }

  if (bad.length) bad.forEach(fail);
  else ok("notices — the app reads the public view, the Worker writes through publish_notice() on a key with no table privileges of its own, and a poster reaches all three platforms");
}

/* ---- 3x. the duʿā translations still line up with the duʿās ----

   Every duʿā's Urdu, Gujarati and Arabic is keyed by its POSITION in its
   category: dua.day.0.label, dua.day.1.label, and so on. Insert a duʿā into
   the middle of a category and nothing breaks loudly — every translation after
   it slides up by one, and the app calmly shows the wrong meaning under the
   wrong Arabic, in three languages, on a screen people use to worship.

   So each category is fingerprinted by its labels in order. Appending to the
   end changes only that category's fingerprint and is a one-line update here.
   Inserting or reordering also changes it — and that is the point: it cannot
   happen quietly.

   The same check also runs the Qurʼanic verifier, which holds the "From the
   Qurʼan" category to the text in quran/surahs/ letter for letter.           */
{
  const EXPECTED = {
    day:        "f8a40f94c180",
    food:       "5b7dcfb507c1",
    ramadan:    "88ddd5566049",
    masjid:     "fe0a3a59173f",
    hardship:   "5a5867dfe48a",
    health:     "e58edd0af597",
    travel:     "f3b1790925d1",
    people:     "45d6ce46ca07",
    marriage:   "9904fff4304e",
    death:      "82ab941489e4",
    weather:    "e5da9f87c298",
    quran:      "78c7b96c15fa",
  };
  const bad = [];
  const w = {};
  try { new Function("window", readFileSync("quran/duas.js", "utf8"))(w); }
  catch (e) { bad.push("quran/duas.js does not parse: " + e.message); }

  const cats = (w.DUAS && w.DUAS.categories) || [];
  if (!cats.length) bad.push("quran/duas.js defines no duʿā categories");

  for (const c of cats) {
    const fp = createHash("sha256").update(c.items.map(i => i.label).join(" ")).digest("hex").slice(0, 12);
    if (!(c.id in EXPECTED))
      bad.push(`the duʿā category "${c.id}" is new — add its fingerprint (${fp}) to check 3x so its translations are pinned too`);
    else if (EXPECTED[c.id] !== fp)
      bad.push(`the duʿās in "${c.id}" have changed order or content. If you APPENDED, update its fingerprint to ${fp}. `
             + `If you inserted or reordered, stop: dua.${c.id}.<n> translation keys are positional, and every translation `
             + `after the insertion point now describes the wrong duʿā in Urdu, Gujarati and Arabic.`);
  }
  for (const id of Object.keys(EXPECTED))
    if (!cats.some(c => c.id === id)) bad.push(`the duʿā category "${id}" has gone`);

  /* …and the Qurʼanic ones really are the Qurʼan. */
  try {
    execFileSync("node", ["scripts/verify-quran-duas.mjs"], { stdio: "pipe" });
  } catch (e) {
    const out = (e.stdout || "") + (e.stderr || "");
    bad.push("the Qurʼanic duʿās no longer match the verified Qurʼan — " +
             (String(out).split("FAIL")[1] || "run node scripts/verify-quran-duas.mjs").trim().slice(0, 200));
  }

  /* …and the hadith ones really are the hadith. The source editions are not
     committed, so on a clean clone this compares the Arabic in duas.js
     against the hashes recorded when it was lifted; with the editions
     present it re-extracts and compares byte for byte. It also catches a
     duʿā that repeats one already in the app. */
  try {
    execFileSync("node", ["scripts/verify-hadith-duas.mjs"], { stdio: "pipe" });
  } catch (e) {
    const out = (e.stdout || "") + (e.stderr || "");
    bad.push("the hadith duʿās no longer match the text they were lifted from — " +
             (String(out).split("FAIL")[1] || "run node scripts/verify-hadith-duas.mjs").trim().slice(0, 200));
  }

  if (bad.length) bad.forEach(fail);
  else ok(`duʿās — ${cats.length} categories pinned against a translation shift, the Qurʼanic ones verified against quran/surahs/, the hadith ones against the text they were lifted from`);
}

/* ---- 3z. nothing reaches for an element that is not there ----

   switchTab() hides every pane and shows one, by walking a hard-coded list of
   names and calling getElementById on each. A dead Qurʼan panel was removed
   from the markup and its name was left in that list, so the call returned
   null, setting .hidden threw, and the loop died in the middle — after hiding
   the pane you were on and before showing the one you asked for.

   The tabs after the dead name in that list were Alerts, Donate and Qibla.
   All three went blank. Donate is how the masjid is funded, and it stayed
   that way for three releases, because no check looked and no test opened it.

   Two things are checked here, because the same mistake has two shapes:

     the tab list      must name exactly the tab- panes in the markup, in
                       both directions — a pane added and not listed never
                       hides, a pane removed and still listed throws

     every literal id  passed to getElementById must exist in the markup, or
                       be created by the script itself (st.id = "mu-font").
                       Comments are stripped first: an id mentioned in prose
                       is not an id in the document.                          */
{
  const html = readFileSync("index.html", "utf8");
  const markup = html.replace(/<!--[\s\S]*?-->/g, "");
  const bad = [];

  const panes = [...new Set([...markup.matchAll(/id="tab-([a-z]+)"/g)].map(m => m[1]))].sort();
  const m = html.match(/\[([^\]]*)\]\.forEach\(n\s*=>\s*\{\s*\n\s*document\.getElementById\("tab-"\s*\+\s*n\)/);
  if (!m) bad.push("could not find the tab list switchTab() walks — has it been rewritten? this check needs updating");
  else {
    const listed = m[1].split(",").map(x => x.trim().replace(/^["']|["']$/g, "")).filter(Boolean).sort();
    for (const n of listed) if (!panes.includes(n))
      bad.push(`switchTab() lists the tab "${n}" but there is no <… id="tab-${n}"> — getElementById returns null and setting .hidden throws, ` +
               `which stops the loop and leaves every tab after it in the list unreachable`);
    for (const n of panes) if (!listed.includes(n))
      bad.push(`there is a pane id="tab-${n}" that switchTab() does not list, so it is never hidden when another tab is opened`);
  }

  /* ids the script creates for itself count as present. */
  const made = new Set([...html.matchAll(/\.id\s*=\s*["']([^"']+)["']/g)].map(x => x[1]));
  const present = new Set([...markup.matchAll(/\bid="([^"]+)"/g)].map(x => x[1]));
  const dangling = [...new Set([...html.matchAll(/getElementById\(\s*["']([^"']+)["']\s*\)/g)].map(x => x[1]))]
    .filter(id => !present.has(id) && !made.has(id));
  for (const id of dangling)
    bad.push(`getElementById("${id}") — no element with that id exists in index.html`);

  if (bad.length) bad.forEach(fail);
  else ok(`element references — ${panes.length} tab panes all listed in switchTab() and nothing reaches for an id that is not there`);
}

/* ---- 4a. every combination the giving screen offers must go somewhere ----

   The giving screen offers a fund, a frequency and an amount, and the button
   at the bottom has to go somewhere. The masjid's Stripe links are not
   guessable, and a guessed one either 404s or sends somebody's ṣadaqah to the
   wrong place.

   Not every combination has a link, and that is legitimate: the masjid never
   made a recurring link for an amount the donor types, because a Payment Link
   carries its own fixed price. What is NOT legitimate is offering a
   combination that leads nowhere — so any amount without a link for the
   chosen frequency has to be greyed out, and this checks that it is.

   The fund is deliberately absent from the table: ṣadaqah and lillāh are
   designations, not products, and ride on the same links as
   client_reference_id. So the fund is checked to be carried, not looked up. */
{
  const html = readFileSync("index.html", "utf8");
  const bad = [];
  const m = html.match(/const GIVING_LINKS = \{([\s\S]*?)\n\};/);
  if (!m) bad.push("GIVING_LINKS is gone from index.html — the giving screen needs it");
  else {
    const body = m[1].replace(/\/\*[\s\S]*?\*\//g, "");
    /* freq -> { amount: link } */
    const table = {};
    for (const blk of body.matchAll(/([a-z]+)\s*:\s*\{([^}]*)\}/g)) {
      table[blk[1]] = {};
      for (const row of blk[2].matchAll(/["']([a-z0-9]+)["']\s*:\s*["']([^"']*)["']/g))
        if (row[2]) table[blk[1]][row[1]] = row[2];
    }
    const grab = k => [...new Set([...html.matchAll(
      new RegExp(`data-gv="${k}" data-val="([a-z0-9]+)"`, "g"))].map(x => x[1]))];
    const funds = grab("fund"), freqs = grab("freq"), amts = grab("amt");
    if (!funds.length || !freqs.length || !amts.length)
      bad.push("the giving screen's fund, frequency or amount options could not be read");

    for (const q of freqs) {
      if (!table[q]) { bad.push(`the giving screen offers "${q}" but GIVING_LINKS has no such frequency`); continue; }
      if (!Object.keys(table[q]).length)
        bad.push(`no link at all for "${q}" — every amount under it would be dead. ` +
                 `Ask the masjid for the Stripe links; do not invent them.`);
      for (const a of Object.keys(table[q]))
        if (!amts.includes(a)) bad.push(`GIVING_LINKS has "${q}.${a}", which the screen never offers`);
    }
    /* Whatever the screen opens on must work, or the first thing a donor sees
       is a dead button. */
    const on = k => (html.match(new RegExp(`data-gv="${k}" data-val="([a-z0-9]+)" aria-pressed="true"`)) || [])[1];
    const d = { freq: on("freq"), amt: on("amt") };
    if (!d.freq || !d.amt) bad.push("the giving screen has no default frequency or amount selected");
    else if (!(table[d.freq] || {})[d.amt])
      bad.push(`the giving screen opens on ${d.freq}/${d.amt}, which has no link — the first thing a donor sees is a dead button`);

    /* A combination with no link must be unreachable, not merely broken. */
    const render = (html.match(/function gvRender\(\)\{[\s\S]*?\n\}/) || [""])[0];
    if (!/\bdisabled\s*=\s*![\s\S]{0,120}GIVING_LINKS\[GV\.freq\]/.test(render))
      bad.push("gvRender no longer greys out amounts the chosen frequency has no link for, " +
               "so the screen can offer a combination that goes nowhere");

    /* The fund is not in the table, so it has to travel some other way. */
    if (!/client_reference_id=["'\s]*\+\s*encodeURIComponent\(GV\.fund\)/.test(html) &&
        !/client_reference_id=" \+ encodeURIComponent\(GV\.fund\)/.test(html))
      bad.push("the chosen fund is not sent with the payment — ṣadaqah, lillāh and the general " +
               "fund would all arrive at Stripe indistinguishable");
  }
  if (bad.length) bad.forEach(fail);
  else ok("everyday giving — every combination the screen offers has a real link, and the fund travels with it");
}

/* ---- 4b. the charity collection form records a real agreement ----

   This form is a legal-ish artefact: it replaces a signed paper sheet, and
   the row it writes says a named person agreed to the masjid's collection
   rules on behalf of a charity. Two things therefore have to be true of it,
   and neither is visible in a screenshot.

   THE AGREEMENT MUST COME FROM THE CHECKBOX. Sending a literal `true` for
   rules_accepted or privacy_accepted looks identical in a diff and passes
   every manual test, because the validation above it refuses to submit with
   the box unticked. But it turns a two-layer guarantee into a one-layer one:
   remove or break the validation and the app records an agreement nobody
   gave. The website's own volunteer form carries a comment about exactly
   this mistake, caught there by a negative control.

   THE VERSION ON SCREEN MUST BE THE VERSION SENT. The rules are versioned so
   that changing them later does not rewrite what past applicants signed. If
   the screen prints one version and the payload carries another, the row is
   a record of an agreement to rules the applicant never read.

   And the payload must carry every field request_charity_collection() reads,
   or the office is handed a request with blanks in it.                    */
{
  const html = readFileSync("index.html", "utf8");
  const bad = [];

  /* Everything request_charity_collection() reads out of the payload —
     db/030_charity_collections.sql in the website repository. */
  const REQUIRED = [
    "requested_date", "org_name", "org_address", "org_phone", "org_email",
    "charity_number", "collector_name", "collector_role", "collector_paid",
    "trustee_name", "trustee_phone", "trustee_email",
    "rules_version", "rules_accepted", "signed_name", "privacy_accepted",
    "bmcc_certificate_path", "bmcc_certificate_date",
  ];

  const submit = (html.match(/function ccSubmit\(e\)\{[\s\S]*?\n\}/) || [""])[0];
  if (!submit) {
    bad.push("ccSubmit is gone from index.html — the charity collection form needs it");
  } else {
    if (!/rpc\/request_charity_collection/.test(submit))
      bad.push("the charity collection form no longer posts to request_charity_collection");

    const missing = REQUIRED.filter(k => !new RegExp(`\\b${k}\\s*:`).test(submit));
    if (missing.length)
      bad.push(`the charity collection payload is missing ${missing.join(", ")} — ` +
               `the office would be handed a request with blanks in it`);

    /* The two agreements, read from their checkboxes rather than asserted. */
    for (const [key, box] of [["rules_accepted", "cc-agree-rules"],
                              ["privacy_accepted", "cc-agree-priv"]]) {
      const line = (submit.match(new RegExp(`${key}\\s*:\\s*([^,\n]+)`)) || [])[1] || "";
      if (!line.includes(box) || !line.includes("checked"))
        bad.push(`${key} is not read from the ${box} checkbox — it sends ${line.trim() || "nothing"}. ` +
                 `A literal here records an agreement nobody gave.`);
    }

    if (!/rules_version:\s*CC_RULES_VERSION/.test(submit))
      bad.push("the charity collection payload does not send CC_RULES_VERSION, so the row " +
               "would not say which rules the applicant agreed to");
  }

  /* The version printed above the form is the same constant that is sent. */
  const init = (html.match(/function initCollect\(\)\{[\s\S]*?\n\}/) || [""])[0];
  if (!/getElementById\("cc-rules-ver"\)\.textContent\s*=\s*CC_RULES_VERSION/.test(init))
    bad.push("the rules version shown on screen is not CC_RULES_VERSION, so the applicant " +
             "can be shown one version and have another recorded against them");

  const ver = (html.match(/const CC_RULES_VERSION\s*=\s*"([^"]+)"/) || [])[1];
  if (!ver || !/^\d{4}-\d{2}-\d{2}$/.test(ver))
    bad.push("CC_RULES_VERSION is missing or is not a date — it is stored on every row");

  /* The date field must be bounded by the notice period rather than by a
     hard-coded date that goes stale — and the sentence under it names a date,
     so it has to be REDRAWN when the language changes rather than translated
     once at startup. Both live in ccDateBounds(); this checks that they do,
     that opening the screen calls it, and that a language change does too.
     The last of those is how it was caught: the hint stayed in English. */
  const bounds = (html.match(/function ccDateBounds\(\)\{[\s\S]*?\n\}/) || [""])[0];
  if (!/date\.min\s*=\s*ccIso\(/.test(bounds) || !/date\.max\s*=\s*ccIso\(/.test(bounds))
    bad.push("the collection date field is not bounded from ccFirstAllowed/ccLastAllowed, " +
             "so it can offer a date the masjid cannot take");
  if (!/cc-date-hint/.test(bounds))
    bad.push("the earliest-date sentence is not written by ccDateBounds, so it will not " +
             "be redrawn when the language changes");
  const openFn = (html.match(/function openCollect\(\)\{[\s\S]*?\n\}/) || [""])[0];
  if (!/ccDateBounds\(\)/.test(openFn))
    bad.push("openCollect does not call ccDateBounds, so the date bounds go stale " +
             "on a phone left open overnight");
  const refresh = (html.match(/function refreshRenderedText\(\)\{[\s\S]*?\n\}/) || [""])[0];
  for (const [screen, fn] of [["collect", "ccDateBounds"], ["giving", "gvRender"]])
    if (!new RegExp(`open\\("${screen}"\\)\\)\\s*${fn}\\(\\)`).test(refresh))
      bad.push(`refreshRenderedText does not redraw the ${screen} screen, so text its own ` +
               `code writes stays in the previous language when somebody switches`);
  const notice = Number((html.match(/const CC_NOTICE_DAYS\s*=\s*(\d+)/) || [])[1]);
  if (notice !== 14)
    bad.push(`CC_NOTICE_DAYS is ${notice || "missing"}; request_charity_collection() enforces 14, ` +
             `so the form would offer dates the database then refuses`);

  /* ---- the BMCC certificate ----
     A charity cannot collect in Bolton without one, and the masjid will not
     take a request without seeing it. Three things have to hold.

     THE CERTIFICATE GOES UP BEFORE THE REQUEST. The other order writes a row
     saying a certificate exists and then fails to produce one; this order, at
     worst, leaves an unreferenced file in a private bucket. If ccUpload stops
     gating the request, that ordering is gone.

     THE FILE IS CHECKED BEFORE IT IS SENT. Storage enforces the type and the
     5 MB cap itself, but it answers with a status code, and somebody who has
     just waited for a 12 MB photo to upload deserves to have been told first.

     THE THREE MONTHS MATCH THE DATABASE. request_charity_collection() is
     where the rule is enforced; this copy only exists so the form can refuse
     early. If they disagree, the form offers dates the database then refuses. */
  if (submit) {
    if (!/ccUpload\(CC\.file\)\s*\.then\(\s*certPath\s*=>/.test(submit))
      bad.push("the certificate is no longer uploaded before the request is sent — " +
               "a request can now be written claiming a certificate that was never stored");
    if (!/bmcc_certificate_path:\s*certPath/.test(submit))
      bad.push("the payload does not carry the path ccUpload returned, so the office " +
               "would have a request it cannot find the certificate for");
  }
  const take = (html.match(/function ccTakeFile\([\s\S]*?\n\}/) || [""])[0];
  if (!/CC_CERT_TYPES\[file\.type\]/.test(take))
    bad.push("ccTakeFile no longer checks the file type before upload");
  if (!/file\.size\s*>\s*CC_CERT_MAX/.test(take))
    bad.push("ccTakeFile no longer checks the file size before upload");

  const months = Number((html.match(/const CC_CERT_MONTHS\s*=\s*(\d+)/) || [])[1]);
  if (months !== 3)
    bad.push(`CC_CERT_MONTHS is ${months || "missing"}; request_charity_collection() enforces 3, ` +
             `so the form would accept a certificate the database then refuses`);
  const max = (html.match(/const CC_CERT_MAX\s*=\s*([^;]+);/) || [])[1] || "";
  if (!/5\s*\*\s*1024\s*\*\s*1024/.test(max))
    bad.push("CC_CERT_MAX no longer matches the 5 MB cap the bmcc bucket enforces");

  /* Validation must actually gate on the file, or the upload is attempted
     with nothing in hand. */
  const val = (html.match(/function ccValidate\(\)\{[\s\S]*?\n\}/) || [""])[0];
  if (!/if\(!CC\.file\)/.test(val))
    bad.push("ccValidate no longer requires a certificate, so the form can be submitted without one");

  if (bad.length) bad.forEach(fail);
  else ok(`charity collections — all ${REQUIRED.length} fields sent, the BMCC certificate uploaded ` +
          `before the request and checked against the same 3 months the database enforces, and ` +
          `both agreements read from their checkboxes`);
}

/* ---- 4c. a swipe cannot be triggered by scrolling past it ----

   Reported as "the page moves — I need it to stick and only scroll up and
   down". The cause was not the scroll container. It was five hand-rolled
   swipe handlers, each of which measured ONE axis and ignored the other: the
   day strip changed the day on any touch that ended 50px to the side, however
   far it had travelled vertically. A thumb never scrolls in a straight line,
   so reading down the home screen kept moving the page off the day.

   All five now go through onSwipe(), which requires the gesture to beat the
   other axis by half again before it counts. This refuses a build that grows
   a sixth hand-rolled one, and one that lets a sheet be dragged sideways.  */
{
  const html = readFileSync("index.html", "utf8");
  const bad = [];

  const helper = (html.match(/function onSwipe\([\s\S]*?\n\}/) || [""])[0];
  if (!helper) bad.push("onSwipe is gone from index.html — the swipe handlers need it");
  else {
    /* Both axes read, and compared against each other. */
    if (!/clientX/.test(helper) || !/clientY/.test(helper))
      bad.push("onSwipe no longer reads both axes, so a scroll can trigger a swipe again");
    if (!/Math\.abs\(along\)\s*<\s*Math\.abs\(across\)/.test(helper))
      bad.push("onSwipe no longer compares the gesture against the other axis — distance " +
               "alone is what let a vertical scroll change the day");
    if (!/e\.touches\.length !== 1/.test(helper))
      bad.push("onSwipe no longer ignores multi-touch, so a pinch counts as a swipe");
  }

  /* Nobody may hand-roll another one. A touchstart that stashes a coordinate
     is the shape of the bug; onSwipe is the only place allowed to do it. */
  const body = html.replace(/<!--[\s\S]*?-->/g, " ").replace(/\/\*[\s\S]*?\*\//g, " ");
  const rolled = [...body.matchAll(/addEventListener\(\s*["']touchstart["'][\s\S]{0,220}?clientX/g)];
  /* onSwipe itself, and the mushaf reader, which tracks a live drag rather
     than classifying one gesture at the end and is exempt by name. */
  const allowed = rolled.filter(m => {
    const around = body.slice(Math.max(0, m.index - 900), m.index);
    return /function onSwipe/.test(around) || /mushaf/i.test(around);
  });
  if (rolled.length > allowed.length)
    bad.push(`${rolled.length - allowed.length} hand-rolled swipe handler(s) outside onSwipe — ` +
             `each one is a chance to measure a single axis again and move the page ` +
             `under somebody who was only scrolling`);

  /* And the sheets themselves must not be draggable sideways. A scroller with
     overflow-y:auto and overflow-x unset computes overflow-x to AUTO, so this
     has to be said rather than assumed. */
  const sh = (html.match(/\.sh-body\{[^}]*\}/) || [""])[0];
  if (!/overflow-x:\s*hidden/.test(sh))
    bad.push(".sh-body does not set overflow-x:hidden, so every sheet is a horizontal " +
             "scroller and anything that overhangs can be dragged");
  if (!/overscroll-behavior:\s*contain/.test(sh))
    bad.push(".sh-body does not contain its overscroll, so scrolling past the end of a " +
             "sheet drags the page underneath it");

  if (bad.length) bad.forEach(fail);
  else ok("swipes — all gestures go through onSwipe and must beat the other axis, and no sheet scrolls sideways");
}

/* ---- 3y. the Bukhārī text is licensed before it ships ----

   The hadith text is NOT ours. It is third-party open data under the ODbL,
   and that licence only holds if the attribution travels with it. An app
   store can ask to see the right to ship this; "it was on GitHub" is not an
   answer, and neither is a licence file nobody can find.

   So: the pack must name its source and its licence, must carry the licence
   text beside the data, and the app must both refuse to render a pack that
   names neither AND print the attribution on screen rather than burying it.

   The count is pinned too. A reference whose numbering silently changes
   length is worse than no reference — somebody citing hadith 5,000 today
   would be citing a different one tomorrow.                                */
{
  const PACK = "quran/hadith/bukhari";
  const app = readFileSync("index.html", "utf8");
  const bad = [];
  if (!existsSync(`${PACK}/index.json`)) {
    bad.push("the Bukhārī pack is missing — run node scripts/build-bukhari.mjs");
  } else {
    let meta = null;
    try { meta = JSON.parse(readFileSync(`${PACK}/index.json`, "utf8")); }
    catch (e) { bad.push("the Bukhārī index.json does not parse: " + e.message); }

    if (meta) {
      if (!meta.source)      bad.push("the Bukhārī pack names no source — it cannot be shipped without saying where the text came from");
      if (!meta.licence)     bad.push("the Bukhārī pack names no licence — this text is third-party open data, not ours");
      if (!meta.attribution) bad.push("the Bukhārī pack carries no attribution line, which the ODbL requires to travel with the data");
      if (meta.highest !== 7563)
        bad.push(`the Bukhārī numbering runs to ${meta.highest}, expected 7563 — this is the number people cite, and changing it breaks every reference made from the app`);
      if (meta.books !== 97)
        bad.push(`the Bukhārī pack lists ${meta.books} books, expected 97`);

      /* Every book the index promises must actually be there, and the books
         must between them account for the hadith. A reference that silently
         loses a book is worse than one that fails loudly. */
      if (!existsSync(`${PACK}/books.json`)) {
        bad.push("the Bukhārī pack has no books.json — there would be nothing to browse, only a flat list");
      } else {
        const books = JSON.parse(readFileSync(`${PACK}/books.json`, "utf8"));
        const missing = books.filter(b => !existsSync(`${PACK}/b/${b.n}.json`));
        if (missing.length)
          bad.push(`the Bukhārī pack is missing ${missing.length} book file(s), first: book ${missing[0].n} (${missing[0].name})`);
        const unnamed = books.filter(b => !b.name || /^Book \d+$/.test(b.name));
        if (unnamed.length)
          bad.push(`${unnamed.length} Bukhārī book(s) have no name, so the list would read as bare numbers`);
        const total = books.reduce((a, b) => a + b.count, 0);
        if (total < meta.count - 20)
          bad.push(`the books account for ${total} hadith but the pack holds ${meta.count} — ${meta.count - total} are unreachable by browsing`);
      }
      if (!existsSync(`${PACK}/search.json`))
        bad.push("the Bukhārī search index is missing, so search would fail on a device with no connection to rebuild it");
    }
    if (!existsSync(`${PACK}/LICENCE.txt`))
      bad.push("the Bukhārī pack has no LICENCE.txt beside the data — the ODbL notice has to travel with it");
    else {
      const lic = readFileSync(`${PACK}/LICENCE.txt`, "utf8");
      if (!/unlicense\.org|public domain/i.test(lic))
        bad.push("the Bukhārī LICENCE.txt does not state the public-domain dedication it is shipped under");
      if (!/hadith-api/i.test(lic))
        bad.push("the Bukhārī LICENCE.txt does not record where the text came from");
      /* The store question is "show me the right to ship this". The answer
         has to include why no translation is bundled. */
      if (!/NO ENGLISH TRANSLATION/i.test(lic))
        bad.push("the Bukhārī LICENCE.txt no longer explains why no translation is bundled — that is the part a store actually asks about");
    }
  }

  /* The app side: refuse an unlicensed pack, and show the credit. */
  if (!/pack names no source or licence/.test(app))
    bad.push("the app no longer refuses a Bukhārī pack that names no source and licence — it would render text the masjid cannot evidence rights to");
  if (!/hd-attr/.test(app) || !/m\.attribution/.test(app))
    bad.push("the app does not print where the Bukhārī text came from, which is how the masjid can answer for it");
  /* The whole point of the rebuild: it must open on the books. */
  if (!/hdShowBooks/.test(app) || !/books\.json/.test(app))
    bad.push("the Bukhārī reader no longer browses by book — a flat list of 7,580 numbered paragraphs is not a readable Bukhārī");

  /* The English is linked, not bundled, and that has to stay true in both
     directions: the link must be there, and no bundled translation may
     quietly appear beside the Arabic without the permission to match.

     Every complete English Bukhārī in circulation is in copyright. A dataset
     claiming otherwise does not own it. If one is ever added, the permission
     goes in LICENCE.txt first and this check gets updated deliberately. */
  if (!/https:\/\/sunnah\.com\/bukhari:/.test(app) || !/hd-en/.test(app))
    bad.push("the Bukhārī reader no longer offers the English — the Arabic is linked to its translation by number, and without that link a non-Arabic reader gets nothing");
  {
    const lic = existsSync(`${PACK}/LICENCE.txt`) ? readFileSync(`${PACK}/LICENCE.txt`, "utf8") : "";
    const granted = /PERMISSION GRANTED/i.test(lic);
    const bundled = existsSync(`${PACK}/en`) ||
      (existsSync(`${PACK}/b/1.json`) && /"en"\s*:/.test(readFileSync(`${PACK}/b/1.json`, "utf8")));
    if (bundled && !granted)
      bad.push("an English translation has been bundled into the Bukhārī pack, but LICENCE.txt records no permission for it. " +
               "Every complete English Bukhārī is in copyright; see store/PERMISSION-LETTERS.md before shipping one.");
  }
  /* The search normaliser destroys Arabic if its ranges are wrong, and the
     failure is silent: every query matches everything, or nothing.

     The probe is taken FROM THE PACK, never typed here. A hand-typed Arabic
     probe has now given a false answer three times in this codebase — the
     characters get reordered in transit and the literal stops matching the
     text it is meant to represent. Compare the app's normaliser against the
     index the builder actually produced. */
  if (existsSync(`${PACK}/b/1.json`) && existsSync(`${PACK}/search.json`)) {
    const m = app.match(/function hdSearchable\(s\)\{[\s\S]*?\n\}/);
    if (!m) {
      bad.push("the Bukhārī search normaliser is gone");
    } else {
      const fn = new Function("return (" + m[0] + ")")();
      const raw = JSON.parse(readFileSync(`${PACK}/b/1.json`, "utf8"))[0].ar;
      const built = JSON.parse(readFileSync(`${PACK}/search.json`, "utf8"))[0][2];
      const mine = fn(raw);
      if (!mine.trim())
        bad.push("the app's Bukhārī search normaliser reduces a real hadith to nothing — every query would match everything or nothing");
      else if (mine !== built)
        bad.push("the app normalises search text differently from the builder, so a query will never match the index it is searching " +
                 `(app produced ${mine.length} chars, the index holds ${built.length})`);
    }
  }

  /* The reader must not reuse the hall booking's element ids. They collided
     once: bk-title, bk-prev, bk-next and bk-back existed twice, and
     getElementById takes the first, which broke both screens at once. */
  for (const id of ["bk-title", "bk-prev", "bk-next", "bk-back", "bk-list", "bk-search"]) {
    const n = (app.match(new RegExp(`id="${id}"`, "g")) || []).length;
    if (n > 1) bad.push(`id="${id}" appears ${n} times — the hall booking and the hadith reader are fighting over it, and only the first will ever be found`);
  }

  /* ---- and somebody has to be able to GET there ----

     This is the one that was missed. The reader was added to the "Recite"
     panel, which nothing in the app can open — no tab carries data-tab
     "recite", nothing calls switchTab("recite"), no drawer row points at it.
     The feature was complete, deployed, and unreachable.

     The browser test passed because it called openBukhari() directly, which
     is not a route a person has. A screen is not shipped until something a
     finger can land on opens it. */
  const tiles = [...app.matchAll(/class="tile" data-tile="([a-z]+)"/g)].map(m => m[1]);
  const actions = (app.match(/const TILE_ACTIONS = \{[\s\S]*?\n\};/) || [""])[0];
  for (const tile of tiles)
    if (!new RegExp(`\\b${tile}:\\s*\\(\\)`).test(actions))
      bad.push(`the home tile "${tile}" is tappable and wired to nothing — it will look broken`);
  if (!tiles.includes("bukhari"))
    bad.push("Ṣaḥīḥ al-Bukhārī has no home tile, so there is no way into it from the app");

  /* Any panel nothing can open is dead weight and a trap for the next
     person adding a feature to it. */
  const panels = [...app.matchAll(/<main id="tab-([a-z]+)"/g)].map(m => m[1]);
  for (const panel of panels) {
    const reachable = new RegExp(`data-tab="${panel}"|switchTab\\("${panel}"\\)`).test(app);
    if (!reachable)
      bad.push(`the "${panel}" panel cannot be opened from anywhere in the app — nothing carries data-tab="${panel}" and nothing calls switchTab("${panel}")`);
  }

  if (bad.length) bad.forEach(fail);
  else ok(`Ṣaḥīḥ al-Bukhārī — 97 books browsable, numbering to 7563, public domain and sourced, reachable from the home screen, and all ${tiles.length} tiles wired`);
}

/* ---- 4. the service worker cache changed when the app did ----
   Shipping sw.js with the same CACHE name is the same as not shipping it:
   the worker's bytes differ, so it installs, but it opens the cache that is
   already there and hands back everything already in it. ---- */
try {
  const changed = execSync("git diff --name-only origin/main...HEAD", { encoding: "utf8" }).split("\n");
  if (changed.includes("index.html") && !changed.includes("sw.js"))
    fail("index.html changed but sw.js did not — installed devices will keep serving the cached old build");
  if (changed.includes("sw.js")) {
    const nameOf = t => (t.match(/const CACHE\s*=\s*["']([^"']+)["']/) || [])[1];
    const was = nameOf(execSync("git show origin/main:sw.js", { encoding: "utf8" }));
    const now = nameOf(readFileSync("sw.js", "utf8"));
    if (was && now && was === now)
      fail(`sw.js changed but its cache is still ${now} — the new worker will serve the old shell straight back`);
  }
} catch { /* no git range available (e.g. a shallow checkout); skip */ }

/* ---- 5. everything parses ---- */
import { writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
const tmp = mkdtempSync(join(tmpdir(), "rel-"));
for (const f of ["index.html", "admin.html"]) {
  if (!existsSync(f)) continue;
  const blocks = [...R(f).matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]);
  if (!blocks.length) continue;
  // every block, not just the biggest: a broken one-liner ships just as badly
  let bad = 0;
  blocks.forEach((code, i) => {
    if (!code.trim()) return;
    const out = join(tmp, f.replace(/\W/g, "_") + "." + i + ".js");
    writeFileSync(out, code);
    try { execSync(`node --check ${out}`, { stdio: "pipe" }); }
    catch (e) { bad++; fail(`${f} script block ${i + 1} has a syntax error: ${String(e.stderr || e).split("\n").slice(1, 3).join(" ").trim()}`); }
  });
  if (!bad) ok(`${f} — all ${blocks.length} script block(s) parse`);
}
for (const f of ["sw.js", workerEntry && `worker/${workerEntry}`].filter(Boolean)) {
  if (!existsSync(f)) continue;
  try { execSync(`node --check ${f}`, { stdio: "pipe" }); ok(`${f} parses`); }
  catch (e) { fail(`${f} has a syntax error: ${String(e.stderr || e).split("\n").slice(0, 3).join(" ")}`); }
}

for (const n of notes) console.log("  ok    " + n);
for (const p of problems) console.error("  FAIL  " + p);
console.log(problems.length ? `\n${problems.length} problem(s) would reach devices.` : "\nAll release checks passed.");
process.exit(problems.length ? 1 : 0);
