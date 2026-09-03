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
  const src = existsSync("index.html") ? R("index.html") : "";
  if (src) {
    const found = [...src.matchAll(/https:\/\/buy\.stripe\.com\/[A-Za-z0-9_]+/g)].map(m => m[0]);
    const uniq = [...new Set(found)];
    const test = uniq.filter(u => u.includes("test_"));
    if (test.length) fail(`donation link in Stripe TEST MODE — it takes no money and looks identical: ${test.join(", ")}`);

    const missing = Object.keys(DONATE).filter(u => !uniq.includes(u));
    const extra = uniq.filter(u => !(u in DONATE));
    if (missing.length) fail(`donation link missing from index.html: ${missing.map(u => DONATE[u]).join(", ")}`);
    if (extra.length) fail(`unrecognised Stripe link in index.html — check it is the masjid's: ${extra.join(", ")}`);

    const old = [...src.matchAll(/https:\/\/(?:www\.)?taiyabahmasjid\.com\/product\/[^"']*/g)].map(m => m[0]);
    if (old.length) fail(`donation still points at the old shop: ${[...new Set(old)].join(", ")}`);

    /* Stripe cannot produce or store an HMRC declaration, so the app must not
       promise Gift Aid on a card payment. */
    if (/Gift\s*Aid/i.test(src.replace(/<!--[\s\S]*?-->/g, " ")))
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
