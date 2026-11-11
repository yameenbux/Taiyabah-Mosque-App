/**
 * Taiyabah Masjid — the bar that says the radio is still on, and stops it.
 * Copyright (c) 2026 Yameen Bux. All rights reserved. See LICENSE.md.
 *
 * src/live-audio.jsx is what keeps the stream alive once you leave the Live
 * screen. This is the other half of that change, and the half that makes it
 * safe: once audio can outlive the screen that started it, somebody three
 * screens deep in the Qurʼan has no way to turn it off and no sign that it is
 * even still going. A stream you cannot stop is worse than one that stops by
 * itself.
 *
 * So: a slim bar above the tab bar, only while something is actually playing,
 * only away from the Live screen — on Live the full player is right there and
 * a second stop button under it is clutter. Tap the bar to go back to the
 * player; tap the square to stop.
 *
 * IT IS CLIPPED, NOT MERELY MOVED. On stop it slides DOWN and tucks away
 * behind the tab bar rather than sliding across it, which is the difference
 * between a thing leaving and a thing glitching. The website gets that for
 * free by sitting below the tab bar in z-order; here the bar is a sibling of
 * the whole navigator and therefore paints on top of everything, so the slide
 * happens inside a container with overflow:"hidden" whose box is exactly the
 * bar. Same picture, by other means.
 *
 * 240ms leaving and ACCELERATING; 260ms arriving and DECELERATING. A thing
 * going because you told it to should look decisive; a thing arriving
 * uninvited should not. Reduced motion gets neither — it fades.
 *
 * WHAT IT IS NOT. It is not a lock-screen control. expo-av publishes no
 * now-playing metadata of its own, so the phone's own lock screen and
 * Control Centre still show nothing for this stream. That is a separate piece
 * of work with its own library; this bar is how you stop it from inside the
 * app, which is where the complaint came from.
 */
import React, { useEffect, useState } from "react";
import { View, Text, Pressable, AccessibilityInfo } from "react-native";
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withRepeat,
                   Easing, runOnJS } from "react-native-reanimated";
import Svg, { Rect } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { C, F } from "./theme";
import { COLUMN } from "./layout";
import { tabBarFor, ON_AIR_ROOM } from "./chrome";
import { useApp } from "./store";
import { useLiveAudio } from "./live-audio";
import { reportCrash } from "./crash";
import { tap } from "./ui";

const IN = { duration: 260, easing: Easing.out(Easing.cubic) };
const OUT = { duration: 240, easing: Easing.in(Easing.cubic) };
const FADE = { duration: 160 };

/** Has this phone asked for less movement? */
function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    let live = true;
    AccessibilityInfo.isReduceMotionEnabled().catch(() => false)
      .then(v => { if (live) setReduced(!!v); });
    let sub;
    try { sub = AccessibilityInfo.addEventListener("reduceMotionChanged", v => setReduced(!!v)); } catch {}
    return () => { live = false; try { sub?.remove(); } catch {} };
  }, []);
  return reduced;
}

/**
 * @param onLive  the Live screen is the one on top — the bar stays away
 * @param onTabs  a tab screen is showing, so there is a tab bar to sit on;
 *                false under a pushed screen, which covers it
 * @param onGo    take me back to the player
 */
