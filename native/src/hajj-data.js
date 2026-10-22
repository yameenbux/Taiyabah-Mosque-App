/**
 * Hajj & Umrah — the content the ʿulamā supply.
 * Copyright (c) 2026 Yameen Bux. All rights reserved. See LICENSE.md.
 *
 * THIS FILE IS DELIBERATELY EMPTY, and the gate in hajj.js reads it to find
 * that out. Dam, the restrictions of iḥrām, qaṣr and jamʿ while travelling,
 * and the order of each rite are Ḥanafī rulings with real consequences if
 * they are wrong: a wrong answer about dam costs somebody money or a
 * defective Hajj. They are the masjid's ʿulamā to write and nobody else's,
 * and until they are written these three lists stay empty and the section
 * stays shut. That is not a placeholder waiting to be forgotten — it is the
 * mechanism, and check-hajj.mjs asserts it.
 *
 * WHAT IS NOT WAITING ON ANYONE: the counters. They carry no words but their
 * own numbers, so they are finished, and hajj.js exempts them from the gate's
 * content rule for that reason.
 *
 * HOW TO FILL IT. Each list takes the shapes below. Every entry carries a
 * `source` because a ruling with no attribution is worth less than no ruling
 * at all in front of a congregation, and `by` because the person who approved
 * it should be nameable. Add entries; change nothing else. When all three
 * lists have something in them AND the masjid says the word, flip RELEASED in
 * src/hajj.js and HAJJ_RELEASED in index.html together.
 */

/* A duʿā.
 *
 *   { id:     "talbiyah",
 *     ar:     "لَبَّيْكَ اللَّهُمَّ لَبَّيْكَ",   // exactly as the muṣḥaf or the hadith has it
 *     tr:     "Labbayk Allahumma labbayk",     // for the reader who cannot read Arabic
 *     en:     "Here I am, O Allah, here I am",
 *     when:   "From the moment of iḥrām until the first stoning",
 *     source: "Bukhārī 1549",
 *     by:     "Mufti ..." }
 *
 * The app already verifies its other duʿās against their sources
 * (scripts/verify-hadith-duas.mjs, verify-quran-duas.mjs). Anything added
 * here should go through the same door rather than round it.
 */
export const DUAS = [];

/* One step of one rite, in the order it is performed.
 *
 *   { id:   "tawaf-3",
 *     rite: "tawaf",            // tawaf | sai | ihram | arafah | stoning | ...
 *     n:    3,                  // its place in that rite
 *     title:"Walking the circuit",
 *     body: "...",
 *     by:   "Mufti ..." }
 *
 * The counters already know a ṭawāf is seven and that saʿī alternates between
 * the hills; this is the part a counter cannot tell anybody.
 */
export const STEPS = [];

/* A ruling, in the form people actually ask it.
 *
 *   { id:      "perfume-in-ihram",
 *     q:       "I put on scented soap after iḥrām. Is a dam due?",
 *     a:       "...",
 *     verdict: "dam",           // allowed | avoid | dam
 *     source:  "...",
 *     by:      "Mufti ..." }
 *
 * `verdict` is what colours the chip on the screen. Three values only, and
 * "dam" is the only one that takes a colour, so the two are not told apart by
 * hue alone.
 */
export const RULINGS = [];

/* What hajjAccess() reads. The keys are the ones CONTENT_SECTIONS names. */
export const HAJJ_CONTENT = { duas: DUAS, steps: STEPS, rulings: RULINGS };
