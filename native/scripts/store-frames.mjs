/**
 * App Store marketing screenshots: a real screen, framed, with a headline.
 *
 * NOT a raw capture. App Store Connect takes a bare screenshot happily, but a
 * bare screenshot sells nothing — nobody browsing the store can tell what a
 * prayer time app does from a picture of one. These are the listing images:
 * the app's own screen inside a device frame, on the app's own plum, with a
 * line of copy above it saying why the screen matters.
 *
 * WHAT GOES INSIDE THE FRAME IS REAL. The inner image is a genuine screenshot
 * taken on a simulator by store-shots.mjs — not a mockup, not a redraw. Apple
 * requires screenshots to depict the actual app, and a frame around a real
 * screen is marketing; a frame around an invention is a misrepresentation.
 *
 * WHY THE HEADLINES ARE SHAPED THE WAY THEY ARE. Each is two lines: a claim,
 * then the thing it is not. "Prayer times from the masjid. / Not from an
 * algorithm." That shape works because the second line names the alternative
 * the reader already has, which is what makes the first line mean something.
 * Every claim is one the app can keep — the times really are the masjid's own
 * timetable, it really does work with no signal, the nisab really is computed
 * from both metals.
 *
 * Each panel names the screenshot it frames, and they are deliberately not all
 * the same one: a headline promising the mushaf over a picture of the home
 * screen is a misrepresentation, which Apple cares about and which is in any
 * case simply untrue.
 *
 * SIZE. 1206x2622, which is what App Store Connect's "iPhone with Dynamic
 * Island (medium display)" tab accepts, and 2064x2752 for the 13" iPad tab.
 * Rendered by the Chromium already on the machine, at half size with a device
 * scale factor of two.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const here = import.meta.dirname;
const native = path.resolve(here, "..");
const repo = path.resolve(native, "..");
const SHOTS = process.env.SHOTS_DIR || path.join(native, "store-shots");
const OUT = process.env.FRAMES_DIR || path.join(repo, "docs", "store-assets", "frames");
/* Resolved rather than hardcoded: this runs both in a Linux container with
 * Playwright's Chromium and on a macOS runner with Google Chrome, and a path
 * that only exists in one of them fails in the other with ENOENT and nothing
 * to say why. */
const CHROME = (() => {
  const candidates = [
    process.env.CHROME_BIN,
    "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium-browser",
    "/usr/bin/chromium",
  ].filter(Boolean);
  const found = candidates.find(c => fs.existsSync(c));
  if (!found) {
    console.log(`::error::no Chrome or Chromium found. Looked in: ${candidates.join(", ")}`);
    process.exit(1);
  }
  return found;
})();

const C = {
  brand900: "#3C0B2A", brand800: "#4B1136", brand700: "#5E1844",
  gold: "#C6A24C", goldBright: "#DCBB63", cream: "#F3EFE3",
};

const STAR = "50,2 57.3,32.4 83.9,16.1 67.6,42.7 98,50 67.6,57.3 83.9,83.9 57.3,67.6 "
            + "50,98 42.7,67.6 16.1,83.9 32.4,57.3 2,50 32.4,42.7 16.1,16.1 42.7,32.4";

const fontFile = f => fs.readFileSync(path.join(native, "assets", "fonts", f)).toString("base64");
const SANS = fontFile("HankenGroteskBold.ttf");
const SANS_MED = fontFile("HankenGroteskMedium.ttf");

/* The claim, then what it is not, then one line of substance. Each is
 * defensible from the app itself, which is the only kind of marketing worth
 * writing for a masjid. `shot` names the screenshot that goes in the frame. */
const PANELS = [
  { shot: "1-home",
    lead: "Times from the masjid.",
    turn: "Not from an algorithm.",
    body: "The same timetable that is printed and put up on the wall each year — so the time on your phone is the time the jamaat actually stands." },
  { shot: "6-alerts",
    lead: "Know before the adhan.",
    turn: "Not after it.",
    body: "A quiet reminder the number of minutes before jamaat that you choose. Janazah, Ramadan and Eid changes too, each its own switch." },
  { shot: "3-mushaf",
    lead: "The whole mushaf.",
    turn: "In your pocket.",
    body: "All 114 surahs in the familiar 13-line layout, with the page you stopped at kept for next time." },
  { shot: "2-timetable",
    lead: "Works in the prayer hall.",
    turn: "Signal or none.",
    body: "Prayer times, the Qur'an, the adhkar and the Qibla all keep working with no connection at all." },
  { shot: "5-zakat",
    lead: "Zakat, worked out.",
    turn: "Not guessed at.",
    body: "The nisab in both gold and silver from today's prices, then cash, metals, stock and what you are owed." },
];

const FIELD = [[6, 10, 300, 0.03], [88, 18, 260, 0.028], [12, 72, 220, 0.022],
               [84, 80, 300, 0.025], [50, 95, 180, 0.015]];

