/**
 * Taiyabah Masjid — no colour may be read at module scope.
 * Copyright (c) 2026 Yameen Bux. All rights reserved. See LICENSE.md.
 *
 * WHY THIS EXISTS.
 *
 * `C` is a Proxy over two palettes, which is what lets one line of theming
 * reach 28 files without touching them: every `C.ink` inside a component is
 * looked up WHEN IT RENDERS, so switching the theme and re-rendering is the
 * whole mechanism.
 *
 * A read OUTSIDE a function body is looked up once, when the module is first
 * imported — before anybody has chosen anything. It freezes to light and stays
 * light for the life of the process, so the screen keeps a cream card on a
 * dark page and no amount of re-rendering fixes it.
 *
 * It is invisible in review: `C.brand800` looks identical whether it sits in a
 * module-level const or in a style prop. The first dark render caught one
 * (CALLOUT_TONES, which seven screens use); a regex could not tell them apart,
 * so this walks the AST and asks whether each read has a function above it.
 *
 *   node scripts/check-theme.mjs
 */
import babel from "@babel/core";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const FN = new Set(["FunctionDeclaration", "FunctionExpression", "ArrowFunctionExpression",
                    "ObjectMethod", "ClassMethod"]);
/* The two Proxies. A read of LIGHT.ink at module scope is fine — that is a
 * plain object, not the live one. */
const LIVE = new Set(["C", "SHADOW"]);

/* It has to be the one imported from theme.js, not merely something called C.
 * crash.js has `const C = Platform.constants`, and flagging that would teach
 * everybody to ignore this check — which is worse than not having it. */
function isTheTheme(p, name) {
  const b = p.scope.getBinding(name);
  if (!b) return false;                                  // a global; not ours
  const d = b.path;
  if (d.type !== "ImportSpecifier" && d.type !== "ImportDefaultSpecifier") return false;
  return /(^|\/)theme(\.js)?$/.test(d.parent.source.value);
}

const files = [];
(function walk(d) {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f);
    if (fs.statSync(p).isDirectory()) { if (!/node_modules|dist|android|\.expo/.test(p)) walk(p); }
    else if (/\.jsx?$/.test(f)) files.push(p);
  }
})(path.join(root, "src"));

const found = [];
for (const file of files) {
  if (path.basename(file) === "theme.js") continue;      // it defines them
  const src = fs.readFileSync(file, "utf8");
  if (!LIVE.has("C") || !/\bC\.|\bSHADOW\b/.test(src)) continue;
  /* parseSync, NOT transformSync: the preset rewrites `import { C }` into a
     require() call, and then the scope lookup above can no longer tell the
     theme's C from any other. Parsing leaves the imports standing. */
  const ast = babel.parseSync(src, {
    cwd: root, filename: file, presets: [["babel-preset-expo", {}]],
    babelrc: false, configFile: false, sourceType: "module",
  });
  babel.traverse(ast, {
    MemberExpression(p) {
      if (p.node.object.type !== "Identifier" || !LIVE.has(p.node.object.name)) return;
      if (!isTheTheme(p, p.node.object.name)) return;
      /* Does any function sit between this read and the top of the file? */
      if (p.getFunctionParent()) return;
      const prop = p.node.property.name || p.node.property.value || "?";
      found.push({ file: path.relative(root, file), line: p.node.loc.start.line,
                   text: `${p.node.object.name}.${prop}` });
    },
    /* dual("#6B5410", C.goldInk) picks by the theme that is current WHEN IT
       RUNS, so at module scope it picks light once and keeps it. */
    CallExpression(p) {
      if (p.node.callee.type !== "Identifier" || p.node.callee.name !== "dual") return;
      if (!isTheTheme(p, "dual")) return;
      if (p.getFunctionParent()) return;
      found.push({ file: path.relative(root, file), line: p.node.loc.start.line,
                   text: "dual(...)" });
    },
    /* `SHADOW` spread whole — {...SHADOW} — is the same freeze without a
       member read, and it is how every card in the app takes its shadow. */
    SpreadElement(p) {
      if (p.node.argument.type !== "Identifier" || !LIVE.has(p.node.argument.name)) return;
      if (!isTheTheme(p, p.node.argument.name)) return;
      if (p.getFunctionParent()) return;
      found.push({ file: path.relative(root, file), line: p.node.loc.start.line,
                   text: `...${p.node.argument.name}` });
    },
  });
}

for (const f of found) console.log(`FAIL  ${f.file}:${f.line}  ${f.text} is read at module scope`);
if (found.length) {
  console.log(`\n${found.length} colour read(s) happen once at import and freeze to the light palette.`);
  console.log("Move the value inside the component, or make it a function that is called at render.");
  process.exit(1);
}
console.log(`all ${files.length} files read colours at render time`);
