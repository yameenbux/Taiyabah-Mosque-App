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
  "tab-home": ["screens/Home.jsx"], "tab-times": ["screens/PrayerTimes.jsx"],
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

const anchors = [];
for (const m of html.matchAll(/<div class="sheet" id="([\w-]+)"/g)) anchors.push([m.index, m[1]]);
for (const m of html.matchAll(/<main id="([\w-]+)"/g)) anchors.push([m.index, m[1]]);
anchors.sort((a, b) => a[0] - b[0]);

const prose = new Set();
for (const m of fs.readFileSync(path.join(root, "src/data/sheets.json"), "utf8")
                 .matchAll(/"k"\s*:\s*"([^"]+)"/g)) prose.add(m[1]);

const rows = [];
for (let i = 0; i < anchors.length; i++) {
  const [pos, name] = anchors[i];
  if (!SCREENS[name]) continue;
  const end = i + 1 < anchors.length ? anchors[i + 1][0] : html.length;
  const body = html.slice(pos, end);
  const keys = [...new Set([...body.matchAll(/data-i18n="([^"]+)"/g)].map(m => m[1]))]
    .filter(k => !NOT_OURS.test(k));
  const src = SCREENS[name]
    .map(f => path.join(root, "src", f))
    .filter(fs.existsSync).map(f => fs.readFileSync(f, "utf8")).join("");
  const missing = keys.filter(k => !src.includes(`"${k}"`) && !prose.has(k));
  rows.push({ name, keys: keys.length, missing });
}
rows.sort((a, b) => b.missing.length - a.missing.length);

const total = rows.reduce((n, r) => n + r.missing.length, 0);
for (const r of rows) {
  if (!r.missing.length) { console.log(`  ${r.name.padEnd(14)} ${String(r.keys).padStart(3)} strings — complete`); continue; }
  console.log(`  ${r.name.padEnd(14)} ${String(r.keys).padStart(3)} strings — ${r.missing.length} MISSING`);
  for (const k of r.missing) console.log(`        ${k}`);
}
console.log(`\n${total} strings the website shows that this app has nowhere.`);
if (process.argv.includes("--strict") && total) process.exit(1);