/* THE STATUS BAR, DRAWN RATHER THAN CAPTURED.
 *
 * A simulator screenshot arrives with iOS's own bar already in it. A render of
 * the web export does not — it has no operating system above it — so the
 * screen would start at the device's top edge and read as a mockup rather than
 * a phone. store-web-shots.mjs leaves exactly the right strip free and records
 * the colour of the header underneath, and this fills it: the time at 9:41,
 * which is the hour Apple's own marketing has used since 2007, the Dynamic
 * Island, and the three indicators.
 *
 * Nothing here is a claim about the app. It is the frame around it. */
function statusBar(S, screenW, bar) {
  if (!bar || !bar.h) return "";
  const H = screenW * bar.h;               /* as a share of the screen's width */
  const ink = bar.ink || "#F3EFE3";
  const pad = H * 0.42;
  /* An iPad's bar is 24pt of 1376 — a twentieth of the phone's share of the
     screen. Drawing a clock and three indicators into it produces specks, not
     a status bar, so below this the strip is left as the plain top edge of the
     glass, which is what it reads as anyway at that size. */
  if (H < 26) return `<div style="height:${H}px;background:${bar.top};flex:0 0 auto"></div>`;
  const island = bar.island
    ? `<div style="width:${H * 1.95}px;height:${H * 0.62}px;border-radius:${H}px;background:#000"></div>`
    : "";
  /* Four ascending bars, an arc of wifi, a battery. Drawn with boxes and
     borders rather than an icon font, because this is five shapes. */
  const signal = [0.38, 0.56, 0.78, 1].map(f =>
    `<i style="display:inline-block;width:${H * 0.075}px;height:${H * 0.3 * f}px;
        background:${ink};border-radius:${H * 0.03}px;margin-left:${H * 0.045}px;
        vertical-align:bottom"></i>`).join("");
  const wifi = `<svg viewBox="0 0 24 18" style="width:${H * 0.36}px;height:${H * 0.27}px;
      margin-left:${H * 0.22}px;vertical-align:bottom">
      <path d="M12 16.2 8.6 12.5a5 5 0 0 1 6.8 0z" fill="${ink}"/>
      <path d="M5.1 9.1a10 10 0 0 1 13.8 0" stroke="${ink}" stroke-width="2.1" fill="none" stroke-linecap="round"/>
      <path d="M1.9 5.6a15 15 0 0 1 20.2 0" stroke="${ink}" stroke-width="2.1" fill="none" stroke-linecap="round"/>
    </svg>`;
  const battery = `<span style="display:inline-block;margin-left:${H * 0.22}px;vertical-align:bottom;
      width:${H * 0.46}px;height:${H * 0.25}px;border:${H * 0.028}px solid ${ink};
      border-radius:${H * 0.08}px;position:relative;opacity:.9">
      <b style="position:absolute;inset:${H * 0.035}px;background:${ink};border-radius:${H * 0.04}px"></b>
      <b style="position:absolute;left:100%;top:30%;height:40%;width:${H * 0.035}px;
         background:${ink};border-radius:0 ${H}px ${H}px 0"></b></span>`;
  return `<div style="height:${H}px;background:${bar.top};display:flex;align-items:center;
      justify-content:space-between;padding:0 ${pad}px;flex:0 0 auto">
      <span style="font-family:HK,sans-serif;font-weight:700;color:${ink};
        font-size:${H * 0.33}px;letter-spacing:${H * 0.004}px;min-width:${H * 1.2}px">9:41</span>
      ${island}
      <span style="min-width:${H * 1.2}px;text-align:right">${signal}${wifi}${battery}</span>
    </div>`;
}

