/**
 * Taiyabah Masjid — what the iOS widget will look like, before it is built.
 * Copyright (c) 2026 Yameen Bux. All rights reserved. See LICENSE.md.
 *
 * There is no Swift toolchain here and no simulator, so the widget cannot be
 * rendered by the thing that will actually draw it. This redraws the same
 * layout in HTML at the exact point sizes WidgetKit uses, from the SAME
 * timetable file the widget ships, so the content, the colours, the hierarchy
 * and the spacing can be looked at and argued with before a build is spent.
 *
 * What it is NOT: a render of SwiftUI. The typeface differs — iOS draws San
 * Francisco and New York, this container has neither — so letterforms and
 * their exact widths will shift a little on a real phone. Everything that is
 * decided here, which is what goes where and how big, is accurate.
 *
 *   node scripts/widget-preview.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const root = path.resolve(import.meta.dirname, "..");
const out = path.join(root, "widget-preview");
fs.mkdirSync(out, { recursive: true });

const table = JSON.parse(fs.readFileSync(path.join(root, "targets/widget/timetable.json"), "utf8"));

const PRAYERS = [["fajr","Fajr"],["zuhr","Zuhr"],["asr","Asr"],["maghrib","Maghrib"],["isha","Isha"]];

const mins = hhmm => { const [h,m] = hhmm.split(":").map(Number); return h*60+m; };
const pretty = hhmm => {
  let [h,m] = hhmm.split(":").map(Number);
  const s = h >= 12 ? "pm" : "am"; h = h % 12 || 12;
  return `${h}:${String(m).padStart(2,"0")}${s}`;
};

/* The same rule the Swift now follows: on a Friday the Zuhr slot is Jumuʿah,
   and a second sitting is its own row. */
function slots(day) {
  const rec = table.days[day];
  const out = [];
  for (const [key, name] of PRAYERS) {
    if (key === "zuhr" && rec.jummah && rec.jummah.first) {
      out.push({ name: "Jumuʿah", at: rec.jummah.first });
      if (rec.jummah.second) out.push({ name: "2nd Jumuʿah", at: rec.jummah.second });
      continue;
    }
    if (rec.jamaat[key]) out.push({ name, at: rec.jamaat[key] });
  }
  return out.sort((a,b) => mins(a.at) - mins(b.at));
}

const card = (day, nowMin) => {
  const list = slots(day);
  const next = list.find(s => mins(s.at) > nowMin) || list[list.length-1];
  return { hijri: table.days[day].hijri || "", list, next };
};

/* WidgetKit's sizes in points on a modern iPhone, drawn at 3x. */
const SIZES = { small: [170,170], medium: [364,170], rect: [172,76], circ: [76,76], inline: [240,26] };

const css = `
  *{margin:0;padding:0;box-sizing:border-box;-webkit-font-smoothing:antialiased}
  body{background:#0b0b0d;font-family:"DejaVu Sans",sans-serif}
  .w{overflow:hidden;position:relative;color:#fff}
  .home,.med{background:linear-gradient(135deg,#5E1844,#3C0B2A)}
  .r{border-radius:22px}
  .eyebrow{font-size:9.5px;font-weight:700;letter-spacing:1.1px;color:#DCBB63}
  .name{font-family:"DejaVu Serif",serif;font-weight:600;color:#F3EFE3}
  .time{font-weight:700;color:#fff;letter-spacing:-0.5px}
  .pill{display:inline-block;font-size:10.5px;font-weight:700;color:#DCBB63;
        padding:2.5px 7px;border:1px solid rgba(198,162,76,.55);border-radius:99px}
  .foot{font-size:8.5px;font-weight:500;color:rgba(243,239,227,.55)}
  .rule{width:1px;background:rgba(198,162,76,.22)}
  .hij2{font-size:9px;font-weight:600;color:rgba(198,162,76,.9);white-space:nowrap}
  .row{display:flex;align-items:baseline;gap:6px;padding:1.5px 0;font-size:11.5px}
  .row .t{margin-left:auto;font-variant-numeric:tabular-nums}
  .row.next{color:#DCBB63;font-weight:700}
  .row.soon{color:rgba(243,239,227,.82);font-weight:500}
  .row.past{color:rgba(243,239,227,.42);font-weight:500}
  .lock{background:#1c1c1e;color:#fff}
  .lock .lab{font-size:10px;font-weight:600;opacity:.7}
`;

const home = (c, w, h) => `
<div class="w home r" style="width:${w}px;height:${h}px;padding:14px;display:flex;flex-direction:column;gap:3px">
  <div class="eyebrow">NEXT JAMĀʿAH</div>
  <div class="name" style="font-size:20px">${c.next.name}</div>
  <div class="time" style="font-size:30px">${pretty(c.next.at)}</div>
  <div><span class="pill">in 38 min</span></div>
  <div style="flex:1"></div>
  <div class="foot">Taiyabah Masjid</div>
</div>`;

