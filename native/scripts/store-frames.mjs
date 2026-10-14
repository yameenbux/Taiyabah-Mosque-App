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
/* The masjid's own wordmark, for the first panel. */
const LOGO = fs.readFileSync(path.join(repo, "logo.svg")).toString("base64");
const SANS = fontFile("HankenGroteskBold.ttf");
const SANS_MED = fontFile("HankenGroteskMedium.ttf");

/* The claim, then what it is not, then one line of substance. Each is
 * defensible from the app itself, which is the only kind of marketing worth
 * writing for a masjid. `shot` names the screenshot that goes in the frame. */
const PANELS = [
  { shot: "1-home", art: "open", arc: "right",
    lead: "Times from the masjid.",
    turn: "Not from an algorithm.",
    body: "The same timetable that is printed and put up on the wall each year — so the time on your phone is the time the jamaat actually stands." },
  { shot: "6-alerts", art: "plain", arc: "left",
    lead: "Know before the adhan.",
    turn: "Not after it.",
    body: "A quiet reminder the number of minutes before jamaat that you choose. Janazah, Ramadan and Eid changes too, each its own switch." },
  { shot: "7-qibla", art: "plain", arc: "right",
    lead: "Which way to face.",
    turn: "Down to the degree.",
    body: "118\u00B0 from true north and 5,042 km to Makkah, worked out from the masjid\u2019s own position \u2014 with your phone\u2019s compass to turn by." },
  { shot: "2-timetable", art: "plain", arc: "left",
    lead: "Works in the prayer hall.",
    turn: "Signal or none.",
    body: "Prayer times, the Qur'an, the adhkar and the Qibla all keep working with no connection at all." },
  { shot: "5-zakat", art: "plain", arc: "right",
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

function panelHtml(w, h, p, shotB64, S, bar, logoB64) {
  /* ONE SYSTEM, FIVE PANELS. What makes a row of store images read as a set
   * rather than five separate pictures is that the furniture never moves: the
   * same plum field, the same gold arc sweeping out of the same corner, the
   * same type at the same size in the same place, and the phone always running
   * off the bottom edge at the same scale. Only the arc's side alternates, so
   * the eye has something to travel along as it scrolls.
   *
   * THE PHONE IS CROPPED ON PURPOSE. A whole device floating in the middle of
   * a panel with air underneath it is the tell of a screenshot that has been
   * put in a frame. Every listing worth copying runs the device off the edge:
   * it gives scale, it fills the panel, and it says the screen continues.
   *
   * The first panel carries the masjid's own mark and tilts the phone away,
   * because the first image in the row is the one that has to say whose app
   * this is before it says what it does. */
  const PAD = 58 * S;
  const arcLeft = p.arc === "left";

  /* THE MOTIF. The app's own eight-point girih star, blown up far past the
     panel and bled off a corner — drawn as an outline rather than a fill,
     because a filled shape at this size is a stain and an outline is a motif.
     It alternates sides down the row, which is what gives five panels of the
     same furniture something to travel along.
     
     A fill at 7% was invisible; the first pass of this looked like flat plum
     with words on it. Big, confident and still quiet is the thing to aim at. */
  const arc = `
    <svg viewBox="0 0 100 100" style="position:absolute;
        ${arcLeft ? `left:${-300 * S}px` : `right:${-300 * S}px`};top:${150 * S}px;
        width:${900 * S}px;height:${900 * S}px">
      <polygon points="${STAR}" fill="none" stroke="${C.gold}" stroke-width="0.4" opacity=".30"/>
      <polygon points="${STAR}" fill="${C.gold}" opacity=".05"/>
    </svg>
    <svg viewBox="0 0 100 100" style="position:absolute;
        ${arcLeft ? `left:${-170 * S}px` : `right:${-170 * S}px`};top:${322 * S}px;
        width:${560 * S}px;height:${560 * S}px">
      <polygon points="${STAR}" fill="none" stroke="${C.goldBright}" stroke-width="0.5" opacity=".22"/>
    </svg>`;

  /* A warm lift behind the top of the device, so it sits in light rather than
     on a flat field. */
  const glow = `<div style="position:absolute;left:50%;top:${300 * S}px;width:${820 * S}px;
      height:${820 * S}px;margin-left:${-410 * S}px;border-radius:50%;
      background:radial-gradient(circle,rgba(198,162,76,.16) 0%,rgba(198,162,76,0) 62%)"></div>`;

  const smallStars = [[10, 7, 120, .07], [92, 15, 92, .06], [6, 88, 110, .05], [88, 92, 86, .05]]
    .map(([x, y, sz, o]) =>
      `<svg viewBox="0 0 100 100" style="position:absolute;left:${x}%;top:${y}%;
         width:${sz * S}px;height:${sz * S}px;opacity:${o};transform:translate(-50%,-50%)">
         <polygon fill="${C.goldBright}" points="${STAR}"/></svg>`).join("");

  const open = p.art === "open";

  /* The wordmark, on the opener only. */
  const mark = open
    ? `<img src="data:image/svg+xml;base64,${logoB64}" style="width:${214 * S}px;display:block;
         margin-bottom:${40 * S}px">`
    : "";

  /* SQUARE ON EVERY PANEL. The opener was tilted in perspective, which is a
   * thing both reference listings do and which did not survive being looked
   * at here: beside four square devices the tilt read as a mistake rather
   * than a flourish. One difference between the opener and the rest — the
   * wordmark — is enough, and it is the right one. */
  const tilt = "";

  return `<!doctype html><html><head><meta charset="utf-8"><style>
    @font-face{font-family:HK;src:url(data:font/ttf;base64,${SANS});font-weight:700}
    @font-face{font-family:HKm;src:url(data:font/ttf;base64,${SANS_MED})}
    *{margin:0;padding:0;box-sizing:border-box}
    html,body{width:100%;height:100%;overflow:hidden;background:${C.brand900}}
    .bg{position:fixed;inset:0;overflow:hidden;
        background:linear-gradient(158deg,${C.brand700} 0%,${C.brand800} 38%,${C.brand900} 100%)}
    .wrap{position:fixed;inset:0;padding:${64 * S}px ${PAD}px 0;overflow:hidden}
    .lead{font-family:HK,sans-serif;font-weight:700;color:${C.cream};
          font-size:${open ? 40 * S : 44 * S}px;line-height:1.12;letter-spacing:${-0.9 * S}px}
    .turn{font-family:HK,sans-serif;font-weight:700;color:${C.goldBright};
          font-size:${open ? 40 * S : 44 * S}px;line-height:1.12;letter-spacing:${-0.9 * S}px}
    .body{font-family:HKm,sans-serif;color:rgba(243,239,227,.72);font-size:${17.5 * S}px;
          line-height:1.5;margin-top:${15 * S}px;max-width:${430 * S}px}
    /* The device. A dark bezel with a bright inner hairline, which is what
       stops a flat rounded rectangle reading as a sticker. */
    .phone{position:absolute;left:50%;margin-left:${-237 * S}px;top:${open ? 452 * S : 344 * S}px;
           width:${474 * S}px;border-radius:${64 * S}px;
           padding:${12 * S}px;background:linear-gradient(170deg,#2A1320,#080308);
           box-shadow:0 ${40 * S}px ${90 * S}px rgba(0,0,0,.55),
                      inset 0 0 0 ${1.5 * S}px rgba(220,187,99,.34);${tilt}}
    .screen{width:100%;display:flex;flex-direction:column;border-radius:${53 * S}px;
            overflow:hidden;background:#000}
    .screen img{width:100%;display:block}
  </style></head><body>
    <div class="bg">${glow}${arc}${smallStars}</div>
    <div class="wrap">
      ${mark}
      <div class="lead">${p.lead}</div>
      <div class="turn">${p.turn}</div>
      <div class="body">${p.body}</div>
    </div>
    <div class="phone"><div class="screen">${statusBar(S, 450 * S, bar)}<img src="data:image/png;base64,${shotB64}"></div></div>
  </body></html>`;
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
/* Is this capture short of the frame — i.e. has it left room for a bar? */
const shotShort = (file, d) => {
  const b = fs.readFileSync(file);
  return b.readUInt32BE(20) < d.h;
};

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
    /* A shot that is short of the frame has had room left for a status bar,
       and that bar has to be drawn — silently composing without one is how
       four panels went out with the phone's screen starting at the bezel. */
    if (!meta && shotShort(src, d))
      throw new Error(`${d.dir}/${p.shot}: the shot is shorter than the frame but ` +
                      `store-shots/status-bar.json has no entry for it — re-run store-web-shots.mjs`);
    const shotW = raw.readUInt32BE(16), shotH = raw.readUInt32BE(20);
    const bar = meta ? { top: meta.top, island: d.island,
                         h: (d.h - shotH) / shotW } : null;
    if (meta && d.h - shotH <= 0)
      throw new Error(`${src} is ${shotH} tall and the frame wants ${d.h} — no room for a status bar`);
    const scale = 2;
    const page = path.join(outDir, `_${i + 1}.html`);
    const out = path.join(outDir, `${i + 1}-${p.lead.toLowerCase().replace(/[^a-z]+/g, "-").replace(/^-|-$/g, "")}.png`);
    fs.writeFileSync(page, panelHtml(d.w / scale, d.h / scale, p, b64, d.scale, bar, LOGO));
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

/* A CONTACT SHEET, because the row is the thing being designed.
 *
 * Nobody meets these one at a time. They are scrolled through side by side on
 * a store page, and whether they read as one set or five separate pictures is
 * only visible when they are laid out the way the reader will meet them. Five
 * panels that each look fine alone and nothing like each other together is the
 * commonest way a listing looks homemade. */
for (const d of DEVICES) {
  const dir = path.join(OUT, d.label);
  if (!fs.existsSync(dir)) continue;
  const shots = fs.readdirSync(dir).filter(f => /^\d.*\.png$/.test(f)).sort();
  if (!shots.length) continue;
  const TH = 520, gap = 18;
  const imgs = shots.map(f =>
    `<img src="data:image/png;base64,${fs.readFileSync(path.join(dir, f)).toString("base64")}"
       style="height:${TH}px;display:block;border-radius:6px">`).join("");
  const sheetW = Math.round(shots.length * (TH * d.w / d.h) + (shots.length + 1) * gap);
  const html = path.join(dir, "_sheet.html");
  const out = path.join(OUT, `${d.label}-all.png`);
  fs.writeFileSync(html, `<!doctype html><meta charset="utf-8">
    <body style="margin:0;background:#17070F;display:flex;gap:${gap}px;padding:${gap}px;
                 align-items:flex-start">${imgs}</body>`);
  execFileSync(CHROME, ["--headless", "--disable-gpu", "--no-sandbox", "--hide-scrollbars",
    "--force-device-scale-factor=2", `--window-size=${sheetW},${TH + gap * 2}`,
    `--screenshot=${out}`, `file://${html}`], { stdio: ["ignore", "ignore", "pipe"] });
  fs.rmSync(html);
  console.log(`${path.basename(out)}  the five together — look at this one`);
}
