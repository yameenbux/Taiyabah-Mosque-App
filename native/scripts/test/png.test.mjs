/**
 * Taiyabah Masjid — the screenshot reader has to read screenshots.
 * Copyright (c) 2026 Yameen Bux. All rights reserved. See LICENSE.md.
 *
 * scripts/png.mjs decides whether the iOS app drew anything, so a bug in it
 * either waves a broken build through or fails a good one. It un-filters PNG
 * rows by hand — five predictors, one of which (Paeth) is easy to get subtly
 * wrong in a way that still produces a plausible-looking image.
 *
 * So these tests build PNGs here, forcing each row filter in turn, and require
 * the decoder to return the exact bytes that went in. The encoder below is
 * written straight from the spec and shares no code with the decoder.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import zlib from "node:zlib";
import { decode, colours, ascii, palette, dominant } from "../png.mjs";

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "png-test-"));
const file = name => path.join(tmp, name);

const crcTable = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();
const crc32 = buf => {
  let c = -1;
  for (const b of buf) c = crcTable[(c ^ b) & 0xFF] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
};
const chunk = (type, data) => {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
};

/** Write a PNG with every row encoded using one chosen filter. */
function write(name, rows, channels, filter) {
  const h = rows.length, w = rows[0].length / channels;
  const stride = w * channels;
  const raw = Buffer.alloc(h * (stride + 1));
  let prev = new Uint8Array(stride);
  for (let y = 0; y < h; y++) {
    const cur = Uint8Array.from(rows[y]);
    raw[y * (stride + 1)] = filter;
    for (let i = 0; i < stride; i++) {
      const a = i >= channels ? cur[i - channels] : 0;
      const b = prev[i];
      const c = i >= channels ? prev[i - channels] : 0;
      let v;
      switch (filter) {
        case 0: v = cur[i]; break;
        case 1: v = cur[i] - a; break;
        case 2: v = cur[i] - b; break;
        case 3: v = cur[i] - ((a + b) >> 1); break;
        default: {
          const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
          v = cur[i] - (pa <= pb && pa <= pc ? a : pb <= pc ? b : c);
        }
      }
      raw[y * (stride + 1) + 1 + i] = v & 0xFF;
    }
    prev = cur;
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = channels === 4 ? 6 : 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const p = file(name);
  fs.writeFileSync(p, Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]),
    chunk("IHDR", ihdr), chunk("IDAT", zlib.deflateSync(raw)), chunk("IEND", Buffer.alloc(0)),
  ]));
  return p;
}

/* A fixed pseudo-random field, so a failure is reproducible. Taken from the
   HIGH bits: the low bits of a linear congruential generator have a short
   period, and a first attempt at this produced 54 distinct colours across
   1600 pixels — a poor fixture for a test about counting colours. */
const rows = (w, h, channels) => {
  let seed = 1337;
  const rand = () => ((seed = (seed * 1103515245 + 12345) & 0x7FFFFFFF) >>> 15) & 0xFF;
  return Array.from({ length: h }, () =>
    Array.from({ length: w * channels }, () => rand()));
};

for (const filter of [0, 1, 2, 3, 4]) {
  const name = ["None", "Sub", "Up", "Average", "Paeth"][filter];
  test(`row filter ${filter} (${name}) decodes to exactly the bytes encoded`, () => {
    const src = rows(23, 11, 3);
    const img = decode(write(`f${filter}.png`, src, 3, filter));
    assert.equal(img.width, 23);
    assert.equal(img.height, 11);
    assert.equal(img.channels, 3);
    const want = Buffer.from(src.flat());
    assert.ok(img.pixels.equals(want), `filter ${filter} (${name}) did not round-trip`);
  });
}

test("RGBA decodes, and the alpha channel does not disturb the colour count", () => {
  const src = rows(16, 9, 4);
  const img = decode(write("rgba.png", src, 4, 4));
  assert.equal(img.channels, 4);
  assert.ok(img.pixels.equals(Buffer.from(src.flat())));
});

