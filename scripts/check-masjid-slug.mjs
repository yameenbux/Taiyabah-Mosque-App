/**
 * Taiyabah Masjid — every call to the database has to say which masjid.
 * Copyright (c) 2026 Yameen Bux. All rights reserved. See LICENSE.md.
 *
 * WHY THIS EXISTS. The database took on a second masjid, and the functions
 * that used to work out which one was asking now refuse rather than guess:
 *
 *     {"code":"22023","message":"This system now runs more than one masjid,
 *      so this call has to say which. Update the caller to pass a masjid slug."}
 *
 * The app survived it because every call goes through one wrapper in
 * src/supabase.js, which adds the slug once. The website has no wrapper: each
 * screen writes its own fetch. So the same mistake has now been made four
 * separate times, found four separate ways, months apart:
 *
 *   1. the imams' advice form  — the screen said questions were closed
 *   2. the prayer timetable    — the app silently kept its bundled year, and
 *                                would have shown no times at all from 1 Jan
 *   3. the nikah form          — a 400 on open and on submit
 *   4. charity collections     — the same
 *
 * Each was reported as a separate bug. None of them was. A fifth is only a
 * matter of somebody adding a form, so this stops being a thing people
 * remember and becomes a thing that fails the build.
 *
 * WHAT IT CHECKS. Every `rest/v1/rpc/<fn>` call in index.html and admin.html
 * must name a masjid somewhere in its request body — `p_masjid` for the
 * functions that take named arguments, `masjid` inside `payload` for the ones
 * that take a single jsonb. Which spelling is the call's business; having one
 * is not.
 *
 *     node scripts/check-masjid-slug.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const FILES = ["index.html", "admin.html"];

/* Functions that genuinely belong to no masjid. Keep this list short and say
 * why for each, because "it is on the list" is how a real one gets excused. */
const NO_MASJID_NEEDED = new Set([
  /* nothing yet — every function the website calls is masjid-scoped */
]);

/* The call's body is everything between `body:` and the end of the fetch
 * options. Reading to the matching close brace rather than a fixed number of
 * characters is the whole point: an earlier version of this check used a
 * regex with a line-bounded window, reported four false positives on calls
 * that were already correct, and would have reported a false PASS just as
 * readily on a payload whose slug sat one line further down than it looked. */
function bodyOf(text, from) {
  const at = text.indexOf("body:", from);
  if (at === -1) return null;
  let depth = 0, started = false;
  for (let i = at; i < text.length && i < at + 4000; i++) {
    const c = text[i];
    if (c === "{" || c === "(") { depth++; started = true; }
    else if (c === "}" || c === ")") {
      depth--;
      if (started && depth <= 0) return text.slice(at, i + 1);
    }
  }
  return text.slice(at, at + 4000);
}

let checked = 0;
const missing = [];

for (const file of FILES) {
  const full = path.join(ROOT, file);
  if (!fs.existsSync(full)) continue;
  const text = fs.readFileSync(full, "utf8");
  const re = /rest\/v1\/rpc\/([a-zA-Z_]+)/g;
  let m;
  while ((m = re.exec(text))) {
    const fn = m[1];
    if (NO_MASJID_NEEDED.has(fn)) continue;
    const body = bodyOf(text, m.index);
    checked++;
    if (!body || !/\bmasjid\b/.test(body)) {
      missing.push({ file, fn, line: text.slice(0, m.index).split("\n").length });
    }
  }
}

if (!missing.length) {
  console.log(`all ${checked} database calls name a masjid`);
  process.exit(0);
}

const say = s => { console.error(s); if (process.env.GITHUB_ACTIONS) console.log(`::error::${s}`); };
say(`${missing.length} of ${checked} database calls do not name a masjid.`);
for (const x of missing) say(`  ${x.file}:${x.line}  ${x.fn}`);
say("");
say("The function will answer 400 and the screen will read that as a refusal,");
say("a closed form, or an unpublished year — never as a bug. Pass p_masjid for");
say("a named-argument function, or masjid inside payload for a jsonb one.");
process.exit(1);
