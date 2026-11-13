/* The poster card, and the red ground behind a swipe.
 * Copyright (c) 2026 Yameen Bux. All rights reserved. See LICENSE.md.
 *
 * Shared, because the same card is now drawn on two screens. The Notices tab
 * split in two: Events (the calendar and the posters) and Notifications (what
 * the masjid has sent that is not an event). Before the split the bell and
 * the tab both opened the same screen, so there was only ever one caller and
 * this lived inside it.
 */
import React from "react";
import { View, Text, Image, useWindowDimensions } from "react-native";
import { C, F, SHADOW } from "./theme";
import { useApp } from "./store";

/* The red ground that appears behind a swiped card. */
export function ClearAction({ label, left }) {
  const { fs } = useApp();
  return (
    <View style={{ flex: 1, backgroundColor: C.danger, marginTop: 12, marginHorizontal: 16,
                   borderRadius: 16, alignItems: left ? "flex-start" : "flex-end",
                   justifyContent: "center", paddingHorizontal: 24 }}>
      <Text style={{ fontFamily: F.sansBold, fontSize: fs(13.5), color: "#FFF" }}>{label}</Text>
    </View>
  );
}

export function NoticeCard({ item, isNew, onClear }) {
  const { t, fs, rtl } = useApp();
  /* THE POSTER BOX IS FULL WIDTH AND THE POSTER SITS IN THE MIDDLE OF IT.
   *
   * The website says it in one line:
   *
   *   .nt-shot img { width:100%; max-height:46vh; object-fit:contain;
   *                  background:#1B1119 }
   *
   * In CSS, max-height caps the BOX and object-fit centres the picture inside
   * it, so a tall poster shows the dark ground either side. That is what the
   * #1B1119 is for.
   *
   * The first translation of that into React Native was
   * `width: "100%", aspectRatio: w/h, maxHeight: 420` — which does something
   * else entirely. Yoga treats aspectRatio as a constraint on the BOX, not on
   * the picture: when maxHeight bites, it re-derives the WIDTH from the capped
   * height to keep the ratio. So a portrait poster on a 408dp card came out as
   * a 300dp-wide box with 108dp of card showing beside it, hard against the
   * left edge, and the dark ground could never appear because the box was
   * always exactly the picture's shape. CSS max-height does not do this.
   *
   * So the height is worked out here instead and the box keeps its full width.
   * 46vh rather than a flat 420 because that is the website's own figure and
   * it is what makes a tablet give the poster more room. */
  const { width: winW, height: winH } = useWindowDimensions();
  const ratio = (item.image_w && item.image_h) ? item.image_w / item.image_h : 4 / 3;
  //  The card is inset 16 each side (marginHorizontal below).
  const shotHeight = Math.min((winW - 32) / ratio, winH * 0.46);
  return (
        /* THE POSTER LEADS. On the website the image is the first thing in the
           card, edge to edge, and the words sit under it in .nt-body. Here the
           topic, the title and the body came first and the poster was pushed
           to the bottom — on an event notice, which is the kind that has one,
           that is the whole point of the notice below the fold.
           The date rides in .nt-when WITH the topic, not alone at the foot. */
        <View
          /* The swipe published as a real action, so a screen reader or a
             switch control can reach it. Without this the only way to clear
             one notice is a gesture those readers cannot make. */
          accessibilityActions={[{ name: "clear", label: t("notices.clear", "Clear") }]}
          onAccessibilityAction={e => { if (e.nativeEvent.actionName === "clear") onClear(); }}
          style={[{ backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.line,
                        marginTop: 12, marginHorizontal: 16, overflow: "hidden" }, SHADOW]}>
          {!!item.image_url && (
            <Image source={{ uri: item.image_url }} resizeMode="contain"
                   style={{ width: "100%", height: shotHeight,
                            backgroundColor: "#1B1119" }} />)}
          <View style={{ paddingTop: 14, paddingHorizontal: 15, paddingBottom: 15 }}>
            <View style={{ flexDirection: rtl ? "row-reverse" : "row", alignItems: "center",
                           flexWrap: "wrap", gap: 7 }}>
              {/* .nt-new — danger-filled pill, white text, FIRST in the row,
                  as the website sets it. It says "since you last looked",
                  which is the only thing the dot on the bell means either. */}
              {isNew && (
                <Text style={{ fontFamily: F.sansBold, fontSize: fs(11), letterSpacing: 0.77,
                               textTransform: "uppercase", color: "#FFF", overflow: "hidden",
                               backgroundColor: C.danger, borderRadius: 999,
                               paddingHorizontal: 8, paddingVertical: 2 }}>
                  {t("notices.new", "New")}</Text>)}
              {!!item.topic && (
                /* .nt-topic — a small 3px-radius chip filled plum at 9% with
                   bold brand-600 text, not gold lettering on nothing. */
                <Text style={{ fontFamily: F.sansBold, fontSize: fs(11), letterSpacing: 0.77,
                               textTransform: "uppercase", color: C.brand600, overflow: "hidden",
                               backgroundColor: "rgba(119,33,87,.09)", borderRadius: 3,
                               paddingHorizontal: 7, paddingVertical: 2 }}>
                  {String(item.topic)}</Text>)}
              <Text style={{ fontFamily: F.sans, fontSize: fs(11), letterSpacing: 0.77,
                             textTransform: "uppercase", color: C.muted }}>
                {new Date(item.event_at || item.created_at).toLocaleDateString("en-GB",
                  { weekday: "short", day: "numeric", month: "long" })}</Text>
            </View>
            <Text style={{ fontFamily: F.display, fontSize: fs(17), lineHeight: fs(21), color: C.ink,
                           marginTop: 7, marginBottom: 5, textAlign: rtl ? "right" : "left" }}>
              {item.title}</Text>
            {/* .nt-card p is MUTED, not ink. */}
            {!!item.body && (
              <Text style={{ fontFamily: F.sans, fontSize: fs(13.5), lineHeight: fs(22), color: C.muted,
                             textAlign: rtl ? "right" : "left" }}>{item.body}</Text>)}
          </View>
        </View>);
}
