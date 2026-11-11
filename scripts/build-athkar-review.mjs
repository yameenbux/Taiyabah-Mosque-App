#!/usr/bin/env node
/**
 * Taiyabah Masjid — the adhkār and duʿās, as a sheet the ʿulamā can sign.
 * Copyright (c) 2026 Yameen Bux. All rights reserved. See LICENSE.md.
 *
 * WHY THIS EXISTS. Until now the app carried a line at the foot of the
 * Athkār screen telling the reader to confirm the wording with the imam
 * before treating it as settled. That is a note to the masjid printed where
 * the congregation reads, and it has been removed — which is only an
 * improvement if the confirming actually happens. This is the confirming.
 *
 * It exports every supplication the app ships — the Arabic, the English, the
 * transliteration where there is one, the count, the reference and the
 * explanatory note — into a Word document laid out for review, with a column
 * beside each entry for the reviewer's mark and a sign-off page for two
 * ʿulamā at the end of each part.
 *
 * GENERATED, NEVER TYPED. It reads native/src/data/*.json, which is what the
 * app ships and what the website loads. A review document assembled by hand
 * reviews a copy of the text rather than the text, and the two drift the
 * first time either is edited. Regenerate it, do not edit it.
 *
 * WHAT HAPPENS TO THE SIGNED COPY. Approval is worth nothing six months
 * later if nobody can tell whether the words have changed since. So
 * scripts/record-athkar-approval.mjs fingerprints every entry at the moment
 * of approval, and scripts/check-athkar-approved.mjs fails the build when an
 * approved entry is altered without a fresh signature. The paper goes in the
 * masjid's file; the fingerprint goes in the repository.
 *
 *   node scripts/build-athkar-review.mjs [out.docx]
 */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

/* createRequire rather than a bare `import ... from "docx"`, because ESM
   resolution ignores NODE_PATH and docx is not a dependency of this
   repository — it is whatever the machine has. CommonJS resolution honours
   NODE_PATH, so this finds a globally installed copy here and an ordinary
   node_modules copy on a developer's laptop, with no path written down. */
const require = createRequire(import.meta.url);
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, PageBreak,
  Table, TableRow, TableCell, WidthType, BorderStyle, ShadingType, PageOrientation,
} = require("docx");

const root = path.resolve(import.meta.dirname, "..");
const read = p => JSON.parse(fs.readFileSync(path.join(root, p), "utf8"));
const ATHKAR = read("native/src/data/athkar.json");
const DUAS = read("native/src/data/duas.json");
const RABBANAS = read("native/src/data/rabbanas.json");

const OUT = process.argv[2] || path.join(root, "docs/athkar-for-review.docx");

/* A4 is 11906 twips; 1440 of margin each side leaves 9026 for content. The
   entry table splits that into the supplication and the reviewer's column. */
const CONTENT = 9026;
const COL_TEXT = 6500;
const COL_MARK = CONTENT - COL_TEXT;

const PLUM = "3C0B2A";
const GOLD = "8A6D2B";      /* the brand gold is too pale to read on paper */
const MUTED = "5F5159";
const RULE = "C9BFC5";

/* Arial carries Arabic on every machine this document will be opened on.
   A handsomer face would be a gamble: a reviewer whose Word substitutes a
   font without tashkīl is reviewing something other than what ships. */
const AR_FONT = "Arial";

const today = new Date().toISOString().slice(0, 10);

const t = (text, o = {}) => new TextRun({ text, font: o.font, bold: o.bold, italics: o.italics,
                                          size: o.size ?? 20, color: o.color, rightToLeft: o.rtl });
const p = (runs, o = {}) => new Paragraph({
  children: Array.isArray(runs) ? runs : [runs],
  alignment: o.align, bidirectional: o.rtl, heading: o.heading,
  spacing: { before: o.before ?? 0, after: o.after ?? 80, line: o.line },
  border: o.border,
});
const blank = (after = 120) => new Paragraph({ children: [], spacing: { after } });

