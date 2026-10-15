/**
 * Taiyabah Masjid — run the Android widget's own logic, not just compile it.
 * Copyright (c) 2026 Yameen Bux. All rights reserved. See LICENSE.md.
 *
 * check-android-widget.mjs proves the widget's resources and layouts are
 * sound. It says nothing about whether the thing names the right prayer. That
 * matters more than any of it: a widget that draws beautifully and says Asr
 * when the next jamāʿah is Maghrib has sent somebody to the masjid an hour
 * late.
 *
 * So this compiles the real provider against a real Android framework jar and
 * runs its real decision methods — daySlots, nextFrom, hijri — over the real
 * timetable the app ships, by reflection, exactly as the home screen would.
 *
 * It needs a JDK and one jar from Maven, so it is not part of `npm run
 * check`: it skips, loudly but successfully, when either is missing.
 *
 *   node scripts/check-android-logic.mjs
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";

const root = path.resolve(import.meta.dirname, "..");
const target = path.join(root, "targets/android-widget");
const provider = path.join(target, "java/com/taiyabahmasjid/app/widget/NextJamaahWidget.java");
const harness = path.join(target, "test/Harness.java");
const timetable = path.join(root, "targets/widget/timetable.json");

/* Robolectric publishes the whole framework as one ordinary jar, which is the
   only way to type-check and run this code without an SDK install. */
const JAR = "org/robolectric/android-all/15-robolectric-13954326/android-all-15-robolectric-13954326.jar";
const cache = path.join(os.homedir(), ".cache/taiyabah-android-jar");
const jar = path.join(cache, "android-all.jar");

const skip = (why) => { console.log(`skipped the Android widget logic run — ${why}`); process.exit(0); };

const has = (cmd) => spawnSync(cmd, ["-version"], { stdio: "ignore" }).status === 0;
if (!has("javac") || !has("java")) skip("no JDK here");

if (!fs.existsSync(jar)) {
  fs.mkdirSync(cache, { recursive: true });
  const r = spawnSync("curl", ["-fsSL", "-o", jar, `https://repo1.maven.org/maven2/${JAR}`], { stdio: "ignore" });
  if (r.status !== 0 || !fs.existsSync(jar)) {
    fs.rmSync(jar, { force: true });
    skip("could not fetch the Android framework jar");
  }
}

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "android-logic-"));
const pkg = path.join(dir, "src/com/taiyabahmasjid/app/widget");
fs.mkdirSync(pkg, { recursive: true });
fs.copyFileSync(provider, path.join(pkg, "NextJamaahWidget.java"));
fs.copyFileSync(harness, path.join(pkg, "Harness.java"));

/* aapt generates R in the APPLICATION's package, not the widget's. Putting a
   stand-in anywhere else is what let the missing `import …app.R` through a
   compile check once already, so it goes exactly where the real one lands. */
const src = fs.readFileSync(provider, "utf8");
const kinds = {};
for (const [, kind, name] of src.matchAll(/\bR\.(\w+)\.(\w+)/g)) (kinds[kind] ??= new Set()).add(name);
const body = Object.entries(kinds).sort()
  .map(([k, v]) => `  public static final class ${k} { ` +
    [...v].sort().map((n, i) => `public static final int ${n}=${i + 1};`).join(" ") + " }")
  .join("\n");
fs.mkdirSync(path.join(dir, "src/com/taiyabahmasjid/app"), { recursive: true });
fs.writeFileSync(path.join(dir, "src/com/taiyabahmasjid/app/R.java"),
                 `package com.taiyabahmasjid.app;\npublic final class R {\n${body}\n}\n`);

const run = (cmd, args) => spawnSync(cmd, args, { stdio: "inherit", cwd: dir });
const sources = ["src/com/taiyabahmasjid/app/R.java",
                 "src/com/taiyabahmasjid/app/widget/NextJamaahWidget.java",
                 "src/com/taiyabahmasjid/app/widget/Harness.java"];
if (run("javac", ["-nowarn", "-d", "out", "-cp", jar, ...sources]).status !== 0) {
  console.error("FAIL  the Android widget provider does not compile");
  process.exit(1);
}
const r = run("java", ["-cp", `out:${jar}`, "com.taiyabahmasjid.app.widget.Harness", timetable]);
fs.rmSync(dir, { recursive: true, force: true });
process.exit(r.status === 0 ? 0 : 1);
