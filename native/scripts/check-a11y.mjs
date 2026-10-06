/**
 * Taiyabah Masjid — can a screen reader use this app?
 * Copyright (c) 2026 Yameen Bux. All rights reserved. See LICENSE.md.
 *
 * The congregation this app is for skews older. A good proportion of the
 * phones it runs on have TalkBack switched on or the system text at its
 * largest, and until this check existed the app had fifteen accessibility
 * props across twenty-three screens — six of them on one screen.
 *
 * What it looks for is the thing that actually breaks: a control with NOTHING
 * to announce. A button whose only child is an icon reads out as "button" and
 * nothing else, so the compass, the audio player, the month stepper and the
 * copy buttons were all unusable without sight. A control with words inside it
 * is fine — the screen reader reads the words — so this does not nag about
 * those.
 *
 * It reads the real JSX through Babel rather than guessing with regexes,
 * because "does this element have a text child anywhere inside it" is not a
 * question a regex can answer.
 *
 *   node scripts/check-a11y.mjs [--strict]
 */
import babel from "@babel/core";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");

/* Anything you can press. Press and NavRow are this app's own. */
const PRESSABLE = new Set([
  "Pressable", "TouchableOpacity", "TouchableHighlight", "TouchableWithoutFeedback",
  "Press", "Button",
]);
/* Things that draw a picture and say nothing. */
const MUTE = new Set(["Ionicons", "Svg", "SvgXml", "Image", "Polygon", "Path", "Circle", "Rect"]);

const files = [];
(function walk(d) {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f);
    if (fs.statSync(p).isDirectory()) { if (!/node_modules|dist|android|\.expo/.test(p)) walk(p); }
    else if (/\.jsx?$/.test(f)) files.push(p);
  }
})(path.join(root, "src"));

const name = n =>
  !n ? "" :
  n.type === "JSXIdentifier" ? n.name :
  n.type === "JSXMemberExpression" ? name(n.object) + "." + name(n.property) : "";

const findings = [];

for (const file of files.sort()) {
  const code = fs.readFileSync(file, "utf8");
  let ast;
  try {
    ast = babel.parseSync(code, {
      cwd: root, presets: [["babel-preset-expo", {}]],
      babelrc: false, configFile: false, ast: true, code: false,
    });
  } catch { continue; }                       // parse-check.mjs reports those

  /* Does anything inside this element put WORDS on the screen? A <Text>, a
   * string, or an expression — a label coming from a variable still ends up
   * being read out, and this check cannot know what is in it. */
  const speaks = node => {
    let found = false;
    (function visit(n) {
      if (found || !n || typeof n !== "object") return;
      if (Array.isArray(n)) { n.forEach(visit); return; }
      if (n.type === "JSXElement") {
        const tag = name(n.openingElement.name);
        if (/Text$/.test(tag) || tag === "Rich") { found = true; return; }
        if (MUTE.has(tag)) return;            // a picture says nothing
      }
      if (n.type === "JSXText" && n.value.trim()) { found = true; return; }
      if (n.type === "JSXExpressionContainer") { found = true; return; }
      for (const k of Object.keys(n)) if (k !== "loc" && k !== "openingElement") visit(n[k]);
    })(node.children);
    return found;
  };

  (function walkAst(n) {
    if (!n || typeof n !== "object") return;
    if (Array.isArray(n)) { n.forEach(walkAst); return; }

    if (n.type === "JSXElement") {
      const tag = name(n.openingElement.name);
      if (PRESSABLE.has(tag)) {
        const attrs = n.openingElement.attributes
          .filter(a => a.type === "JSXAttribute").map(a => a.name.name);
        const labelled = attrs.some(a => /^accessibilityLabel$/.test(a));
        const hasLabelProp = attrs.includes("label");   // NavRow/MenuRow take words
        if (!labelled && !hasLabelProp && !speaks(n)) {
          findings.push({
            file: path.relative(root, file),
            line: n.openingElement.loc?.start.line,
            tag,
          });
        }
      }
    }
    for (const k of Object.keys(n)) if (k !== "loc") walkAst(n[k]);
  })(ast.program.body);
}

for (const f of findings) console.log(`  ${f.file}:${f.line}  <${f.tag}> has nothing to announce`);
console.log(`\n${findings.length} controls a screen reader cannot name`);
if (findings.length && process.argv.includes("--strict")) process.exit(1);
