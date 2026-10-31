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
import vm from "node:vm";
import path from "node:path";
import {
  hajjAccess, approved, visibleItems, visibleSections, branchOpen, openBranches, leadOf,
  forJourney,
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

/* ---- and now on the real content --------------------------------------
 *
 * TWO SOURCES, ON PURPOSE, because they answer different questions.
 *
 *   `data` is hajj/content.js — EVERYTHING, drafts included. The content
 *   rules live here: a caption that reads like a ruling, a mark off the edge
 *   of its picture, a drawing nobody shipped. Those have to be caught in the
 *   draft, which is the only time anybody can still fix them cheaply.
 *
 *   `shipped` is src/data/hajj.json — what the importer actually put in the
 *   binary. The rule there is narrower and newer: nothing unapproved may be
 *   in it at all.
 *
 * Reading only the bundle, as this did, quietly stopped checking the drafts
 * the moment the importer started holding them back — 40 assertions that
 * vanished without a word rather than failing. */
const here = path.resolve(import.meta.dirname, "..");
const src = fs.readFileSync(path.join(here, "../hajj/content.js"), "utf8");
const box = { window: {} };
vm.createContext(box);
vm.runInContext(src, box, { filename: "hajj/content.js" });
const data = box.window.HAJJ;
ok(!!data, "hajj/content.js did not set window.HAJJ");
const branches = data.branches || [];
ok(branches.length > 0, "hajj/content.js has no branches");

const shipped = JSON.parse(fs.readFileSync(path.join(here, "src/data/hajj.json"), "utf8"));
ok((shipped.branches || []).length > 0,
   "src/data/hajj.json has no branches — run npm run content");

/* ---- the lead sentence ------------------------------------------------
   An entry is drawn as a lead in full ink and the remainder beneath it in
   the faint. The rule is cheap to get subtly wrong and expensive to notice:
   a split inside a duʿā strands its closing quote, and a split that drops a
   clause silently removes guidance. */
is(leadOf("All the way round. Not your back to it."),
   { lead: "All the way round.", rest: "Not your back to it." },
   "a four-word sentence is a lead — an earlier minimum length ate it");
is(leadOf("\u201cO Allah, forgive me.\u201d Said at \u1e62af\u0101."),
   { lead: "\u201cO Allah, forgive me.\u201d", rest: "Said at \u1e62af\u0101." },
   "a duʿā is the lead and when to say it is the remainder");
is(leadOf("\u201cHere I am. Here I am.\u201d Three times.").lead,
   "\u201cHere I am. Here I am.\u201d",
   "a full stop INSIDE the quote does not split it");
/* That case is caught by the opening-quote rule before the sentence scan
   ever runs, so on its own it leaves the balance guard inside the scan
   untested — proved by removing the guard and watching nothing fail. This
   one starts in prose and quotes afterwards, which is the only way in. */
is(leadOf("Say it at \u1e62af\u0101: \u201cAllah is the greatest. There is no god but Allah.\u201d Three times.").lead,
   "Say it at \u1e62af\u0101: \u201cAllah is the greatest. There is no god but Allah.\u201d",
   "a quote opened mid-sentence is not split at the full stop inside it");
is(leadOf("One sentence only."), { lead: "One sentence only.", rest: "" },
   "nothing to split is not a split");
is(leadOf(undefined), { lead: "", rest: "" }, "and a missing body is not a crash");

/* THE SPLIT LOSES NOTHING. Run over every entry that actually ships: the
   lead and the remainder put back together must be the body again, give or
   take the one space between them. A rule that quietly dropped a sentence
   would read perfectly well and be missing a ruling. */
for (const b of branches)
  for (const it of b.sections.flatMap(s => s.items || [])) {
    if (!it.d) continue;
    const { lead, rest } = leadOf(it.d);
    ok(lead.length > 0, `${b.id}/${it.id} has a body but no lead sentence`);
    ok(lead.replace(/\s+/g, " ") + (rest ? " " + rest.replace(/\s+/g, " ") : "")
         === it.d.replace(/\s+/g, " "),
       `${b.id}/${it.id} loses text when it is split into lead and remainder`);
  }

/* NOTHING UNAPPROVED REACHES THE BINARY. A draft is invisible to readers by
   hajj.js's rule, which governed what was drawn; this governs what is
   carried. Unreachable is not absent, and the drafts quote a booklet the
   masjid has no written permission for. */
for (const b of (shipped.branches || []).filter(b => b.kind === "fiqh"))
  for (const it of b.sections.flatMap(s => s.items || []))
    ok(approved(it),
       `src/data/hajj.json ships ${b.id}/${it.id}, which no scholar has approved — ` +
       `the importer is meant to hold it back`);

for (const b of branches.filter(b => b.kind === "fiqh")) {
  const all = b.sections.flatMap(s => s.items || []);
  const live = all.filter(approved);
  /* THE SOURCE RULE IS GONE, BY DECISION RATHER THAN BY ROT. It used to read
     "an approved entry is finished: named AND sourced", and it was there to
     stop a ruling reaching a congregation with nothing behind the name. The
     trustee has since asked that only Taiyabah Masjid be named anywhere a
     reader can see, so there is no second name left for the rule to require
     and keeping it would only fail the build.

     What it was protecting has not gone away. content.js's header records
     which published guides each branch was drafted from and that the
     permission question is unsettled; this is the check that used to make
     that visible on screen, and nothing replaces it. If sources ever come
     back, so should this. */
  for (const item of live)
    ok(typeof item.by === "string" && item.by.trim().length > 0,
       `${b.id}/${item.id} is live with no name against it — a ruling in front of a ` +
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

/* ---- the journey stages ------------------------------------------------
 * The section front groups the branches into three stages. The failure that
 * matters is a branch quietly disappearing from the front because a stage
 * list and the content drifted apart — so every id a stage names must exist,
 * no id may be named twice, and nothing may be lost. A branch no stage names
 * is NOT a failure: it falls through to the end under no heading, which is
 * the safe direction for this to break in. */
const stages = Array.isArray(data.stages) ? data.stages : [];
ok(stages.length > 0, "hajj.json has no stages — the section front has nothing to group by");
/* The counters are a tool, not a text, so they are declared by the app's own
   data layer rather than by the content file. ORDER there is the app's list
   of every branch it expects, which is exactly the right thing to check a
   stage's names against. */
const nativeData = fs.readFileSync(path.join(here, "src/hajj-data.js"), "utf8");
const ordered = [...(nativeData.match(/const ORDER = \[([^\]]*)\]/) || ["", ""])[1]
                  .matchAll(/"(\w+)"/g)].map(m => m[1]);
ok(ordered.length > 0, "hajj-data.js has no ORDER — the branch list did not parse");
/* ONLY THE COUNTERS MAY LIVE IN CODE ALONE. This used to take the union of
   the content file's branches and ORDER, which let a stage name anything
   either side knew about — and so a branch deleted from hajj/content.js by a
   bad edit still passed, because ORDER remembered it. The suite does not fail
   when content disappears, it just gets smaller, which is the quietest way a
   section can lose a whole branch. Everything a stage names must now be in
   the content file, with one listed exception. */
const CODE_ONLY = new Set(["counters"]);
const fromContent = new Set(branches.map(b => b.id));
for (const id of ordered)
  ok(fromContent.has(id) || CODE_ONLY.has(id),
     `hajj-data.js lists the branch "${id}" but hajj/content.js no longer has it — ` +
     `either it was deleted by accident or ORDER needs updating`);
const named = [];
for (const st of stages) {
  ok(typeof st.title === "string" && st.title.trim().length > 0, `stage ${st.id} has no title`);
  for (const id of (st.branches || [])) {
    ok(fromContent.has(id) || CODE_ONLY.has(id),
       `stage "${st.title}" names the branch "${id}", which is not in hajj/content.js`);
    ok(!named.includes(id), `the branch "${id}" is named by more than one stage`);
    named.push(id);
  }
}
for (const b of branches)
  ok(named.includes(b.id),
     `the branch "${b.id}" is in no stage, so it would fall to the end of the ` +
     `section front under no heading. Add it to a stage in hajj/content.js.`);
/* The website must GROUP by them too. Asserting the titles appear literally
   in index.html would be testing the wrong thing — the website reads them
   from the same content file at runtime, which is the point. What can drift
   is the machinery, so that is what is checked: if the grouping is removed
   from one platform the two sections stop matching. */
for (const [need, why] of [
  ["data.stages", "does not read the stages out of the content file"],
  ["function hajjByStage", "has no function to group the branches by stage"],
  ["hajjByStage(access.branches)", "builds its branch list without grouping it"],
]) ok(web.includes(need),
      `index.html ${why} — the website and the app have drifted apart. ` +
      `(looked for "${need}")`);

/* ---- the drawings exist on both platforms ------------------------------
 * A mistyped art id is silent: the renderer draws nothing and the screen
 * just looks a little empty, which nobody would report as a bug. It is also
 * exactly the kind of thing that gets noticed on one platform and not the
 * other. So every id the content names must be carried by both, and must
 * come with a caption — an unlabelled diagram of a foot explains nothing. */
/* `art` is one picture or a list of them, so both shapes are flattened here
   before anything is asserted. An earlier version read the list itself as a
   picture and reported an id of "undefined". */
const arts = [];
const collect = (where, art) => {
  for (const a of (Array.isArray(art) ? art : [art])) if (a) arts.push([where, a]);
};
for (const b of branches)
  for (const sec of (b.sections || [])) {
    if (sec.art) collect(`${b.id}/${sec.id}`, sec.art);
    for (const it of (sec.items || [])) if (it.art) collect(`${b.id}/${it.id}`, it.art);
  }
const nativeArt = fs.readFileSync(path.join(here, "src/hajj-art.jsx"), "utf8");
const nativeIds = [...nativeArt.matchAll(/^\s{2}(\w+):\s*\{\s*el:/gm)].map(m => m[1]);
const webArt = (web.match(/const HJ_ART = \{[\s\S]*?\n\};/) || [""])[0];
const webIds = [...webArt.matchAll(/^\s{2}(\w+):\s/gm)].map(m => m[1]);
ok(nativeIds.length > 0, "hajj-art.jsx declares no drawings — the ART map did not parse");
ok(webIds.length > 0, "index.html declares no drawings — HJ_ART did not parse");
for (const [where, art] of arts) {
  ok(nativeIds.includes(art.id),
     `${where} asks for the "${art.id}" drawing, which the app does not have ` +
     `(it has: ${nativeIds.join(", ")})`);
  ok(webIds.includes(art.id),
     `${where} asks for the "${art.id}" drawing, which the website does not have ` +
     `(it has: ${webIds.join(", ")})`);
  ok(typeof art.cap === "string" && art.cap.trim().length > 0,
     `${where} has a drawing with no caption`);
}
/* A picture that points at a file nobody shipped is silent on the website —
 * a broken image icon in a card — and a red build on the app. Both halves
 * carry their own copy, so both are checked. */
const files = [
  ...[...nativeArt.matchAll(/require\("\.\.\/([^"]+)"\)/g)].map(m => ["app", path.join(here, m[1])]),
  ...[...webArt.matchAll(/<img src="([^"]+)"/g)].map(m => ["website", path.join(here, "..", m[1])]),
];
ok(files.length > 0, "no picture files found on either platform — the scan did not parse");
for (const [which, f] of files)
  ok(fs.existsSync(f), `the ${which} points at ${path.relative(path.join(here, ".."), f)}, which is not in the repository`);

/* The pictures must stay descriptive. Nothing in this section may assert a
   ruling the ʿulamā have not given, and a caption or a mark's label is the
   easiest place for one to creep in — especially on a PAIR of pictures,
   where "allowed" and "not allowed" would be the obvious thing to write. */
const RULING = /\b(must|must not|may not|haram|ḥarām|forbidden|not allowed|permissible|impermissible|is required|invalid|valid)\b/i;
for (const [where, art] of arts) {
  const lines = [["caption", art.cap],
                 ...(Array.isArray(art.marks) ? art.marks : []).map(m => [`mark ${m.n}`, m.t])];
  for (const [what, line] of lines)
    ok(!RULING.test(line || ""),
       `${where}'s ${what} reads like a ruling: "${line}". ` +
       `A picture describes; the entry's own words do the fiqh.`);
}

/* A mark that is off the picture points at nothing, and one with no label is
   a dot the reader cannot resolve. */
for (const [where, art] of arts)
  for (const m of (Array.isArray(art.marks) ? art.marks : [])) {
    ok(Number.isFinite(m.x) && m.x > 0 && m.x < 1 && Number.isFinite(m.y) && m.y > 0 && m.y < 1,
       `${where} mark ${m.n} sits at (${m.x}, ${m.y}), which is not on the picture`);
    ok(typeof m.t === "string" && m.t.trim().length > 0,
       `${where} mark ${m.n} has no label`);
  }

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


/* ---- which trip is this for? ------------------------------------------ *
 *
 * Most of the section is the same journey twice over, so the default has to
 * be "both" and it has to be the thing that happens when nobody said
 * otherwise. The failure worth testing for is the quiet one: a tag that
 * silently hides shared material from one of the two trips, or a journey
 * that leaks the other's rites.
 */
{
  const u = forJourney("umrah"), h = forJourney("hajj"), any = forJourney(undefined);

  is(u({}), true,  "an untagged item belongs to both journeys");
  is(h({}), true,  "and to the other one as well");
  is(any({ journey: "hajj" }), true, "asked with no journey, everything matches");
  is(u({ journey: "umrah" }), true,  "an ʿUmrah item is on the ʿUmrah journey");
  is(u({ journey: "hajj" }),  false, "a Hajj item is not");
  is(h({ journey: "hajj" }),  true,  "and the other way round");
  is(forJourney("nonsense")({ journey: "hajj" }), true,
     "an unknown journey filters nothing rather than emptying the section");

  const rites = shipped.branches.find(b => b.id === "rites");
  ok(!!rites, "the rites branch ships");
  const sec = j => visibleSections(rites, j).map(x => x.id);

  ok(sec("umrah").includes("rites-umrah"), "the ʿUmrah rites are on the ʿUmrah journey");
  ok(!sec("hajj").includes("rites-umrah"),
     "and are NOT shown to somebody planning Hajj — the bug this split exists to fix");
  ok(!sec("umrah").includes("rites-hajj"), "the days of Hajj are not on the ʿUmrah journey");

  /* Shared is the default and the common case, so it is the thing most worth
     pinning: ṭawāf and saʿī are done on both trips and must appear on both. */
  for (const id of ["rites-women", "rites-tawaf", "rites-sai"])
    ok(sec("umrah").includes(id) && sec("hajj").includes(id),
       `${id} is shared, so it shows on both journeys`);

  /* THIS ASSERTION HAS FLIPPED, which is what it was written to do. It used
     to say the days of Hajj were empty; they are written and approved now, so
     the Hajj journey has rites of its own and the ʿUmrah journey must still
     not show them. */
  ok(sec("hajj").includes("rites-hajj"),
     "the days of Hajj are on the Hajj journey");
  ok(!sec("umrah").includes("rites-hajj"),
     "and are not shown to somebody planning ʿUmrah");

  /* A practical branch is the same on both trips and must not be narrowed by
     accident — the paperwork is where Nusuk and the certificate live. */
  const papers = shipped.branches.find(b => b.id === "papers");
  is(visibleItems(papers, "umrah").length, visibleItems(papers, "hajj").length,
     "the paperwork branch is the same on both journeys");
  const ids = visibleItems(papers).map(i => i.id);
  ok(ids.includes("d-nusuk"), "Nusuk ships: the permits are issued through it");
  ok(ids.includes("d-mening"), "the meningitis certificate ships");
  ok(branchOpen(papers, "hajj") && branchOpen(papers, "umrah"),
     "and the branch opens on both");
}

console.log(`\n${pass} passed, ${bad.length} failed`);
bad.forEach(b => console.log(`  FAIL  ${b}`));
if (bad.length) process.exit(1);

const fiqh = branches.filter(b => b.kind === "fiqh");
const drafts = fiqh.flatMap(b => b.sections.flatMap(s => s.items || [])).filter(i => !approved(i));
console.log(RELEASED
  ? "the Hajj section is RELEASED, and both platforms agree"
  : "the Hajj section is held, and both platforms agree");
console.log(`${drafts.length} fiqh draft(s) awaiting the ʿulamā, none of them visible to anyone`);
