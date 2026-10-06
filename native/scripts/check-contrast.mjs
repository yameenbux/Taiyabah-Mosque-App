/**
 * Taiyabah Masjid — no new colour may be unreadable on the dark page.
 * Copyright (c) 2026 Yameen Bux. All rights reserved. See LICENSE.md.
 *
 * WHY THIS EXISTS.
 *
 * Most colours in the app are palette tokens and switch with the theme.
 * A few are hex literals, because the website gives a particular element a
 * particular colour and that value is the record of what the web app does.
 * Those do NOT switch, and a pale ground or a dark ink written for the light
 * theme is invisible on the dark one.
 *
 * Two earlier sweeps of this missed four of them, both times for the same
 * reason: they keyed off the property name, and the Donate tier labels are
 * written `ink: "#8E5730"` inside a data array, nowhere near a `color:`. So
 * this one reads EVERY literal in the source, whatever it is attached to, and
 * measures it against the dark card.
 *
 * Below 4.5:1 is not automatically wrong — a surface is supposed to be down
 * there, and so is a border, a dot or a shadow. It is wrong for TEXT. A
 * machine cannot tell those apart, so each one is listed below with the
 * reason it is allowed, and anything NOT on the list fails. That way a new
 * literal has to be looked at once, by somebody, rather than discovered on a
 * phone at night.
 *
 *   node scripts/check-contrast.mjs
 */
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const DARK_CARD = "#24091A";

/* Every literal that measures below 4.5:1 on the dark card AND is allowed to,
 * with the reason. A surface, a border, a dot, an icon or a shadow may sit
 * here; a line of text may not. */
const ALLOWED = {
  "#1B1119": "the notice image's letterbox — a dark mat in both themes",
  "#15060F": "the muṣḥaf reader's page ground, deliberately near-black in both",
  "#000":    "a shadow",
  "#3A2A08": "near-black ON THE SOLID GOLD button, which stays gold at night",
  "#3A2C07": "near-black ON THE SOLID GOLD 'Now' pill, same",
  "#7A2A18": "the funeral panel, solid dark red by design in both themes",
  "#5A1D10": "the same panel's lower stop",
  "#0C3B2A": "the Kaʿbah tile on the compass dial — a drawn object",
  "#4B3542": "the volume slider's unfilled track, which sits on the dark hero",
  "#3F7D58": "the free/open marker — a border, a dot and a key swatch, never text",
  "#C25B5B": "the 'Closed' key swatch, a square of colour beside its label",
  "#2E8C56": "a 32px confirmation tick — a large graphic, not body text",
  /* The four Donate tiers carry BOTH ends of their metal — `ink` the dark end
     and `line` the pale one — and the label picks between them with
     dual(x.ink, x.line). This check reads literals where they are WRITTEN,
     which for these is a data array nowhere near that call, so it cannot see
     that they are handled. Checked by hand: the dark end is never drawn at
     night. */
  "#8E5730": "Bronze's dark end; the label uses dual(x.ink, x.line)",
  "#6E656B": "Silver's dark end, same",
  "#7A5D14": "Gold's dark end, same",
  "#7C5E71": "Platinum's dark end, same",
  /* The compass dial used to be pinned to cream in both themes and needed
     three exemptions here. It follows the theme now, through dual(), which
     this check already skips — so only the OTHER uses of these two remain. */
  "#F6F2E6": "the gold button's label, on a button that stays gold at night",
  "#FFFFFF": "white on a filled plum control, and a switch's thumb",
  "#fff":    "white on a filled plum control",
};

const files = [];
(function walk(d) {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f);
    if (fs.statSync(p).isDirectory()) { if (!/node_modules|dist|android|\.expo/.test(p)) walk(p); }
    else if (/\.jsx?$/.test(f)) files.push(p);
  }
})(path.join(root, "src"));

const lum = hex => {
  const h = hex.replace("#", "");
  const f = h.length === 3 ? h.split("").map(c => c + c).join("") : h;
  const [r, g, b] = [0, 2, 4].map(i => parseInt(f.slice(i, i + 2), 16) / 255)
    .map(c => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a, b) => {
  const [hi, lo] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (hi + 0.05) / (lo + 0.05);
};

const bad = [];
const seen = new Set();
for (const file of files) {
  if (/theme\.js|Boundary\.jsx/.test(file)) continue;   // the palettes, and a fallback that must not theme
  fs.readFileSync(file, "utf8").split("\n").forEach((line, i) => {
    const t = line.trimStart();
    if (t.startsWith("*") || t.startsWith("/*") || t.startsWith("//")) return;
    for (const m of line.matchAll(/"(#[0-9A-Fa-f]{3,6})"/g)) {
      /* dual() already names what the colour becomes at night. */
      if (line.slice(0, m.index).includes("dual(")) continue;
      const hex = m[1];
      seen.add(hex);
      if (ratio(hex, DARK_CARD) >= 4.5) continue;
      if (ALLOWED[hex]) continue;
      bad.push({ file: path.relative(root, file), line: i + 1, hex,
                 r: ratio(hex, DARK_CARD), src: line.trim().slice(0, 90) });
    }
  });
}

for (const b of bad)
  console.log(`FAIL  ${b.file}:${b.line}  ${b.hex} is ${b.r.toFixed(2)}:1 on the dark card\n      ${b.src}`);
if (bad.length) {
  console.log(`\n${bad.length} literal(s) would be unreadable as text at night.`);
  console.log("If it IS text, wrap it: dual(\"" + bad[0].hex + "\", C.something).");
  console.log("If it is a surface, a border, a dot or an icon, add it to ALLOWED with the reason.");
  process.exit(1);
}
/* An entry nobody uses any more is a stale excuse, so say so. */
const stale = Object.keys(ALLOWED).filter(h => !seen.has(h));
if (stale.length) console.log(`note: ALLOWED still lists ${stale.join(", ")}, which the app no longer uses`);
console.log(`every colour literal in ${files.length} files either reads at night or says why it need not`);
