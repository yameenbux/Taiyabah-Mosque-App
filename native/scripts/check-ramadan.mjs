/* Does the Ramadan section hold together?
 *
 * There are three ways this section can be wrong, and none of them is a thing
 * anybody would notice before Ramadan — which is the worst possible time to
 * find out.
 *
 *   THE TWO PLATFORMS DISAGREE. The gate is written twice: once in
 *   native/src/ramadan.js and once in index.html, because the website cannot
 *   import an ES module out of the app's source. Two copies of a rule drift,
 *   and the thing they would drift on is the day the section opens.
 *
 *   A BLANK SHIPS AS A FACT. ramadan/content.js is half nulls on purpose —
 *   the four taraweeh students, the number of iʿtikāf places, the booking
 *   deadline, the fitrana amount. A null has to reach the screen as "To be
 *   confirmed". A null that renders as "null", as "0 of 0 left", or not at
 *   all is the masjid appearing to have answered a question it has not.
 *
 *   SOMETHING THE TIMETABLE OWNS GETS TYPED IN. A sehri time written into a
 *   content file is a time that will be wrong the year the timetable moves,
 *   and it will be wrong quietly.
 *
 * So this runs the real gate on real fixture dates, reads both platforms for
 * the numbers they claim, and walks content.js for anything it should not be
 * carrying. It imports nothing from a screen: a screen cannot be run here,
 * and a check that only reads source text can be fooled by a comment.
 *
 *   node scripts/check-ramadan.mjs
 */
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { ramadanAccess, ramadanState } from "../src/ramadan.js";

const root = path.resolve(import.meta.dirname, "..");
const html = fs.readFileSync(path.resolve(root, "..", "index.html"), "utf8");
const content = fs.readFileSync(path.resolve(root, "..", "ramadan", "content.js"), "utf8");
const screen = fs.readFileSync(path.join(root, "src/screens/Ramadan.jsx"), "utf8");
const logic = fs.readFileSync(path.join(root, "src/ramadan.js"), "utf8");

let pass = 0;
const fails = [];
const ok = (what, cond, why) => cond ? pass++ : fails.push(`${what}${why ? " — " + why : ""}`);
const eq = (what, a, b) => ok(what, a === b, `app says ${JSON.stringify(a)}, website says ${JSON.stringify(b)}`);

/* ---- 1. the two platforms carry the same numbers ---------------------- */

const num = (src, name) => {
  const m = src.match(new RegExp(`${name}\\s*=\\s*(\\d+)`));
  return m ? Number(m[1]) : null;
};
eq("OPEN_DAYS_BEFORE / RAM_OPEN_BEFORE", num(logic, "OPEN_DAYS_BEFORE"), num(html, "RAM_OPEN_BEFORE"));
eq("OPEN_DAYS_AFTER / RAM_OPEN_AFTER",   num(logic, "OPEN_DAYS_AFTER"),  num(html, "RAM_OPEN_AFTER"));
/* NEAR_DAYS is deliberately app-only: it changes the tone of the POSTER a
   month out, and the website's poster has no second tone to change into. So
   it is asserted to exist rather than compared, and the website is asserted
   not to have grown a second copy that could disagree with it. */
ok("NEAR_DAYS is the app's own", num(logic, "NEAR_DAYS") > 0 && num(html, "RAM_NEAR_DAYS") === null);

/* The month's name is matched by a regex on each side, and they have to be
   the same expression: a timetable that writes "Ramadhan" must open the
   section on both platforms or on neither. */
