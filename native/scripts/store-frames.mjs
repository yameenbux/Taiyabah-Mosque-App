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
import { decode, rgb } from "./lib/png.mjs";

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
  { shot: "1-home", art: "open", arc: "right", theme: "plum",
    lead: "Times from the masjid.",
    turn: "Not from an algorithm.",
    proof: "The timetable that goes up on the wall" },

  { shot: "6-alerts", art: "plain", arc: "left", theme: "cream",
    lead: "Before the adhan.",
    turn: "Not after it.",
    proof: "Your own reminder · minutes before jamāʿah" },

  { shot: "11-surah", art: "plain", arc: "right", theme: "plum",
    lead: "The Qur’an in English.",
    turn: "Line beside line.",
    proof: "All 114 sūrahs · Abdullah Yusuf Ali" },

  { shot: "7-qibla", art: "plain", arc: "left", theme: "cream",
    lead: "Which way to face.",
    turn: "Down to the degree.",
    proof: "118° from true north · 5,042 km to Makkah" },

  /* THE OFFLINE PANEL IS PAIRED WITH THE ADHKĀR ON PURPOSE.
   *
   * It used to sit over the timetable, which was honest but was a grid of
   * numbers and the weakest picture in the row. The obvious swap was the
   * muṣḥaf, whose page is the best-looking screen in the app — and it would
   * have been a lie: src/screens/Quran.jsx fetches those pages from
   * taiyabahapp.ysbdesigns.uk, so the one screen that would have sold the
   * claim is the one screen that needs a connection. The adhkār come out of
   * athkar.json, the reading text out of quran-text.json and the times out of
   * timetable-2026.json, all of them bundled into the binary, so the picture
   * and the words agree. The proof line names only those three. */
  { shot: "8-athkar", art: "plain", arc: "right", theme: "plum",
    lead: "Works with no signal.",
    turn: "Anywhere in the hall.",
    proof: "Times, Qur’an and adhkār · stored on the phone" },

  { shot: "5-zakat", art: "plain", arc: "left", theme: "cream",
    lead: "Zakat, worked out.",
    turn: "Not guessed at.",
    proof: "Niṣāb from today’s gold and silver prices" },
];

/* THE PALETTE, TWO WAYS.
 *
 * Six panels on one plum field is a wall rather than a row: scrolled past at
 * the size a store page actually shows them, the set reads as a single dark
 * smear and nothing marks where one image ends and the next begins. The
 * listings worth copying alternate — a deep field, then a light one — so the
 * row has a beat to it and each panel is divided from its neighbours by the
 * strongest signal available, which is the background changing. The cream is
 * not an invention either: it is the app’s own reading colour, already on the
 * screens inside three of these frames.
 *
 * ON CREAM THE GOLD CANNOT CARRY A HEADLINE. #C6A24C on #F3EFE3 is about two
 * to one, which is a smudge at any size, so the accent line darkens to an
 * ochre that still reads as gold and holds at a thumbnail. */
