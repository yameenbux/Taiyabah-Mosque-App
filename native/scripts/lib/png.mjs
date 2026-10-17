/**
 * Taiyabah Masjid — just enough PNG to look at the pixels.
 * Copyright (c) 2026 Yameen Bux. All rights reserved. See LICENSE.md.
 *
 * WHY THIS EXISTS. Two checks in this directory need to know what colour a
 * pixel actually came out, and neither can take a dependency to find out:
 * check-app-icon.mjs measures the lockup inside the icon, and
 * store-frames.mjs proves the background of a marketing panel reaches the
 * bottom edge. Both ran their own copy of the same forty lines, which is one
 * copy too many for something this fiddly to get right.
 *
 * It handles what Chromium and the icon pipeline emit — 8-bit greyscale, RGB,
 * and either of those with alpha, non-interlaced — and nothing else, because
 * nothing else turns up here and a decoder that pretends to be general is a
 * decoder with untested branches in it.
 */
import fs from "node:fs";
import zlib from "node:zlib";

/* Returns { w, h, ch, stride, px, alpha }, where px is the unfiltered
 * scanlines: channel `c` of pixel (x, y) is px[y * stride + x * ch + c]. */
export function decode(file) {
  const d = fs.readFileSync(file);
  if (d.readUInt32BE(0) !== 0x89504e47) throw new Error(`${file}: not a PNG`);
  let pos = 8, idat = [], w, h, ct, bits, interlace;
  while (pos < d.length) {
    const len = d.readUInt32BE(pos), typ = d.toString("latin1", pos + 4, pos + 8);
    if (typ === "IHDR") {
      w = d.readUInt32BE(pos + 8); h = d.readUInt32BE(pos + 12);
      bits = d[pos + 16]; ct = d[pos + 17]; interlace = d[pos + 20];
    } else if (typ === "IDAT") idat.push(d.subarray(pos + 8, pos + 8 + len));
    pos += 12 + len;
  }
  const ch = { 0: 1, 2: 3, 4: 2, 6: 4 }[ct];
  /* Said out loud rather than quietly mis-decoded: a palette or 16-bit image
     would otherwise come back as plausible-looking nonsense. */
  if (!ch) throw new Error(`${file}: colour type ${ct} is not supported`);
  if (bits !== 8) throw new Error(`${file}: ${bits}-bit samples are not supported`);
  if (interlace) throw new Error(`${file}: interlaced PNGs are not supported`);

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
  return { w, h, ch, stride, px, alpha: ct === 4 || ct === 6 };
}

/* The pixel at (x, y) as [r, g, b], whatever the channel count. */
export function rgb(img, x, y) {
  const o = y * img.stride + x * img.ch;
  return img.ch <= 2 ? [img.px[o], img.px[o], img.px[o]]
                     : [img.px[o], img.px[o + 1], img.px[o + 2]];
}
