#!/usr/bin/env node
/* Every string the app can put on a screen, with the English it stands for.
 *
 * Three sources, because the app has three ways of showing text:
 *   1. markup      — data-i18n, data-i18n-html, data-i18n-attr
 *   2. the script  — t("key", "English") calls with a literal key
 *   3. the data    — the Qur'an index, athkar.js, duas.js, rabbanas.js, whose
 *                    keys are built at runtime from stable ids
 *
 * Writes /tmp/i18n-keys.json. Used by build-lang and by the release check.
 */
import { readFileSync, existsSync, writeFileSync } from "node:fs";

const html = readFileSync("index.html", "utf8");
const decode = s => s
  .replace(/&amp;/g,"&").replace(/&lt;/g,"<").replace(/&gt;/g,">")
  .replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&middot;/g,"·")
  .replace(/&hellip;/g,"…").replace(/&mdash;/g,"—").replace(/&ndash;/g,"–")
  .replace(/&rsquo;/g,"’").replace(/&lsquo;/g,"‘").replace(/&ldquo;/g,"“")
  .replace(/&rdquo;/g,"”").replace(/&nbsp;/g," ").replace(/&times;/g,"×")
  .replace(/&rsaquo;/g,"›").replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(+n));

const keys = {};                       // key -> English
const add = (k, en) => { if (k && en != null && !(k in keys)) keys[k] = String(en).replace(/\s+/g," ").trim(); };

/* 1. markup */
for (const m of html.matchAll(/data-i18n="([^"]+)"[^>]*>([^<>]*)</g)) add(m[1], decode(m[2]));
/* An element whose translation carries inline markup runs past the first
   closing tag it contains — "…it adds <b>25p to every £1</b> at no cost to
   you." Stopping at the first </b> would hand the translator half a sentence,
   so the element is walked to its own matching close. */
for (const m of html.matchAll(/<(\w+)[^>]*\bdata-i18n-html="([^"]+)"[^>]*>/g)) {
  const tag = m[1], open = new RegExp(`<${tag}\\b`, "g"), close = new RegExp(`</${tag}>`, "g");
  let i = m.index + m[0].length, depth = 1, end = i;
  while (depth > 0 && end < html.length) {
    open.lastIndex = close.lastIndex = end;
    const o = open.exec(html), c = close.exec(html);
    if (!c) break;
    if (o && o.index < c.index) { depth++; end = o.index + o[0].length; }
    else { depth--; end = c.index + (depth ? c[0].length : 0); }
  }
  add(m[2], decode(html.slice(i, end)));
}
for (const m of html.matchAll(/<[^>]*\bdata-i18n-attr="([^"]+)"[^>]*>/g)) {
  const tag = m[0];
  for (const pair of m[1].split(",")) {
    const [attr, key] = pair.split(":").map(x => x.trim());
    const v = tag.match(new RegExp(`\\b${attr}="([^"]*)"`));
    if (v) add(key, decode(v[1]));
  }
}

