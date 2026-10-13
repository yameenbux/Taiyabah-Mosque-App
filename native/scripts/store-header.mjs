/**
 * The App Store product page header asset.
 *
 * Apple shows this as a wide banner across the top of the listing, and accepts
 * 5244x2950 or 3840x1646. Both are produced, because the two are different
 * shapes rather than two sizes of one shape and the composition has to hold in
 * each.
 *
 * It is drawn from the app's own parts rather than designed afresh: logo.svg
 * (vector, so it stays sharp at banner scale — the raster logo is 420px wide
 * and would be mush), the exact palette from src/theme.js, the eight-pointed
 * girih star the app scatters behind its own heroes, and Fraunces, the app's
 * display face. A listing that looks like the app is the point; a banner in
 * someone else's colours would be a worse lie than no banner.
 *
 * Rendered by the Chromium that is already on this machine, at half the target
 * size with a device scale factor of two, which costs a quarter of the pixels
 * to rasterise and lands on exactly the dimensions Apple asks for.
 *
 * Apple crops this asset differently across placements, so everything that
 * carries meaning sits well inside the middle. The edges are deliberately
 * nothing but gradient and a few faint stars: the parts that can be lost.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const here = import.meta.dirname;
const native = path.resolve(here, "..");
const repo = path.resolve(native, "..");
const OUT = path.join(repo, "docs", "store-assets");
const CHROME = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";

const C = {
  brand900: "#3C0B2A", brand800: "#4B1136", brand700: "#5E1844",
  gold: "#C6A24C", goldBright: "#DCBB63", cream: "#F3EFE3",
};

/* The app's own girih star, points copied exactly from the Girih component in
 * src/ui.jsx rather than redrawn by eye. */
const STAR = "50,2 57.3,32.4 83.9,16.1 67.6,42.7 98,50 67.6,57.3 83.9,83.9 57.3,67.6 "
            + "50,98 42.7,67.6 16.1,83.9 32.4,57.3 2,50 32.4,42.7 16.1,16.1 42.7,32.4";

const font = f => fs.readFileSync(path.join(native, "assets", "fonts", f)).toString("base64");
const HANKEN = font("HankenGroteskMedium.ttf");

/* The logo, inline so it rasterises as vector. Its own gold is replaced with
 * the brighter gold the app uses on plum, which is what the hero does too. */
const logo = fs.readFileSync(path.join(repo, "logo.svg"), "utf8")
  .replace(/fill="#D0B060"/g, `fill="${C.goldBright}"`)
  .replace(/<svg([^>]*)width="[^"]*"([^>]*)height="[^"]*"/, "<svg$1$2");

/* Scattered faint stars. Fixed positions rather than random, so regenerating
 * the asset produces the same banner and a re-upload is not a redesign. */
const FIELD = [
  [4, 12, 320, 0.025], [14, 68, 200, 0.02], [26, 26, 150, 0.018],
  [78, 16, 260, 0.025], [88, 62, 340, 0.022], [68, 80, 180, 0.018],
  [40, 90, 140, 0.015], [58, 6, 120, 0.015], [94, 34, 160, 0.015],
  [8, 44, 120, 0.015], [32, 62, 110, 0.012], [72, 46, 100, 0.012],
];

function html(w, h, { logoW, rule, sub }) {
  const stars = FIELD.map(([x, y, s, o]) =>
    `<svg class="g" viewBox="0 0 100 100" style="left:${x}%;top:${y}%;width:${s}px;height:${s}px;opacity:${o}">
       <polygon fill="${C.gold}" points="${STAR}"/></svg>`).join("");
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    @font-face{font-family:Hanken;src:url(data:font/ttf;base64,${HANKEN})}
    *{margin:0;padding:0;box-sizing:border-box}
    /* Both the body colour and a fixed, inset-zero panel, because the first
       two renders left a white band along the bottom: whatever Chromium makes
       of --window-size against a device scale factor, a viewport taller than
       the element would show through. Painting the body too means there is
       nothing underneath to show. */
    html,body{width:100%;height:100%;overflow:hidden;background:${C.brand900}}
    /* Oversized rather than exact: the gradient runs on a diagonal, so where a
       viewport-sized panel ended, the flat body colour beneath did not match it
       across the whole width and left a faint seam. Two percent of overhang on
       every side puts that join outside the picture. */
    .bg{position:fixed;inset:-2%;
        background:linear-gradient(145deg,${C.brand700} 0%,${C.brand800} 38%,${C.brand900} 100%)}
    /* A soft centre lift, so the middle reads as lit and the croppable edges
       fall away. */
    .vig{position:absolute;inset:0;
         background:radial-gradient(ellipse 62% 78% at 50% 46%,
                    rgba(255,255,255,.07) 0%,rgba(255,255,255,0) 62%)}
    .g{position:absolute;transform:translate(-50%,-50%)}
    .mid{position:fixed;inset:0;display:flex;flex-direction:column;
         align-items:center;justify-content:center;gap:${Math.round(h * 0.045)}px}
    .logo{width:${logoW}px;height:auto;display:block;
          filter:drop-shadow(0 ${Math.round(h * 0.012)}px ${Math.round(h * 0.03)}px rgba(0,0,0,.35))}
    .r{width:${rule}px;height:${Math.max(2, Math.round(h * 0.0016))}px;
       background:linear-gradient(90deg,transparent,${C.gold},transparent);opacity:.85}
    .s{font-family:Hanken,sans-serif;color:${C.goldBright};font-size:${sub}px;
       letter-spacing:${(sub * 0.34).toFixed(1)}px;text-transform:uppercase;
       white-space:nowrap;opacity:.95}
  </style></head><body><div class="bg">${stars}<div class="vig"></div>
    <div class="mid">
      <div class="logo">${logo}</div>
      <div class="r"></div>
      <div class="s">Prayer times &middot; Qibla &middot; Qur&rsquo;an &middot; Bolton</div>
    </div></div></body></html>`;
}

function render(name, w, h, opts) {
  const scale = 2;
  const page = path.join(OUT, `${name}.html`);
  fs.writeFileSync(page, html(w / scale, h / scale, opts));
  execFileSync(CHROME, [
    "--headless", "--disable-gpu", "--no-sandbox", "--hide-scrollbars",
    `--force-device-scale-factor=${scale}`,
    `--window-size=${w / scale},${h / scale}`,
    `--screenshot=${path.join(OUT, `${name}.png`)}`,
    `file://${page}`,
  ], { stdio: ["ignore", "ignore", "pipe"] });
  fs.rmSync(page);

  const f = path.join(OUT, `${name}.png`);
  const d = fs.readFileSync(f);
  const gw = d.readUInt32BE(16), gh = d.readUInt32BE(20);
  if (gw !== w || gh !== h) throw new Error(`${name}: rendered ${gw}x${gh}, wanted ${w}x${h}`);
  console.log(`${name}.png  ${gw}x${gh}  ${Math.round(d.length / 1024)}KB`);
}

fs.mkdirSync(OUT, { recursive: true });
/* Proportions are set per shape rather than scaled from one, because the two
 * are 16:9 and 7:3 and a composition tuned for one looks starved in the other. */
render("app-store-header-5244x2950", 5244, 2950, { logoW: 1000, rule: 1180, sub: 50 });
render("app-store-header-3840x1646", 3840, 1646, { logoW: 620, rule: 820, sub: 34 });