function panelHtml(w, h, p, shotB64, S, bar) {
  const stars = FIELD.map(([x, y, s, o]) =>
    `<svg class="g" viewBox="0 0 100 100" style="left:${x}%;top:${y}%;width:${s * S}px;height:${s * S}px;opacity:${o}">
       <polygon fill="${C.gold}" points="${STAR}"/></svg>`).join("");
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    @font-face{font-family:HK;src:url(data:font/ttf;base64,${SANS});font-weight:700}
    @font-face{font-family:HKm;src:url(data:font/ttf;base64,${SANS_MED})}
    *{margin:0;padding:0;box-sizing:border-box}
    html,body{width:100%;height:100%;overflow:hidden;background:${C.brand900}}
    .bg{position:fixed;inset:-2%;
        background:linear-gradient(160deg,${C.brand700} 0%,${C.brand800} 42%,${C.brand900} 100%)}
    .g{position:absolute;transform:translate(-50%,-50%)}
    .wrap{position:fixed;inset:0;display:flex;flex-direction:column;align-items:center;
          padding:${68 * S}px ${54 * S}px 0}
    .lead{font-family:HK,sans-serif;font-weight:700;color:${C.cream};
          font-size:${38 * S}px;line-height:1.18;text-align:center;letter-spacing:${-0.5 * S}px}
    .turn{font-family:HK,sans-serif;font-weight:700;color:${C.goldBright};
          font-size:${38 * S}px;line-height:1.18;text-align:center;letter-spacing:${-0.5 * S}px}
    .body{font-family:HKm,sans-serif;color:#D8C3D0;font-size:${17 * S}px;line-height:1.5;
          text-align:center;margin-top:${16 * S}px;max-width:${500 * S}px}
    /* The device. A dark bezel with a bright inner hairline, which is what
       stops a flat rounded rectangle reading as a sticker. */
    .phone{margin-top:${40 * S}px;width:${404 * S}px;border-radius:${56 * S}px;
           padding:${11 * S}px;background:linear-gradient(170deg,#241018,#0B0409);
           box-shadow:0 ${34 * S}px ${70 * S}px rgba(0,0,0,.5),
                      inset 0 0 0 ${1.4 * S}px rgba(220,187,99,.30);
           position:relative}
    .screen{width:100%;display:block;border-radius:${46 * S}px;overflow:hidden;
            background:#000}
    .screen img{width:100%;display:block}
  </style></head><body><div class="bg">${stars}</div>
    <div class="wrap">
      <div class="lead">${p.lead}</div>
      <div class="turn">${p.turn}</div>
      <div class="body">${p.body}</div>
      <div class="phone"><div class="screen">${statusBar(S, 404 * S, bar)}<img src="data:image/png;base64,${shotB64}"></div></div>
    </div></body></html>`;
}

const DEVICES = [
  { label: "iphone", dir: "iphone", w: 1206, h: 2622, scale: 1.0, island: true },
  { label: "ipad",   dir: "ipad-13", w: 2064, h: 2752, scale: 1.55, island: false },
];

/* Written by store-web-shots.mjs: how tall the strip it left free is, and what
 * colour the header under it came out. Absent when the shots came from a
 * simulator, which brings its own status bar — so no bar is drawn and the
 * frames are composed exactly as they were before. */
const BARS = (() => {
  const f = path.join(SHOTS, "status-bar.json");
  return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, "utf8")) : {};
})();

fs.mkdirSync(OUT, { recursive: true });
let made = 0;

for (const d of DEVICES) {
  const srcDir = path.join(SHOTS, d.dir);
  if (!fs.existsSync(srcDir)) {
    console.log(`::warning::no screenshots at ${srcDir} — skipping ${d.label}`);
    continue;
  }
  const outDir = path.join(OUT, d.label);
  fs.mkdirSync(outDir, { recursive: true });

  PANELS.forEach((p, i) => {
    const src = path.join(srcDir, `${p.shot}.png`);
    if (!fs.existsSync(src)) {
      console.log(`::warning::${src} missing — skipping panel ${i + 1}`);
      return;
    }
    const raw = fs.readFileSync(src);
    const b64 = raw.toString("base64");
    /* The bar's height as a fraction of the shot's own width, so it lands at
       the same size whatever the device scale factor was. */
    const meta = BARS[`${d.dir}/${p.shot}`];
    const shotW = raw.readUInt32BE(16), shotH = raw.readUInt32BE(20);
    const bar = meta ? { top: meta.top, island: d.island,
                         h: (d.h - shotH) / shotW } : null;
    if (meta && d.h - shotH <= 0)
      throw new Error(`${src} is ${shotH} tall and the frame wants ${d.h} — no room for a status bar`);
    const scale = 2;
    const page = path.join(outDir, `_${i + 1}.html`);
    const out = path.join(outDir, `${i + 1}-${p.lead.toLowerCase().replace(/[^a-z]+/g, "-").replace(/^-|-$/g, "")}.png`);
    fs.writeFileSync(page, panelHtml(d.w / scale, d.h / scale, p, b64, d.scale, bar));
    execFileSync(CHROME, ["--headless", "--disable-gpu", "--no-sandbox", "--hide-scrollbars",
      `--force-device-scale-factor=${scale}`,
      `--window-size=${d.w / scale},${d.h / scale}`,
      `--screenshot=${out}`, `file://${page}`], { stdio: ["ignore", "ignore", "pipe"] });
    fs.rmSync(page);

    const png = fs.readFileSync(out);
    const gw = png.readUInt32BE(16), gh = png.readUInt32BE(20);
    if (gw !== d.w || gh !== d.h) throw new Error(`${out}: ${gw}x${gh}, wanted ${d.w}x${d.h}`);
    made++;
    console.log(`${d.label}/${path.basename(out)}  ${gw}x${gh}  ${Math.round(png.length / 1024)}KB`);
  });
}
console.log(`::notice::${made} marketing screenshot(s) in ${OUT}`);
