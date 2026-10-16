/**
 * Taiyabah Masjid — the two app icons are each sized for the platform that
 * masks them.
 * Copyright (c) 2026 Yameen Bux. All rights reserved. See LICENSE.md.
 *
 * ONE FILE USED TO SERVE BOTH, AND IT COULD ONLY SUIT ONE.
 *
 * Android composites an adaptive icon and then masks it, keeping roughly the
 * middle two thirds — a circle of 66% of the canvas. iOS masks nothing: it
 * rounds the corners and shows the rest. assets/icon.png was sized for
 * Android (a 555x394 lockup in 1024, bounding diagonal 681px against a 682px
 * safe circle — not a coincidence), which on iOS left more than half the icon
 * empty and rendered "MASJID" at about two points on a home screen.
 *
 * So there are two files now, and the thing that can silently go wrong is
 * pointing one of them at the wrong platform. This measures the artwork in
 * each and says which mask it survives.
 *
 * It also refuses an iOS icon with an alpha channel, which App Store Connect
 * rejects at submission rather than at build — the slowest possible place to
 * find out.
 */
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const root = path.resolve(import.meta.dirname, "..");
const expo = JSON.parse(fs.readFileSync(path.join(root, "app.json"), "utf8")).expo;
const fail = [];
const say = m => fail.push(m);

/** Decode a PNG far enough to find the artwork inside the flat background. */
function measure(file) {
  const d = fs.readFileSync(file);
  let pos = 8, idat = [], w, h, ct;
  while (pos < d.length) {
    const len = d.readUInt32BE(pos), typ = d.toString("latin1", pos + 4, pos + 8);
    if (typ === "IHDR") { w = d.readUInt32BE(pos + 8); h = d.readUInt32BE(pos + 12); ct = d[pos + 17]; }
    else if (typ === "IDAT") idat.push(d.subarray(pos + 8, pos + 8 + len));
    pos += 12 + len;
  }
  const ch = { 0: 1, 2: 3, 4: 2, 6: 4 }[ct];
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const stride = w * ch, px = Buffer.alloc(stride * h);
  let i = 0;
  for (let y = 0; y < h; y++) {
    const f = raw[i++];
    for (let x = 0; x < stride; x++) {
      const v = raw[i + x];
      const a = x >= ch ? px[y * stride + x - ch] : 0;
      const b = y ? px[(y - 1) * stride + x] : 0;
      const c = x >= ch && y ? px[(y - 1) * stride + x - ch] : 0;
      let out = v;
      if (f === 1) out = v + a;
      else if (f === 2) out = v + b;
      else if (f === 3) out = v + ((a + b) >> 1);
      else if (f === 4) {
        const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
        out = v + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c);
      }
      px[y * stride + x] = out & 255;
    }
    i += stride;
  }
  const bg = [px[0], px[1], px[2]];
  let minx = w, miny = h, maxx = -1, maxy = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const o = y * stride + x * ch;
    if (Math.abs(px[o] - bg[0]) + Math.abs(px[o + 1] - bg[1]) + Math.abs(px[o + 2] - bg[2]) > 24) {
      if (x < minx) minx = x; if (x > maxx) maxx = x;
      if (y < miny) miny = y; if (y > maxy) maxy = y;
    }
  }
  return { w, h, alpha: ct === 4 || ct === 6,
           aw: maxx - minx + 1, ah: maxy - miny + 1,
           offx: (minx + maxx) / 2 - w / 2, offy: (miny + maxy) / 2 - h / 2 };
}

const rel = p => path.join(root, p.replace(/^\.\//, ""));
const iosIcon = expo.icon;
const androidFg = expo.android?.adaptiveIcon?.foregroundImage;

if (!iosIcon || !androidFg) say("app.json is missing icon or android.adaptiveIcon.foregroundImage");
else if (iosIcon === androidFg)
  say(`icon and android.adaptiveIcon.foregroundImage are the same file (${iosIcon}). ` +
      `One of the two platforms is being short-changed: sized for Android's mask it is ` +
      `tiny on iOS, sized for iOS it is cropped on Android.`);
else {
  const ios = measure(rel(iosIcon));
  const and = measure(rel(androidFg));

  if (ios.alpha)
    say(`${iosIcon} has an alpha channel. App Store Connect rejects that at submission.`);

  const share = ios.aw / ios.w;
  if (share < 0.6)
    say(`${iosIcon}: the artwork is only ${(share * 100).toFixed(0)}% of the canvas. ` +
        `iOS does not mask the icon, so this reads as a small mark floating in a square — ` +
        `the smallest line of it is unreadable on a home screen.`);

  const SAFE = 0.666;
  const diag = Math.hypot(and.aw, and.ah);
  if (diag > SAFE * and.w)
    say(`${androidFg}: the artwork's bounding diagonal is ${diag.toFixed(0)}px against Android's ` +
        `${(SAFE * and.w).toFixed(0)}px safe circle. It will be cropped by the adaptive-icon mask.`);

  for (const [name, m] of [[iosIcon, ios], [androidFg, and]])
    if (Math.abs(m.offx) > 6 || Math.abs(m.offy) > 6)
      say(`${name}: the artwork is off centre by ${m.offx.toFixed(0)},${m.offy.toFixed(0)}px.`);

  if (!fail.length)
    console.log(`the iOS icon fills ${(share * 100).toFixed(0)}% of its canvas with no alpha, ` +
                `and the Android foreground fits inside the adaptive mask`);
}

if (fail.length) {
  console.error(`\n${fail.length} problem(s) with the app icons:\n`);
  for (const m of fail) console.error("  " + m);
  console.error("");
  process.exit(1);
}
