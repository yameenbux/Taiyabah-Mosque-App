import React, { useCallback, useEffect, useState } from "react";
import { View, Text, FlatList, RefreshControl, ActivityIndicator, Pressable } from "react-native";
import ReanimatedSwipeable from "react-native-gesture-handler/ReanimatedSwipeable";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { C, F, R, SHADOW } from "../theme";
import { LinearGradient } from "expo-linear-gradient";
import { useApp } from "../store";
import { TopBar, Heading } from "../ui";
import { useTopBar } from "../barstyle";
import { readList } from "../supabase";
import { publishNoticeIds, pruneCleared } from "../notices-state";
import { NoticeCard, ClearAction } from "../notice-card";
import { split } from "../events";

/* NOTIFICATIONS — what the masjid has SAID, as opposed to what it has ON.
 *
 * This screen is where the bell goes. Until now the bell opened NoticesTab,
 * which is the Notices tab, so the app had two doors onto one room: whatever
 * you pressed, you got the same list. The list has split along `topic`, the
 * field the masjid already sets and the notification switches already name.
 * Anything tagged 'events' belongs on the Events tab with the calendar; a
 * janāzah, an announcement, a Kahf reminder belongs here.
 *
 * A JANĀZAH MUST NOT END UP ON A CALENDAR. It is the one notice whose whole
 * value is being seen today, and burying it behind a month grid would be the
 * most harmful thing this change could do. events.js keeps it here and
 * events.test.mjs asserts it.
 *
 * Rows come from `notices_live`, which exposes the notice text and nothing
 * else — no author, no draft, no internal state. The table behind it is
 * deny-all, which is why reading it with a public key is safe. */
/* The quiet pill the toolbar is made of — card fill, hairline, muted text.
   Housekeeping, not an invitation. */
function Tool({ label, onPress }) {
  const { fs } = useApp();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label}
      hitSlop={6}
      style={({ pressed }) => ({ borderRadius: 999, borderWidth: 1, borderColor: C.line,
                                 backgroundColor: pressed ? C.paper : C.card,
                                 paddingHorizontal: 13, paddingVertical: 6 })}>
      <Text style={{ fontFamily: F.sans, fontSize: fs(12), color: C.muted }}>{label}</Text>
    </Pressable>
  );
}

