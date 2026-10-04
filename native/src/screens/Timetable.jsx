/* The whole year, a month at a time.
 *
 * On the web this was a table that needed horizontal scrolling on a phone. Here
 * each month is a FlatList of days and the header stays put, which is the one
 * thing a printed timetable cannot do and a phone should.
 */
import React, { useMemo, useRef, useState } from "react";
import { View, Text, FlatList } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { C, F, R } from "../theme";
import { useApp } from "../store";
import { Hero, Press, Note, tap } from "../ui";
import TT from "../data/timetable-2026.json";
import { MON } from "../dates";
import { pretty, NAMES } from "../prayer";

const MONTHS = MON;
const COLS = ["fajr", "zuhr", "asr", "maghrib", "isha"];

export default function Timetable() {
  const { t, fs } = useApp();
  const today = new Date();
  const [m, setM] = useState(today.getFullYear() === TT.year ? today.getMonth() : 0);
  const list = useRef(null);

  const days = useMemo(() => Object.entries(TT.days)
    .filter(([iso]) => Number(iso.slice(5, 7)) === m + 1)
    .map(([iso, d]) => ({ iso, ...d })), [m]);

  const step = n => {
    const next = Math.min(11, Math.max(0, m + n));
    if (next === m) return;
    tap(); setM(next);
    list.current?.scrollToOffset({ offset: 0, animated: false });
  };
  const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  return (
    <View style={{ flex: 1, backgroundColor: C.paper }}>
      <Hero lines={[{ t: `${t(`date.fullmon.${m}`, MONTHS[m])} ${TT.year}`, w: "title" },
                    { t: t("sheet.jama_ah_times", "Jamāʿah times"), w: "sub" }]}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, marginTop: 14 }}>
          <Press onPress={() => step(-1)} style={{ padding: 9 }}>
            <Ionicons name="chevron-back" size={19} color={m === 0 ? "rgba(220,187,99,.3)" : C.goldBright} />
          </Press>
          {/* Every month reachable without eleven taps. */}
          <View style={{ flexDirection: "row", gap: 4 }}>
            {MONTHS.map((name, i) => (
              <Press key={i} onPress={() => { tap(); setM(i); list.current?.scrollToOffset({ offset: 0, animated: false }); }}
                style={{ width: 20, height: 20, borderRadius: 10, alignItems: "center", justifyContent: "center",
                         backgroundColor: i === m ? C.goldBright : "rgba(243,239,227,.14)" }}>
                <Text style={{ fontFamily: F.sansMedium, fontSize: 9,
                               color: i === m ? C.brand900 : "rgba(243,239,227,.75)" }}>{name[0]}</Text>
              </Press>))}
          </View>
          <Press onPress={() => step(1)} style={{ padding: 9 }}>
            <Ionicons name="chevron-forward" size={19} color={m === 11 ? "rgba(220,187,99,.3)" : C.goldBright} />
          </Press>
        </View>
      </Hero>

      {/* A sticky header, because scrolling past the column names in a table of
          thirty-one rows makes the numbers meaningless. */}
      <View style={{ flexDirection: "row", paddingHorizontal: 12, paddingVertical: 9,
                     backgroundColor: C.card, borderBottomWidth: 1, borderBottomColor: C.line }}>
        <Text style={{ width: 34, fontFamily: F.sans, fontSize: fs(9.5), color: C.muted }}>
          {t("sheet.date", "DATE")}</Text>
        {COLS.map(k => (
          <Text key={k} style={{ flex: 1, textAlign: "center", fontFamily: F.sansMedium, fontSize: fs(9.5),
                                 letterSpacing: 0.4, color: C.muted, textTransform: "uppercase" }}>
            {t(`prayer.${k}`, NAMES[k].en)}</Text>))}
      </View>

      <FlatList
        ref={list}
        data={days}
        keyExtractor={d => d.iso}
        initialNumToRender={16}
        contentContainerStyle={{ paddingBottom: 34 }}
        ListFooterComponent={
          <View style={{ paddingHorizontal: 16, paddingTop: 16, gap: 8 }}>
            <Note>{`${t("times.source", "Source")}: ${TT.source}`}</Note>
            <Note>{t("times.maghrib_note",
              "Maghrib jamāʿah is at the beginning time — the masjid prays it as it comes in.")}</Note>
          </View>}
        renderItem={({ item: d, index }) => {
          const date = new Date(d.iso + "T00:00:00");
          const friday = date.getDay() === 5;
          const isToday = d.iso === todayIso;
          return (
            <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 10,
                           borderBottomWidth: 1, borderBottomColor: "rgba(228,222,207,.6)",
                           backgroundColor: isToday ? "rgba(198,162,76,.14)"
                                          : friday ? "rgba(119,33,87,.035)"
                                          : index % 2 ? "rgba(255,255,255,.4)" : "transparent" }}>
              <View style={{ width: 34 }}>
                <Text style={{ fontFamily: F.sansMedium, fontSize: fs(13), color: C.ink }}>{date.getDate()}</Text>
                <Text style={{ fontFamily: F.sans, fontSize: fs(9), color: friday ? C.brand600 : C.muted }}>
                  {t(`date.dow.${date.getDay()}`, ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][date.getDay()])}</Text>
              </View>
              {COLS.map(k => (
                <Text key={k} style={{ flex: 1, textAlign: "center", fontFamily: F.sansMedium, fontSize: fs(12),
                                       color: C.ink }}>
                  {pretty(d.jamaat[k] || d.begins[k]).replace(/ (am|pm)$/, "")}</Text>))}
            </View>);
        }} />
    </View>
  );
}
