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
import Svg, { Path, Circle, Rect, SvgXml } from "react-native-svg";
import { Ionicons } from "@expo/vector-icons";
import { C, F, R } from "../theme";
import { useApp } from "../store";
import { LinearGradient } from "expo-linear-gradient";
import { Screen, Press, open, tap } from "../ui";
import DRAWER from "../data/drawer.json";

/* Each drawer row's own drawing, lifted from the website by
 * scripts/extract-drawer.mjs and keyed by the row's translation key, so the
 * markup that names a row also supplies its picture. The nearest glyph in an
 * icon font is not the same thing: it gave Education a rosette where the site
 * has a mortar board, Birth/Marriage/Death a branch diagram where it has a
 * heart, and System Preferences a set of sliders where it has a globe. */
const svgOf = (xml, colour) =>
  xml ? xml.replace("<svg ", `<svg width="16" height="16" color="${colour}" `) : null;

const MAPS = "https://maps.apple.com/?q=Taiyabah+Masjid+Draycott+Street+Bolton+BL1+8HD";
const PORTAL = "https://taiyabahwebsite.ysbdesigns.uk/portal/";

const GROUPS = [
  { k: "menu.resources", t: "Resources", rows: [
    { to: "Timetable", icon: "calendar-outline",   k: "menu.timetable",        t: "Full prayer timetable" },
    { to: "Videos",    icon: "play-circle-outline", k: "marriage.videos_bayaans", t: "Videos & bayaans" },
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
    { to: "About",      icon: "information-circle-outline", k: "menu.about",  t: "About us" },
    { to: "Membership", icon: "card-outline",       k: "member.membership",        t: "Membership" },
    { href: MAPS,       icon: "location-outline",   k: "menu.location",       t: "Find us", external: true },
    { to: "Contact",    icon: "call-outline",       k: "menu.contact",          t: "Contact us" },
  ]},
  { k: "marriage.our_services", t: "Our services", rows: [
    { to: "MarriageDeath", icon: "git-branch-outline", k: "marriage.birth_marriage_death", t: "Birth, Marriage & Death" },
    { to: "Advice",     icon: "chatbubbles-outline", k: "marriage.imams_advice", t: "Imams’ Advice" },
    { to: "Education",  icon: "ribbon-outline",      k: "marriage.education",   t: "Education" },
    { soon: true,       icon: "walk-outline",        k: "marriage.tours_visits", t: "Tours & Visits" },
  ]},
  { k: "menu.settings", t: "Settings", rows: [
    { to: "Alerts",     icon: "notifications-outline", k: "menu.notifications", t: "Notifications" },
    /* The privacy notice is a sheet on the website and a screen here — the
       app has had one all along, and System Preferences already pushed to it.
       This row sent you out to the browser instead, so the same notice was
       reached two different ways and one of them left the app. */
    { to: "Privacy",    icon: "shield-checkmark-outline", k: "privacy.privacy_notice", t: "Privacy notice" },
    { to: "Prefs",      icon: "options-outline",     k: "marriage.system_preferences", t: "System Preferences" },
    { to: "Help",       icon: "help-circle-outline", k: "help.title",             t: "Help" },
  ]},
];

const SOCIAL = [
  { href: "https://www.instagram.com/taiyabahmasjid/", label: "Instagram", mark: "instagram" },
  { href: "https://twitter.com/TaiyabahMasjid", label: "X", mark: "x" },
  { href: "https://www.youtube.com/channel/UCIJm0mh5SFn1-esTJpdazSw", label: "YouTube", mark: "youtube" },
];

export default function More({ navigation }) {
  const { t, fs, rtl } = useApp();
  const top = useSafeAreaInsets().top;

  return (
    <Screen pad={false}>
      {/* The drawer opens under the masjid's own wordmark on plum; so does this. */}
      {/* The website's drawer header is linear-gradient(brand-900, brand-800),
          straight down — not brand-900 to brand-700 across. */}
      <LinearGradient colors={[C.brand900, C.brand800]} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
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
            {/* Ionicons has no X mark, so "logo-twitter" was drawing the old
                bird here — a different company's logo standing in for this
                one. These are the website's own paths. */}
            <SvgXml xml={svgOf(DRAWER.social[sx.mark], C.brand600).replace(/width="16" height="16"/, 'width="19" height="19"')}
                    width={19} height={19} />
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
      /* .dr-row — 13/8 of padding with 10px between, not 14/15 with 13. */
      style={{ flexDirection: rtl ? "row-reverse" : "row", alignItems: "center", gap: 10,
               paddingVertical: 13, paddingHorizontal: 12,
               borderTopWidth: first ? 0 : 1, borderTopColor: C.line }}>
      {/* .dr-row.soon has NO icon at all on the website — not a greyed one.
          A row with nothing behind it yet does not get a glyph, and its label
          starts where the others' icons do. And .dr-ico is a 29px #F0E9ED
          square at 9px of radius with a 16px glyph, not a bare 19px mark on
          the card. */}
      {!row.soon && (
        <View style={{ width: 29, height: 29, borderRadius: 9, alignItems: "center",
                       justifyContent: "center", backgroundColor: "#F0E9ED" }}>
          {DRAWER.rows[row.k]
            ? <SvgXml xml={svgOf(DRAWER.rows[row.k], C.brand600)} width={16} height={16} />
            : <Ionicons name={row.icon} size={16} color={C.brand600} />}
        </View>)}
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: F.sansMedium, fontSize: fs(14.5), color: row.soon ? C.muted : C.ink,
                       textAlign: rtl ? "right" : "left" }}>{t(row.k, row.t)}</Text>
        {!!row.note && (
          <Text style={{ fontFamily: F.sans, fontSize: fs(12), lineHeight: fs(17.5), color: C.muted,
                         marginTop: 2, textAlign: rtl ? "right" : "left" }}>
            {t(row.note.k, row.note.t)}</Text>)}
      </View>
      {row.soon
        /* .soon-tag — 9.5px BOLD in the gold itself inside a 45% gold
           hairline, 3/8 of padding. It was medium weight in the darker
           gold-ink inside a 55% border. */
        ? <View style={{ borderWidth: 1, borderColor: "rgba(198,162,76,.45)", borderRadius: R.pill,
                         paddingHorizontal: 8, paddingVertical: 3 }}>
            <Text style={{ fontFamily: F.sansBold, fontSize: fs(9.5), letterSpacing: 0.95,
                           textTransform: "uppercase", color: C.gold }}>
              {t("marriage.coming_soon", "Coming soon")}</Text>
          </View>
        : row.external
          ? <Text style={{ fontFamily: F.sans, fontSize: fs(15), color: C.gold }}>↗</Text>
          : <Ionicons name={rtl ? "chevron-back" : "chevron-forward"} size={17} color={C.muted} />}
    </Press>
  );
}
