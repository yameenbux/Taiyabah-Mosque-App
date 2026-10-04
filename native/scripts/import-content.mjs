/* Pull the masjid's content out of the web app and into the native one.
 *
 * The web files assign to `window`, and duas.js is a JavaScript object
 * literal rather than JSON — unquoted keys, so JSON.parse will not touch it.
 * So they are executed, not parsed, with a window to assign to.
 *
 * This is a script rather than a one-off paste because the content changes:
 * the imam corrects a wording, a duʿā is added. Re-run it and the native app
 * carries the same words as the web app, which for scripture is not optional.
 *
 *   node scripts/import-content.mjs
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import vm from "node:vm";

const SRC = "../quran";
const OUT = "src/data";
mkdirSync(OUT, { recursive: true });

const files = [
  ["athkar.js",   "ATHKAR",   "athkar.json"],
  ["duas.js",     "DUAS",     "duas.json"],
  ["rabbanas.js", "RABBANAS", "rabbanas.json"],
];

for (const [file, global_, out] of files) {
  const code = readFileSync(`${SRC}/${file}`, "utf8");
  const sandbox = { window: {} };
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox, { filename: file });
  const data = sandbox.window[global_];
  if (!data) { console.error(`  FAIL ${file}: window.${global_} was not set`); process.exit(1); }
  writeFileSync(`${OUT}/${out}`, JSON.stringify(data));
  const size = (readFileSync(`${OUT}/${out}`).length / 1024).toFixed(0);
  const count = data.sections?.length ?? data.categories?.length ?? (Array.isArray(data) ? data.length : Object.keys(data).length);
  console.log(`  ok   ${file.padEnd(13)} -> ${out.padEnd(14)} ${size}KB, ${count} groups`);
}
