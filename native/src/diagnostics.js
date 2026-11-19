/* The rolling log of what the app just did, and the "report a problem" that
 * sends it. Copyright (c) 2026 Yameen Bux. All rights reserved. See LICENSE.md.
 *
 * The automatic crash reporter (crash.js) says when the app FELL OVER. This is
 * the other half: a person who hit something that did not load, or a screen
 * that showed an error, tapping "Report a problem" before they give up. It
 * sends what they chose to type plus the short breadcrumb trail the app keeps
 * as it goes — the last couple of dozen screens and notable events — which is
 * usually what turns "it doesn't work" into something reproducible.
 *
 * Reports go to the masjid's own Supabase, through report_app_issue(), exactly
 * as crashes do: no third-party processor the privacy notice would have to
 * name, and nothing in the payload that identifies a person — a device MODEL,
 * not an id, and only words the person decided to write.
 *
 * Every DECISION is in diagnostics-core.js, where a test can reach it. This
 * file holds the buffer and the two facts Node cannot know.
 */
import { Platform } from "react-native";
import Constants from "expo-constants";
import { rpc } from "./supabase";
import { pushCrumb, formatLog, issuePayload } from "./diagnostics-core";

/* One buffer for the life of the app. A ring: old crumbs fall off the front so
 * it can never grow without bound, and the useful part — what just happened —
 * is always what is kept. */
const trail = [];

/* Record something the app just did or just failed at. Cheap and safe to call
 * from anywhere, including a catch block: it never throws and never awaits. */
export function breadcrumb(text) {
  try { pushCrumb(trail, text); } catch { /* a breadcrumb must never be a fault of its own */ }
}

const C = Platform.constants || {};
const OS_VERSION = Platform.OS === "ios"
  ? `${C.systemName || "iOS"} ${C.osVersion || Platform.Version || ""}`.trim()
  : `Android ${C.Release || Platform.Version || ""}`.trim();
const MODEL = Platform.OS === "ios" ? (C.interfaceIdiom || null) : (C.Model || null);

/**
 * Send a problem report. `note` is what the person typed (optional), `screen`
 * is where they were. Returns true only if it was actually stored, so the UI
 * can tell "sent, thank you" from "that didn't send". Never throws.
 */
export async function reportIssue({ note, screen } = {}) {
  try {
    const res = await rpc("report_app_issue", issuePayload({
      note, screen,
      log: formatLog(trail),
      version: Constants.expoConfig?.version,
      build: Constants.expoConfig?.android?.versionCode || Constants.expoConfig?.ios?.buildNumber,
      platform: Platform.OS,
      osVersion: OS_VERSION,
      device: MODEL,
    }));
    return !!(res && res.ok && res.data && res.data.ok === true);
  } catch {
    return false;
  }
}
