/**
 * Taiyabah Masjid — the tasbīḥ after ṣalāh, as a sequence a counter can walk.
 * Copyright (c) 2026 Yameen Bux. All rights reserved. See LICENSE.md.
 *
 * THE WORDS ARE NOT WRITTEN HERE. They are sliced out of the dhikr that is
 * already in the app — athkar.json, "After Every Ṣalāh", the second entry —
 * which reads:
 *
 *   سُبْحَانَ اللَّهِ ﴿٣٣﴾ الْحَمْدُ لِلَّهِ ﴿٣٣﴾ اللَّهُ أَكْبَرُ ﴿٣٣﴾ لَا إِلَهَ إِلَّا اللَّهُ …
 *
 * and already carries its own counts in Arabic-Indic numerals between ornate
 * brackets. Splitting on those gives the four steps and nothing is retyped.
 *
 * WHY IT MATTERS THAT NOTHING IS RETYPED. All 142 supplications in this app
 * are published awaiting two ʿulamā signatures, and check-athkar-approved.mjs
 * fingerprints each one so that an approved wording cannot be edited without
 * a fresh signature. A counter that held its own copy of these four phrases
 * would be a second copy of reviewed text, free to drift from the first, and
 * the fingerprint would not cover it. Deriving them means the counter says
 * exactly what the dhikr screen says, forever, or this file throws.
 *
 * It throws rather than degrades on purpose. A tasbīḥ counter that silently
 * lost its third phrase would count to 99 and nobody would be sure why.
 */
import ATHKAR from "./data/athkar.json";

/*  ﴿٣٣﴾ — U+FD3F and U+FD3E around Arabic-Indic ٣٣. The dhikr writes the
    count this way three times; the fourth phrase has no count because it is
    said once. */
const COUNT = /\s*﴿([٠-٩]+)﴾\s*/;
const ARABIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";
const toInt = s => Number([...s].map(c => ARABIC_DIGITS.indexOf(c)).join(""));

/** The English for each step, in the order the Arabic runs. Taken from the
 *  same entry's own English line, which reads "Glory be to Allah (33), praise
 *  be to Allah (33), Allah is the Greatest (33), then: There is no god but
 *  Allah alone, …" — split on the same boundaries. */
function englishParts(en) {
  const [head, tail] = en.split(/,\s*then:\s*/);
  const parts = head.split(/\s*\(\d+\)\s*,?\s*/).filter(Boolean);
  /*  "praise be to Allah" is lowercase in the dhikr because it arrives in the
      middle of a sentence. On the counter each phrase is a heading of its own,
      so it takes a capital. That is typesetting, not a change to the words —
      the Arabic, which is what was reviewed, is untouched, and the test that
      every phrase appears verbatim in the dhikr checks the Arabic. */
  const cap = s => s ? s[0].toUpperCase() + s.slice(1) : s;
  return [...parts, (tail || "").trim()].map(s => cap(s.trim()));
}

export function sequence() {
  const set = ATHKAR.sections.find(s => s.id === "after-salah");
  if (!set) throw new Error("tasbih: the After Every Ṣalāh set is not in athkar.json");

  /*  The entry is found by its WORDS, not by its index. An entry inserted
      above it would otherwise silently make the counter walk a different
      dhikr — and the index is exactly the kind of thing that moves. */
  const item = set.items.find(it => COUNT.test(it.ar || ""));
  if (!item) throw new Error("tasbih: no entry in After Every Ṣalāh carries ﴿٣٣﴾ counts");

  const pieces = (item.ar || "").split(new RegExp(COUNT.source, "g"));
  /*  split() with one capture group interleaves: [text, count, text, count,
      text, …]. Three counts therefore give seven pieces, the last with none. */
  const ar = [], counts = [];
  for (let i = 0; i < pieces.length; i += 2) {
    const text = (pieces[i] || "").trim();
    if (!text) continue;
    ar.push(text);
    const n = pieces[i + 1];
    counts.push(n ? toInt(n) : 1);
  }

  const en = englishParts(item.en || "");
  if (ar.length !== 4)
    throw new Error(`tasbih: expected 4 phrases from the dhikr, got ${ar.length}`);
  if (counts.join() !== "33,33,33,1")
    throw new Error(`tasbih: expected counts 33,33,33,1 — got ${counts.join()}`);

  return ar.map((text, i) => ({ ar: text, en: (en[i] || "").trim(), count: counts[i] }));
}

/** 100 — what the four steps come to, which is the number people know. */
export const total = () => sequence().reduce((n, s) => n + s.count, 0);

/**
 * Where tap number `n` lands: which step, how far into it, and whether that
 * tap completed a step or the whole tasbīḥ.
 *
 * Pure, and the reason the screen holds a single integer rather than a step
 * index and a sub-count that can disagree with each other.
 */
export function at(n, steps = sequence()) {
  const whole = steps.reduce((a, s) => a + s.count, 0);
  const done = Math.max(0, Math.min(n, whole));
  let left = done;
  for (let i = 0; i < steps.length; i++) {
    if (left < steps[i].count || (left === steps[i].count && i === steps.length - 1)) {
      return { i, step: steps[i], into: left, done,
               complete: done === whole, stepComplete: left === steps[i].count };
    }
    if (left === steps[i].count) {
      /*  Exactly on a boundary: report the step just finished, not the next
          one. Somebody who has said the thirty-third SubḥānAllāh is looking
          at a finished step, and moving the label on before they have lifted
          their thumb reads as having skipped one. */
      return { i, step: steps[i], into: left, done,
               complete: false, stepComplete: true };
    }
    left -= steps[i].count;
  }
  return { i: steps.length - 1, step: steps[steps.length - 1], into: steps[steps.length - 1].count,
           done, complete: true, stepComplete: true };
}
