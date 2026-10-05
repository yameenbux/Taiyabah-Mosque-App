/* Does every screen say what the website's screen says?
 *
 * The app was built by lifting the website's markup. That works for prose and
 * fails silently everywhere the website fills a box with JavaScript: the
 * extractor sees an empty <div>, and whoever writes the screen next fills it
 * with something of their own invention. That is how the muṣḥaf lost its
 * bookmark, the timetable lost its beginning times, the notifications screen
 * grew five switches the website never had, and the holiday planner shipped
 * with three blank cards.
 *
 * So this compares them string by string. For each of the website's screens it
 * takes every data-i18n key the reader can see, and asks whether the native
 * screen mentions it — in its own source, or in the extracted prose the Blocks
 * renderer draws. What it reports is not style: it is wording the website shows
 * and this app has nowhere.
 */
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const html = fs.readFileSync(path.resolve(root, "..", "index.html"), "utf8");

const SCREENS = {
  "tab-home": ["screens/Home.jsx"],
  /* The month sheet is nested inside the times pane, so its wording is part of
   * that pane's slice even though the app splits it into a screen of its own. */
  "tab-times": ["screens/PrayerTimes.jsx", "screens/Timetable.jsx"],
  "sheet": ["screens/Timetable.jsx"], "tab-notices": ["screens/Notices.jsx"],
  "tab-qibla": ["screens/Qibla.jsx"], "tab-alerts": ["screens/Alerts.jsx"],
  "tab-donate": ["screens/Donate.jsx"], "tab-live": ["screens/Live.jsx"],
  "vids": ["screens/Videos.jsx"], "zakat": ["screens/Zakat.jsx"],
  "hallhire": ["screens/HallHire.jsx", "form.jsx"], "holidays": ["screens/Holidays.jsx"],
  "sysprefs": ["screens/Prefs.jsx"], "quran": ["screens/Quran.jsx"],
  "giving": ["screens/Donate.jsx"], "collect": ["screens/Collect.jsx", "form.jsx"],
  "rabbanas": ["screens/Reader.jsx"], "athkar": ["screens/Reader.jsx"],
  "bukhari": ["screens/Bukhari.jsx"], "duas": ["screens/Reader.jsx"],
  "advice": ["screens/Advice.jsx", "form.jsx"], "marriage": ["screens/Marriage.jsx", "form.jsx"],
};

/* Wording that belongs to the website as a website: the Done button that closes
 * a sheet, screen-reader labels for controls the app draws differently, and the
 * charity footer the app prints from one place. */
const NOT_OURS = /\.done$|^a11y\.|_close|^common\.registered_charity$|^sheet\.app_built_by$|^sheet\.masjidone$/;

/* Wording the app genuinely does not need, each with the reason. This list is
 * short on purpose and every entry has to earn its place: it is the one way
 * this check can be made to lie, so anything added here must be a thing the
 * app does BETTER or a thing the platform does instead — never a thing that is
 * merely unfinished. */
const WONT_NEED = {
  "duas.loading":                   "the duʿās are bundled — there is nothing to wait for",
  "athkar.loading":                 "the athkār are bundled — there is nothing to wait for",
  "bukhari.loading":                "the book list is bundled; only a book's text is fetched",
  "rabbanas.couldn_t_load_these_du": "bundled, so it cannot fail to load",
  "quran.couldn_t_load_the_qur":    "the translation is bundled",
  "duas.all_du_as":                 "a back link; the app has a back arrow in the header",
  "athkar.back_to_athkar":          "a back link; the app has a back arrow in the header",
  "bukhari.all_books":              "a back link; the app has a back arrow in the header",
  "quran.surahs":                   "a back link; the app has a back arrow in the header",
  "sheet.use_my_phone_s_compass":   "a browser needs a tap before it may read the compass; the app reads it on open",
};

/* A screen ends at its own closing tag, not where the next one starts.
 *
 * Slicing from one opening tag to the next made the LAST sheet in the file run
 * to the end of the document, so it swallowed the drawer, the tab bar and the
 * muṣḥaf — and reported their wording as missing from the nikāḥ screen. A
 * report that attributes a gap to the wrong screen is worse than no report:
 * it sends the work to the wrong file. So the end is found by counting tags. */
function sliceAt(open, tag) {
  const re = new RegExp(`<${tag}\\b|</${tag}>`, "g");
  re.lastIndex = open;
  let depth = 0;
  for (let m; (m = re.exec(html)); ) {
    depth += m[0][1] === "/" ? -1 : 1;
    if (depth === 0) return html.slice(open, m.index);
  }
  return html.slice(open);
}

const anchors = [];
for (const m of html.matchAll(/<div class="sheet" id="([\w-]+)"/g)) anchors.push([m.index, m[1], "div"]);
for (const m of html.matchAll(/<main id="([\w-]+)"/g)) anchors.push([m.index, m[1], "main"]);
anchors.sort((a, b) => a[0] - b[0]);

const prose = new Set();
for (const m of fs.readFileSync(path.join(root, "src/data/sheets.json"), "utf8")
                 .matchAll(/"k"\s*:\s*"([^"]+)"/g)) prose.add(m[1]);

const rows = [];
for (let i = 0; i < anchors.length; i++) {
  const [pos, name, tag] = anchors[i];
  if (!SCREENS[name]) continue;
  const body = sliceAt(pos, tag);
  const keys = [...new Set([...body.matchAll(/data-i18n="([^"]+)"/g)].map(m => m[1]))]
    .filter(k => !NOT_OURS.test(k));
  /* Every screen's title is set in App.jsx, not in the screen itself. */
  const src = [...SCREENS[name], "App.jsx"]
    .map(f => path.join(root, "src", f))
    .filter(fs.existsSync).map(f => fs.readFileSync(f, "utf8")).join("");
  const missing = keys.filter(k =>
    !src.includes(`"${k}"`) && !prose.has(k) && !WONT_NEED[k]);
  rows.push({ name, keys: keys.length, missing });
}
rows.sort((a, b) => b.missing.length - a.missing.length);

const total = rows.reduce((n, r) => n + r.missing.length, 0);
for (const r of rows) {
  if (!r.missing.length) { console.log(`  ${r.name.padEnd(14)} ${String(r.keys).padStart(3)} strings — complete`); continue; }
  console.log(`  ${r.name.padEnd(14)} ${String(r.keys).padStart(3)} strings — ${r.missing.length} MISSING`);
  for (const k of r.missing) console.log(`        ${k}`);
}
const waived = Object.keys(WONT_NEED).length;
console.log(`\n${total} strings the website shows that this app has nowhere.`);
console.log(`${waived} more are deliberately not needed — see WONT_NEED, with a reason each.`);
if (process.argv.includes("--strict") && total) process.exit(1);
