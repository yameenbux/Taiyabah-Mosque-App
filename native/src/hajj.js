/**
 * Hajj & Umrah — the gate, and the arithmetic of the counters.
 * Copyright (c) 2026 Yameen Bux. All rights reserved. See LICENSE.md.
 *
 * WHAT THIS IS FOR. The section is built and held. Until the masjid says
 * otherwise the public sees one locked screen, exactly as Ramadan was held
 * behind its guard, and this file decides which of the two a person gets.
 *
 * THE GATE HAS THREE LOCKS, not one, and they answer different fears.
 *
 *   1. RELEASED. The masjid's own switch. Nothing opens while it is false,
 *      however complete the content is.
 *
 *   2. The branch. Each branch opens on its own, so the packing list and the
 *      heat guidance can be in somebody's hands months before the rulings are
 *      written. A branch with nothing in it is not offered at all rather than
 *      offered and empty.
 *
 *   3. `by`, and this is the one that matters. A fiqh entry counts towards
 *      opening its branch ONLY if it carries an approver's name. The drafts
 *      in hajj/content.js exist to save the ʿulamā a blank page; they are a
 *      starting document to be corrected, not an answer. Until a scholar puts
 *      their name on an entry it is invisible to every reader and cannot open
 *      anything — whoever merges it, and whoever flips the switch.
 *
 * So a draft cannot ship by being forgotten, which is the only way a draft
 * ever ships. check-hajj.mjs asserts all three.
 *
 * THE COUNTERS ARE EXEMPT. They carry no words but their own numbers, so they
 * are finished whether the rulings have arrived or not — and they are the
 * part of the section a person has open in their hand during the ṭawāf.
 *
 * NOTHING IS IMPORTED ON PURPOSE, for the reason ramadan.js and qibla.js are
 * written the same way: it takes its inputs as arguments, so the tests run
 * the real code under plain Node and a wrong answer is a failing test rather
 * than something somebody discovers in the Ḥaram.
 */

/* ------------------------------------------------------------------ *
 *  THE GATE
 * ------------------------------------------------------------------ */

/* The masjid's own switch. Held until they say otherwise; check-hajj.mjs
   makes sure the website and the app never disagree about it. */
export const RELEASED = true;

/* A fiqh entry is only real when somebody is willing to be named for it. An
   empty string, a whitespace string and a missing field all mean the same
   thing: nobody has approved this yet. */
export function approved(item) {
  return !!(item && typeof item.by === "string" && item.by.trim().length > 0);
}

/** Every item of a branch that a reader may actually see. */
export function visibleItems(branch) {
  if (!branch || !Array.isArray(branch.sections)) return [];
  const all = branch.sections.flatMap(s => (Array.isArray(s.items) ? s.items : []));
  /* Practical branches are travel and safety guidance written in the repo and
     need no scholar. Fiqh branches show only what has been approved. */
  return branch.kind === "fiqh" ? all.filter(approved) : all;
}

/** The branch's sections, with unapproved entries and emptied sections gone. */
export function visibleSections(branch) {
  if (!branch || !Array.isArray(branch.sections)) return [];
  const keep = branch.kind === "fiqh" ? approved : () => true;
  return branch.sections
    .map(s => ({ ...s, items: (Array.isArray(s.items) ? s.items : []).filter(keep) }))
    .filter(s => s.items.length > 0);
}

/** A tool is always ready. Anything else needs something to show. */
export function branchOpen(branch) {
  if (!branch) return false;
  if (branch.kind === "tool") return true;
  return visibleItems(branch).length > 0;
}

export function openBranches(branches) {
  return (Array.isArray(branches) ? branches : []).filter(branchOpen);
}

/**
 * Which screen a person gets.
 *
 *   { open: false, reason: "held" }                  not released
 *   { open: false, reason: "incomplete", missing }   released, nothing ready
 *   { open: true, branches: [...] }                  the section proper
 *
 * `released` is an argument rather than a read of the constant so the tests
 * can drive both sides of the switch without editing the file under test.
 */
export function hajjAccess(branches, released = RELEASED) {
  if (!released) return { open: false, reason: "held" };
  const open = openBranches(branches);
  if (!open.length) {
    const missing = (Array.isArray(branches) ? branches : []).map(b => b && b.id).filter(Boolean);
    return { open: false, reason: "incomplete", missing };
  }
  return { open: true, branches: open };
}

/* ------------------------------------------------------------------ *
 *  THE COUNTERS
 * ------------------------------------------------------------------ */

/* Ṭawāf and saʿī are seven and seven. Tasbīḥ has no end, and its marks are
   where a thumb pauses rather than where it stops. */
export const COUNTERS = {
  tawaf:  { total: 7, marks: [] },
  sai:    { total: 7, marks: [] },
  tasbih: { total: 0, marks: [33, 66, 99] },
};

export const COUNTER_MODES = ["tawaf", "sai", "tasbih"];

/** One press. A finished ṭawāf does not roll over to an eighth circuit. */
export function tick(mode, n) {
  const c = COUNTERS[mode];
  if (!c) return n;
  const next = n + 1;
  return c.total && next > c.total ? c.total : next;
}

/** Undo one, for the press that was the pocket rather than the person. */
export function untick(mode, n) {
  return n > 0 ? n - 1 : 0;
}

export function isComplete(mode, n) {
  const c = COUNTERS[mode];
  return !!(c && c.total && n >= c.total);
}

/**
 * Saʿī is walked between two hills, so lap 1 leaves from Ṣafā, lap 2 from
 * Marwa, and so on — which means the seventh ENDS at Marwa, and somebody who
 * only counts laps cannot tell you where they are standing. This is the one
 * piece of the counters that is not simply n+1, so it lives here where it can
 * be tested rather than inside the screen.
 *
 * Returns the hill the NEXT lap starts from: 0 = Ṣafā, 1 = Marwa.
 * After the seventh there is no next lap, and it answers null.
 */
export function saiFrom(n) {
  if (n >= COUNTERS.sai.total) return null;
  return n % 2 === 0 ? 0 : 1;
}

/** How far round the ring to draw, 0..1. Tasbīḥ rings on its marks. */
export function progress(mode, n) {
  const c = COUNTERS[mode];
  if (!c) return 0;
  if (c.total) return Math.min(n / c.total, 1);
  const mark = c.marks[c.marks.length - 1] || 100;
  return (n % mark) / mark;
}