const THEMES = {
  plum: {
    bg: `linear-gradient(158deg,${C.brand700} 0%,${C.brand800} 38%,${C.brand900} 100%)`,
    lead: C.cream, turn: C.goldBright, proof: "rgba(243,239,227,.60)",
    stroke: C.gold, strokeOp: 0.30, inner: C.goldBright, innerOp: 0.22,
    fill: C.gold, fillOp: 0.05, specks: C.goldBright, speckOp: 1,
    glow: "rgba(198,162,76,.16)", base: C.brand900, lit: false,
  },
  cream: {
    bg: "linear-gradient(158deg,#FDFBF5 0%,#F3EFE3 46%,#E7DFCC 100%)",
    lead: C.brand900, turn: "#9C6F23", proof: "rgba(60,11,42,.58)",
    stroke: C.brand900, strokeOp: 0.14, inner: "#9C6F23", innerOp: 0.13,
    fill: C.gold, fillOp: 0.08, specks: C.brand900, speckOp: 0.5,
    glow: "rgba(198,162,76,.30)", base: "#E7DFCC", lit: true,
  },
};

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
  /* ONE SYSTEM, SIX PANELS. What makes a row of store images read as a set
   * rather than six separate pictures is that the furniture never moves: the
   * same type at the same size in the same place, the same girih star bled off
   * a corner, and the phone always running off the bottom edge at the same
   * scale. Two things alternate, and only two — the side the star sweeps in
   * from, and the field it sweeps across. That is what gives the eye something
   * to travel along as it scrolls.
   *
   * THE PHONE IS CROPPED ON PURPOSE. A whole device floating in the middle of
   * a panel with air underneath it is the tell of a screenshot that has been
   * put in a frame. Every listing worth copying runs the device off the edge:
   * it gives scale, it fills the panel, and it says the screen continues.
   *
   * WHAT USED TO BE HERE AND WHY IT IS NOT. Each panel carried three lines of
   * body copy under the headline. On a store page that paragraph is never
   * read — the panel is a thumbnail until somebody taps it, and at that size
   * seventeen-pixel text is grey texture under the thing they are actually
   * looking at. It is one tracked line now, over a short rule: enough to carry
   * the fact that makes the headline true, short enough to be taken in at a
   * glance. The claims did not get softer, only shorter. */
  const PAD = 58 * S;
  const arcLeft = p.arc === "left";
  const T = THEMES[p.theme] || THEMES.plum;

  /* THE MOTIF. The app's own eight-point girih star, blown up far past the
     panel and bled off a corner — drawn mostly as an outline, because a
     filled shape at this size is a stain and an outline is a motif.

     A fill at 7% was invisible on plum; the first pass of this looked like
     flat colour with words on it. Big, confident and still quiet is the thing
     to aim at. On cream the same shape needs the opposite treatment: the
     stroke goes plum and drops to a tenth, because a dark line on a light
     field carries at a fraction of the weight a light line needs on a dark
     one. */
  const arc = `
    <svg viewBox="0 0 100 100" style="position:absolute;
        ${arcLeft ? `left:${-300 * S}px` : `right:${-300 * S}px`};top:${150 * S}px;
        width:${900 * S}px;height:${900 * S}px">
      <polygon points="${STAR}" fill="none" stroke="${T.stroke}" stroke-width="0.4" opacity="${T.strokeOp}"/>
      <polygon points="${STAR}" fill="${T.fill}" opacity="${T.fillOp}"/>
    </svg>
    <svg viewBox="0 0 100 100" style="position:absolute;
        ${arcLeft ? `left:${-170 * S}px` : `right:${-170 * S}px`};top:${322 * S}px;
        width:${560 * S}px;height:${560 * S}px">
      <polygon points="${STAR}" fill="none" stroke="${T.inner}" stroke-width="0.5" opacity="${T.innerOp}"/>
    </svg>`;

  /* A warm lift behind the top of the device, so it sits in light rather than
     on a flat field. */
  const glow = `<div style="position:absolute;left:50%;top:${300 * S}px;width:${820 * S}px;
      height:${820 * S}px;margin-left:${-410 * S}px;border-radius:50%;
      background:radial-gradient(circle,${T.glow} 0%,rgba(198,162,76,0) 62%)"></div>`;

  const smallStars = [[10, 7, 120, .07], [92, 15, 92, .06], [6, 88, 110, .05], [88, 92, 86, .05]]
    .map(([x, y, sz, o]) =>
      `<svg viewBox="0 0 100 100" style="position:absolute;left:${x}%;top:${y}%;
         width:${sz * S}px;height:${sz * S}px;opacity:${o * T.speckOp};transform:translate(-50%,-50%)">
         <polygon fill="${T.specks}" points="${STAR}"/></svg>`).join("");

  const open = p.art === "open";

  /* The wordmark, on the opener only — the first image in the row has to say
     whose app this is before it says what it does. It is cream artwork, so on
     the light panels it would disappear; the opener is plum and always will
     be, but the guard is cheap and the failure is silent. */
  const mark = open
    ? `<img src="data:image/svg+xml;base64,${logoB64}" style="width:${214 * S}px;display:block;
         margin-bottom:${32 * S}px${p.theme === "cream" ? ";filter:invert(1) hue-rotate(180deg)" : ""}">`
    : "";

  return `<!doctype html><html><head><meta charset="utf-8"><style>
    @font-face{font-family:HK;src:url(data:font/ttf;base64,${SANS});font-weight:700}
    @font-face{font-family:HKm;src:url(data:font/ttf;base64,${SANS_MED})}
    *{margin:0;padding:0;box-sizing:border-box}
    /* LAID OUT IN ABSOLUTE PIXELS, NOT AGAINST THE VIEWPORT.
       These panels were composed with position:fixed, which pins a box to the
       viewport — and headless Chrome lays the page out in a viewport slightly
       shorter than the --window-size it then captures. The field therefore
       stopped about ninety pixels above the bottom of every image and the
       body colour showed through underneath. On six plum panels over a plum
       body it was invisible, which is why it survived a release; the first
       cream panel put a dark bar across the foot of the picture. The height
       is now stated outright, and the body is painted the field's own base
       colour so that even a miss has nothing to reveal. */
    html,body{width:100%;height:100%;overflow:hidden;background:${T.base}}
    .bg{position:absolute;left:0;top:0;width:${w}px;height:${h}px;overflow:hidden;background:${T.bg}}
    .wrap{position:absolute;left:0;top:0;width:${w}px;height:${h}px;
          padding:${62 * S}px ${PAD}px 0;overflow:hidden}
    .lead,.turn{font-family:HK,sans-serif;font-weight:700;line-height:1.08;
          letter-spacing:${-1.15 * S}px}
    .lead{color:${T.lead};font-size:${(open ? 43 : 48) * S}px}
    .turn{color:${T.turn};font-size:${(open ? 43 : 48) * S}px}
    /* A short rule, then one tracked line. The rule is what stops the caption
       reading as an orphaned sentence and turns it into a credit. */
    .rule{width:${44 * S}px;height:${2 * S}px;background:${T.turn};opacity:.85;
          margin:${26 * S}px 0 ${15 * S}px}
    .proof{font-family:HKm,sans-serif;color:${T.proof};font-size:${13 * S}px;
          text-transform:uppercase;letter-spacing:${1.55 * S}px;line-height:1.5;
          max-width:${415 * S}px}
    /* The device. A dark bezel with a bright inner hairline, which is what
       stops a flat rounded rectangle reading as a sticker. */
    .phone{position:absolute;left:50%;margin-left:${-243 * S}px;top:${(open ? 446 : 338) * S}px;
           width:${486 * S}px;border-radius:${64 * S}px;
           padding:${12 * S}px;background:linear-gradient(170deg,#2A1320,#080308);
           box-shadow:0 ${40 * S}px ${90 * S}px rgba(0,0,0,${p.theme === "cream" ? ".32" : ".55"}),
                      inset 0 0 0 ${1.5 * S}px rgba(220,187,99,.34);}
    .screen{width:100%;display:flex;flex-direction:column;border-radius:${53 * S}px;
            overflow:hidden;background:#000}
    .screen img{width:100%;display:block}
  </style></head><body>
    <div class="bg">${glow}${arc}${smallStars}</div>
    <div class="wrap">
      ${mark}
      <div class="lead">${p.lead}</div>
      <div class="turn">${p.turn}</div>
      <div class="rule"></div>
      <div class="proof">${p.proof}</div>
    </div>
    <div class="phone"><div class="screen">${statusBar(S, 462 * S, bar)}<img src="data:image/png;base64,${shotB64}"></div></div>
  </body></html>`;
}