/** Arabic, right-aligned, large enough that the tashkīl can be judged. */
const arabic = s => p(t(s, { font: AR_FONT, size: 32, rtl: true }),
                      { align: AlignmentType.RIGHT, rtl: true, line: 460, after: 120 });

const cell = (children, o = {}) => new TableCell({
  children, width: { size: o.width, type: WidthType.DXA },
  shading: o.fill ? { type: ShadingType.CLEAR, fill: o.fill, color: "auto" } : undefined,
  margins: { top: 120, bottom: 120, left: 120, right: 120 },
});

const thinBorders = {
  top:    { style: BorderStyle.SINGLE, size: 4, color: RULE },
  bottom: { style: BorderStyle.SINGLE, size: 4, color: RULE },
  left:   { style: BorderStyle.SINGLE, size: 4, color: RULE },
  right:  { style: BorderStyle.SINGLE, size: 4, color: RULE },
  insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: RULE },
  insideVertical:   { style: BorderStyle.SINGLE, size: 4, color: RULE },
};

/**
 * One supplication, with the reviewer's column beside it.
 *
 * The mark column is deliberately empty and deliberately wide enough to
 * write in. A review sheet that assumes approval and only leaves room for
 * objections is not a review sheet.
 */
function entry(n, { title, ar, tr, en, times, source, note }) {
  const left = [];
  left.push(p([t(`${n}. `, { bold: true, color: PLUM, size: 20 }),
               t(title || "", { bold: true, color: PLUM, size: 20 })], { after: 100 }));
  left.push(arabic(ar));
  if (tr) left.push(p(t(tr, { italics: true, color: MUTED, size: 19 }), { after: 80 }));
  if (en) left.push(p(t(en, { size: 20 }), { after: 80 }));
  const foot = [];
  if (times) foot.push(`Recite: ${times}`);
  if (source) foot.push(`Reference: ${source}`);
  if (foot.length) left.push(p(t(foot.join("   ·   "), { size: 17, color: MUTED }), { after: note ? 60 : 0 }));
  if (note) left.push(p(t(`Note shown in the app: ${note}`, { size: 17, color: MUTED, italics: true }), { after: 0 }));

  const right = [
    p(t("Wording", { size: 15, color: MUTED, bold: true }), { after: 40 }),
    p(t("correct  /  amend", { size: 15, color: MUTED }), { after: 100 }),
    p(t("Reference", { size: 15, color: MUTED, bold: true }), { after: 40 }),
    p(t("correct  /  amend", { size: 15, color: MUTED }), { after: 160 }),
    p(t("Amendment:", { size: 15, color: MUTED, bold: true }), { after: 300 }),
    p(t("", { size: 15 }), { after: 240, border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: RULE } } }),
    p(t("", { size: 15 }), { after: 240, border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: RULE } } }),
  ];

  return new Table({
    columnWidths: [COL_TEXT, COL_MARK],
    width: { size: CONTENT, type: WidthType.DXA },
    borders: thinBorders,
    /* cantSplit, so a supplication is never cut in half by a page break.
       A reviewer should not have to turn a page to finish reading the thing
       they are being asked to judge, and an Arabic line broken across two
       sheets is the one that gets signed off without being read. */
    rows: [new TableRow({ cantSplit: true, children: [
      cell(left, { width: COL_TEXT }),
      cell(right, { width: COL_MARK, fill: "FBF8F2" }),
    ] })],
  });
}

