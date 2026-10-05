/* The logo settling, once, when the app is opened.
 *
 * The web app's version of this was blurry and it jumped, for a reason that
 * does not apply here: it scaled TEXT with a CSS transform while the brand
 * fonts were still arriving, so the glyphs were rasterised at one size and
 * stretched to another, mid-reflow. This scales a bitmap that is drawn at 3×
 * and shown at 1×, and scales it DOWN into place rather than up, so every
 * frame is sampled from more pixels than it needs. The transform runs on the
 * UI thread, so it cannot be made to stutter by anything JavaScript is doing.
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
 *      reload mid-animation — a timer takes it away regardless. The animation
 *      is allowed to fail; it is not allowed to persist.
 *
 * And it asks the phone whether its owner wants movement at all. Somebody who
 * has turned animation off system-wide has usually done it because motion makes
 * them ill, and a masjid app is not the place to overrule that.
 */
import React, { useEffect, useRef, useState } from "react";
import { View, Image, AccessibilityInfo, Platform } from "react-native";
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, withDelay, Easing, runOnJS,
} from "react-native-reanimated";
import { C } from "./theme";

/* Short on purpose. This is opened five times a day by people who already know
 * what it is; anything longer stops being a welcome and becomes a toll. */
const RISE = 460, HOLD = 140, FADE = 300;
const CEILING = RISE + HOLD + FADE + 900;

export default function Opening() {
  const [gone, setGone] = useState(false);
  const veil = useSharedValue(1);
  const mark = useSharedValue(0);
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
          mark.value = 1;
          veil.value = withTiming(0, { duration: 220 }, done => done && runOnJS(finish)());
          return;
        }
        /* 1.06 down to 1, not 0.9 up to 1: a bitmap enlarged past its own
         * resolution is the blur the web version had. */
        mark.value = withTiming(1, { duration: RISE, easing: Easing.out(Easing.cubic) });
        veil.value = withDelay(RISE + HOLD,
          withTiming(0, { duration: FADE, easing: Easing.inOut(Easing.quad) },
                     done => done && runOnJS(finish)()));
      });

    return () => { live = false; clearTimeout(timer.current); };
  }, []);

  const veilStyle = useAnimatedStyle(() => ({ opacity: veil.value }));
  const markStyle = useAnimatedStyle(() => ({
    opacity: mark.value,
    transform: [{ scale: 1.06 - 0.06 * mark.value }],
  }));

  if (gone) return null;

  return (
    <Animated.View
      pointerEvents="none"
      style={[{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0,
                backgroundColor: C.brand900, alignItems: "center", justifyContent: "center",
                zIndex: 50, elevation: Platform.OS === "android" ? 50 : undefined },
              veilStyle]}>
      <Animated.View style={markStyle}>
        <Image source={require("../assets/logo.png")}
               /* 3× the drawn size, so it is sampled down at every frame. */
               style={{ width: 160, height: 114, resizeMode: "contain" }} />
      </Animated.View>
    </Animated.View>
  );
}
