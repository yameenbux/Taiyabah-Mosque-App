/**
 * Taiyabah Masjid — what a next-jamāʿah Live Activity would look like.
 * Copyright (c) 2026 Yameen Bux. All rights reserved. See LICENSE.md.
 *
 * A design, not an implementation: nothing here ships, and no ActivityKit
 * code exists yet. It draws every state the Dynamic Island actually has, at
 * Apple's real point sizes, so the shape of the thing can be argued with
 * before a line of Swift is written.
 *
 * The states are not a stylistic choice — iOS demands all of them, and it
 * picks which one to show. A design that only considers the pretty expanded
 * one ships three broken states.
 *
 *   node scripts/island-preview.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const root = path.resolve(import.meta.dirname, "..");
const out = path.join(root, "widget-preview");
fs.mkdirSync(out, { recursive: true });

const table = JSON.parse(fs.readFileSync(path.join(root, "targets/widget/timetable.json"), "utf8"));
const wordmark = "data:image/png;base64," +
  fs.readFileSync(path.join(root, "targets/android-widget/res/drawable-nodpi/taiyabah_wordmark.png")).toString("base64");

/* Apple's own measurements for the island on a 14 Pro / 15 / 16, in points. */
const ISLAND = { w: 126, h: 37.33, r: 18.67, minimalW: 36.67, expandedW: 371, expandedR: 44 };

const B = { plum: "#3C0B2A", lift: "#5E1844", gold: "#C6A24C", bright: "#DCBB63", cream: "#F3EFE3" };

/* A real Friday from the real timetable, 23 minutes before the first
   Jumuʿah — inside the window where this would be live at all. */
const scene = (() => {
  const d = new Date();
  while (d.getDay() !== 5) d.setDate(d.getDate() + 1);
  const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const rec = table.days[key];
  const [h, m] = (rec.jummah?.first || rec.jamaat.zuhr).split(":").map(Number);
  return { name: rec.jummah?.first ? "Jumuʿah" : "Zuhr", h, m,
           pretty: `${h % 12 || 12}:${String(m).padStart(2, "0")}${h < 12 ? "am" : "pm"}`,
           adhan: rec.begins.zuhr };
})();

const S = { left: 23, total: 45 };   /* minutes elapsed / window, for the arc */

const css = `
  *{margin:0;padding:0;box-sizing:border-box}
  body{background:#07070a;font-family:-apple-system,'SF Pro Text','Helvetica Neue',Arial,sans-serif;color:#fff}
  .island{background:#000;border-radius:${ISLAND.r}px;display:flex;align-items:center;overflow:hidden}
  .cut{width:84px}                       /* the camera and sensor, untouchable */
  .g{color:${B.bright}}
  .mono{font-variant-numeric:tabular-nums;font-feature-settings:'tnum'}
  .cap{font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:${B.gold};font-weight:700}
  .wall{background:linear-gradient(165deg,#241433,#101624 55%,#171119);border-radius:34px;overflow:hidden}
`;

/* The mark, drawn rather than imported: an eight-pointed khātim, which is
   the geometry the rest of the app's ornament is built from. The full
   calligraphic lockup is three elements tall and illegible at 16 points; a
   five-pointed star would read at that size but belongs to a different
   vocabulary entirely. */
const star = (() => {
  const pts = [];
  for (let i = 0; i < 16; i++) {
    const a = (Math.PI / 8) * i - Math.PI / 2;
    const r = i % 2 ? 5.9 : 10.6;                 /* 0.556 is the {8/3} ratio */
    pts.push(`${(12 + r * Math.cos(a)).toFixed(2)},${(12 + r * Math.sin(a)).toFixed(2)}`);
  }
  return pts.join(" ");
})();

const mark = (size, colour = B.bright, fill = 0.17) => `
  <svg width="${size}" height="${size}" viewBox="0 0 24 24">
    <polygon points="${star}" fill="${colour}" fill-opacity="${fill}"
             stroke="${colour}" stroke-width="1.15" stroke-linejoin="round"/>
  </svg>`;