const medium = (c, nowMin, w, h) => `
<div class="w med r" style="width:${w}px;height:${h}px;padding:13px;display:flex;gap:12px">
  <div style="flex:1;display:flex;flex-direction:column;gap:3px;min-width:0">
    <div class="eyebrow">NEXT JAMĀʿAH</div>
    <div class="name" style="font-size:18px">${c.next.name}</div>
    <div class="time" style="font-size:26px">${pretty(c.next.at)}</div>
    <div><span class="pill">in 38 min</span></div>
    <div style="flex:1"></div>
    ${c.hijri ? `<div class="hij2">${c.hijri}</div>` : ""}
    <div class="foot">Taiyabah Masjid</div>
  </div>
  <div class="rule"></div>
  <div style="width:142px;display:flex;flex-direction:column">
    ${c.list.map(s => {
      const cls = s.at === c.next.at ? "next" : (mins(s.at) < nowMin ? "past" : "soon");
      return `<div class="row ${cls}"><span>${s.name}</span><span class="t">${pretty(s.at)}</span></div>`;
    }).join("")}
  </div>
</div>`;

const lockRect = c => `
<div class="w lock" style="width:${SIZES.rect[0]}px;height:${SIZES.rect[1]}px;padding:6px 8px;display:flex;flex-direction:column;gap:2px;border-radius:12px">
  <div class="lab">NEXT JAMĀʿAH</div>
  <div style="font-size:15px;font-weight:700">${c.next.name}&nbsp;&nbsp;${pretty(c.next.at)}</div>
  <div style="font-size:11px;opacity:.8">in 38 minutes</div>
</div>`;

const lockCirc = c => `
<div class="w lock" style="width:${SIZES.circ[0]}px;height:${SIZES.circ[1]}px;border-radius:50%;
     display:flex;flex-direction:column;align-items:center;justify-content:center;gap:0">
  <div style="font-size:11px;font-weight:600">${c.next.name.slice(0,4).toUpperCase()}</div>
  <div style="font-size:13px;font-weight:700">${pretty(c.next.at).replace(/(am|pm)/,"")}</div>
</div>`;

const lockInline = c => `
<div class="w lock" style="width:${SIZES.inline[0]}px;height:${SIZES.inline[1]}px;display:flex;align-items:center;background:transparent">
  <div style="font-size:14px">${c.next.name} ${pretty(c.next.at)}</div>
</div>`;

const page = body => `<!doctype html><meta charset="utf-8"><style>${css}</style><body>${body}</body>`;

const browser = await chromium.launch();
const shot = async (html, w, h, file) => {
  const p = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 3 });
  await p.setContent(page(html));
  await p.screenshot({ path: path.join(out, file), omitBackground: false });
  await p.close();
  console.log(`  ${file}  ${w}×${h}pt`);
};

/* A Thursday mid-afternoon (Asr next), and a Friday just before Jumuʿah. */
const THURSDAY = "2026-10-15", FRIDAY = "2026-10-16";
const AFTERNOON = 14 * 60 + 10;      // 14:10 — Zuhr gone, Asr next
const BEFORE_JUMUAH = 12 * 60;       // 12:00 — Jumuʿah next

for (const [day, now, tag] of [[THURSDAY, AFTERNOON, "thu"], [FRIDAY, BEFORE_JUMUAH, "fri"]]) {
  const c = card(day, now);
  console.log(`${tag}: ${day} — next is ${c.next.name} ${c.next.at}`);
  await shot(home(c, ...SIZES.small), ...SIZES.small, `${tag}-small.png`);
  await shot(medium(c, now, ...SIZES.medium), ...SIZES.medium, `${tag}-medium.png`);
  await shot(lockRect(c), ...SIZES.rect, `${tag}-lock-rect.png`);
  await shot(lockCirc(c), ...SIZES.circ, `${tag}-lock-circ.png`);
  await shot(lockInline(c), ...SIZES.inline, `${tag}-lock-inline.png`);
}
await browser.close();
console.log(`\nwritten to ${out}`);

/* ---- one sheet, so the sizes can be judged against each other ---- */
{
  const browser2 = await chromium.launch();
  const thu = card(THURSDAY, AFTERNOON), fri = card(FRIDAY, BEFORE_JUMUAH);
  const label = t => `<div style="font:600 13px 'DejaVu Sans';color:#8a8a90;margin:0 0 7px 2px">${t}</div>`;
  const col = (t, inner) => `<div>${label(t)}${inner}</div>`;
  const body = `
    <div style="padding:26px;display:flex;flex-direction:column;gap:26px">
      <div style="font:700 17px 'DejaVu Sans';color:#e8e8ec">Thursday 15 October — mid-afternoon, Asr next</div>
      <div style="display:flex;gap:22px;align-items:flex-start;flex-wrap:wrap">
        ${col("Small", home(thu, ...SIZES.small))}
        ${col("Medium", medium(thu, AFTERNOON, ...SIZES.medium))}
      </div>
      <div style="display:flex;gap:22px;align-items:flex-start">
        ${col("Lock Screen · rectangular", lockRect(thu))}
        ${col("Circular", lockCirc(thu))}
        ${col("Inline", lockInline(thu))}
      </div>
      <div style="height:1px;background:#2a2a30"></div>
      <div style="font:700 17px 'DejaVu Sans';color:#e8e8ec">Friday 16 October — before Jumuʿah</div>
      <div style="display:flex;gap:22px;align-items:flex-start;flex-wrap:wrap">
        ${col("Small", home(fri, ...SIZES.small))}
        ${col("Medium", medium(fri, BEFORE_JUMUAH, ...SIZES.medium))}
      </div>
    </div>`;
  const p = await browser2.newPage({ viewport: { width: 640, height: 820 }, deviceScaleFactor: 2 });
  await p.setContent(page(body));
  await p.screenshot({ path: path.join(out, "all.png"), fullPage: true });
  await p.close();
  await browser2.close();
  console.log("  all.png  (contact sheet)");
}
