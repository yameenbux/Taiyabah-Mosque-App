/* The menu. In the web app this was a drawer that slid over the page; here it is
 * a screen of its own and every row PUSHES, so the platform gives it the slide
 * and the swipe-back for free. That gesture is one of the things a webview could
 * never do, and it is most of why this feels different.
 *
 * The grouping is the web app's, deliberately: somebody who has used that for a
 * year should not have to learn a new menu.
 */
import React from "react";
import { View, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { C, F, R } from "../theme";
import { useApp } from "../store";
import { Screen, Heading, RowGroup, NavRow, Foot, open } from "../ui";

const GROUPS = [
  { k: "menu.resources", title: "Resources", rows: [
    { to: "Quran",     icon: "book-outline",         k: "tiles.holy_quran",       t: "Holy Qurʼan",       sub: "604 pages · IndoPak, or with translation" },
    { to: "Athkar",    icon: "sunny-outline",        k: "tiles.daily_adhkar",     t: "Daily Adhkār",      sub: "Morning, evening, after ṣalāh" },
    { to: "Duas",      icon: "heart-outline",        k: "duas.everyday_du_as",    t: "Everyday duʿās" },
    { to: "Rabbanas",  icon: "sparkles-outline",     k: "athkar.the_forty_rabbana_du_as",     t: "40 Rabbanā duʿās" },
    { to: "Bukhari",   icon: "library-outline",      k: "tiles.hadith", t: "Ṣaḥīḥ al-Bukhārī" },
    { to: "Timetable", icon: "calendar-outline",     k: "menu.timetable",  t: "Full prayer timetable" },
    { to: "Videos",    icon: "play-circle-outline",  k: "about.videos_bayaans",  t: "Videos & bayaans" },
    { to: "Qibla",     icon: "compass-outline",      k: "tiles.qibla",           t: "Qibla" },
    { to: "Live",      icon: "radio-outline",        k: "home.listen_live",      t: "Listen live" },
    { to: "Zakat",     icon: "calculator-outline",   k: "menu.zakat", t: "Zakat calculator" },
    { soon: true,      icon: "airplane-outline",     k: "marriage.hajj_umrah",       t: "Hajj / Umrah" },
    { soon: true,      icon: "moon-outline",         k: "marriage.ramadan_2027",     t: "Ramadan 2027" },
  ]},
  { k: "tiles.madrasah", title: "Madrasah", rows: [
    { to: "Madrasah",   icon: "school-outline",      k: "a11y.madrasah",         t: "Madrasah" },
    { to: "Admissions", icon: "clipboard-outline",   k: "adm.admissions_fees",   t: "Admissions & Fees" },
    { to: "Curriculum", icon: "book-outline",        k: "madrasah.what_is_taught",   t: "What is taught" },
    { to: "Holidays",   icon: "calendar-outline",    k: "adm.holiday_planner",  t: "Holiday Planner" },
    { to: "Portal",     icon: "log-in-outline",      k: "portals.madrasah_portal",  t: "Madrasah Portal",
      sub: "Sign in · registers and pupil records still being built" },
  ]},
  { k: "marriage.our_services", title: "Our services", rows: [
    { to: "MarriageDeath", icon: "git-branch-outline", k: "marriage.birth_marriage_death", t: "Birth, Marriage & Death" },
    { to: "Marriage",   icon: "heart-outline",       k: "tiles.nikah_services",   t: "Nikāḥ Services" },
    { to: "Funeral",    icon: "flower-outline",      k: "a11y.funeral_services", t: "Funeral Services" },
    { to: "HallHire",   icon: "business-outline",    k: "hallhire.hall_room_hire",     t: "Hall / Room Hire" },
    { to: "Collect",    icon: "people-outline",      k: "a11y.charity_collections", t: "Charity Collections" },
    { to: "Advice",     icon: "chatbubbles-outline", k: "a11y.imams_advice",     t: "Imams’ Advice" },
    { to: "Education",  icon: "ribbon-outline",      k: "edu.education",         t: "Education" },
    { soon: true,       icon: "walk-outline",        k: "marriage.tours_visits",     t: "Tours & Visits" },
  ]},
  { k: "marriage.the_masjid", title: "The masjid", rows: [
    { to: "About",      icon: "information-circle-outline", k: "about.about_us", t: "About us" },
    { to: "Membership", icon: "card-outline",        k: "a11y.membership",       t: "Membership" },
    { to: "Contact",    icon: "call-outline",        k: "contact.contact_us",    t: "Contact us" },
    { to: "NewBuild",   icon: "hammer-outline",      k: "about.support_the_new_build",    t: "The new build" },
    { to: "Giving",     icon: "gift-outline",        k: "giving.sadaqah_lillah",   t: "Sadaqah & Lillah" },
  ]},
  { k: "menu.settings", title: "Settings", rows: [
    { to: "Prefs",      icon: "options-outline",     k: "sysprefs.display_language", t: "Display & language" },
    { to: "Alerts",     icon: "notifications-outline", k: "menu.notifications",  t: "Notifications" },
    { to: "Privacy",    icon: "shield-checkmark-outline", k: "privacy.privacy_notice", t: "Privacy notice" },
  ]},
];

export default function More({ navigation }) {
  const { t, fs } = useApp();
  const top = useSafeAreaInsets().top;
  return (
    <Screen top={top + 12}>
      <Text style={{ fontFamily: F.display, fontSize: fs(27), color: C.ink }}>{t("nav.more", "More")}</Text>
      {GROUPS.map(g => (
        <View key={g.title}>
          <Heading>{t(g.k, g.title)}</Heading>
          <RowGroup style={{ marginTop: 0 }}>
            {g.rows.map(r => (
              <NavRow key={r.k + r.t} icon={r.icon} label={t(r.k, r.t)}
                      sub={r.sub ? t(`${r.k}.sub`, r.sub) : null}
                      soon={r.soon ? t("edu.coming_soon", "Coming soon") : null}
                      onPress={r.to ? () => navigation.navigate(r.to) : null} />))}
          </RowGroup>
        </View>))}
      <Foot lines={["Bolton Central Islamic Society · Registered charity 1041569",
                    "31a Draycott Street, Bolton BL1 8HD"]} />
    </Screen>
  );
}
