/* Which jamāʿahs to be reminded about, and how far ahead.
 *
 * Every switch here arms real notifications on the phone. The count at the
 * bottom is the number actually scheduled with the OS — not a promise, a
 * reading — because a reminder people believe in and never get is worse than
 * no reminder at all.
 */
import React, { useEffect, useState } from "react";
import { View, Text, Switch, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { C, F, R } from "../theme";
import { useApp } from "../store";
import { Screen, Hero, Heading, Card, Note, P, RowGroup, NavRow, Pill, Press, tap, open } from "../ui";
import { NAMES, ORDER } from "../prayer";
import { arm, ask } from "../reminders";

const AHEAD = [0, 5, 10, 15, 30];

export default function Alerts() {
  const { t, fs, rtl, reminders, setReminder } = useApp();
  const [armed, setArmed] = useState(null);
  const [denied, setDenied] = useState(false);

  /* Re-arm whenever a choice changes. Cheap, and it means the phone is never
   * holding a set of reminders that disagrees with this screen. */
  useEffect(() => {
    let live = true;
    arm(reminders).then(n => {
      if (!live) return;
      setArmed(n);
      setDenied(n === 0 && Object.keys(reminders || {}).length > 0);
    });
    return () => { live = false; };
  }, [reminders]);

  return (
    <Screen pad={false}>
      <Hero lines={[
        { k: "menu.notifications", t: "Notifications", w: "title" },
        { k: "alerts.sub", t: "Be reminded before jamāʿah, with no signal needed.", w: "sub" },
      ]} />
      <View style={{ paddingHorizontal: 16 }}>
        <Heading>{t("sheet.jama_ah_reminders", "Jamāʿah reminders")}</Heading>
        <Card gap={0} pad={0}>
          {ORDER.map((k, i) => {
            const on = reminders?.[k] !== undefined;
            return (
              <View key={k} style={{ borderTopWidth: i ? 1 : 0, borderTopColor: C.line }}>
                <View style={{ flexDirection: rtl ? "row-reverse" : "row", alignItems: "center",
                               paddingHorizontal: 15, paddingVertical: 13 }}>
                  <View style={{ flex: 1, flexDirection: rtl ? "row-reverse" : "row", alignItems: "center", gap: 8 }}>
                    <Text style={{ fontFamily: F.display, fontSize: fs(15.5), color: C.ink }}>
                      {t(`prayer.${k}`, NAMES[k].en)}</Text>
                    <Text style={{ fontFamily: F.arabic, fontSize: fs(14.5), color: C.muted }}>{NAMES[k].ar}</Text>
                  </View>
                  <Switch value={on}
                          onValueChange={async v => {
                            tap();
                            if (v && !(await ask())) { setDenied(true); return; }
                            setReminder(k, v ? 15 : undefined);
                          }}
                          trackColor={{ true: C.brand600, false: C.line }}
                          thumbColor="#fff" />
                </View>
                {on && (
                  <View style={{ flexDirection: "row", gap: 7, paddingHorizontal: 15, paddingBottom: 13 }}>
                    {AHEAD.map(n => {
                      const sel = Number(reminders[k]) === n;
                      return (
                        <Pressable key={n} onPress={() => { tap(); setReminder(k, n); }}
                          style={{ flex: 1, alignItems: "center", paddingVertical: 7, borderRadius: R.pill,
                                   borderWidth: sel ? 1.5 : 1, borderColor: sel ? C.brand600 : C.line,
                                   backgroundColor: sel ? "rgba(119,33,87,.07)" : "transparent" }}>
                          <Text style={{ fontFamily: F.sansMedium, fontSize: fs(11.5),
                                         color: sel ? C.brand600 : C.muted }}>
                            {n === 0 ? t("alerts.on_time", "On time") : `${n} min`}</Text>
                        </Pressable>);
                    })}
                  </View>)}
              </View>);
          })}
        </Card>

        {denied ? (
          <View style={{ marginTop: 14 }}>
            <Note>{t("alerts.denied",
              "Notifications are turned off for this app in the phone's settings, so nothing can be scheduled. Turn them on there and come back.")}</Note>
          </View>
        ) : (
          <View style={{ marginTop: 14, flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Ionicons name={armed ? "checkmark-circle" : "information-circle-outline"} size={16}
                      color={armed ? "#2E8C56" : C.muted} />
            <Note>{armed === null ? t("alerts.checking", "Checking…")
                 : armed === 0 ? t("alerts.none_set", "No reminders set.")
                 : `${armed} ${t("alerts.armed", "reminders set for the week ahead. They are refreshed each time you open the app.")}`}</Note>
          </View>
        )}

        <Heading>{t("sheet.from_the_masjid", "From the masjid")}</Heading>
        <P muted>{t("alerts.notices_note",
          "Announcements from the office — janāzah notices, madrasah closures, Ramadan timings — appear on the Notices tab. Push notifications for those are being set up and will arrive in a later version of the app.")}</P>
      </View>
    </Screen>
  );
}
