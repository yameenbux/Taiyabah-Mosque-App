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

/* --- what the poster says ------------------------------------------------- */

/* The words live in scripts/lib/app-poster-content.mjs so that editing them
   does not mean reading the layout, and so the gate can tell whether the PDF
   on disk was built from them. */
const { KICKER, LEAD_1, LEAD_2, TAG, BLURB, PILLS, THINGS,
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
<svg viewBox="0 0 210 184" preserveAspectRatio="xMidYMid slice" class="stars">
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
  return `<svg viewBox="0 0 ${n} ${n}" shape-rendering="crispEdges" class="qr">` +
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
@page{size:A4 portrait;margin:0}
html,body{width:210mm;height:297mm}
body{font-family:Hanken,sans-serif;color:var(--ink);background:var(--paper);
     -webkit-font-smoothing:antialiased;text-rendering:geometricPrecision}

/* ---- hero ---- */
.hero{position:relative;height:184mm;overflow:hidden;color:var(--cream);
      background:linear-gradient(152deg,#4B1136 0%,#3C0B2A 46%,#330922 100%)}
.stars{position:absolute;inset:0;width:100%;height:100%}
.hero>.in{position:relative;height:100%;padding:16mm 16mm 0;display:flex;gap:8mm}
.col{width:96mm;display:flex;flex-direction:column;padding-bottom:13mm}

.brand{display:flex;align-items:center;gap:6mm}
.brand img{width:40mm;display:block}
.brand .rule{width:.3mm;height:12mm;background:rgba(243,239,227,.3)}
.brand .soc{font-size:7.4pt;line-height:1.35;letter-spacing:.13em;font-weight:500;
            text-transform:uppercase;color:rgba(243,239,227,.82)}

.salam{font-family:Amiri,serif;font-size:9.8pt;line-height:1.9;color:rgba(220,187,99,.85);
       direction:rtl;text-align:left;margin:4.6mm 0 .6mm}

.kick{display:flex;align-items:center;gap:3mm;margin-top:5mm;
      font-size:7.6pt;letter-spacing:.2em;text-transform:uppercase;font-weight:700;
      color:var(--goldbright)}
.kick s{flex:none;width:9mm;height:.5mm;background:var(--gold);text-decoration:none}

h1{font-size:22pt;line-height:1.12;font-weight:700;letter-spacing:-.016em;margin-top:3.6mm}
h1 em{display:block;font-style:normal}
.tag{font-family:Fraunces,serif;font-size:11.6pt;line-height:1.32;color:var(--goldbright);
     margin-top:4.2mm;max-width:84mm}
.blurb{font-size:8.2pt;line-height:1.48;color:rgba(243,239,227,.78);max-width:85mm;margin-top:4.6mm}

.pills{display:flex;gap:2.4mm;margin-top:4.6mm;margin-bottom:1.4mm}
.pills b{font-size:7.2pt;font-weight:700;letter-spacing:.11em;text-transform:uppercase;
         color:var(--goldbright);border:.28mm solid rgba(220,187,99,.55);
         border-radius:9mm;padding:1.4mm 3.4mm;background:rgba(220,187,99,.09)}

ul{list-style:none;margin-top:auto;padding-top:4.5mm;border-top:.25mm solid rgba(243,239,227,.13);display:flex;flex-direction:column;gap:2.9mm}
li{display:flex;align-items:baseline;gap:3.2mm;font-size:9pt;line-height:1.3;
   color:rgba(243,239,227,.94)}
li s{flex:none;width:2.3mm;height:2.3mm;background:var(--gold);text-decoration:none;
     transform:rotate(45deg);border-radius:.25mm;position:relative;top:-.2mm}

/* ---- the phone ---- */
/* The device runs off the bottom of the hero and the hero crops it. That is
   a composition choice, and it also solves a real problem: a phone screen is
   taller than any crop of it, so a screenshot shown whole ends on a half line
   of body text that reads as a mistake. Cut by the layout, it reads as a
   screen that carries on — which is what it is. 32mm down puts the cut just
   above that half line; moving either number moves where it lands. */
.phone{flex:1;display:flex;align-items:flex-start;justify-content:center;padding-top:39mm}
.dev{width:68mm;flex:none;padding:1.8mm;border-radius:9.2mm;position:relative;
     background:linear-gradient(160deg,#6B5230 0%,#2A1018 34%,#1A0810 70%,#54401F 100%);
     box-shadow:0 2.4mm 7mm rgba(0,0,0,.42)}
.dev img{display:block;width:100%;border-radius:7.6mm}
.dev:after{content:"";position:absolute;inset:.55mm;border-radius:8.7mm;
           border:.22mm solid rgba(220,187,99,.34);pointer-events:none}

/* ---- the fold ---- */
.fold{height:113mm;background:var(--paper);padding:9.5mm 17mm 0;position:relative}
.fold:before{content:"";position:absolute;left:0;right:0;top:0;height:.7mm;
             background:linear-gradient(90deg,var(--gold),rgba(198,162,76,.18))}
.scan{text-align:center}
.scan b{display:block;font-family:Fraunces,serif;font-weight:400;font-size:18pt;
        color:var(--plum);letter-spacing:-.005em}
.scan i{display:block;font-style:normal;font-size:8pt;letter-spacing:.16em;
        text-transform:uppercase;color:var(--goldink);font-weight:600;margin-top:2.4mm}

.ways{display:flex;gap:11mm;margin:5mm auto 0;max-width:146mm}
.way{flex:1;background:var(--card);border:.25mm solid var(--line);border-radius:4mm;
     padding:4.4mm 5mm 4mm;text-align:center;box-shadow:0 .6mm 2mm rgba(60,11,42,.06)}
.qr{display:block;width:37mm;height:37mm;margin:0 auto}
/* The badge sits in a fixed-height box so the two cards match to the
   millimetre whatever each company's artwork does inside its own file. */
.badge{height:12mm;margin-top:4mm;display:flex;align-items:center;justify-content:center}
.badge img{display:block}

footer{position:absolute;left:17mm;right:17mm;bottom:9mm;text-align:center;
        border-top:.25mm solid var(--line);padding-top:4.2mm}
footer b{display:block;font-size:8pt;font-weight:600;color:var(--ink);line-height:1.45}
footer span{display:block;font-size:7.2pt;color:var(--muted);margin-top:1.4mm}
</style></head><body>

<section class="hero">
  ${STARFIELD}
  <div class="in">
    <div class="col">
      <div class="brand">
        <img src="${LOGO}" alt="Taiyabah Masjid">
        <div class="rule"></div>
        <div class="soc">Bolton Central<br>Islamic Society</div>
      </div>

      <p class="salam">السَّلَامُ عَلَيْكُمْ وَرَحْمَةُ اللَّهِ وَبَرَكَاتُهُ</p>

      <div class="kick"><s></s>${KICKER}</div>
      <h1>${LEAD_1}<em>${LEAD_2}</em></h1>
      <p class="tag">${TAG.replace(". ", ".<br>")}</p>
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
const clearance = await page.evaluate(() => {
  const hero = document.querySelector(".hero").getBoundingClientRect();
  const list = document.querySelector(".hero ul").getBoundingClientRect();
  const perMm = document.querySelector(".hero").clientHeight / 184;
  return Math.round((hero.bottom - list.bottom) / perMm * 10) / 10;
});
if (clearance < CLEAR_MM) {
  console.error(`The feature list ends ${clearance}mm above the fold; it needs ${CLEAR_MM}mm.`);
  console.error("Shorten the copy or shrink the type. Nothing was written.");
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
const clash = await page.evaluate(() => {
  const cards = document.querySelector(".ways").getBoundingClientRect();
  const foot = document.querySelector("footer").getBoundingClientRect();
  return Math.round(cards.bottom - foot.top);
});
if (clash > 0) {
  console.error(`The QR cards run ${clash}px into the footer.`);
  console.error("They do not overflow — the footer is positioned, so it would simply");
  console.error("print on top of them. Nothing was written.");
  await browser.close();
  process.exit(1);
}

if (footBottom.bottom > footBottom.page) {
  console.error(`The footer ends ${footBottom.bottom - footBottom.page}px below the page.`);
  await browser.close();
  process.exit(1);
}

await page.pdf({
  path: path.join(OUT, `${SLUG}.pdf`),
  width: "210mm", height: "297mm", printBackground: true,
  margin: { top: "0", right: "0", bottom: "0", left: "0" },
});

await page.screenshot({ path: path.join(OUT, `${SLUG}.png`) });
await browser.close();

fs.writeFileSync(path.join(OUT, `${SLUG}.json`),
  JSON.stringify({ built: new Date().toISOString().slice(0, 10),
                   urls: Object.fromEntries(WAYS.map(w => [w.key, w.qr.url])),
                   fingerprint: fingerprint() }, null, 1) + "\n");

console.log(`poster/${SLUG}.pdf   A4 portrait, print-ready`);
console.log(`poster/${SLUG}.png   the same artwork, for a group or a newsletter`);
for (const w of WAYS) console.log(`  ${w.name.padEnd(30)} ${w.qr.url}`);
