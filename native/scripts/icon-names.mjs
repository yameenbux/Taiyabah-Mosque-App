/**
 * Taiyabah Masjid — every Ionicons glyph the app can possibly draw.
 * Copyright (c) 2026 Yameen Bux. All rights reserved. See LICENSE.md.
 *
 * The icon font is 432KB and the app draws a handful of glyphs from it. That
 * is worth subsetting, and subsetting is worth doing CAREFULLY: a glyph left
 * out does not fail the build, it draws an empty box on somebody's screen.
 *
 * A regex over `name="..."` finds the easy ones and silently misses every
 * icon that arrives through a variable — the home tiles, the menu rows and the
 * reminder carousel all pass theirs in from data. So this reads the AST and
 * collects, from every file:
 *
 *   - every string literal assigned to a `name` prop on an Ionicons element,
 *     including both arms of a ternary;
 *   - every string literal assigned to an `icon` key in any object, which is
 *     how the data-driven ones travel.
 *
 * It is deliberately over-inclusive. A glyph in the subset that nothing draws
 * costs a few bytes; a glyph missing from it is a bug on a phone.
 */
import babel from "@babel/core";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const files = [];
(function walk(d) {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f);
    if (fs.statSync(p).isDirectory()) { if (!/node_modules|dist|android|ios|\.expo/.test(p)) walk(p); }
    else if (/\.jsx?$/.test(f)) files.push(p);
  }
})(path.join(root, "src"));

/* Ionicons names are kebab-case and often end in a known suffix. This is only
   used to filter `icon:` keys, which could hold anything. */
const LOOKS_LIKE = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;

const names = new Set();
const addFromNode = node => {
  if (!node) return;
  if (node.type === "StringLiteral") { if (LOOKS_LIKE.test(node.value)) names.add(node.value); return; }
  if (node.type === "ConditionalExpression") { addFromNode(node.consequent); addFromNode(node.alternate); return; }
  if (node.type === "LogicalExpression") { addFromNode(node.left); addFromNode(node.right); return; }
};

for (const file of files) {
  const ast = babel.parseSync(fs.readFileSync(file, "utf8"), {
    cwd: root, filename: file, presets: [["babel-preset-expo", {}]],
    babelrc: false, configFile: false, sourceType: "module",
  });
  babel.traverse(ast, {
    JSXOpeningElement(p) {
      const tag = p.node.name;
      if (tag.type !== "JSXIdentifier" || !/^Ionicons$/.test(tag.name)) return;
      for (const a of p.node.attributes) {
        if (a.type !== "JSXAttribute" || a.name.name !== "name") continue;
        if (a.value?.type === "StringLiteral") addFromNode(a.value);
        else if (a.value?.type === "JSXExpressionContainer") addFromNode(a.value.expression);
      }
    },
    ObjectProperty(p) {
      const k = p.node.key;
      const key = k.type === "Identifier" ? k.name : k.type === "StringLiteral" ? k.value : null;
      if (key !== "icon" && key !== "tabIcon") return;
      addFromNode(p.node.value);
    },
  });
}

const sorted = [...names].sort();
if (process.argv.includes("--json")) console.log(JSON.stringify(sorted));
else { console.log(`${sorted.length} glyph name(s):`); for (const n of sorted) console.log("  " + n); }
