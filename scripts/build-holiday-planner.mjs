#!/usr/bin/env node
/**
 * Taiyabah Masjid — the madrasah year as a sheet you can put on a wall.
 * Copyright (c) 2026 Yameen Bux. All rights reserved. See LICENSE.md.
 *
 * The Holidays screen answers "is the madrasah open today". A planner answers
 * a different question — "when in the next twelve months can we go away" —
 * and that one is asked at the kitchen table, by two parents, over a sheet of
 * paper. So this builds the paper, from the same data the screen draws from.
 *
 *   node scripts/build-holiday-planner.mjs
 *
 * RENDERED FROM THE DATA, NEVER DRAWN BY HAND OR GENERATED AS A PICTURE. A
 * calendar is read for its dates, and a date that is wrong is worse than no
 * calendar — a parent books flights around it. Everything below comes out of
 * native/src/madrasah-data.js, which is what the app and the website read, so
 * the download cannot say one thing while the screen says another.
 * scripts/check-holiday-planner.mjs fails the build if the committed sheet
 * falls behind that file.
 *
 * THREE THINGS THAT MUST MATCH THE SCREEN, and did not in the first draft:
 *
 *   1. MONDAY FIRST. native/src/screens/Holidays.jsx computes its lead gap as
 *      (getDay() + 6) % 7 and labels its columns [1..6, 0]; the website's
 *      renderHolidays does the same. A Sunday-first sheet puts every date in
 *      the year under the wrong column heading, which is the single thing a
 *      planner exists to get right.
 *   2. A CLOSED DAY IS A WASH, NOT A BLOCK. .hp-d.is-shut is a 14% danger
 *      fill behind a 30% border with #8E4126 text. Filling the cell solid
 *      instead — which the first draft did, borrowing the LEGEND swatch's
 *      colour rather than the cell's — turns a third of the year into red
 *      bricks and reads as a warning rather than a holiday.
 *   3. WEEKENDS ARE MUTED. .hp-d.is-wknd. Without it the eye has nothing to
 *      anchor on and every month is an undifferentiated block of numerals.
 *
 * The colours are the website's own tokens, by value, light mode. Print has
 * no dark mode, so the dark overrides are not consulted.
 *
 * The typefaces are embedded from native/assets/fonts as full TTFs, not the
 * web subsets. The same reason the adhkār review sheet does it: Google's
 * Arabic subset has holes, and a PDF handed to a committee must render the
 * same on their machine as on this one. Amiri sits behind the Latin faces in
 * the stack so U+FDFA (ﷺ) in the Mawlid entry resolves to a glyph instead of
 * a tofu box.
 */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);          // ESM ignores NODE_PATH
const { chromium } = require("playwright");

const ROOT = path.resolve(import.meta.dirname, "..");
const OUT = path.join(ROOT, "planner");
const { MAD_YEAR, MAD_CLOSURES, MAD_EVENTS } = await import(path.join(ROOT, "native/src/madrasah-data.js"));

/* --- the year, named the way the masjid names it ------------------------- */
const parse = v => { const a = v.split("-"); return new Date(+a[0], +a[1] - 1, +a[2]); };
const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const FROM = parse(MAD_YEAR.from), TO = parse(MAD_YEAR.to);
const YEAR = `${FROM.getFullYear()}/${String(TO.getFullYear()).slice(2)}`;
const SLUG = `taiyabah-holiday-planner-${FROM.getFullYear()}-${String(TO.getFullYear()).slice(2)}`;

const MONTHS = ["January", "February", "March", "April", "May", "June",
                "July", "August", "September", "October", "November", "December"];
const DOW = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/* Every date carries its year. mawlid is dated before the madrasah year opens,
   and a bare "25 Aug" in a list where everything else is in-year reads as the
   August at the far end of the sheet. */