/** The two-ʿālim sign-off for one part. */
function signoff(partName) {
  const line = label => [
    p(t(label, { size: 17, color: MUTED, bold: true }), { after: 260 }),
    p(t("", { size: 17 }), { after: 200,
      border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "8A8089" } } }),
  ];
  const block = which => cell([
    p(t(which, { bold: true, color: PLUM, size: 21 }), { after: 200 }),
    ...line("Name in full"),
    ...line("Position, and the institution they answer to"),
    p(t("Decision", { size: 17, color: MUTED, bold: true }), { after: 80 }),
    p(t("☐  Approved as written", { size: 19 }), { after: 60 }),
    p(t("☐  Approved subject to the amendments marked", { size: 19 }), { after: 60 }),
    p(t("☐  Not approved — see comments", { size: 19 }), { after: 220 }),
    ...line("Signature"),
    ...line("Date"),
  ], { width: Math.floor(CONTENT / 2) });

  return [
    /* Its own sheet. This is the page that gets printed, signed and filed,
       and a signature block that starts halfway down after the last
       supplication reads as an afterthought. */
    new Paragraph({ children: [new PageBreak()] }),
    p(t(`Sign-off — ${partName}`, { bold: true, size: 26, color: PLUM }),
      { heading: HeadingLevel.HEADING_2, before: 0, after: 120 }),
    p(t("Two reviewers are required, working independently. Please do not " +
        "consult one another before signing: two people who agree separately " +
        "are worth more than two who agree together.", { size: 19 }), { after: 220 }),
    new Table({
      columnWidths: [Math.floor(CONTENT / 2), Math.ceil(CONTENT / 2)],
      width: { size: CONTENT, type: WidthType.DXA },
      borders: thinBorders,
      rows: [new TableRow({ cantSplit: true, children: [block("First reviewer"), block("Second reviewer")] })],
    }),
    blank(200),
    p(t("General comments on this part", { size: 17, color: MUTED, bold: true }), { after: 200 }),
    ...Array.from({ length: 5 }, () =>
      p(t("", { size: 19 }), { after: 240,
        border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: RULE } } })),
  ];
}

const h1 = (text, o = {}) => p(t(text, { bold: true, size: 30, color: PLUM }),
                               { heading: HeadingLevel.HEADING_1, before: o.before ?? 240, after: 120 });
const h2 = text => p(t(text, { bold: true, size: 24, color: PLUM }),
                     { heading: HeadingLevel.HEADING_2, before: 260, after: 100 });
const body = (text, o = {}) => p(t(text, { size: 20, color: o.color }), { after: o.after ?? 140 });

/* ---- the document ------------------------------------------------------ */
const kids = [];

/* title page */
kids.push(blank(1400));
kids.push(p(t("TAIYABAH MASJID", { bold: true, size: 36, color: PLUM }), { align: AlignmentType.CENTER, after: 80 }));
kids.push(p(t("Bolton Central Islamic Society  ·  Registered charity 1041569",
              { size: 18, color: MUTED }), { align: AlignmentType.CENTER, after: 700 }));
kids.push(p(t("Daily Adhkār and Duʿās", { bold: true, size: 48, color: PLUM }),
            { align: AlignmentType.CENTER, after: 120 }));
kids.push(p(t("The full text carried in the masjid's app and website,",
              { size: 24, color: MUTED }), { align: AlignmentType.CENTER, after: 40 }));
kids.push(p(t("submitted for review and approval by the ʿulamā",
              { size: 24, color: MUTED }), { align: AlignmentType.CENTER, after: 800 }));

const counts = {
  athkar: ATHKAR.sections.reduce((n, s) => n + s.items.length, 0),
  duas: DUAS.categories.reduce((n, c) => n + c.items.length, 0),
  rabbanas: RABBANAS.length,
};
kids.push(p(t(`Issued ${today}`, { size: 20, bold: true }), { align: AlignmentType.CENTER, after: 60 }));
kids.push(p(t(`${counts.athkar + counts.duas + counts.rabbanas} supplications in three parts`,
              { size: 20, color: MUTED }), { align: AlignmentType.CENTER, after: 60 }));
kids.push(p(t("Generated from the app's own data — not transcribed",
              { size: 17, color: MUTED, italics: true }), { align: AlignmentType.CENTER }));
