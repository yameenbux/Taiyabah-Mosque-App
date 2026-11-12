/**
 * Taiyabah Masjid — the A4 poster that tells people the app exists.
 * Copyright (c) 2026 Yameen Bux. All rights reserved. See LICENSE.md.
 *
 *   node scripts/build-app-poster.mjs
 *
 * Writes poster/taiyabah-app-poster.pdf (A4 portrait, print-ready) and a PNG
 * of the same artwork for sharing in a WhatsApp group or a newsletter.
 *
 * WHY IT IS GENERATED RATHER THAN DRAWN. Three things on this poster can go
 * stale without anybody noticing: the two store links, the app's own home
 * screen, and the masjid's details. A poster made once in a design tool drifts
 * from all three the moment any of them changes, and the drift is invisible
 * until somebody scans a dead QR code. Here the links live in one place with a
 * check beside them, the screenshot is a file in the repository, and rebuilding
 * is one command.
 *
 * THE TYPEFACES AND ARTWORK ARE EMBEDDED, not linked. The fonts go in as full
 * TTFs from native/assets/fonts, the logo as the repository's own logo.svg and
 * the screenshot as a PNG — so the PDF renders identically on a machine that
 * has none of them installed, which is every print shop.
 *
 * THE STARS ARE DRAWN, NOT A PICTURE. The eight-pointed girih star behind the
 * hero is the same one on the app's home screen; as SVG it stays sharp at any
 * size a printer asks for, and it costs nothing to move.
 *
 * NOBODY'S FACE IS ON THIS POSTER and none may be added. See CLAUDE.md.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { QR } from "./lib/app-poster-qr.mjs";
import * as C from "./lib/app-poster-content.mjs";
import { fingerprint, wellFormed, PARTS } from "./lib/app-poster-fingerprint.mjs";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "poster");
const SLUG = "taiyabah-app-poster";

/* Where the plum gives way to the cream, in millimetres down a 297mm page.
   It was written out in three places — the hero's height, the starfield's
   viewBox and the clearance guard's millimetre conversion — and moving the
   fold meant remembering all three. The guard quietly measures against the
   wrong scale if you forget the third. */
const HERO_MM = 164;

/* ONE MARGIN FOR THE WHOLE SHEET. It used to be 16mm in the hero and 17mm in
   the lower half, which is the worst kind of wrong: a millimetre is too small
   to read as a decision and too large to be invisible, so the page just looks
   slightly off and nobody can say why. An audit of the rendered boxes found
   five different left edges and five different right ones. */
const MARGIN_MM = 16;
const PAGE_MM = { w: 210, h: 297 };

/* EVERY SIZE IS THE SAME ARTWORK, SCALED — not a separate layout.
 *
 * The design is drawn once at A4 and each larger sheet renders it inside a
 * 210x297mm box scaled by width/210. That is deliberate and it is the whole
 * reason the big sizes can be trusted: an A1 is mathematically the A4 that
 * was checked, four times over, so it cannot reflow, cannot drop a line, and
 * cannot need re-tuning. Laying out each size separately would mean five
 * layouts to keep in step and five chances to let one drift.
 *
 * Type and the logo are vector and scale without limit. Two things do not —
 * the home-screen picture and Google's Play badge are bitmaps, and the badge
 * is the smaller of the two at 646px because that is the only size Google
 * publishes. The report at the end of a build prints the resolution each
 * sheet asks of them, so nobody has to guess whether A0 will hold up.
 */
const SIZES = {
  a4: { w: 210, h: 297, look: "a noticeboard, a door, a handout" },
  a3: { w: 297, h: 420, look: "the main board in the foyer" },
  a2: { w: 420, h: 594, look: "a corridor or an entrance wall" },
  a1: { w: 594, h: 841, look: "a hall, read from a few metres" },
  a0: { w: 841, h: 1189, look: "a large wall, read from across a room" },
};

