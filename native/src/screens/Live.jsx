/* The masjid's radio feed.
 *
 * Audio is the one place where native pays off immediately and visibly: the
 * stream keeps playing with the phone locked, and the lock screen gets proper
 * controls. In the browser it stopped the moment Chrome was backgrounded on
 * some phones, which for a bayaan is the whole point lost.
 */
import React, { useEffect, useRef, useState } from "react";
import { View, Text, Pressable, ActivityIndicator, Dimensions } from "react-native";
import { Audio } from "expo-av";
import { Ionicons } from "@expo/vector-icons";
import { C, F, R } from "../theme";
import { useApp } from "../store";
import { Screen, Hero, Girih, Note, RowGroup, KV, NavRow, tap } from "../ui";

const LIVE_URL = "https://taiyabahmbolton.radioca.st/;";

export default function Live({ navigation }) {
  const { t, fs } = useApp();
  const sound = useRef(null);
  const [state, setState] = useState("idle");   // idle | loading | playing | error

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
      const { sound: s } = await Audio.Sound.createAsync({ uri: LIVE_URL }, { shouldPlay: true });
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
      {/* The player fills the screen the way a radio app does, rather than
          sitting in a band at the top with nothing under it. */}
      <Hero tall minHeight={Dimensions.get("window").height * 0.58} lines={[]}>
        <View style={{ alignItems: "center", gap: 14 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 7,
                         borderWidth: 1, borderColor: "rgba(243,239,227,.22)", borderRadius: R.pill,
                         paddingHorizontal: 12, paddingVertical: 5 }}>
            <View style={{ width: 7, height: 7, borderRadius: 4,
                           backgroundColor: state === "playing" ? C.onAir
                                          : state === "error" ? C.danger : "rgba(243,239,227,.5)" }} />
            <Text style={{ fontFamily: F.sansMedium, fontSize: fs(11.5), color: "#D8C8D2" }}>{label}</Text>
          </View>

          <Pressable onPress={toggle}
            style={({ pressed }) => ({ width: 112, height: 112, borderRadius: 56, alignItems: "center",
                                       justifyContent: "center", backgroundColor: C.goldBright,
                                       transform: [{ scale: pressed ? 0.95 : 1 }] })}>
            {state === "loading"
              ? <ActivityIndicator color={C.brand900} />
              : <Ionicons name={state === "playing" ? "pause" : "play"} size={44} color={C.brand900}
                          style={{ marginLeft: state === "playing" ? 0 : 5 }} />}
          </Pressable>

          <View style={{ alignItems: "center" }}>
            <Text style={{ fontFamily: F.display, fontSize: fs(20), color: C.cream }}>
              {t("about.taiyabah_masjid", "Taiyabah Masjid")}</Text>
            <Text style={{ fontFamily: F.sans, fontSize: fs(12.5), color: "#BBA9B4", marginTop: 3 }}>
              {t("about.live_from_the_masjid", "Live from the masjid")}</Text>
          </View>
        </View>
      </Hero>

      <View style={{ paddingHorizontal: 16 }}>
        <RowGroup>
          <KV k={t("about.radio_frequency", "Radio frequency")}
              v={t("about.454_1000_mhz", "454.1000 MHz")} />
          <NavRow icon="play-circle-outline" label={t("about.videos_bayaans", "Videos & bayaans")}
                  sub={t("about.watch", "Watch ›")}
                  onPress={() => navigation.navigate("Videos")} />
        </RowGroup>
        <View style={{ marginTop: 12 }}>
          <Note>{t("about.audio_keeps_playing_while_you",
            "Audio keeps playing while you use the rest of the app or other apps. If the stream doesn't start, the masjid may not be broadcasting at the moment.")}</Note>
        </View>
      </View>
    </Screen>
  );
}
