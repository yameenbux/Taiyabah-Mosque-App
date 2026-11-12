/**
 * Taiyabah Masjid — is the poster on disk the poster the repository describes?
 * Copyright (c) 2026 Yameen Bux. All rights reserved. See LICENSE.md.
 *
 * Everything the artwork depends on, reduced to one hash per part: the words,
 * the three URLs, the three module matrices, and the screenshot's bytes. The
 * builder writes these beside the PDF; the check recomputes them and names
 * WHICH part moved, because "the poster is stale" is not enough to act on
 * when the poster has four independent sources.
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { QR } from "./app-poster-qr.mjs";
import * as C from "./app-poster-content.mjs";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

const sha = s => crypto.createHash("sha256").update(s).digest("hex").slice(0, 16);

export function fingerprint() {
  /* Every string the poster prints. Spelled out rather than looped over the
     module, so that adding an export without adding it here is a visible
     omission — and named rather than positional, so a rename cannot quietly
     drop a line from the hash. C.EYEBROW did exactly that: it had been
     renamed, JSON.stringify turned the missing value into null, and the
     kicker, tagline, blurb and pills stopped being tracked at all. */
  const words = JSON.stringify({
    KICKER: C.KICKER, LEAD_1: C.LEAD_1, LEAD_2: C.LEAD_2, TAG: C.TAG,
    BLURB: C.BLURB, PILLS: C.PILLS, THINGS: C.THINGS,
    SCAN_HEAD: C.SCAN_HEAD, SCAN_SUB: C.SCAN_SUB,
    WAYS: C.WAYS, MASJID: C.MASJID, CHARITY: C.CHARITY,
  });
  for (const [k, v] of Object.entries(JSON.parse(words)))
    if (v === null || v === undefined) throw new Error(`app-poster: ${k} is not exported — the fingerprint would not track it`);
  const urls = C.WAYS.map(w => `${w.key}=${QR[w.key].url}`).join("\n");
  const codes = C.WAYS.map(w => `${w.key}:${QR[w.key].size}:${QR[w.key].rows.join("")}`).join("\n");
  const shot = fs.readFileSync(path.join(ROOT, C.SHOT));
  /* The store badges too: they are files somebody could swap for a redrawn
     one, and a redrawn badge is a trademark problem rather than a typo. */
  const badges = C.WAYS.map(w => `${w.key}:${sha(fs.readFileSync(path.join(ROOT, w.badge)))}`).join("\n");
  return { words: sha(words), urls: sha(urls), codes: sha(codes), shot: sha(shot), badges: sha(badges) };
}

export const PARTS = {
  words: "the poster's wording (scripts/lib/app-poster-content.mjs)",
  urls:  "the store links (scripts/lib/app-poster-qr.mjs)",
  codes: "the QR module matrices (scripts/lib/app-poster-qr.mjs)",
  shot:  "the home-screen picture (docs/store-assets/poster/app-home.png)",
  badges:"an App Store or Google Play badge (docs/store-assets/poster/badges/)",
};

/* A QR code with a bit flipped still looks like a QR code, so this checks the
 * three things every symbol must have, at the three places the spec puts them.
 * It cannot prove a code carries the right URL — only a decoder does that, and
 * that happens at build time — but it does catch a matrix edited by hand or
 * mangled by a merge, which is the failure this file can see. */
export function wellFormed(code) {
  const n = code.size, at = (x, y) => code.rows[y][x] === "1";
  const faults = [];
  if (code.rows.length !== n) faults.push(`${code.rows.length} rows for a ${n}-module symbol`);
  for (const r of code.rows) if (r.length !== n) { faults.push("a row is the wrong length"); break; }
  if (faults.length) return faults;

  /* Three 7x7 finder patterns: top-left, top-right, bottom-left. */
  for (const [ox, oy, where] of [[0, 0, "top-left"], [n - 7, 0, "top-right"], [0, n - 7, "bottom-left"]]) {
    let ok = true;
    for (let y = 0; y < 7 && ok; y++) for (let x = 0; x < 7; x++) {
      const ring = x === 0 || x === 6 || y === 0 || y === 6;
      const core = x >= 2 && x <= 4 && y >= 2 && y <= 4;
      if (at(ox + x, oy + y) !== (ring || core)) { ok = false; break; }
    }
    if (!ok) faults.push(`the ${where} finder pattern is damaged`);
  }

  /* The timing patterns, which alternate dark and light along row and column 6. */
  for (let i = 8; i < n - 8; i++) {
    if (at(i, 6) !== (i % 2 === 0)) { faults.push("the horizontal timing pattern is broken"); break; }
  }
  for (let i = 8; i < n - 8; i++) {
    if (at(6, i) !== (i % 2 === 0)) { faults.push("the vertical timing pattern is broken"); break; }
  }

  /* The dark module, which is always set, always just above the bottom-left
     finder's format strip. */
  if (!at(8, n - 8)) faults.push("the dark module is not set");

  return faults;
}