/* ONE SET, BECAUSE THE APP IS IPHONE ONLY.
 *
 * app.json sets supportsTablet to false, so App Store Connect never shows the
 * 13" iPad tab and a set rendered for it is six files nobody can upload. The
 * iPad entry stayed here long after that changed; it is gone rather than
 * commented out, and if tablet support comes back this is four lines. */
const DEVICES = [
  { label: "iphone", dir: "iphone", w: 1206, h: 2622, scale: 1.0, island: true },
  /* 6.9". `scale` is the only thing that changes: every measurement in a panel
     is written as a multiple of it, so the larger canvas is the same design
     drawn bigger rather than the same design with more room around it. */
  { label: "iphone-6.9", dir: "iphone-69", w: 1320, h: 2868, scale: 1320 / 1206, island: true },
];

/* Written by store-web-shots.mjs: how tall the strip it left free is, and what
 * colour the header under it came out. Absent when the shots came from a
 * simulator, which brings its own status bar — so no bar is drawn and the
 * frames are composed exactly as they were before. */
/* DOES EVERY HEADLINE STILL FIT ON ONE LINE?
 *
 * The two-line shape — a claim, then the thing it is not — is the whole
 * system. A lead that wraps becomes three lines, pushes its caption into the
 * phone and makes one panel in six a different shape from the rest, which is
 * precisely what a row of store images cannot afford. It happened the first
 * time these were rendered at the larger size: "Know before the adhan." broke
 * after "the" and nothing said so.
 *
 * It cannot be eyeballed from the source either, because whether twenty-two
 * characters fit depends on which characters they are — "The Qur’an in
 * English." fits at a size where "Know before the adhan." does not. So the
 * browser that will draw them is asked, before anything is rendered: the real
 * font at the real size in the real column width, reporting the height of each
 * line against the height of one. --dump-dom is how a headless Chrome is made
 * to answer a question rather than take a picture. */
