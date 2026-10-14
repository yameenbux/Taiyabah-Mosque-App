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

/* The masjid's own mark. The full lockup — calligraphy over TAIYABAH over
   MASJID — is three elements tall and unreadable below about 90 points, so
   what goes on a widget is the calligraphy alone: مسجد طيبة, which is
   distinctive at any size and is the part people recognise. */
const LOGO = fs.readFileSync(path.join(root, "..", "logo.svg"), "utf8")
  .replace(/viewBox="[^"]*"/, 'viewBox="0 0 780 300"')
  .replace(/width="[^"]*"/, 'width="100%"')
  .replace(/height="[^"]*"/, 'height="100%"');

/* The sixteen-point girih star the app draws behind its heroes, used here as
   a watermark bleeding off a corner — depth without noise. */
const GIRIH = `<svg viewBox="0 0 100 100" width="100%" height="100%"><polygon fill="#C6A24C" points="50,2 57.3,32.4 83.9,16.1 67.6,42.7 98,50 67.6,57.3 83.9,83.9 57.3,67.6 50,98 42.7,67.6 16.1,83.9 32.4,57.3 2,50 32.4,42.7 16.1,16.1 42.7,32.4"/></svg>`;

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
  .w{overflow:hidden;position:relative;color:#fff;border-radius:22px}

  /* THE GROUND. Not a 135-degree band of two plums — that is the look of a
     gradient applied to a rectangle. A light source at the top left, a
     vignette opposite it, and the flat brand plum underneath: the widget
     reads as a printed card catching light rather than a filled div. */
  .ground{position:absolute;inset:0;background:
     radial-gradient(120% 95% at 8% 0%, rgba(150,45,110,.55) 0%, rgba(94,24,68,.22) 42%, rgba(60,11,42,0) 72%),
     radial-gradient(90% 80% at 100% 100%, rgba(18,3,13,.55) 0%, rgba(18,3,13,0) 60%),
     #3C0B2A}
  /* The girih bleeds off the corner. Only an arc of it is ever on the card,
     which is what keeps it furniture rather than decoration. */
  .girih{position:absolute;opacity:.038;pointer-events:none;filter:blur(.3px)}

  .pad{position:relative;height:100%;display:flex;flex-direction:column}

  .eyebrow{font-size:9px;font-weight:700;letter-spacing:1.5px;color:rgba(220,187,99,.75);
           text-transform:uppercase;white-space:nowrap}
  /* A rule that fades at both ends. A hard 1px line stops dead at each end and
     looks drawn; this one is lit. */
  .rule{height:1px;background:linear-gradient(90deg,rgba(198,162,76,.55),rgba(198,162,76,.04))}
  .vrule{width:1px;background:linear-gradient(180deg,rgba(198,162,76,0),rgba(198,162,76,.38) 22%,rgba(198,162,76,.38) 78%,rgba(198,162,76,0))}

  .name{font-family:"DejaVu Serif",serif;font-weight:400;color:#F6F1E6;letter-spacing:.2px}
  .time{font-weight:700;color:#fff;letter-spacing:-1.2px;font-variant-numeric:tabular-nums;
        text-shadow:0 1px 10px rgba(0,0,0,.28)}
  /* No pill. A capsule outline around two words is the first thing that makes
     a widget look like a component library; tracked small caps in the accent
     says the same thing and gets out of the way. */
  .until{font-size:9.5px;font-weight:700;letter-spacing:1.3px;text-transform:uppercase;
         color:#DCBB63}
  .mark{opacity:.62}

  .hij{font-size:8px;font-weight:700;letter-spacing:1.1px;color:rgba(198,162,76,.8);
       text-transform:uppercase;white-space:nowrap}
  .row{display:flex;align-items:baseline;font-size:11px;padding:2.2px 0;position:relative}
  .row .n{font-weight:500}
  .row .t{margin-left:auto;font-variant-numeric:tabular-nums;font-weight:500}
  /* The next prayer is marked, not shouted: a gold dot in the margin and the
     accent colour. Bolding a whole row makes the column look unbalanced. */
  .row.next{color:#DCBB63}
  .row.next .n,.row.next .t{font-weight:700}
  .row.next::before{content:"";position:absolute;left:-9px;top:50%;width:3px;height:3px;
                    border-radius:50%;background:#DCBB63;transform:translateY(-50%)}
  .row.soon{color:rgba(246,241,230,.88)}
  .row.past{color:rgba(246,241,230,.34)}

  .lock{background:#141416;color:#fff;border-radius:13px}
  .lock .lab{font-size:9px;font-weight:700;letter-spacing:1.2px;opacity:.62;text-transform:uppercase}
`;

/* SMALL — a diagonal. The mark signs the top right, the type stacks from the
   bottom left, and the space between them is left alone. Everything centred
   in a box is the default; a composition with a weighted corner is a
   decision. */
const home = (c, w, h) => `
<div class="w" style="width:${w}px;height:${h}px">
  <div class="ground"></div>
  <div class="girih" style="width:${h*1.3}px;height:${h*1.3}px;right:${-h*0.56}px;bottom:${-h*0.52}px;transform:rotate(14deg)">${GIRIH}</div>
  <div class="pad" style="padding:15px 15px 14px">
    <div style="display:flex;align-items:flex-start;gap:8px">
      <div class="eyebrow" style="flex:1;padding-top:1px">NEXT JAMĀʿAH</div>
      <div class="mark" style="width:44px;height:17px;flex:none">${LOGO}</div>
    </div>
    <div class="rule" style="margin:7px 0 0;width:34px"></div>
    <div style="flex:1"></div>
    <div class="name" style="font-size:17px;margin-bottom:-1px">${c.next.name}</div>
    <div class="time" style="font-size:34px;line-height:1.04">${pretty(c.next.at)}</div>
    <div class="until" style="margin-top:5px">in 38 min</div>
  </div>
</div>`;

/* MEDIUM — two columns with the rule carrying the weight between them. The
   left is the answer; the right is the day. */
const medium = (c, nowMin, w, h) => `
<div class="w" style="width:${w}px;height:${h}px">
  <div class="ground"></div>
  <div class="girih" style="width:${h*1.35}px;height:${h*1.35}px;left:${-h*0.52}px;bottom:${-h*0.56}px;transform:rotate(14deg)">${GIRIH}</div>
  <div class="pad" style="padding:15px 16px 14px;flex-direction:row;gap:15px">

    <div style="flex:1;display:flex;flex-direction:column;min-width:0">
      <div class="eyebrow">NEXT JAMĀʿAH</div>
      <div class="rule" style="margin:7px 0 0;width:34px"></div>
      <div style="flex:1"></div>
      <div class="name" style="font-size:16px;margin-bottom:-1px">${c.next.name}</div>
      <div class="time" style="font-size:31px;line-height:1.04">${pretty(c.next.at)}</div>
      <div class="until" style="margin-top:5px">in 38 min</div>
      <div style="flex:1"></div>
      <div class="mark" style="width:62px;height:24px;margin-left:-2px">${LOGO}</div>
    </div>

    <div class="vrule"></div>

    <div style="width:139px;display:flex;flex-direction:column;flex:none">
      ${c.hijri ? `<div class="hij">${c.hijri.replace(/\s*AH$/,"")}</div>
      <div class="rule" style="margin:6px 0 7px"></div>` : ""}
      ${c.list.map(sl => {
        const cls = sl.at === c.next.at ? "next" : (mins(sl.at) < nowMin ? "past" : "soon");
        return `<div class="row ${cls}"><span class="n">${sl.name}</span><span class="t">${pretty(sl.at)}</span></div>`;
      }).join("")}
      <div style="flex:1"></div>
    </div>
  </div>
</div>`;

/* LOCK SCREEN — tinted white by iOS, so colour is not available and only the
   shapes and the hierarchy carry it. */
const lockRect = c => `
<div class="w lock" style="width:${SIZES.rect[0]}px;height:${SIZES.rect[1]}px;padding:8px 10px;display:flex;flex-direction:column;justify-content:center;gap:3px">
  <div class="lab">Next jamāʿah</div>
  <div style="font-size:16px;font-weight:700;letter-spacing:-.3px">${c.next.name} ${pretty(c.next.at)}</div>
  <div style="font-size:10.5px;opacity:.72">in 38 minutes</div>
</div>`;

const lockCirc = c => `
<div class="w lock" style="width:${SIZES.circ[0]}px;height:${SIZES.circ[1]}px;border-radius:50%;
     display:flex;flex-direction:column;align-items:center;justify-content:center">
  <div style="font-size:9.5px;font-weight:700;letter-spacing:.4px;opacity:.75">${c.next.name.toUpperCase()}</div>
  <div style="font-size:13px;font-weight:700;margin-top:-1px">38 min</div>
</div>`;

const lockInline = c => `
<div class="w" style="width:${SIZES.inline[0]}px;height:${SIZES.inline[1]}px;display:flex;align-items:center;background:transparent;border-radius:0">
  <div style="font-size:14px">${c.next.name} ${pretty(c.next.at)} · in 38 min</div>
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

/* ---- the Lock Screen, which is where the design has to give things up ----
 *
 * iOS does not draw an accessory widget the way it is written. It takes the
 * shapes and renders them in a vibrant white tint: the plum goes, the gold
 * goes, the calligraphy would go. Only hierarchy and shape survive, which is
 * why the three accessory families are typography and nothing else.
 *
 * Worth seeing in place rather than as three chips on a dark background,
 * because the question on a Lock Screen is not "is it handsome" — it is
 * "can you read it at arm's length over a photograph of somebody's
 * children".
 */
{
  const b3 = await chromium.launch();
  const c = card(THURSDAY, AFTERNOON);
  const W = 393, H = 852;                     // iPhone 15 points

  const lockScene = (wall, label) => `
  <div style="width:${W}px;height:${H}px;position:relative;overflow:hidden;font-family:'DejaVu Sans',sans-serif;color:#fff">
    <div style="position:absolute;inset:0;background:${wall}"></div>

    <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;padding-top:14px">
      <div style="width:100%;display:flex;justify-content:space-between;padding:0 30px;font-size:13px;font-weight:600;opacity:.95">
        <span>&nbsp;</span><span>▪▪▪ ᯤ ▮</span>
      </div>

      <div style="margin-top:46px;font-size:15px;font-weight:500;opacity:.92;letter-spacing:.2px">
        ${c.next.name} ${pretty(c.next.at)} · in 38 min
      </div>

      <div style="margin-top:-4px;font-size:86px;font-weight:500;letter-spacing:-2px;line-height:1.05;
                  text-shadow:0 2px 24px rgba(0,0,0,.35)">9:41</div>

      <div style="margin-top:14px;display:flex;align-items:center;gap:12px">
        <div style="width:158px;height:72px;display:flex;flex-direction:column;justify-content:center;gap:3px">
          <div style="font-size:9px;font-weight:700;letter-spacing:1.2px;opacity:.6;text-transform:uppercase">Next jamāʿah</div>
          <div style="font-size:16px;font-weight:700;letter-spacing:-.3px">${c.next.name} ${pretty(c.next.at)}</div>
          <div style="font-size:10.5px;opacity:.7">in 38 minutes</div>
        </div>
        <div style="width:72px;height:72px;border-radius:50%;background:rgba(255,255,255,.18);
                    backdrop-filter:blur(8px);display:flex;flex-direction:column;align-items:center;justify-content:center">
          <div style="font-size:9.5px;font-weight:700;letter-spacing:.4px;opacity:.75">ASR</div>
          <div style="font-size:13px;font-weight:700;margin-top:-1px">38 min</div>
        </div>
      </div>

      <div style="margin-top:auto;margin-bottom:34px;display:flex;gap:150px;opacity:.9">
        <div style="width:46px;height:46px;border-radius:50%;background:rgba(255,255,255,.16);
                    display:flex;align-items:center;justify-content:center;font-size:19px">⌁</div>
        <div style="width:46px;height:46px;border-radius:50%;background:rgba(255,255,255,.16);
                    display:flex;align-items:center;justify-content:center;font-size:17px">◉</div>
      </div>
    </div>
    <div style="position:absolute;left:0;right:0;bottom:9px;display:flex;justify-content:center">
      <div style="width:138px;height:5px;border-radius:3px;background:rgba(255,255,255,.75)"></div>
    </div>
    <div style="position:absolute;top:8px;left:50%;transform:translateX(-50%);width:120px;height:32px;
                border-radius:18px;background:#000"></div>
    <div style="position:absolute;top:10px;left:10px;font-size:10px;font-weight:700;color:rgba(255,255,255,.5)">${label}</div>
  </div>`;

  const DARK  = "linear-gradient(170deg,#241a2e 0%,#3a2740 38%,#1a1420 100%)";
  const LIGHT = "linear-gradient(165deg,#cfc3b4 0%,#9d8f88 45%,#6d6560 100%)";

  const p = await b3.newPage({ viewport: { width: W*2 + 54, height: H + 36 }, deviceScaleFactor: 2 });
  await p.setContent(page(`<div style="padding:18px;display:flex;gap:18px;background:#0b0b0d">
     ${lockScene(DARK, "dark wallpaper")}${lockScene(LIGHT, "light wallpaper")}</div>`));
  await p.screenshot({ path: path.join(out, "lock-screen.png") });
  await p.close();
  await b3.close();
  console.log("  lock-screen.png  (in place, both wallpapers)");
}

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
