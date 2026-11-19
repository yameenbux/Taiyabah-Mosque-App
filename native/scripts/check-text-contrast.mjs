/**
 * Taiyabah Masjid — the light theme's TEXT tokens must stay readable.
 *
 * check-contrast.mjs guards hex LITERALS against the dark card — the night
 * theme. It deliberately skips theme.js and never looks at a palette token
 * used as text, so it could not see that `muted` read at only 4.28:1 on paper,
 * or that a gold label on a cream card was 2.3:1. This check closes that gap
 * from the other side: it reads the LIGHT palette and measures each token that
 * is used as TEXT against each light surface it is drawn on, and fails if any
 * drops below the 4.5:1 WCAG AA needs for body text.
 *
 * It is a palette check, not a usage check — it keeps `muted` and the rest from
 * being lightened back. It cannot catch a NEW misuse of a surface/accent token
 * as text (e.g. `color: C.gold` on a light card); that is for review and for
 * the eye. `gold`/`goldBright` are the gold-on-DARK accents and are not listed
 * here — gold text on a light ground uses `goldInk`, which is.
 *
 *   node scripts/check-text-contrast.mjs
 */
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const src = fs.readFileSync(path.join(root, "src", "theme.js"), "utf8");

/* Pull the LIGHT object's `name: "#hex"` pairs. The block runs from
   `export const LIGHT = {` to the first line that is just `};`. */
const start = src.indexOf("export const LIGHT = {");
if (start < 0) { console.log("check-text-contrast: could not find the LIGHT palette"); process.exit(1); }
const block = src.slice(start, src.indexOf("\n};", start));
const C = {};
for (const m of block.matchAll(/(\w+):\s*"(#[0-9A-Fa-f]{3,6})"/g)) C[m[1]] = m[2];

const lum = hex => {
  const h = hex.replace("#", "");
  const f = h.length === 3 ? h.split("").map(c => c + c).join("") : h;
  const [r, g, b] = [0, 2, 4].map(i => parseInt(f.slice(i, i + 2), 16) / 255)
    .map(c => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a, b) => { const [hi, lo] = [lum(a), lum(b)].sort((p, q) => q - p); return (hi + 0.05) / (lo + 0.05); };

/* Each text token, and the light surfaces it is actually drawn on. A surface a
   token is never drawn on is not listed — that is not a guarantee this check
   makes. 4.5:1 throughout: there is no large-text exemption here on purpose,
   because these tokens carry small print (metadata, hints, section labels). */
const AA = 4.5;
const PAIRS = [
  ["ink",         ["paper", "card", "cream"]],   // primary body text
  ["muted",       ["paper", "card", "tintPlum"]], // secondary text + panel body
  ["hint",        ["paper", "card"]],            // input placeholders / hints
  ["danger",      ["paper", "card"]],            // error text
  ["brand600",    ["paper", "card"]],            // plum words and glyph labels
  ["goldInk",     ["paper", "card"]],            // gold text on a light ground
  ["tintGoldInk", ["tintGold"]],                 // the tip panel's own ink
  ["tintRoseInk", ["tintRose"]],                 // the warning panel's own ink
];

const bad = [];
for (const [tok, grounds] of PAIRS) {
  if (!C[tok]) { bad.push(`missing token: ${tok}`); continue; }
  for (const bg of grounds) {
    if (!C[bg]) { bad.push(`missing surface: ${bg}`); continue; }
    const r = ratio(C[tok], C[bg]);
    if (r < AA) bad.push(`${tok} (${C[tok]}) on ${bg} (${C[bg]}) is ${r.toFixed(2)}:1 — needs ${AA}:1`);
  }
}

if (bad.length) {
  for (const b of bad) console.log("FAIL  " + b);
  console.log(`\n${bad.length} light-theme text token(s) below AA. Darken the token until it clears ${AA}:1,`);
  console.log("or, if it is no longer used as text on that surface, drop the pair from PAIRS with a note.");
  process.exit(1);
}
console.log(`every light-theme text token clears ${AA}:1 on the surfaces it is drawn on`);
