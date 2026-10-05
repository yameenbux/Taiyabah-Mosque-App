/* The menu.
 *
 * This is the web app's drawer, row for row: the same five groups in the same
 * order, the same seventeen rows, the same two "coming soon" entries, the same
 * social strip and the same footer with the radio frequency on it. Anything the
 * web app reaches from a tile or a sheet is reached the same way here.
 *
 * ONE ROW IS NOT ON THE WEBSITE: Help. It is here on purpose and it is the only
 * such row, so it is written down rather than left to be discovered. Most of
 * what goes wrong with a phone app cannot go wrong in a browser — Android stops
 * the app in the background, a permission is refused once and never offered
 * again, a compass is thrown off by a magnetic case — and a help page written
 * for the website could not answer any of it. If the website ever grows the
 * same section, these should be reconciled rather than both left to drift.
 *
 * What changed is the mechanism, not the map: it is a screen rather than a
 * drawer, so every row pushes and the platform gives it the slide and the
 * swipe-back.
 */
import React from "react";
import { View, Text, Image } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path, Circle, Rect } from "react-native-svg";
import { Ionicons } from "@expo/vector-icons";
import { C, F, R } from "../theme";
import { useApp } from "../store";
import { LinearGradient } from "expo-linear-gradient";
import { Screen, Press, open, tap } from "../ui";

const MAPS = "https://maps.apple.com/?q=Taiyabah+Masjid+Draycott+Street+Bolton+BL1+8HD";
const PORTAL = "https://taiyabahwebsite.ysbdesigns.uk/portal/";
const PRIVACY = "https://taiyabahapp.ysbdesigns.uk/privacy.html";

const GROUPS = [
  { k: "menu.resources", t: "Resources", rows: [
    { to: "Timetable", icon: "calendar-outline",   k: "menu.timetable",        t: "Full prayer timetable" },
    { to: "Videos",    icon: "play-circle-outline", k: "about.videos_bayaans", t: "Videos & bayaans" },
    { soon: true,      icon: "airplane-outline",    k: "marriage.hajj_umrah",  t: "Hajj / Umrah" },
    { soon: true,      icon: "moon-outline",        k: "marriage.ramadan_2027", t: "Ramadan 2027" },
    { to: "Zakat",     icon: "calculator-outline",  k: "menu.zakat", t: "Zakat calculator" },
  ]},
  { k: "marriage.madrasah", t: "Madrasah", rows: [
    { to: "Admissions", icon: "clipboard-outline",  k: "adm.admissions_fees",  t: "Admissions & Fees" },
    { to: "Holidays",   icon: "calendar-outline",   k: "hol.holiday_planner",  t: "Holiday Planner" },
    { to: "Portal",     icon: "log-in-outline",     k: "portals.madrasah_portal", t: "Madrasah Portal",
      note: { k: "portals.madrasah_note", t: "Sign in · registers and pupil records still being built" },
      external: true },
  ]},
  { k: "marriage.the_masjid", t: "The masjid", rows: [
    { to: "About",      icon: "information-circle-outline", k: "about.about_us",  t: "About us" },
    { to: "Membership", icon: "card-outline",       k: "a11y.membership",         t: "Membership" },
    { href: MAPS,       icon: "location-outline",   k: "menu.location",       t: "Find us", external: true },
    { to: "Contact",    icon: "call-outline",       k: "contact.contact_us",    t: "Contact us" },
  ]},
  { k: "marriage.our_services", t: "Our services", rows: [
    { to: "MarriageDeath", icon: "git-branch-outline", k: "marriagedeath.birth_marriage_death", t: "Birth, Marriage & Death" },
    { to: "Advice",     icon: "chatbubbles-outline", k: "advice.imams_advice",  t: "Imams’ Advice" },
    { to: "Education",  icon: "ribbon-outline",      k: "edu.education",        t: "Education" },
    { soon: true,       icon: "walk-outline",        k: "marriage.tours_visits", t: "Tours & Visits" },
  ]},
  { k: "menu.settings", t: "Settings", rows: [
    { to: "Alerts",     icon: "notifications-outline", k: "menu.notifications", t: "Notifications" },
    { href: PRIVACY,    icon: "shield-checkmark-outline", k: "privacy.privacy_notice", t: "Privacy notice", external: true },
    { to: "Prefs",      icon: "options-outline",     k: "a11y.system_preferences", t: "System Preferences" },
    { to: "Help",       icon: "help-circle-outline", k: "help.title",             t: "Help" },
  ]},
];

const SOCIAL = [
  { href: "https://www.instagram.com/taiyabahmasjid/", label: "Instagram" },
  { href: "https://twitter.com/TaiyabahMasjid", label: "X" },
  { href: "https://www.youtube.com/channel/UCIJm0mh5SFn1-esTJpdazSw", label: "YouTube" },
];