const fmt = v => { const d = parse(v); return `${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)} ${d.getFullYear()}`; };
const fmtLong = v => { const d = parse(v); return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`; };
/* "26–30 Oct 2026", not "26 Oct 2026 — 30 October 2026". The long form is
   what starved the name column in the side panel: the date is nowrap, so
   every millimetre it takes comes off the name, and "Half Term Break" came
   out over three lines. Each date still carries a year wherever the span
   crosses one, so nothing is left to infer. */
const span = c => {
  const a = parse(c.from), b = parse(c.to);
  const D = d => d.getDate(), M = d => MONTHS[d.getMonth()].slice(0, 3), Y = d => d.getFullYear();
  if (c.from === c.to) return `${D(a)} ${M(a)} ${Y(a)}`;
  if (Y(a) !== Y(b)) return `${D(a)} ${M(a)} ${Y(a)} – ${D(b)} ${M(b)} ${Y(b)}`;
  if (a.getMonth() === b.getMonth()) return `${D(a)}–${D(b)} ${M(b)} ${Y(b)}`;
  return `${D(a)} ${M(a)} – ${D(b)} ${M(b)} ${Y(b)}`;
};
const nights = c => Math.round((parse(c.to) - parse(c.from)) / 86400000) + 1;

/* One lookup per day, as dayMaps() does on the screen. */
const shut = {}, evt = {};
for (const c of MAD_CLOSURES) {
  const d = parse(c.from), end = parse(c.to);
  while (d <= end) { shut[iso(d)] = c; d.setDate(d.getDate() + 1); }
}
for (const e of MAD_EVENTS) (evt[e.on] = evt[e.on] || []).push(e);

const months = [];
for (let i = 0; i < 12; i++) months.push(new Date(FROM.getFullYear(), FROM.getMonth() + i, 1));

/* --- embedded artwork and type ------------------------------------------- */
const b64 = p => fs.readFileSync(path.join(ROOT, p)).toString("base64");
const FACE = (fam, file, w = 400) =>
  `@font-face{font-family:"${fam}";font-weight:${w};font-style:normal;` +
  `src:url(data:font/ttf;base64,${b64("native/assets/fonts/" + file)}) format("truetype")}`;
const FONTS = FACE("Fraunces", "Fraunces.ttf")
            + FACE("Hanken", "HankenGrotesk.ttf")
            + FACE("Hanken", "HankenGroteskSemiBold.ttf", 600)
            + FACE("Hanken", "HankenGroteskBold.ttf", 700)
            + FACE("Amiri", "Amiri.ttf");
const LOGO = `data:image/svg+xml;base64,${b64("logo.svg")}`;

/* index.html :root, light mode, by value. */
const TOKENS = `
  --plum:#3C0B2A; --plum600:#772157; --gold:#C6A24C; --goldink:#7A5D14;
  --cream:#F3EFE3; --paper:#F5F1E8; --card:#FCFAF3;
  --ink:#261B22; --muted:#7C6E77; --line:#E4DECF;
  --shut-fill:rgba(180,83,47,.14); --shut-line:rgba(180,83,47,.3); --shut-ink:#8E4126;`;

const CHARITY = "Bolton Central Islamic Society · Registered charity 1041569";
const MOON = "Islamic dates are calculated and may fall a day either side — the masjid announces each confirmed date beforehand.";
const TEACHES = `The madrasah teaches 180 days this year — 36 weeks, Monday to Friday, 5pm to 7pm. Hifz students also attend on Saturday mornings.`;
const ISSUED = new Date().toISOString().slice(0, 10);

/* --- one month ------------------------------------------------------------ */
function grid(m) {
  const y = m.getFullYear(), mo = m.getMonth();
  const lead = (new Date(y, mo, 1).getDay() + 6) % 7;      // Monday first, as the screen is
  const days = new Date(y, mo + 1, 0).getDate();
  let cells = "";
  for (let i = 0; i < lead; i++) cells += `<i class="pad"></i>`;
  for (let d = 1; d <= days; d++) {
    const k = iso(new Date(y, mo, d));
    const dw = new Date(y, mo, d).getDay();
    const cl = [shut[k] && "shut", evt[k] && "ev", (dw === 0 || dw === 6) && "wknd"]
      .filter(Boolean).join(" ");
    cells += `<i class="${cl}">${d}</i>`;
  }
  return `<section class="mon"><h4>${MONTHS[mo]} <span>${y}</span></h4>
    <div class="dow">${["M", "T", "W", "T", "F", "S", "S"].map(x => `<b>${x}</b>`).join("")}</div>
    <div class="cells">${cells}</div></section>`;
}

/* --- the two lists, shared by both sheets --------------------------------- */
/* Two lines, four cells: the name against its dates, the note against its
   length. Three columns on one baseline is what the SCREEN does, and it works
   there because a phone is 390px of width for one list; on a 70mm panel
   beside twelve month grids it does not. */
const row = (name, when, note, len) => `
  <div class="r">
    <span class="nm"><bdi>${name}</bdi></span>
    <span class="wh">${when}</span>
    <span class="sub">${note ? `<bdi>${note}</bdi>` : ""}</span>
    <span class="ln">${len}</span>
  </div>`;

const closureRows = () => MAD_CLOSURES.map(c =>
  row(c.name, span(c), c.note, `${nights(c)} ${nights(c) === 1 ? "day" : "days"}`)).join("");

const eventRows = () => MAD_EVENTS.map(e =>
  row(e.name, fmt(e.on), e.sub, DOW[parse(e.on).getDay()].slice(0, 3))).join("");

/* --- sheet one: A4 landscape, for a wall ---------------------------------- */
const WALL = `<!doctype html><html lang="en"><meta charset="utf-8"><style>
${FONTS}
:root{${TOKENS}}
@page{size:A4 landscape;margin:0}
*{box-sizing:border-box;margin:0;padding:0}
body{width:297mm;height:210mm;display:flex;flex-direction:column;background:var(--card);
     font-family:Hanken,Amiri,sans-serif;color:var(--ink);
     -webkit-print-color-adjust:exact;print-color-adjust:exact}
header{background:var(--plum);color:var(--cream);padding:5mm 10mm;display:flex;
       align-items:center;justify-content:space-between;position:relative;overflow:hidden}
.star{position:absolute;right:16mm;top:-26mm;width:76mm;color:rgba(255,255,255,.055)}
.mark{height:16mm;display:block;position:relative}
.ttl{text-align:right;position:relative}
.ttl h1{font-family:Fraunces,serif;font-size:19pt;font-weight:400;color:var(--cream)}
.ttl p{font-size:8.4pt;color:rgba(243,239,227,.74);margin-top:1.2mm;letter-spacing:.01em}
.rule{height:1.1mm;background:var(--gold);flex:none}
.teaches{padding:2.6mm 10mm;font-size:7.6pt;color:var(--muted);background:var(--paper);
         border-bottom:.25mm solid var(--line);flex:none}
main{flex:1;display:flex;gap:5mm;padding:4.5mm 10mm 0;min-height:0}
.calwrap{flex:1;display:flex;flex-direction:column;min-width:0}
.cal{display:grid;grid-template-columns:repeat(4,1fr);grid-template-rows:repeat(3,auto);
     column-gap:3.4mm;row-gap:4mm;align-content:start}
.mon h4{font-family:Fraunces,serif;font-size:11.5pt;color:var(--plum);margin-bottom:1.4mm}
.mon h4 span{font-family:Hanken;font-size:7.6pt;color:var(--muted);font-weight:400}
.dow,.cells{display:grid;grid-template-columns:repeat(7,1fr);gap:.55mm}
.dow b{font-size:6.6pt;color:var(--muted);text-align:center;font-weight:600;letter-spacing:.04em}
.cells{margin-top:.9mm}
.cells i{font-style:normal;font-size:7.8pt;text-align:center;line-height:5.9mm;height:5.9mm;
         border-radius:1.3mm;color:var(--ink);border:.3mm solid transparent}
.cells i.pad{visibility:hidden}
.cells i.wknd{color:var(--muted)}
.cells i.shut{background:var(--shut-fill);border-color:var(--shut-line);color:var(--shut-ink)}
.cells i.ev{border-color:var(--gold);font-weight:700;color:var(--goldink)}
.cells i.shut.ev{border-color:var(--gold);color:var(--shut-ink)}
aside{width:75mm;flex:none;display:flex;flex-direction:column;gap:2.6mm}
.box{border:.3mm solid var(--line);border-radius:2mm;padding:2.6mm 3.2mm;background:var(--paper)}
.box h5{font-size:6.6pt;letter-spacing:.15em;text-transform:uppercase;color:var(--goldink);
        font-weight:700;margin-bottom:1.6mm}
.r{display:grid;grid-template-columns:1fr auto;column-gap:2.5mm;row-gap:.2mm;
   padding:.85mm 0;border-top:.2mm solid var(--line)}
.r:nth-of-type(2){border-top:0}
.r .nm{font-size:7.1pt;font-weight:600;line-height:1.16}
.r .wh{font-size:6.6pt;color:var(--muted);white-space:nowrap;text-align:right;line-height:1.16}
.r .sub{font-size:6.2pt;color:var(--muted);line-height:1.16}
.r .ln{font-size:6.2pt;color:var(--muted);white-space:nowrap;text-align:right;line-height:1.16}
.key{display:flex;gap:5mm;align-items:center;font-size:6.9pt;color:var(--muted);padding:3mm 0 0 .5mm}
.key i{font-style:normal;display:inline-flex;align-items:center;gap:1.6mm}
.sw{width:3.4mm;height:3.4mm;border-radius:.9mm;display:inline-block;border:.3mm solid var(--line)}
.sw.shut{background:var(--shut-fill);border-color:var(--shut-line)}
.sw.ev{border-color:var(--gold)}
footer{flex:none;margin:0 10mm;padding:2.4mm 0 3.4mm;border-top:.25mm solid var(--line);
       display:flex;justify-content:space-between;gap:6mm;font-size:6.4pt;color:var(--muted)}
</style><body>
  <header>
    <svg class="star" viewBox="0 0 100 100" aria-hidden="true"><polygon fill="currentColor"
      points="50,2 57.3,32.4 83.9,16.1 67.6,42.7 98,50 67.6,57.3 83.9,83.9 57.3,67.6 50,98 42.7,67.6 16.1,83.9 32.4,57.3 2,50 32.4,42.7 16.1,16.1 42.7,32.4"/></svg>
    <img class="mark" src="${LOGO}" alt="Taiyabah Masjid">
    <div class="ttl"><h1>Madrasah Holiday Planner</h1>
      <p>${YEAR} &nbsp;·&nbsp; ${fmtLong(MAD_YEAR.from)} — ${fmtLong(MAD_YEAR.to)}</p></div>
  </header>
  <div class="rule"></div>
  <div class="teaches">${TEACHES}</div>
  <main>
    <div class="calwrap">
      <div class="cal">${months.map(grid).join("")}</div>
      <div class="key">
        <i><span class="sw shut"></span>Madrasah closed</i>
        <i><span class="sw ev"></span>Islamic date</i>
        <i><span class="sw"></span>Open</i>
      </div>
    </div>
    <aside>
      <div class="box"><h5>Madrasah closed</h5>${closureRows()}</div>
      <div class="box"><h5>Islamic dates</h5>${eventRows()}</div>
    </aside>
  </main>
  <footer><span>${CHARITY} &nbsp;·&nbsp; Issued ${ISSUED}</span><span>${MOON}</span></footer>
</body></html>`;

/* --- sheet two: a card for a phone ---------------------------------------- */
const CARD = `<!doctype html><html lang="en"><meta charset="utf-8"><style>
${FONTS}
:root{${TOKENS}}
*{box-sizing:border-box;margin:0;padding:0}
body{width:1080px;background:var(--paper);font-family:Hanken,Amiri,sans-serif;color:var(--ink);
     -webkit-print-color-adjust:exact;print-color-adjust:exact}
header{background:var(--plum);color:var(--cream);padding:54px 56px 46px;position:relative;overflow:hidden}
.star{position:absolute;right:-40px;top:-120px;width:420px;color:rgba(255,255,255,.055)}
.mark{height:112px;display:block;position:relative;margin-bottom:34px}
h1{font-family:Fraunces,serif;font-size:62px;font-weight:400;line-height:1.1;position:relative}
.sub{font-size:25px;color:var(--gold);margin-top:16px;position:relative}
.teaches{font-size:21px;line-height:1.55;color:rgba(243,239,227,.76);margin-top:22px;
         position:relative;max-width:820px}
.rule{height:7px;background:var(--gold)}
main{padding:44px 56px 50px}
h5{font-size:21px;letter-spacing:.17em;text-transform:uppercase;color:var(--goldink);
   font-weight:700;margin:0 0 18px 4px}
.box{background:var(--card);border:1px solid var(--line);border-radius:26px;
     padding:10px 34px;margin-bottom:40px}
.r{display:grid;grid-template-columns:1fr auto;column-gap:26px;row-gap:5px;
   padding:22px 0;border-top:1px solid var(--line)}
.r:first-child{border-top:0}
.r .nm{font-size:29px;font-weight:600;line-height:1.25}
.r .wh{font-size:24px;color:var(--muted);text-align:right;white-space:nowrap;line-height:1.25}
.r .sub{font-size:22px;color:var(--muted);line-height:1.25}
.r .ln{font-size:21px;color:var(--muted);text-align:right;white-space:nowrap;line-height:1.25}
footer{padding:0 56px 56px;font-size:20px;line-height:1.6;color:var(--muted);text-align:center}
footer b{display:block;font-weight:400;margin-top:10px;font-size:19px}
</style><body>
  <header>
    <svg class="star" viewBox="0 0 100 100" aria-hidden="true"><polygon fill="currentColor"
      points="50,2 57.3,32.4 83.9,16.1 67.6,42.7 98,50 67.6,57.3 83.9,83.9 57.3,67.6 50,98 42.7,67.6 16.1,83.9 32.4,57.3 2,50 32.4,42.7 16.1,16.1 42.7,32.4"/></svg>
    <img class="mark" src="${LOGO}" alt="Taiyabah Masjid">
    <h1>Madrasah<br>Holiday Planner</h1>
    <div class="sub">${YEAR} · ${fmtLong(MAD_YEAR.from)} — ${fmtLong(MAD_YEAR.to)}</div>
    <p class="teaches">${TEACHES}</p>
  </header>
  <div class="rule"></div>
  <main>
    <h5>Madrasah closed</h5><div class="box">${closureRows()}</div>
    <h5>Islamic dates</h5><div class="box">${eventRows()}</div>
  </main>
  <footer>${MOON}<b>${CHARITY} · Issued ${ISSUED}</b></footer>
</body></html>`;

/* --- render --------------------------------------------------------------- */
fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();

const wall = await browser.newPage({ viewport: { width: 1123, height: 794 }, deviceScaleFactor: 2 });
await wall.setContent(WALL, { waitUntil: "networkidle" });
/* A4 landscape is a FIXED box, and this sheet is generated from a list that
   the madrasah will add to. The first build of the side panel ran six Islamic
   dates off the bottom of the page: no error, no warning, a PDF that looked
   finished and had lost a third of its content under the footer. Nothing in
   the gate would have caught it, because the gate reads data and not pixels.
   So the page measures itself before it is written. */
const spill = await wall.evaluate(() => {
  const r = (el, name) => ({ name, over: Math.round(el.scrollHeight - el.clientHeight) });
  return [r(document.querySelector("aside"), "the side panel"),
          r(document.querySelector(".calwrap"), "the month grid"),
          { name: "the page", over: Math.round(document.body.scrollHeight - document.body.clientHeight) }]
    .filter(x => x.over > 1);
});
if (spill.length) {
  console.error("\nThe sheet does not fit on one A4 page:\n");
  for (const s of spill) console.error(`  ${s.name} overflows by ${s.over}px`);
  console.error("\n  Nothing has been written. Shorten a name, drop a line, or give the\n" +
                "  panel more width — but do not ship a sheet with content under the\n" +
                "  footer, which is what this check exists to stop.\n");
  await browser.close();
  process.exit(1);
}

await wall.pdf({ path: path.join(OUT, `${SLUG}.pdf`), width: "297mm", height: "210mm",
                 printBackground: true, pageRanges: "1" });
await wall.screenshot({ path: path.join(OUT, `${SLUG}.png`) });

const card = await browser.newPage({ viewport: { width: 1080, height: 1400 }, deviceScaleFactor: 1 });
await card.setContent(CARD, { waitUntil: "networkidle" });
await card.screenshot({ path: path.join(OUT, `${SLUG}-card.png`), fullPage: true });

await browser.close();

/* The sidecar the gate reads. Written here and nowhere else, so a sheet can
   only claim to match data it was actually built from. */
const { fingerprint } = await import("./lib/holiday-fingerprint.mjs");
fs.writeFileSync(path.join(OUT, "planner.json"), JSON.stringify({
  year: YEAR, slug: SLUG, issued: ISSUED,
  built_from: await fingerprint({ MAD_YEAR, MAD_CLOSURES, MAD_EVENTS }),
  files: [`${SLUG}.pdf`, `${SLUG}.png`, `${SLUG}-card.png`],
  note: "Written by scripts/build-holiday-planner.mjs. Do not hand-edit — " +
        "rebuild instead, or scripts/check-holiday-planner.mjs will fail.",
}, null, 1) + "\n");

const kb = f => Math.round(fs.statSync(path.join(OUT, f)).size / 1024);
console.log(`planner/${SLUG}.pdf        ${kb(SLUG + ".pdf")} KB   A4 landscape, one page`);
console.log(`planner/${SLUG}.png        ${kb(SLUG + ".png")} KB   wall sheet, 2x`);
console.log(`planner/${SLUG}-card.png   ${kb(SLUG + "-card.png")} KB   phone card, 1080 wide`);
console.log(`${MAD_CLOSURES.length} closures · ${MAD_EVENTS.length} Islamic dates · issued ${ISSUED}`);
