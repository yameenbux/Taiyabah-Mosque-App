/**
 * Taiyabah Masjid — the recordings archive, played in the app.
 * Copyright (c) 2026 Yameen Bux. All rights reserved. See LICENSE.md.
 *
 * The masjid already keeps every dars and bayaan on eMasjid Live, dated and
 * public. This screen is a native window onto that archive: pick a section,
 * see what is in it newest-first, tap to listen. The LIST and the PLAY URL come
 * from the Worker (/api/recordings), which does the reading and parsing so
 * neither this screen nor the website has to know what eMasjid's HTML looks
 * like — see worker/src/recordings.js. The SOUND is src/recordings-audio.jsx,
 * held above the navigator so a dars keeps going when you walk off to read, the
 * same promise the live stream makes.
 *
 * It is laid out as a fixed frame, not a scroll: the section chips and the
 * player stay put while only the list of recordings moves, so the thing you are
 * listening to never scrolls out from under your thumb.
 */
import React, { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, Pressable, ActivityIndicator, FlatList, ScrollView, PanResponder } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { C, F, R } from "../theme";
import { useApp } from "../store";
import { Screen, TopBar, Girih, tap } from "../ui";
import { useRecordings } from "../recordings-audio";

const SENDER = "https://taiyabah-sender.yameenbux.workers.dev";

async function getJSON(url, ms = 9000) {
  const c = new AbortController();
  const timer = setTimeout(() => c.abort(), ms);
  try {
    const r = await fetch(url, { signal: c.signal, headers: { Accept: "application/json" } });
    if (!r.ok) throw new Error("HTTP " + r.status);
    return await r.json();
  } finally { clearTimeout(timer); }
}

/* "9 Nov 2026" from "2026-11-09", without pulling a date library in. */
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function niceDate(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || "");
  if (!m) return iso || "";
  return `${Number(m[3])} ${MONTHS[Number(m[2]) - 1] || ""} ${m[1]}`;
}
/* "35 min", or "1 h 20 min" past the hour. */
function niceLength(sec) {
  const s = Number(sec) || 0;
  const h = Math.floor(s / 3600), min = Math.round((s % 3600) / 60);
  if (h > 0) return `${h} h${min ? ` ${min} min` : ""}`;
  return `${Math.max(1, min)} min`;
}
/* The player clock: m:ss, or h:mm:ss once past an hour. */
function clock(ms) {
  const t = Math.max(0, Math.floor((ms || 0) / 1000));
  const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = t % 60;
  const mm = h ? String(m).padStart(2, "0") : String(m);
  return (h ? `${h}:` : "") + `${mm}:${String(s).padStart(2, "0")}`;
}

