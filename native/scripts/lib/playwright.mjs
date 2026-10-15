/**
 * Taiyabah Masjid — find Playwright wherever it actually is.
 * Copyright (c) 2026 Yameen Bux. All rights reserved. See LICENSE.md.
 *
 * Twenty-two scripts used to open with:
 *
 *   import pw from "/opt/node22/lib/node_modules/playwright/index.js";
 *
 * An absolute path to one machine's global install, written into the source.
 * It worked on the container it was written on and nowhere else. On Windows
 * Node reads it as C:/opt/node22/..., so every one of those scripts died with
 * ERR_MODULE_NOT_FOUND — including check-extract.mjs, which is in `npm run
 * check`, so the whole pre-build gate failed on a path that has nothing to do
 * with the app.
 *
 * Playwright is not in package.json on purpose: it pulls browser binaries,
 * and EAS would install it on every build to run none of it. So it is an
 * OPTIONAL tool — present on a machine that does screenshot work, absent on
 * one that only builds. This resolves it from wherever it genuinely is, and
 * says plainly when it is nowhere.
 */

/** The module, or null when Playwright is not installed anywhere visible. */
export async function loadPlaywright() {
  /* The project's own node_modules first, then a global install, then the
     legacy hard-coded path so a machine still set up that way keeps working. */
  for (const spec of ["playwright", "playwright-core",
                      "/opt/node22/lib/node_modules/playwright/index.js"]) {
    try {
      const m = await import(spec);
      return m?.default ?? m;
    } catch { /* try the next one */ }
  }
  return null;
}

/** For the tools that cannot do anything without it. */
export async function requirePlaywright(what = "this script") {
  const pw = await loadPlaywright();
  if (pw) return pw;
  console.error(
    `\n${what} needs Playwright, which is not installed here.\n` +
    `It is deliberately not a dependency — it pulls browser binaries that a\n` +
    `build machine would never use. Install it just for this:\n\n` +
    `    npm i -D playwright && npx playwright install chromium\n`);
  process.exit(1);
}
