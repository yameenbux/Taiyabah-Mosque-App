/**
 * Hajj & Umrah — the branches, as the app sees them.
 * Copyright (c) 2026 Yameen Bux. All rights reserved. See LICENSE.md.
 *
 * THE CONTENT IS NOT WRITTEN HERE. It is authored once in hajj/content.js at
 * the repository root, which the website loads directly and which
 * scripts/import-content.mjs turns into src/data/hajj.json for the app — the
 * same door duas.js and athkar.js come through. Writing it twice would
 * guarantee the two drift, and the thing they would drift on is a ruling.
 *
 * This file adds the one branch that has no content to import: the counters.
 * They are a tool rather than a text, they are finished, and hajj.js lets a
 * tool open whether or not the ʿulamā have supplied anything.
 */
import CONTENT from "./data/hajj.json";

/* A branch with nothing to read, because what it holds is a thing you press.
   `kind: "tool"` is what exempts it from the content rule in hajj.js. */
export const COUNTERS_BRANCH = {
  id: "counters",
  kind: "tool",
  route: "HajjCounter",
  title: "The counters",
  lead: "Ṭawāf and saʿī without losing count, and a tasbīḥ.",
  sections: [],
};

/* The order they are offered in is the order of the journey: what to take,
   how to survive the heat, what to check before booking, then iḥrām and the
   rites, then the counters you carry, then coming home. */
const ORDER = ["pack", "heat", "papers", "ihram", "rites", "duas", "counters", "home"];

const imported = Array.isArray(CONTENT && CONTENT.branches) ? CONTENT.branches : [];

export const BRANCHES = [...imported, COUNTERS_BRANCH]
  .sort((a, b) => {
    const i = ORDER.indexOf(a.id), j = ORDER.indexOf(b.id);
    /* Anything the content file adds later and this list has not been told
       about goes to the end rather than silently to the front. */
    return (i < 0 ? ORDER.length : i) - (j < 0 ? ORDER.length : j);
  });

export const branchById = id => BRANCHES.find(b => b.id === id) || null;
