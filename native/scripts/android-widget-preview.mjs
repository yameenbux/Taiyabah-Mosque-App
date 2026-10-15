/**
 * Taiyabah Masjid — what the Android widget will look like, before it is built.
 * Copyright (c) 2026 Yameen Bux. All rights reserved. See LICENSE.md.
 *
 * There is no Android toolchain here and no emulator, so the widget cannot be
 * drawn by the thing that will actually draw it. This renders the SAME layout
 * XML the app ships, measured and positioned by the same code the build check
 * uses (scripts/lib/android-layout.mjs), filled from the SAME timetable file
 * that gets copied into res/raw. Nothing here is a separate mock-up: change a
 * dp in the layout and this moves.
 *
 * What it is NOT: a render by Android. The typeface differs — a phone draws
 * Roboto and this container has not got it — so letterforms and their exact
 * widths shift a little on a real device. What is decided here, which is what
 * goes where and how big, is accurate.
 *
 *   node scripts/android-widget-preview.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import { parse, place, attr, id as idOf, num, px } from "./lib/android-layout.mjs";

const root = path.resolve(import.meta.dirname, "..");
const target = path.join(root, "targets/android-widget");
const res = path.join(target, "res");
const out = path.join(root, "widget-preview");
fs.mkdirSync(out, { recursive: true });

const DENSITY = 3;                /* xxhdpi, which is most phones in use */
const table = JSON.parse(fs.readFileSync(path.join(root, "targets/widget/timetable.json"), "utf8"));
const days = table.days || {};

/* ---------------------------------------------------------------- content */

const KEYS = ["fajr", "zuhr", "asr", "maghrib", "isha"];
const NAMES = ["Fajr", "Zuhr", "Asr", "Maghrib", "Isha"];
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/* The same shape the provider builds: Friday's Zuhr slot IS Jumuʿah, and both
   sittings show when the masjid holds two. */
const daySlots = (date) => {
  const rec = days[iso(date)];
  if (!rec?.jamaat) return [];
  const slots = [];
  const at = (hhmm) => { const [h, m] = hhmm.split(":").map(Number); const d = new Date(date); d.setHours(h, m, 0, 0); return d; };
  for (let i = 0; i < KEYS.length; i++) {
    if (KEYS[i] === "zuhr" && rec.jummah?.first) {
      const { first, second } = rec.jummah;
      slots.push({ name: second ? "1st Jumuʿah" : "Jumuʿah", at: at(first), hhmm: first });
      if (second) slots.push({ name: "2nd Jumuʿah", at: at(second), hhmm: second });
      continue;
    }
    const hhmm = rec.jamaat[KEYS[i]];
    if (hhmm) slots.push({ name: NAMES[i], at: at(hhmm), hhmm });
  }
  return slots.sort((a, b) => a.at - b.at);
};

const nextFrom = (from) => {
  for (let d = 0; d < 7; d++) {
    const day = new Date(from); day.setDate(day.getDate() + d);
    for (const s of daySlots(day)) if (s.at > from) return s;
  }
  return null;
};

/* Exactly what the provider's pretty() returns, so the preview shows the
   string that will be on the phone and not the one in the JSON. */
const pretty = (hhmm) => {
  const [h, m] = String(hhmm).split(":").map(Number);
  const twelve = h % 12 === 0 ? 12 : h % 12;
  return `${twelve}:${String(m).padStart(2, "0")}${h < 12 ? "am" : "pm"}`;
};