function assertHeadlinesFit(panels, d, S) {
  const PAD = 58 * S, colW = d.w / 2 - 2 * PAD;
  const items = panels.flatMap((p, i) => [
    { id: `p${i}l`, text: p.lead, size: (p.art === "open" ? 43 : 48) * S },
    { id: `p${i}t`, text: p.turn, size: (p.art === "open" ? 43 : 48) * S },
  ]);
  const esc = t => t.replace(/&/g, "&amp;").replace(/</g, "&lt;");
  const html = `<!doctype html><meta charset="utf-8"><style>
    @font-face{font-family:HK;src:url(data:font/ttf;base64,${SANS});font-weight:700}
    body{margin:0}
    .t{font-family:HK,sans-serif;font-weight:700;line-height:1.08;
       letter-spacing:${-1.15 * S}px;width:${colW}px}
  </style>${items.map(it =>
    `<div class="t" id="${it.id}" style="font-size:${it.size}px">${esc(it.text)}</div>`).join("")}
  <pre id="out"></pre><script>
    document.fonts.ready.then(() => {
      const r = ${JSON.stringify(items.map(i => i.id))}.map(id => {
        const el = document.getElementById(id);
        return id + "=" + Math.round(el.offsetHeight / (parseFloat(getComputedStyle(el).fontSize) * 1.08));
      });
      document.getElementById("out").textContent = "MEASURED " + r.join(" ");
    });
  </script>`;
  const f = path.join(OUT, "_measure.html");
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(f, html);
  const dom = execFileSync(CHROME, ["--headless", "--disable-gpu", "--no-sandbox",
    "--virtual-time-budget=4000", "--dump-dom", `file://${f}`], { encoding: "utf8" });
  fs.rmSync(f);
  const m = dom.match(/MEASURED ([^<]*)/);
  if (!m) throw new Error("headline measurement produced nothing — Chrome did not run the page");
  const lines = Object.fromEntries(m[1].trim().split(/\s+/).map(s => s.split("=")));
  const bad = items.filter(it => Number(lines[it.id]) !== 1);
  if (bad.length)
    throw new Error(`these headlines wrap at ${colW}px and must be shortened:\n` +
      bad.map(b => `  "${b.text}" — ${lines[b.id]} lines`).join("\n"));
  console.log(`headlines: all ${items.length} fit on one line at ${Math.round(colW)}px`);
}

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
  assertHeadlinesFit(PANELS, d, d.scale);
  const srcDir = path.join(SHOTS, d.dir);
  if (!fs.existsSync(srcDir)) {
    console.log(`::warning::no screenshots at ${srcDir} — skipping ${d.label}`);
    continue;
  }
  const outDir = path.join(OUT, d.label);
  fs.mkdirSync(outDir, { recursive: true });
  /* EMPTIED FIRST, BECAUSE THE FILENAME CARRIES THE HEADLINE.
   *
   * Each panel is written as "<n>-<its headline, slugged>.png", so changing a
   * headline changes the filename and the old file stays behind. It is not
   * merely clutter: the contact sheet globs this directory, so the stale panel
   * reappears in the row being judged, and the upload is a hand-picked six out
   * of however many have accumulated. Renaming one headline is enough to make
   * the set it produces wrong, which is exactly the kind of error nobody looks
   * for. */
  for (const f of fs.readdirSync(outDir)) if (/\.(png|html)$/.test(f)) fs.rmSync(path.join(outDir, f));

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

    /* DOES THE FIELD REACH ALL FOUR CORNERS?
     *
     * The margins either side of the phone are clear of it, so the four
     * corners are field and nothing else. A light panel whose corner comes
     * back dark — or the reverse — means something is not covering what it
     * was meant to cover, which is the failure that put a plum bar across the
     * foot of the cream panels and went out looking deliberate. */
    const img = decode(out);
    const lum = ([r, g, b]) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
    const T = THEMES[p.theme] || THEMES.plum;
    const corners = [[3, 3], [gw - 4, 3], [3, gh - 3], [gw - 4, gh - 3]];
    const wrong = corners.filter(([x, y]) => (lum(rgb(img, x, y)) > 140) !== T.lit);
    if (wrong.length)
      throw new Error(`${out}: the ${p.theme} field does not reach ` +
        wrong.map(([x, y]) => `(${x},${y})=rgb(${rgb(img, x, y).join(",")})`).join(" ") +
        ` — something is covering the panel instead of filling it`);
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
  console.log(`${path.basename(out)}  all ${shots.length} together — look at this one`);
}