/* A countdown ring. The arc is the share of the window from adhan to
   jamāʿah that has gone — something a bare number cannot show. */
const ring = (size, frac, stroke = 3) => {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r;
  return `<svg width="${size}" height="${size}" style="transform:rotate(-90deg)">
    <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${B.gold}33" stroke-width="${stroke}"/>
    <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${B.bright}" stroke-width="${stroke}"
            stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - frac)}"/>
  </svg>`;
};

const frac = S.left / S.total;

/* ---- the four states iOS can choose, plus the Lock Screen banner ---- */

const compact = () => `
  <div class="island" style="width:${ISLAND.w + 56}px;height:${ISLAND.h}px;padding:0 11px">
    <div style="display:flex;align-items:center;gap:5px">${mark(18)}</div>
    <div class="cut"></div>
    <div class="mono g" style="font-size:15px;font-weight:600;margin-left:auto">${S.left}m</div>
  </div>`;

const minimal = () => `
  <div class="island" style="width:${ISLAND.minimalW}px;height:${ISLAND.h}px;justify-content:center">
    <div style="position:relative;width:31px;height:31px;display:flex;align-items:center;justify-content:center">
      ${ring(31, frac, 3)}
      <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center">${mark(14, B.bright, 0.5)}</div>
    </div>
  </div>`;

const expanded = () => `
  <div class="island" style="width:${ISLAND.expandedW}px;height:150px;border-radius:${ISLAND.expandedR}px;
       display:block;padding:14px 26px 20px">
    <div style="display:flex;align-items:flex-start">
      <div style="display:flex;align-items:center;gap:8px">
        ${mark(19)}
        <div class="cap" style="font-size:9.5px">Next jamāʿah</div>
      </div>
      <div class="cut" style="width:76px"></div>
      <div style="margin-left:auto;display:flex;align-items:center;gap:9px">
        <div style="text-align:right">
          <div class="mono" style="font-size:17px;font-weight:700;line-height:1.05">${S.left} min</div>
          <div style="font-size:9px;letter-spacing:.1em;color:#8d8795;font-weight:600">TO IQĀMAH</div>
        </div>
        ${ring(34, frac, 3)}
      </div>
    </div>
    <div style="display:flex;align-items:baseline;gap:11px;margin-top:11px">
      <div style="font-family:'Noto Serif',Georgia,serif;font-size:21px;color:${B.cream}">${scene.name}</div>
      <div class="mono" style="font-size:38px;font-weight:700;letter-spacing:-.015em;line-height:1">${scene.pretty}</div>
    </div>
    <div style="height:1px;margin:12px 0 10px;background:linear-gradient(90deg,${B.gold}80,${B.gold}08)"></div>
    <div style="display:flex;align-items:center;padding:0 6px">
      <img src="${wordmark}" style="height:14px;opacity:.6"/>
      <div style="margin-left:auto;font-size:10.5px;color:#8d8795">Adhān was ${scene.adhan}</div>
    </div>
  </div>`;

/* iOS shows this on the Lock Screen and in the banner; it is part of the same
   Live Activity and cannot be skipped. */
const lock = () => `
  <div style="width:360px;border-radius:24px;overflow:hidden;
       background:radial-gradient(circle 300px at 12% 0%, ${B.lift}, ${B.plum} 70%);padding:16px 18px">
    <div style="display:flex;align-items:center">
      <div>
        <div class="cap">Next jamāʿah &middot; Taiyabah Masjid</div>
        <div style="display:flex;align-items:baseline;gap:9px;margin-top:8px">
          <div style="font-family:'Noto Serif',Georgia,serif;font-size:21px;color:${B.cream}">${scene.name}</div>
          <div class="mono" style="font-size:27px;font-weight:700">${scene.pretty}</div>
        </div>
      </div>
      <div style="margin-left:auto;position:relative">
        ${ring(54, frac, 4)}
        <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center">
          <div class="mono" style="font-size:17px;font-weight:700;line-height:1">${S.left}</div>
          <div style="font-size:7px;letter-spacing:.12em;color:${B.gold};font-weight:700">MIN</div>
        </div>
      </div>
    </div>
    <div style="height:1px;margin:14px 0 10px;background:linear-gradient(90deg,${B.gold}8C,${B.gold}0A)"></div>
    <div style="display:flex;align-items:center">
      <img src="${wordmark}" style="height:16px;opacity:.62"/>
      <div style="margin-left:auto;font-size:11px;color:#b9a9b6">Adhān ${scene.adhan}</div>
    </div>
  </div>`;

