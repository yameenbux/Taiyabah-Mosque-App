/* The masjid's radio feed.
 *
 * Audio is the one place where native pays off immediately and visibly: the
 * stream keeps playing with the phone locked and when the app is in the
 * background. In the browser it stopped the moment Chrome was backgrounded on
 * some phones, which for a bayaan is the whole point lost.
 *
 * THIS SCREEN NO LONGER OWNS THE SOUND. It used to hold the Audio.Sound in a
 * ref and unload it on unmount, which is correct housekeeping for a screen
 * and wrong for a radio: leaving this page stopped the bayaan, so listening
 * while reading Qurʼan — the thing people actually do with it — was
 * impossible, and the note at the bottom of this very screen promised the
 * opposite in four languages. The player moved up to src/live-audio.jsx,
 * above the navigator, where it outlives every screen including this one.
 *
 * The design is the twin of index.html's #tab-live: a calm plum hero with a
 * faint mihrab arch and girih drawn BEHIND a SOLID medallion — the play button
 * is opaque, so none of the geometry shows through it and the screen stays as
 * clean as the rest of the app. Beneath the hero a sheet rises with the two
 * destinations as rows and the frequency as a quiet caption. The equalizer is
 * the honest live signal: it only moves while the stream is actually playing,
 * in place of a seek bar a live stream cannot have.
 */
import React, { useRef, useEffect } from "react";
import { View, Text, Pressable, ActivityIndicator, PanResponder, Animated, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Svg, { Path, Circle, Rect, G } from "react-native-svg";
import { C, F, R } from "../theme";
import { useApp } from "../store";
import { useLiveAudio } from "../live-audio";
import { LinearGradient } from "expo-linear-gradient";
import { Screen, TopBar, Girih, Card, Press, tap } from "../ui";

/* The chip icons are drawn inline rather than pulled from the Ionicons subset,
   so the same marks the website uses appear here without widening the font. */
const IcRec = ({ c }) => (
  <Svg width={23} height={23} viewBox="0 0 24 24" fill="none">
    <Circle cx={12} cy={12} r={9} stroke={c} strokeWidth={1.8} />
    <Path d="M10 9l5 3-5 3z" fill={c} />
  </Svg>);
const IcVid = ({ c }) => (
  <Svg width={23} height={23} viewBox="0 0 24 24" fill="none">
    <G stroke={c} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Rect x={3} y={6} width={13} height={12} rx={2} />
      <Path d="M16 10l5-3v10l-5-3z" />
    </G>
  </Svg>);
const IcMast = ({ c }) => (
  <Svg width={17} height={17} viewBox="0 0 24 24" fill="none">
    <G stroke={c} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 7.5V21" /><Path d="M8.6 21h6.8" />
      <Path d="M12 7.5 7 21" /><Path d="M12 7.5 17 21" />
      <Path d="M9.6 14.5h4.8" /><Path d="M8.6 17.7h6.8" />
      <Path d="M8.8 6.2a4.5 4.5 0 0 1 6.4 0" /><Path d="M6.5 4a7.8 7.8 0 0 1 11 0" />
    </G>
  </Svg>);
const Chev = ({ c, flip }) => (
  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none"
       style={flip ? { transform: [{ scaleX: -1 }] } : undefined}>
    <Path d="M9 6l6 6-6 6" stroke={c} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>);

/* The waveform scrubber of a live stream is a lie — there is nothing to scrub.
   These bars rise and fall only while the stream plays, and sit flat otherwise,
   which is the one honest thing a live indicator can be. */
function Eq({ playing }) {
  const n = 12;
  const vals = useRef(Array.from({ length: n }, () => new Animated.Value(5))).current;
  useEffect(() => {
    if (!playing) {
      vals.forEach(v => v.stopAnimation());
      Animated.parallel(vals.map(v =>
        Animated.timing(v, { toValue: 6, duration: 180, useNativeDriver: false }))).start();
      return;
    }
    const loops = vals.map((v, i) => Animated.loop(Animated.sequence([
      Animated.timing(v, { toValue: 19, duration: 360 + (i % 4) * 70, delay: i * 45, useNativeDriver: false }),
      Animated.timing(v, { toValue: 6, duration: 360 + (i % 4) * 70, useNativeDriver: false }),
    ])));
    loops.forEach(l => l.start());
    return () => loops.forEach(l => l.stop());
  }, [playing, vals]);
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-end", justifyContent: "center",
                   height: 22, marginTop: 16, gap: 3 }}>
      {vals.map((v, i) => (
        <Animated.View key={i} style={{ width: 3, height: v, borderRadius: 2, backgroundColor: C.gold }} />
      ))}
    </View>);
}

