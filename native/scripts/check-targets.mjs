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

/* The target name must survive EAS's lookup.
 *
 * @bacons/apple-targets uses `name` as the Xcode target name verbatim, spaces
 * and all, but EAS assigns provisioning profiles by the name with whitespace
 * stripped. "Next Jamaah" in the config became target 'Next Jamaah' in the
 * project and a request for 'NextJamaah' from EAS, and the build failed with
 * "Could not find target 'NextJamaah' in project.pbxproj" — after prebuild
 * and pod install had both succeeded, so nothing earlier hinted at it. */
const cfgPath = path.join(root, "targets/widget/expo-target.config.js");
const cfgSrc = fs.readFileSync(cfgPath, "utf8");
const named = cfgSrc.match(/\n\s*name:\s*"([^"]+)"/);
if (!named) {
  console.log("FAIL  targets/widget/expo-target.config.js declares no `name`");
  process.exit(1);
}
if (/\s/.test(named[1])) {
  console.log(`FAIL  the widget target is named "${named[1]}", which contains whitespace.`);
  console.log("      @bacons/apple-targets makes that the Xcode target name verbatim, but EAS");
  console.log(`      assigns the provisioning profile to "${named[1].replace(/\s+/g, "")}" and the build dies at`);
  console.log("      \"Could not find target ... in project.pbxproj\" — after prebuild and pods pass.");
  console.log("      Nobody sees this name; the gallery name is configurationDisplayName in index.swift.");
  process.exit(1);
}

if (teamId && plugged) console.log(`widget and Watch target are ON (team ${teamId})`);
else console.log("widget and Watch target are OFF — no Apple Team ID yet, which is expected; " +
                 "the code is in targets/widget and store/IOS-RELEASE.md says how to turn it on");
