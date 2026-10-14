/**
 * Raise the Xcode project format so the widget's folder is actually read.
 * Copyright (c) 2026 Yameen Bux. All rights reserved. See LICENSE.md.
 *
 * WHAT THIS IS FOR. @bacons/apple-targets attaches the widget to the project
 * with a PBXFileSystemSynchronizedRootGroup — the Xcode 16 construct that says
 * "this target's sources are whatever is in this folder" rather than listing
 * every file. It is the right mechanism and it is what makes targets/widget
 * work without a hundred lines of file references.
 *
 * But a synchronized group is only honoured when the project declares a
 * format new enough to know what one is. Expo SDK 52's iOS template declares
 *
 *     objectVersion = 46;
 *
 * which predates it by about a decade, and @bacons/xcode keeps whatever it
 * finds — XcodeProject.js: `json.objectVersion ?? DEFAULT_OBJECT_VERSION`,
 * where the default is also 46. Nothing in the chain ever raises it.
 *
 * The result is a project that compiles and produces a widget extension with
 * NO SOURCE FILES IN IT: the group is there, the target is there, the Swift is
 * on disk where the group points, and Xcode walks past all of it. That failure
 * arrives a long way from this cause, which is why it is written down here.
 *
 * 77 is not a guess. It is LAST_KNOWN_OBJECT_VERSION in @bacons/xcode's own
 * constants — the version its authors target — and it is what Xcode 16 writes
 * for a new project.
 *
 * WHY TEXT AND NOT THE XCODE API. Parsing the project and writing it back
 * risks losing the very constructs this exists to enable; several of the
 * synchronized-group types are new enough that a round trip is not free. One
 * integer on one line is a smaller thing to change than a whole file.
 *
 * WHY A PLUGIN AND NOT A SCRIPT AFTER PREBUILD. The same reason as
 * with-api-36.js: so it applies wherever the project is generated — EAS, the
 * release workflow, `expo run:ios` on a laptop — rather than only where
 * somebody remembered to run it.
 */
const { withDangerousMod } = require("expo/config-plugins");
const fs = require("fs");
const path = require("path");

/* @bacons/xcode's LAST_KNOWN_OBJECT_VERSION. Synchronized root groups need
   at least 70; this is what Xcode 16 itself writes. */
const WANTED = 77;
const MINIMUM = 70;

module.exports = function withXcodeObjectVersion(config) {
  return withDangerousMod(config, [
    "ios",
    async cfg => {
      const iosRoot = cfg.modRequest.platformProjectRoot;
      const projects = fs.existsSync(iosRoot)
        ? fs.readdirSync(iosRoot).filter(n => n.endsWith(".xcodeproj"))
        : [];

      for (const proj of projects) {
        const file = path.join(iosRoot, proj, "project.pbxproj");
        if (!fs.existsSync(file)) continue;
        const before = fs.readFileSync(file, "utf8");
        const found = before.match(/objectVersion = (\d+);/);
        if (!found) {
          console.warn(`with-xcode-object-version: ${proj} declares no objectVersion`);
          continue;
        }
        const current = Number(found[1]);
        if (current >= MINIMUM) continue;              // already new enough
        const after = before.replace(/objectVersion = \d+;/, `objectVersion = ${WANTED};`);
        fs.writeFileSync(file, after);
        console.log(`with-xcode-object-version: ${proj} ${current} -> ${WANTED} ` +
                    "(so the widget's synchronized folder is read)");
      }
      return cfg;
    },
  ]);
};
