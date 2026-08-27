#!/usr/bin/env node
/* Every translatable string must exist in every language pack.
 *
 * A missing key is not a crash — the app falls back to English — which is
 * exactly why it needs checking: a half-translated screen looks deliberate
 * and nobody reports it.
 *
 *   node scripts/check-i18n.mjs
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";

/* Coverage ratchets. Translating 346 strings into three languages takes more
   than one sitting, so failing everything until it is finished would just
   block the work. Instead the best coverage reached so far is recorded, and
   the check fails only if coverage drops below it — a new untranslated string
   fails immediately, while work in progress does not. Raise the baseline by
   running with --save once coverage improves. */
const BASELINE = "lang/coverage.json";
const save = process.argv.includes("--save");
const baseline = existsSync(BASELINE) ? JSON.parse(readFileSync(BASELINE, "utf8")) : {};

const html = readFileSync("index.html", "utf8");
const markup = new Set([...html.matchAll(/data-i18n="([^"]+)"/g)].map(m => m[1]));

/* Keys the app looks up from JavaScript rather than from an attribute. */
const fromJs = new Set([...html.matchAll(/\bt\(\s*["']([\w.]+)["']/g)].map(m => m[1]));

const needed = new Set([...markup, ...fromJs]);
const LANGS = ["ur", "gu", "ar"];

let failed = false;
const result = {};
console.log(`${needed.size} translatable keys (${markup.size} in markup, ${fromJs.size} from code)`);

for (const code of LANGS) {
  const file = `lang/${code}.js`;
  if (!existsSync(file)) { console.error(`  FAIL  ${file} is missing`); failed = true; continue; }
  const src = readFileSync(file, "utf8");
  const sandbox = {};
  new Function("window", src)(sandbox);
  const pack = sandbox.LANG_PACK;
  if (!pack || pack.code !== code) { console.error(`  FAIL  ${file} does not define a ${code} pack`); failed = true; continue; }

  const have = new Set(Object.keys(pack.strings || {}));
  const missing = [...needed].filter(k => !have.has(k));
  const extra   = [...have].filter(k => !needed.has(k));
  const blank   = [...have].filter(k => !String(pack.strings[k]).trim());

  const pct = Math.round(((needed.size - missing.length) / needed.size) * 100);
  const floor = baseline[code] ?? 0;
  result[code] = pct;

  /* A blank string is always a fault: it renders as nothing at all, where a
     missing key at least falls back to readable English. */
  if (blank.length) {
    failed = true;
    console.error(`  FAIL  ${code}: ${blank.length} blank string(s) — these render as nothing`);
    for (const k of blank.slice(0, 4)) console.error(`          blank: ${k}`);
  }
  if (pct < floor) {
    failed = true;
    console.error(`  FAIL  ${code}: coverage fell to ${pct}% from ${floor}% — ${missing.length} missing`);
    for (const k of missing.slice(0, 8)) console.error(`          missing: ${k}`);
    if (missing.length > 8) console.error(`          …and ${missing.length - 8} more`);
  } else if (missing.length) {
    console.log(`  ok    ${code}: ${pct}% translated, ${missing.length} still to do (floor ${floor}%)`);
  } else {
    console.log(`  ok    ${code}: complete — all ${needed.size} strings` +
      (extra.length ? `, ${extra.length} unused` : ""));
  }
}
if (save && !failed) {
  writeFileSync(BASELINE, JSON.stringify(result, null, 1) + "\n");
  console.log(`\nbaseline raised to ${JSON.stringify(result)}`);
}
process.exit(failed ? 1 : 0);
