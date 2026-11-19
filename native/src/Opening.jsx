/* The app opening, once, when it is launched from cold.
 *
 * The plum splash holds the gold girih star — the app-icon motif — and then the
 * STAR OPENS: it grows as a hole cut out of the plum, so the app is revealed
 * THROUGH its shape, the way the X app's glyph opens into the feed. The star is
 * a vector, so it needs no font and no bitmap to be sampled — the blur the
 * web version had, and the font-at-startup flash the old logo splash was
 * written to avoid, are both gone because there is no text here at all.
 *
 * THREE RULES, because this app has twice shipped a blank screen caused by
 * something at startup deciding when the app may be used:
 *
 *   1. It gates NOTHING. The app is mounted and live underneath from the first
 *      frame; this is a veil over the top of it, not a door in front of it.
 *   2. It never takes a touch. pointerEvents is "none" for its whole life, so
 *      a veil that somehow stayed up could still not stop anybody using the
 *      app behind it.
 *   3. It has a ceiling. If a callback is dropped — a backgrounded app, a
 *      reload mid-animation — a timer takes it away regardless. And the plum
 *      veil fades out at the end on its own opacity, so even if the star mask
 *      never animated on a given device the splash still clears to the app
 *      rather than sticking. The animation is allowed to fail; it is not
 *      allowed to persist.
 *
 * And it asks the phone whether its owner wants movement at all. Somebody who
 * has turned animation off system-wide has usually done it because motion makes
 * them ill, and a masjid app is not the place to overrule that: Reduce Motion
 * gets the plain quick fade this screen has always had, with no zoom.
 */
import React, { useEffect, useRef, useState } from "react";
import { View, AccessibilityInfo, Platform, useWindowDimensions, StyleSheet } from "react-native";
import Animated, {
  useSharedValue, useAnimatedStyle, useAnimatedProps, withTiming, withDelay, Easing, runOnJS,
} from "react-native-reanimated";
import Svg, { Defs, Mask, Rect, G, Polygon } from "react-native-svg";
import { C } from "./theme";

const AnimatedG = Animated.createAnimatedComponent(G);

/* The sixteen-vertex girih star — the same mark ui.jsx draws — as a points
   string centred on (cx,cy) with outer radius r. Inner radius is 0.43 of the
   outer, the ratio the Star component uses. */
function star(cx, cy, r, inner = 0.43) {
  const pts = [];
  for (let i = 0; i < 16; i++) {
    const a = (-90 + i * 22.5) * Math.PI / 180;
    const rad = i % 2 === 0 ? r : r * inner;
    pts.push((cx + rad * Math.cos(a)).toFixed(1) + "," + (cy + rad * Math.sin(a)).toFixed(1));
  }
  return pts.join(" ");
}

/* Short on purpose. This is opened five times a day by people who already know
 * what it is; anything longer stops being a welcome and becomes a toll. */
const HOLD = 300, GROW = 860, MARK = 520, OUT = 280;
const CEILING = HOLD + GROW + OUT + 1100;
const OPEN = Easing.bezier(0.5, 0, 0.15, 1);

export default function Opening() {
  const { width: W, height: H } = useWindowDimensions();
  const cx = W / 2, cy = H / 2;
  /* The star at rest, about an app-icon's worth of the screen. */
  const baseR = Math.max(44, Math.round(Math.min(W, H) * 0.14));
  const corner = Math.sqrt(cx * cx + cy * cy);
  /* The scale at which the star's INNER points clear the far corner, so no plum
     is left in the gaps between the points when it has finished opening. */
  const cover = (corner / (baseR * 0.43)) * 1.12;

  const [gone, setGone] = useState(false);
  const veil = useSharedValue(1);
  const hole = useSharedValue(0.0001);   // ~0 = no hole, plum covers all
  const mark = useSharedValue(0);        // 0 = gold star at rest, 1 = lifted and gone
  const timer = useRef(null);

  useEffect(() => {
    let live = true;
    const finish = () => { if (live) setGone(true); };

    /* Whatever happens above, this takes the veil away. */
    timer.current = setTimeout(finish, CEILING);

    AccessibilityInfo.isReduceMotionEnabled()
      .catch(() => false)
      .then(reduced => {
        if (!live) return;
        if (reduced) {
          /* No movement: the veil simply clears. */
          hole.value = cover; mark.value = 1;
          veil.value = withTiming(0, { duration: 220 }, done => done && runOnJS(finish)());
          return;
        }
        hole.value = withDelay(HOLD, withTiming(cover, { duration: GROW, easing: OPEN }));
        mark.value = withDelay(HOLD - 40, withTiming(1, { duration: MARK, easing: Easing.out(Easing.cubic) }));
        veil.value = withDelay(HOLD + GROW - 120,
          withTiming(0, { duration: OUT, easing: Easing.inOut(Easing.quad) },
                     done => done && runOnJS(finish)()));
      });

    return () => { live = false; clearTimeout(timer.current); };
  }, [cover]);

  const veilStyle = useAnimatedStyle(() => ({ opacity: veil.value }));
  const holeProps = useAnimatedProps(() => ({ scale: hole.value }));
  const markStyle = useAnimatedStyle(() => ({
    opacity: 1 - mark.value,
    transform: [{ scale: 1 + mark.value * 1.9 }],
  }));

  if (gone) return null;

  return (
    <Animated.View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill,
              { zIndex: 50, elevation: Platform.OS === "android" ? 50 : undefined },
              veilStyle]}>
      {/* The plum, with the star cut out of it — the star is the hole the app is
          seen through, and the hole grows until the plum is gone. */}
      <Svg width={W} height={H} style={StyleSheet.absoluteFill}>
        <Defs>
          <Mask id="openHole" maskUnits="userSpaceOnUse" x={0} y={0} width={W} height={H}>
            <Rect x={0} y={0} width={W} height={H} fill="#fff" />
            <AnimatedG originX={cx} originY={cy} animatedProps={holeProps}>
              <Polygon points={star(cx, cy, baseR)} fill="#000" />
            </AnimatedG>
          </Mask>
        </Defs>
        <Rect x={0} y={0} width={W} height={H} fill={C.brand900} mask="url(#openHole)" />
      </Svg>
      {/* The gold star on top, at rest the thing you see; it lifts and fades as
          its own shape opens beneath it. */}
      <Animated.View
        style={[{ position: "absolute", left: cx - baseR, top: cy - baseR, width: baseR * 2, height: baseR * 2 },
                markStyle]}>
        <Svg width={baseR * 2} height={baseR * 2}>
          <Polygon points={star(baseR, baseR, baseR)} fill={C.gold} />
        </Svg>
      </Animated.View>
    </Animated.View>
  );
}
