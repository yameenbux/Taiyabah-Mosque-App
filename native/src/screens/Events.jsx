/* EVENTS — a month of what is on, and the posters underneath.
 * Copyright (c) 2026 Yameen Bux. All rights reserved. See LICENSE.md.
 *
 * This was the Notices tab. It showed every notice as a flat list newest
 * first, which meant an Eid poster for next month sat below a car-park
 * announcement from yesterday, and nothing on the screen said when anything
 * actually was.
 *
 * So: the calendar on top, keyed on event_at, with a dot on every day that
 * has something; the posters below in date order, soonest first; and tapping
 * a day scrolls to it. What the masjid has SAID rather than what it has ON
 * moved to the bell — see screens/Notifications.jsx.
 *
 * WHY NOT form.jsx's Calendar. That one is a booking control: it carries an
 * "Available / Booked / Not published" legend, takes `taken` and `offered`,
 * and is bounded by a notice period and a horizon. None of that means
 * anything here, and bending it into shape would make one component serve
 * two jobs badly. The grid below borrows its grammar — the same 34px nav
 * boxes, the same seven columns starting on Sunday, the same day cell — and
 * nothing else.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View, Text, FlatList, RefreshControl, ActivityIndicator, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { C, F, SHADOW } from "../theme";
import { useApp } from "../store";
import { TopBar, Heading, Press, tap } from "../ui";
import { useScrollToTop } from "@react-navigation/native";
import { useTopBar } from "../barstyle";
import { readList } from "../supabase";
import { NoticeCard } from "../notice-card";
import { monthYear, DOW } from "../dates";
import { order, groupByDay, daysWithEvents, dayKey, openingMonth } from "../events";

/* The month grid. A dot, not a number badge: two events on one day is not a
 * quantity anybody acts on, and a "2" invites the reader to work out which
 * two from a grid cell 44px wide. */
