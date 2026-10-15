/**
 * Taiyabah Masjid — every resource the Android widget names actually exists.
 * Copyright (c) 2026 Yameen Bux. All rights reserved. See LICENSE.md.
 *
 * A widget is a description posted to another process. Nothing in it is
 * checked by the app: a layout id that does not exist, an @drawable that was
 * renamed, a @+id the provider sets text on but no layout declares — none of
 * these stop a build and none of them throw where anybody sees it. They
 * produce a blank rectangle on somebody's home screen, or a widget that fails
 * to inflate and is silently removed by the launcher.
 *
 * So this reads the provider's own R references and checks each one against
 * the res tree it ships with, and it checks the import that makes R resolve at
 * all. That import is here for a reason: aapt generates R in the APPLICATION's
 * namespace, com.taiyabahmasjid.app, and the provider lives in a sub-package.
 * Without the import a bare R silently means com.taiyabahmasjid.app.widget.R,
 * which nothing generates, and every resource reference in the file fails. It
 * was written without it, and a compile check against a stub R placed in the
 * wrong package agreed that it was fine.
 *
 *   node scripts/check-android-widget.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { parse, place, attr, px, id as idOf, num, advance, measureH, measureW, contentW, contentH, TEXTY }
  from "./lib/android-layout.mjs";

const root = path.resolve(import.meta.dirname, "..");
const target = path.join(root, "targets/android-widget");
const java = path.join(target, "java/com/taiyabahmasjid/app/widget/NextJamaahWidget.java");
const res = path.join(target, "res");

const fail = [];
const say = m => fail.push(m);

if (!fs.existsSync(java)) {
  console.error("FAIL  the Android widget provider is gone");
  process.exit(1);
}

const src = fs.readFileSync(java, "utf8");

/* 1. R has to resolve. */
if (!/^import com\.taiyabahmasjid\.app\.R;/m.test(src.replace(/\/\*[\s\S]*?\*\//g, ""))) {
  say("the provider does not import com.taiyabahmasjid.app.R — a bare R means " +
      "com.taiyabahmasjid.app.widget.R, which aapt never generates");
}

/* 2. Every id the provider touches must be declared by a layout it ships. */
const layouts = fs.readdirSync(path.join(res, "layout")).map(f =>
  fs.readFileSync(path.join(res, "layout", f), "utf8")).join("\n");
const declared = new Set([...layouts.matchAll(/android:id="@\+id\/(\w+)"/g)].map(m => m[1]));

/* 3. And every file-backed resource must be on disk. */
const fileRes = kind => {
  const out = new Set();
  for (const dir of fs.readdirSync(res)) {
    if (dir !== kind && !dir.startsWith(kind + "-")) continue;
    for (const f of fs.readdirSync(path.join(res, dir))) out.add(f.replace(/\.(xml|png|jpg|webp|json)$/, ""));
  }
  return out;
};
const have = { layout: fileRes("layout"), drawable: fileRes("drawable"),
               xml: fileRes("xml"), raw: new Set(["taiyabah_timetable"]) };

for (const [, kind, name] of src.matchAll(/\bR\.(\w+)\.(\w+)/g)) {
  if (kind === "id") {
    if (!declared.has(name)) say(`R.id.${name} is set by the provider but no layout declares it`);
  } else if (have[kind]) {
    if (!have[kind].has(name)) say(`R.${kind}.${name} does not exist in targets/android-widget/res`);
  } else {
    say(`R.${kind}.${name} is a resource kind this check does not know about`);
  }
}

/* 4. Anything a layout references must ship too. */
for (const [, kind, name] of layouts.matchAll(/"@(drawable|layout|xml)\/(\w+)"/g)) {
  if (!have[kind].has(name)) say(`a layout references @${kind}/${name}, which is not in the res tree`);
}

/* 5. RemoteViews can only inflate a short list of views. Anything else
      inflates to nothing on the home screen and says so nowhere. */
const ALLOWED = new Set(["FrameLayout", "LinearLayout", "RelativeLayout", "GridLayout",
                         "TextView", "ImageView", "Button", "ImageButton", "ProgressBar",
                         "Chronometer", "AnalogClock", "ViewFlipper", "ListView", "GridView",
                         "StackView", "AdapterViewFlipper", "View", "Space"]);
for (const f of fs.readdirSync(path.join(res, "layout"))) {
  const xml = fs.readFileSync(path.join(res, "layout", f), "utf8");
  for (const [, tag] of xml.matchAll(/<([A-Z][\w.]*)/g)) {
    if (!ALLOWED.has(tag)) say(`${f} uses <${tag}>, which RemoteViews cannot inflate`);
  }
}


/* 6. The layouts have to fit the cells the provider uses them in.

      This is the check I wish I had had first. Both layouts were written to
      look right in a preview and both overflowed a real widget cell — the
      wide one by 51dp, which on a default placement would have clipped Isha
      off the bottom. A widget is measured by the launcher in another process:
      nothing in the build, and nothing on screen, says that the content did
      not fit. It just quietly loses its last row.

      So measure the XML. The rules are in scripts/lib/android-layout.mjs,
      shared with the preview that draws these layouts — a preview that agrees
      with a check that is wrong would be worth nothing. They are deliberately
      pessimistic about text, which is the safe direction here: better to
      refuse a layout that would have just fitted than to let one clip.

      What this file decides is the strings to measure, below, and the sizes
      to measure them at. */

/* Minimum width, same shape. Text views the provider fills get the widest
   string it could ever set; ones with android:text get that string.

   Those strings are read out of the timetable and out of the provider rather
   than written down here. Hard-coding them is how a check like this goes
   stale and starts passing a layout that clips: the hijri column is sized for
   "17 JUMADA AL-AKHIRAH" until the year rolls into a month with a longer
   name, and then nothing says a word. */
const widestIn = (strings, dflt) =>
  strings.reduce((a, b) => (advance(b, 10) > advance(a, 10) ? b : a), dflt);

const table = JSON.parse(fs.readFileSync(path.join(root, "targets/widget/timetable.json"), "utf8"));
const records = Object.values(table.days || {});
/* The same trim the provider's hijri() does — " AH" and the year both go,
   because the column is 116dp. If that method changes, this has to change
   with it; the Java harness prints what it actually returns. */
const trimHijri = (s) => String(s).replace(" AH", "").replace(/\s+\d{3,4}$/, "");
const hijriDates = records.map((r) => trimHijri(r.hijri || "").toUpperCase());
/* The provider does not print "13:30", it prints what pretty() returns —
   "1:30pm" — and that is a third wider again. Measuring the raw timetable
   string was measuring something that never appears on screen. */
const pretty = (hhmm) => {
  const [h, m] = String(hhmm).split(":").map(Number);
  const twelve = h % 12 === 0 ? 12 : h % 12;
  return `${twelve}:${String(m).padStart(2, "0")}${h < 12 ? "am" : "pm"}`;
};
const clockTimes = records
  .flatMap((r) => Object.values(r.jamaat || {}).concat(Object.values(r.jummah || {})))
  .map((t) => pretty(t));
/* Every label the provider can put in a name slot: the five prayers, plus the
   Jumuʿah variants it builds for Friday. */
const prayerNames = [...(src.match(/private static final String\[\] NAMES\s*=\s*\{([^}]*)\}/) || [, ""])[1]
                        .matchAll(/"([^"]*)"/g)].map((m) => m[1]);
const jumuahNames = [...src.matchAll(/new Slot\(\s*(?:[\w\s=!.]*\?\s*)?"([^"]*Jumu[^"]*)"\s*:\s*"([^"]*)"|new Slot\("([^"]*Jumu[^"]*)"/g)]
                        .flatMap((m) => [m[1], m[2], m[3]]).filter(Boolean);
const anyName = widestIn([...prayerNames, ...jumuahNames], "Maghrib");
const anyTime = widestIn(clockTimes, "12:45pm");

if (!prayerNames.length) say("could not find the provider's NAMES array, so the width check is measuring a guess");
if (!hijriDates.length) say("could not read any hijri dates out of the timetable, so the hijri column is measuring a guess");

const WIDEST = { tw_time: anyTime, tw_name: anyName, tw_until: "11:00:00",
                 tw_hijri: widestIn(hijriDates, ""), tw_r0_name: anyName,
                 tw_r0_time: anyTime };
const widest = (el) => {
  const id = (attr(el, "id") || "").replace("@+id/", "");
  if (attr(el, "text") != null) return attr(el, "text");
  if (WIDEST[id]) return WIDEST[id];
  if (/_name$/.test(id)) return WIDEST.tw_r0_name;
  if (/_time$/.test(id)) return WIDEST.tw_r0_time;
  return "";
};
const info = fs.readFileSync(path.join(res, "xml", "taiyabah_next_jamaah_info.xml"), "utf8");
const dim = (name) => px((info.match(new RegExp(`android:${name}="([^"]+)"`)) || [])[1]);
const constant = (name) =>
  parseFloat((src.match(new RegExp(`${name}\\s*=\\s*(\\d+)`)) || [])[1]);

const minH = dim("minHeight"), minW = dim("minWidth");
const resizeH = dim("minResizeHeight"), resizeW = dim("minResizeWidth");
const wideDp = constant("WIDE_DP"), tallDp = constant("TALL_DP");

/* The provider falls back to the narrow layout below WIDE_DP or TALL_DP, so
   that is exactly the size each layout has to survive: the wide one at the
   threshold that selects it, the narrow one at the smallest a launcher will
   let anyone drag it. */
const cells = [
  ["taiyabah_widget_wide",  tallDp,  wideDp,   "the size at which the provider switches to it"],
  ["taiyabah_widget_small", resizeH, resizeW,  "the smallest size a launcher allows"],
];
const verbose = process.argv.includes("--verbose");
for (const [name, h, w, why] of cells) {
  const tree = parse(fs.readFileSync(path.join(res, "layout", `${name}.xml`), "utf8"));
  const needH = Math.ceil(measureH(tree, widest)), needW = Math.ceil(measureW(tree, widest));
  /* Lay it out at that size and look at every line of type where it actually
     lands. Measuring only the root misses the case that bit here: a column
     pinned to a fixed width, with a hijri date 15dp too long inside it. The
     widget as a whole fitted; the date was quietly ellipsized. */
  for (const box of place(tree, w, h, widest)) {
    if (!TEXTY.has(box.el.tag)) continue;
    const text = widest(box.el);
    if (!text) continue;
    const wantW = Math.ceil(contentW(box.el, widest)), wantH = Math.ceil(contentH(box.el, widest));
    const label = `${name}.xml: "${text}"${idOf(box.el) ? ` (${idOf(box.el)})` : ""}`;
    if (wantW > Math.floor(box.w) + 1) say(`${label} needs ${wantW}dp but is laid out in ${Math.floor(box.w)}dp — it would be ellipsized`);
    if (wantH > Math.floor(box.h) + 1) say(`${label} needs ${wantH}dp of height but is laid out in ${Math.floor(box.h)}dp`);
  }
  if (verbose) {
    console.log(`\n${name}.xml — used at ${w}x${h}dp, measures ${needW}x${needH}dp`);
    const walk = (el, depth) => {
      const id = idOf(el);
      const text = TEXTY.has(el.tag) ? ` "${widest(el)}" @${num(el, "textSize", 14)}sp` : "";
      console.log(`  ${"  ".repeat(depth)}${el.tag}${id ? "#" + id : ""}` +
                  ` ${Math.ceil(measureW(el, widest))}x${Math.ceil(measureH(el, widest))}dp${text}`);
      for (const k of el.kids) walk(k, depth + 1);
    };
    walk(tree, 0);
  }
  if (needH > h) say(`${name}.xml needs about ${needH}dp of height but is used at ${h}dp (${why}) — ${needH - h}dp would be clipped off the bottom`);
  if (needW > w) say(`${name}.xml needs about ${needW}dp of width but is used at ${w}dp (${why}) — the times would be cut off or ellipsized`);
}

/* And the declared default has to be big enough to actually get the wide
   layout, or the widget lands on the home screen in its narrow form. */
if (!(tallDp <= minH)) say(`the widget declares minHeight ${minH}dp but the provider needs ${tallDp}dp to use the wide layout, so a default placement would be narrow`);
if (!(wideDp <= minW)) say(`the widget declares minWidth ${minW}dp but the provider needs ${wideDp}dp to use the wide layout, so a default placement would be narrow`);

if (fail.length) {
  console.error(`\n${fail.length} problem(s) with the Android widget:\n`);
  for (const m of fail) console.error("  " + m);
  console.error("");
  process.exit(1);
}
console.log(`the Android widget's ${declared.size} ids and every resource it names are present, and both layouts fit their cells`);