export default function Recordings({ navigation }) {
  const { t, fs, rtl } = useApp();
  const rec = useRecordings();

  const [cats, setCats] = useState(null);     // null = loading, [] = failed/empty
  const [active, setActive] = useState(null); // selected category path
  const [items, setItems] = useState(null);   // null = loading, [] = none
  const [itemsErr, setItemsErr] = useState(false);

  /* Categories, once. */
  useEffect(() => {
    let live = true;
    getJSON(`${SENDER}/api/recordings`)
      .then(d => { if (!live) return;
        const list = Array.isArray(d.categories) ? d.categories : [];
        setCats(list);
        if (list.length) setActive(list[0].path);
      })
      .catch(() => { if (live) setCats([]); });
    return () => { live = false; };
  }, []);

  /* The selected category's recordings, whenever it changes. */
  useEffect(() => {
    if (!active) return;
    let live = true;
    setItems(null); setItemsErr(false);
    getJSON(`${SENDER}/api/recordings?c=${encodeURIComponent(active)}`)
      .then(d => { if (live) setItems(Array.isArray(d.items) ? d.items : []); })
      .catch(() => { if (live) { setItems([]); setItemsErr(true); } });
    return () => { live = false; };
  }, [active]);

  const isCurrent = it => rec.current && rec.current.mp3 === it.mp3;

  const onRow = useCallback(it => {
    tap();
    if (isCurrent(it)) rec.toggle();
    else rec.play(it);
  }, [rec]);

  const activeName = (cats || []).find(c => c.path === active)?.name || "";

  return (
    <Screen scroll={false} pad={false}>
      <LinearGradient colors={[C.brand900, C.brand800]} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}>
        <TopBar back navigation={navigation} />
      </LinearGradient>

      {/* A band, like the Live hero: title, one line under it, the girih behind. */}
      <LinearGradient colors={[C.brand800, C.brand900]} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
        style={{ paddingTop: 22, paddingHorizontal: 20, paddingBottom: 18, overflow: "hidden" }}>
        <Girih style={{ right: -52, top: -46 }} size={200} opacity={0.09} />
        <Text style={{ fontFamily: F.display, fontSize: fs(24), color: C.cream,
                       textAlign: rtl ? "right" : "left" }}>
          {t("rec.title", "Recordings")}</Text>
        <Text style={{ fontFamily: F.sans, fontSize: fs(12.5), color: "#BBA9B4", marginTop: 3,
                       textAlign: rtl ? "right" : "left" }}>
          {t("rec.subtitle", "Dars, bayaans and more from the masjid")}</Text>
      </LinearGradient>

      {/* The section chips. A horizontal rail so a long list of sections does
          not push the recordings off the screen. */}
      {cats === null
        ? <View style={{ paddingVertical: 14 }}><ActivityIndicator color={C.gold} /></View>
        : cats.length === 0
          ? null
          : <View style={{ borderBottomWidth: 1, borderBottomColor: C.line }}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 11, gap: 8,
                                         flexDirection: rtl ? "row-reverse" : "row" }}>
                {cats.map(c => {
                  const on = c.path === active;
                  return (
                    <Pressable key={c.path} onPress={() => { tap(); setActive(c.path); }}
                      accessibilityRole="button"
                      accessibilityState={{ selected: on }}
                      style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: R.pill,
                               backgroundColor: on ? C.pick : C.tintPlum,
                               borderWidth: 1, borderColor: on ? C.pick : C.line }}>
                      <Text style={{ fontFamily: F.sansSemi, fontSize: fs(12.5),
                                     color: on ? C.pickInk : C.muted }}>{c.name}</Text>
                    </Pressable>);
                })}
              </ScrollView>
            </View>}

      {/* The recordings in the chosen section. */}
      <View style={{ flex: 1 }}>
        {cats && cats.length === 0
          ? <Centered>{t("rec.unavailable", "Recordings couldn’t be reached right now. Please try again later.")}</Centered>
          : items === null
            ? <View style={{ paddingTop: 34 }}><ActivityIndicator color={C.gold} /></View>
            : items.length === 0
              ? <Centered>{itemsErr
                  ? t("rec.unavailable", "Recordings couldn’t be reached right now. Please try again later.")
                  : t("rec.empty", "Nothing in this section yet.")}</Centered>
              : <FlatList
                  data={items}
                  keyExtractor={it => it.mp3}
                  contentContainerStyle={{ paddingBottom: 14 }}
                  renderItem={({ item }) => (
                    <Row item={item} on={isCurrent(item)} playing={isCurrent(item) && rec.playing}
                         rtl={rtl} fs={fs} onPress={() => onRow(item)}
                         listenLabel={t("rec.listen", "Listen")} />
                  )} />}
      </View>

      {/* The player, pinned under the list while something is loaded. */}
      {rec.current ? <PlayerBar rec={rec} rtl={rtl} fs={fs}
                       title={rec.current.title} sub={`${niceDate(rec.current.date)} · ${niceLength(rec.current.durationSec)}`} /> : null}
    </Screen>
  );
}

function Centered({ children }) {
  const { fs } = useApp();
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "flex-start", paddingTop: 40, paddingHorizontal: 30 }}>
      <Text style={{ fontFamily: F.sans, fontSize: fs(13.5), color: C.muted, textAlign: "center", lineHeight: fs(21) }}>
        {children}</Text>
    </View>);
}

function Row({ item, on, playing, rtl, fs, onPress, listenLabel }) {
  return (
    <Pressable onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => ({ flexDirection: rtl ? "row-reverse" : "row", alignItems: "center", gap: 12,
                                 paddingVertical: 12, paddingHorizontal: 16,
                                 borderBottomWidth: 1, borderBottomColor: C.line,
                                 backgroundColor: pressed ? C.tintPlum : on ? C.tintPlumPill : "transparent" })}>
      <View style={{ width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center",
                     borderWidth: 1, borderColor: on ? "rgba(198,162,76,.5)" : C.line,
                     backgroundColor: on ? "rgba(198,162,76,.16)" : C.tintPlum }}>
        <Ionicons name={playing ? "pause" : "play"} size={17}
                  color={on ? C.goldInk : C.brand600}
                  style={{ marginLeft: playing ? 0 : 2 }} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text numberOfLines={2}
              style={{ fontFamily: F.sansSemi, fontSize: fs(14), color: C.ink,
                       textAlign: rtl ? "right" : "left" }}>{item.title}</Text>
        <Text numberOfLines={1}
              style={{ fontFamily: F.sans, fontSize: fs(11.5), color: C.muted, marginTop: 2,
                       textAlign: rtl ? "right" : "left" }}>
          {niceDate(item.date)} · {niceLength(item.durationSec)}
          {on ? `  ·  ${listenLabel}` : ""}</Text>
      </View>
    </Pressable>);
}