function EventMonth({ month, onMonth, rows, onPickDay, selected }) {
  const { t, fs } = useApp();
  const y = month.getFullYear(), m = month.getMonth();
  const lead = new Date(y, m, 1).getDay();          // the week starts on Sunday
  const days = new Date(y, m + 1, 0).getDate();
  const dotted = daysWithEvents(rows, y, m);
  const today = new Date();
  const isToday = d => today.getFullYear() === y && today.getMonth() === m && today.getDate() === d;
  const iso = d => `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

  const nav = (dir) => (
    <Press onPress={() => { tap(); onMonth(new Date(y, m + dir, 1)); }}
      accessibilityRole="button"
      accessibilityLabel={dir < 0 ? t("a11y.previous_month", "Previous month")
                                  : t("a11y.next_month", "Next month")}
      style={{ width: 34, height: 34, borderRadius: 10, borderWidth: 1, borderColor: C.line,
               backgroundColor: C.paper, alignItems: "center", justifyContent: "center" }}>
      <Ionicons name={dir < 0 ? "chevron-back" : "chevron-forward"} size={18} color={C.ink} />
    </Press>
  );

  return (
    <View style={[{ backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.line,
                    marginHorizontal: 16, padding: 14 }, SHADOW]}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 }}>
        {nav(-1)}
        <Text style={{ flex: 1, textAlign: "center", fontFamily: F.display, fontSize: fs(16), color: C.ink }}>
          {monthYear(t, month)}</Text>
        {nav(1)}
      </View>

      <View style={{ flexDirection: "row" }}>
        {[0, 1, 2, 3, 4, 5, 6].map(i => (
          <Text key={i} style={{ flex: 1, textAlign: "center", fontFamily: F.sans,
                                 fontSize: fs(10.5), color: C.muted, paddingBottom: 4 }}>
            {t(`date.dow.${i}`, DOW[i].slice(0, 3))}</Text>))}
      </View>

      <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
        {Array.from({ length: lead }, (_, i) =>
          <View key={"x" + i} style={{ width: "14.2857%", aspectRatio: 1, padding: 2 }} />)}
        {Array.from({ length: days }, (_, i) => {
          const d = i + 1, has = dotted.has(d), on = selected === iso(d);
          return (
            <View key={d} style={{ width: "14.2857%", aspectRatio: 1, padding: 2 }}>
              <Pressable
                disabled={!has}
                onPress={() => { tap(); onPickDay(iso(d)); }}
                accessibilityRole="button"
                /* A DOT IS INVISIBLE TO A SCREEN READER. The date alone would
                   announce as "14" on every cell alike, so the label says
                   whether there is anything on that day. */
                accessibilityLabel={has
                  ? `${d} ${monthYear(t, month)} — ${t("events.has_an_event", "something on")}`
                  : `${d} ${monthYear(t, month)}`}
                accessibilityState={{ disabled: !has, selected: on }}
                style={({ pressed }) => ({
                  flex: 1, borderRadius: 10, alignItems: "center", justifyContent: "center",
                  borderWidth: 1,
                  borderColor: on ? C.brand600 : has ? "rgba(119,33,87,.28)" : C.line,
                  backgroundColor: on ? C.brand600 : pressed ? C.paper : C.card,
                  opacity: has ? 1 : 0.45 })}>
                <Text style={{ fontFamily: isToday(d) ? F.sansBold : F.sans, fontSize: fs(13),
                               color: on ? "#FFFFFF" : C.ink }}>{d}</Text>
                <View style={{ height: 6, marginTop: 2, justifyContent: "center" }}>
                  {has && <View style={{ width: 5, height: 5, borderRadius: 3,
                                         backgroundColor: on ? "#FFFFFF" : C.brand600 }} />}
                </View>
              </Pressable>
            </View>);
        })}
      </View>
    </View>
  );
}

export default function Events() {
  const bar = useTopBar();
  const { t, fs, rtl } = useApp();
  const [rows, setRows] = useState(null);
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [picked, setPicked] = useState(null);
  const list = useRef(null);
  const touchedMonth = useRef(false);
  /* Pressing the Events tab while already on it goes back to the top, as it
     does on every other tab. This screen does not go through ui.jsx's Screen
     — it is a FlatList so a day can be scrolled to by index — so it asks for
     the behaviour itself. */
  useScrollToTop(list);

  const load = useCallback(async () => {
    setBusy(true);
    try { setRows(await readList("notices_live")); setErr(null); }
    catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  /* Open on the month of the next event rather than on today's — a calendar
     whose first screen has no dots on it looks broken even when it is right.
     Only until the reader moves it themselves; after that it is theirs. */
  useEffect(() => {
    if (!rows || touchedMonth.current) return;
    setMonth(openingMonth(rows));
  }, [rows]);

  /* One flat list of headings and posters, so a day can be scrolled to by
     index. Sections rather than three lists because the reader scrolls past
     "Coming up" into "Earlier" without thinking about it. */
  const { items, indexOfDay } = useMemo(() => {
    const { upcoming, past, undated } = order(rows || []);
    const out = [];
    const idx = new Map();
    const section = (label, group) => {
      if (!group.length) return;
      out.push({ kind: "section", key: "s:" + label, label });
      for (const g of groupByDay(group)) {
        if (!idx.has(g.key)) idx.set(g.key, out.length);
        out.push({ kind: "day", key: "d:" + label + ":" + g.key, at: g.at, dayKey: g.key });
        for (const it of g.items) out.push({ kind: "post", key: "p:" + it.id, item: it });
      }
    };
    section(t("events.coming_up", "Coming up"), upcoming);
    section(t("events.earlier", "Earlier"), past);
    section(t("events.date_to_be_confirmed", "Date to be confirmed"), undated);
    return { items: out, indexOfDay: idx };
  }, [rows, t]);

  const pickDay = (iso) => {
    setPicked(iso);
    const i = indexOfDay.get(iso);
    if (i == null || !list.current) return;
    /* +1 because the calendar is the list header and occupies index -1 in
       this list's own terms; scrollToIndex counts data rows only. */
    list.current.scrollToIndex({ index: i, animated: true, viewPosition: 0 });
  };

  const Header = (
    <>
      <LinearGradient onLayout={bar.onLayout} colors={[C.brand900, C.brand800]}
                      start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}>
        <TopBar />
      </LinearGradient>
      <View style={{ paddingHorizontal: 16 }}>
        <Heading>{t("events.events", "Events")}</Heading>
      </View>
      {!!rows && <EventMonth month={month} rows={rows} selected={picked}
                             onMonth={(d) => { touchedMonth.current = true; setMonth(d); }}
                             onPickDay={pickDay} />}
    </>
  );

  if (rows === null && busy)
    return <View style={{ flex: 1, backgroundColor: C.paper, justifyContent: "center" }}>
             <ActivityIndicator color={C.brand600} /></View>;

  return (
    <FlatList
      ref={list}
      style={{ backgroundColor: C.paper }}
      onScroll={bar.onScroll} scrollEventThrottle={bar.scrollEventThrottle}
      data={items}
      keyExtractor={r => r.key}
      ListHeaderComponent={Header}
      refreshControl={<RefreshControl refreshing={busy} onRefresh={load} tintColor={C.brand600} />}
      contentContainerStyle={{ paddingBottom: 28 }}
      /* Posters are images of unknown height, so there is no getItemLayout to
         give. Without this a tap on a day far down the list throws instead of
         scrolling. Measure what is rendered, then try once more. */
      onScrollToIndexFailed={(info) => {
        list.current?.scrollToOffset({ offset: info.averageItemLength * info.index, animated: true });
        setTimeout(() => {
          if (info.index < items.length)
            list.current?.scrollToIndex({ index: info.index, animated: true, viewPosition: 0 });
        }, 320);
      }}
      ListEmptyComponent={
        <View style={[{ alignItems: "center", gap: 12, paddingVertical: 44, paddingHorizontal: 22,
                        marginHorizontal: 16, borderRadius: 16, backgroundColor: C.card,
                        borderWidth: 1, borderColor: C.line, marginTop: 14 }, SHADOW]}>
          <View style={{ width: 56, height: 56, borderRadius: 28, alignItems: "center",
                         justifyContent: "center", backgroundColor: "rgba(119,33,87,.08)" }}>
            <Ionicons name="calendar-outline" size={27} color={C.brand600} />
          </View>
          <Text style={{ fontFamily: F.display, fontSize: fs(18), color: C.ink, textAlign: "center" }}>
            {err ? t("events.cant_reach", "Can’t reach the masjid")
                 : t("events.nothing_on", "Nothing on just now")}</Text>
          <Text style={{ fontFamily: F.sans, fontSize: fs(13.5), color: C.muted,
                         textAlign: "center", lineHeight: fs(22) }}>
            {err ? t("events.offline", "Events will appear once you’re back online. Pull down to try again.")
                 : t("events.will_appear", "When the masjid puts something on, the poster and the date will be here.")}</Text>
        </View>}
      renderItem={({ item }) => {
        if (item.kind === "section")
          return (
            <Text style={{ fontFamily: F.sansBold, fontSize: fs(11), letterSpacing: 0.8,
                           textTransform: "uppercase", color: C.muted, marginTop: 22,
                           marginHorizontal: 16, textAlign: rtl ? "right" : "left" }}>
              {item.label}</Text>);
        if (item.kind === "day")
          return (
            <Text style={{ fontFamily: F.display, fontSize: fs(15), color: C.ink, marginTop: 14,
                           marginHorizontal: 16, textAlign: rtl ? "right" : "left" }}>
              {item.at
                ? item.at.toLocaleDateString("en-GB",
                    { weekday: "long", day: "numeric", month: "long" })
                : t("events.no_date_yet", "Date to be confirmed")}</Text>);
        return <NoticeCard item={item.item} />;
      }}
    />
  );
}