export default function Notifications() {
  const bar = useTopBar();
  const { t, fs, rtl, ntSeen, ntCleared, markNoticesSeen, clearNotice,
          clearAllNotices, restoreNotices, pruneClearedNotices } = useApp();
  const top = useSafeAreaInsets().top;
  const [rows, setRows] = useState(null);
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);
  /* Worked out ONCE, when the screen opens, and not again as the reader
     scrolls. Marking them read is the next thing that happens, so recomputing
     would make every pill vanish the moment it was drawn — the website makes
     the same point in ntEnterTab. */
  const [newIds, setNewIds] = useState([]);

  const load = useCallback(async () => {
    setBusy(true);
    try { setRows(await readList("notices_live")); setErr(null); }
    catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  /* Events are the other tab's business. Everything else is this one's. */
  const mine = split(rows || []).notifications;
  const liveIds = mine.map(r => r.id).filter(Boolean);

  /* Opening the screen: show which are new, then mark them read. */
  useEffect(() => {
    if (!rows) return;
    publishNoticeIds(mine);                       // the bell reads the same list
    const seen = Array.isArray(ntSeen) ? ntSeen : null;
    /* A phone that has just installed the app has not MISSED what was already
       there. Baseline silently on the first load. */
    if (seen === null) { markNoticesSeen(liveIds); setNewIds([]); return; }
    const fresh = liveIds.filter(id => !seen.includes(id));
    if (fresh.length) setNewIds(prev => prev.length ? prev : fresh);
    markNoticesSeen(liveIds);
    const kept = pruneCleared(ntCleared, liveIds);
    if (kept !== ntCleared) pruneClearedNotices(kept);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows]);

  const cleared = ntCleared || [];
  const shown = mine.filter(r => !cleared.includes(r.id));
  const hiddenCount = mine.length - shown.length;

  /* Notices is one of the website's seven PAGES: the app bar, then a section
     heading with its rule. The app drew a bare 26px title at the top of the
     list instead, so this was the only tab with no app bar above it. */
  const Header = (
    <>
      <LinearGradient onLayout={bar.onLayout} colors={[C.brand900, C.brand800]} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}>
        <TopBar back />
      </LinearGradient>
      <View style={{ paddingHorizontal: 16 }}>
        <Heading>{t("notices.notifications", "Notifications")}</Heading>
        {/* Clearing is LOCAL. A notice belongs to the masjid and every reader
            sees the same list, so nothing here deletes anything — it hides it
            on this phone, and Show cleared brings it straight back. That is
            also why nothing asks "are you sure": there is nothing to lose. */}
        {!!mine.length && (
          <View style={{ flexDirection: rtl ? "row-reverse" : "row", justifyContent: "flex-end",
                         gap: 8, marginBottom: 2 }}>
            {!!shown.length && (
              <Tool label={t("notices.clear_all", "Clear all")}
                    onPress={() => clearAllNotices(liveIds)} />)}
            {!!hiddenCount && (
              <Tool label={`${t("notices.show_cleared", "Show cleared")} (${hiddenCount})`}
                    onPress={restoreNotices} />)}
          </View>)}
      </View>
    </>
  );

  if (rows === null && busy)
    return <View style={{ flex: 1, backgroundColor: C.paper, justifyContent: "center" }}>
             <ActivityIndicator color={C.brand600} /></View>;

  return (
    <FlatList
      style={{ backgroundColor: C.paper }}
      onScroll={bar.onScroll} scrollEventThrottle={bar.scrollEventThrottle}
      data={shown}
      keyExtractor={r => String(r.id)}
      ListHeaderComponent={Header}
      refreshControl={<RefreshControl refreshing={busy} onRefresh={load} tintColor={C.brand600} />}
      /* NO HORIZONTAL PADDING HERE. A contentContainerStyle applies to every
         child of the list INCLUDING ListHeaderComponent, and this header holds
         the plum app bar. Padding it inset the bar 16px on each side and let
         the cream list background show down both edges — a white stripe beside
         the bar on the one tab that is otherwise identical to the website's
         page. The padding belongs on the things inside the list, and the
         header already pads its own heading, which is why that heading was
         sitting 32px in rather than 16. */
      contentContainerStyle={{ paddingBottom: 28 }}
      ListEmptyComponent={hiddenCount ? (
        <Text style={{ fontFamily: F.sans, fontSize: fs(13), color: C.muted, textAlign: "center",
                       lineHeight: fs(21), marginTop: 18, marginHorizontal: 32 }}>
          {t("notices.all_cleared",
             "You have cleared every notice on this device. They are still here \u2014 press Show cleared.")}
        </Text>) :
        /* .nt-empty is a CARD — 16px of radius on the card colour inside a
           hairline with the shared lift, 44/22 of padding, everything centred
           with 12px between. The bell sits in a 56px circle filled plum at 8%
           with a brand-600 glyph. Here it was loose on the paper with a
           bordered circle and a GOLD bell, so the one screen that is empty
           most of the time had nothing on it at all. */
        <View style={[{ alignItems: "center", gap: 12, paddingVertical: 44, paddingHorizontal: 22,
                        marginHorizontal: 16,
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
        /* SWIPE TO CLEAR, which is the gesture both platforms already teach
           for a list like this, so nothing has to be explained.
           A swipe is invisible to a screen reader and impossible with a
           switch control, so the same action is published as an
           accessibilityAction — VoiceOver and TalkBack offer "Clear" in the
           rotor. Clear all in the header is the third way in. */
        <ReanimatedSwipeable
          friction={2} rightThreshold={44} leftThreshold={44}
          onSwipeableOpen={() => clearNotice(item.id, liveIds)}
          renderRightActions={() => <ClearAction label={t("notices.clear", "Clear")} />}
          renderLeftActions={() => <ClearAction label={t("notices.clear", "Clear")} left />}>
          <NoticeCard item={item} isNew={newIds.includes(item.id)}
                      onClear={() => clearNotice(item.id, liveIds)} />
        </ReanimatedSwipeable>)}
    />
  );
}

