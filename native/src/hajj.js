/**
 * Hajj & Umrah — the gate, and the arithmetic of the counters.
 * Copyright (c) 2026 Yameen Bux. All rights reserved. See LICENSE.md.
 *
 * WHAT THIS IS FOR. The section is built and held. Until the masjid says
 * otherwise the public sees one locked screen, exactly as Ramadan was held
 * behind its guard, and this file is what decides which of the two a person
 * gets. It is the Hajj half of what ramadan.js does for Ramadan.
 *
 * THE FLAG IS NOT THE WHOLE GATE, and that is the point of the file. Dam,
 * iḥrām restrictions, qaṣr and the order of the rites are Ḥanafī rulings that
 * the ʿulamā at the masjid supply; nothing here writes them. So the gate
 * refuses to open onto content that has not arrived: flipping RELEASED on its
 * own is not enough, and a release cannot expose an empty rulings screen by
 * being merged on a Friday afternoon. Both halves have to be true.
 *
 * THE COUNTERS ARE EXEMPT from that rule, deliberately. They carry no words
 * of anyone's but their own numbers, so they are finished whether the rulings
 * have arrived or not — and they are the part of the section a person has
 * open in their hand during the ṭawāf itself.
 *
 * NOTHING IS IMPORTED ON PURPOSE, for the reason ramadan.js and qibla.js are
 * written the same way: it takes its inputs as arguments, so the tests run
 * the real code under plain Node and a wrong answer is a failing test rather
 * than something somebody discovers in the Ḥaram.
 */

/* ------------------------------------------------------------------ *
 *  THE GATE
 * ------------------------------------------------------------------ */

/* The masjid's own switch. Held until they say otherwise; see check-hajj.mjs,
   which makes sure the website and the app never disagree about it. */
export const RELEASED = false;

/* The three that need the ʿulamā. `counters` is not among them. */
export const CONTENT_SECTIONS = ["duas", "steps", "rulings"];

/* A section counts as supplied when it has at least one entry. An empty array
   is the honest state while it is being written, and it is what keeps the
   gate shut. */
export function missingContent(content) {
  const c = content || {};
  return CONTENT_SECTIONS.filter(k => !Array.isArray(c[k]) || c[k].length === 0);
}

/**
 * Which screen a person gets.
 *
 *   { open: false, reason: "held" }        the masjid has not released it
 *   { open: false, reason: "incomplete", missing: [...] }
 *                                          released, but the ʿulamā's words
 *                                          for those sections are not in yet
 *   { open: true }                         the section proper
 *
 * `released` is an argument rather than a read of the constant so the tests
 * can drive both sides of the switch without editing the file under test.
 */
export function hajjAccess(content, released = RELEASED) {
  if (!released) return { open: false, reason: "held" };
  const missing = missingContent(content);
  if (missing.length) return { open: false, reason: "incomplete", missing };
  return { open: true };
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
