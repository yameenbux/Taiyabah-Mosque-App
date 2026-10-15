/**
 * Taiyabah Masjid — every page wears the same bar.
 * Copyright (c) 2026 Yameen Bux. All rights reserved. See LICENSE.md.
 *
 * App.jsx states the rule in as many words, next to the navigator options
 * that make it true:
 *
 *   "Qibla, Alerts, Donate and Live are not sheets on the website: they are
 *    four of its seven PAGES, and a page wears the app bar — the logo, the
 *    society's name and the bell — not a sheet header."
 *
 * More did not. It drew the wordmark alone on a gradient, on the reasoning
 * that the website's DRAWER opens under a bare wordmark — which is true of
 * the drawer and not of this. So three of the four tabs carried the masthead
 * and the fourth did not, and it changed under you as you moved between them.
 *
 * Nothing caught it, because nothing could: both headers are valid JSX, both
 * render, and a screenshot of either alone looks right. It took somebody
 * putting two of them side by side.
 *
 * So the rule is checked rather than written down. A screen is a PAGE if it
 * is a tab, or if it is registered with the `page` options — and a page must
 * render the shared <TopBar>, not a header of its own.
 *
 *   node scripts/check-appbar.mjs
 */
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const app = fs.readFileSync(path.join(root, "src/App.jsx"), "utf8");

const fail = [];
const say = (m) => fail.push(m);

/* Every tab, and every screen the navigator gives the `page` options to.
   Both lists come out of App.jsx, so adding a page adds it here too. */
const pages = new Map();
for (const m of app.matchAll(/<Tab\.Screen\s+name="(\w+)"\s+component=\{(\w+)\}/g))
  pages.set(m[2], `tab ${m[1]}`);
for (const m of app.matchAll(/<Stack\.Screen\s+name="(\w+)"\s+component=\{(\w+)\}\s+options=\{page\}/g))
  pages.set(m[2], `page ${m[1]}`);

if (pages.size < 4)
  say(`only found ${pages.size} pages in App.jsx — the patterns this reads have probably changed`);

/* Where each component actually lives. Both forms: the default import, and
   the named one — NewBuild is a second page exported from Donate.jsx. */
const imports = new Map();
for (const m of app.matchAll(/^import\s+(\w+)\s*,?\s*(?:\{([^}]*)\})?\s*from\s+"\.\/screens\/([\w-]+)"/gm)) {
  imports.set(m[1], `src/screens/${m[3]}.jsx`);
  for (const n of (m[2] || "").split(",").map((x) => x.trim().split(/\s+as\s+/).pop()).filter(Boolean))
    imports.set(n, `src/screens/${m[3]}.jsx`);
}
for (const m of app.matchAll(/^import\s+\{([^}]*)\}\s+from\s+"\.\/screens\/([\w-]+)"/gm))
  for (const n of m[1].split(",").map((x) => x.trim().split(/\s+as\s+/).pop()).filter(Boolean))
    imports.set(n, `src/screens/${m[2]}.jsx`);

for (const [component, how] of pages) {
  const rel = imports.get(component);
  if (!rel) { say(`${component} is a ${how} but App.jsx does not import it from ./screens`); continue; }
  const file = path.join(root, rel);
  if (!fs.existsSync(file)) { say(`${rel} is missing`); continue; }
  const src = fs.readFileSync(file, "utf8");

  if (!/<TopBar\b/.test(src))
    say(`${rel} is a ${how} but does not render <TopBar>. ` +
        `A page wears the app bar — the logo, the society's name and the bell.`);

  /* And it must not draw its own masthead instead. The logo belongs to
     TopBar; a screen reaching for it directly is the bug this exists for. */
  if (/require\(["'][^"']*logo\.png["']\)/.test(src))
    say(`${rel} loads logo.png itself. The masthead is TopBar's — a second copy ` +
        `is how the bar starts differing between pages.`);
}

if (fail.length) {
  console.error(`\n${fail.length} problem(s) with the app bar:\n`);
  for (const m of fail) console.error("  " + m);
  console.error("");
  process.exit(1);
}
console.log(`all ${pages.size} pages wear the same app bar`);