/* The bottom player: title, a scrubber you can drag, the two clocks and the
   big button, with ±15s either side. */
function PlayerBar({ rec, title, sub, rtl, fs }) {
  const { t } = useApp();
  const barW = useRef(1);
  const [scrub, setScrub] = useState(null); // a fraction while dragging, else null

  const dur = rec.durationMs || 0;
  const pos = scrub != null && dur ? scrub * dur : rec.positionMs;
  const frac = dur ? Math.max(0, Math.min(1, pos / dur)) : 0;

  const setFrom = x => { const f = Math.max(0, Math.min(1, x / (barW.current || 1))); setScrub(f); };
  const pan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: e => setFrom(e.nativeEvent.locationX),
    onPanResponderMove: e => setFrom(e.nativeEvent.locationX),
    onPanResponderRelease: () => { setScrub(f => { if (f != null && dur) rec.seek(f * dur); return null; }); },
    onPanResponderTerminate: () => setScrub(null),
  })).current;

  const loading = rec.state === "loading";

  return (
    <View style={{ borderTopWidth: 1, borderTopColor: "rgba(198,162,76,.45)", backgroundColor: C.brand900,
                   paddingHorizontal: 16, paddingTop: 11, paddingBottom: 14 }}>
      <Text numberOfLines={1}
            style={{ fontFamily: F.sansSemi, fontSize: fs(13.5), color: "#fff",
                     textAlign: rtl ? "right" : "left" }}>{title}</Text>
      <Text numberOfLines={1}
            style={{ fontFamily: F.sans, fontSize: fs(11), color: "#BBA9B4", marginTop: 1,
                     textAlign: rtl ? "right" : "left" }}>{sub}</Text>

      {/* scrubber */}
      <View style={{ height: 26, justifyContent: "center", marginTop: 8 }}
            onLayout={e => (barW.current = e.nativeEvent.layout.width)}
            {...pan.panHandlers}>
        <View style={{ height: 4, borderRadius: 2, backgroundColor: "#4B3542" }}>
          <View style={{ position: "absolute", left: 0, top: 0, bottom: 0,
                         width: `${frac * 100}%`, borderRadius: 2, backgroundColor: C.gold }} />
        </View>
        <View pointerEvents="none"
              style={{ position: "absolute", left: `${frac * 100}%`, marginLeft: -8,
                       width: 16, height: 16, borderRadius: 8, backgroundColor: C.gold }} />
      </View>
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 2 }}>
        <Text style={{ fontFamily: F.sans, fontSize: fs(10.5), color: "#BBA9B4" }}>{clock(pos)}</Text>
        <Text style={{ fontFamily: F.sans, fontSize: fs(10.5), color: "#BBA9B4" }}>{clock(dur)}</Text>
      </View>

      {/* transport */}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 26, marginTop: 6 }}>
        <Pressable onPress={() => { tap(); rec.skip(-15); }} hitSlop={10}
          accessibilityRole="button" accessibilityLabel={t("rec.back15", "Back 15 seconds")}>
          <Ionicons name="play-back" size={22} color="#D8C6D0" />
        </Pressable>
        <Pressable onPress={() => { tap(); rec.toggle(); }}
          accessibilityRole="button" accessibilityState={{ busy: loading }}
          style={({ pressed }) => ({ width: 60, height: 60, borderRadius: 30,
                                     alignItems: "center", justifyContent: "center", borderWidth: 1,
                                     borderColor: "rgba(198,162,76,.5)",
                                     backgroundColor: pressed ? "rgba(198,162,76,.3)" : "rgba(198,162,76,.16)" })}>
          {loading ? <ActivityIndicator color={C.goldBright} />
                   : <Ionicons name={rec.playing ? "pause" : "play"} size={26} color={C.goldBright}
                               style={{ marginLeft: rec.playing ? 0 : 3 }} />}
        </Pressable>
        <Pressable onPress={() => { tap(); rec.skip(15); }} hitSlop={10}
          accessibilityRole="button" accessibilityLabel={t("rec.fwd15", "Forward 15 seconds")}>
          <Ionicons name="play-forward" size={22} color="#D8C6D0" />
        </Pressable>
      </View>
    </View>);
}
