/* What a crash report says, decided away from React Native.
 * Copyright (c) 2026 Yameen Bux. All rights reserved. See LICENSE.md.
 *
 * WHY THIS IS A SEPARATE FILE. app_crashes held zero rows on the day the
 * native app went to production — not one report, ever. The code looked
 * right, and "looks right" is exactly what the rest of this repository
 * refuses to accept anywhere else. It could not be tested because crash.js
 * imports react-native and expo-constants, which a Node test cannot load, so
 * the one path whose whole job is to tell us when something breaks was the
 * one path nothing was checking.
 *
 * Everything that DECIDES anything now lives here, with no imports at all:
 * what the message is trimmed to, what the payload holds, and whether this
 * fault has already been reported in this run. crash.js is left holding only
 * the two facts Node cannot know — the platform and the app version — and the
 * call itself.
 *
 * report_app_crash() refuses a report with no message, no app_version, or a
 * platform that is not android or ios, and it refuses SILENTLY: it returns
 * {ok:false} rather than raising, because a crashing app must not be handed a
 * second error. Silent refusal is the right behaviour and a good reason to
 * check the shape here rather than find out from an empty table.
 */

/* One line, no runaway stack text, and short enough that the database's own
 * left(500) never has to do the work. */
export const shortMessage = e =>
  !e ? "" : String(e.message || e).replace(/\s+/g, " ").trim().slice(0, 500);

/* One report per fault per run. A component that throws on every render would
 * otherwise post on every retry, and the useful fact — that it happened — is
 * already in the first one. The server counts repeats across installs. */
const reported = new Set();
export function firstTime(message, screen) {
  const key = `${message}|${screen || ""}`;
  if (reported.has(key)) return false;
  reported.add(key);
  return true;
}
/* For tests, and for anything that wants a clean slate. */
export function forgetReported() { reported.clear(); }

/* The payload exactly as report_app_crash() expects it. The masjid is NOT set
 * here: rpc() puts it into every write the app makes, in one place, so that a
 * call site cannot forget it. */
export function crashPayload(error, { screen, version, build, platform, osVersion, device } = {}) {
  return {
    message: shortMessage(error),
    stack: String(error?.stack || "").slice(0, 8000) || null,
    app_version: version || "unknown",
    build: build ? String(build) : null,
    platform: platform === "ios" ? "ios" : "android",
    os_version: osVersion || null,
    /* The model, not a device id: "Pixel 7" is what makes a crash
       reproducible, and nothing here is unique to one phone. */
    device: device || null,
    screen: screen || null,
  };
}

/* The three things the function refuses on, asked here so a report that would
 * be dropped can be seen in a test rather than in an empty table. */
export const wouldBeAccepted = p =>
  !!p && typeof p.message === "string" && p.message.trim() !== ""
      && typeof p.app_version === "string" && p.app_version.trim() !== ""
      && (p.platform === "android" || p.platform === "ios");
