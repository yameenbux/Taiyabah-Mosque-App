/**
 * Which colour the clock, battery and signal are drawn in.
 *
 * WHY THIS EXISTS. The app used to paint a plum band the height of the status
 * bar across the top of every screen, because Android 15 forces the system bars
 * transparent and draws the app underneath them: scroll a cream screen up and
 * the clock, still being drawn light, vanishes against #F5F1E8. The band put
 * the colour back.
 *
 * It solved that and introduced something worse. A band is fixed; the plum
 * header beneath it is not. Scroll any screen and the header leaves while the
 * band stays, so the top of the app ends in a hard edge of colour with nothing
 * above it — which is exactly what nobody wants a phone app to look like.
 *
 * So there is no band. Content runs under the status bar as it should, and the
 * bar's own contents change colour instead: light while the plum header is
 * still up there, dark once cream has arrived. That is both seamless and
 * legible, and it fixes Android as well, because a dark icon on cream is the
 * answer the platform was asking for in the first place.
 *
 * HOW A SCREEN USES IT. Two props, and the screen does not have to know its own
 * measurements:
 *
 *     const bar = useTopBar();
 *     <LinearGradient onLayout={bar.onLayout}> <TopBar/> </LinearGradient>
 *     <ScrollView onScroll={bar.onScroll} scrollEventThrottle={16}>
 *
 * The header reports its own height, so the switch happens exactly as the last
 * of the plum passes under the status bar rather than at a guessed offset. A
 * screen with no plum header calls useDarkTopBar() instead and is simply dark
 * throughout.
 */
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useIsFocused } from "@react-navigation/native";

const Ctx = createContext(null);

export function BarStyleProvider({ children }) {
  const [style, setStyle] = useState("light");
  /* Set rather than toggled, and a no-op when it already matches: this is
   * called on every scroll frame, and re-rendering the whole app sixty times a
   * second to set a value to what it already is would cost more than the band
   * ever did. */
  const set = useCallback(next => setStyle(prev => (prev === next ? prev : next)), []);
  return <Ctx.Provider value={{ style, set }}>{children}</Ctx.Provider>;
}

export function useBarStyle() {
  return useContext(Ctx) || { style: "light", set: () => {} };
}

/* A screen whose top is a plum header that scrolls away. */
export function useTopBar() {
  const { set } = useBarStyle();
  const insets = useSafeAreaInsets();
  const focused = useIsFocused();
  const height = useRef(0);
  const last = useRef("light");

  const apply = useCallback(y => {
    /* The plum is gone once the header's bottom edge passes under the status
     * bar, not once the screen moves at all — otherwise the clock turns dark
     * while there is still plum behind it. */
    const gone = height.current > 0 && y >= height.current - insets.top;
    const want = gone ? "dark" : "light";
    if (want !== last.current) { last.current = want; set(want); }
  }, [insets.top, set]);

  const onLayout = useCallback(e => { height.current = e.nativeEvent.layout.height; }, []);
  const onScroll = useCallback(e => apply(e.nativeEvent.contentOffset.y), [apply]);

  /* A tab keeps its scroll position while another is on screen, so coming back
   * to it has to restore the style that position implies rather than assuming
   * the top.
   *
   * And on the way out it must hand back light. Every screen this one can push
   * to — the qibla, the live page, the notification settings, all 28 sheets —
   * opens on a plum header pinned at the top. Leaving a scrolled tab without
   * resetting would carry its dark clock onto plum, where it cannot be read at
   * all. The screen being pushed to does not have to know this screen existed. */
  useEffect(() => {
    if (!focused) return undefined;
    set(last.current);
    return () => set("light");
  }, [focused, set]);

  return { onLayout, onScroll, scrollEventThrottle: 16 };
}

/* A screen that is cream from its first pixel. */
export function useDarkTopBar() {
  const { set } = useBarStyle();
  const focused = useIsFocused();
  useEffect(() => { if (focused) set("dark"); }, [focused, set]);
}
