#!/usr/bin/env node
/**
 * Taiyabah Masjid — the review sheet as a branded, printable PDF.
 * Copyright (c) 2026 Yameen Bux. All rights reserved. See LICENSE.md.
 *
 * The Word version (build-athkar-review.mjs) is for amending: a reviewer who
 * wants to retype a wording can do it there. This is the one that gets
 * printed, handed over and kept — by the ʿulamā and by the masjid — so it
 * carries the masjid's own livery and its own faces rather than whatever
 * Word had to hand.
 *
 * THE FONTS ARE THE SHIPPED TTFs, NOT THE WEB SUBSETS, and that is not
 * fussiness. index.html already records that Google's Arabic subset of Noto
 * Naskh carves a hole in its own range at U+08E2 — and five of the adhkār
 * contain that character. A reviewer handed a PDF with a missing glyph in
 * Āyat al-Kursī would be right to send it back. The full faces from
 * native/assets/fonts have no hole, and are embedded in the file so it
 * renders the same on any machine it is opened or printed on.
 *
 * The Arabic is set in Noto Naskh with Amiri behind it, which is the stack
 * both the app and the website use for scripture. What the reviewer reads on
 * paper is the face the congregation reads on the screen.
 *
 * Both documents are generated from scripts/lib/athkar-entries.mjs, so the
 * Word file, this PDF and the approval check cannot disagree about what is
 * published.
 *
 *   node scripts/build-athkar-review-pdf.mjs [out.pdf]
 */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { parts, counts } from "./lib/athkar-entries.mjs";

/* See build-athkar-review.mjs: ESM resolution ignores NODE_PATH, and
   Playwright is whatever the machine has rather than a dependency here. */
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

const root = path.resolve(import.meta.dirname, "..");
const OUT = process.argv[2] || path.join(root, "docs/athkar-for-review.pdf");
const today = new Date().toISOString().slice(0, 10);

const font = f => fs.readFileSync(path.join(root, "native/assets/fonts", f)).toString("base64");
const FACE = (family, file, weight = 400) =>
  `@font-face{font-family:"${family}";font-weight:${weight};font-style:normal;` +
  `src:url(data:font/ttf;base64,${font(file)}) format("truetype")}`;

const esc = s => String(s ?? "")
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const C = counts();

/* ---- one supplication -------------------------------------------------- */
const entryHtml = (n, e) => `
  <article class="entry">
    <div class="body">
      <div class="num">${n}${e.title ? ` <span class="ttl">${esc(e.title)}</span>` : ""}</div>
      <p class="ar" dir="rtl" lang="ar">${esc(e.ar)}</p>
      ${e.tr ? `<p class="tr">${esc(e.tr)}</p>` : ""}
      ${e.en ? `<p class="en">${esc(e.en)}</p>` : ""}
      ${(e.times || e.source) ? `<p class="meta">${
        [e.times ? `Recite: ${esc(e.times)}` : null,
         e.source ? `Reference: ${esc(e.source)}` : null].filter(Boolean).join(" &nbsp;·&nbsp; ")}</p>` : ""}
      ${e.note ? `<p class="note">Shown in the app: ${esc(e.note)}</p>` : ""}
    </div>
    <aside class="mark">
      <div class="mh">Wording</div><div class="opt">correct &nbsp;/&nbsp; amend</div>
      <div class="mh">Reference</div><div class="opt">correct &nbsp;/&nbsp; amend</div>
      <div class="mh amd">Amendment</div>
      <div class="rule"></div><div class="rule"></div><div class="rule"></div>
    </aside>
  </article>`;

/* ---- the sign-off sheet for one part ----------------------------------- */
const field = label => `<div class="f"><span>${label}</span><div class="fr"></div></div>`;
const signHtml = partTitle => `
  <section class="sheet signoff">
    <h2>Sign-off &mdash; Part ${partTitle}</h2>
    <p class="lead">Two reviewers are required, working independently. Please do not consult
      one another before signing: two people who agree separately are worth more than two
      who agree together.</p>
    <div class="two">
      ${["First reviewer", "Second reviewer"].map(who => `
        <div class="rev">
          <h3>${who}</h3>
          ${field("Name in full")}
          ${field("Position, and the institution they answer to")}
          <div class="dec">
            <span>Decision</span>
            <div class="cb">&#9744;&nbsp; Approved as written</div>
            <div class="cb">&#9744;&nbsp; Approved subject to the amendments marked</div>
            <div class="cb">&#9744;&nbsp; Not approved &mdash; see comments</div>
          </div>
          ${field("Signature")}
          ${field("Date")}
        </div>`).join("")}
    </div>
    <div class="gen"><span>General comments on this part</span>
      ${"<div class='rule wide'></div>".repeat(7)}</div>
  </section>`;

