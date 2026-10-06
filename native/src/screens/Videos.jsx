/* Bayaans and the new-build films.
 *
 * Playback hands off to YouTube rather than embedding a player: the app does not
 * have to carry a WebView, the viewer gets the controls and the quality
 * settings they already know, and nobody is watching a 480p iframe in a box.
 */
import React from "react";
import { View, Text, Image, Pressable } from "react-native";
import { C, F, SHADOW } from "../theme";
import { useApp } from "../store";
import { Screen, PanelLink, open } from "../ui";

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
  const { t, fs, rtl } = useApp();
  return (
    <Screen pad={false}>
      {/* No hero on the website: the sheet header carries the title and the
          list starts immediately. A plum band here said "Videos & bayaans"
          directly under a bar already saying it. */}
      {/* .vd-list is a column of 10px-spaced ROWS: a 112px-wide thumbnail with
          9px of radius on the left, the title and its label stacked beside it,
          the whole thing an 8px-padded card at 14px of radius. This was a
          stack of full-width posters with a 48px plum play button over each
          one and the text underneath — three videos to a screen instead of
          six, and a layout the website never shows anywhere. */}
      <View style={{ paddingHorizontal: 16, paddingTop: 16, gap: 10 }}>
        {VIDEOS.map(v => (
          <Pressable key={v.id} onPress={() => open(`https://www.youtube.com/watch?v=${v.id}`)}
            style={({ pressed }) => [{ flexDirection: rtl ? "row-reverse" : "row", alignItems: "center",
                                       gap: 12, padding: 8, borderRadius: 14, borderWidth: 1,
                                       borderColor: C.line, backgroundColor: C.card,
                                       opacity: pressed ? 0.92 : 1 }, SHADOW]}>
            <View style={{ width: 112, aspectRatio: 16 / 9, borderRadius: 9, overflow: "hidden",
                           backgroundColor: C.brand900, alignItems: "center", justifyContent: "center" }}>
              <Image source={{ uri: `https://i.ytimg.com/vi/${v.id}/mqdefault.jpg` }}
                     style={{ position: "absolute", left: 0, top: 0, right: 0, bottom: 0 }} />
              {/* .vd-thumb::after — a bare 11px white triangle with a drop
                  shadow under it, centred on the thumbnail. */}
              <View style={{ width: 0, height: 0, borderLeftWidth: 11, borderTopWidth: 7, borderBottomWidth: 7,
                             borderLeftColor: "rgba(255,255,255,.92)", borderTopColor: "transparent",
                             borderBottomColor: "transparent", marginLeft: 3,
                             shadowColor: "#000", shadowOpacity: 0.6, shadowRadius: 3,
                             shadowOffset: { width: 0, height: 1 } }} />
            </View>
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={{ fontFamily: F.sansSemi, fontSize: fs(13.5), lineHeight: fs(18.5), color: C.ink,
                             textAlign: rtl ? "right" : "left" }}>
                {t(`video.${v.id}.t`, v.t)}</Text>
              <Text style={{ fontFamily: F.sans, fontSize: fs(11), letterSpacing: 0.66,
                             textTransform: "uppercase", color: C.muted,
                             textAlign: rtl ? "right" : "left" }}>
                {t(`video.${v.id}.d`, v.d)}</Text>
            </View>
          </Pressable>))}

        <PanelLink label={t("vids.see_the_full_channel_on", "See the full channel on YouTube ›")} href={CHANNEL} />
      </View>
    </Screen>
  );
}
