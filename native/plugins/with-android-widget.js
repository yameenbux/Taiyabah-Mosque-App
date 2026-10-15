/**
 * The Android home-screen widget, wired into the generated project.
 * Copyright (c) 2026 Yameen Bux. All rights reserved. See LICENSE.md.
 *
 * WHY THIS EXISTS. @bacons/apple-targets builds the iOS extension; nothing
 * equivalent does Android, so the provider, its layouts and its drawables live
 * in targets/android-widget and are copied into the generated project here.
 * The same bargain as with-api-36.js: a config plugin rather than a script run
 * after prebuild, so it applies wherever the project is generated — EAS, the
 * release workflow, `expo run:android` on a laptop — and not only where
 * somebody remembered to run it.
 *
 * THE TIMETABLE TRAVELS WITH IT. targets/widget/timetable.json — the same file
 * the iOS widget carries — is copied to res/raw. One published year, one copy
 * on disk, and a widget that works on a phone that has never opened the app.
 *
 * RECEIVE_BOOT_COMPLETED IS NOT OPTIONAL HERE, and it is worth saying why
 * rather than letting somebody delete it as clutter. The countdown is a
 * Chronometer, whose base is expressed in SystemClock.elapsedRealtime() — a
 * clock that RESETS TO ZERO AT BOOT. A widget that survives a reboot without
 * being told would keep counting from a base that no longer means anything
 * and show plain nonsense. The boot broadcast is what redraws it, and it is
 * also what re-arms the alarm, which does not survive a reboot either.
 */
const { withDangerousMod, withAndroidManifest, AndroidConfig } = require("expo/config-plugins");
const fs = require("fs");
const path = require("path");

const PACKAGE = "com.taiyabahmasjid.app.widget";
const PROVIDER = `${PACKAGE}.NextJamaahWidget`;
const TICK = `${PACKAGE}.TICK`;

/* Recursive copy, because the res tree has four directories in it and Node 18
   does not have fs.cpSync on every runtime this might meet. */
function copyTree(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const src = path.join(from, entry.name);
    const dst = path.join(to, entry.name);
    if (entry.isDirectory()) copyTree(src, dst);
    else fs.copyFileSync(src, dst);
  }
}

const withFiles = config =>
  withDangerousMod(config, [
    "android",
    async cfg => {
      const root = cfg.modRequest.projectRoot;
      const main = path.join(cfg.modRequest.platformProjectRoot, "app/src/main");
      const from = path.join(root, "targets/android-widget");

      if (!fs.existsSync(from)) {
        throw new Error("with-android-widget: targets/android-widget is missing — " +
                        "the widget source was deleted or moved");
      }

      copyTree(path.join(from, "java"), path.join(main, "java"));
      copyTree(path.join(from, "res"), path.join(main, "res"));

      /* The iOS widget's copy, verbatim. If these two ever diverge the two
         platforms disagree about when the jamāʿah is, which is the one thing
         a masjid's app may never do. */
      const timetable = path.join(root, "targets/widget/timetable.json");
      if (!fs.existsSync(timetable)) {
        throw new Error("with-android-widget: targets/widget/timetable.json is missing — " +
                        "the Android widget shares the iOS widget's copy");
      }
      const raw = path.join(main, "res/raw");
      fs.mkdirSync(raw, { recursive: true });
      fs.copyFileSync(timetable, path.join(raw, "taiyabah_timetable.json"));

      console.log("with-android-widget: provider, layouts, drawables and timetable copied in");
      return cfg;
    },
  ]);

const withReceiver = config =>
  withAndroidManifest(config, cfg => {
    const app = AndroidConfig.Manifest.getMainApplicationOrThrow(cfg.modResults);
    app.receiver = (app.receiver || []).filter(
      r => r.$ && r.$["android:name"] !== PROVIDER);

    app.receiver.push({
      $: {
        "android:name": PROVIDER,
        /* Exported, and it has to be: the system is what broadcasts
           APPWIDGET_UPDATE, and an unexported receiver never hears it. The
           only thing an outside caller can do with TICK is ask the widget to
           redraw itself from a file it already ships. */
        "android:exported": "true",
      },
      "intent-filter": [
        {
          action: [
            { $: { "android:name": "android.appwidget.action.APPWIDGET_UPDATE" } },
            { $: { "android:name": "android.intent.action.BOOT_COMPLETED" } },
            { $: { "android:name": "android.intent.action.TIME_SET" } },
            { $: { "android:name": "android.intent.action.TIMEZONE_CHANGED" } },
            { $: { "android:name": "android.intent.action.DATE_CHANGED" } },
            { $: { "android:name": TICK } },
          ],
        },
      ],
      "meta-data": [
        {
          $: {
            "android:name": "android.appwidget.provider",
            "android:resource": "@xml/taiyabah_next_jamaah_info",
          },
        },
      ],
    });

    /* See the header: the Chronometer's base is meaningless after a reboot
       and the alarm is gone, so the widget has to be told. */
    const manifest = cfg.modResults.manifest;
    manifest["uses-permission"] = manifest["uses-permission"] || [];
    const BOOT = "android.permission.RECEIVE_BOOT_COMPLETED";
    if (!manifest["uses-permission"].some(p => p.$ && p.$["android:name"] === BOOT)) {
      manifest["uses-permission"].push({ $: { "android:name": BOOT } });
    }
    return cfg;
  });

module.exports = function withAndroidWidget(config) {
  return withReceiver(withFiles(config));
};
