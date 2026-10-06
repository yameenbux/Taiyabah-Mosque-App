/**
 * Taiyabah Masjid — the next jamāʿah, without opening the app.
 * Copyright (c) 2026 Yameen Bux. All rights reserved. See LICENSE.md.
 *
 * The highest-value thing on the whole iOS list: the app exists to answer one
 * question, and a widget answers it without the app being opened at all.
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
