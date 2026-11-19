/**
 * Taiyabah Masjid — Arabic scripture must be tagged for the screen reader.
 *
 * On iOS, VoiceOver reads text in the user's interface voice unless a node
 * says otherwise. Qurʼanic Arabic — verses, duʿās, the dhikr, the salām, a
 * prayer's Arabic name — read by an English voice is not recitation, it is
 * noise. React Native's `accessibilityLanguage="ar"` tells VoiceOver to switch
 * to an Arabic voice for that Text. (iOS only; Android/TalkBack has no
 * per-node language override from RN.)
 *
 * This fails if a Text whose PRIMARY style is the Qurʼanic or Arabic font ships
 * without `accessibilityLanguage`. It keys off `style={{ fontFamily: F.quranic`
 * / `F.arabic` — the direct, unambiguous "this element is Arabic" signal — so
 * it does NOT flag:
 *   - the UI-chrome Arabic in App.jsx / Prefs.jsx, written `rtl ? F.arabic : …`,
 *     which follows the interface LANGUAGE (which may be Urdu or Gujarati, not
 *     Arabic) and so must not be hard-tagged "ar";
 *   - an inner <Text> span that only recolours a word inside an already-tagged
 *     parent;
 *   - Arabic that flows through the shared <Arabic> component or the Hero's
 *     <Rich arabic> — both of which carry the tag once, centrally.
 *
 *   node scripts/check-arabic-lang.mjs
 */
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const PRIMARY = /style=\{\{\s*fontFamily:\s*F\.(quranic|arabic)\b/;

const files = [];
(function walk(d) {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f);
    if (fs.statSync(p).isDirectory()) { if (!/node_modules|dist|android|\.expo/.test(p)) walk(p); }
    else if (/\.jsx?$/.test(f)) files.push(p);
  }
})(path.join(root, "src"));

const bad = [];
for (const file of files) {
  fs.readFileSync(file, "utf8").split("\n").forEach((line, i) => {
    const t = line.trimStart();
    if (t.startsWith("*") || t.startsWith("//")) return;      // a comment, not code
    if (!PRIMARY.test(line)) return;
    if (line.includes("accessibilityLanguage")) return;       // tagged, good
    bad.push({ file: path.relative(root, file), line: i + 1, src: line.trim().slice(0, 100) });
  });
}

for (const b of bad)
  console.log(`FAIL  ${b.file}:${b.line}  Arabic Text with no accessibilityLanguage\n      ${b.src}`);
if (bad.length) {
  console.log(`\n${bad.length} Arabic Text(s) a screen reader would read in the wrong voice.`);
  console.log('Add accessibilityLanguage="ar" to the <Text>, or route it through <Arabic>/<Rich arabic>.');
  console.log("If this element follows the UI language (App/Prefs), it must not be matched here — write the");
  console.log("font conditionally (e.g. rtl ? F.arabic : F.sans) rather than as the primary fontFamily.");
  process.exit(1);
}
console.log(`every Qurʼanic/Arabic Text in ${files.length} files is tagged for the screen reader`);