/* ---- the whole document ------------------------------------------------ */
const GIRIH = `<svg viewBox="0 0 100 100" class="girih"><polygon points="50,2 57.3,32.4 83.9,16.1
  67.6,42.7 98,50 67.6,57.3 83.9,83.9 57.3,67.6 50,98 42.7,67.6 16.1,83.9 32.4,57.3 2,50
  32.4,42.7 16.1,16.1 42.7,32.4"/></svg>`;

let n;
const partsHtml = parts().map(p => {
  n = 0;
  return `
  <section class="sheet part">
    <h1><span class="pk">Part ${p.key}</span> ${esc(p.title)}</h1>
    <p class="blurb">${C[p.key]} supplications &mdash; ${esc(p.blurb)}.</p>
  </section>
  ${p.sets.map(s => `
    <h2 class="set">${esc(s.title)} <span class="cnt">${s.entries.length}</span></h2>
    ${s.intro ? `<p class="intro">${esc(s.intro)}</p>` : ""}
    ${s.entries.map(e => entryHtml(++n, e)).join("")}`).join("")}
  ${signHtml(`${p.key}, ${esc(p.title)}`)}`;
}).join("");

const html = `<!doctype html><html lang="en"><meta charset="utf-8">
<title>Daily Adhkār and Duʿās — for review</title>
<style>
  ${FACE("Fraunces", "Fraunces.ttf")}
  ${FACE("Hanken", "HankenGrotesk.ttf")}
  ${FACE("Hanken", "HankenGroteskSemiBold.ttf", 600)}
  ${FACE("Hanken", "HankenGroteskBold.ttf", 700)}
  ${FACE("NotoNaskh", "NotoNaskhArabic.ttf")}
  ${FACE("Amiri", "Amiri.ttf")}

  :root{ --plum:#3C0B2A; --plum2:#772157; --gold:#8A6D2B; --goldline:#C6A24C;
         --ink:#241019; --muted:#6B5560; --line:#E4DECF; --cream:#FBF8F2 }
  @page{ size:A4; margin:20mm 14mm 16mm }
  *{ box-sizing:border-box }
  html,body{ margin:0; padding:0; font-family:Hanken,system-ui,sans-serif;
             color:var(--ink); font-size:10pt; line-height:1.55;
             -webkit-print-color-adjust:exact; print-color-adjust:exact }

  /* ---- cover ---- */
  .cover{ height:257mm; display:flex; flex-direction:column; page-break-after:always }
  .band{ background:var(--plum); color:#F3EFE3; padding:16mm 14mm 14mm; position:relative;
         overflow:hidden; border-radius:3mm }
  .girih{ position:absolute; right:-16mm; top:-22mm; width:76mm; height:76mm; fill:var(--goldline);
          opacity:.14 }
  .mark{ font-family:Fraunces,serif; font-size:24pt; letter-spacing:.11em; line-height:1 }
  .mark small{ display:block; font-size:7.5pt; letter-spacing:.42em; color:var(--goldline);
               margin-top:2.5mm; font-weight:600 }
  .band .soc{ margin-top:6mm; font-size:8.5pt; color:rgba(243,239,227,.78); line-height:1.7 }
  .covmid{ flex:1; display:flex; flex-direction:column; justify-content:center; text-align:center;
           padding:0 10mm }
  .covmid h1{ font-family:Fraunces,serif; font-size:30pt; color:var(--plum); margin:0 0 4mm;
              line-height:1.2 }
  .covmid .sub{ font-size:12pt; color:var(--muted); margin:0 0 10mm; line-height:1.6 }
  .facts{ display:inline-block; border:.4mm solid var(--line); border-left:1.2mm solid var(--goldline);
          border-radius:2mm; padding:6mm 9mm; background:var(--cream); text-align:left }
  .facts div{ font-size:10pt; margin:1.2mm 0 }
  .facts b{ color:var(--plum) }
  .covfoot{ text-align:center; font-size:8.5pt; color:var(--muted); padding-top:6mm;
            border-top:.3mm solid var(--line) }

  /* ---- generic page furniture ---- */
  .sheet{ page-break-before:always }
  h1{ font-family:Fraunces,serif; font-size:19pt; color:var(--plum); margin:0 0 3mm }
  h1 .pk{ display:block; font-family:Hanken,sans-serif; font-size:9pt; letter-spacing:.22em;
          text-transform:uppercase; color:var(--gold); font-weight:700; margin-bottom:2mm }
  h2{ font-family:Fraunces,serif; font-size:13.5pt; color:var(--plum); margin:7mm 0 2mm;
      page-break-after:avoid }
  h2.set .cnt{ font-family:Hanken,sans-serif; font-size:8.5pt; color:var(--muted); font-weight:600 }
  h2.set .cnt:before{ content:"· " }
  .blurb,.intro{ color:var(--muted); font-size:9.5pt; margin:0 0 4mm }
  .lead{ font-size:10pt; margin:0 0 6mm }
  p{ margin:0 0 2.5mm }

  /* ---- an entry ---- */
  .entry{ display:flex; gap:0; border:.3mm solid var(--line); border-radius:2mm;
          margin:0 0 3.5mm; page-break-inside:avoid; overflow:hidden }
  .entry .body{ flex:1; padding:4mm 5mm; min-width:0 }
  .entry .mark{ width:48mm; flex:none; background:var(--cream); border-left:.3mm solid var(--line);
                padding:4mm 4mm }
  .num{ font-weight:700; color:var(--plum); font-size:10pt; margin-bottom:2.5mm }
  .num .ttl{ font-weight:600 }
  .ar{ font-family:NotoNaskh,Amiri,serif; font-size:17pt; line-height:2.05; text-align:right;
       direction:rtl; margin:0 0 3mm; color:#1b0c15 }
  .tr{ font-style:italic; color:var(--muted); font-size:9.5pt; margin-bottom:2mm }
  .en{ font-size:10pt; margin-bottom:2mm }
  .meta{ font-size:8.5pt; color:var(--gold); margin:0 }
  .note{ font-size:8.5pt; color:var(--muted); font-style:italic; margin:1.5mm 0 0 }
  .mh{ font-size:8pt; font-weight:700; color:var(--muted); letter-spacing:.04em }
  .mh.amd{ margin-top:4mm }
  /* nowrap: at 46mm the words were breaking mid-phrase and the browser was
     stretching the letters to fill the line, which read as a typographic
     fault on a document somebody is meant to sign. */
  .opt{ font-size:7.5pt; color:var(--muted); margin-bottom:3mm; white-space:nowrap }
  .rule{ border-bottom:.3mm solid #D8CCD3; height:5.5mm }
  .rule.wide{ height:8mm }

  /* ---- sign-off ---- */
  .signoff h2{ margin-top:0 }
  .two{ display:flex; gap:6mm }
  .rev{ flex:1; border:.3mm solid var(--line); border-radius:2mm; padding:5mm }
  .rev h3{ font-family:Fraunces,serif; font-size:11.5pt; color:var(--plum); margin:0 0 4mm }
  .f{ margin-bottom:5mm }
  .f span{ display:block; font-size:8pt; font-weight:700; color:var(--muted); margin-bottom:5mm }
  .fr{ border-bottom:.4mm solid #8A8089 }
  .dec{ margin-bottom:5mm }
  .dec span{ display:block; font-size:8pt; font-weight:700; color:var(--muted); margin-bottom:2mm }
  .cb{ font-size:9.5pt; margin:1.2mm 0 }
  .gen{ margin-top:7mm }
  .gen span{ display:block; font-size:8pt; font-weight:700; color:var(--muted); margin-bottom:3mm }

  /* ---- revision table ---- */
  table{ width:100%; border-collapse:collapse; margin-top:3mm }
  th{ background:var(--plum); color:#fff; font-size:8.5pt; text-align:left; padding:2.5mm 3mm;
      font-weight:600 }
  td{ border:.3mm solid var(--line); height:11mm; padding:2mm 3mm }
</style>

<!-- cover -->
<section class="cover">
  <div class="band">
    ${GIRIH}
    <div class="mark">TAIYABAH<small>MASJID</small></div>
    <div class="soc">Bolton Central Islamic Society &middot; Registered charity 1041569<br>
      31a Draycott Street, Bolton BL1 8HD</div>
  </div>
  <div class="covmid">
    <h1>Daily Adhkār and Duʿās</h1>
    <p class="sub">The full text carried in the masjid's app and website,<br>
      submitted for review and approval by the ʿulamā</p>
    <div><div class="facts">
      <div><b>Issued</b> &nbsp; ${today}</div>
      <div><b>Contents</b> &nbsp; ${C.total} supplications in three parts</div>
      <div>Part A &mdash; Daily Adhkār &nbsp;·&nbsp; ${C.A}</div>
      <div>Part B &mdash; Everyday Duʿās &nbsp;·&nbsp; ${C.B}</div>
      <div>Part C &mdash; The forty Rabbanā &nbsp;·&nbsp; ${C.C}</div>
    </div></div>
  </div>
  <div class="covfoot">Generated from the app's own data &mdash; not transcribed.
    Arabic set in Noto Naskh, the face the app and website use for scripture.</div>
</section>

<!-- what is being asked -->
<section class="sheet">
  <h1><span class="pk">Before you begin</span>What is being asked</h1>
  <p>This document contains every supplication the masjid publishes in its app and on its
    website, in full. Nothing is summarised and nothing is left out. We are asking two ʿulamā
    to read it independently and to tell us, entry by entry, whether the Arabic wording and
    the reference given are correct.</p>
  <p>Until recently the app carried a line at the foot of the Adhkār screen asking the reader
    to confirm the wording with the imam before treating it as settled. That was a note to the
    masjid printed where the congregation reads it, and it has been taken down. Taking it down
    is only an improvement if the confirming actually happens, which is what this document is
    for.</p>

  <h2>Where the text comes from</h2>
  <p>The Qurʼanic passages &mdash; Āyat al-Kursī, the muʿawwidhāt, the closing verses of
    al-Baqarah and the forty Rabbanā &mdash; are taken from the same machine-checked IndoPak
    text the masjid's Qurʼan reader uses. They are not retyped here.</p>
  <p>The adhkār and duʿās drawn from hadith are the masjid's own renderings, written for this
    app, with the collection named on each. They are the widely known wordings, but wording
    does vary between narrations and printings, and settling which wording this masjid
    publishes is precisely the judgement we are asking for.</p>
  <p>The English is a plain meaning rather than a formal translation, written for someone who
    does not read Arabic. No published translation is reproduced.</p>

  <h2>How to mark it</h2>
  <p>Each entry has a column on the right. Please mark the wording and the reference as correct
    or needing amendment, and write the amendment you want in the space beneath. Where an entry
    should be removed altogether, please say so and why.</p>
  <p>Each of the three parts has its own sign-off page, so a part may be approved while another
    is still under consideration. Please work independently of the other reviewer.</p>

  <h2>Two matters we would particularly like an opinion on</h2>
  <p><b>1.</b> &nbsp;Part C, the forty Rabbanā, carries the Arabic and the sūrah reference but
    no English at all. We would like to know whether that is acceptable as it stands, or
    whether an English meaning should be added before this part continues to be published.</p>
  <p><b>2.</b> &nbsp;The counts &mdash; &ldquo;Once, morning and evening&rdquo; and the like
    &mdash; and the virtues noted under some adhkār are shown to the reader as statements of
    fact. They should be checked as carefully as the wording itself.</p>
</section>

${partsHtml}

<!-- after signing -->
<section class="sheet">
  <h1><span class="pk">Afterwards</span>After signing</h1>
  <p>Please return this document to the masjid office. The masjid will:</p>
  <p><b>1.</b> &nbsp;Make the amendments you have marked, and send the amended entries back to
    both reviewers for a second look before anything is published.</p>
  <p><b>2.</b> &nbsp;Keep the signed copy, dated, in the masjid's records.</p>
  <p><b>3.</b> &nbsp;Record a fingerprint of every approved entry in the app's source code, so
    that if any approved wording is later altered &mdash; by anyone, for any reason &mdash; the
    change is caught automatically and brought back to you rather than published quietly.</p>
  <p>That third step is what makes this signature worth something in two years' time. An
    approval nobody can check against is an approval that expires the moment somebody edits a
    file.</p>

  <h2>Revision record</h2>
  <p class="blurb">To be completed by the masjid each time this document is reissued.</p>
  <table>
    <tr><th>Issued</th><th>What changed</th><th>Reviewers</th><th>Approved on</th></tr>
    ${"<tr><td></td><td></td><td></td><td></td></tr>".repeat(6)}
  </table>
</section>
</html>`;