kids.push(new Paragraph({ children: [new PageBreak()] }));

/* what is being asked */
kids.push(h1("What is being asked", { before: 0 }));
kids.push(body("This document contains every supplication the masjid publishes in its app and on its " +
  "website, in full. Nothing is summarised and nothing is left out. We are asking two ʿulamā to read " +
  "it independently and to tell us, entry by entry, whether the Arabic wording and the reference " +
  "given are correct."));
kids.push(body("Until recently the app carried a line at the foot of the Adhkār screen asking the " +
  "reader to confirm the wording with the imam before treating it as settled. That was a note to the " +
  "masjid printed where the congregation reads it, and it has been taken down. Taking it down is only " +
  "an improvement if the confirming actually happens, which is what this document is for."));

kids.push(h2("Where the text comes from"));
kids.push(body("The Qurʼanic passages — Āyat al-Kursī, the muʿawwidhāt, the closing verses of " +
  "al-Baqarah and the forty Rabbanā — are taken from the same machine-checked IndoPak text the " +
  "masjid's Qurʼan reader uses. They are not retyped here."));
kids.push(body("The adhkār and duʿās drawn from hadith are the masjid's own renderings, written for " +
  "this app, with the collection named on each. They are the widely known wordings, but wording does " +
  "vary between narrations and printings, and settling which wording this masjid publishes is " +
  "precisely the judgement we are asking for."));
kids.push(body("The English is a plain meaning rather than a formal translation, written for someone " +
  "who does not read Arabic. No published translation is reproduced."));

kids.push(h2("How to mark it"));
kids.push(body("Each entry has a column on the right. Please mark the wording and the reference as " +
  "correct or needing amendment, and write the amendment you want in the space beneath. Where an " +
  "entry should be removed altogether, please say so and why."));
kids.push(body("Each of the three parts has its own sign-off page, so a part may be approved while " +
  "another is still under consideration. Please work independently of the other reviewer."));

kids.push(h2("Two matters we would particularly like an opinion on"));
kids.push(body("1.  Part C, the forty Rabbanā, carries the Arabic and the sūrah reference but no " +
  "English at all. We would like to know whether that is acceptable as it stands, or whether an " +
  "English meaning should be added before this part continues to be published."));
kids.push(body("2.  The counts — “Once, morning and evening” and the like — and the virtues " +
  "noted under some adhkār are shown to the reader as statements of fact. They should be checked as " +
  "carefully as the wording itself."));
kids.push(new Paragraph({ children: [new PageBreak()] }));

/* Part A — adhkār */
kids.push(h1("Part A  ·  Daily Adhkār", { before: 0 }));
kids.push(body(`${counts.athkar} supplications in ${ATHKAR.sections.length} sets, as they appear on ` +
  "the Daily Adhkār screen.", { color: MUTED }));
let n = 0;
for (const s of ATHKAR.sections) {
  kids.push(h2(`${s.title}  —  ${s.items.length} supplications`));
  if (s.intro) kids.push(body(s.intro, { color: MUTED }));
  for (const it of s.items) {
    kids.push(entry(++n, { title: it.source ? it.source.split("·")[0].trim() : "",
                           ar: it.ar, en: it.en, times: it.times, source: it.source, note: it.note }));
    kids.push(blank(160));
  }
}
kids.push(...signoff("Part A, Daily Adhkār"));
kids.push(new Paragraph({ children: [new PageBreak()] }));

/* Part B — everyday duʿās */
kids.push(h1("Part B  ·  Everyday Duʿās", { before: 0 }));
kids.push(body(`${counts.duas} supplications in ${DUAS.categories.length} categories. Each carries a ` +
  "transliteration, which should be checked as well as the Arabic.", { color: MUTED }));
