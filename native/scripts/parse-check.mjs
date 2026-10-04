import babel from "@babel/core";
import fs from "node:fs"; import path from "node:path";
const root = "/home/user/Taiyabah-Mosque-App/native";
const files = [];
(function walk(d) { for (const f of fs.readdirSync(d)) {
  const p = path.join(d, f);
  if (fs.statSync(p).isDirectory()) { if (!/node_modules|dist|android|\.expo/.test(p)) walk(p); }
  else if (/\.(jsx?|mjs)$/.test(f)) files.push(p);
} })(path.join(root, "src"));
files.push(path.join(root, "index.js"));
let bad = 0;
for (const f of files) {
  try {
    babel.transformFileSync(f, { cwd: root, presets: [["babel-preset-expo", {}]], babelrc: false, configFile: false });
    console.log("  ok  " + path.relative(root, f));
  } catch (e) { bad++; console.log("FAIL  " + path.relative(root, f) + "\n      " + String(e.message).split("\n")[0]); }
}
console.log(bad ? `\n${bad} file(s) failed to parse` : `\nall ${files.length} files parse`);
process.exit(bad ? 1 : 0);
