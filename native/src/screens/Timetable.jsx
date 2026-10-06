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
import { pretty, nowLondon } from "../prayer";

const MONTHS = MON;
/* The website's two sets, and they are not the same five. Beginning times drop
 * Maghrib — it is prayed as it comes in, so its beginning IS its jamāʿah — and
 * put sunrise in its place, which is the one a person actually needs when they
 * are looking at beginning times. The heads are abbreviated because five
 * prayers have to fit across a phone. */
const SETS = {
  jamaat: [["fajr", "Fajr"], ["zuhr", "Zuhr"], ["asr", "Asr"], ["maghrib", "Mag"], ["isha", "Isha"]],
  begins: [["fajr", "Fajr"], ["sunrise", "Sun"], ["zuhr", "Zuhr"], ["asr", "Asr"], ["isha", "Isha"]],
};

export default function Timetable() {
  const { t, fs } = useApp();
  const today = nowLondon();
  const [m, setM] = useState(today.getFullYear() === TT.year ? today.getMonth() : 0);
  const [mode, setMode] = useState("jamaat");
  const cols = SETS[mode];
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
                    { t: mode === "jamaat" ? t("sheet.jama_ah_times", "Jamāʿah times")
                                            : t("sheet.beginning_times", "Beginning times"), w: "sub" }]}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, marginTop: 14 }}>
          <Press onPress={() => step(-1)} style={{ padding: 9 }}>
            <Ionicons name="chevron-back" size={19} color={m === 0 ? "rgba(220,187,99,.3)" : C.goldBright} />
          </Press>
          {/* The website steps a month at a time with a chevron either side of
              its name, and that is all. A row of twelve letter chips was mine,
              not the site's. */}
          <Press onPress={() => step(1)} style={{ padding: 9 }}>
            <Ionicons name="chevron-forward" size={19} color={m === 11 ? "rgba(220,187,99,.3)" : C.goldBright} />
          </Press>
        </View>

      </Hero>

      {/* .sh-toggle: a strip on the CARD below the header with a hairline under
          it, two buttons at 9px of radius with a line border, and the active
          one filled brand-700 with cream on it. This was a gold pill floating
          inside the plum hero — the right control, in the wrong place, in a
          colour the website never uses for it. */}
      <View style={{ flexDirection: "row", gap: 6, paddingHorizontal: 16, paddingTop: 11, paddingBottom: 9,
                     backgroundColor: C.card, borderBottomWidth: 1, borderBottomColor: C.line }}>
        {[["jamaat", t("sheet.jama_ah_times", "Jamāʿah times")],
          ["begins", t("sheet.beginning_times", "Beginning times")]].map(([k, lab]) => (
          <Press key={k} onPress={() => { tap(); setMode(k); }}
            style={{ flex: 1, alignItems: "center", paddingVertical: 8, borderRadius: 9, borderWidth: 1,
                     borderColor: mode === k ? C.brand700 : C.line,
                     backgroundColor: mode === k ? C.brand700 : C.card }}>
            <Text style={{ fontFamily: F.sansMedium, fontSize: fs(12.5),
                           color: mode === k ? C.cream : C.ink }}>{lab}</Text>
          </Press>))}
      </View>

      {/* A sticky header, because scrolling past the column names in a table of
          thirty-one rows makes the numbers meaningless. */}
      <View style={{ flexDirection: "row", paddingHorizontal: 12, paddingVertical: 9,
                     backgroundColor: C.card, borderBottomWidth: 1, borderBottomColor: C.line }}>
        <Text style={{ width: 34, fontFamily: F.sans, fontSize: fs(9.5), color: C.muted }}>
          {t("sheet.date", "DATE")}</Text>
        {cols.map(([k, short]) => (
          <Text key={k} style={{ flex: 1, textAlign: "center", fontFamily: F.sansMedium, fontSize: fs(9.5),
                                 letterSpacing: 0.4, color: C.muted, textTransform: "uppercase" }}>
            {t(`month.col.${k}`, short)}</Text>))}
      </View>

      <FlatList
        ref={list}
        data={days}
        keyExtractor={d => d.iso}
        initialNumToRender={16}
        contentContainerStyle={{ paddingBottom: 34 }}
        ListFooterComponent={
          <View style={{ paddingHorizontal: 16, paddingTop: 16, gap: 8 }}>
            <Note>{mode === "jamaat"
              ? t("month.congregation_note", "Congregation times. Fridays highlighted — tap any day for Jumuʿah times.")
              : t("month.beginning_note", "Beginning times. Maghrib is prayed at its listed time.")}</Note>
            <Note>{t("month.12_hour_note",
              "Times shown in 12-hour format without am/pm, as on the printed timetable.")}</Note>
            <Note>{`${t("times.source", "Source")}: ${TT.source}`}</Note>
          </View>}
        renderItem={({ item: d, index }) => {
          const date = new Date(d.iso + "T00:00:00");
          const friday = date.getDay() === 5;
          const isToday = d.iso === todayIso;
          return (
            /* .mt tr.fri td is GOLD at 10% and .mt tr.today td is PLUM at 13%
               with weight 700 — this had them the other way about, gold for
               today and a barely-there plum for Friday, so the one day the
               whole highlight exists for was the quieter of the two. The
               zebra striping on every other row was mine; the website has
               none. today's date cell also carries a 3px plum bar down its
               left edge (inset box-shadow on .mt tr.today td.d). */
            <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 9,
                           borderBottomWidth: 1, borderBottomColor: C.line,
                           backgroundColor: isToday ? "rgba(119,33,87,.13)"
                                          : friday ? "rgba(198,162,76,.10)" : "transparent" }}>
              <View style={{ width: 34, paddingLeft: isToday ? 9 : 0,
                             borderLeftWidth: isToday ? 3 : 0, borderLeftColor: C.brand600 }}>
                <Text style={{ fontFamily: F.sansBold, fontSize: fs(12.5), color: C.ink }}>{date.getDate()}</Text>
                {/* .mt td.d small — uppercase, tracked, muted on every day. */}
                <Text style={{ fontFamily: F.sans, fontSize: fs(9.5), letterSpacing: 0.4,
                               textTransform: "uppercase", color: C.muted }}>
                  {t(`date.dow.${date.getDay()}`, ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][date.getDay()])}</Text>
              </View>
              {cols.map(([k]) => {
                const v = (mode === "jamaat" ? d.jamaat : d.begins)[k];
                return (
                  <Text key={k} style={{ flex: 1, textAlign: "center", fontSize: fs(12.5), color: C.ink,
                                         fontFamily: isToday ? F.sansBold : F.sansMedium }}>
                    {v ? pretty(v).replace(/ (am|pm)$/, "") : "—"}</Text>);
              })}
            </View>);
        }} />
    </View>
  );
}
