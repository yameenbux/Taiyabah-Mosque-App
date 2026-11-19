/**
 * Taiyabah Masjid — one place for motion.
 * Copyright (c) 2026 Yameen Bux. All rights reserved. See LICENSE.md.
 *
 * Every animation the app adds on top of navigation runs through here, so there
 * is ONE spring, ONE reduce-motion gate, and one file to change the feel in.
 * Reanimated drives it on the UI thread.
 *
 * REDUCE MOTION IS HONOURED EVERYWHERE. When the OS "Reduce Motion" switch is
 * on, every helper here renders its END STATE with no movement — the salām is
 * simply there, the star does not pop, the skeleton does not shimmer, the
 * equaliser holds still. on-air.jsx and rec-bar.jsx each carried their own copy
 * of the reduce-motion hook; useReduceMotion below is the one they now share.
 */
import React, { useEffect, useState } from "react";
import { View, AccessibilityInfo, StyleSheet } from "react-native";
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, withSpring, withDelay,
  withSequence, withRepeat, Easing, cancelAnimation,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { C, R } from "./theme";

/* The one reduce-motion hook. Reads the OS switch once and then follows it
   live, so turning Reduce Motion on mid-session calms the app at once. */
export function useReduceMotion() {
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

/* Two springs and one ease, so nothing in the app invents its own feel.
   SPRING is weighted with barely any overshoot — the house movement. SPRING_POP
   overshoots on purpose, for a count or a save that should feel answered. */
export const SPRING = { damping: 18, stiffness: 170, mass: 0.6 };
export const SPRING_POP = { damping: 9, stiffness: 230, mass: 0.5 };
export const EASE = Easing.out(Easing.cubic);

/**
 * Fade + rise on mount. `index` staggers a group 70ms apart; or pass `delay`.
 * It fires on mount, so navigating back to a screen replays it and scrolling a
 * ScrollView does not. In a FlatList, where rows mount as they scroll into
 * view, pass `animate={false}` once the first paint is past so later rows just
 * appear — see the screens for the firstPaint ref that does this.
 */
export function Appear({ children, index = 0, delay, rise = 12, duration = 520, animate = true, style }) {
  const reduce = useReduceMotion();
  const enabled = animate && !reduce;
  const p = useSharedValue(enabled ? 0 : 1);
  useEffect(() => {
    if (!enabled) { p.value = 1; return; }
    const d = delay != null ? delay : index * 70;
    p.value = withDelay(d, withTiming(1, { duration, easing: EASE }));
  }, []); // mount only
  const st = useAnimatedStyle(() => ({ opacity: p.value, transform: [{ translateY: (1 - p.value) * rise }] }));
  return <Animated.View style={[style, st]}>{children}</Animated.View>;
}

/**
 * A pop any view can borrow: scale punches out and springs back. Used by the
 * tasbīḥ numeral on each count and by the Bukhārī save star. Returns the
 * animated style to spread and a fire() to call. No-op under reduce motion.
 */
export function usePop() {
  const reduce = useReduceMotion();
  const s = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  const pop = (to = 1.3) => {
    if (reduce) return;
    s.value = withSequence(withTiming(to, { duration: 110, easing: EASE }), withSpring(1, SPRING_POP));
  };
  return { style, pop };
}

/**
 * A one-shot ring that expands and fades — the gold ring behind a saved star,
 * the red ring behind a new-notice dot, the pulse at the end of a tasbīḥ round.
 * Returns the animated style and a fire(). The caller positions the ring.
 */
export function useRing() {
  const reduce = useReduceMotion();
  /* p runs 0 → 1 over one pulse; it RESTS at 1, where opacity is 0, so the
     ring is invisible until fire() restarts it from 0. */
  const p = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ opacity: 0.8 * (1 - p.value), transform: [{ scale: 1 + p.value * 0.9 }] }));
  const fire = () => {
    if (reduce) { p.value = 1; return; }
    p.value = 0;
    p.value = withTiming(1, { duration: 700, easing: EASE });
  };
  return { style, fire };
}

/* A single shimmering skeleton block the shape of the row it stands in for —
   a branded gold sheen sweeping across, in place of a bare spinner. Holds
   still (just the tinted block) under reduce motion. */
