import React from "react";
import { View, Text, ScrollView, Pressable, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { C, F, fs, R } from "../theme";

/* The menu. In the web app this was a drawer that slid over the page; here it
 * is a screen of its own and every row PUSHES, so the platform gives it the
 * slide and the swipe-back for free. That gesture is one of the things a
 * webview could never do, and it is most of why this will feel different. */
const GROUPS = [
  { title: "RECITE", rows: [
    { key: "Quran",    icon: "book-outline",        label: "Holy Qurʼan",      note: "604 pages, IndoPak" },
    { key: "Athkar",   icon: "sunny-outline",       label: "Daily Adhkār",     note: "Morning, evening, after ṣalāh" },
    { key: "Duas",     icon: "heart-outline",       label: "Everyday duʿās" },
    { key: "Rabbanas", icon: "sparkles-outline",    label: "40 Rabbanā duʿās" },
    { key: "Bukhari",  icon: "library-outline",     label: "Ṣaḥīḥ al-Bukhārī" },
  ]},
  { title: "THE MASJID", rows: [
    { key: "About",    icon: "information-circle-outline", label: "About us" },
    { key: "Contact",  icon: "call-outline",        label: "Contact us" },
    { key: "Timetable",icon: "calendar-outline",    label: "Full prayer timetable" },
  ]},
  { title: "SETTINGS", rows: [
    { key: "Prefs",    icon: "options-outline",     label: "Display & language" },
    { key: "Alerts",   icon: "notifications-outline", label: "Notifications" },
  ]},
];

function Row({ row, first, last, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      /* A real pressed state. The web app had a :hover that stuck after a tap,
         which is one of the most recognisable browser tells there is. */
      style={({ pressed }) => ({
        flexDirection: "row", alignItems: "center", gap: 13,
        paddingVertical: 14, paddingHorizontal: 15,
        backgroundColor: pressed ? "rgba(119,33,87,.07)" : C.card,
        borderTopLeftRadius: first ? R.card : 0, borderTopRightRadius: first ? R.card : 0,
        borderBottomLeftRadius: last ? R.card : 0, borderBottomRightRadius: last ? R.card : 0,
        borderBottomWidth: last ? 0 : 1, borderBottomColor: C.line,
      })}>
      <Ionicons name={row.icon} size={20} color={C.brand600} />
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: F.sansMedium, fontSize: fs(15), color: C.ink }}>{row.label}</Text>
        {!!row.note && (
          <Text style={{ fontFamily: F.sans, fontSize: fs(12), color: C.muted, marginTop: 2 }}>{row.note}</Text>)}
      </View>
      <Ionicons name="chevron-forward" size={17} color={C.muted} />
    </Pressable>
  );
}

export default function More({ navigation }) {
  const top = useSafeAreaInsets().top;
  const go = key => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate(key);
  };
  return (
    <ScrollView style={{ backgroundColor: C.paper }}
                contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 28, paddingTop: top + 14 }}>
      <Text style={{ fontFamily: F.display, fontSize: fs(26), color: C.ink, marginBottom: 4 }}>More</Text>
      {GROUPS.map(g => (
        <View key={g.title} style={{ marginTop: 22 }}>
          <Text style={{ fontFamily: F.sansMedium, fontSize: fs(10), letterSpacing: 1.5,
                         color: C.muted, marginBottom: 9, marginLeft: 3 }}>{g.title}</Text>
          <View style={{ borderRadius: R.card, borderWidth: 1, borderColor: C.line, overflow: "hidden" }}>
            {g.rows.map((r, i) => (
              <Row key={r.key} row={r} first={i === 0} last={i === g.rows.length - 1} onPress={() => go(r.key)} />
            ))}
          </View>
        </View>))}
      <Text style={{ fontFamily: F.sans, fontSize: fs(11), color: C.muted, textAlign: "center", marginTop: 26 }}>
        Bolton Central Islamic Society · Registered charity 1041569
      </Text>
    </ScrollView>
  );
}
