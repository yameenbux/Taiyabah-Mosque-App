/* The home screen. One job above all others: tell somebody when the next
 * jamāʿah is, before they have to look for it. Everything else here is
 * secondary to that number, and the tiles below it are the four or five things
 * people actually come back for.
 */
import React, { useEffect, useState } from "react";
import { View, Text, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { C, F, R } from "../theme";
import { useApp } from "../store";
import { Screen, Girih, Card, Note, RowGroup, NavRow, Press, Pill, open, tap } from "../ui";
import { dayFor, nextJamaah, countdown, pretty, NAMES, ORDER } from "../prayer";

const TILES = [
  { to: "Quran",     icon: "book",             k: "home.holy_quran",      t: "Holy Qurʼan" },
  { to: "Athkar",    icon: "sunny",            k: "home.daily_adhkar",    t: "Daily Adhkār" },
  { to: "Qibla",     icon: "compass",          k: "sheet.qibla",          t: "Qibla" },
  { to: "Live",      icon: "radio",            k: "home.listen_live",     t: "Listen live" },
  { to: "Madrasah",  icon: "school",           k: "menu.madrasah",        t: "Madrasah" },
  { to: "Marriage",  icon: "heart",            k: "home.nikah_services",  t: "Nikāḥ Services" },
  { to: "Funeral",   icon: "flower",           k: "home.funeral_services",t: "Funeral Services" },
  { to: "HallHire",  icon: "business",         k: "home.hall_booking",    t: "Hall Booking" },
  { to: "Zakat",     icon: "calculator",       k: "menu.zakat_calculator",t: "Zakat calculator" },
  { to: "Giving",    icon: "gift",             k: "home.sadaqah_lillah",  t: "Sadaqah & Lillah" },
  { to: "Bukhari",   icon: "library",          k: "home.sahih_al_bukhari",t: "Ṣaḥīḥ al-Bukhārī" },
  { to: "Collect",   icon: "people",           k: "home.charity_collections", t: "Charity Collections" },
];

export default function Home({ navigation }) {
  const { t, fs } = useApp();
  const top = useSafeAreaInsets().top;
  const [now, setNow] = useState(new Date());

  /* Tick on the half minute rather than the second: the only thing that changes
   * is the countdown, and a per-second timer is a battery cost for nothing. */
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(id);
  }, []);

  const day = dayFor(now);
  const next = nextJamaah(now);
  const friday = now.getDay() === 5;

  /* How far through the wait we are. Measured from when this prayer BEGAN, not
   * from an arbitrary window — the bar then means something: how much of the gap
   * between adhān and jamāʿah is gone. */
  const gap = (() => {
    if (!next) return 0;
    const [bh, bm] = next.begins.split(":").map(Number);
    const [jh, jm] = next.at.split(":").map(Number);
    const total = (jh * 60 + jm) - (bh * 60 + bm);
    return total > 0 ? Math.max(0, Math.min(1, 1 - next.minutesAway / total)) : 0;
  })();

  return (
    <Screen pad={false}>
      <LinearGradient colors={[C.brand900, C.brand800, C.brand700]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={{ paddingTop: top + 12, paddingHorizontal: 18, paddingBottom: 24, overflow: "hidden" }}>
        <Girih style={{ right: -74, top: -18 }} size={250} />

        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <View>
            {["BOLTON CENTRAL", "ISLAMIC SOCIETY"].map(l => (
              <Text key={l} style={{ fontFamily: F.sansMedium, fontSize: fs(10), letterSpacing: 1.7,
                                     color: C.cream }}>{l}</Text>))}
          </View>
          <Press onPress={() => navigation.navigate("Alerts")}
            style={{ width: 40, height: 40, borderRadius: 20, borderWidth: 1,
                     borderColor: "rgba(243,239,227,.25)", alignItems: "center", justifyContent: "center" }}>
            <Ionicons name="notifications-outline" size={19} color={C.goldBright} />
          </Press>
        </View>

        <Text style={{ fontFamily: F.arabic, fontSize: fs(24), lineHeight: fs(44), color: C.goldBright,
                       marginTop: 16, writingDirection: "rtl", textAlign: "left" }}>
          السَّلَامُ عَلَيْكُم
        </Text>

        <View style={{ alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 7,
                       borderWidth: 1, borderColor: "rgba(243,239,227,.18)", borderRadius: R.pill,
                       paddingHorizontal: 12, paddingVertical: 6, marginTop: 6 }}>
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: C.goldBright }} />
          <Text style={{ fontFamily: F.sans, fontSize: fs(12), color: "#D0BFCA" }}>
            {now.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}
            {day ? ` · ${day.hijri}` : ""}
          </Text>
        </View>

        {next ? (
          <>
            <Text style={{ fontFamily: F.sansMedium, fontSize: fs(11), letterSpacing: 1.5,
                           color: C.goldBright, marginTop: 22 }}>
              {t("home.next_jamaah", "NEXT JAMĀʿAH").toUpperCase()}</Text>
            <View style={{ flexDirection: "row", alignItems: "baseline", gap: 10, marginTop: 2 }}>
              <Text style={{ fontFamily: F.display, fontSize: fs(29), color: C.cream }}>
                {t(`prayer.${next.key}`, NAMES[next.key].en)}</Text>
              <Text style={{ fontFamily: F.arabic, fontSize: fs(22), color: C.cream }}>{NAMES[next.key].ar}</Text>
            </View>
            <Text style={{ fontFamily: F.sansMedium, fontSize: fs(50), color: "#fff", marginTop: 2 }}>
              {pretty(next.at)}</Text>

            <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginTop: 10, flexWrap: "wrap" }}>
              <View style={{ borderWidth: 1, borderColor: "rgba(220,187,99,.45)", borderRadius: R.pill,
                             paddingHorizontal: 13, paddingVertical: 6 }}>
                <Text style={{ fontFamily: F.sansMedium, fontSize: fs(13), color: C.goldBright }}>
                  {countdown(next.minutesAway)}</Text>
              </View>
              <Text style={{ fontFamily: F.sans, fontSize: fs(13), color: "#D0BFCA" }}>
                {t("home.beginning_time", "Beginning time")}{" "}
                <Text style={{ fontFamily: F.sansMedium, color: "#fff" }}>{pretty(next.begins)}</Text>
                {next.tomorrow ? ` · ${t("times.tomorrow", "tomorrow")}` : ""}
              </Text>
            </View>

            <View style={{ height: 4, borderRadius: 2, backgroundColor: "rgba(255,255,255,.14)", marginTop: 16 }}>
              <View style={{ height: 4, borderRadius: 2, width: `${gap * 100}%`, backgroundColor: C.goldBright }} />
            </View>
          </>
        ) : (
          <Text style={{ fontFamily: F.sans, fontSize: fs(14), color: "#D0BFCA", marginTop: 20 }}>
            {t("times.off_timetable", "That date is outside the published timetable.")}</Text>
        )}
      </LinearGradient>

      <View style={{ paddingHorizontal: 16, paddingTop: 18 }}>
        {/* Friday. The hadith, and the one gift people most often come looking
            for a way to give. */}
        {friday && day?.jummah && (
          <Press onPress={() => navigation.navigate("Giving")}
            style={{ borderRadius: R.card, overflow: "hidden", borderWidth: 1, borderColor: "rgba(198,162,76,.35)",
                     backgroundColor: "rgba(198,162,76,.10)", padding: 15, gap: 7 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Pill tone="gold">{t("sheet.friday", "Friday")}</Pill>
              <Text style={{ fontFamily: F.sansMedium, fontSize: fs(13), color: C.goldInk }}>
                {t("sheet.jummah", "Jumuʿah")} {pretty(day.jummah.first)}
                {day.jummah.second ? ` · ${pretty(day.jummah.second)}` : ""}</Text>
            </View>
            <Text style={{ fontFamily: F.arabic, fontSize: fs(15), lineHeight: fs(26), color: "#5E4A12" }}>
              {t("home.the_best_day_on_which",
                "“The best day on which the sun has risen is Friday.” — Ṣaḥīḥ Muslim 854")}</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
              <Text style={{ fontFamily: F.sansMedium, fontSize: fs(13), color: C.brand600 }}>
                {t("home.give_this_jumuah", "Give this Jumuʿah")}</Text>
              <Ionicons name="chevron-forward" size={14} color={C.brand600} />
            </View>
          </Press>)}

        {/* Today's five, at a glance. */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: friday && day?.jummah ? 20 : 0 }}>
          <Text style={{ fontFamily: F.display, fontSize: fs(19), color: C.ink }}>{t("sheet.today", "Today")}</Text>
          <View style={{ flex: 1, height: 1, backgroundColor: C.line }} />
          <Press onPress={() => navigation.navigate("Timetable")}
            style={{ flexDirection: "row", alignItems: "center", gap: 3, paddingVertical: 4, paddingHorizontal: 2 }}>
            <Text style={{ fontFamily: F.sansMedium, fontSize: fs(12), color: C.brand600 }}>
              {t("sheet.full_timetable", "Full timetable")}</Text>
            <Ionicons name="chevron-forward" size={13} color={C.brand600} />
          </Press>
        </View>

        {!!day && (
          <View style={{ flexDirection: "row", backgroundColor: C.card, borderRadius: R.card, borderWidth: 1,
                         borderColor: C.line, marginTop: 12, overflow: "hidden" }}>
            {ORDER.map((k, i) => {
              const isNext = next && k === next.key && !next.tomorrow;
              return (
                <View key={k} style={{ flex: 1, alignItems: "center", paddingVertical: 13,
                                       borderLeftWidth: i ? 1 : 0, borderLeftColor: C.line,
                                       backgroundColor: isNext ? "rgba(198,162,76,.10)" : "transparent" }}>
                  <Ionicons name={k === "isha" ? "moon-outline" : "sunny-outline"} size={15} color={C.gold} />
                  <Text style={{ fontFamily: F.sans, fontSize: fs(10.5), color: C.muted, marginTop: 5 }}>
                    {t(`prayer.${k}`, NAMES[k].en)}</Text>
                  <Text style={{ fontFamily: F.sansMedium, fontSize: fs(14), color: C.ink, marginTop: 3 }}>
                    {pretty(day.begins[k]).replace(/ (am|pm)$/, "")}</Text>
                  <View style={{ backgroundColor: "rgba(119,33,87,.09)", borderRadius: R.pill,
                                 paddingHorizontal: 7, paddingVertical: 2, marginTop: 5 }}>
                    <Text style={{ fontFamily: F.sansMedium, fontSize: fs(10.5), color: C.brand600 }}>
                      {pretty(day.jamaat[k]).replace(/ (am|pm)$/, "")}</Text>
                  </View>
                </View>);
            })}
          </View>)}

        {/* The new build appeal — the masjid's own priority, so it gets a band of
            its own rather than a tile among twelve. */}
        <Press onPress={() => navigation.navigate("NewBuild")} style={{ marginTop: 20, borderRadius: R.card, overflow: "hidden" }}>
          <LinearGradient colors={[C.brand700, C.brand900]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={{ padding: 16, flexDirection: "row", alignItems: "center", gap: 13 }}>
            <View style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: "rgba(220,187,99,.18)",
                           alignItems: "center", justifyContent: "center" }}>
              <Ionicons name="hammer-outline" size={21} color={C.goldBright} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: F.display, fontSize: fs(16), color: C.cream }}>
                {t("sheet.support_the_new_taiyabah", "Support the new Taiyabah Masjid")}</Text>
              <Text style={{ fontFamily: F.sans, fontSize: fs(12), color: "rgba(243,239,227,.7)", marginTop: 2 }}>
                {t("sheet.current_appeal", "Current appeal · Phase 3.3")}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={C.goldBright} />
          </LinearGradient>
        </Press>

        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: 24 }}>
          <Text style={{ fontFamily: F.display, fontSize: fs(19), color: C.ink }}>
            {t("home.services", "Services")}</Text>
          <View style={{ flex: 1, height: 1, backgroundColor: C.line }} />
        </View>

        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 12 }}>
          {TILES.map(x => (
            <Pressable key={x.to} onPress={() => { tap(); navigation.navigate(x.to); }}
              style={({ pressed }) => ({ flexBasis: "30.5%", flexGrow: 1, alignItems: "center", gap: 7,
                                         backgroundColor: C.card, borderWidth: 1, borderColor: C.line,
                                         borderRadius: R.tile, paddingVertical: 15, paddingHorizontal: 7,
                                         transform: [{ scale: pressed ? 0.97 : 1 }],
                                         opacity: pressed ? 0.9 : 1 })}>
              <View style={{ width: 38, height: 38, borderRadius: 13, backgroundColor: "rgba(119,33,87,.07)",
                             alignItems: "center", justifyContent: "center" }}>
                <Ionicons name={`${x.icon}-outline`} size={19} color={C.brand600} />
              </View>
              <Text style={{ fontFamily: F.sansMedium, fontSize: fs(11.5), color: C.ink, textAlign: "center" }}>
                {t(x.k, x.t)}</Text>
            </Pressable>))}
        </View>

        <RowGroup style={{ marginTop: 18 }}>
          <NavRow icon="logo-whatsapp" tone="gold" label={t("home.join_whatsapp", "Join WhatsApp")}
                  sub={t("home.whatsapp_sub", "Announcements from the masjid office")}
                  href="https://chat.whatsapp.com/" />
        </RowGroup>

        <View style={{ marginTop: 22, alignItems: "center", gap: 3 }}>
          <Text style={{ fontFamily: F.sans, fontSize: fs(11), color: C.muted }}>
            Bolton Central Islamic Society · Registered charity 1041569</Text>
          <Text style={{ fontFamily: F.sans, fontSize: fs(10.5), color: C.line }}>
            {t("home.powered_by", "Powered by")} MasjidOne</Text>
        </View>
      </View>
    </Screen>
  );
}
