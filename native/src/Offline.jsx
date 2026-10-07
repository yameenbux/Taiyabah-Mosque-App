/**
 * Taiyabah Masjid — a quiet word when the masjid cannot be reached.
 * Copyright (c) 2026 Yameen Bux. All rights reserved. See LICENSE.md.
 *
 * Notices had its own "can't reach the masjid" state and nothing else did, so
 * everywhere else a failed request looked like an empty screen or a spinner
 * that never stopped — the hall calendar with no days, the zakāt price never
 * arriving, a form that would not send.
 *
 * WHAT IT SAYS MATTERS MORE THAN THAT IT APPEARS. Most of this app works with
 * no signal at all: the prayer times are a file on the phone, so is the
 * Qurʼan, so are the adhkār, and the qibla is a compass and some arithmetic.
 * Telling somebody "you are offline" and stopping invites them to put the
 * phone away. Telling them what still works is the useful half, and on the one
 * screen people open five times a day it is also the true half.
 *
 * It also does not repeat the screen behind it. Notices already says "can't
 * reach the masjid" in its own empty state, and a bar underneath saying the
 * same words reads as the app stuttering. This leads with what works, which
 * no screen says, and which is the part worth knowing.
 *
 * It sits above the tab bar rather than at the top, because every screen in
 * this app opens on a dark hero and a red bar across one is a fault, not a
 * notice. It never takes a touch.
 */
import React from "react";
import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { C, F, R } from "./theme";
import { COLUMN } from "./layout";
import { useApp } from "./store";
import { useOffline } from "./reach";

export default function Offline() {
  const { t, fs } = useApp();
  if (!useOffline()) return null;

  return (
    <View pointerEvents="none"
      /* The tab bar is 64-74 tall depending on the script; this clears the
         tallest of them without measuring, because a few points of gap is
         cheaper than a layout subscription that runs on every render. */
      style={{ position: "absolute", left: 0, right: 0, bottom: 86, alignItems: "center",
               paddingHorizontal: 16 }}>
      <View style={{ width: "100%", maxWidth: COLUMN - 32, flexDirection: "row", alignItems: "center",
                     gap: 9, backgroundColor: C.tintRose, borderWidth: 1, borderColor: C.tintRoseLine,
                     borderRadius: R.card, paddingHorizontal: 13, paddingVertical: 10 }}>
        <Ionicons name="cloud-offline-outline" size={17} color={C.tintRoseInk} />
        <Text style={{ flex: 1, fontFamily: F.sans, fontSize: fs(12.5), lineHeight: fs(18),
                       color: C.tintRoseInk }}>
          {t("offline.still_works",
             "No connection. Prayer times, the Qurʼan, the adhkār and the qibla all still work.")}
        </Text>
      </View>
    </View>
  );
}
