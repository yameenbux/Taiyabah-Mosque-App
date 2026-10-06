/* Offering reminders, once, in the app's own words before the system's.
 *
 * Nothing used to ask at all: permission was only requested if somebody found
 * More → Notifications and pressed Enable, so on most phones the app simply
 * never had it and the reminders it is built around could not arrive.
 *
 * The fix is NOT to fire the system dialog at launch. That dialog can be
 * raised once. Tap "Don't allow" and it is the settings app or nothing, for
 * good — so asking cold, over the splash, before the app has said what it is
 * for, permanently loses the people who would have said yes if asked properly.
 *
 * So this says what arrives and what it costs first, and only an explicit
 * "Turn them on" raises the real dialog. "Not now" spends nothing: the offer
 * is still there under Notifications whenever they want it.
 */
import React, { useEffect, useState } from "react";
import { View, Text, Modal } from "react-native";
import * as Notifications from "expo-notifications";
import { Ionicons } from "@expo/vector-icons";
import { C, F, R } from "./theme";
import { useApp } from "./store";
import { Press, tap } from "./ui";
import { ORDER } from "./prayer";
import { arm, ask } from "./reminders";
import { askPush, syncTags, optIn } from "./push";

export default function FirstRun() {
  const { t, fs, alerts, askedPush, setAskedPush } = useApp();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (askedPush) return;
    let live = true;
    /* Only where the question is still open. Already granted needs no asking,
     * and already refused cannot be asked again — showing a card that raises
     * nothing would be a button that lies. */
    const id = setTimeout(() => {
      Notifications.getPermissionsAsync()
        .then(p => { if (live && p.status !== "granted" && p.canAskAgain !== false) setShow(true); })
        .catch(() => {});
    }, 1400);                       // after the opening animation has cleared
    return () => { live = false; clearTimeout(id); };
  }, [askedPush]);

  const close = () => { setShow(false); setAskedPush(); };

  const yes = async () => {
    tap();
    /* One dialog, raised through OneSignal so it records the answer too —
     * asking twice for the same permission is how an app looks broken. */
    const ok = (await askPush()) || (await ask());
    if (ok) {
      /* Armed immediately, so the first reminder is real rather than a promise
       * somebody has to go and switch on themselves. */
      const per = {};
      if (alerts.jamaah) for (const k of ORDER) per[k] = alerts.mins;
      try { await arm(per, { kahf: alerts.kahf }); } catch {}
      /* And subscribed with the tags the masjid's segments are built on, so
       * this phone is reachable from the moment it says yes rather than only
       * after somebody finds the Notifications screen and presses Save. */
      try { await optIn(); await syncTags(alerts); } catch {}
    }
    close();
  };

  if (!show) return null;

  return (
    <Modal transparent animationType="fade" visible onRequestClose={close}>
      <View style={{ flex: 1, backgroundColor: "rgba(21,6,15,.55)", justifyContent: "flex-end" }}>
        <View style={{ backgroundColor: C.paper, borderTopLeftRadius: 26, borderTopRightRadius: 26,
                       padding: 24, paddingBottom: 34, gap: 14 }}>
          <View style={{ alignSelf: "center", width: 54, height: 54, borderRadius: 27,
                         backgroundColor: "rgba(198,162,76,.16)", alignItems: "center",
                         justifyContent: "center" }}>
            <Ionicons name="notifications-outline" size={25} color={C.goldInk} />
          </View>

          <Text style={{ fontFamily: F.display, fontSize: fs(21), color: C.ink, textAlign: "center" }}>
            {t("firstrun.title", "Be reminded before jamāʿah")}</Text>

          <Text style={{ fontFamily: F.sans, fontSize: fs(13.5), lineHeight: fs(22), color: C.muted,
                         textAlign: "center" }}>
            {t("firstrun.body",
              "A quiet reminder {n} minutes before each congregation, and on Friday morning for Sūrah al-Kahf. They are set on this phone, so they arrive with no signal and nothing is sent anywhere.")
              .replace("{n}", String(alerts.mins))}</Text>

          <Press onPress={yes}
            style={{ alignItems: "center", paddingVertical: 14, borderRadius: R.pill,
                     backgroundColor: C.brand600, marginTop: 4 }}>
            <Text style={{ fontFamily: F.sansBold, fontSize: fs(14.5), color: C.cream }}>
              {t("firstrun.turn_on", "Turn them on")}</Text>
          </Press>

          <Press onPress={() => { tap(); close(); }}
            style={{ alignItems: "center", paddingVertical: 11 }}>
            <Text style={{ fontFamily: F.sansSemi, fontSize: fs(13.5), color: C.muted }}>
              {t("firstrun.not_now", "Not now")}</Text>
          </Press>

          <Text style={{ fontFamily: F.sans, fontSize: fs(11.5), color: C.muted, textAlign: "center" }}>
            {t("firstrun.later", "You can change this any time under Notifications.")}</Text>
        </View>
      </View>
    </Modal>
  );
}
