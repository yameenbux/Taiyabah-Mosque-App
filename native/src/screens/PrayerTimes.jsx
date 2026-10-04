/* The prayer times tab.
 *
 * The web app put this behind a sheet with a toggle. Here it is a tab of its
 * own, because it is the second-most-asked question in the app after "when is
 * the next jamāʿah" and should never be more than one tap away.
 */
import React, { useState } from "react";
import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { C, F, R } from "../theme";
import { useApp } from "../store";
import { Screen, Hero, Heading, Card, Note, Press, Pill, NavRow, RowGroup, tap } from "../ui";
import { dayFor, pretty, NAMES, ORDER, nextJamaah } from "../prayer";

const DAYNAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function PrayerTimes({ navigation }) {
  const { t, fs, rtl } = useApp();
  const [offset, setOffset] = useState(0);         // days from today
  const when = new Date(); when.setDate(when.getDate() + offset);
  const day = dayFor(when);
  const next = offset === 0 ? nextJamaah(when) : null;

  const step = n => { tap(); setOffset(o => o + n); };
  const label = offset === 0 ? t("times.today", "Today")
              : offset === 1 ? t("times.tomorrow", "Tomorrow")
              : offset === -1 ? t("times.yesterday", "Yesterday")
              : `${DAYNAMES[when.getDay()]} ${when.getDate()} ${when.toLocaleDateString("en-GB", { month: "long" })}`;

  return (
    <Screen pad={false}>
      <Hero lines={[
        { t: t("nav.prayer_times", "Prayer times"), w: "title" },
        { t: day ? day.hijri : "", w: "sub" },
      ]}>
        {/* Day stepper. Inside the hero so the date and the times you are
            looking at never appear in two different places on the screen. */}
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center",
                       gap: 6, marginTop: 16 }}>
          <Press onPress={() => step(-1)} style={{ padding: 9, borderRadius: R.pill }}>
            <Ionicons name="chevron-back" size={19} color={C.goldBright} />
          </Press>
          <Press onPress={() => { tap(); setOffset(0); }}
            style={{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: R.pill,
                     borderWidth: 1, borderColor: "rgba(220,187,99,.4)", minWidth: 168, alignItems: "center" }}>
            <Text style={{ fontFamily: F.sansMedium, fontSize: fs(13.5), color: C.cream }}>{label}</Text>
            <Text style={{ fontFamily: F.sans, fontSize: fs(11), color: "rgba(243,239,227,.6)", marginTop: 1 }}>
              {when.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
            </Text>
          </Press>
          <Press onPress={() => step(1)} style={{ padding: 9, borderRadius: R.pill }}>
            <Ionicons name="chevron-forward" size={19} color={C.goldBright} />
          </Press>
        </View>
      </Hero>

      <View style={{ paddingHorizontal: 16 }}>
        {!day ? (
          <Card><Note>{t("times.off_timetable",
            "That date is outside the published timetable. The masjid prints one year at a time.")}</Note></Card>
        ) : (
          <>
            {/* The table. A row per prayer rather than five columns, because a
                column of five-character times is unreadable at any text size
                the community actually uses. */}
            <Card gap={0} pad={0} style={{ marginTop: 16 }}>
              <View style={{ flexDirection: rtl ? "row-reverse" : "row", paddingHorizontal: 15,
                             paddingTop: 13, paddingBottom: 9 }}>
                <Text style={{ flex: 1, fontFamily: F.sans, fontSize: fs(10.5), letterSpacing: 1.2,
                               color: C.muted, textTransform: "uppercase" }}>
                  {t("sheet.prayer", "Prayer")}</Text>
                <Text style={{ width: 78, textAlign: "center", fontFamily: F.sans, fontSize: fs(10.5),
                               letterSpacing: 1.2, color: C.muted, textTransform: "uppercase" }}>
                  {t("sheet.begins", "Begins")}</Text>
                <Text style={{ width: 78, textAlign: "center", fontFamily: F.sans, fontSize: fs(10.5),
                               letterSpacing: 1.2, color: C.gold, textTransform: "uppercase" }}>
                  {t("sheet.jamaah", "Jamāʿah")}</Text>
              </View>
              {["fajr", "sunrise", "zuhr", "asr", "maghrib", "isha"].map(k => {
                const isNext = next && k === next.key;
                const jamaat = day.jamaat[k];
                return (
                  <View key={k} style={{ flexDirection: rtl ? "row-reverse" : "row", alignItems: "center",
                                         paddingHorizontal: 15, paddingVertical: 13,
                                         borderTopWidth: 1, borderTopColor: C.line,
                                         backgroundColor: isNext ? "rgba(198,162,76,.10)" : "transparent" }}>
                    <View style={{ flex: 1, flexDirection: rtl ? "row-reverse" : "row", alignItems: "center", gap: 8 }}>
                      <Text style={{ fontFamily: F.display, fontSize: fs(15.5), color: C.ink }}>
                        {t(`prayer.${k}`, NAMES[k].en)}</Text>
                      <Text style={{ fontFamily: F.arabic, fontSize: fs(15), color: C.muted }}>{NAMES[k].ar}</Text>
                    </View>
                    <Text style={{ width: 78, textAlign: "center", fontFamily: F.sansMedium,
                                   fontSize: fs(14.5), color: C.ink }}>{pretty(day.begins[k])}</Text>
                    <View style={{ width: 78, alignItems: "center" }}>
                      {jamaat
                        ? <Text style={{ fontFamily: F.sansMedium, fontSize: fs(14.5), color: C.brand600 }}>
                            {pretty(jamaat)}</Text>
                        : <Text style={{ fontFamily: F.sans, fontSize: fs(14), color: C.line }}>—</Text>}
                    </View>
                  </View>);
              })}
            </Card>

            {/* Maghrib is prayed the minute it begins. That is the masjid's
                practice, and it looks like a data error unless it is said. */}
            <View style={{ marginTop: 11 }}>
              <Note>{t("times.maghrib_note",
                "Maghrib jamāʿah is at the beginning time — the masjid prays it as it comes in.")}</Note>
            </View>

            {day.jummah && (
              <>
                <Heading tag={t("sheet.friday", "Friday")}>{t("sheet.jummah", "Jumuʿah")}</Heading>
                <Card gap={0} pad={0}>
                  {[["first", t("sheet.first_jummah", "First jamāʿah")],
                    ["second", t("sheet.second_jummah", "Second jamāʿah")]].map(([k, lab], i) =>
                    day.jummah[k] ? (
                      <View key={k} style={{ flexDirection: rtl ? "row-reverse" : "row", alignItems: "center",
                                             paddingHorizontal: 15, paddingVertical: 13,
                                             borderTopWidth: i ? 1 : 0, borderTopColor: C.line }}>
                        <Text style={{ flex: 1, fontFamily: F.sans, fontSize: fs(14), color: C.ink }}>{lab}</Text>
                        <Text style={{ fontFamily: F.sansMedium, fontSize: fs(15), color: C.brand600 }}>
                          {pretty(day.jummah[k])}</Text>
                      </View>) : null)}
                </Card>
              </>
            )}
          </>
        )}

        <RowGroup style={{ marginTop: 22 }}>
          <NavRow icon="calendar-outline" label={t("sheet.full_timetable", "Full prayer timetable")}
                  sub={t("times.whole_year", "Every day of 2026, month by month")}
                  onPress={() => navigation.navigate("Timetable")} />
          <NavRow icon="notifications-outline" label={t("menu.notifications", "Notifications")}
                  sub={t("times.remind_sub", "Be reminded before each jamāʿah")}
                  onPress={() => navigation.navigate("Alerts")} />
        </RowGroup>
      </View>
    </Screen>
  );
}