test("a flat fill is one colour and a noisy field is many", () => {
  const flat = Array.from({ length: 20 }, () => Array(30 * 3).fill(0x77));
  assert.equal(colours(decode(write("flat.png", flat, 3, 0))), 1);
  const noisy = decode(write("noisy.png", rows(40, 40, 3), 3, 4));
  assert.ok(colours(noisy) > 500, `expected a noisy field to have many colours, got ${colours(noisy)}`);
});

test("a box is clamped to the image rather than reading past it", () => {
  const img = decode(write("clamp.png", rows(10, 10, 3), 3, 0));
  assert.equal(colours(img, -50, -50, 500, 500), colours(img));
  assert.equal(colours(img, 100, 100, 10, 10), 0);
});

test("the bottom strip of a flat image is flat, which is how a splash screen is caught", () => {
  /* The iOS check reads the bottom 12% and insists the tab bar put ink there. */
  const h = 100, w = 40;
  const field = Array.from({ length: h }, (_, y) =>
    y < 80 ? Array.from({ length: w * 3 }, (_, i) => (i * 7 + y * 13) % 256)
           : Array(w * 3).fill(0xF6));
  const img = decode(write("splash.png", field, 3, 0));
  assert.ok(colours(img) > 100, "the top of the image should be busy");
  assert.equal(colours(img, 0, 88, w, 12), 1, "the bottom should be a flat fill");
});

test("a file that is not a PNG is refused rather than misread", () => {
  const bad = file("bad.png");
  fs.writeFileSync(bad, Buffer.from("this is not a png at all"));
  assert.throws(() => decode(bad), /not a PNG/);
});

test("the ascii view has the shape asked for and runs dark to light", () => {
  const h = 40, w = 20;
  /* Dark on the top half, light on the bottom — the way a screen with a dark
     hero over cream content looks, which is what this is read for. */
  const field = Array.from({ length: h }, (_, y) =>
    Array(w * 3).fill(y < h / 2 ? 10 : 245));
  const img = decode(write("half.png", field, 3, 0));
  const art = ascii(img, 10, 8).split("\n");
  assert.equal(art.length, 8, "wrong number of rows");
  assert.ok(art.every(l => l.length === 10), "wrong number of columns");
  assert.equal(art[0], " ".repeat(10), "a dark band should be the darkest character");
  assert.equal(art[7], "@".repeat(10), "a light band should be the lightest character");
});

test("the palette names the dominant colour and its share", () => {
  const h = 20, w = 10;
  /* Three quarters one colour, one quarter another. */
  const field = Array.from({ length: h }, (_, y) =>
    Array.from({ length: w * 3 }, (_, i) =>
      y < 15 ? [0x77, 0x21, 0x57][i % 3] : [0xF6, 0xF1, 0xE7][i % 3]));
  const p = palette(decode(write("pal.png", field, 3, 0)), 2);
  assert.match(p[0], /^#772157 75\.0%$/, `got ${p[0]}`);
  assert.match(p[1], /^#f6f1e7 25\.0%$/, `got ${p[1]}`);
});

test("the dominant colour is what catches a React Native error screen", () => {
  /* A wall of black with a red band across it: not blank, not a splash, and
     it passed five green iOS runs because nothing was looking for it. */
  const h = 100, w = 40;
  const field = Array.from({ length: h }, (_, y) =>
    Array.from({ length: w * 3 }, (_, i) =>
      y >= 8 && y < 26 ? [0xD1, 0x19, 0x26][i % 3] : 0));
  const top = dominant(decode(write("redbox.png", field, 3, 0)));
  assert.equal(top.hex, "#000000");
  assert.ok(top.share > 0.4, `black covered only ${(top.share * 100).toFixed(0)}%`);
  assert.ok(top.r < 16 && top.g < 16 && top.b < 16, "should read as near-black");

  /* And the app's own lightest surface must not trip the same rule. */
  const cream = Array.from({ length: h }, () =>
    Array.from({ length: w * 3 }, (_, i) => [0xF6, 0xF1, 0xE7][i % 3]));
  const light = dominant(decode(write("cream.png", cream, 3, 0)));
  assert.ok(!(light.r < 16 && light.g < 16 && light.b < 16), "cream must not read as black");
});
