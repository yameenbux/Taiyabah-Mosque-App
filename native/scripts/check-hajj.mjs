/**
 * Taiyabah Masjid — the Hajj gate stays shut, and the counters can be trusted.
 * Copyright (c) 2026 Yameen Bux. All rights reserved. See LICENSE.md.
 *
 * TWO THINGS, AND THEY FAIL IN OPPOSITE DIRECTIONS.
 *
 * The gate. The section is built and held, and the ways it can go wrong are
 * opening when nobody said to, and — far worse — publishing a DRAFT ruling as
 * though a scholar had given it. hajj/content.js deliberately contains thirty
 * unapproved drafts, written to save the ʿulamā a blank page. The only thing
 * standing between those drafts and a congregation is the rule that an entry
 * without an approver's name is invisible. That rule is asserted here, on the
 * real shipped content, because a draft only ever ships by being forgotten.
 *
 * The counters. Nobody notices a counter that is wrong by one until they are
 * standing in the Ḥaram, and by then it is too late to check. Ṭawāf must stop
 * at seven and never offer an eighth; saʿī must know which hill the next lap
 * leaves from, because a person who has lost that cannot recover it by
 * counting. These are arithmetic, so they are tested as arithmetic.
 *
 *   node scripts/check-hajj.mjs
 *
 * Proved able to fail: with the `by` filter removed it reports 5 failures,
 * with the ṭawāf cap removed 1, with saʿī's alternation removed 1.
 */
import fs from "node:fs";
import path from "node:path";
import {
  hajjAccess, approved, visibleItems, visibleSections, branchOpen, openBranches,
  tick, untick, isComplete, saiFrom, progress, RELEASED,
} from "../src/hajj.js";

let pass = 0; const bad = [];
const is = (got, want, why) => {
  const a = JSON.stringify(got), b = JSON.stringify(want);
  if (a === b) pass++; else bad.push(`${why}\n          got  ${a}\n          want ${b}`);
};
const ok = (cond, why) => { if (cond) pass++; else bad.push(why); };

/* ---- the approver rule, on its own ------------------------------------ */
is(approved({ by: "Mufti X" }), true,  "a named approver counts");
is(approved({ by: "" }),        false, "an empty name is not an approval");
is(approved({ by: "   " }),     false, "nor is whitespace");
is(approved({ by: null }),      false, "nor is null, which is how the drafts ship");
is(approved({}),                false, "nor is a missing field");

/* ---- a fiqh branch full of drafts is shut ----------------------------- */
const draftBranch = { id: "ihram", kind: "fiqh", sections: [
  { id: "s1", items: [{ id: "a", by: null }, { id: "b", by: "" }] },
  { id: "s2", items: [{ id: "c" }] },
]};
is(visibleItems(draftBranch), [], "not one unapproved entry is visible");
is(branchOpen(draftBranch), false, "a fiqh branch of drafts does NOT open");

const oneApproved = { ...draftBranch, sections: [
  { id: "s1", items: [{ id: "a", by: null }, { id: "b", by: "Mufti X" }] },
  { id: "s2", items: [{ id: "c", by: null }] },
]};
is(visibleItems(oneApproved).map(i => i.id), ["b"], "only the approved entry is visible");
is(branchOpen(oneApproved), true, "one approved entry opens the branch");
is(visibleSections(oneApproved).map(s => s.id), ["s1"],
   "a section left with nothing in it is dropped rather than shown empty");

/* ---- practical branches need no scholar ------------------------------- */
const practical = { id: "pack", kind: "practical", sections: [{ id: "p", items: [{ id: "x" }] }] };
is(branchOpen(practical), true, "a practical branch opens on its own content");
is(visibleItems(practical).length, 1, "and nothing is filtered out of it");
is(branchOpen({ id: "counters", kind: "tool", sections: [] }), true,
   "a tool opens with no content at all — that is what exempts the counters");
is(branchOpen({ id: "empty", kind: "practical", sections: [] }), false,
   "an empty practical branch is not offered");

/* ---- the three locks together ----------------------------------------- */
const mixed = [practical, draftBranch, { id: "counters", kind: "tool", sections: [] }];
is(hajjAccess(mixed, false), { open: false, reason: "held" },
   "HELD beats everything, however much content is ready");
is(hajjAccess(mixed, true).open, true, "released, the practical branch and the tool open");
is(openBranches(mixed).map(b => b.id), ["pack", "counters"],
   "and the branch of drafts is not among them");
is(hajjAccess([draftBranch], true), { open: false, reason: "incomplete", missing: ["ihram"] },
   "released with nothing but drafts stays SHUT");
is(hajjAccess(null, true).open, false, "no branches at all is not a crash");

/* ---- and now on the real shipped content ------------------------------ */
const here = path.resolve(import.meta.dirname, "..");
const data = JSON.parse(fs.readFileSync(path.join(here, "src/data/hajj.json"), "utf8"));
const branches = data.branches || [];
ok(branches.length > 0, "src/data/hajj.json has no branches — run npm run content");

for (const b of branches.filter(b => b.kind === "fiqh")) {
  const all = b.sections.flatMap(s => s.items || []);
  const live = all.filter(approved);
  /* Not "there must be none approved" — the ʿulamā will approve them one at a
     time and this check must not stand in their way. The rule is that an
     approved entry is finished: named AND sourced. */
  for (const item of live)
    ok(typeof item.source === "string" && item.source.trim().length > 0,
       `${b.id}/${item.id} carries an approver but no source — a ruling in front of a ` +
       `congregation needs something after the name`);
  if (!live.length)
    ok(!branchOpen(b), `${b.id} has ${all.length} draft(s) and no approval, so it must stay shut`);
}

/* ---- the two platforms agree about the flag --------------------------- */
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

const fiqh = branches.filter(b => b.kind === "fiqh");
const drafts = fiqh.flatMap(b => b.sections.flatMap(s => s.items || [])).filter(i => !approved(i));
console.log(RELEASED
  ? "the Hajj section is RELEASED, and both platforms agree"
  : "the Hajj section is held, and both platforms agree");
console.log(`${drafts.length} fiqh draft(s) awaiting the ʿulamā, none of them visible to anyone`);
