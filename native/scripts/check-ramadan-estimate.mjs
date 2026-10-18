#!/usr/bin/env node
/* Do the app and the website count to the SAME night?
 *
 * Until the committee publishes the year Ramadan falls in, both halves count
 * to a configured estimate: ESTIMATE in native/src/ramadan.js, RAM_FALLBACK in
 * index.html. Two copies of one date is a thing that drifts — somebody
 * corrects one of them and the app and the website then show two different
 * numbers for the same screen, which is exactly the kind of fault nobody
 * reports because each half looks right on its own.
 *
 * The estimate cannot be shared at runtime: ramadan.js imports nothing on
 * purpose, so that its rule can be tested under plain Node. So they stay two
 * constants and this makes them agree.
 *
 * It does NOT check that the date is correct. Nobody here knows that — it is
 * the committee's to confirm, and the moment they publish the timetable the
 * real first night is found in it and neither constant is read again.
 *
 *   node scripts/check-ramadan-estimate.mjs
 */
import fs from "node:fs"; import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "../..");
const read = p => fs.readFileSync(p, "utf8");

const problems = [];
const fail = m => problems.push(m);

const app = read(path.join(ROOT, "native/src/ramadan.js"))
  .match(/export const ESTIMATE\s*=\s*"(\d{4}-\d{2}-\d{2})"/);
const web = read(path.join(ROOT, "index.html"))
  .match(/const RAM_FALLBACK\s*=\s*\{\s*date:\s*"(\d{4}-\d{2}-\d{2})"/);

if (!app) fail("native/src/ramadan.js no longer exports ESTIMATE as a \"YYYY-MM-DD\" string");
if (!web) fail("index.html no longer sets RAM_FALLBACK.date to a \"YYYY-MM-DD\" string");

if (app && web) {
  if (app[1] !== web[1])
    fail(`the app counts to ${app[1]} and the website counts to ${web[1]} — `
       + "one of them was corrected and the other was not");
  else
    console.log(`  ok    app and website both count to ${app[1]} until the timetable says otherwise`);
}

/* A date already behind us is not an estimate, it is a bug nobody noticed:
 * the screen quietly falls back to "Dates to be confirmed" and stops
 * counting, which is the failure this whole arrangement exists to avoid. */
if (app && web && app[1] === web[1]) {
  const today = new Date().toISOString().slice(0, 10);
  if (app[1] < today)
    fail(`the estimate ${app[1]} has passed and no published timetable has replaced it — `
       + "both screens have stopped counting and read \"Dates to be confirmed\"");
}

for (const p of problems) console.error("  FAIL  " + p);
console.log(problems.length ? `\n${problems.length} problem(s).` : "");
process.exit(problems.length ? 1 : 0);