const countdown = (ms) => {
  const t = Math.max(0, Math.round(ms / 1000));
  const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = t % 60;
  return h ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
           : `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
};

/** What the provider would set on each id at a given moment. */
const contentAt = (now) => {
  const next = nextFrom(now);
  const today = daySlots(now);
  const rec = days[iso(now)] || {};
  const map = { tw_name: next?.name ?? "", tw_time: next ? pretty(next.hhmm) : "",
                tw_until: next ? countdown(next.at - now) : "",
                tw_hijri: String(rec.hijri || "").replace(" AH", "").replace(/\s+\d{3,4}$/, "") };
  for (let i = 0; i < 6; i++) {
    map[`tw_r${i}_name`] = today[i]?.name ?? "";
    map[`tw_r${i}_time`] = today[i] ? pretty(today[i].hhmm) : "";
  }
  return { map, hidden: new Set(Array.from({ length: 6 }, (_, i) => i).filter((i) => !today[i])
                                   .flatMap((i) => [`tw_r${i}_name`, `tw_r${i}_time`])) };
};

/* ---------------------------------------------------------------- drawing */

/** #AARRGGBB or #RRGGBB as CSS. */
const colour = (v) => {
  if (!v?.startsWith("#")) return "transparent";
  const h = v.slice(1);
  if (h.length === 8) {
    const a = parseInt(h.slice(0, 2), 16) / 255;
    return `rgba(${parseInt(h.slice(2, 4), 16)},${parseInt(h.slice(4, 6), 16)},${parseInt(h.slice(6, 8), 16)},${a.toFixed(3)})`;
  }
  return v;
};

/* The shape drawables, read rather than retyped, so the preview shows the
   colours that ship. */
const drawable = (name) => {
  const file = path.join(res, "drawable", `${name}.xml`);
  if (!fs.existsSync(file)) return null;
  const xml = fs.readFileSync(file, "utf8");
  const grad = (chunk) => {
    const g = chunk.match(/<gradient([^>]*)\/>/);
    if (!g) return null;
    const a = Object.fromEntries([...g[1].matchAll(/android:(\w+)="([^"]*)"/g)].map((m) => [m[1], m[2]]));
    const stops = [a.startColor, a.centerColor, a.endColor].filter(Boolean).map(colour).join(", ");
    if (a.type === "radial") {
      return `radial-gradient(circle ${parseFloat(a.gradientRadius)}px at ${(+a.centerX) * 100}% ${(+a.centerY) * 100}%, ${stops})`;
    }
    /* Android's angle is anticlockwise from "pointing right"; CSS measures
       clockwise from "pointing up". */
    const deg = (90 - Number(a.angle || 0) + 360) % 360;
    return `linear-gradient(${deg}deg, ${stops})`;
  };
  const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map((m) => m[1]);
  const layers = (items.length ? items : [xml]).map((chunk) => {
    const solid = chunk.match(/<solid android:color="([^"]*)"/);
    return grad(chunk) || (solid ? `linear-gradient(${colour(solid[1])}, ${colour(solid[1])})` : null);
  }).filter(Boolean).reverse();           /* CSS paints the first layer on top */
  const radius = xml.match(/<corners android:radius="([^"]*)"/);
  return { background: layers.join(", "), radius: radius ? parseFloat(radius[1]) : 0 };
};

const dataUri = (file) => `data:image/png;base64,${fs.readFileSync(file).toString("base64")}`;
const images = {
  taiyabah_girih: dataUri(path.join(res, "drawable-nodpi/taiyabah_girih.png")),
  taiyabah_wordmark: dataUri(path.join(res, "drawable-nodpi/taiyabah_wordmark.png")),
};

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");

/** One widget, laid out and drawn into absolutely positioned divs. */
const render = (layoutName, w, h, now) => {
  const tree = parse(fs.readFileSync(path.join(res, "layout", `${layoutName}.xml`), "utf8"));
  const { map, hidden } = contentAt(now);
  const boxes = place(tree, w, h, (el) => map[idOf(el)] ?? attr(el, "text") ?? "");
  const html = [];
  for (const { el, x, y, w: bw, h: bh } of boxes) {
    const name = idOf(el);
    if (hidden.has(name)) continue;
    const base = `position:absolute;left:${x}px;top:${y}px;width:${bw}px;height:${bh}px;`;
    const bg = (attr(el, "background") || "").replace("@drawable/", "");
    const shape = bg && drawable(bg);
    const alpha = attr(el, "alpha") ? `opacity:${attr(el, "alpha")};` : "";

    if (el.tag === "ImageView") {
      const src = (attr(el, "src") || "").replace("@drawable/", "");
      const fit = (attr(el, "scaleType") || "fitCenter").toLowerCase();
      const pos = fit === "fitend" ? "right center" : fit === "fitstart" ? "left center" : "center";
      html.push(`<div style="${base}${alpha}background-image:url(${images[src]});background-size:contain;background-repeat:no-repeat;background-position:${pos}"></div>`);
      continue;
    }
    if (shape) {
      html.push(`<div style="${base}${alpha}background:${shape.background};border-radius:${shape.radius}px"></div>`);
      continue;
    }
    const text = map[name] ?? attr(el, "text");
    if (text != null && text !== "") {
      const sp = num(el, "textSize", 14);
      const caps = attr(el, "textAllCaps") === "true";
      const grav = attr(el, "gravity") || "";
      html.push(`<div style="${base}` +
        `color:${colour(attr(el, "textColor"))};font-size:${sp}px;line-height:${bh}px;` +
        `font-weight:${attr(el, "textStyle") === "bold" ? 700 : 400};` +
        `font-family:${attr(el, "fontFamily") === "serif" ? "'Noto Serif',Georgia,serif" : "'Roboto','Helvetica Neue',Arial,sans-serif"};` +
        `letter-spacing:${num(el, "letterSpacing") * sp}px;` +
        `${caps ? "text-transform:uppercase;" : ""}` +
        `text-align:${grav.includes("end") ? "right" : "left"};` +
        `white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(caps ? String(text).toUpperCase() : text)}</div>`);
    }
  }
  return `<div style="position:relative;width:${w}px;height:${h}px;overflow:hidden;border-radius:22px">${html.join("")}</div>`;
};

