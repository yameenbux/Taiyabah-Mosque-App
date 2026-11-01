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
/** WHICH TRIP IS THIS FOR?
 *
 * Most of the section is the same journey twice over: a case is packed the
 * same way, the heat is the same heat, the paperwork is the same paperwork.
 * A few things are not. The five days belong to Hajj and to nothing else, and
 * some of what has to be arranged before flying is enforced far harder for
 * Hajj than for ʿUmrah.
 *
 * So anything in content.js may carry `journey: "hajj"` or `journey: "umrah"`,
 * and anything that carries neither belongs to both — which is the common case
 * and therefore the default. A branch, a section and an item can each say it,
 * and the narrowest one that applies wins, because a Hajj-only section inside
 * a shared branch is a real shape and the opposite is not.
 *
 * Asked with no journey at all, everything matches. That is what the check
 * scripts do, and what a developer navigating straight to a route gets. */
export function forJourney(journey) {
  const j = journey === "hajj" || journey === "umrah" ? journey : null;
  return node => !j || !node || !node.journey || node.journey === j;
}

export function visibleItems(branch, journey) {
  if (!branch || !Array.isArray(branch.sections)) return [];
  const fits = forJourney(journey);
  if (!fits(branch)) return [];
  const all = branch.sections.filter(fits)
    .flatMap(s => (Array.isArray(s.items) ? s.items : []))
    .filter(fits);
  /* Practical branches are travel and safety guidance written in the repo and
     need no scholar. Fiqh branches show only what has been approved. */
  return branch.kind === "fiqh" ? all.filter(approved) : all;
}

/** The branch's sections, with unapproved entries and emptied sections gone. */
export function visibleSections(branch, journey) {
  if (!branch || !Array.isArray(branch.sections)) return [];
  const fits = forJourney(journey);
  if (!fits(branch)) return [];
  const keep = branch.kind === "fiqh" ? approved : () => true;
  return branch.sections
    .filter(fits)
    .map(s => ({ ...s, items: (Array.isArray(s.items) ? s.items : []).filter(i => keep(i) && fits(i)) }))
    .filter(s => s.items.length > 0);
}

/** A tool is always ready. Anything else needs something to show. */
export function branchOpen(branch, journey) {
  if (!branch) return false;
  if (!forJourney(journey)(branch)) return false;
  if (branch.kind === "tool") return true;
  return visibleItems(branch, journey).length > 0;
}

export function openBranches(branches, journey) {
  return (Array.isArray(branches) ? branches : []).filter(b => branchOpen(b, journey));
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

/* ------------------------------------------------------------------ *
 *  THE LEAD SENTENCE
 * ------------------------------------------------------------------ */

/* WHY AN ENTRY IS SPLIT IN TWO. The bodies run to sixty and ninety words,
 * which is right at a kitchen table and wrong in the Ḥaram: a pilgrim with
 * one hand free, in a crowd, gets a wall of text where they wanted the next
 * thing to do. Nearly every entry here is already written lead-first — what
 * to do, then why and what catches people — so the shape is in the prose
 * and only the rendering throws it away.
 *
 * So the first sentence is drawn in full ink and the remainder beneath it in
 * the faint. Nothing is hidden, nothing is reworded, nothing is truncated:
 * the eye simply gets somewhere to land. Lyft and Nike Training Club do the
 * same thing — a bold clause carrying the instruction, the detail behind it
 * in grey.
 *
 * TWO TRAPS, both found by running this over all thirty entries rather than
 * by thinking about it:
 *
 *   A duʿā's own words contain full stops. Splitting on the first one left
 *   "“O Allah, I intend to perform ʿUmrah." on one line and the closing
 *   quote stranded on the next. A split is only allowed where the curly
 *   quotes balance — and when an entry OPENS with a duʿā, the duʿā is the
 *   lead and when to say it is the remainder, which is the right way round
 *   for the one screen somebody holds up at Ṣafā.
 *
 *   "All the way round." is a four-word sentence and a perfect lead. An
 *   earlier minimum length swallowed it and the sentence after it.
 */
export function leadOf(text) {
  const d = typeof text === "string" ? text : "";
  if (d.startsWith("“")) {
    const end = d.indexOf("”");
    if (end > 0 && end < d.length - 2)
      return { lead: d.slice(0, end + 1), rest: d.slice(end + 1).trim() };
  }
  /* The closing quote comes AFTER the full stop, so a sentence ending on a
     quotation ends `.”` rather than `.`. Without the optional mark the scan
     walked straight past such an ending and never split the entry at all —
     found by a test that failed before any mutation was applied to it. */
  const re = /([.!?][”"]?)(\s+)(?=[“"A-ZĀḤṬṢʿʾ])/g;
  let m;
  while ((m = re.exec(d))) {
    const head = (d).slice(0, m.index + m[1].length);
    if (head.length < 10) continue;
    const opens = (head.match(/“/g) || []).length;
    const closes = (head.match(/”/g) || []).length;
    if (opens !== closes) continue;
    return { lead: head, rest: (d).slice(m.index + m[1].length + m[2].length) };
  }
  return { lead: d, rest: "" };
}

/* WHICH STORE LINK A PERSON IS SHOWN.
 *
 * Nusuk is published on both stores, and an entry that says "Get Nusuk on the
 * App Store" is wrong half the time — worse than wrong, because the one thing
 * that entry exists to do is get the app onto the phone in the reader's hand.
 * An Android pilgrim reading an iOS instruction concludes the app is not for
 * them.
 *
 * So a link may carry an `android` twin. The rule lives here rather than in
 * either renderer because the app and the website both need it and they must
 * not drift: this is the same reason forJourney() lives here.
 *
 * ON A PHONE, ONE ROW — the right one, chosen from the platform, because the
 * other row is noise the reader has to step over. ON A DESKTOP BROWSER, BOTH,
 * because the platform of the browser says nothing about the platform of the
 * phone the person is going to install it on. Somebody planning their trip on
 * a laptop is exactly the person who needs to see that both exist.
 */
export function linkRows(link, platform) {
  if (!link || !link.url) return [];
  const alt = link.android;
  if (!alt || !alt.url) return [link];
  if (platform === "android") return [alt];
  if (platform === "ios") return [link];
  return [link, alt];
}
