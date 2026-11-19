/* The app opening, once, when it is launched from cold.
 *
 * The plum splash holds the gold girih star — the app-icon motif — over the
 * wordmark, and then the STAR OPENS: the app is revealed THROUGH its shape, the
 * way the X app's glyph opens into the feed.
 *
 * HOW IT OPENS, and why it is built this way. The plum, with a star-shaped hole
 * cut out of it, is a STATIC react-native-svg mask — nothing animates inside the
 * SVG. The whole masked plum then SCALES UP as an ordinary view transform, about
 * the star's centre, until the hole is bigger than the screen and the plum is
 * gone. Animating the view (which iOS composites on the GPU) rather than the
 * mask's own geometry is the difference between it working on a device and not:
 * a Reanimated value driving a prop inside the <Mask> does not re-rasterise the
 * mask, so the hole never grew — this scales the rendered result instead.
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
 *      reload mid-animation — a timer takes it away regardless. And the veil
 *      fades out on its own opacity at the end, so even if the scale never ran
 *      the splash still clears to the app rather than sticking. The animation
 *      is allowed to fail; it is not allowed to persist.
 *
 * And it asks the phone whether its owner wants movement at all. Somebody who
 * has turned animation off system-wide has usually done it because motion makes
 * them ill: Reduce Motion gets the plain quick fade, with no zoom.
 */
import React, { useEffect, useRef, useState } from "react";
import { View, Image, AccessibilityInfo, Platform, useWindowDimensions, StyleSheet } from "react-native";
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, withDelay, Easing, runOnJS,
} from "react-native-reanimated";
import Svg, { Defs, Mask, Rect, Polygon } from "react-native-svg";
import { C } from "./theme";

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
const HOLD = 300, GROW = 900, MARK = 520, OUT = 300;
const CEILING = HOLD + GROW + OUT + 1100;
const OPEN = Easing.bezier(0.5, 0, 0.15, 1);

export default function Opening() {
  const { width: W, height: H } = useWindowDimensions();
  const cx = W / 2, cy = H / 2;
  /* The star at rest — a crest above the wordmark, about half its width, so it
     reads as part of the mark rather than sat on top of it. */
  const baseR = Math.max(30, Math.round(Math.min(W, H) * 0.092));
  /* The star and the wordmark are centred AS A GROUP, so the star sits a little
     above the middle (sy) and the logo below it, the pair balanced on the
     centre. The hole and the gold star share that centre. */
  const GAP = 16, LOGO_W = 150, LOGO_H = 106;
  const sy = cy - (GAP + LOGO_H) / 2;

  /* The plum overlay is a square centred on the star, big enough to cover the
     screen at rest; scaling it up grows the hole about the star's centre. */
  const half = Math.max(cx, sy, H - sy) + 24;
  const SIZE = half * 2;
  const mid = SIZE / 2;
  /* The scale at which the star's INNER points clear the far corner from the
     star's centre, so no plum is left in the gaps once it has opened. */
  const corner = Math.sqrt(cx * cx + Math.pow(Math.max(sy, H - sy), 2));
  const cover = (corner / (baseR * 0.43)) * 1.12;

  const [gone, setGone] = useState(false);
  const veil = useSharedValue(1);
  const hole = useSharedValue(1);   // 1 = star at rest; grows to `cover`
  const mark = useSharedValue(0);   // 0 = gold star at rest, 1 = lifted and gone
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
        veil.value = withDelay(HOLD + GROW - 140,
          withTiming(0, { duration: OUT, easing: Easing.inOut(Easing.quad) },
                     done => done && runOnJS(finish)()));
      });

    return () => { live = false; clearTimeout(timer.current); };
  }, [cover]);

  const veilStyle = useAnimatedStyle(() => ({ opacity: veil.value }));
  const holeStyle = useAnimatedStyle(() => ({ transform: [{ scale: hole.value }] }));
  const markStyle = useAnimatedStyle(() => ({
    opacity: 1 - mark.value,
    transform: [{ scale: 1 + mark.value * 0.18 }],
  }));

  if (gone) return null;

  return (
    <Animated.View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill,
              { overflow: "hidden", zIndex: 50, elevation: Platform.OS === "android" ? 50 : undefined },
              veilStyle]}>
      {/* The plum, with the star cut out of it, as a STATIC mask. Centred on the
          star and scaled up as one view (holeStyle) so the hole grows about the
          star until the plum is pushed off the screen. */}
      <Animated.View pointerEvents="none"
        style={[{ position: "absolute", left: cx - mid, top: sy - mid, width: SIZE, height: SIZE }, holeStyle]}>
        <Svg width={SIZE} height={SIZE}>
          <Defs>
            <Mask id="openHole" maskUnits="userSpaceOnUse" x={0} y={0} width={SIZE} height={SIZE}>
              <Rect x={0} y={0} width={SIZE} height={SIZE} fill="#fff" />
              <Polygon points={star(mid, mid, baseR)} fill="#000" />
            </Mask>
          </Defs>
          <Rect x={0} y={0} width={SIZE} height={SIZE} fill={C.brand900} mask="url(#openHole)" />
        </Svg>
      </Animated.View>
      {/* On top: the gold star, and the wordmark under it — the mark the app has
          always opened on, kept. Both lift and fade as the star's own shape
          opens beneath them. The wordmark is the logo bitmap, not live text, so
          nothing waits on a font at cold start. */}
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, markStyle]}>
        <View style={{ position: "absolute", left: cx - baseR, top: sy - baseR, width: baseR * 2, height: baseR * 2 }}>
          <Svg width={baseR * 2} height={baseR * 2}>
            <Polygon points={star(baseR, baseR, baseR)} fill={C.gold} />
          </Svg>
        </View>
        <Image source={require("../assets/logo.png")}
               style={{ position: "absolute", left: cx - LOGO_W / 2, top: sy + baseR + GAP,
                        width: LOGO_W, height: LOGO_H, resizeMode: "contain" }} />
      </Animated.View>
    </Animated.View>
  );
}