/* Trim bleed, in mm, when --bleed is passed. Printers trim to within about a
   millimetre, so artwork that stops exactly at the edge can leave a white
   hairline down one side. 3mm is the usual ask. */
const BLEED = (() => {
  const i = process.argv.indexOf("--bleed");
  return i === -1 ? 0 : Number(process.argv[i + 1] ?? 3);
})();

/* --- what the poster says ------------------------------------------------- */

/* The words live in scripts/lib/app-poster-content.mjs so that editing them
   does not mean reading the layout, and so the gate can tell whether the PDF
   on disk was built from them. */
const { KICKER, LEAD_1, LEAD_2, BLURB, PILLS, THINGS,
        SCAN_HEAD, SCAN_SUB, MASJID, CHARITY } = C;
const WAYS = C.WAYS.map(w => ({ ...w, qr: QR[w.key] }));

/* --- embedded artwork and type -------------------------------------------- */

const b64 = p => fs.readFileSync(path.join(ROOT, p)).toString("base64");
const FACE = (fam, file, w = 400) =>
  `@font-face{font-family:"${fam}";font-weight:${w};font-style:normal;` +
  `src:url(data:font/ttf;base64,${b64("native/assets/fonts/" + file)}) format("truetype")}`;

const FONTS = FACE("Fraunces", "Fraunces.ttf")
            + FACE("Hanken", "HankenGrotesk.ttf")
            + FACE("Hanken", "HankenGroteskMedium.ttf", 500)
            + FACE("Hanken", "HankenGroteskSemiBold.ttf", 600)
            + FACE("Hanken", "HankenGroteskBold.ttf", 700)
            + FACE("Amiri", "Amiri.ttf");

const LOGO = `data:image/svg+xml;base64,${b64("logo.svg")}`;
const BADGE = f => `data:${f.endsWith(".svg") ? "image/svg+xml" : "image/png"};base64,${b64(f)}`;
const SHOT = `data:image/png;base64,${b64(C.SHOT)}`;

/* index.html :root, light mode, by value — the same tokens the app ships. */
const TOKENS = `
  --plum:#3C0B2A; --plum800:#4B1136; --plum700:#5E1844; --plum600:#772157;
  --gold:#C6A24C; --goldbright:#DCBB63; --goldink:#7A5D14;
  --cream:#F3EFE3; --paper:#F5F1E8; --card:#FCFAF3;
  --ink:#261B22; --muted:#7C6E77; --line:#E4DECF;`;

/* --- the girih star, the one on the home screen --------------------------- */

/* Eight points, inner radius 0.38 of the outer — the proportion that gives the
   long sharp arms rather than a rosette. Angles start at -90° so a point is
   straight up, which is how it sits on the home screen. */
function star(cx, cy, r, fill, stroke = "none", sw = 0) {
  const pts = [];
  for (let i = 0; i < 16; i++) {
    const rad = i % 2 ? r * 0.38 : r;
    const a = (i * Math.PI) / 8 - Math.PI / 2;
    pts.push(`${(cx + rad * Math.cos(a)).toFixed(2)},${(cy + rad * Math.sin(a)).toFixed(2)}`);
  }
  return `<polygon points="${pts.join(" ")}" fill="${fill}"` +
         (stroke === "none" ? "" : ` stroke="${stroke}" stroke-width="${sw}"`) + `/>`;
}

/* The hero's backdrop. Filled stars in a plum a shade off the ground, plus two
   outlined in gold at a whisper — the same two-weight treatment as the app. */
const STARFIELD = `
<svg viewBox="0 0 ${PAGE_MM.w} ${HERO_MM}" preserveAspectRatio="xMidYMid slice" class="stars">
  ${star(168, 44, 46, "rgba(243,239,227,.045)")}
  ${star(196, 118, 30, "rgba(243,239,227,.032)")}
  ${star(150, 148, 22, "rgba(243,239,227,.028)")}
  ${star(18, 128, 34, "rgba(243,239,227,.022)")}
  ${star(168, 44, 68, "none", "rgba(198,162,76,.16)", 0.5)}
  ${star(196, 118, 46, "none", "rgba(198,162,76,.11)", 0.4)}
</svg>`;