n = 0;
for (const c of DUAS.categories) {
  kids.push(h2(`${c.title}  —  ${c.items.length} supplications`));
  if (c.intro) kids.push(body(c.intro, { color: MUTED }));
  for (const it of c.items) {
    kids.push(entry(++n, { title: it.label, ar: it.ar, tr: it.tr, en: it.en, source: it.src }));
    kids.push(blank(160));
  }
}
kids.push(...signoff("Part B, Everyday Duʿās"));
kids.push(new Paragraph({ children: [new PageBreak()] }));

/* Part C — the forty Rabbanā */
kids.push(h1("Part C  ·  Duʿās from the Qurʼan — the forty Rabbanā", { before: 0 }));
kids.push(body(`${counts.rabbanas} supplications. The Arabic is the verified Qurʼanic text and the ` +
  "reference is the sūrah and āyah.", { color: MUTED }));
kids.push(body("These are published with NO English meaning. Please say whether that should stand.",
  { color: PLUM }));
n = 0;
for (const r of RABBANAS) {
  kids.push(entry(++n, { title: r.ref, ar: r.ar, source: r.ref }));
  kids.push(blank(160));
}
kids.push(...signoff("Part C, the forty Rabbanā"));
kids.push(new Paragraph({ children: [new PageBreak()] }));

/* what happens next */
kids.push(h1("After signing", { before: 0 }));
kids.push(body("Please return this document to the masjid office. The masjid will:"));
kids.push(body("1.  Make the amendments you have marked, and send the amended entries back to both " +
  "reviewers for a second look before anything is published."));
kids.push(body("2.  Keep the signed copy, dated, in the masjid's records."));
kids.push(body("3.  Record a fingerprint of every approved entry in the app's source code, so that if " +
  "any approved wording is later altered — by anyone, for any reason — the change is caught " +
  "automatically and brought back to you rather than published quietly."));
kids.push(body("That third step is what makes this signature worth something in two years' time. " +
  "An approval nobody can check against is an approval that expires the moment somebody edits a file."));
kids.push(blank(300));
kids.push(p(t("Revision record", { bold: true, size: 24, color: PLUM }),
            { heading: HeadingLevel.HEADING_2, after: 120 }));
kids.push(body("To be completed by the masjid each time this document is reissued.", { color: MUTED }));
const hdr = s => cell([p(t(s, { bold: true, size: 17, color: "FFFFFF" }))],
                      { width: Math.floor(CONTENT / 4), fill: PLUM });
const rowCells = () => Array.from({ length: 4 }, () =>
  cell([p(t("", { size: 19 }), { after: 220 })], { width: Math.floor(CONTENT / 4) }));
kids.push(new Table({
  columnWidths: [Math.floor(CONTENT / 4), Math.floor(CONTENT / 4), Math.floor(CONTENT / 4), Math.floor(CONTENT / 4)],
  width: { size: CONTENT, type: WidthType.DXA },
  borders: thinBorders,
  rows: [
    new TableRow({ children: [hdr("Issued"), hdr("What changed"), hdr("Reviewers"), hdr("Approved on")] }),
    ...Array.from({ length: 6 }, () => new TableRow({ children: rowCells() })),
  ],
}));

const doc = new Document({
  creator: "Taiyabah Masjid",
  title: "Daily Adhkār and Duʿās — for review and approval",
  description: `Generated ${today} from the app's own data`,
  styles: { default: { document: { run: { font: "Calibri", size: 20 } } } },
  sections: [{
    properties: { page: { size: { orientation: PageOrientation.PORTRAIT },
                          margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 } } },
    children: kids,
  }],
});

fs.mkdirSync(path.dirname(OUT), { recursive: true });
const buf = await Packer.toBuffer(doc);
fs.writeFileSync(OUT, buf);
console.log(`${path.relative(root, OUT)} — ${counts.athkar} adhkār, ${counts.duas} duʿās, ` +
            `${counts.rabbanas} rabbanā (${counts.athkar + counts.duas + counts.rabbanas} entries), ` +
            `${(buf.length / 1024).toFixed(0)}KB`);