const tmp = path.join(root, "docs/.athkar-review.tmp.html");
fs.mkdirSync(path.dirname(tmp), { recursive: true });
fs.writeFileSync(tmp, html);

const browser = await chromium.launch({ args: ["--no-sandbox"] });
const page = await browser.newPage();
await page.goto("file://" + tmp, { waitUntil: "networkidle" });
await page.waitForTimeout(600);

const foot = `
  <div style="width:100%;font-family:sans-serif;font-size:7pt;color:#6B5560;
              padding:0 14mm;display:flex;justify-content:space-between;
              border-top:.3mm solid #E4DECF;padding-top:2mm">
    <span>Taiyabah Masjid &middot; Daily Adhkār and Duʿās &middot; issued ${today}</span>
    <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
  </div>`;

await page.pdf({
  path: OUT, format: "A4", printBackground: true,
  displayHeaderFooter: true,
  headerTemplate: "<div></div>",
  footerTemplate: foot,
  margin: { top: "14mm", bottom: "16mm", left: "0mm", right: "0mm" },
});
await browser.close();
fs.unlinkSync(tmp);

const kb = (fs.statSync(OUT).size / 1024).toFixed(0);
console.log(`${path.relative(root, OUT)} — ${C.total} entries ` +
            `(A ${C.A}, B ${C.B}, C ${C.C}), ${kb}KB, fonts embedded`);
