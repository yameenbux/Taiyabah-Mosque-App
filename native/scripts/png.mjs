/**
 * Taiyabah Masjid — read a PNG without asking the runner for anything.
 * Copyright (c) 2026 Yameen Bux. All rights reserved. See LICENSE.md.
 *
 * The Android smoke job counts colours in a screenshot by shelling out to
 * ImageMagick, and guards itself with "no ImageMagick on this runner, so this
 * could not be checked" — which is correct, and still a check that evaporates
 * on a runner image change. The iOS job runs on macOS, where ImageMagick is
 * not a given at all.
 *
 * A PNG is an IHDR, some zlib, and a filter byte per row. Node has zlib. So
 * there is no reason to depend on anything: 8-bit RGB and RGBA, no interlace,
 * which is what every screenshot tool on every platform here produces.
 */
import fs from "node:fs";
import zlib from "node:zlib";

const SIG = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);

/** Decode to { width, height, channels, pixels } with pixels as raw bytes. */
export function decode(file) {
  const b = fs.readFileSync(file);
  if (!b.subarray(0, 8).equals(SIG)) throw new Error(`${file} is not a PNG`);

  let width = 0, height = 0, depth = 0, colourType = 0, interlace = 0;
  const idat = [];
  for (let p = 8; p + 8 <= b.length; ) {
    const len = b.readUInt32BE(p);
    const type = b.toString("ascii", p + 4, p + 8);
    const data = b.subarray(p + 8, p + 8 + len);
    if (type === "IHDR") {
      width = data.readUInt32BE(0); height = data.readUInt32BE(4);
      depth = data[8]; colourType = data[9]; interlace = data[12];
    } else if (type === "IDAT") idat.push(data);
    else if (type === "IEND") break;
    p += 12 + len;
  }
  if (depth !== 8) throw new Error(`${file} is ${depth}-bit; only 8-bit is supported`);
  if (interlace) throw new Error(`${file} is interlaced; only non-interlaced is supported`);
  const channels = colourType === 2 ? 3 : colourType === 6 ? 4 : 0;
  if (!channels) throw new Error(`${file} has colour type ${colourType}; only RGB and RGBA are supported`);

  const raw = zlib.inflateSync(Buffer.concat(idat));
  const stride = width * channels;
  const out = Buffer.alloc(height * stride);

  /* Undo the per-row filter. Each row is prefixed by one filter byte and is
     predicted from the pixel to its left (a) and the row above (b/c). */
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    const src = y * (stride + 1) + 1;
    const dst = y * stride, up = dst - stride;
    for (let i = 0; i < stride; i++) {
      const x = raw[src + i];
      const a = i >= channels ? out[dst + i - channels] : 0;
      const u = y > 0 ? out[up + i] : 0;
      const c = y > 0 && i >= channels ? out[up + i - channels] : 0;
      let v;
      switch (filter) {
        case 0: v = x; break;
        case 1: v = x + a; break;
        case 2: v = x + u; break;
        case 3: v = x + ((a + u) >> 1); break;
        case 4: {
          const pp = a + u - c, pa = Math.abs(pp - a), pb = Math.abs(pp - u), pc = Math.abs(pp - c);
          v = x + (pa <= pb && pa <= pc ? a : pb <= pc ? u : c);
          break;
        }
        default: throw new Error(`unknown PNG row filter ${filter} on row ${y}`);
      }
      out[dst + i] = v & 0xFF;
    }
  }
  return { width, height, channels, pixels: out };
}

/**
 * How many distinct colours appear in a box. An area that drew something has
 * strokes and antialiasing, so dozens; a flat fill has one or two.
 * The box is clamped to the image, so a caller may be approximate.
 */
export function colours(img, x = 0, y = 0, w = img.width, h = img.height) {
  const x0 = Math.max(0, Math.min(img.width, Math.round(x)));
  const y0 = Math.max(0, Math.min(img.height, Math.round(y)));
  const x1 = Math.max(x0, Math.min(img.width, Math.round(x + w)));
  const y1 = Math.max(y0, Math.min(img.height, Math.round(y + h)));
  const seen = new Set();
  const { pixels: p, channels: c, width } = img;
  for (let yy = y0; yy < y1; yy++) {
    const row = yy * width * c;
    for (let xx = x0; xx < x1; xx++) {
      const i = row + xx * c;
      seen.add((p[i] << 16) | (p[i + 1] << 8) | p[i + 2]);
    }
  }
  return seen.size;
}

/**
 * A coarse picture of an image, as text.
 *
 * CI artefacts are not always reachable from where the diagnosis happens — the
 * GitHub client here refuses the redirect to blob storage — but the job log
 * always is. So when a screenshot needs looking at rather than measuring, it
 * can be printed. Brightness only; the ramp runs dark to light.
 */
export function ascii(img, cols = 32, rows = 56) {
  const RAMP = " .:-=+*#%@";
  const cw = img.width / cols, ch = img.height / rows;
  const out = [];
  for (let r = 0; r < rows; r++) {
    let line = "";
    for (let c = 0; c < cols; c++) {
      /* One sample per cell from its middle: enough to see shape, and cheap. */
      const x = Math.min(img.width - 1, Math.floor((c + 0.5) * cw));
      const y = Math.min(img.height - 1, Math.floor((r + 0.5) * ch));
      const i = (y * img.width + x) * img.channels;
      const lum = (img.pixels[i] * 0.299 + img.pixels[i + 1] * 0.587 + img.pixels[i + 2] * 0.114) / 255;
      line += RAMP[Math.min(RAMP.length - 1, Math.round(lum * (RAMP.length - 1)))];
    }
    out.push(line);
  }
  return out.join("\n");
}

/** The most common colours and what share of the image each covers. */
export function palette(img, top = 6) {
  const count = new Map();
  const { pixels: p, channels: c } = img;
  const total = img.width * img.height;
  for (let i = 0; i < p.length; i += c) {
    const k = (p[i] << 16) | (p[i + 1] << 8) | p[i + 2];
    count.set(k, (count.get(k) || 0) + 1);
  }
  return [...count.entries()].sort((a, b) => b[1] - a[1]).slice(0, top)
    .map(([k, n]) => `#${k.toString(16).padStart(6, "0")} ${(100 * n / total).toFixed(1)}%`);
}
