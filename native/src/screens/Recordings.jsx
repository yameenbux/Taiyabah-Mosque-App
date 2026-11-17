/**
 * Taiyabah Masjid — the recordings library: browse, then listen.
 * Copyright (c) 2026 Yameen Bux. All rights reserved. See LICENSE.md.
 *
 * The masjid keeps every dars and bayaan on eMasjid Live, dated and public.
 * This is the native window onto it: the sections as tiles, a "Continue
 * listening" row that remembers where you left off, and the chosen section's
 * recordings newest-first. Tap one and it opens the full player (RecordingPlayer).
 *
 * WHERE THE SOUND LIVES. Not here. The player is src/recordings-audio.jsx,
 * mounted above the whole navigator, so a dars keeps playing while you walk off
 * to read Qurʼan or lock the phone — and the now-playing bar (src/rec-bar.jsx)
 * follows you to every other screen. This screen only starts things and lists
 * them; it owns no sound, which is the rule the gate enforces.
 *
 * The LIST and the play URL come from the Worker (/api/recordings), which reads
 * and parses eMasjid so neither this screen nor the website has to.
 */
import React, { useCallback, useEffect, useState } from "react";
import { View, Text, Pressable, ActivityIndicator, ScrollView } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { C, F, R } from "../theme";
import { useApp } from "../store";
import { Screen, TopBar, Girih, tap } from "../ui";
import { useRecordings } from "../recordings-audio";
import { IslamicIcon, iconForCategory } from "../islamic-icons";

const SENDER = "https://taiyabah-sender.yameenbux.workers.dev";

/* The deep jewel grounds the section tiles sit on, assigned by position so the
   same section keeps the same colour run to run. All dark enough for the gold
   icon and white label to read on. */
const JEWELS = ["#5E1844", "#13433A", "#243A6B", "#4A2363", "#6B1E3A", "#1F4A36", "#4B2A12"];

async function getJSON(url, ms = 9000) {
  const c = new AbortController();
  const timer = setTimeout(() => c.abort(), ms);
  try {
    const r = await fetch(url, { signal: c.signal, headers: { Accept: "application/json" } });
    if (!r.ok) throw new Error("HTTP " + r.status);
    return await r.json();
  } finally { clearTimeout(timer); }
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function niceDate(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || "");
  return m ? `${Number(m[3])} ${MONTHS[Number(m[2]) - 1] || ""} ${m[1]}` : (iso || "");
}
function niceLen(sec) {
  const s = Number(sec) || 0, h = Math.floor(s / 3600), min = Math.round((s % 3600) / 60);
  return h > 0 ? `${h} h${min ? ` ${min} min` : ""}` : `${Math.max(1, min)} min`;
}
function minsLeft(e) {
  const left = Math.max(0, (e.dur || (e.durationSec || 0) * 1000) - (e.pos || 0));
  const m = Math.round(left / 60000);
  return `${Math.max(1, m)} min left`;
}

/* A small gold tile carrying a section's icon — the thumbnail used on the
   continue cards and every list row. */