const browser = await chromium.launch();
const p = await browser.newPage({ deviceScaleFactor: 3 });
const page = (body, w, h) => `<!doctype html><html><head><meta charset="utf-8">
<style>${css}</style></head><body><div style="width:${w}px;height:${h}px;display:flex;align-items:center;justify-content:center">${body}</div></body></html>`;

const shots = [
  ["island-compact", compact(), ISLAND.w + 80, 70],
  ["island-minimal", minimal(), 90, 70],
  ["island-expanded", expanded(), ISLAND.expandedW + 30, 200],
  ["island-lock", lock(), 390, 190],
];
for (const [name, body, w, h] of shots) {
  await p.setViewportSize({ width: Math.ceil(w), height: Math.ceil(h) });
  await p.setContent(page(body, w, h));
  await p.screenshot({ path: path.join(out, `${name}.png`) });
}

/* All of it together, labelled, with the phone top for scale. */
await p.setViewportSize({ width: 1000, height: 760 });
await p.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>${css}
  .lab{font-size:11px;letter-spacing:.09em;text-transform:uppercase;color:#6f7280;margin:0 0 9px}
  .why{font-size:11.5px;color:#8a8d99;margin-top:9px;max-width:330px;line-height:1.45}
  .cell{display:inline-block;vertical-align:top;margin:0 32px 30px 0}
</style></head><body><div style="padding:30px">
  <div style="font-size:17px;color:#e8e4da">Taiyabah Masjid — next jamāʿah in the Dynamic Island</div>
  <div style="font-size:12px;color:#6f7280;margin:5px 0 26px">a design only — no ActivityKit code exists yet. iOS chooses which state to show; all four have to work.</div>

  <div class="cell"><div class="lab">Compact &middot; ${ISLAND.w}&times;${Math.round(ISLAND.h)}pt</div>${compact()}
    <div class="why">What people see almost all of the time. The mark on one side, minutes on the other, the camera between them left alone.</div></div>

  <div class="cell"><div class="lab">Minimal</div>${minimal()}
    <div class="why">When another app shares the island. Everything is gone but the ring, which still says how much of the window is left.</div></div>

  <div class="cell" style="margin-right:0"><div class="lab">Expanded &middot; long press</div>${expanded()}
    <div class="why">Prayer and iqāmah time set large, the ring showing how much of the gap between adhān and jamāʿah has gone, and the wordmark signing it. The camera keeps the gap at the top.</div></div>

  <div class="cell"><div class="lab">Lock Screen &amp; banner</div>${lock()}
    <div class="why">The same activity on a locked phone — the masjid's own ground rather than the island's black, since here it is a card and not a cutout.</div></div>

  <div class="cell" style="margin-left:14px"><div class="lab">In place</div>
    <div class="wall" style="width:300px;height:210px;padding-top:11px;display:flex;flex-direction:column;align-items:center">
      ${compact()}
      <div style="margin-top:30px;font-size:62px;font-weight:300;letter-spacing:-.02em;opacity:.92">11:07</div>
      <div style="font-size:13px;opacity:.55;margin-top:2px">Friday, 16 October</div>
    </div>
    <div class="why">On the phone, at size. It sits where the time already is, so nobody has to go looking for it.</div></div>
</div></body></html>`);
await p.screenshot({ path: path.join(out, "island-all.png"), fullPage: true });
await browser.close();
console.log(`wrote ${shots.length + 1} files to widget-preview/`);
