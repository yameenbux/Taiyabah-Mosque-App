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

module.exports = function withApi36(config) {
  config = withBackUnchanged(config);
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
