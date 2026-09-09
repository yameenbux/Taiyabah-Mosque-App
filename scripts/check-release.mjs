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
import { execSync } from "node:child_process";

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
    /* book.stripe.com as well as buy.stripe.com: the hall deposit is on the
       other host, and a test-mode link there would ship just as invisibly. */
    const found = [...src.matchAll(/https:\/\/(?:buy|book)\.stripe\.com\/[A-Za-z0-9_]+/g)].map(m => m[0]);
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

    /* Stripe cannot produce or store an HMRC declaration, so the app must not
       promise Gift Aid on a card payment. */
    /* Comments explain why the app avoids Gift Aid; only what reaches a screen
       counts as a promise, so strip HTML and JS comments alike before looking. */
    const onScreen = src.replace(/<!--[\s\S]*?-->/g, " ")
                        .replace(/\/\*[\s\S]*?\*\//g, " ");
    if (/Gift\s*Aid/i.test(onScreen))
      fail("index.html promises Gift Aid, but the donation path is Stripe, which cannot produce a valid HMRC declaration");

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