const month = src => (src.match(/\/\^rama\[[^/]*\/i/) || [])[0] || null;
ok("both platforms match the month the same way", !!month(logic));
eq("the month pattern", month(logic), month(html));

/* ---- 2. the gate, run for real on a month the timetable holds --------- */

/* A whole Ramadan, built the way the timetable writes one, so the real gate
   decides rather than a stub of it. Thirty nights beginning 2027-02-08. */
const days = {};
const iso = d => d.toISOString().slice(0, 10);
const FIRST = new Date("2027-02-08T12:00:00Z");
for (let i = -40; i < 70; i++) {
  const d = new Date(FIRST.getTime() + i * 86400000);
  const n = i + 1;                                     // 1..30 inside the month
  days[iso(d)] = {
    hijri: n >= 1 && n <= 30 ? `${n} Ramadan 1448 AH` : `${i < 1 ? 20 + i : n - 30} Shaban 1448 AH`,
    begins: { fajr: "05:25", maghrib: "17:43" },
    jamaat: { isha: "19:45" },
  };
}
const at = (isoDay, hhmm) => {
  const [h, m] = hhmm.split(":").map(Number);
  const d = new Date(isoDay + "T00:00:00");
  d.setHours(h, m, 0, 0);
  return d;
};

const before = num(logic, "OPEN_DAYS_BEFORE");
const shutDay = iso(new Date(FIRST.getTime() - (before + 1) * 86400000));
const openDay = iso(new Date(FIRST.getTime() - before * 86400000));
ok(`shut ${before + 1} days out`, ramadanAccess(at(shutDay, "12:00"), days).open === false);
ok(`open ${before} days out`,     ramadanAccess(at(openDay, "12:00"), days).open === true);
ok("open early carries no night yet", ramadanAccess(at(openDay, "12:00"), days).state === null);

/* The night rolls over at Fajr. Both of these are the same clock day. */
const n7 = iso(new Date(FIRST.getTime() + 6 * 86400000));
ok("just before Fajr still belongs to the night before",
   ramadanState(at(n7, "04:00"), days).night === 6,
   `got ${ramadanState(at(n7, "04:00"), days).night}`);
ok("after Fajr it is tonight",
   ramadanState(at(n7, "06:00"), days).night === 7,
   `got ${ramadanState(at(n7, "06:00"), days).night}`);

/* The last ten are counted off the end of the month, never assumed. */
const st = ramadanState(at(iso(new Date(FIRST.getTime() + 20 * 86400000)), "12:00"), days);
ok("a 30-day month puts the last ten at night 21", st.night === 21 && st.lastTen === true);
const nine = Object.fromEntries(Object.entries(days).map(([k, v]) =>
  [k, v.hijri === "30 Ramadan 1448 AH" ? { ...v, hijri: "1 Shawwal 1448 AH" } : v]));
const st29 = ramadanState(at(iso(new Date(FIRST.getTime() + 19 * 86400000)), "12:00"), nine);
ok("a 29-day month puts them at night 20",
   st29.total === 29 && st29.night === 20 && st29.lastTen === true,
   `total ${st29.total}, night ${st29.night}, lastTen ${st29.lastTen}`);

/* It stays open past the last night, because Eid is on that screen. */
const eidMorning = iso(new Date(FIRST.getTime() + 30 * 86400000));
const after = ramadanAccess(at(eidMorning, "09:00"), days);
ok("still open the morning after the last night", after.open === true && !!after.trailing);
ok("shut the day after that",
   ramadanAccess(at(iso(new Date(FIRST.getTime() + 32 * 86400000)), "09:00"), days).open === false);

/* ---- 3. content.js: what is in it, and what must not be --------------- */

const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(content, sandbox, { filename: "ramadan/content.js" });
const RAM = sandbox.window.RAMADAN;
ok("content.js sets window.RAMADAN", !!RAM);

const json = JSON.parse(fs.readFileSync(path.join(root, "src/data/ramadan.json"), "utf8"));
eq("the imported JSON matches the source", JSON.stringify(json), JSON.stringify(RAM));

/* Nothing in here may state a time: the timetable owns every one of them.
   "20 Ramadan" is a date in the month and not a clock time, so the pattern
   is a clock time rather than any digit. */
const walk = (v, at_) => {
  if (typeof v === "string") {
    ok(`no clock time at ${at_}`, !/\b\d{1,2}[:.]\d{2}\b/.test(v), `"${v}"`);
    ok(`no am/pm at ${at_}`, !/\b\d{1,2}\s*(am|pm)\b/i.test(v), `"${v}"`);
  } else if (v && typeof v === "object") {
    for (const k of Object.keys(v)) walk(v[k], `${at_}.${k}`);
  }
};
walk(RAM, "RAMADAN");

/* Every string in here must be drawn by both platforms, and every null must
   be able to reach the screen. A field nobody renders is a field the
   committee filled in and nobody ever sees. */
const FIELDS = [
  ["taraweeh.leaders[].rakahs", "l.rakahs"],
  ["taraweeh.leaders[].name",   "l.name"],
  ["taraweeh.leaders[].role",   "l.role"],
  ["bayaan.slots[].when",       "b.when"],
  ["bayaan.slots[].speaker",    "b.speaker"],
  ["bayaan.slots[].subject",    "b.subject"],
  ["itikaf.begins",             "it.begins"],
  ["itikaf.who",                "it.who"],
  ["itikaf.places",             "it.places"],
  ["itikaf.taken",              "it.taken"],
  ["itikaf.bookBy",             "it.bookBy"],
  ["itikaf.asks",               "it.asks"],
  ["fitrana.amount",            "fitrana.amount"],
  ["fitrana.note",              "fitrana.note"],
  ["eid.jamaats",               "eid.jamaats"],
  ["eid.venue",                 "eid.venue"],
  ["eid.note",                  "eid.note"],
  ["lastTen.kicker",            "lastTen.kicker"],
  ["lastTen.lead",              "lastTen.lead"],
];
for (const [field, expr] of FIELDS) {
  ok(`the website draws ${field}`, html.includes(expr) || html.includes(expr.replace(/^(it|fitrana|eid|lastTen)\./, "C.$1.")));
  ok(`the app draws ${field}`,     screen.includes(expr) || screen.includes(expr.replace(/^(fitrana|eid|lastTen)\./, "RAMADAN.$1.")));
}

/* And nothing is in there that nobody draws. */
const drawn = new Set(FIELDS.map(([f]) => f));
const keys = (v, at_) => {
  if (Array.isArray(v)) return v.length ? keys(v[0], `${at_}[]`) : [];
  if (v && typeof v === "object") return Object.keys(v).flatMap(k => keys(v[k], `${at_}.${k}`));
  return [at_];
};
for (const k of keys(RAM, "").map(k => k.replace(/^\./, "")))
  ok(`${k} is drawn somewhere`, drawn.has(k), "it is in content.js and on no screen");

/* A null has to reach the screen as the masjid's own words, not as a blank
   and never as a number. Both platforms spell it the same way. */
ok("the website turns a null into To be confirmed", /rmTbc\s*=\s*\(\)\s*=>\s*t\("ramadan\.to_be_confirmed"/.test(html));
ok("the app does too", /t\("ramadan\.to_be_confirmed"/.test(screen));
ok("neither prints 0 of 0 left for a null count",
   /places\s*==\s*null\s*\?/.test(html) && /places\s*==\s*null\s*\?/.test(screen));
for (const [field] of FIELDS.filter(([f]) => /name|speaker|subject|places|bookBy|amount|jamaats|venue|taken/.test(f))) {
  /* Nothing here may be a number or a string the screen would print raw —
     the committee has not given it, so it has to be null. */
  const at_ = field.split(".").reduce((v, k) => v == null ? v
    : k.endsWith("[]") ? v[k.slice(0, -2)][1] : v[k], RAM);
  ok(`${field} is null or a real value, never an empty string`, at_ !== "", "it is an empty string");
}

/* ---- 4. the two states that have no night --------------------------- *
 * These are the two the section is deliberately opened for, and both
 * platforms shipped the same bug in them: the committee's own arrangements —
 * the rota, the bayaan slots, the iʿtikāf booking, the fitrana — sat behind
 * the same `if` as the night, so in the week before Ramadan, and again on
 * Eid morning, a person found prose with holes in it where the booking
 * should have been. Nothing computed can be drawn without a night; nothing
 * the committee supplies may depend on one.
 */
const nightOnly = html.slice(html.indexOf('for(const id of ["rm-live"'),
                             html.indexOf("/* ---- what needs nothing"));
ok("the night's branch is found in renderRamadanOpen", nightOnly.length > 200);
for (const id of ["rm-rota", "rm-slots", "rm-itikaf", "rm-fitrana"])
  ok(`the website draws ${id} with or without a night`, !nightOnly.includes(id),
     "it is inside the branch that needs a night");
for (const id of ["rm-live", "rm-tonight", "rm-lastten"])
  ok(`the website draws ${id} only with a night`, nightOnly.includes(id));

/* And on the morning after, the screen shows Eid rather than the thirtieth
   night printed over the top of it. */
ok("the website's Eid card follows the last night, not tonight",
   /put\("rm-eid", last && last\.nightsToEid <= 0/.test(html));
ok("the app's does too", /last && last\.nightsToEid <= 0/.test(screen));
ok("the app stands the night down on the trailing morning",
   /access\.trailing \? null : last/.test(screen));
ok("the app draws the rota without a night", /RAMADAN\.taraweeh\.leaders\.map/.test(screen));

/* ---- 5. the gate is asked once, in one place ------------------------- */

ok("the app asks ramadanAccess once", (screen.match(/ramadanAccess\(/g) || []).length === 1);
ok("the app's month is behind that gate", /if \(access\.open\) return <Month/.test(screen));
ok("the website's month is behind its own", /rmGuardState\(/.test(html));

/* ---- the verdict ----------------------------------------------------- */

console.log(`  ${pass} passed, ${fails.length} failed`);
for (const f of fails) console.log(`  FAIL  ${f}`);
if (fails.length) process.exit(1);
