/**
 * Taiyabah Masjid — the next jamāʿah, without opening the app.
 * Copyright (c) 2026 Yameen Bux. All rights reserved. See LICENSE.md.
 *
 * The highest-value thing on the whole iOS list: the app exists to answer one
 * question, and a widget answers it without the app being opened at all.
 *
 * NOT YET WIRED INTO THE BUILD, and the reason is a hard dependency rather
 * than a thing to push through. @bacons/apple-targets requires
 * `ios.appleTeamId` — it warns "missing required property" without one — and
 * a Team ID is issued by the Apple Developer account. Registering the plugin
 * before that exists produces a target that is incomplete in ways nothing on
 * Linux can see, and it would be sitting in the middle of an iOS build that
 * currently works.
 *
 * There is a second thing to settle on a machine with Xcode: the plugin wires
 * the target with a PBXFileSystemSynchronizedRootGroup, an Xcode 16 construct
 * needing objectVersion >= 70, and Expo SDK 52 generates objectVersion 46 with
 * the group pointing at ios/widget — a folder prebuild does not create. Both
 * v5.0.0 and v4.0.7 behave the same, so it is not a version choice.
 *
 * So: the Swift beside this file is written and reviewed, the target is
 * described, and the moment the account exists this becomes adding one plugin
 * line and running the macOS build that already exists.
 *
 * The same code serves the Apple Watch. A WidgetKit extension that offers the
 * accessory families — accessoryRectangular, accessoryCircular, accessoryInline
 * — provides the Watch's complications and the iPhone's Lock Screen widgets
 * from one target, so there is no second thing to keep in step.
 */
module.exports = config => ({
  type: "widget",
  name: "Next Jamaah",
  icon: "../../assets/icon.png",
  /* The same group the app declares, so the widget can read what the app
     writes once that path is wired on a device. */
  entitlements: {
    "com.apple.security.application-groups": ["group.com.taiyabahmasjid.app"],
  },
  /* The timetable travels INSIDE the widget. A widget that depends on the app
     having been opened recently shows a blank slot to somebody who installed
     it and then did not launch the app, which is precisely the person a widget
     is for. */
  resources: ["./timetable.json"],
  deploymentTarget: "17.0",
  colors: {
    WidgetBackground: { light: "#FCFAF3", dark: "#24091A" },
  },
});
