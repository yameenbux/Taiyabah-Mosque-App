/**
 * Build against Android 16 (API 36) on the Gradle plugin Expo SDK 52 ships.
 *
 * WHY THIS EXISTS. Play refused version code 5 outright: "Your app currently
 * targets API level 35 and must target at least API level 36." That is a hard
 * error on the upload, not a warning, so the app cannot be updated at all
 * until it targets 36.
 *
 * compileSdkVersion and targetSdkVersion are set in app.json. The missing
 * piece is this: expo@52 pins the Android Gradle plugin at 8.6.0, whose
 * newest tested platform is 35, so compiling against 36 makes it stop with
 *
 *     We recommend using a newer Android Gradle plugin to use compileSdk = 36
 *
 * and, depending on the version, refuse rather than warn. The flag below is
 * Google's own escape hatch for exactly this: it says "yes, I know, build it
 * anyway". The platform jar is forward compatible; what is NOT compatible is
 * waiting for an Expo SDK bump to ship a fix for a congregation.
 *
 * It is written as a config plugin rather than a script run after prebuild so
 * that it applies wherever the Android project is generated — the smoke run,
 * the release workflow, and `expo run:android` on a laptop — rather than only
 * where somebody remembered to call it.
 */
const { withGradleProperties, withAndroidManifest } = require("expo/config-plugins");

const SDK = 36;

/* PREDICTIVE BACK STAYS OFF, for this release.
 *
 * Android 16 turns the predictive back gesture on by default for an app that
 * targets 36. It is a better gesture and this app should have it — but it
 * changes how every back press is delivered, and the only reason this build
 * targets 36 at all is that Play refused the upload an hour before a deadline.
 * Turning it on and testing it properly is its own piece of work, not a side
 * effect of a version bump. The attribute is still honoured at 36, so this
 * keeps the behaviour that was walked through on a real phone this morning. */
function withBackUnchanged(config) {
  return withAndroidManifest(config, cfg => {
    const app = cfg.modResults.manifest.application?.[0];
    if (app) app.$["android:enableOnBackInvokedCallback"] = "false";
    return cfg;
  });
}

/* NO STEP COUNTING, SO NO PHYSICAL ACTIVITY PERMISSION.
 *
 * expo-sensors is in this app for one thing: the magnetometer behind the qibla
 * compass. Its library manifest declares ACTIVITY_RECOGNITION for a pedometer
 * this app does not have, and the merge puts that permission into the bundle —
 * where Play sees it, stops the upload, and asks which health features the app
 * provides. The answer is none, and Google's own text says the fix is to take
 * the permission out rather than declare features that do not exist.
 *
 * It also spares the congregation a "Taiyabah Masjid wants to track your
 * physical activity" prompt for something it never asks the phone for.
 *
 * tools:node="remove" is the manifest merger's instruction to drop a node a
 * library contributed. Nothing in the app calls Pedometer, so nothing breaks. */
function withoutStepCounting(config) {
  return withAndroidManifest(config, cfg => {
    const manifest = cfg.modResults.manifest;
    manifest.$["xmlns:tools"] = manifest.$["xmlns:tools"] || "http://schemas.android.com/tools";
    const NAME = "android.permission.ACTIVITY_RECOGNITION";
    manifest["uses-permission"] = manifest["uses-permission"] || [];
    const already = manifest["uses-permission"].find(p => p.$ && p.$["android:name"] === NAME);
    if (already) already.$["tools:node"] = "remove";
    else manifest["uses-permission"].push({ $: { "android:name": NAME, "tools:node": "remove" } });
    return cfg;
  });
}

module.exports = function withApi36(config) {
  config = withBackUnchanged(config);
  config = withoutStepCounting(config);
  return withGradleProperties(config, cfg => {
    const key = "android.suppressUnsupportedCompileSdk";
    cfg.modResults = cfg.modResults.filter(
      item => !(item.type === "property" && item.key === key));
    cfg.modResults.push({
      type: "comment",
      value: " Android 16. See plugins/with-api-36.js — Play requires API 36 and the",
    });
    cfg.modResults.push({
      type: "comment",
      value: " Gradle plugin Expo 52 ships has not been told 36 exists yet.",
    });
    cfg.modResults.push({ type: "property", key, value: String(SDK) });
    return cfg;
  });
};
