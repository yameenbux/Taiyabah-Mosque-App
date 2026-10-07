/* Saying the app fell over.
 * Copyright (c) 2026 Yameen Bux. All rights reserved. See LICENSE.md.
 *
 * Until now a render exception anywhere in this app was a blank screen and
 * silence: the person saw nothing, and the committee found out only if
 * somebody rang up to say the app had stopped working. Neither half of that
 * is acceptable in something a congregation opens five times a day.
 *
 * It reports to the masjid's own Supabase rather than to a crash service.
 * That is a deliberate choice: the privacy notice names Stripe and the masjid
 * and nothing else, and adding a third-party processor to it — for a masjid,
 * for a congregation that did not ask for one — is a bigger decision than
 * this problem warrants. report_app_crash() takes nothing that identifies
 * anybody, and the table's CHECK constraints keep it that way.
 */
import { Platform } from "react-native";
import Constants from "expo-constants";
import { rpc } from "./supabase";

/* Platform.constants rather than expo-device: React Native already knows the
 * model and the OS version, and this is not worth a native module that would
 * then have to be built for iOS too. */
const C = Platform.constants || {};
const OS_VERSION = Platform.OS === "ios"
  ? `${C.systemName || "iOS"} ${C.osVersion || Platform.Version || ""}`.trim()
  : `Android ${C.Release || Platform.Version || ""}`.trim();
const MODEL = Platform.OS === "ios" ? (C.interfaceIdiom || null) : (C.Model || null);

/* One report per fault per run. A component that throws on every render would
 * otherwise post on every retry, and the useful fact — that it happened — is
 * already in the first one. The server counts repeats across installs. */
const reported = new Set();

const short = e =>
  !e ? "" : String(e.message || e).replace(/\s+/g, " ").trim().slice(0, 500);

export async function reportCrash(error, { screen } = {}) {
  try {
    const message = short(error);
    if (!message) return;
    const key = message + "|" + (screen || "");
    if (reported.has(key)) return;
    reported.add(key);

    await rpc("report_app_crash", {
      message,
      stack: String(error?.stack || "").slice(0, 8000) || null,
      app_version: Constants.expoConfig?.version || "unknown",
      build: String(Constants.expoConfig?.android?.versionCode || "") || null,
      platform: Platform.OS === "ios" ? "ios" : "android",
      os_version: OS_VERSION || null,
      /* The model, not a device id: "Pixel 7" is what makes a crash
         reproducible, and nothing here is unique to one phone. */
      device: MODEL,
      screen: screen || null,
    });
  } catch {
    /* A crash report must never be a second thing for a crashing app to
       handle. If this cannot be sent, it cannot be sent. */
  }
}