function Tile({ cat, size = 54 }) {
  return (
    <LinearGradient colors={[C.brand700, C.brand900]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      style={{ width: size, height: size, borderRadius: size * 0.24, alignItems: "center", justifyContent: "center" }}>
      <IslamicIcon name={iconForCategory(cat)} size={size * 0.52} color={C.goldBright} />
    </LinearGradient>
  );
}

export default function Recordings({ navigation }) {
  const { t, fs, rtl } = useApp();
  const rec = useRecordings();

  const [cats, setCats] = useState(null);     // null = loading, [] = failed
  const [active, setActive] = useState(null); // selected category path
  const [items, setItems] = useState(null);   // null = loading, [] = none
  const [itemsErr, setItemsErr] = useState(false);

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

  useEffect(() => {
    if (!active) return;
    let live = true;
    setItems(null); setItemsErr(false);
    getJSON(`${SENDER}/api/recordings?c=${encodeURIComponent(active)}`)
      .then(d => { if (live) setItems(Array.isArray(d.items) ? d.items : []); })
      .catch(() => { if (live) { setItems([]); setItemsErr(true); } });
    return () => { live = false; };
  }, [active]);

  const open = useCallback(item => { tap(); rec.play(item); navigation.navigate("RecordingPlayer"); }, [rec, navigation]);

  const activeName = (cats || []).find(c => c.path === active)?.name || "";
  const isCur = it => rec.current && rec.current.mp3 === it.mp3;

  return (
    <Screen pad={false}>
      <LinearGradient colors={[C.brand900, C.brand800]} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}>
        <TopBar back navigation={navigation} />
      </LinearGradient>

      {/* The band: the big gold serif title over the girih, like Live's hero. */}
      <LinearGradient colors={[C.brand800, C.brand900]} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
        style={{ paddingTop: 18, paddingHorizontal: 20, paddingBottom: 22, overflow: "hidden" }}>
        <Girih style={{ right: -40, top: -36 }} size={200} opacity={0.1} />
        <Text style={{ fontFamily: F.display, fontSize: fs(40), color: C.gold, letterSpacing: -0.3,
                       textAlign: rtl ? "right" : "left" }}>{t("rec.listen", "Listen")}</Text>
        <Text style={{ fontFamily: F.sans, fontSize: fs(13.5), color: "#BBA9B4", marginTop: 6, maxWidth: 300,
                       textAlign: rtl ? "right" : "left" }}>
          {t("rec.subtitle", "Dars, bayaans and more from the masjid")}</Text>
      </LinearGradient>

      {/* Section tiles. */}
      {cats === null
        ? <View style={{ paddingVertical: 20 }}><ActivityIndicator color={C.gold} /></View>
        : cats.length === 0
          ? <Centered fs={fs}>{t("rec.unavailable", "Recordings couldn’t be reached right now. Please try again later.")}</Centered>
          : <>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 4, gap: 12,
                                         flexDirection: rtl ? "row-reverse" : "row" }}>
                {cats.map((c, i) => {
                  const on = c.path === active;
                  return (
                    <Pressable key={c.path} onPress={() => { tap(); setActive(c.path); }}
                      accessibilityRole="button" accessibilityState={{ selected: on }}
                      style={{ width: 136, height: 112, borderRadius: 20, overflow: "hidden",
                               borderWidth: 1, borderColor: on ? "rgba(198,162,76,.55)" : "rgba(198,162,76,.2)" }}>
                      <LinearGradient colors={[JEWELS[i % JEWELS.length], "#1B0712"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                        style={{ flex: 1, padding: 14, justifyContent: "space-between" }}>
                        <IslamicIcon name={iconForCategory(c.name)} size={30} color={C.goldBright} />
                        <Text numberOfLines={2} style={{ fontFamily: F.sansSemi, fontSize: fs(14.5), color: "#fff" }}>{c.name}</Text>
                      </LinearGradient>
                    </Pressable>);
                })}
              </ScrollView>

              {/* Continue listening — straight from what was remembered locally. */}
              {rec.continueList.length > 0 && (
                <>
                  <SecHead fs={fs} rtl={rtl}>{t("rec.continue", "Continue listening")}</SecHead>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ paddingHorizontal: 16, gap: 12, flexDirection: rtl ? "row-reverse" : "row" }}>
                    {rec.continueList.map(e => {
                      const frac = e.dur ? Math.max(0.02, Math.min(1, e.pos / e.dur)) : 0.02;
                      return (
                        <Pressable key={e.mp3} onPress={() => open(e)}
                          accessibilityRole="button"
                          style={{ width: 288, flexDirection: rtl ? "row-reverse" : "row", gap: 12, alignItems: "center",
                                   backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.line, padding: 12 }}>
                          <Tile cat={e.category} />
                          <View style={{ flex: 1, minWidth: 0 }}>
                            <Text numberOfLines={2} style={{ fontFamily: F.sansSemi, fontSize: fs(14), color: C.ink }}>{e.title}</Text>
                            <Text numberOfLines={1} style={{ fontFamily: F.sans, fontSize: fs(11.5), color: C.muted, marginTop: 2 }}>{e.category}</Text>
                            <View style={{ height: 4, borderRadius: 2, backgroundColor: C.line, marginTop: 9, overflow: "hidden" }}>
                              <View style={{ height: 4, width: `${frac * 100}%`, borderRadius: 2, backgroundColor: C.gold }} />
                            </View>
                            <Text style={{ fontFamily: F.sans, fontSize: fs(10.5), color: C.muted, marginTop: 5 }}>{minsLeft(e)}</Text>
                          </View>
                        </Pressable>);
                    })}
                  </ScrollView>
                </>
              )}

              {/* The selected section's recordings. */}
              <SecHead fs={fs} rtl={rtl}>{activeName}</SecHead>
              {items === null
                ? <View style={{ paddingTop: 20 }}><ActivityIndicator color={C.gold} /></View>
                : items.length === 0
                  ? <Centered fs={fs}>{itemsErr
                      ? t("rec.unavailable", "Recordings couldn’t be reached right now. Please try again later.")
                      : t("rec.empty", "Nothing in this section yet.")}</Centered>
                  : <View style={{ paddingHorizontal: 16 }}>
                      {items.map(item => (
                        <Pressable key={item.mp3} onPress={() => open(item)} accessibilityRole="button"
                          style={({ pressed }) => ({ flexDirection: rtl ? "row-reverse" : "row", alignItems: "center", gap: 13,
                                                     paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.line,
                                                     backgroundColor: pressed ? C.tintPlum : "transparent" })}>
                          <Tile cat={item.category} size={48} />
                          <View style={{ flex: 1, minWidth: 0 }}>
                            <Text numberOfLines={2} style={{ fontFamily: F.sansSemi, fontSize: fs(14.5),
                                   color: isCur(item) ? C.brand600 : C.ink, textAlign: rtl ? "right" : "left" }}>{item.title}</Text>
                            <Text numberOfLines={1} style={{ fontFamily: F.sans, fontSize: fs(11.5), color: C.muted, marginTop: 2,
                                   textAlign: rtl ? "right" : "left" }}>{niceDate(item.date)} · {niceLen(item.durationSec)}</Text>
                          </View>
                          {isCur(item) && <Ionicons name={rec.playing ? "musical-notes" : "pause"} size={17} color={C.gold} />}
                        </Pressable>))}
                    </View>}
              <View style={{ height: 24 }} />
            </>}
    </Screen>
  );
}

function SecHead({ children, fs, rtl }) {
  return (
    <Text style={{ fontFamily: F.sansSemi, fontSize: fs(19), color: C.ink, fontWeight: "600",
                   paddingHorizontal: 16, marginTop: 24, marginBottom: 12, textAlign: rtl ? "right" : "left" }}>
      {children}</Text>
  );
}
function Centered({ children, fs }) {
  return (
    <View style={{ alignItems: "center", paddingTop: 34, paddingHorizontal: 30 }}>
      <Text style={{ fontFamily: F.sans, fontSize: fs(13.5), color: C.muted, textAlign: "center", lineHeight: fs(21) }}>{children}</Text>
    </View>
  );
}
