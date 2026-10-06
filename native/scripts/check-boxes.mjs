#!/usr/bin/env node
/**
 * Every coloured box the website draws, against the app.
 *
 * WHY THIS EXISTS. The website says some things in a box — a red advisory, a
 * gold tip, a dark plum panel — and the colour IS the message. "The masjid
 * does not provide this directly" in red is a warning; the same sentence as
 * grey prose is a detail somebody skims past. On 6 October a screenshot showed
 * boxes that were red or gold on the website rendering as plain text in the
 * app, and the only way that was found was by somebody looking at a phone.
 *
 * Two ways a box goes missing, and this finds both:
 *
 *   1. extract-content.mjs recognises four shapes — *-note, *-advisory,
 *      notprovided, *-notice. Anything else falls through to prose, silently.
 *      .remind, .zk-tip, .ia-conf, .fs-urgent and .cc-rules are all boxes on
 *      the website and none of them matches those four patterns.
 *   2. A screen rebuilt by hand — Zakat, Collect, Holidays, Alerts, Help — has
 *      no blocks at all, so it only has the boxes somebody remembered.
 *
 *   node scripts/check-boxes.mjs [--strict]
 */
import fs from "node:fs"; import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "../..");
const SRC  = path.resolve(import.meta.dirname, "../src");
const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");

/* The website's boxes, by class, with the tone each one carries. Taken from the
 * stylesheet rather than guessed: every rule here paints a border or a fill and
 * a radius, which is what makes it read as a box rather than as prose. */
const BOXES = {
  danger: ["zk-disclaimer", "wl-advisory", "mg-advisory", "bt-notprovided",
           "fs-urgent", "cc-req", "urgent", "bk-err"],
  gold:   ["remind", "zk-tip", "ia-conf", "cc-paid-note", "hp-est",
           "t-soon", "fs-extra", "soon-tag"],
  plum:   ["ad-note", "nk-note", "bk-note", "cc-rules", "zk-result", "lbanner"],
};
const TONE = {};
for (const [tone, list] of Object.entries(BOXES)) for (const c of list) TONE[c] = tone;

/* What the app renders a box as. Warn is the red one, Notice and Callout the
 * gold and plum ones, advisory its own. A Pill with tone="gold" counts too —
 * .t-soon and .soon-tag are pills on the website, not panels. */
const NATIVE = /<\s*(Warn|Notice|Callout|Advisory)\b|tone=["']gold["']|type:\s*["'](warn|notice|callout|advisory)["']/g;

/* Which screen each box sits on: the nearest enclosing element with an id,
 * which is how the rest of these scripts name a screen. */
function screenOf(at) {
  const before = html.slice(0, at);
  const ids = [...before.matchAll(/<(?:section|div)[^>]*\bid=["']([a-z0-9-]+)["']/gi)];
  return ids.length ? ids[ids.length - 1][1] : "(unknown)";
}

const found = [];
for (const cls of Object.keys(TONE)) {
  const re = new RegExp(`class=["'][^"']*\\b${cls}\\b[^"']*["']`, "g");
  for (const m of html.matchAll(re)) found.push({ cls, tone: TONE[cls], screen: screenOf(m.index) });
}

/* The app side: blocks the extractor produced, plus the hand-written screens. */
const sheets = JSON.parse(fs.readFileSync(path.join(SRC, "data/sheets.json"), "utf8"));
let blockBoxes = 0;
const blockBoxesBySheet = {};
function count(bs, sheet) {
  for (const b of bs || []) {
    if (["warn", "notice", "callout", "advisory"].includes(b.type)) {
      blockBoxes++; blockBoxesBySheet[sheet] = (blockBoxesBySheet[sheet] || 0) + 1;
    }
    if (b.blocks) count(b.blocks, sheet);
  }
}
for (const [name, sheet] of Object.entries(sheets)) count(sheet.blocks, name);

const files = [];
(function walk(d) { for (const f of fs.readdirSync(d)) {
  const p = path.join(d, f);
  if (fs.statSync(p).isDirectory()) { if (f !== "i18n" && f !== "data") walk(p); }
  else if (/\.jsx?$/.test(f)) files.push(p);
} })(SRC);
let jsxBoxes = 0;
const jsxBySrc = {};
for (const f of files) {
  const n = (fs.readFileSync(f, "utf8").match(NATIVE) || []).length;
  if (n) { jsxBoxes += n; jsxBySrc[path.relative(SRC, f)] = n; }
}

const byTone = {};
for (const f of found) byTone[f.tone] = (byTone[f.tone] || 0) + 1;

console.log(`the website draws ${found.length} coloured boxes`);
for (const [tone, n] of Object.entries(byTone)) console.log(`  ${tone.padEnd(7)} ${n}`);
console.log(`\nthe app renders ${blockBoxes} from extracted blocks and ${jsxBoxes} written by hand\n`);

/* Which classes the extractor can see, and which are handled on a screen that
 * is written by hand so no extractor will ever see them. Both lists are here
 * because a checker that reports something already dealt with is a checker
 * people stop reading. */
const SEEN = [/-note$/, /-advisory$/, /notprovided|not-provided/, /-notice$/,
              /^fs-urgent$/, /^cc-rules$/, /^zk-tip$/, /^zk-disclaimer$/,
              /^cc-req$/, /^cc-paid-note$/];
/* Handled by hand, with where to look if it ever needs checking again. */
const BY_HAND = {
  "bk-err":   "form.jsx ErrorBox — red, with the alert icon",
  "soon-tag": "More.jsx Row — the gold Coming soon tag",
  /* The website adds this to a home tile from JavaScript, and no tile
   * currently carries it — all eleven open a screen. Listed so the next person
   * does not go hunting for a tag that is not meant to be there yet. */
  "t-soon":   "injected onto a home tile by the website's own JS; no tile uses it today",
  "urgent":   "Alerts.jsx — the red Janāzah row",
  "lbanner":  "Home.jsx — the plum Listen banner",
  "hp-est":   "Holidays.jsx ListRow — the gold est. tag",
  "zk-result": "Zakat.jsx — the plum result panel",
  "ia-conf":  "Advice.jsx — the gold Who reads this box",
  "fs-extra": "an inline span on the website, not a box",
  "remind":   "PrayerTimes.jsx — the gold reminder row",
};
const blind = [...new Set(found.map(f => f.cls))]
  .filter(c => !SEEN.some(re => re.test(c)) && !(c in BY_HAND));
const byHand = [...new Set(found.map(f => f.cls))].filter(c => c in BY_HAND);

if (blind.length) {
  console.log(`${blind.length} of those classes the extractor cannot see at all —`);
  console.log(`they reach the app as plain prose, with the colour and the box gone:\n`);
  for (const c of blind.sort()) {
    const hits = found.filter(f => f.cls === c);
    console.log(`  .${c.padEnd(16)} ${hits[0].tone.padEnd(7)} ${hits.length}×   ${[...new Set(hits.map(h => h.screen))].join(", ")}`);
  }
}

if (byHand.length) {
  console.log(`\n${byHand.length} are drawn by a hand-written screen rather than a block:\n`);
  for (const c of byHand.sort()) console.log(`  .${c.padEnd(16)} ${BY_HAND[c]}`);
}
if (!blind.length) console.log(`\nEvery coloured box on the website has somewhere to land in the app.`);

const strict = process.argv.includes("--strict");
if (strict && blind.length) {
  console.log(`\n::error::${blind.length} website box styles are invisible to the extractor.`);
  process.exit(1);
}
