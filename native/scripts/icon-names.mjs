/**
 * Taiyabah Masjid — every Ionicons glyph the app can possibly draw.
 * Copyright (c) 2026 Yameen Bux. All rights reserved. See LICENSE.md.
 *
 * The icon font is 432KB and the app draws a fraction of it, so it ships
 * subsetted. Subsetting is worth doing CAREFULLY: a glyph left out does not
 * fail the build, it draws an empty box on somebody's screen.
 *
 * THE MISTAKE THIS FILE USED TO MAKE
 * ----------------------------------
 * It enumerated the ways a name can travel: a string on a `name` prop, both
 * arms of a ternary, a string under an `icon:` key. That is a losing game —
 * every new idiom in the app silently drops glyphs, and the check that guards
 * the subset reads its list from HERE, so the check agrees with the bug and
 * passes. It shipped a tab bar of four empty boxes past three green runs:
 *
 *     const icon = name => ({ color, focused }) =>
 *       <Ionicons name={focused ? name : `${name}-outline`} .../>
 *     ... tabBarIcon: icon("home")
 *
 * Missed twice over — the ternary arms are an identifier and a template, not
 * literals, and "home" arrives under `tabBarIcon` as a call argument. Chasing
 * it turned up three more classes it had never seen: `icon="mail-outline"` as
 * a plain JSX attribute on our own components (it only read `icon:` OBJECT
 * keys), names concatenated in a template (`${icon}-outline` in ui.jsx), and
 * names that live in src/data/*.json and never appear in a .jsx file at all.
 * None of those were cosmetic — logo-youtube, mail-outline and trash-outline
 * are drawn on real screens and were absent from the shipped font.
 *
 * WHAT IT DOES NOW
 * ----------------
 * It stops asking how a name travels. It collects EVERY string in the source
 * — string literals and the static pieces of template literals, wherever they
 * sit — and keeps the ones that are real Ionicons glyph names. The glyph map
 * is the ground truth that makes this safe to be blunt with: a string has to
 * name an actual glyph to survive, so the false positives are bounded by
 * Ionicons' own vocabulary rather than by our cleverness.
 *
 * Names built by concatenation are handled the same blunt way: any collected
 * string beginning with "-" is a possible tail (`-outline`, `-sharp`), and
 * every name+tail that Ionicons recognises is included too. That is how the
 * tab bar's outline variants come back without anyone naming them, and how the
 * row icons in sheets.json survive ui.jsx appending "-outline" to them.
 *
 * The same bluntness covers data: the JSON under src/ is scanned as text for
 * quoted strings, because an icon named only in a data file is still an icon.
 *
 * It is deliberately over-inclusive. A glyph in the subset that nothing draws
 * costs a few hundred bytes; a glyph missing from it is a bug on a phone.
 */
import babel from "@babel/core";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const MAP = path.join(root, "node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/glyphmaps/Ionicons.json");
const glyphMap = JSON.parse(fs.readFileSync(MAP, "utf8"));

const files = [], data = [];
(function walk(d) {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f);
    if (fs.statSync(p).isDirectory()) { if (!/node_modules|dist|android|ios|\.expo/.test(p)) walk(p); }
    else if (/\.jsx?$/.test(f)) files.push(p);
    else if (/\.json$/.test(f)) data.push(p);
  }
})(path.join(root, "src"));

/* Every string the source contains, no matter where it sits. */
const strings = new Set();
for (const file of files) {
  const ast = babel.parseSync(fs.readFileSync(file, "utf8"), {
    cwd: root, filename: file, presets: [["babel-preset-expo", {}]],
    babelrc: false, configFile: false, sourceType: "module",
  });
  babel.traverse(ast, {
    StringLiteral(p) {
      /* A ROLE IS NOT AN ICON. "checkbox", "radio", "link", "search" and
         "image" are all Ionicons glyph names as well as accessibility roles,
         so the moment a control said accessibilityRole="checkbox" this asked
         for a glyph nothing draws — and the subset check then failed for a
         picture the app has never shown. Excluded only where it is that
         attribute's own value; the same word written anywhere else still
         counts, because being over-inclusive everywhere else is the whole
         point of this file. */
      const up = p.parent;
      if (up && up.type === "JSXAttribute" && up.name && up.name.name === "accessibilityRole") return;
      strings.add(p.node.value);
    },
    TemplateElement(p) { const v = p.node.value.cooked; if (v) strings.add(v); },
  });
}

/* Data files hold icon names too — the row icons in sheets.json reach the font
   without passing through a .jsx file. Read as text: a glyph name is ASCII
   kebab-case, so scripture and translations cannot collide with one. */
for (const file of data)
  for (const m of fs.readFileSync(file, "utf8").matchAll(/"([a-z][a-z0-9-]{1,40})"/g))
    strings.add(m[1]);

/* The ones Ionicons actually has a glyph for. */
const names = new Set([...strings].filter(s => s in glyphMap));

/* ...plus the variants that concatenation can build out of them. */
const tails = [...strings].filter(s => /^-[a-z0-9-]+$/.test(s));
for (const n of [...names]) for (const tail of tails)
  if (n + tail in glyphMap) names.add(n + tail);

const sorted = [...names].sort();
if (process.argv.includes("--json")) console.log(JSON.stringify(sorted));
else {
  console.log(`${sorted.length} glyph name(s) from ${files.length} source + ${data.length} data file(s), tails seen: ${tails.join(" ") || "none"}`);
  for (const n of sorted) console.log("  " + n);
}