export default function Live({ navigation }) {
  const { t, fs, rtl } = useApp();
  const { state, vol, setVolume, toggle: playPause } = useLiveAudio();
  const barW = useRef(1);
  const setFrom = x => setVolume(x / (barW.current || 1));
  const pan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: e => setFrom(e.nativeEvent.locationX),
    onPanResponderMove: e => setFrom(e.nativeEvent.locationX),
  })).current;

  const toggle = () => { tap(); playPause(); };
  const playing = state === "playing";
  const loading = state === "loading";
  const label = playing ? t("live.on_air", "On air")
              : loading ? t("live.connecting", "Connecting…")
              : state === "error" ? t("live.not_broadcasting", "Not broadcasting")
              : t("about.ready", "Ready");

  const chip = { width: 46, height: 46, borderRadius: 14, alignItems: "center",
                 justifyContent: "center", backgroundColor: "rgba(198,162,76,.16)" };
  const chev = { width: 30, height: 30, borderRadius: 15, alignItems: "center",
                 justifyContent: "center", backgroundColor: "rgba(198,162,76,.14)" };
  const kStyle = { fontFamily: F.sans, fontSize: fs(11.5), letterSpacing: 0.8,
                   textTransform: "uppercase", color: C.muted };

  const row = (icon, k, v, go, top) => (
    <Press onPress={() => { tap(); navigation.navigate(go); }} dim={false}
      style={{ flexDirection: rtl ? "row-reverse" : "row", alignItems: "center", gap: 14,
               paddingVertical: 16, paddingHorizontal: 16,
               borderTopWidth: top ? 1 : 0, borderTopColor: C.line }}>
      <View style={chip}>{icon}</View>
      <View style={{ flex: 1 }}>
        <Text style={[kStyle, rtl && { textAlign: "right" }]}>{k}</Text>
        <Text style={{ fontFamily: F.sansSemi, fontSize: fs(17), color: C.plumFill,
                       textAlign: rtl ? "right" : "left" }}>{v}</Text>
      </View>
      <View style={chev}><Chev c={C.gold} flip={rtl} /></View>
    </Press>);

  return (
    <Screen pad={false} topColor={C.brand900}>
      <LinearGradient colors={[C.brand900, C.brand800]} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}>
        <TopBar back navigation={navigation} />
      </LinearGradient>

      {/* The hero band. */}
      <LinearGradient colors={[C.brand800, C.brand900]} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
        style={{ paddingTop: 18, paddingHorizontal: 20, paddingBottom: 34,
                 alignItems: "center", overflow: "hidden" }}>

        {/* The status pill is quiet until the stream is on air: an outline with a
            neutral dot for Ready/paused, going solid gold only while playing, so
            it never reads as "live" when it is not. */}
        <View style={{ zIndex: 3, flexDirection: "row", alignItems: "center", gap: 7,
                       borderRadius: R.pill, paddingHorizontal: 13, paddingVertical: 5, marginBottom: 12,
                       borderWidth: 1, borderColor: playing ? "transparent" : "rgba(255,255,255,.18)",
                       backgroundColor: playing ? C.goldBright : "rgba(20,3,12,.5)" }}>
          <View style={{ width: 6, height: 6, borderRadius: 3,
                         backgroundColor: playing ? C.danger : loading ? C.gold
                                        : state === "error" ? C.danger : C.muted }} />
          <Text style={{ fontFamily: F.sansBold, fontSize: fs(10), letterSpacing: 1.8,
                         textTransform: "uppercase", color: playing ? C.brand900 : C.cream }}>{label}</Text>
        </View>

        {/* The medallion, with the app's own girih star centred dead behind it in
            the app's own gold — the exact palette, framing the play button
            symmetrically. The play surface is opaque, so nothing shows through. */}
        <View style={{ zIndex: 2, width: 132, height: 132, alignItems: "center", justifyContent: "center" }}>
          <Girih size={300} color={C.gold} opacity={0.1} style={{ position: "absolute", left: -84, top: -84 }} />
          <Pressable onPress={toggle}
            accessibilityRole="button" accessibilityState={{ busy: loading }}
            accessibilityLabel={playing ? t("a11y.pause_live_stream", "Pause live stream")
                                         : t("a11y.play_live_stream", "Play live stream")}
            style={{ width: 132, height: 132, borderRadius: 66, alignItems: "center",
                     justifyContent: "center", borderWidth: 1.5, borderColor: "rgba(198,162,76,.55)",
                     shadowColor: C.gold, shadowOpacity: 0.22, shadowRadius: 28,
                     shadowOffset: { width: 0, height: 0 }, elevation: 8 }}>
            <LinearGradient colors={[C.brand700, C.brand900]} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }}
              style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, borderRadius: 66 }} />
            {loading
              ? <ActivityIndicator color={C.goldBright} />
              : <Ionicons name={playing ? "pause" : "play"} size={42} color={C.goldBright}
                          style={{ marginLeft: playing ? 0 : 5 }} />}
          </Pressable>
        </View>

        <Text style={{ fontFamily: F.display, fontSize: fs(28), color: C.cream, marginTop: 26,
                       textAlign: "center" }}>
          {t("about.live_from_the_masjid", "Live from the masjid")}</Text>

        <Eq playing={playing} />

        <View style={{ flexDirection: rtl ? "row-reverse" : "row", alignItems: "center", gap: 11,
                       width: "100%", maxWidth: 230, marginTop: 20 }}>
          <Ionicons name={vol === 0 ? "volume-mute-outline" : "volume-medium-outline"}
                    size={18} color="#BBA9B4" />
          <View style={{ flex: 1, height: 24, justifyContent: "center" }}
                onLayout={e => (barW.current = e.nativeEvent.layout.width)}
                {...pan.panHandlers}>
            <View style={{ height: 4, borderRadius: 2, backgroundColor: "#4B3542" }}>
              <View style={{ position: "absolute", left: 0, top: 0, bottom: 0,
                             width: `${vol * 100}%`, borderRadius: 2, backgroundColor: C.gold }} />
            </View>
            <View pointerEvents="none"
                  style={{ position: "absolute", left: `${vol * 100}%`, marginLeft: -8,
                           width: 16, height: 16, borderRadius: 8, backgroundColor: C.gold }} />
          </View>
        </View>
      </LinearGradient>

      {/* The sheet rises over the hero with the two destinations and the
          frequency as a quiet caption. */}
      <View style={{ backgroundColor: C.paper, borderTopLeftRadius: 26, borderTopRightRadius: 26,
                     marginTop: -14, paddingHorizontal: 16, paddingTop: 18, paddingBottom: 14 }}>
        <View style={{ width: 38, height: 4, borderRadius: 2, backgroundColor: C.line,
                       alignSelf: "center", marginBottom: 14 }} />
        <Card pad={0} style={{ overflow: "hidden" }}>
          {row(<IcRec c={C.goldInk} />, t("rec.previous", "Previous recordings"), t("rec.listen", "Listen"), "Recordings", false)}
          {row(<IcVid c={C.goldInk} />, t("about.videos_bayaans", "Videos & bayaans"), t("about.watch", "Watch"), "Videos", true)}
        </Card>
        <View style={{ flexDirection: rtl ? "row-reverse" : "row", alignItems: "center",
                       justifyContent: "center", gap: 8, marginTop: 14 }}>
          <IcMast c={C.gold} />
          <Text style={{ fontFamily: F.sansSemi, fontSize: fs(13), color: C.muted }}>
            {t("about.radio_frequency", "Radio frequency")}</Text>
          <Text style={{ fontFamily: F.sansSemi, fontSize: fs(13), color: C.ink }}>
            {t("about.454_1000_mhz", "454.1000 MHz")}</Text>
        </View>
        {/* Credit: the live stream and recordings are served by eMasjid Live. The
            logo sits on a light chip so it reads on the sheet in either theme. */}
        <View style={{ alignItems: "center", marginTop: 20, marginBottom: 24 }}>
          <View style={{ backgroundColor: "#FFFFFF", borderRadius: 13, paddingVertical: 9, paddingHorizontal: 15,
                         borderWidth: 1, borderColor: C.line }}>
            <Image source={require("../../assets/emasjid-live.png")}
                   accessibilityLabel={t("about.powered_by_emasjid", "Powered by eMasjid Live")}
                   style={{ width: 150, height: 50, resizeMode: "contain" }} />
          </View>
        </View>
      </View>
    </Screen>
  );
}
