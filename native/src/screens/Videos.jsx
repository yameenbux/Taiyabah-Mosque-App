/* Bayaans and the new-build films.
 *
 * Playback hands off to YouTube rather than embedding a player: the app does not
 * have to carry a WebView, the viewer gets the controls and the quality
 * settings they already know, and nobody is watching a 480p iframe in a box.
 */
import React from "react";
import { View, Text, Image, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { C, F, R } from "../theme";
import { useApp } from "../store";
import { Screen, Hero, NavRow, RowGroup, open } from "../ui";

const VIDEOS = [
  { id: "gC7H_60vPFU", t: "New Build Update 2026",                        d: "New build" },
  { id: "N7wFXynmLHM", t: "Taiyabah Masjid — our story",                  d: "History" },
  { id: "hnrxkmeSmHs", t: "Qari Rashid Musa — message for the new build",  d: "Message" },
  { id: "3t3ut3FZp2A", t: "Syed Aziz ur Rehman Shah at Taiyabah Masjid",   d: "Bayaan" },
  { id: "mjNi1DoEyR8", t: "Construction update — December 2018",           d: "New build" },
  { id: "m8Z3KJUTR0c", t: "Fundraiser — mixed grill platter",              d: "Fundraiser" },
];
const CHANNEL = "https://www.youtube.com/channel/UCIJm0mh5SFn1-esTJpdazSw/videos";

export default function Videos() {
  const { t, fs } = useApp();
  return (
    <Screen pad={false}>
      <Hero lines={[{ t: t("vids.videos_bayaans", "Videos & bayaans"), w: "title" }]} />
      <View style={{ paddingHorizontal: 16, paddingTop: 16, gap: 12 }}>
        {VIDEOS.map(v => (
          <Pressable key={v.id} onPress={() => open(`https://www.youtube.com/watch?v=${v.id}`)}
            style={({ pressed }) => ({ borderRadius: R.card, overflow: "hidden", borderWidth: 1,
                                       borderColor: C.line, backgroundColor: C.card,
                                       opacity: pressed ? 0.9 : 1,
                                       transform: [{ scale: pressed ? 0.99 : 1 }] })}>
            <View>
              <Image source={{ uri: `https://i.ytimg.com/vi/${v.id}/mqdefault.jpg` }}
                     style={{ width: "100%", aspectRatio: 16 / 9, backgroundColor: "#1A0A14" }} />
              <View style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0,
                             alignItems: "center", justifyContent: "center" }}>
                <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: "rgba(60,11,42,.74)",
                               alignItems: "center", justifyContent: "center" }}>
                  <Ionicons name="play" size={22} color={C.cream} style={{ marginLeft: 3 }} />
                </View>
              </View>
            </View>
            <View style={{ padding: 13 }}>
              <Text style={{ fontFamily: F.sansMedium, fontSize: fs(14.5), color: C.ink }}>
                {t(`video.${v.id}.t`, v.t)}</Text>
              <Text style={{ fontFamily: F.sans, fontSize: fs(12), color: C.muted, marginTop: 3 }}>
                {t(`video.${v.id}.d`, v.d)}</Text>
            </View>
          </Pressable>))}

        <RowGroup>
          <NavRow icon="logo-youtube" label={t("vids.see_the_full_channel_on", "See the full channel on YouTube")}
                  onPress={() => open(CHANNEL)} />
        </RowGroup>
      </View>
    </Screen>
  );
}
