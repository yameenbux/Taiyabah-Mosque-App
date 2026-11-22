/**
 * Taiyabah Masjid — the recording, played in full.
 * Copyright (c) 2026 Yameen Bux. All rights reserved. See LICENSE.md.
 *
 * The immersive view onto whatever src/recordings-audio.jsx is playing: the
 * masjid's wordmark, the section it belongs to, a gold medallion carrying that
 * section's own icon, the title, a scrubber you can drag, and the transport
 * with ±15s either side.
 *
 * IT OWNS NO SOUND. Every control here goes through useRecordings(), the player
 * that lives above the navigator — so leaving this screen (the down-chevron, or
 * the back gesture) does not stop the dars. It keeps playing, the now-playing
 * bar picks it up on the next screen, and it carries on with the phone locked.
 * Reads `current` from the provider; if there is nothing loaded it steps back
 * rather than showing an empty player.
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, Pressable, Image, ActivityIndicator, PanResponder } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { C, F } from "../theme";
import { useApp } from "../store";
import { tap } from "../ui";
import { useRecordings } from "../recordings-audio";
import { IslamicIcon, iconForCategory } from "../islamic-icons";

function clock(ms) {
  const s = Math.max(0, Math.floor((ms || 0) / 1000));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  const mm = h ? String(m).padStart(2, "0") : String(m);
  return (h ? `${h}:` : "") + `${mm}:${String(sec).padStart(2, "0")}`;
}

export default function RecordingPlayer({ navigation }) {
  const { t, fs } = useApp();
  const insets = useSafeAreaInsets();
  const rec = useRecordings();
  const { current, positionMs, durationMs, playing, state } = rec;

  /* Nothing loaded — e.g. the stream took the output while this was open. Step
     back rather than sit on a blank player. */
  useEffect(() => { if (!current) navigation.goBack(); }, [current, navigation]);

  /* A stylised bar scrubber: fixed bars whose heights are seeded from the title
     so the same dars always draws the same shape. Dragging seeks by time — it
     is a scrubber drawn as a waveform, not a real amplitude read (that would
     mean decoding the whole file on the phone). */
  const bars = useMemo(() => {
    const n = 44, seed = (current?.title || "").length + 7, out = [];
    for (let i = 0; i < n; i++) out.push(6 + Math.abs(Math.sin((i + seed) * 0.9)) * 26 + (i % 3) * 3);
    return out;
  }, [current?.title]);

  const [scrub, setScrub] = useState(null);     // fraction while dragging, else null
  const barW = useRef(1);
  /* The latest duration and seek, for the pan handler that is created once and
     would otherwise close over the first render's (empty) values. */
  const live = useRef({ dur: 0, seek: () => {} });
  const dur = durationMs || 0;
  live.current = { dur, seek: rec.seek };

  const pan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: e => setScrub(Math.max(0, Math.min(1, e.nativeEvent.locationX / (barW.current || 1)))),
    onPanResponderMove: e => setScrub(Math.max(0, Math.min(1, e.nativeEvent.locationX / (barW.current || 1)))),
    onPanResponderRelease: () => setScrub(f => { const L = live.current; if (f != null && L.dur) L.seek(f * L.dur); return null; }),
    onPanResponderTerminate: () => setScrub(null),
  })).current;

  if (!current) return <View style={{ flex: 1, backgroundColor: C.brand900 }} />;

  const iconName = iconForCategory(current.category);
  const pos = scrub != null && dur ? scrub * dur : positionMs;
  const frac = dur ? Math.max(0, Math.min(1, pos / dur)) : 0;
  const loading = state === "loading";

  return (
    <LinearGradient colors={[C.brand800, "#0E0309"]} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
      style={{ flex: 1, paddingTop: insets.top + 16, paddingHorizontal: 26,
                paddingBottom: insets.bottom + 22 }}>

      <Pressable onPress={() => { tap(); navigation.goBack(); }} hitSlop={12}
        accessibilityRole="button" accessibilityLabel={t("rec.minimise", "Minimise")}
        style={{ alignSelf: "flex-start" }}>
        <Ionicons name="chevron-down" size={26} color={C.gold} />
      </Pressable>

      {/* The wordmark, sized to the page, with the section beneath it. */}
      <Image source={require("../../assets/logo.png")}
             style={{ width: 128, height: 90, resizeMode: "contain", alignSelf: "center", marginTop: 8 }} />
      <Text style={{ fontFamily: F.sansSemi, fontSize: fs(15.5), letterSpacing: 2.6, textTransform: "uppercase",
                     color: C.goldBright, textAlign: "center", marginTop: 20 }}>{current.category || ""}</Text>

      {/* The medallion: the section's own icon in a glowing gold ring. */}
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <View style={{ width: 256, height: 256, borderRadius: 128, alignItems: "center", justifyContent: "center",
                       borderWidth: 1.5, borderColor: "rgba(198,162,76,.5)", backgroundColor: "rgba(198,162,76,.05)",
                       shadowColor: C.gold, shadowOpacity: 0.35, shadowRadius: 40, shadowOffset: { width: 0, height: 0 },
                       elevation: 8 }}>
          <IslamicIcon name={iconName} size={150} color={C.goldBright} strokeWidth={1.2} />
        </View>
      </View>

      <Text numberOfLines={3} style={{ fontFamily: F.display, fontSize: fs(25), lineHeight: fs(31), color: C.cream,
                                       textAlign: "center", marginHorizontal: 8 }}>{current.title}</Text>

      {/* scrubber */}
      <View style={{ height: 40, justifyContent: "center", flexDirection: "row", alignItems: "center", gap: 2, marginTop: 22 }}
            onLayout={e => (barW.current = e.nativeEvent.layout.width)} {...pan.panHandlers}>
        {bars.map((h, i) => (
          <View key={i} style={{ width: 3, height: h, borderRadius: 2,
                                 backgroundColor: i / bars.length <= frac ? C.gold : "rgba(255,255,255,.22)" }} />))}
      </View>
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 2 }}>
        <Text style={{ fontFamily: F.sans, fontSize: fs(11), color: "#BBA9B4" }}>{clock(pos)}</Text>
        <Text style={{ fontFamily: F.sans, fontSize: fs(11), color: "#BBA9B4" }}>{clock(dur)}</Text>
      </View>

      {/* transport */}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 34, marginTop: 22 }}>
        <Pressable onPress={() => { tap(); rec.skip(-15); }} hitSlop={12}
          accessibilityRole="button" accessibilityLabel={t("rec.back15", "Back 15 seconds")}>
          <Ionicons name="play-back" size={30} color="#D8C6D0" />
        </Pressable>
        <Pressable onPress={() => { tap(); rec.toggle(); }}
          accessibilityRole="button" accessibilityState={{ busy: loading }}
          accessibilityLabel={playing ? t("rec.pause", "Pause") : t("rec.play", "Play")}
          style={({ pressed }) => ({ width: 80, height: 80, borderRadius: 40, alignItems: "center", justifyContent: "center",
                                     borderWidth: 1.5, borderColor: "rgba(198,162,76,.5)",
                                     backgroundColor: pressed ? "rgba(198,162,76,.28)" : "rgba(198,162,76,.16)" })}>
          {loading ? <ActivityIndicator color={C.goldBright} />
                   : <Ionicons name={playing ? "pause" : "play"} size={34} color={C.goldBright}
                               style={{ marginLeft: playing ? 0 : 4 }} />}
        </Pressable>
        <Pressable onPress={() => { tap(); rec.skip(15); }} hitSlop={12}
          accessibilityRole="button" accessibilityLabel={t("rec.fwd15", "Forward 15 seconds")}>
          <Ionicons name="play-forward" size={30} color="#D8C6D0" />
        </Pressable>
      </View>
    </LinearGradient>
  );
}
