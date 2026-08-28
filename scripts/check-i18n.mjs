#!/usr/bin/env node
/* Does the app actually show up in the reader's language?
 *
 * The first version of this check counted the keys in the packs against the
 * keys in the packs, reported 100%, and was wrong: text with no key at all is
 * invisible to that sum, and that is exactly what a reader in Urdu still saw
 * in English — 406 strings of it, including the whole home screen.
 *
 * So this checks the app against itself instead:
 *   1. every string the app can put on a screen has a key   (scripts/i18n-keys.mjs)
 *   2. every key is translated into all three languages
 *   3. nothing carries a key the app never asks for
 *   4. an identifier — postcode, phone, email, web address — is never rewritten
 *      into another set of digits, because then it stops working
 *
 * The one thing it cannot check is whether a translation is any good. That is
 * the imam's review, not a script's.
 *
 *   node scripts/check-i18n.mjs
 */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { execSync } from "node:child_process";

const problems = [], notes = [];
const fail = m => problems.push(m);
const ok = m => notes.push(m);

execSync("node scripts/i18n-keys.mjs", { stdio: "pipe" });
const needed = JSON.parse(readFileSync("/tmp/i18n-keys.json", "utf8"));

const src = {};
for (const f of readdirSync("lang/src").sort()) {
  const d = JSON.parse(readFileSync("lang/src/" + f, "utf8"));
  for (const [k, v] of Object.entries(d)) {
    if (k === "_note") continue;
    if (k in src) fail(`${k} is defined twice in lang/src`);
    src[k] = v;
  }
}

/* 1 + 2. every key the app asks for, translated three ways */
const missing = Object.keys(needed).filter(k => !(k in src));
if (missing.length)
  fail(`${missing.length} string(s) reach the screen with no translation, e.g. ${missing.slice(0, 4).join(", ")}`);

const LANGS = ["Urdu", "Gujarati", "Arabic"];
const holes = [];
for (const [k, v] of Object.entries(src)) {
  if (!Array.isArray(v) || v.length !== 3) { fail(`${k} is not [Urdu, Gujarati, Arabic]`); continue; }
  v.forEach((s, i) => { if (!String(s).trim()) holes.push(`${k} (${LANGS[i]})`); });
}
if (holes.length) fail(`${holes.length} empty translation(s): ${holes.slice(0, 4).join(", ")}`);

/* 3. keys nothing asks for — dead weight that hides real gaps */
const orphans = Object.keys(src).filter(k => !(k in needed));
if (orphans.length)
  fail(`${orphans.length} key(s) in lang/src that nothing on screen asks for: ${orphans.slice(0, 4).join(", ")}`);

if (!missing.length && !holes.length && !orphans.length)
  ok(`${Object.keys(needed).length} strings, all three languages, nothing missing and nothing spare`);

/* 4. an identifier must survive the digit localiser
 * "Bolton BL1 8HD" became "Bolton BL۱ ۸HD" in Urdu. That is not an address
 * Royal Mail can deliver to, and a phone number in Urdu digits is not a number
 * anyone can dial. Anything that looks like one has to be marked. */
const html = readFileSync("index.html", "utf8");
const IDENT = [
  [/\b[A-Z]{1,2}\d[A-Z\d]?\s+\d[A-Z]{2}\b/, "a UK postcode"],
  [/\b0\d{3,4}\s?\d{3}\s?\d{3,4}\b/,        "a phone number"],
  [/[\w.+-]+@[\w-]+\.[\w.]+/,               "an email address"],
  [/\b\d{2}-\d{2}-\d{2}\b/,                 "a sort code"],
];
let unguarded = 0, guarded = 0;
for (const m of html.matchAll(/<(\w+)([^>]*)>([^<]*)</g)) {
  const [, , attrs, text] = m;
  const hit = IDENT.find(([re]) => re.test(text));
  if (!hit) continue;
  if (/\bdata-i18n-latin\b/.test(attrs)) { guarded++; continue; }
  if (!/\bdata-i18n/.test(attrs)) { guarded++; continue; }   // never translated at all
  unguarded++;
  fail(`index.html translates "${text.trim().slice(0, 40)}" but does not mark it data-i18n-latin — ${hit[1]} in Urdu or Arabic digits stops working`);
}
if (!unguarded) ok(`${guarded} identifier(s) keep their Latin digits in every language`);

/* the app's own advisory must not promise less than the packs deliver, or more */
const advisory = html.match(/data-i18n="sysprefs\.the_urdu_gujarati_and_arabic"[^>]*>([\s\S]*?)<\/p>/);
if (advisory && /navigation and prayer names\s+only/i.test(advisory[1]))
  fail('the Language screen still tells people the packs cover "the main navigation and prayer names only" — that is no longer true');

for (const n of notes) console.log("  ok    " + n);
for (const p of problems) console.error("  FAIL  " + p);
console.log(problems.length ? `\n${problems.length} i18n problem(s).` : "\ni18n checks passed.");
process.exit(problems.length ? 1 : 0);
