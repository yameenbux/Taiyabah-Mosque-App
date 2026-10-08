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
 *
 * WHAT IS LEFT IN THIS FILE is only what React Native knows and Node cannot:
 * the platform, the model, the OS version and the app's own version. Every
 * decision — the trimming, the payload, the one-report-per-fault rule — is in
 * crash-report.js, where a test can reach it.
 */
import { Platform } from "react-native";
import Constants from "expo-constants";
import { rpc } from "./supabase";
import { crashPayload, firstTime, shortMessage } from "./crash-report";

/* Platform.constants rather than expo-device: React Native already knows the
 * model and the OS version, and this is not worth a native module that would
 * then have to be built for iOS too. */
const C = Platform.constants || {};
const OS_VERSION = Platform.OS === "ios"
  ? `${C.systemName || "iOS"} ${C.osVersion || Platform.Version || ""}`.trim()
  : `Android ${C.Release || Platform.Version || ""}`.trim();
const MODEL = Platform.OS === "ios" ? (C.interfaceIdiom || null) : (C.Model || null);

export async function reportCrash(error, { screen } = {}) {
  try {
    const message = shortMessage(error);
    if (!message) return;
    if (!firstTime(message, screen)) return;

    await rpc("report_app_crash", crashPayload(error, {
      screen,
      version: Constants.expoConfig?.version,
      build: Constants.expoConfig?.android?.versionCode,
      platform: Platform.OS,
      osVersion: OS_VERSION,
      device: MODEL,
    }));
  } catch {
    /* A crash report must never be a second thing for a crashing app to
       handle. If this cannot be sent, it cannot be sent. */
  }
}
