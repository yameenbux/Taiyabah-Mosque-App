/**
 * Taiyabah Masjid — the Hajj gate stays shut, and the counters can be trusted.
 * Copyright (c) 2026 Yameen Bux. All rights reserved. See LICENSE.md.
 *
 * TWO THINGS, AND THEY FAIL IN OPPOSITE DIRECTIONS.
 *
 * The gate. The section is built and held, and the one way it can go wrong is
 * by opening when nobody said to — a flag flipped while rebasing, a merge
 * that takes the wrong side. Worse: opening onto content the ʿulamā have not
 * supplied yet, which would put an empty rulings screen in front of somebody
 * about to fly. So the gate is asserted here rather than trusted to review,
 * and the two platforms are asserted to agree about it, because a website
 * that releases while the app holds is the same bug wearing a different hat.
 *
 * The counters. Nobody notices a counter that is wrong by one until they are
 * standing in the Ḥaram, and by then it is too late to check. Ṭawāf must stop
 * at seven and never offer an eighth; saʿī must know which hill the next lap
 * leaves from, because a person who has lost that cannot recover it by
 * counting. These are arithmetic, so they are tested as arithmetic.
 *
 *   node scripts/check-hajj.mjs
 *
 * Proved able to fail: with the missing-content branch removed it reports 3
 * failures, with the ṭawāf cap removed 1, with saʿī's alternation removed 1.
 */
import fs from "node:fs";
import path from "node:path";
import {
  hajjAccess, missingContent, tick, untick, isComplete, saiFrom, progress,
  RELEASED, CONTENT_SECTIONS,
} from "../src/hajj.js";

let pass = 0; const bad = [];
const is = (got, want, why) => {
  const a = JSON.stringify(got), b = JSON.stringify(want);
  if (a === b) pass++; else bad.push(`${why}\n          got  ${a}\n          want ${b}`);
};
const ok = (cond, why) => { if (cond) pass++; else bad.push(why); };

/* ---- the gate ---------------------------------------------------------- */
const full = { duas: [1], steps: [1], rulings: [1] };
const part = { duas: [1], steps: [],  rulings: [1] };

is(hajjAccess(full, false), { open: false, reason: "held" },
   "held beats complete content — the flag is the masjid's to turn, not the content's");
is(hajjAccess(full, true), { open: true },
   "released with every section supplied opens");
is(hajjAccess(part, true), { open: false, reason: "incomplete", missing: ["steps"] },
   "released but a section empty STAYS SHUT");
is(hajjAccess({}, true), { open: false, reason: "incomplete", missing: CONTENT_SECTIONS },
   "released with nothing at all stays shut");
is(hajjAccess(null, true).open, false, "no content object at all is not a crash");
is(missingContent({ duas: "not an array", steps: [1], rulings: [1] }), ["duas"],
   "a section that is not a list counts as missing");

/* ---- the two platforms agree about the flag ---------------------------- */
const here = path.resolve(import.meta.dirname, "..");
const web = fs.readFileSync(path.join(here, "..", "index.html"), "utf8");
const webFlag = (web.match(/const HAJJ_RELEASED\s*=\s*(true|false)/) || [])[1];
ok(webFlag !== undefined, "index.html has no HAJJ_RELEASED — the website cannot be held or released");
if (webFlag !== undefined)
  ok(webFlag === String(RELEASED),
     `the app says RELEASED=${RELEASED} and the website says ${webFlag}. ` +
     `One platform would show the section while the other hides it.`);

/* ---- the counters ------------------------------------------------------ */
is(tick("tawaf", 6), 7, "the seventh circuit counts");
is(tick("tawaf", 7), 7, "THERE IS NO EIGHTH CIRCUIT");
is(tick("sai", 7), 7, "nor an eighth lap");
is(tick("tasbih", 999), 1000, "tasbīḥ does not stop");
is(tick("nonsense", 3), 3, "an unknown mode changes nothing");
is(untick("tawaf", 0), 0, "cannot go below zero");
is(untick("tawaf", 3), 2, "undo takes one off, for the press that was a pocket");
is(isComplete("tawaf", 7), true, "seven is done");
is(isComplete("tawaf", 6), false, "six is not");
is(isComplete("tasbih", 10000), false, "tasbīḥ is never done");

is([0, 1, 2, 3, 4, 5, 6, 7].map(saiFrom), [0, 1, 0, 1, 0, 1, 0, null],
   "saʿī alternates: lap 1 leaves Ṣafā, lap 7 leaves Ṣafā and ends at Marwa, and there is no eighth");

is(progress("tawaf", 0), 0, "the ring is empty at zero");
is(progress("tawaf", 7), 1, "the ring is full at seven");
is(progress("tawaf", 99), 1, "the ring never over-fills");
is(progress("tasbih", 99), 0, "the tasbīḥ ring comes round on its mark");

console.log(`\n${pass} passed, ${bad.length} failed`);
bad.forEach(b => console.log(`  FAIL  ${b}`));
if (bad.length) process.exit(1);
console.log(RELEASED
  ? "the Hajj section is RELEASED, and both platforms agree"
  : "the Hajj section is held, and both platforms agree");
