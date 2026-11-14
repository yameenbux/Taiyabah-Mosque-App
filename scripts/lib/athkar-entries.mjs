/**
 * Taiyabah Masjid — every published supplication, flattened once.
 * Copyright (c) 2026 Yameen Bux. All rights reserved. See LICENSE.md.
 *
 * Three things read this: the Word review sheet, the PDF review sheet, and
 * the check that fails the build when an approved wording is altered. They
 * must agree about what is published and what each entry is called, or the
 * document two ʿulamā signed is not the document the check is guarding.
 *
 * So the flattening lives here, once. The entry ids in particular are load
 * bearing — they are what the approval fingerprints are keyed by — and an
 * id computed two different ways in two files is an approval that silently
 * stops matching.
 */
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "../..");
const read = p => JSON.parse(fs.readFileSync(path.join(root, p), "utf8"));

/**
 * The three parts, each with its sets, each set with its entries.
 *
 * `title` is what heads the entry on the sheet. The duʿās carry a label of
 * their own ("On waking"); the adhkār do not, so the reference stands in,
 * trimmed of everything after the first separator — "Āyat al-Kursī" rather
 * than "Āyat al-Kursī · al-Baqarah 2:255", which is already printed below.
 */
export function parts() {
  const A = read("native/src/data/athkar.json");
  const D = read("native/src/data/duas.json");
  const R = read("native/src/data/rabbanas.json");

  return [
    {
      key: "A", title: "Daily Adhkār",
      blurb: "as they appear on the Daily Adhkār screen",
      sets: A.sections.map(s => ({
        title: s.title, intro: s.intro,
        entries: s.items.map((it, i) => ({
          id: `athkar/${s.id}/${i}`,
          title: it.source ? it.source.split("·")[0].trim() : "",
          ar: it.ar, en: it.en, times: it.times, source: it.source, note: it.note,
        })),
      })),
    },
    {
      key: "B", title: "Everyday Duʿās",
      blurb: "each carries a transliteration, which wants checking as well as the Arabic",
      sets: D.categories.map(c => ({
        title: c.title, intro: c.intro,
        entries: c.items.map((it, i) => ({
          id: `duas/${c.id}/${i}`,
          title: it.label, ar: it.ar, tr: it.tr, en: it.en, source: it.src,
        })),
      })),
    },
    {
      key: "C", title: "Duʿās from the Qurʼan — the forty Rabbanā",
      /*  This asked whether having no English at all should stand. It no
          longer should: the masjid's own plain English rendering is now
          published against each of the forty, so the question put to the
          ʿulamā is a different one. `en` MUST be passed through below — a
          sheet that does not show the English is a sheet nobody can check
          it on, which is the exact failure this file's header warns about. */
      blurb: "each carries the masjid's own plain English rendering of the phrase — " +
             "not a published translation, and not yet approved; please check the meaning",
      sets: [{
        title: "The forty Rabbanā", intro: null,
        entries: R.map((r, i) => ({
          id: `rabbanas/${i}`, title: r.ref, ar: r.ar, en: r.en, source: r.ref,
        })),
      }],
    },
  ];
}

/** Every entry, in order, ignoring which part or set it sits in. */
export const flat = () => parts().flatMap(p => p.sets.flatMap(s =>
  s.entries.map(e => ({ ...e, part: p.key, set: s.title }))));

/** How many in each part, and in total. */
export function counts() {
  const ps = parts();
  const per = Object.fromEntries(ps.map(p =>
    [p.key, p.sets.reduce((n, s) => n + s.entries.length, 0)]));
  return { ...per, total: Object.values(per).reduce((a, b) => a + b, 0) };
}