/* --- a QR code as one SVG path -------------------------------------------- */

/* One path, one rect per dark module. A path rather than a thousand <rect>
   elements because the PDF writer keeps it as vector either way, and this is
   a quarter of the file. The viewBox is the module grid itself, so the quiet
   zone is padding on the element and cannot be squeezed out by a layout. */
function qrSvg(code) {
  const n = code.size;
  let d = "";
  code.rows.forEach((row, y) => {
    for (let x = 0; x < n; x++) if (row[x] === "1") d += `M${x} ${y}h1v1h-1z`;
  });
  /* FOUR MODULES OF QUIET ZONE, INSIDE THE VIEWBOX. The spec requires it and
     a reader needs it; it used to be supplied by the card's padding, which
     meant the margin a scanner depends on was a styling decision somebody
     could tighten. Carried in the viewBox it is part of the code. */
  const Q = 4;
  return `<svg viewBox="${-Q} ${-Q} ${n + Q * 2} ${n + Q * 2}" shape-rendering="crispEdges" class="qr">` +
         `<path d="${d}" fill="#3C0B2A"/></svg>`;
}

/* --- the codes must at least be QR codes ---------------------------------- */

/* Cheap, and it runs before the browser starts: a matrix that has lost a
   finder pattern to a bad merge would otherwise be printed as a grey square
   that no camera can read, and nobody would know until the posters were up. */
for (const w of WAYS) {
  const faults = wellFormed(w.qr);
  if (faults.length) {
    console.error(`The ${w.name} QR code is not a well-formed symbol:`);
    for (const f of faults) console.error(`  ${f}`);
    console.error("Regenerate it — see docs/app-poster.md. Nothing was written.");
    process.exit(1);
  }
}

/* --- the page -------------------------------------------------------------- */

const HTML = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<title>Taiyabah Masjid — the app</title><style>
${FONTS}
:root{${TOKENS}}
*{margin:0;padding:0;box-sizing:border-box}
/* No size here on purpose — each sheet is set by the renderer, and a
   size pinned in CSS quietly wins over it and tiles the artwork across
   several A4 pages. An A0 came out as three pages exactly that way. */
@page{margin:0}
html,body{width:${PAGE_MM.w}mm;height:${PAGE_MM.h}mm;overflow:hidden}
.sheet{width:${PAGE_MM.w}mm;height:${PAGE_MM.h}mm;position:relative;overflow:hidden;
       transform-origin:top left}
body{font-family:Hanken,sans-serif;color:var(--ink);background:var(--paper);
     -webkit-font-smoothing:antialiased;text-rendering:geometricPrecision}