/* ------------------------------------------------------------------ pages */

const info = fs.readFileSync(path.join(res, "xml", "taiyabah_next_jamaah_info.xml"), "utf8");
const dim = (n) => px((info.match(new RegExp(`android:${n}="([^"]+)"`)) || [])[1]);

/* A Friday, so both Jumuʿah sittings show, at a time when the countdown is
   neither trivially short nor a flat number of hours. */
const friday = (() => {
  const d = new Date();
  while (d.getDay() !== 5) d.setDate(d.getDate() + 1);
  d.setHours(11, 23, 41, 0);
  return d;
})();

const SCENES = [
  ["wide-4x3",   "taiyabah_widget_wide",  330, dim("minHeight"),      "four cells by three — how it lands on the home screen"],
  ["wide-floor", "taiyabah_widget_wide",  dim("minWidth"), 150,       "at the narrowest width that still gets the wide layout"],
  ["small-2x2",  "taiyabah_widget_small", 155, 155,                   "two cells by two"],
  ["small-floor","taiyabah_widget_small", dim("minResizeWidth"), dim("minResizeHeight"), "squashed as small as a launcher allows"],
];

const page = (body) => `<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&family=Noto+Serif:wght@400&display=swap" rel="stylesheet">
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{background:#0b0b10;font-family:'Roboto',Arial,sans-serif}
  .wall{background:linear-gradient(170deg,#1b1026,#0e1320 60%,#141019);padding:28px}
  .cap{color:#7d7f8c;font-size:11px;letter-spacing:.09em;text-transform:uppercase;margin:14px 0 7px}
  .row{display:flex;gap:26px;align-items:flex-start;flex-wrap:wrap}
  .ic{width:52px;height:52px;border-radius:14px;background:rgba(255,255,255,.09)}
  .grid{display:grid;grid-template-columns:repeat(4,52px);gap:18px;margin-top:20px}
</style></head><body>${body}</body></html>`;

const browser = await chromium.launch();
const p = await browser.newPage({ deviceScaleFactor: DENSITY });

for (const [tag, layout, w, h] of SCENES) {
  await p.setViewportSize({ width: Math.ceil(w), height: Math.ceil(h) });
  await p.setContent(page(render(layout, w, h, friday)));
  await p.waitForLoadState("networkidle").catch(() => {});
  await p.screenshot({ path: path.join(out, `android-${tag}.png`) });
}

/* The same two widgets where they will actually be seen: on a home screen,
   next to app icons, at the size the launcher gives them. */
const wideW = 330, wideH = dim("minHeight");
await p.setViewportSize({ width: 390, height: 720 });
await p.setContent(page(`<div class="wall" style="min-height:720px">
  <div style="color:#fff;font-size:13px;opacity:.5;margin-bottom:18px">Friday &middot; ${friday.getHours()}:${String(friday.getMinutes()).padStart(2, "0")}</div>
  ${render("taiyabah_widget_wide", wideW, wideH, friday)}
  <div class="grid">${"<div class=ic></div>".repeat(8)}</div>
  <div style="margin-top:22px">${render("taiyabah_widget_small", 155, 155, friday)}</div>
</div>`));
await p.waitForLoadState("networkidle").catch(() => {});
await p.screenshot({ path: path.join(out, "android-home-screen.png") });

/* A contact sheet, every size side by side with what it is. */
await p.setViewportSize({ width: 980, height: 620 });
await p.setContent(page(`<div style="padding:30px">
  <div style="color:#e8e4da;font-size:17px;margin-bottom:4px">Taiyabah Masjid — Android home-screen widget</div>
  <div style="color:#6f7280;font-size:12px;margin-bottom:22px">rendered from targets/android-widget/res, at ${DENSITY}x, on a Friday at ${friday.getHours()}:${String(friday.getMinutes()).padStart(2, "0")}</div>
  ${SCENES.map(([tag, layout, w, h, why]) =>
    `<div style="display:inline-block;vertical-align:top;margin:0 26px 26px 0">
       <div class="cap">${w}&times;${h}dp</div>
       ${render(layout, w, h, friday)}
       <div style="color:#6f7280;font-size:11px;margin-top:8px;max-width:${Math.max(w, 150)}px">${why}</div>
     </div>`).join("")}
</div>`));
await p.waitForLoadState("networkidle").catch(() => {});
await p.screenshot({ path: path.join(out, "android-all.png"), fullPage: true });

await browser.close();
console.log(`wrote ${SCENES.length + 2} files to widget-preview/`);
for (const [tag] of SCENES) console.log(`  android-${tag}.png`);
console.log("  android-home-screen.png  (in place)");
console.log("  android-all.png  (contact sheet)");
