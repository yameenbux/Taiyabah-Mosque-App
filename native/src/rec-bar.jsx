/**
 * Taiyabah Masjid — the bar that says a recording is still playing, and controls it.
 * Copyright (c) 2026 Yameen Bux. All rights reserved. See LICENSE.md.
 *
 * This is to the recordings player what src/on-air.jsx is to the stream: once a
 * dars can outlive the screen that started it (src/recordings-audio.jsx lives
 * above the navigator), somebody who has walked off to look something up needs
 * a way to pause it and a way back to it. So: a slim bar above the tab bar,
 * only while a recording is loaded, only away from the Recordings screen —
 * where the full player is already on show.
 *
 * It carries ONE more control than the On air bar — a play/pause — because a
 * recording, unlike a live broadcast, is a thing you pause and come back to
 * rather than simply stop. The square still stops it outright. Tap the title to
 * return to the list.
 *
 * The stream's bar and this one never show at once: only one sound plays at a
 * time (src/audio-bus.js), so only one of the two is ever up, and they do not
 * stack. The slide, the clip-not-move and the reduced-motion fade are the same
 * as on-air.jsx, for the same reasons — a thing arriving uninvited should not
 * look decisive.
 */
import React, { useEffect, useState } from "react";
import { View, Text, Pressable } from "react-native";
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing, runOnJS } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import Svg, { Rect } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { C, F } from "./theme";
import { COLUMN } from "./layout";
import { tabBarFor, ON_AIR_ROOM } from "./chrome";
import { useApp } from "./store";
import { useRecordings } from "./recordings-audio";
import { reportCrash } from "./crash";
import { tap } from "./ui";
import { useReduceMotion, Equaliser } from "./motion";

const IN = { duration: 260, easing: Easing.out(Easing.cubic) };
const OUT = { duration: 240, easing: Easing.in(Easing.cubic) };
const FADE = { duration: 160 };

function Bar({ onRec, onTabs, onGo }) {
  const { t, fs, rtl } = useApp();
  const { current, playing, toggle, stop, positionMs, durationMs } = useRecordings();
  const insets = useSafeAreaInsets();
  const reduced = useReduceMotion();

  const show = !!current && !onRec;
  const [mounted, setMounted] = useState(false);
  const [h, setH] = useState(ON_AIR_ROOM);

  const y = useSharedValue(1);
  const fade = useSharedValue(0);

  useEffect(() => { if (show) setMounted(true); }, [show]);
  useEffect(() => {
    if (!mounted) return;
    if (show) {
      if (reduced) { y.value = 0; fade.value = withTiming(1, FADE); }
      else { fade.value = 1; y.value = withTiming(0, IN); }
      return;
    }
    const done = ok => { if (ok) runOnJS(setMounted)(false); };
    if (reduced) fade.value = withTiming(0, FADE, done);
    else y.value = withTiming(1, OUT, done);
  }, [mounted, show, reduced]);

  const slide = useAnimatedStyle(() => ({ transform: [{ translateY: y.value * h }], opacity: fade.value }));

  if (!mounted) return null;

  const lift = onTabs ? tabBarFor({ rtl, fs, inset: insets.bottom }).height : 0;
  const foot = onTabs ? 0 : insets.bottom;
  const frac = durationMs > 0 ? Math.max(0, Math.min(1, positionMs / durationMs)) : 0;

  return (
    <View pointerEvents="box-none"
          style={{ position: "absolute", left: 0, right: 0, bottom: lift,
                   alignItems: "center", overflow: "hidden" }}>
      <Animated.View
        onLayout={e => setH(Math.round(e.nativeEvent.layout.height) || ON_AIR_ROOM)}
        style={[{ width: "100%", maxWidth: COLUMN, backgroundColor: C.brand900,
                  borderTopWidth: 1, borderTopColor: "rgba(198,162,76,.45)" }, slide]}>
        {/* A hairline of progress along the very top of the bar, so even from
            here you can see how far through you are. */}
        <View style={{ height: 2, backgroundColor: "#4B3542" }}>
          <View style={{ height: 2, width: `${frac * 100}%`, backgroundColor: C.gold }} />
        </View>

        <View style={{ flexDirection: rtl ? "row-reverse" : "row", alignItems: "center", gap: 10,
                       paddingHorizontal: 14, paddingTop: 8, paddingBottom: 8 + foot }}>
          <Pressable onPress={() => { tap(); onGo?.(); }}
            accessibilityRole="button"
            style={({ pressed }) => ({ flex: 1, minWidth: 0, opacity: pressed ? 0.75 : 1,
                                       flexDirection: rtl ? "row-reverse" : "row", alignItems: "center", gap: 10 })}>
            {/* The equaliser breathes while it plays and falls flat the moment
                it pauses, so a glance says which. Flat under Reduce Motion. */}
            {playing
              ? <Equaliser playing color={C.gold} bars={4} size={16} width={18} />
              : <Ionicons name="musical-notes" size={16} color={C.gold} />}
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text numberOfLines={1}
                    style={{ fontFamily: F.sansSemi, fontSize: fs(9), letterSpacing: 1.6,
                             textTransform: "uppercase", color: C.gold, textAlign: rtl ? "right" : "left" }}>
                {t("rec.now_playing", "Recording")}</Text>
              <Text numberOfLines={1}
                    style={{ fontFamily: F.sansSemi, fontSize: fs(13), color: "#fff",
                             textAlign: rtl ? "right" : "left" }}>{current.title}</Text>
            </View>
          </Pressable>

          <Pressable onPress={() => { tap(); toggle(); }}
            accessibilityRole="button"
            accessibilityLabel={playing ? t("rec.pause", "Pause") : t("rec.play", "Play")}
            style={({ pressed }) => ({ width: 40, height: 40, borderRadius: 20,
                                       alignItems: "center", justifyContent: "center", borderWidth: 1,
                                       borderColor: "rgba(198,162,76,.5)",
                                       backgroundColor: pressed ? "rgba(198,162,76,.3)" : "rgba(198,162,76,.16)" })}>
            <Ionicons name={playing ? "pause" : "play"} size={18} color={C.goldBright}
                      style={{ marginLeft: playing ? 0 : 2 }} />
          </Pressable>

          <Pressable onPress={() => { tap(); stop(); }}
            accessibilityRole="button"
            accessibilityLabel={t("rec.stop", "Stop")}
            style={({ pressed }) => ({ width: 40, height: 40, borderRadius: 20,
                                       alignItems: "center", justifyContent: "center",
                                       borderWidth: 1, borderColor: "rgba(255,255,255,.26)",
                                       backgroundColor: pressed ? "rgba(255,255,255,.22)" : "rgba(255,255,255,.07)" })}>
            <Svg width={14} height={14} viewBox="0 0 24 24"><Rect x="5" y="5" width="14" height="14" rx="2.5" fill="#fff" /></Svg>
          </Pressable>
        </View>
      </Animated.View>
    </View>);
}

/* The same quiet boundary the On air bar has: a fault in a strip in the corner
   must never take the whole app down. */
class Quiet extends React.Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error) { reportCrash(error, { screen: "RecBar" }); }
  render() { return this.state.failed ? null : this.props.children; }
}

export default function RecBar(props) {
  return <Quiet><Bar {...props} /></Quiet>;
}