/* ---- hero ---- */
.hero{position:relative;height:${HERO_MM}mm;overflow:hidden;color:var(--cream);
      background:linear-gradient(152deg,#4B1136 0%,#3C0B2A 46%,#330922 100%)}
.stars{position:absolute;inset:0;width:100%;height:100%}
.hero>.in{position:relative;height:100%;padding:${MARGIN_MM}mm ${MARGIN_MM}mm 0;display:flex;gap:8mm}
.col{width:100mm;display:flex;flex-direction:column;padding-bottom:13mm}

.brand{display:flex;align-items:center;gap:6mm}
.brand img{width:44mm;display:block}
.brand .rule{width:.3mm;height:12mm;background:rgba(243,239,227,.3)}
.brand .soc{font-size:8.5pt;line-height:1.35;letter-spacing:.13em;font-weight:500;
            text-transform:uppercase;color:rgba(243,239,227,.82)}


.kick{display:flex;align-items:center;gap:3mm;margin-top:8mm;
      font-size:8.5pt;letter-spacing:.18em;text-transform:uppercase;font-weight:700;
      color:var(--goldbright)}
.kick s{flex:none;width:9mm;height:.5mm;background:var(--gold);text-decoration:none}

h1{font-size:27pt;line-height:1.1;font-weight:700;letter-spacing:-.018em;margin-top:4mm}
h1 em{display:block;font-style:normal;color:var(--goldbright)}
.tag{font-family:Fraunces,serif;font-size:11.6pt;line-height:1.32;color:var(--goldbright);
     margin-top:4.2mm;max-width:84mm}
.blurb{font-size:11pt;line-height:1.45;color:rgba(243,239,227,.84);margin-top:6mm}

.pills{display:flex;gap:2.4mm;margin-top:6mm}
.pills b{font-size:8.5pt;font-weight:700;letter-spacing:.11em;text-transform:uppercase;
         color:var(--goldbright);border:.28mm solid rgba(220,187,99,.55);
         border-radius:9mm;padding:1.9mm 4.2mm;background:rgba(220,187,99,.09)}

ul{list-style:none;margin-top:auto;padding-top:4.5mm;border-top:.25mm solid rgba(243,239,227,.13);display:flex;flex-direction:column;gap:4mm}
li{display:flex;align-items:baseline;gap:3.6mm;font-size:11pt;line-height:1.28;
   color:rgba(243,239,227,.94)}
li s{flex:none;width:2.6mm;height:2.6mm;background:var(--gold);text-decoration:none;
     transform:rotate(45deg);border-radius:.25mm;position:relative;top:-.2mm}

/* ---- the phone ---- */
/* The device runs off the bottom of the hero and the hero crops it. That is
   a composition choice, and it also solves a real problem: a phone screen is
   taller than any crop of it, so a screenshot shown whole ends on a half line
   of body text that reads as a mistake. Cut by the layout, it reads as a
   screen that carries on — which is what it is. 32mm down puts the cut just
   above that half line; moving either number moves where it lands. */
.phone{flex:1;display:flex;align-items:flex-start;justify-content:center;padding-top:29.5mm}
.dev{width:70mm;flex:none;padding:1.8mm;border-radius:9.2mm;position:relative;
     background:linear-gradient(160deg,#6B5230 0%,#2A1018 34%,#1A0810 70%,#54401F 100%);
     box-shadow:0 2.4mm 7mm rgba(0,0,0,.42)}
.dev img{display:block;width:100%;border-radius:7.6mm}
.dev:after{content:"";position:absolute;inset:.55mm;border-radius:8.7mm;
           border:.22mm solid rgba(220,187,99,.34);pointer-events:none}

/* ---- the fold ---- */
.fold{height:${PAGE_MM.h - HERO_MM}mm;background:var(--paper);padding:10mm ${MARGIN_MM}mm 0;position:relative}
.fold:before{content:"";position:absolute;left:0;right:0;top:0;height:.7mm;
             background:linear-gradient(90deg,var(--gold),rgba(198,162,76,.18))}
.scan{text-align:center}
.scan b{display:block;font-family:Fraunces,serif;font-weight:400;font-size:20pt;
        color:var(--plum);letter-spacing:-.005em}
.scan i{display:block;font-style:normal;font-size:8.5pt;letter-spacing:.15em;
        text-transform:uppercase;color:var(--goldink);font-weight:600;margin-top:2.4mm}

/* NO CARD. There was a bordered, shaded card behind each code, and it was
   drawing an edge at 32mm and another at 47mm on a page whose margin is
   16mm — an audit of the rendered boxes found five different left edges. The
   card was also much wider than its own contents: 67.5mm of card around a
   37mm code, 15mm of air at the sides against 4.4mm at the top. Taking the
   chrome away removes both faults at once and lets the code grow by half. */
.ways{display:flex;gap:10mm;margin:6mm 0 0}
.way{flex:1;text-align:center}
.qr{display:block;width:48mm;height:48mm;margin:0 auto}
/* The badge sits in a fixed-height box so the two cards match to the
   millimetre whatever each company's artwork does inside its own file. */
/* 20mm, not the 15mm the badges LOOK like they need. Google ships its badge
   with the required clear space inside the image, so at a width that makes
   it read the same size as Apple's it is 19.7mm tall — it was overflowing a
   15mm box by 4.7mm and eating into the gap above the footer, while every
   measurement of the block reported the box rather than the artwork. */
.badge{height:20mm;margin-top:5mm;display:flex;align-items:center;justify-content:center}
.badge img{display:block}

footer{position:absolute;left:${MARGIN_MM}mm;right:${MARGIN_MM}mm;bottom:10mm;text-align:center;
        border-top:.25mm solid var(--line);padding-top:4.2mm}
footer b{display:block;font-size:8.5pt;font-weight:600;color:var(--ink);line-height:1.45}
footer span{display:block;font-size:8.5pt;color:var(--muted);margin-top:1.4mm}
</style></head><body>
<div class="sheet">

<section class="hero">
  ${STARFIELD}
  <div class="in">
    <div class="col">
      <div class="brand">
        <img src="${LOGO}" alt="Taiyabah Masjid">
        <div class="rule"></div>
        <div class="soc">Bolton Central<br>Islamic Society</div>
      </div>

      <div class="kick"><s></s>${KICKER}</div>
      <h1>${LEAD_1}<em>${LEAD_2}</em></h1>
      <p class="blurb">${BLURB}</p>
      <div class="pills">${PILLS.map(x => `<b>${x}</b>`).join("")}</div>

      <ul>${THINGS.map(f => `<li><s></s>${f}</li>`).join("")}</ul>
    </div>

    <div class="phone"><div class="dev"><img src="${SHOT}" alt="The app's home screen"></div></div>
  </div>
</section>

<section class="fold">
  <div class="scan">
    <b>${SCAN_HEAD}</b>
    <i>${SCAN_SUB}</i>
  </div>

  <div class="ways">
    ${WAYS.map(w => `<div class="way">
      ${qrSvg(w.qr)}
      <div class="badge"><img src="${BADGE(w.badge)}" alt="${w.name}" style="width:${w.width}mm"></div>
    </div>`).join("")}
  </div>

  <footer>
    <b>${MASJID}</b>
    <span>${CHARITY}</span>
  </footer>
</section>

</div>
</body></html>`;

/* --- render ---------------------------------------------------------------- */

fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 794, height: 1123 },   // A4 at 96dpi, exactly
  deviceScaleFactor: 3,                     // 288dpi — readable when shared as a picture
});
await page.setContent(HTML, { waitUntil: "networkidle" });

/* THE PAGE MUST NOT OVERFLOW. A4 is 297mm and nothing warns you when 298mm of
   content is laid on it — the PDF writer simply starts a second page carrying
   the footer, and the first anybody knows is a stack of two-page posters. So
   the page measures itself before anything is written, and says WHICH part
   spilled rather than only that something did. */
/* MEASURE THE LAST BLOCK, NOT JUST THE OVERFLOW. A column with bottom padding
   reports no overflow until its content passes the padding too — so the list
   can sit 0.7mm off the fold, which looks like a mistake and prints like one,
   while scrollHeight says everything is fine. It did exactly that once. */
const CLEAR_MM = 7;
const clearance = await page.evaluate((HERO) => {
  const hero = document.querySelector(".hero").getBoundingClientRect();
  const list = document.querySelector(".hero ul").getBoundingClientRect();
  const perMm = document.querySelector(".hero").clientHeight / HERO;
  return Math.round((hero.bottom - list.bottom) / perMm * 10) / 10;
}, HERO_MM);
if (clearance < CLEAR_MM) {
  console.error(`The feature list ends ${clearance}mm above the fold; it needs ${CLEAR_MM}mm.`);
  console.error("Shorten the copy or shrink the type. Nothing was written.");
  await browser.close();
  process.exit(1);
}

const kickLines = await page.evaluate(() => {
  const el = document.querySelector(".kick");
  const lh = parseFloat(getComputedStyle(el).lineHeight) ||
             parseFloat(getComputedStyle(el).fontSize) * 1.2;
  return Math.round(el.getBoundingClientRect().height / lh);
});
if (kickLines > 1) {
  console.error(`The kicker wraps onto ${kickLines} lines and orphans a word.`);
  console.error("Shorten it, or widen the text column. Nothing was written.");
  await browser.close();
  process.exit(1);
}

const spill = await page.evaluate(() => {
  const over = el => Math.round((el.scrollHeight - el.clientHeight) * 100) / 100;
  const out = [];
  const hero = document.querySelector(".hero .in .col");
  if (hero && hero.scrollHeight > hero.clientHeight + 1)
    out.push({ name: "the hero's text column", over: over(hero) });
  const fold = document.querySelector(".fold");
  if (fold && fold.scrollHeight > fold.clientHeight + 1)
    out.push({ name: "the lower half", over: over(fold) });
  const body = document.body;
  if (body.scrollHeight > body.clientHeight + 1)
    out.push({ name: "the page", over: over(body) });
  return out;
});
if (spill.length) {
  console.error("The poster does not fit on A4:");
  for (const s of spill) console.error(`  ${s.name} overflows by ${s.over}px`);
  console.error("Nothing was written. Shorten the copy or shrink the type.");
  await browser.close();
  process.exit(1);
}

/* Also check the footer has not been pushed off the bottom, which overflow
   alone does not catch when the footer is absolutely positioned. */
const footBottom = await page.evaluate(() => {
  const r = document.querySelector("footer").getBoundingClientRect();
  return { bottom: Math.round(r.bottom), page: Math.round(document.body.clientHeight) };
});
/* A GAP, NOT MERELY AN ABSENCE OF OVERLAP. This used to pass at 0.3mm, which
   is not a gap — it is two blocks touching, and it reads as a mistake. */
const CARD_GAP_MM = 5;
const cardGap = await page.evaluate((HERO) => {
  const perMm = document.querySelector(".hero").clientHeight / HERO;
  const cards = document.querySelector(".ways").getBoundingClientRect();
  const foot = document.querySelector("footer").getBoundingClientRect();
  return Math.round((foot.top - cards.bottom) / perMm * 10) / 10;
}, HERO_MM);
if (cardGap < CARD_GAP_MM) {
  console.error(`Only ${cardGap}mm between the codes and the footer; it needs ${CARD_GAP_MM}mm.`);
  console.error("Shrink the codes or move the fold up. Nothing was written.");
  await browser.close();
  process.exit(1);
}

if (footBottom.bottom > footBottom.page) {
  console.error(`The footer ends ${footBottom.bottom - footBottom.page}px below the page.`);
  await browser.close();
  process.exit(1);
}

/* --- --audit: what the page actually measures ------------------------------ */

/* Eyeballing a render tells you whether something looks wrong. It does not
   tell you that the hero's left margin is 16mm and the footer's is 17mm,
   which is the kind of fault that reads as "slightly off" forever without
   anybody being able to say why. This asks the renderer. */
if (process.argv.includes("--audit")) {
  const geo = await page.evaluate(() => {
    const perMm = document.querySelector(".sheet").getBoundingClientRect().width / 210;
    const mm = v => Math.round(v / perMm * 10) / 10;
    const box = (sel, label) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { label, l: mm(r.left), r: mm(r.right), t: mm(r.top), b: mm(r.bottom), w: mm(r.width), h: mm(r.height) };
    };
    const boxes = [
      box(".hero .in", "hero content box"),
      box(".col", "text column"),
      box(".brand img", "logo"),
      box(".kick", "kicker"),
      box("h1", "headline"),
      box(".blurb", "blurb"),
      box(".pills", "pills"),
      box(".hero ul", "feature list"),
      box(".hero li:last-child", "last bullet"),
      box(".dev", "device"),
      box(".fold", "lower half"),
      box(".scan", "scan heading block"),
      box(".ways", "the cards"),
      box(".way", "one card"),
      box(".way .qr", "one QR code"),
      box(".way .badge", "one badge box"),
      box("footer", "footer"),
    ].filter(Boolean);

    /* every distinct type size on the page, with what uses it */
    const sizes = new Map();
    for (const el of document.querySelectorAll("*")) {
      if (!el.textContent.trim() || el.children.length) continue;
      if (el.closest("head")) continue;          // <title> and <style> are not type
      const fs = Math.round(parseFloat(getComputedStyle(el).fontSize) / perMm * 1000) / 1000;
      const pt = Math.round(fs * 72 / 25.4 * 10) / 10;
      const who = el.className || el.tagName.toLowerCase();
      if (!sizes.has(pt)) sizes.set(pt, new Set());
      sizes.get(pt).add(String(who).split(" ")[0] || el.tagName.toLowerCase());
    }
    return { boxes, sizes: [...sizes].sort((a, b) => b[0] - a[0]).map(([pt, who]) => [pt, [...who].join(", ")]) };
  });

  console.log("\nGEOMETRY (mm)\n");
  console.log("  block                    left   right    top  bottom   width  height");
  for (const b of geo.boxes)
    console.log(`  ${b.label.padEnd(22)} ${String(b.l).padStart(6)}${String(b.r).padStart(8)}` +
                `${String(b.t).padStart(7)}${String(b.b).padStart(8)}${String(b.w).padStart(8)}${String(b.h).padStart(8)}`);

  const lefts = [...new Set(geo.boxes.filter(b => b.l < 105).map(b => b.l))].sort((a, b) => a - b);
  const rights = [...new Set(geo.boxes.filter(b => b.r > 105).map(b => b.r))].sort((a, b) => a - b);
  console.log(`\n  distinct left edges:  ${lefts.join("  ")}`);
  console.log(`  distinct right edges: ${rights.join("  ")}`);

  console.log("\nTYPE SIZES\n");
  for (const [pt, who] of geo.sizes) console.log(`  ${(pt + "pt").padStart(7)}   ${who}`);
  console.log();
}

/* --- one checked page, every size ------------------------------------------ */

function die(...lines) {
  for (const l of lines) console.error(l);
  console.error("Nothing was written.");
  browser.close().finally(() => process.exit(1));
  throw new Error(lines[0]);
}

const PT = 72 / 25.4;                               // points per millimetre
const sheets = [];

for (const [name, size] of Object.entries(SIZES)) {
  const k = size.w / PAGE_MM.w;                     // A4 is 1, A0 is 4.005…
  const pw = size.w + BLEED * 2, ph = size.h + BLEED * 2;

  await page.evaluate(({ k, bleed, W, PH, H }) => {
    const sheet = document.querySelector(".sheet");
    sheet.style.transform = `translate(${bleed}mm, ${bleed}mm) scale(${k})`;
    /* The page behind the artwork, so the bleed is not white. The hero's own
       gradient runs diagonally, so matching it exactly in a 3mm margin that
       gets cut off anyway is not worth the complication — the two flat
       colours either side of the fold are what a trimmer would see. */
    document.body.style.background = bleed
      ? `linear-gradient(#3C0B2A 0, #3C0B2A ${(bleed + H * k) }mm, #F5F1E8 ${(bleed + H * k)}mm, #F5F1E8 100%)`
      : "var(--paper)";
    for (const el of [document.documentElement, document.body]) {
      el.style.width = `${W}mm`;
      el.style.height = `${PH}mm`;
    }
  }, { k, bleed: BLEED, W: pw, PH: ph, H: HERO_MM });

  /* THE SCALE MUST ACTUALLY HAVE TAKEN, AND THE SHEET MUST BE ONE PAGE.
     Both of those failed silently once. An A0 came out as three A4-ish pages
     with the artwork unscaled in the middle of the first, and every other
     check passed, because nothing here was looking at the finished sheet —
     only at the A4 layout it was made from. A poster that is three pages is
     not a poster. */
  const fit = await page.evaluate(({ k }) => {
    const sh = document.querySelector(".sheet").getBoundingClientRect();
    const m = getComputedStyle(document.querySelector(".sheet")).transform;
    return {
      scaled: m === "none" ? 1 : Number(m.slice(7).split(",")[0]),
      wantK: k,
      overW: Math.round(sh.width - document.body.clientWidth),
      overH: Math.round(document.documentElement.scrollHeight - document.body.clientHeight),
    };
  }, { k });
  if (Math.abs(fit.scaled - fit.wantK) > 0.002)
    die(`${name.toUpperCase()}: the sheet is drawn at ${fit.scaled}x, not ${fit.wantK.toFixed(4)}x.`);
  if (fit.overW > 2 || fit.overH > 2)
    die(`${name.toUpperCase()}: the sheet is ${fit.overW}px wider and ${fit.overH}px taller than its page, so it would print across several.`);

  const file = `${SLUG}-${name}${BLEED ? `-bleed${BLEED}` : ""}.pdf`;
  await page.pdf({
    path: path.join(OUT, file),
    width: `${pw}mm`, height: `${ph}mm`, printBackground: true,
    margin: { top: "0", right: "0", bottom: "0", left: "0" },
  });

  /* What each sheet asks of the two bitmaps, and how big the headline lands.
     Stated rather than assumed: "will it look alright at A0" is the question
     everybody asks about a poster and nobody can answer by eye. */
  const shotMm = 70 * k, badgeMm = WAYS[1].width * k;
  sheets.push({
    name: name.toUpperCase(), size: `${size.w}x${size.h}mm`, file,
    shotDpi: Math.round(1080 / (shotMm / 25.4)),
    badgeDpi: Math.round(646 / (badgeMm / 25.4)),
    capMm: +(27 / PT * 0.72 * k).toFixed(1),         // headline cap height
    smallMm: +(8 / PT * 0.72 * k).toFixed(1),        // the smallest type on the page
    look: size.look,
  });
}

/* Back to A4 for the picture, which is what gets shared rather than printed. */
await page.evaluate(() => {
  const sheet = document.querySelector(".sheet");
  sheet.style.transform = "none";
  document.body.style.background = "var(--paper)";
  for (const el of [document.documentElement, document.body]) {
    el.style.width = "210mm"; el.style.height = "297mm";
  }
});
await page.screenshot({ path: path.join(OUT, `${SLUG}.png`) });

/* The plain name stays A4, so anything already pointing at it keeps working. */
fs.copyFileSync(path.join(OUT, `${SLUG}-a4${BLEED ? `-bleed${BLEED}` : ""}.pdf`),
                path.join(OUT, `${SLUG}.pdf`));

await browser.close();

fs.writeFileSync(path.join(OUT, `${SLUG}.json`),
  JSON.stringify({ built: new Date().toISOString().slice(0, 10),
                   bleedMm: BLEED,
                   sizes: sheets.map(s => ({ name: s.name, file: s.file })),
                   urls: Object.fromEntries(WAYS.map(w => [w.key, w.qr.url])),
                   fingerprint: fingerprint() }, null, 1) + "\n");

console.log(`\nposter/ — ${sheets.length} sheets${BLEED ? `, ${BLEED}mm bleed` : ", trimmed exact (pass --bleed 3 for print)"}\n`);
console.log("        sheet          headline   smallest   screen   badge   printed for");
console.log("        ─────────────  ────────   ────────   ──────   ─────   ───────────");
for (const x of sheets) {
  console.log(`  ${x.name.padEnd(4)}  ${x.size.padEnd(13)}  ${(x.capMm + "mm").padEnd(10)} ${(x.smallMm + "mm").padEnd(10)} ` +
              `${(x.shotDpi + "dpi").padEnd(9)}${(x.badgeDpi + "dpi").padEnd(8)}${x.look}`);
}
console.log(`\nposter/${SLUG}.png   the same artwork as a picture, for a group or a newsletter`);
for (const w of WAYS) console.log(`  ${w.name.padEnd(30)} ${w.qr.url}`);