export function Skeleton({ height = 52, radius = R.card, style }) {
  const reduce = useReduceMotion();
  const [w, setW] = useState(0);
  const x = useSharedValue(0);
  useEffect(() => {
    if (reduce || !w) return;
    x.value = 0;
    x.value = withRepeat(withTiming(1, { duration: 1350, easing: Easing.inOut(Easing.ease) }), -1, false);
    return () => cancelAnimation(x);
  }, [reduce, w]);
  const sweep = useAnimatedStyle(() => ({ transform: [{ translateX: -w + x.value * (2 * w) }] }));
  return (
    <View onLayout={e => setW(Math.round(e.nativeEvent.layout.width))}
          style={[{ height, borderRadius: radius, backgroundColor: C.card, borderWidth: 1,
                    borderColor: C.line, overflow: "hidden" }, style]}>
      {!reduce && w > 0 ? (
        <Animated.View style={[StyleSheet.absoluteFill, { width: w }, sweep]}>
          <LinearGradient colors={["transparent", "rgba(198,162,76,0.18)", "transparent"]}
                          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ flex: 1 }} />
        </Animated.View>
      ) : null}
    </View>
  );
}

/* A stack of skeletons, for a list that is still loading. */
export function SkeletonRows({ count = 4, height = 54, gap = 11, radius = R.card, style }) {
  return (
    <View style={[{ gap }, style]}>
      {Array.from({ length: count }).map((_, i) => <Skeleton key={i} height={height} radius={radius} />)}
    </View>
  );
}

/* A progress bar that draws itself in from the left on mount — the fill grows
   to `frac` of the track. Measured in px (not an animated %) so it is exact.
   Under reduce motion it is simply full to `frac`. */
export function GrowBar({ frac, color = C.goldBright, height = 4, track = "rgba(255,255,255,.14)", delay = 300, duration = 900, style }) {
  const reduce = useReduceMotion();
  const [w, setW] = useState(0);
  const p = useSharedValue(reduce ? 1 : 0);
  const f = Math.max(0, Math.min(1, frac || 0));
  useEffect(() => {
    if (reduce) { p.value = 1; return; }
    p.value = 0;
    p.value = withDelay(delay, withTiming(1, { duration, easing: EASE }));
  }, [reduce]);
  const fill = useAnimatedStyle(() => ({ width: w * f * p.value }));
  return (
    <View onLayout={e => setW(Math.round(e.nativeEvent.layout.width))}
          style={[{ height, borderRadius: height / 2, backgroundColor: track, overflow: "hidden" }, style]}>
      <Animated.View style={[{ height, borderRadius: height / 2, backgroundColor: color }, fill]} />
    </View>
  );
}

/* The equaliser on the now-playing bar: a few bars breathing while a recording
   plays, flat the moment it pauses. Decorative, so it is hidden from the
   screen reader and holds flat under reduce motion. */
function EqBar({ i, playing, color, size }) {
  const h = useSharedValue(0.3);
  useEffect(() => {
    if (!playing) { cancelAnimation(h); h.value = withTiming(0.3, { duration: 220 }); return; }
    h.value = withDelay(i * 120,
      withRepeat(withTiming(1, { duration: 440 + i * 50, easing: Easing.inOut(Easing.ease) }), -1, true));
    return () => cancelAnimation(h);
  }, [playing]);
  const st = useAnimatedStyle(() => ({ height: (0.22 + h.value * 0.78) * size }));
  return <Animated.View style={[{ flex: 1, backgroundColor: color, borderRadius: 1.5 }, st]} />;
}

export function Equaliser({ playing, color = C.goldBright, bars = 4, size = 18, width = 20 }) {
  const reduce = useReduceMotion();
  const on = playing && !reduce;
  return (
    <View accessible={false} importantForAccessibility="no-hide-descendants"
          style={{ flexDirection: "row", alignItems: "flex-end", height: size, width, gap: 2.5 }}>
      {Array.from({ length: bars }).map((_, i) => (
        <EqBar key={i} i={i} playing={on} color={color} size={size} />
      ))}
    </View>
  );
}
