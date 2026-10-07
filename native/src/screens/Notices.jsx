import React, { useCallback, useEffect, useState } from "react";
import { View, Text, FlatList, RefreshControl, ActivityIndicator, Image } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { C, F, R, SHADOW } from "../theme";
import { LinearGradient } from "expo-linear-gradient";
import { useApp } from "../store";
import { TopBar, Heading } from "../ui";
import { readList } from "../supabase";

/* Notices come from `notices_live`, a function that exposes the notice text and
 * nothing else — no author, no draft, no internal state. The table behind it
 * is deny-all. That is deliberate and it is why reading it with a public key
 * is safe.
 *
 * It was a view until the app had to say which masjid it is for. A view takes
 * no argument; the function does, and returns the same rows newest first. */
export default function Notices() {
  const { t, fs, rtl } = useApp();
  const top = useSafeAreaInsets().top;
  const [rows, setRows] = useState(null);
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setBusy(true);
    try { setRows(await readList("notices_live")); setErr(null); }
    catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  /* Notices is one of the website's seven PAGES: the app bar, then a section
     heading with its rule. The app drew a bare 26px title at the top of the
     list instead, so this was the only tab with no app bar above it. */
  const Header = (
    <>
      <LinearGradient colors={[C.brand900, C.brand800]} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}>
        <TopBar />
      </LinearGradient>
      <View style={{ paddingHorizontal: 16 }}>
        <Heading>{t("notices.notices", "Notices")}</Heading>
      </View>
    </>
  );

  if (rows === null && busy)
    return <View style={{ flex: 1, backgroundColor: C.paper, justifyContent: "center" }}>
             <ActivityIndicator color={C.brand600} /></View>;

  return (
    <FlatList
      style={{ backgroundColor: C.paper }}
      data={rows || []}
      keyExtractor={r => String(r.id)}
      ListHeaderComponent={Header}
      refreshControl={<RefreshControl refreshing={busy} onRefresh={load} tintColor={C.brand600} />}
      contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 28 }}
      ListEmptyComponent={
        /* .nt-empty is a CARD — 16px of radius on the card colour inside a
           hairline with the shared lift, 44/22 of padding, everything centred
           with 12px between. The bell sits in a 56px circle filled plum at 8%
           with a brand-600 glyph. Here it was loose on the paper with a
           bordered circle and a GOLD bell, so the one screen that is empty
           most of the time had nothing on it at all. */
        <View style={[{ alignItems: "center", gap: 12, paddingVertical: 44, paddingHorizontal: 22,
                        borderRadius: 16, backgroundColor: C.card, borderWidth: 1, borderColor: C.line,
                        marginTop: 14 }, SHADOW]}>
          <View style={{ width: 56, height: 56, borderRadius: 28, alignItems: "center",
                         justifyContent: "center", backgroundColor: "rgba(119,33,87,.08)" }}>
            <Ionicons name="notifications-outline" size={27} color={C.brand600} />
          </View>
          <Text style={{ fontFamily: F.display, fontSize: fs(18), color: C.ink, textAlign: "center" }}>
            {err ? t("notices.cant_reach", "Can\u2019t reach the masjid") : t("notices.nothing_just_now", "Nothing just now")}
          </Text>
          <Text style={{ fontFamily: F.sans, fontSize: fs(13.5), color: C.muted,
                         textAlign: "center", lineHeight: fs(22) }}>
            {err
              ? t("notices.offline", "Announcements will appear once you\u2019re back online. Pull down to try again.")
              : t("notices.announcements_will_appear", "Announcements from the masjid will appear here and stay, so a message you miss or swipe away can still be read.")}
          </Text>
          {!err && (
            <Text style={{ fontFamily: F.sans, fontSize: fs(13.5), color: C.muted,
                           textAlign: "center", lineHeight: fs(22) }}>
              {t("notices.turn_on_notifications_in_settings",
                 "You can choose which alerts you receive under Notifications in the menu.")}</Text>)}
        </View>}
      renderItem={({ item }) => (
        /* THE POSTER LEADS. On the website the image is the first thing in the
           card, edge to edge, and the words sit under it in .nt-body. Here the
           topic, the title and the body came first and the poster was pushed
           to the bottom — on an event notice, which is the kind that has one,
           that is the whole point of the notice below the fold.
           The date rides in .nt-when WITH the topic, not alone at the foot. */
        <View style={[{ backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.line,
                        marginTop: 12, overflow: "hidden" }, SHADOW]}>
          {!!item.image_url && (
            <Image source={{ uri: item.image_url }} resizeMode="contain"
                   style={{ width: "100%", aspectRatio: (item.image_w && item.image_h) ? item.image_w / item.image_h : 4 / 3,
                            maxHeight: 420, backgroundColor: "#1B1119" }} />)}
          <View style={{ paddingTop: 14, paddingHorizontal: 15, paddingBottom: 15 }}>
            <View style={{ flexDirection: rtl ? "row-reverse" : "row", alignItems: "center",
                           flexWrap: "wrap", gap: 7 }}>
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
        </View>)}
    />
  );
}
