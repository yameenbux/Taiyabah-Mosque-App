/* Does every component a screen draws actually exist?
 *
 * parse-check.mjs reads every file through Babel, which proves the syntax is
 * good and nothing else: <Note> with no import for Note parses perfectly and
 * then throws "Element type is invalid" the moment the screen opens. That is
 * exactly what shipped on Imams' Advice — a screen that crashed outright,
 * past a parse check, a parity check and a link check, because none of them
 * look at whether a name is bound to anything.
 *
 * So this resolves every JSX tag in every file against what that file imports,
 * defines or has in scope. It is not a type checker; it answers one question,
 * which is the question that crashed the app.
 */
import fs from "node:fs";
import path from "node:path";
import { parseSync } from "@babel/core";

const root = path.resolve(import.meta.dirname, "..");
const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => {
  const f = path.join(d, e.name);
  return e.isDirectory() ? walk(f) : /\.jsx?$/.test(e.name) ? [f] : [];
});

/* React Native and the runtime bring these; a lowercase tag is a host element. */
const GLOBAL = new Set(["React", "Fragment"]);

let bad = 0, checked = 0;
for (const file of walk(path.join(root, "src"))) {
  const code = fs.readFileSync(file, "utf8");
  let ast;
  try { ast = parseSync(code, { filename: file, cwd: root }); }
  catch { continue; }                       // parse-check.mjs reports those

  const bound = new Set(GLOBAL);
  const used = new Map();                   // name -> line

  const visit = (node, scopeAdd) => {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) { node.forEach(n => visit(n, scopeAdd)); return; }
    switch (node.type) {
      case "ImportDefaultSpecifier": case "ImportSpecifier": case "ImportNamespaceSpecifier":
        bound.add(node.local.name); break;
      case "VariableDeclarator":
        if (node.id?.type === "Identifier") bound.add(node.id.name);
        if (node.id?.type === "ObjectPattern")
          for (const p of node.id.properties) if (p.value?.name) bound.add(p.value.name);
        break;
      case "FunctionDeclaration": case "ClassDeclaration":
        if (node.id) bound.add(node.id.name); break;
      case "JSXOpeningElement": {
        let n = node.name, name = null;
        if (n.type === "JSXIdentifier") name = n.name;
        else if (n.type === "JSXMemberExpression") {
          let o = n.object; while (o.type === "JSXMemberExpression") o = o.object;
          name = o.name;
        }
        /* A lowercase tag is a host component, not a binding. */
        if (name && /^[A-Z]/.test(name) && !used.has(name)) used.set(name, node.loc?.start.line ?? 0);
        break;
      }
    }
    for (const k of Object.keys(node)) {
      if (k === "loc" || k === "start" || k === "end" || k === "type") continue;
      visit(node[k], scopeAdd);
    }
  };
  visit(ast.program.body);

  checked++;
  for (const [name, line] of used) {
    if (bound.has(name)) continue;
    console.error(`  ${path.relative(root, file)}:${line}  <${name}> is drawn here but nothing of that name is imported or defined`);
    bad++;
  }
}
console.log(bad ? `\n${bad} component(s) would be undefined at runtime — each one crashes its screen.`
                : `every component drawn in ${checked} files is bound to something`);
process.exit(bad ? 1 : 0);