/* 2. t("key", "English") in the script — literal keys only */
const script = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].map(m=>m[1]).join("\n");
const T = /\bt\(\s*"((?:[^"\\]|\\.)+)"\s*,\s*("(?:[^"\\]|\\.)*"(?:\s*\+\s*"(?:[^"\\]|\\.)*")*)\s*\)/g;
for (const m of script.matchAll(T)) {
  const en = m[2].split(/"\s*\+\s*"/).join("").replace(/^"|"$/g, "")
    .replace(/\\"/g,'"').replace(/\\n/g,"\n").replace(/\\u([0-9a-f]{4})/gi,(_,h)=>String.fromCharCode(parseInt(h,16)));
  add(m[1], en);
}

/* 2b. key families the script builds at runtime, so no literal key exists to
   grep for. Each one is read from the array that drives it, so adding a
   prayer, a reminder or a video adds its keys here automatically. */
let CALENDAR_DAYS = [];
const arrayOf = (name) => {
  const m = script.match(new RegExp(`const ${name}\\s*=\\s*\\[`));
  if (!m) return [];
  let i = script.indexOf("[", m.index), depth = 0, end = i;
  for (; end < script.length; end++) {
    if (script[end] === "[") depth++;
    else if (script[end] === "]") { depth--; if (!depth) break; }
  }
  try {
    return new Function("MARK_MAWLID", "t", "num", "fullDow", "suhoorNote", "hIs", "tIs", "CALENDAR_DAYS",
      `return ${script.slice(i, end + 1)}`)(false, x=>x, x=>x, x=>x, ()=>"", ()=>false, ()=>false, CALENDAR_DAYS);
  } catch (e) { throw new Error(`could not read ${name} out of index.html: ${e.message}`); }
};

for (const p of arrayOf("PRAYERS")) { add("prayer." + p.key, p.en); }
add("prayer.jumuah", "Jumuʿah");

const DOW_EN=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const MON_EN=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const FULL_DOW_EN=["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const FULL_MON_EN=["January","February","March","April","May","June","July","August",
                   "September","October","November","December"];
const HIJRI=["Muharram","Safar","Rabi al-Awwal","Rabi al-Thani","Jumada al-Awwal",
             "Jumada al-Thani","Rajab","Sha'ban","Ramadan","Shawwal","Dhul Qa'dah","Dhul Hijjah"];
DOW_EN.forEach((v,i)=>add(`date.dow.${i}`, v));
MON_EN.forEach((v,i)=>add(`date.mon.${i}`, v));
FULL_DOW_EN.forEach((v,i)=>add(`date.fulldow.${i}`, v));
FULL_MON_EN.forEach((v,i)=>add(`date.fullmon.${i}`, v));
HIJRI.forEach((v,i)=>add(`date.hijri.${i}`, v));
add("date.ah", "AH");

CALENDAR_DAYS = arrayOf("CALENDAR_DAYS");
for (const name of ["CALENDAR_DAYS", "REMINDERS"])
  for (const r of arrayOf(name)) {
    if (!r || !r.id) continue;
    add(`reminder.${r.id}.t`, r.t);
    if (typeof r.d === "string") add(`reminder.${r.id}.d`, r.d);
  }

for (const v of arrayOf("VIDEOS")) { add(`video.${v.id}.t`, v.t); add(`video.${v.id}.d`, v.d); }

/* The hall's two hire sessions name their own key, so there is no literal for
   the t("key", "English") scan to find. */
for (const sn of arrayOf("BK_SESSIONS")) if (sn && sn.nameKey) add(sn.nameKey, sn.name);

for (const [k, en] of [["fajr","Fajr"],["sunrise","Sun"],["zuhr","Zuhr"],["asr","Asr"],
                       ["maghrib","Mag"],["isha","Isha"]]) add(`month.col.${k}`, en);
add("zakat.metal.gold", "gold");
add("zakat.metal.silver", "silver");

/* 3. the content data */
const load = (file, name) => {
  if (!existsSync(file)) return null;
  const w = {};
  new Function("window", readFileSync(file, "utf8"))(w);
  return w[name];
};
const idx = existsSync("quran/surahs/index.json") && JSON.parse(readFileSync("quran/surahs/index.json","utf8"));
if (idx) {
  /* The credit line's English comes from the index, not from a literal in the
     script, so there is nothing for the t("key", "English") scan to find. */
  add("quran.script_name", idx.script);
  add("quran.translator", idx.translation);
}
if (idx) for (const su of idx.surahs) {
  add(`surah.${su.n}.name`, su.nameEn);
  add(`surah.${su.n}.meaning`, su.meaning);
  add(`place.${String(su.revealed).toLowerCase()}`, su.revealed);
}
const ath = load("quran/athkar.js", "ATHKAR");
if (ath) {
  add("athkar.review_note", ath.reviewNote);
  for (const sec of ath.sections) {
    add(`athkar.${sec.id}.title`, sec.title);
    add(`athkar.${sec.id}.intro`, sec.intro);
    sec.items.forEach((it, j) => {
      const k = `athkar.${sec.id}.${j}`;
      add(k + ".en", it.en);
      if (it.note) add(k + ".note", it.note);
      add(k + ".times", it.times);
      add(k + ".src", it.src || it.source);
    });
  }
}
const duas = load("quran/duas.js", "DUAS");
if (duas) {
  add("duas.review_note", duas.reviewNote);
  for (const c of duas.categories) {
    add(`dua.${c.id}.title`, c.title);
    c.items.forEach((it, j) => {
      const k = `dua.${c.id}.${j}`;
      add(k + ".label", it.label);
      add(k + ".tr", it.tr);
      add(k + ".en", it.en);
      if (it.note) add(k + ".note", it.note);
      add(k + ".src", it.src);
    });
  }
}
const rab = load("quran/rabbanas.js", "RABBANAS");
if (rab) for (const r of rab) add(`rabbana.${r.n}.ref`, r.ref);

writeFileSync("/tmp/i18n-keys.json", JSON.stringify(keys, null, 1));
console.log(`${Object.keys(keys).length} translatable keys`);
const by = {};
for (const k of Object.keys(keys)) { const p = k.split(".")[0]; by[p] = (by[p]||0)+1; }
for (const [p,n] of Object.entries(by).sort((a,b)=>b[1]-a[1])) console.log(`  ${String(n).padStart(4)}  ${p}.*`);
