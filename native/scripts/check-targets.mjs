/**
 * Taiyabah Masjid — the widget and the Watch target are on, or they are off.
 * Copyright (c) 2026 Yameen Bux. All rights reserved. See LICENSE.md.
 *
 * The WidgetKit code is written and sitting in targets/widget, and it is NOT
 * in the build. Turning it on takes two things that have to arrive together:
 *
 *   1. `ios.appleTeamId` in app.json — issued only with an Apple Developer
 *      account, which is why neither is here yet;
 *   2. `@bacons/apple-targets` in the plugins list, which is what actually
 *      generates the extension.
 *
 * Either one alone is a bad day. The Team ID without the plugin builds a
 * perfectly good app with no widget in it and nothing anywhere saying why —
 * the most likely mistake, because the Team ID is the part a person has just
 * been given and is thinking about. The plugin without the Team ID fails
 * inside prebuild, a long way from the cause.
 *
 * So this insists they move together, and otherwise says plainly that the
 * widget is off, so a silent absence is never mistaken for a working one.
 */
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const expo = JSON.parse(fs.readFileSync(path.join(root, "app.json"), "utf8")).expo;

const PLUGIN = "@bacons/apple-targets";
const teamId = expo.ios?.appleTeamId;
const plugged = (expo.plugins || []).some(p => (Array.isArray(p) ? p[0] : p) === PLUGIN);
const written = fs.existsSync(path.join(root, "targets/widget/index.swift"));

if (!written) {
  console.log("FAIL  targets/widget/index.swift is gone — the widget source was deleted");
  process.exit(1);
}

if (teamId && !plugged) {
  console.log(`FAIL  app.json has ios.appleTeamId (${teamId}) but not ${PLUGIN} in plugins.`);
  console.log("      The app will build and will contain no widget and no Watch");
  console.log("      complication, and nothing will say so. Add the plugin.");
  process.exit(1);
}
if (plugged && !teamId) {
  console.log(`FAIL  app.json lists ${PLUGIN} but has no ios.appleTeamId.`);
  console.log("      prebuild needs the Team ID to generate the extension and will fail");
  console.log("      a long way from this cause. Add ios.appleTeamId, or drop the plugin.");
  process.exit(1);
}

/* The target name must survive EAS's own sanitiser unchanged.
 *
 * @bacons/apple-targets does two things with `name` from expo-target.config.js
 * and they do not agree:
 *
 *   - it creates the Xcode target with the name VERBATIM, spaces and all;
 *   - it injects {targetName: sanitizedName(name)} into
 *     extra.eas.build.experimental.ios.appExtensions, which is where EAS reads
 *     the extension list from for a managed project.
 *
 * EAS then assigns the provisioning profile with findNativeTargetByName, which
 * compares the pbxproj name EXACTLY (@expo/config-plugins/build/ios/Target.js,
 * findNativeTargetByName). So "Next Jamaah" became target 'Next Jamaah' in the
 * project and a request for 'NextJamaah' from EAS, and the build died at
 *   Could not find target 'NextJamaah' in project.pbxproj
 * after expo doctor, prepare credentials, prebuild and pod install had all
 * passed — a minute of build time and no hint of the cause anywhere earlier.
 *
 * The rule, therefore, is not "no spaces". It is that sanitising must change
 * nothing, because whatever sanitising removes is exactly what makes the two
 * names differ. This is sanitizedNameForProjects from
 * @expo/config-plugins/build/ios/utils/Xcodeproj.js, copied rather than
 * imported so that a hoist change cannot silently turn the check off. */
const sanitize = n =>
  n.replace(/[\W_]+/g, "").normalize("NFD").replace(/[̀-ͯ]/g, "");

const cfgPath = path.join(root, "targets/widget/expo-target.config.js");
const named = fs.readFileSync(cfgPath, "utf8").match(/\n\s*name:\s*"([^"]+)"/);
if (!named) {
  console.log("FAIL  targets/widget/expo-target.config.js declares no `name`");
  process.exit(1);
}
if (sanitize(named[1]) !== named[1]) {
  console.log(`FAIL  the widget target is named "${named[1]}".`);
  console.log(`      @bacons/apple-targets makes that the Xcode target name verbatim, but tells`);
  console.log(`      EAS the extension is called "${sanitize(named[1])}", and EAS matches exactly.`);
  console.log(`      The build fails at "Could not find target '${sanitize(named[1])}' in project.pbxproj",`);
  console.log(`      after prebuild and pods have both passed.`);
  console.log(`      Rename it to "${sanitize(named[1])}". Nobody sees this string — the name in the`);
  console.log(`      widget gallery is configurationDisplayName in index.swift.`);
  process.exit(1);
}

if (teamId && plugged) console.log(`widget and Watch target are ON (team ${teamId})`);
else console.log("widget and Watch target are OFF — no Apple Team ID yet, which is expected; " +
                 "the code is in targets/widget and store/IOS-RELEASE.md says how to turn it on");