export default function More({ navigation }) {
  const { t, fs, rtl } = useApp();
  const top = useSafeAreaInsets().top;

  return (
    <Screen pad={false}>
      {/* The drawer opens under the masjid's own wordmark on plum; so does this. */}
      <LinearGradient colors={[C.brand900, C.brand700]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
        style={{ paddingTop: top + 12, paddingBottom: 14, paddingHorizontal: 16,
                 alignItems: rtl ? "flex-end" : "flex-start" }}>
        <Image source={require("../../assets/logo.png")}
               style={{ width: 74, height: 52, resizeMode: "contain" }} />
      </LinearGradient>
      <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>

      {GROUPS.map(g => (
        <View key={g.k} style={{ marginTop: 22 }}>
          <Text style={{ fontFamily: F.sansMedium, fontSize: fs(10.5), letterSpacing: 1.6,
                         textTransform: "uppercase", color: C.muted, marginBottom: 9, marginHorizontal: 3,
                         textAlign: rtl ? "right" : "left" }}>{t(g.k, g.t)}</Text>
          <View style={{ backgroundColor: C.card, borderRadius: R.card, borderWidth: 1, borderColor: C.line,
                         overflow: "hidden" }}>
            {g.rows.map((r, i) => (
              <Row key={r.k} row={r} first={i === 0} nav={navigation} />))}
          </View>
        </View>))}

      {/* wide tinted pills, the shape the drawer uses */}
      <View style={{ flexDirection: "row", justifyContent: "center", gap: 10, marginTop: 24 }}>
        {SOCIAL.map(sx => (
          <Press key={sx.label} onPress={() => open(sx.href)} accessibilityLabel={sx.label}
            style={{ flex: 1, maxWidth: 110, height: 42, borderRadius: 13, alignItems: "center",
                     justifyContent: "center", backgroundColor: "rgba(119,33,87,.07)" }}>
            <Ionicons name={/instagram/i.test(sx.href) ? "logo-instagram"
                          : /youtube/i.test(sx.href) ? "logo-youtube" : "logo-twitter"}
                      size={19} color={C.brand600} />
          </Press>))}
      </View>

      <View style={{ marginTop: 18, gap: 3 }}>
        <Text style={{ fontFamily: F.sans, fontSize: fs(11), color: C.muted, textAlign: "center" }}>
          {t("drawer.radio", "Radio")} 454.1000 {t("drawer.mhz", "MHz")}</Text>
        <Text style={{ fontFamily: F.sans, fontSize: fs(11), color: C.muted, textAlign: "center" }}>
          {t("common.registered_charity", "Bolton Central Islamic Society · Registered charity")} 1041569</Text>
      </View>
      </View>
    </Screen>
  );
}

function Row({ row, first, nav }) {
  const { t, fs, rtl } = useApp();
  const act = row.soon ? null : row.to ? () => nav.navigate(row.to) : () => open(row.href);
  return (
    <Press onPress={act} disabled={!act}
      style={{ flexDirection: rtl ? "row-reverse" : "row", alignItems: "center", gap: 13,
               paddingVertical: 14, paddingHorizontal: 15,
               borderTopWidth: first ? 0 : 1, borderTopColor: C.line }}>
      <Ionicons name={row.icon} size={19} color={row.soon ? C.line : C.brand600}
                style={{ width: 24, textAlign: "center" }} />
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: F.sansMedium, fontSize: fs(14.5), color: row.soon ? C.muted : C.ink,
                       textAlign: rtl ? "right" : "left" }}>{t(row.k, row.t)}</Text>
        {!!row.note && (
          <Text style={{ fontFamily: F.sans, fontSize: fs(12), lineHeight: fs(17.5), color: C.muted,
                         marginTop: 2, textAlign: rtl ? "right" : "left" }}>
            {t(row.note.k, row.note.t)}</Text>)}
      </View>
      {row.soon
        ? <View style={{ borderWidth: 1, borderColor: "rgba(198,162,76,.55)", borderRadius: R.pill,
                         paddingHorizontal: 10, paddingVertical: 3.5 }}>
            <Text style={{ fontFamily: F.sansMedium, fontSize: fs(9.5), letterSpacing: 0.9,
                           textTransform: "uppercase", color: C.goldInk }}>
              {t("marriage.coming_soon", "Coming soon")}</Text>
          </View>
        : row.external
          ? <Text style={{ fontFamily: F.sans, fontSize: fs(15), color: C.gold }}>↗</Text>
          : <Ionicons name={rtl ? "chevron-back" : "chevron-forward"} size={17} color={C.muted} />}
    </Press>
  );
}