function Bar({ onLive, onTabs, onGo }) {
  const { t, fs, rtl } = useApp();
  const { playing, stop } = useLiveAudio();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();

  const show = playing && !onLive;
  /* Kept in the tree for the 240ms it takes to leave: unmounted at the moment
     of the tap there would be no animation to see. */
  const [mounted, setMounted] = useState(false);
  /* Measured rather than assumed, because the bar grows with the text size
     setting and a slide of the wrong distance leaves a sliver showing. */
  const [h, setH] = useState(ON_AIR_ROOM);

  const y = useSharedValue(1);       /* 1 = tucked away, 0 = in place */
  const fade = useSharedValue(0);
  const halo = useSharedValue(0);

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

  /* The ring going out from the dot, which is the website's box-shadow pulse
     by another name. Off entirely under reduced motion. */
  useEffect(() => {
    if (!mounted || reduced) { halo.value = 0; return; }
    halo.value = 0;
    halo.value = withRepeat(withTiming(1, { duration: 2000, easing: Easing.out(Easing.quad) }), -1, false);
  }, [mounted, reduced]);

  const slide = useAnimatedStyle(() => ({
    transform: [{ translateY: y.value * h }],
    opacity: fade.value,
  }));
  const ring = useAnimatedStyle(() => ({
    opacity: 0.55 * (1 - halo.value),
    transform: [{ scale: 0.6 + halo.value * 1.6 }],
  }));

  if (!mounted) return null;

  /* On a tab screen the bar rests on the tab bar; under a pushed screen there
     is no tab bar, so it goes to the floor and takes the home indicator's
     room into its own padding. */
  const lift = onTabs ? tabBarFor({ rtl, fs, inset: insets.bottom }).height : 0;
  const foot = onTabs ? 0 : insets.bottom;

  return (
    <View pointerEvents="box-none"
          style={{ position: "absolute", left: 0, right: 0, bottom: lift,
                   alignItems: "center", overflow: "hidden" }}>
      <Animated.View
        onLayout={e => setH(Math.round(e.nativeEvent.layout.height) || ON_AIR_ROOM)}
        style={[{ width: "100%", maxWidth: COLUMN,
                  flexDirection: rtl ? "row-reverse" : "row", alignItems: "center", gap: 11,
                  paddingHorizontal: 14, paddingTop: 9, paddingBottom: 9 + foot,
                  backgroundColor: C.brand900,
                  borderTopWidth: 1, borderTopColor: "rgba(198,162,76,.45)" }, slide]}>

        <Pressable onPress={() => { tap(); onGo?.(); }}
          accessibilityRole="button"
          style={({ pressed }) => ({ flex: 1, minWidth: 0, opacity: pressed ? 0.75 : 1,
                                     flexDirection: rtl ? "row-reverse" : "row",
                                     alignItems: "center", gap: 11 })}>
          <View style={{ width: 9, height: 9, alignItems: "center", justifyContent: "center" }}>
            <Animated.View style={[{ position: "absolute", width: 9, height: 9, borderRadius: 4.5,
                                     backgroundColor: C.onAir }, ring]} />
            <View style={{ width: 9, height: 9, borderRadius: 4.5, backgroundColor: C.onAir }} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text numberOfLines={1}
                  style={{ fontFamily: F.sansSemi, fontSize: fs(9), letterSpacing: 1.6,
                           textTransform: "uppercase", color: C.gold,
                           textAlign: rtl ? "right" : "left" }}>
              {t("live.on_air", "On air")}</Text>
            <Text numberOfLines={1}
                  style={{ fontFamily: F.sansSemi, fontSize: fs(13.5), color: "#fff",
                           textAlign: rtl ? "right" : "left" }}>
              {t("app.name", "Taiyabah Masjid")}</Text>
          </View>
        </Pressable>

        <Pressable onPress={() => { tap(); stop(); }}
          accessibilityRole="button"
          accessibilityLabel={t("a11y.stop_live_stream", "Stop live stream")}
          style={({ pressed }) => ({ width: 40, height: 40, borderRadius: 20,
                                     alignItems: "center", justifyContent: "center",
                                     borderWidth: 1, borderColor: "rgba(255,255,255,.26)",
                                     backgroundColor: pressed ? "rgba(255,255,255,.22)"
                                                              : "rgba(255,255,255,.07)" })}>
          <Svg width={15} height={15} viewBox="0 0 24 24">
            <Rect x="5" y="5" width="14" height="14" rx="2.5" fill="#fff" />
          </Svg>
        </Pressable>
      </Animated.View>
    </View>
  );
}

/**
 * A fault in this bar must not take the app down with it.
 *
 * It is rendered above the whole navigator, so the only error boundary over it
 * is the outermost one — and that draws a full-screen "Something went wrong"
 * card. For a strip in the corner that is wildly the wrong answer: the app
 * would be unusable because its decoration broke.
 *
 * So it has its own, and its fallback is nothing at all. The crash is still
 * reported, the app carries on, and the cost is that the stream can then only
 * be stopped from the Live screen itself — which is where it could only be
 * stopped before any of this existed.
 */
class Quiet extends React.Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error) { reportCrash(error, { screen: "OnAirBar" }); }
  render() { return this.state.failed ? null : this.props.children; }
}

export default function OnAirBar(props) {
  return <Quiet><Bar {...props} /></Quiet>;
}
