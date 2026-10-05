import React, { useCallback, useEffect, useState } from "react";
import { View, Text, FlatList, RefreshControl, ActivityIndicator, Image } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { C, F, R } from "../theme";
import { useApp } from "../store";
import { readView } from "../supabase";

/* Notices come from `notices_live`, a view that exposes the notice text and
 * nothing else — no author, no draft, no internal state. The table behind it
 * is deny-all. That is deliberate and it is why reading it with a public key
 * is safe. */
export default function Notices() {
  const { t, fs } = useApp();
  const top = useSafeAreaInsets().top;
  const [rows, setRows] = useState(null);
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setBusy(true);
    try { setRows(await readView("notices_live", { order: "created_at.desc", limit: "50" })); setErr(null); }
    catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const Header = (
    <View style={{ paddingTop: top + 16, paddingHorizontal: 18, paddingBottom: 10 }}>
      <Text style={{ fontFamily: F.display, fontSize: fs(26), color: C.ink }}>{t("notices.notices", "Notices")}</Text>
    </View>
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
        <View style={{ alignItems: "center", paddingTop: 40, paddingHorizontal: 30 }}>
          <View style={{ width: 62, height: 62, borderRadius: 31, backgroundColor: C.card,
                         borderWidth: 1, borderColor: C.line, alignItems: "center", justifyContent: "center" }}>
            <Ionicons name="notifications-outline" size={26} color={C.gold} />
          </View>
          <Text style={{ fontFamily: F.display, fontSize: fs(19), color: C.ink, marginTop: 16 }}>
            {err ? t("notices.cant_reach", "Can\u2019t reach the masjid") : t("notices.nothing_just_now", "Nothing just now")}
          </Text>
          <Text style={{ fontFamily: F.sans, fontSize: fs(13), color: C.muted, marginTop: 8,
                         textAlign: "center", lineHeight: fs(21) }}>
            {err
              ? t("notices.offline", "Announcements will appear once you\u2019re back online. Pull down to try again.")
              : t("notices.announcements_will_appear", "Announcements from the masjid will appear here and stay, so a message you miss or swipe away can still be read.")}
          </Text>
          {!err && (
            <Text style={{ fontFamily: F.sans, fontSize: fs(12.5), color: C.muted, marginTop: 10,
                           textAlign: "center", lineHeight: fs(20) }}>
              {t("notices.turn_on_notifications_in_settings",
                 "You can choose which alerts you receive under Notifications in the menu.")}</Text>)}
        </View>}
      renderItem={({ item }) => (
        <View style={{ backgroundColor: C.card, borderRadius: R.card, borderWidth: 1, borderColor: C.line,
                       padding: 15, marginTop: 12, overflow: "hidden" }}>
          {!!item.topic && (
            <Text style={{ fontFamily: F.sansMedium, fontSize: fs(10), letterSpacing: 1.3,
                           color: C.gold, marginBottom: 6 }}>
              {String(item.topic).toUpperCase()}
            </Text>)}
          <Text style={{ fontFamily: F.display, fontSize: fs(17), color: C.ink }}>{item.title}</Text>
          {!!item.body && (
            <Text style={{ fontFamily: F.sans, fontSize: fs(14), color: C.ink, marginTop: 7, lineHeight: fs(22) }}>
              {item.body}
            </Text>)}
          {!!item.image_url && (
            <Image source={{ uri: item.image_url }}
                   style={{ width: "100%", aspectRatio: (item.image_w && item.image_h) ? item.image_w / item.image_h : 4 / 3,
                            borderRadius: 12, marginTop: 11, backgroundColor: C.paper }} />)}
          <Text style={{ fontFamily: F.sans, fontSize: fs(12), color: C.muted, marginTop: 9 }}>
            {new Date(item.event_at || item.created_at).toLocaleDateString("en-GB",
              { weekday: "short", day: "numeric", month: "long" })}
          </Text>
        </View>)}
    />
  );
}
