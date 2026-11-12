/**
 * Taiyabah Masjid — the download poster must match the repository.
 * Copyright (c) 2026 Yameen Bux. All rights reserved. See LICENSE.md.
 *
 *   node scripts/check-app-poster.mjs
 *
 * WHAT GOES WRONG WITHOUT THIS. A poster is printed once and stays on a wall
 * for a year. Four things behind it can move — the wording, the two store
 * links, the QR matrices, the home-screen picture — and when any of them does,
 * the PDF in poster/ silently becomes a picture of how things used to be. The
 * holiday planner had exactly this problem and got exactly this check.
 *
 * WHAT THIS CANNOT DO. It cannot tell you a QR code carries the right URL.
 * Nothing short of a decoder can, and the decoder runs where the artwork is
 * made, not here — see docs/app-poster.md. What it can do is prove the three
 * symbols are still structurally symbols, and that the PDF on disk was built
 * from the words, links, matrices and picture that are in the tree now.
 */
import fs from "node:fs";
import path from "node:path";
import { QR } from "./lib/app-poster-qr.mjs";
import * as C from "./lib/app-poster-content.mjs";
import { fingerprint, wellFormed, PARTS, ROOT } from "./lib/app-poster-fingerprint.mjs";

const SLUG = "taiyabah-app-poster";
const OUT = path.join(ROOT, "poster");
const faults = [];

/* 1. The artwork exists at all. */
for (const ext of ["pdf", "png", "json"]) {
  const f = path.join(OUT, `${SLUG}.${ext}`);
  if (!fs.existsSync(f)) faults.push(`poster/${SLUG}.${ext} is missing — run node scripts/build-app-poster.mjs`);
}

/* 2. The three codes are still QR codes. */
for (const w of C.WAYS) {
  const code = QR[w.key];
  if (!code) { faults.push(`${w.name} has no QR entry under "${w.key}"`); continue; }
  for (const f of wellFormed(code)) faults.push(`${w.name}: ${f}`);
}

/* 3. Every URL is one, is https, and is not a placeholder somebody meant to
      come back to. A QR code pointing at http:// on a printed poster is a
      downgrade nobody can take back. */
for (const w of C.WAYS) {
  const url = QR[w.key]?.url ?? "";
  if (!/^https:\/\/[^\s]+$/.test(url)) faults.push(`${w.name}: "${url}" is not an https URL`);
  if (/example\.|localhost|TODO|XXX/i.test(url)) faults.push(`${w.name}: "${url}" looks like a placeholder`);
}

/* 4. The PDF on disk was built from what is in the tree now. */
if (fs.existsSync(path.join(OUT, `${SLUG}.json`))) {
  const was = JSON.parse(fs.readFileSync(path.join(OUT, `${SLUG}.json`), "utf8")).fingerprint ?? {};
  const now = fingerprint();
  for (const k of Object.keys(now)) {
    if (was[k] !== now[k]) faults.push(`STALE — ${PARTS[k]} changed since the poster was built`);
  }
}

/* 5. The links the website offers and the ones on the poster are the same
      links. A poster saying one thing while the site says another is how a
      store listing ends up with two different URLs in circulation. */
const html = path.join(ROOT, "index.html");
if (fs.existsSync(html)) {
  const page = fs.readFileSync(html, "utf8");
  for (const w of C.WAYS) {
    const url = QR[w.key].url;
    const host = url.split("/")[2];
    if (page.includes(host) && !page.includes(url))
      faults.push(`index.html links to ${host} but not to ${url} — the poster and the website disagree`);
  }
}

if (faults.length) {
  console.error("app poster:");
  for (const f of faults) console.error(`  ${f}`);
  process.exit(1);
}
console.log(`app poster: ok — ${C.WAYS.length} codes, ${C.THINGS.length} lines, built from the current tree`);
