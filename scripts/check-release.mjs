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

/* ---- 4. the service worker cache changed when the app did ---- */
try {
  const changed = execSync("git diff --name-only origin/main...HEAD", { encoding: "utf8" }).split("\n");
  if (changed.includes("index.html") && !changed.includes("sw.js"))
    fail("index.html changed but sw.js did not — installed devices will keep serving the cached old build");
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
