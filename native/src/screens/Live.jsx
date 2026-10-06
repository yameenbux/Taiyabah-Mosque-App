/* The masjid's radio feed.
 *
 * Audio is the one place where native pays off immediately and visibly: the
 * stream keeps playing with the phone locked, and the lock screen gets proper
 * controls. In the browser it stopped the moment Chrome was backgrounded on
 * some phones, which for a bayaan is the whole point lost.
 */
import React, { useEffect, useRef, useState } from "react";
import { View, Text, Pressable, ActivityIndicator, PanResponder } from "react-native";
import { Audio } from "expo-av";
import { Ionicons } from "@expo/vector-icons";
import { C, F, R } from "../theme";
import { useApp } from "../store";
import { LinearGradient } from "expo-linear-gradient";
import { Screen, TopBar, Girih, Card, Note, Press, tap } from "../ui";

const LIVE_URL = "https://taiyabahmbolton.radioca.st/;";

export default function Live({ navigation }) {
  const { t, fs, rtl } = useApp();
  const sound = useRef(null);
  const [state, setState] = useState("idle");   // idle | loading | playing | error
  const [vol, setVol] = useState(1);
  const barW = useRef(1);
  /* A slider drawn here rather than pulled in as a dependency: it is a track,
     a fill and a knob, and the only thing it has to get right is where the
     finger is along the bar. */
  const setFrom = x => {
    const v = Math.max(0, Math.min(1, x / (barW.current || 1)));
    setVol(v);
    sound.current?.setVolumeAsync?.(v).catch(() => {});
  };
  const pan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: e => setFrom(e.nativeEvent.locationX),
    onPanResponderMove: (e, g) => setFrom(e.nativeEvent.locationX),
  })).current;

  useEffect(() => {
    /* Keep playing when the screen locks or the app goes to the background —
     * the setting that makes this feel like a radio rather than a web page. */
    Audio.setAudioModeAsync({ staysActiveInBackground: true, playsInSilentModeIOS: true,
                              shouldDuckAndroid: true }).catch(() => {});
    return () => { sound.current?.unloadAsync().catch(() => {}); };
  }, []);

  const toggle = async () => {
    tap();
    if (state === "playing") { await sound.current?.pauseAsync().catch(() => {}); setState("idle"); return; }
    setState("loading");
    try {
      if (sound.current) { await sound.current.playAsync(); setState("playing"); return; }
      /* Opened at whatever the slider is already set to, so a level chosen
         before pressing play is the level it plays at. */
      const { sound: s } = await Audio.Sound.createAsync({ uri: LIVE_URL },
                                                        { shouldPlay: true, volume: vol });
      sound.current = s;
      s.setOnPlaybackStatusUpdate(st => {
        if (st.isPlaying) setState("playing");
        else if (st.didJustFinish) setState("idle");
      });
      setState("playing");
    } catch { setState("error"); }
  };

  const label = state === "playing" ? t("live.on_air", "On air")
              : state === "loading" ? t("live.connecting", "Connecting…")
              : state === "error"   ? t("live.not_broadcasting", "Not broadcasting")
              : t("about.ready", "Ready");

  return (
    <Screen pad={false}>
      {/* Live is one of the website's seven PAGES, so the app bar goes above
          it and .lv-hero is a BAND — 30/20/28 of padding, not a player filling
          58% of the screen with nothing under it. */}
      <LinearGradient colors={[C.brand900, C.brand800]} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}>
        <TopBar navigation={navigation} />
      </LinearGradient>
      <LinearGradient colors={[C.brand800, C.brand900]} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
        style={{ paddingTop: 30, paddingHorizontal: 20, paddingBottom: 28,
                 alignItems: "center", overflow: "hidden" }}>
        <Girih style={{ right: -48, top: -42 }} size={210} opacity={0.09} />

        {/* .lv-state — 11px UPPERCASE with .14em of tracking. It read as
            sentence case here, so a status chip looked like a word. */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8,
                       borderWidth: 1, borderRadius: R.pill, paddingHorizontal: 12, paddingVertical: 5,
                       borderColor: state === "playing" ? "rgba(198,162,76,.45)"
                                  : state === "error" ? "rgba(232,168,143,.4)" : "rgba(255,255,255,.14)" }}>
          <View style={{ width: 7, height: 7, borderRadius: 3.5,
                         backgroundColor: state === "playing" ? C.onAir
                                        : state === "loading" ? C.gold
                                        : state === "error" ? "#E0483C" : "#A49AA0" }} />
          <Text style={{ fontFamily: F.sans, fontSize: fs(11), letterSpacing: 1.54,
                         textTransform: "uppercase",
                         color: state === "playing" ? C.goldBright
                              : state === "error" ? "#E8A88F" : "#BBA9B4" }}>{label}</Text>
        </View>

        {/* .lv-play — 96px, a 16% GOLD fill inside a 50% gold hairline with a
            gold-bright glyph. It was a 112px solid gold disc with a dark
            triangle on it, which is the only solid gold circle in the app and
            read as a warning light rather than a play button. */}
        <Pressable onPress={toggle}
          style={({ pressed }) => ({ width: 96, height: 96, borderRadius: 48, marginTop: 22, marginBottom: 16,
                                     alignItems: "center", justifyContent: "center", borderWidth: 1,
                                     borderColor: "rgba(198,162,76,.5)",
                                     backgroundColor: pressed ? "rgba(198,162,76,.3)" : "rgba(198,162,76,.16)" })}>
          {state === "loading"
            ? <ActivityIndicator color={C.goldBright} />
            : <Ionicons name={state === "playing" ? "pause" : "play"} size={38} color={C.goldBright}
                        style={{ marginLeft: state === "playing" ? 0 : 4 }} />}
        </Pressable>

        <Text style={{ fontFamily: F.display, fontSize: fs(21), color: C.cream }}>
          {t("about.taiyabah_masjid", "Taiyabah Masjid")}</Text>
        <Text style={{ fontFamily: F.sans, fontSize: fs(12.5), color: "#BBA9B4", marginTop: 3 }}>
          {t("about.live_from_the_masjid", "Live from the masjid")}</Text>

        {/* .lv-vol — a speaker glyph and a 4px gold track with a 16px gold
            knob, 230px wide and centred, 20px under the title. The phone's own
            buttons set the ringer and the media volume together; this sets the
            stream's own level, which is what the website's does, and it was
            the one control on this page the app did not draw. */}
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

      <View style={{ paddingHorizontal: 16 }}>
        {/* .lv-info — two rows, each a label left and a value right, 13px of
            padding with a hairline between. "Videos & bayaans" is one of them,
            its value the word "Watch ›" in plum. It was a nav row with an icon
            chip and a chevron, which made two rows of the same table into two
            different kinds of thing. */}
        <Card pad={0} style={{ paddingHorizontal: 15 }}>
          {[[t("about.radio_frequency", "Radio frequency"), t("about.454_1000_mhz", "454.1000 MHz"), null],
            [t("about.videos_bayaans", "Videos & bayaans"), t("about.watch", "Watch ›"),
             () => navigation.navigate("Videos")]].map(([k, v, go], i) => (
            <Press key={i} onPress={go} disabled={!go}
              style={{ flexDirection: rtl ? "row-reverse" : "row", alignItems: "center",
                       justifyContent: "space-between", paddingVertical: 13,
                       borderTopWidth: i ? 1 : 0, borderTopColor: C.line }}>
              <Text style={{ fontFamily: F.sans, fontSize: fs(11.5), letterSpacing: 1.15,
                             textTransform: "uppercase", color: C.muted }}>{k}</Text>
              <Text style={{ fontFamily: F.sansMedium, fontSize: fs(14.5),
                             color: go ? C.brand600 : C.ink }}>{v}</Text>
            </Press>))}
        </Card>
        <View style={{ marginTop: 12 }}>
          <Note center>{t("about.audio_keeps_playing_while_you",
            "Audio keeps playing while you use the rest of the app or other apps. If the stream doesn't start, the masjid may not be broadcasting at the moment.")}</Note>
        </View>
      </View>
    </Screen>
  );
}
