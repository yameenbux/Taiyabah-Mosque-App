/* The home screen, laid out the way the web app lays it out.
 *
 * Same order, same groupings, same words, same twelve tiles in the same
 * sequence: salām, the date, the next jamāʿah, the Friday call, Today, the
 * reminder, Listen, Services, the footer. Somebody who has used the web app
 * for a year should find everything where they left it — the only differences
 * should be the ones native makes better.
 */
import React, { useEffect, useState } from "react";
import { View, Text, Pressable } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Path, Polygon, Circle } from "react-native-svg";
import { Ionicons } from "@expo/vector-icons";
import { C, F, R, SHADOW, dual } from "../theme";
import { useApp } from "../store";
import { Screen, Girih, Press, Rich, TopBar, PageFoot, open, tap } from "../ui";
import { dayFor, nextJamaah, pretty, nowLondon, NAMES, ORDER } from "../prayer";
import { shortDate, hijri } from "../dates";
import { dayRecord, allDays, onTimetable } from "../timetable";
import { current as currentReminders, setReminderTranslator } from "../reminder";

/* Ramadan, counted down on the home screen for the month before it.
 *
 * The website carries this band and the app did not, so the one thing the whole
 * community is counting toward was the one thing the home screen never said.
 * The date comes from the timetable's own hijri column — the first "1 Ramadan"
 * on or after today — which is the masjid's printed calendar rather than a
 * second calculation that could disagree with it. */
const RAM_WINDOW = 30;

function ramadanIn(now) {
  for (const [iso, d] of Object.entries(allDays())) {
    if (!/^1\s+Rama(d|dh)an/i.test(d.hijri || "")) continue;
    const [Y, M, D] = iso.split("-").map(Number);
    const when = new Date(Y, M - 1, D);
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const days = Math.round((when - today) / 86400000);
    if (days < 0 || days > RAM_WINDOW) continue;
    return { days, year: (d.hijri.match(/(\d+)\s*AH/) || [])[1] };
  }
  return null;
}

/* The twelve tiles, in the web app's order. Not alphabetical, not grouped by
 * kind — this is the order the committee settled on, so it is the order here. */
const TILES = [
  { to: "Quran",    k: "tiles.holy_quran",         t: "Holy Qurʼan",          icon: "quran" },
  { to: "Athkar",   k: "tiles.daily_adhkar",       t: "Daily Adhkār",         icon: "beads" },
  { to: "Bukhari",  k: "tiles.hadith",             t: "Ṣaḥīḥ al-Bukhārī",     icon: "book" },
  { to: "Qibla",    k: "tiles.qibla",              t: "Qibla",                icon: "compass" },
  { to: "Madrasah", k: "tiles.madrasah",           t: "Madrasah",             icon: "cap" },
  { to: "Marriage", k: "tiles.nikah_services",     t: "Nikāḥ Services",       icon: "rings" },
  { to: "Funeral",  k: "tiles.funeral_services",   t: "Funeral Services",     icon: "grave" },
  { to: "HallHire", k: "tiles.hall_booking",       t: "Hall Booking",         icon: "hall" },
  { to: "NewBuild", k: "tiles.donate",             t: "Donate",               icon: "heart" },
  { to: "Giving",   k: "giving.sadaqah_lillah",    t: "Sadaqah & Lillah",     icon: "box" },
  { to: "Collect",  k: "collect.charity_collections", t: "Charity Collections", icon: "tin" },
  { href: "https://chat.whatsapp.com/", k: "tiles.join_whatsapp", t: "Join WhatsApp", icon: "whatsapp" },
];

/* The web app draws its own tile glyphs rather than using an icon set, and they
 * are part of how it looks — a prayer-bead tasbīḥ, two rings, a collection tin.
 * They are redrawn here from the same paths rather than swapped for the nearest
 * thing in Ionicons.
 *
 * A FUNCTION rather than a map of elements: WhatsApp's mark is a filled shape,
 * so it is the one glyph that names a colour, and a JSX element built at module
 * scope evaluates its props once at import — the plum would freeze to light and
 * the mark would stay dark plum on a dark page. */
const GLYPH = () => ({
  quran:   <><Path d="M12 6.5c2.4-1.7 5-1.7 7.4 0v11.8c-2.4-1.7-5-1.7-7.4 0-2.4-1.7-5-1.7-7.4 0V6.5c2.4-1.7 5-1.7 7.4 0z" /><Path d="M12 6.5v11.8" /></>,
  book:    <><Path d="M5 4.5h10.5A2.5 2.5 0 0 1 18 7v12.5H7.5A2.5 2.5 0 0 1 5 17V4.5Z" /><Path d="M18 19.5H7.5A2.5 2.5 0 0 0 5 22" /><Path d="M8.5 8.5h6" /><Path d="M8.5 12h6" /></>,
  compass: <><Circle cx="12" cy="12" r="8.5" /><Path d="M15.2 8.8 13.4 13.4 8.8 15.2 10.6 10.6 15.2 8.8Z" /></>,
  cap:     <><Path d="M2.5 9.5 12 5l9.5 4.5L12 14 2.5 9.5Z" /><Path d="M6 11.5v4.7c0 1 2.7 2.3 6 2.3s6-1.3 6-2.3v-4.7" /></>,
  rings:   <><Circle cx="9" cy="14" r="5.4" /><Circle cx="15" cy="14" r="5.4" /></>,
  grave:   <><Path d="M6.5 20.5v-8.6a5.5 5.5 0 0 1 11 0v8.6" /><Path d="M3.5 20.5h17" /><Path d="M15 13.64A3.04 3.04 0 0 1 10.96 9.6a3.08 3.08 0 1 0 4.04 4.04Z" /></>,
  hall:    <><Path d="M4 21V9l8-5 8 5v12" /><Path d="M4 21h16" /><Path d="M10 21v-6h4v6" /></>,
  heart:   <Path d="M11.9 20.2S5 15.9 5 10.7a4.4 4.4 0 0 1 6.9-3.6 4.4 4.4 0 0 1 6.9 3.6c0 5.2-6.9 9.5-6.9 9.5Z" />,
  box:     <><Circle cx="12" cy="5.6" r="2.7" /><Path d="M4.4 11.4h15.2a1 1 0 0 1 1 1v7.1a1 1 0 0 1-1 1H4.4a1 1 0 0 1-1-1v-7.1a1 1 0 0 1 1-1Z" /><Path d="M9.7 15h4.6" /></>,
  tin:     <><Path d="M7 8.8h10v10.7a1.5 1.5 0 0 1-1.5 1.5h-7A1.5 1.5 0 0 1 7 19.5Z" /><Path d="M9.6 12.2h4.8" /><Path d="M8.2 8.8V7a2 2 0 0 1 2-2h3.6a2 2 0 0 1 2 2v1.8" /></>,
  /* A tasbīḥ: nine beads around a loop, the thread, and the tassel bead. */
  beads:   <>{[[12,14.8],[15.34,13.58],[17.12,10.5],[16.5,7],[13.78,4.71],[10.22,4.71],[7.5,7],[6.88,10.5],[8.66,13.58]]
    .map(([x,y],i)=><Circle key={i} cx={x} cy={y} r={0.95} />)}
    <Path d="M12 15.9v1.3" /><Circle cx="12" cy="18.7" r="1.5" /></>,
  whatsapp: <Path fill={C.brand600} stroke="none" d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.16-.17.2-.35.23-.64.08-.3-.15-1.26-.46-2.39-1.48-.88-.79-1.48-1.76-1.65-2.06-.17-.3-.02-.46.13-.6.13-.14.3-.35.45-.52.15-.18.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.61-.91-2.2-.25-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.87 1.21 3.07c.15.2 2.1 3.2 5.08 4.49.71.3 1.26.49 1.7.62.71.23 1.36.2 1.87.12.57-.09 1.76-.72 2-1.41.25-.7.25-1.29.18-1.42-.08-.12-.27-.2-.57-.35M12.05 21.8a9.87 9.87 0 0 1-5.03-1.38l-.36-.22-3.74.99 1-3.65-.24-.37a9.86 9.86 0 0 1-1.51-5.26c0-5.45 4.44-9.89 9.89-9.89 2.64 0 5.12 1.03 6.99 2.9a9.83 9.83 0 0 1 2.89 7c0 5.45-4.44 9.88-9.89 9.88m8.41-18.3A11.82 11.82 0 0 0 12.05 0C5.5 0 .16 5.34.16 11.89c0 2.1.55 4.14 1.59 5.95L.06 24l6.3-1.65a11.88 11.88 0 0 0 5.69 1.45c6.55 0 11.89-5.34 11.89-11.9 0-3.17-1.24-6.16-3.48-8.4Z" />,
});

function TileIcon({ name }) {
  return (
    <Svg width={23} height={23} viewBox="0 0 24 24" fill="none" stroke={C.brand600}
         strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      {GLYPH()[name]}
    </Svg>
  );
}

export default function Home({ navigation }) {
  const { t, fs, rtl } = useApp();
  const [now, setNow] = useState(nowLondon());
  const [rmIdx, setRmIdx] = useState(0);

  /* Tick on the half minute: the only thing that changes is the countdown, and
   * a per-second timer is a battery cost for nothing. */
  useEffect(() => {
    const id = setInterval(() => setNow(nowLondon()), 30000);
    return () => clearInterval(id);
  }, []);
  /* Set before the reminders are read, not in an effect afterwards: the first
   * render is the one people see, and an effect would leave the suhūr time in
   * 24-hour on it. */
  setReminderTranslator(t, pretty);

  const ramadan = ramadanIn(now);

  /* Re-read when a downloaded year lands. */
  const [ttTick, setTtTick] = useState(0);
  React.useEffect(() => onTimetable(() => setTtTick(n => n + 1)), []);

  const day = dayFor(now);
  const next = nextJamaah(now);
  const friday = now.getDay() === 5;
  /* On Friday the midday jamāʿah is Jumuʿah, and saying "Zuhr" on the one day
   * it is not Zuhr is the sort of thing a masjid gets told about. */
  const friJum = next && next.key === "zuhr" && (next.tomorrow ? addDays(now, 1) : now).getDay() === 5;

  const { list: reminders } = currentReminders(now);
  const rm = reminders.length ? reminders[rmIdx % reminders.length] : null;
  const rmCtx = currentReminders(now).c;

  const gap = (() => {
    if (!next || next.tomorrow) return 0;
    const [bh, bm] = next.begins.split(":").map(Number);
    const [jh, jm] = next.at.split(":").map(Number);
    const total = (jh * 60 + jm) - (bh * 60 + bm);
    return total > 0 ? Math.max(0, Math.min(1, 1 - next.minutesAway / total)) : 0;
  })();

  const countdown = (() => {
    if (!next) return "—";
    const h = Math.floor(next.minutesAway / 60), m = next.minutesAway % 60;
    return h > 0
      ? t("count.hours_minutes", "in {h}h {m}m").replace("{h}", h).replace("{m}", String(m).padStart(2, "0"))
      : t("count.minutes", "in {m} min").replace("{m}", m);
  })();

  return (
    <Screen pad={false}>
      {/* ---- hero ------------------------------------------------------- */}
      {/* TWO gradients, as the website has them, not one spread over both.
          .topbar runs brand-900 to brand-800 over its own height; .hero then
          STARTS AGAIN at brand-800 and runs down to brand-900. Merging them
          into a single 900-800-900 meant the top of the hero was still near
          brand-900 where the site is already at brand-800 — measurably
          #400c2d against the website's #491034 — which also made the girih
          stand out, because it was being drawn on a darker ground. */}
      <LinearGradient colors={[C.brand900, C.brand800]} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
        style={{ alignSelf: "stretch" }}>
        <TopBar navigation={navigation} onBell={() => navigation.navigate("NoticesTab")} />
      </LinearGradient>
      <LinearGradient colors={[C.brand800, C.brand900]} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
        style={{ paddingBottom: 22, overflow: "hidden", alignItems: rtl ? "flex-end" : "flex-start" }}>
        <Girih style={{ right: -46, top: -40 }} size={230} />

        <View style={{ paddingHorizontal: 20, alignSelf: "stretch",
                       alignItems: rtl ? "flex-end" : "flex-start" }}>
        {/* The salām sits on one line, Arabic then transliteration, as the web
            app sets it. */}
        <View style={{ flexDirection: rtl ? "row-reverse" : "row", alignItems: "baseline", gap: 11 }}>
          <Text style={{ fontFamily: F.arabic, fontSize: fs(23), lineHeight: fs(42), color: C.goldBright,
                         writingDirection: "rtl" }}>السَّلَامُ عَلَيْكُمْ</Text>
          <Text style={{ fontFamily: F.sans, fontSize: fs(10.5), letterSpacing: 1.4,
                         textTransform: "uppercase", color: "rgba(243,239,227,.6)" }}>
            {t("app.as_salamu_alaykum", "As-salāmu ʿalaykum")}</Text>
        </View>

        <View style={{ flexDirection: rtl ? "row-reverse" : "row", alignItems: "center", gap: 7,
                       borderWidth: 1, borderColor: "rgba(243,239,227,.18)", borderRadius: R.pill,
                       paddingHorizontal: 12, paddingVertical: 6, marginTop: 12 }}>
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: C.goldBright }} />
          <Text style={{ fontFamily: F.sans, fontSize: fs(12), color: "#D0BFCA" }}>
            {shortDate(t, now)}{day ? ` · ${hijri(t, day.hijri)}` : ""}</Text>
        </View>

        {!!ramadan && (
          <View style={{ alignItems: "center", marginTop: 10 }}>
            <Text style={{ fontFamily: F.sansSemi, fontSize: fs(12.5), color: C.goldBright,
                           textAlign: "center" }}>
              {ramadan.days === 0 ? t("ramadan.begins_today", "Ramadan begins today")
               : ramadan.days === 1 ? t("ramadan.begins_tomorrow", "Ramadan begins tomorrow")
               : t("ramadan.begins_in_about", "Ramadan begins in about {n} days")
                   .replace("{n}", String(ramadan.days))}</Text>
            <Text style={{ fontFamily: F.sans, fontSize: fs(11), color: "rgba(243,239,227,.6)",
                           marginTop: 2, textAlign: "center" }}>
              {t("app.subject_to_moon_sighting", "Subject to moon sighting")}
              {ramadan.year ? ` · ${ramadan.year} AH` : ""}</Text>
          </View>)}

        {next ? (
          <>
            <Text style={{ fontFamily: F.sansSemi, fontSize: fs(11), letterSpacing: 1.5,
                           color: C.goldBright, marginTop: 20, textTransform: "uppercase" }}>
              {t("app.next_jama_ah", "Next Jamāʿah")}</Text>
            <View style={{ flexDirection: rtl ? "row-reverse" : "row", alignItems: "baseline", gap: 10, marginTop: 2 }}>
              <Text style={{ fontFamily: F.display, fontSize: fs(29), color: C.cream }}>
                {friJum ? t("giving.jumuah", "Jumuʿah") : t(`prayer.${next.key}`, NAMES[next.key].en)}</Text>
              <Text style={{ fontFamily: F.arabic, fontSize: fs(22), color: C.cream }}>
                {friJum ? "الجمعة" : NAMES[next.key].ar}</Text>
            </View>
            <Text style={{ fontFamily: F.sansSemi, fontSize: fs(50), color: "#fff", marginTop: 2 }}>
              {pretty(next.at)}</Text>

            <View style={{ flexDirection: rtl ? "row-reverse" : "row", alignItems: "center", gap: 12,
                           marginTop: 10, flexWrap: "wrap" }}>
              <View style={{ borderWidth: 1, borderColor: "rgba(220,187,99,.45)", borderRadius: R.pill,
                             paddingHorizontal: 13, paddingVertical: 6 }}>
                <Text style={{ fontFamily: F.sansSemi, fontSize: fs(13), color: C.goldBright }}>{countdown}</Text>
              </View>
              <Rich style={{ fontFamily: F.sans, fontSize: fs(13), color: "#D0BFCA" }}>
                {t("times.beginning_time", "Beginning time *{t}*").replace("{t}", pretty(next.begins)) +
                 (next.tomorrow ? ` · ${t("times.tomorrow", "tomorrow")}` : "")}
              </Rich>
            </View>

            <View style={{ alignSelf: "stretch", height: 4, borderRadius: 2,
                           backgroundColor: "rgba(255,255,255,.14)", marginTop: 16 }}>
              <View style={{ height: 4, borderRadius: 2, width: `${gap * 100}%`, backgroundColor: C.goldBright }} />
            </View>
          </>
        ) : (
          <Text style={{ fontFamily: F.sans, fontSize: fs(14), color: "#D0BFCA", marginTop: 20 }}>
            {t("times.no_further_dates", "The loaded timetable has no further dates.")}</Text>
        )}

        {/* The Friday call, inside the hero exactly as the web app has it. */}
        {friday && (
          <View style={{ alignSelf: "stretch", marginTop: 18, borderRadius: R.card, padding: 15,
                         backgroundColor: "rgba(220,187,99,.12)", borderWidth: 1,
                         borderColor: "rgba(220,187,99,.3)", alignItems: "center", gap: 5 }}>
            <Text style={{ fontFamily: F.arabic, fontSize: fs(17), lineHeight: fs(32), color: C.goldBright,
                           textAlign: "center", writingDirection: "rtl" }}>
              خَيْرُ يَوْمٍ طَلَعَتْ عَلَيْهِ الشَّمْسُ يَوْمُ الْجُمُعَةِ</Text>
            <Text style={{ fontFamily: F.sans, fontSize: fs(13), lineHeight: fs(21), color: C.cream,
                           textAlign: "center" }}>
              {t("app.the_best_day_on_which", "“The best day on which the sun has risen is Friday.”")}</Text>
            <Text style={{ fontFamily: F.sans, fontSize: fs(11), color: "rgba(243,239,227,.6)" }}>
              {t("app.sahih_muslim_854", "Ṣaḥīḥ Muslim 854")}</Text>
            <Pressable onPress={() => { tap(); navigation.navigate("NewBuild"); }}
              accessibilityRole="button"
              style={({ pressed }) => ({ marginTop: 8, borderRadius: R.pill, backgroundColor: C.goldBright,
                                         paddingHorizontal: 20, paddingVertical: 11,
                                         opacity: pressed ? 0.88 : 1 })}>
              <Text style={{ fontFamily: F.sansSemi, fontSize: fs(14), color: C.brand900 }}>
                {t("app.give_this_jumu_ah", "Give this Jumuʿah")}</Text>
            </Pressable>
            <Text style={{ fontFamily: F.sans, fontSize: fs(11.5), color: "rgba(243,239,227,.66)", marginTop: 2 }}>
              {t("app.support_the_new_taiyabah_masjid", "Support the new Taiyabah Masjid")}</Text>
          </View>)}
        </View>
      </LinearGradient>

      <View style={{ paddingHorizontal: 16 }}>
        {/* ---- Today ---------------------------------------------------- */}
        <SecH t={t} fs={fs} rtl={rtl} title={t("home.today", "Today")}
              tag={t("home.beginning_jamaah", "Beginning & jamāʿah")} />
        {!!day && (
          <View style={{ flexDirection: "row", backgroundColor: C.card, borderRadius: R.card, borderWidth: 1,
                         ...SHADOW,
                         borderColor: C.line, overflow: "hidden" }}>
            {ORDER.map((k, i) => {
              const isNext = next && k === next.key && !next.tomorrow;
              return (
                <View key={k} style={{ flex: 1, alignItems: "center", paddingVertical: 13,
                                       borderLeftWidth: i ? 1 : 0, borderLeftColor: C.line,
                                       /* .pcol[data-next="1"] on the website is plum at 7%,
                                          not gold at 10%. Gold reads as a warm cream panel
                                          and makes the strip look like it is marking
                                          something else entirely. */
                                       backgroundColor: isNext ? "rgba(119,33,87,.07)" : "transparent" }}>
                  <Ionicons name={k === "isha" ? "moon-outline" : "sunny-outline"} size={15} color={C.gold} />
                  <Text style={{ fontFamily: F.sans, fontSize: fs(10.5), color: C.muted, marginTop: 5 }}>
                    {t(`prayer.${k}`, NAMES[k].en)}</Text>
                  <Text style={{ fontFamily: F.sansSemi, fontSize: fs(14), color: C.ink, marginTop: 3 }}>
                    {pretty(day.begins[k]).replace(/ (am|pm)$/, "")}</Text>
                  <View style={{ backgroundColor: "rgba(119,33,87,.09)", borderRadius: R.pill,
                                 paddingHorizontal: 7, paddingVertical: 2, marginTop: 5 }}>
                    <Text style={{ fontFamily: F.sansSemi, fontSize: fs(10.5), color: C.brand600 }}>
                      {pretty(day.jamaat[k]).replace(/ (am|pm)$/, "")}</Text>
                  </View>
                </View>);
            })}
          </View>)}

        {/* WHEN THERE ARE NO TIMES FOR TODAY, SAY SO. The timetable runs a
            year at a time, and on the first morning of a year the masjid has
            not published yet this card simply was not drawn — the prayer
            times vanished off the home screen with no word of explanation,
            which is the one thing this app must never do silently. Prayer
            Times has said it all along; Home did not. */}
        {!day && (
          <View style={{ backgroundColor: C.card, borderRadius: R.card, borderWidth: 1,
                         borderColor: C.line, padding: 15, ...SHADOW }}>
            <Text style={{ fontFamily: F.sans, fontSize: fs(13.5), lineHeight: fs(21),
                           color: C.muted, textAlign: rtl ? "right" : "left" }}>
              {t("times.off_timetable", "That date is outside the published timetable.")}</Text>
            <Text style={{ fontFamily: F.sans, fontSize: fs(13.5), lineHeight: fs(21),
                           color: C.muted, marginTop: 7, textAlign: rtl ? "right" : "left" }}>
              {t("home.times_coming", "The masjid publishes one year at a time. Times appear here as soon as the new timetable is out — please check at the masjid meanwhile.")}</Text>
          </View>)}

        <Press onPress={() => { tap(); navigation.navigate("Timetable"); }}
          accessibilityRole="button"
          /* 11px of padding on a 13px line is a 35pt target, under the 44 both
             platforms ask for. hitSlop grows what the finger hits without
             moving the link away from the figures it sits under. */
          hitSlop={{ top: 5, bottom: 5, left: 12, right: 12 }}
          style={{ alignSelf: rtl ? "flex-start" : "flex-end", paddingVertical: 11, paddingHorizontal: 4,
                   flexDirection: rtl ? "row-reverse" : "row", alignItems: "center", gap: 4 }}>
          <Text style={{ fontFamily: F.sansSemi, fontSize: fs(13), color: C.brand600 }}>
            {t("home.full_timetable", "Full timetable ›").replace(/\s*›\s*$/, "")}</Text>
          <Ionicons name={rtl ? "chevron-back" : "chevron-forward"} size={14} color={C.brand600} />
        </Press>

        {/* ---- the reminder --------------------------------------------- */}
        {!!rm && (
          <View style={{ backgroundColor: "rgba(198,162,76,.11)", borderWidth: 1,
                         borderColor: "rgba(198,162,76,.3)", borderRadius: R.card, padding: 15, marginTop: 6 }}>
            <View style={{ flexDirection: rtl ? "row-reverse" : "row", alignItems: "center", gap: 10 }}>
              <Svg width={20} height={20} viewBox="0 0 100 100">
                <Polygon fill={C.gold} points="50,6 74,26 94,50 74,74 50,94 26,74 6,50 26,26" />
                <Polygon fill={C.gold} opacity={0.55} points="50,6 94,50 50,94 6,50" />
              </Svg>
              <Text style={{ flex: 1, fontFamily: F.arabic, fontSize: fs(18), lineHeight: fs(32),
                             color: dual("#8A6A18", C.goldInk), textAlign: rtl ? "left" : "right",
                             writingDirection: "rtl" }}>{rm.ar}</Text>
            </View>
            <Text style={{ fontFamily: F.sansSemi, fontSize: fs(14), color: dual("#6B5410", C.goldInk), marginTop: 8,
                           textAlign: rtl ? "right" : "left" }}>
              {t(`reminder.${rm.id}.t`, rm.t)}</Text>
            <Text style={{ fontFamily: F.sans, fontSize: fs(12.5), lineHeight: fs(20), color: dual("#7A6838", C.goldInk),
                           marginTop: 3, textAlign: rtl ? "right" : "left" }}>
              {typeof rm.d === "function" ? rm.d(rmCtx) : t(`reminder.${rm.id}.d`, rm.d)}</Text>
            {reminders.length > 1 && (
              <View style={{ flexDirection: rtl ? "row-reverse" : "row", alignItems: "center",
                             justifyContent: "space-between", marginTop: 11 }}>
                <View style={{ flexDirection: "row", gap: 5 }}>
                  {reminders.map((_, i) => (
                    <View key={i} style={{ width: 6, height: 6, borderRadius: 3,
                                           backgroundColor: i === rmIdx % reminders.length
                                             ? C.goldInk : "rgba(122,104,56,.3)" }} />))}
                </View>
                <View style={{ flexDirection: "row", gap: 7 }}>
                  {[["chevron-back", -1], ["chevron-forward", 1]].map(([icon, step]) => (
                    <Press key={icon}
                      accessibilityRole="button"
                      accessibilityLabel={step < 0 ? t("a11y.previous_reminder", "Previous reminder")
                                                   : t("a11y.next_reminder", "Next reminder")}
                      onPress={() => { tap(); setRmIdx(i => (i + step + reminders.length) % reminders.length); }}
                      /* Drawn 30x26 because the website draws it 30x26; hit as
                         44x44, which is what a finger actually needs. */
                      hitSlop={{ top: 9, bottom: 9, left: 7, right: 7 }}
                      style={{ width: 30, height: 26, borderRadius: 8, alignItems: "center",
                               justifyContent: "center", borderWidth: 1,
                               borderColor: "rgba(198,162,76,.45)" }}>
                      <Ionicons name={icon} size={15} color={C.goldInk} />
                    </Press>))}
                </View>
              </View>)}
          </View>)}

        {/* ---- Listen ---------------------------------------------------- */}
        <SecH t={t} fs={fs} rtl={rtl} title={t("home.listen", "Listen")} />
        <Press onPress={() => { tap(); navigation.navigate("Live"); }}
          accessibilityRole="button"
          style={{ borderRadius: R.card, overflow: "hidden" }}>
          {/* .lbanner: linear-gradient(100deg, brand-800, brand-600) — across,
              and ending on the BRIGHTER plum. This had it backwards and on the
              wrong two colours. */}
          <LinearGradient colors={[C.brand800, C.plumFill]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0.2 }}
            style={{ flexDirection: rtl ? "row-reverse" : "row", alignItems: "center", gap: 13,
                     paddingHorizontal: 15, paddingVertical: 15, overflow: "hidden" }}>
            <View style={{ width: 40, height: 40, borderRadius: 14, alignItems: "center", justifyContent: "center",
                           backgroundColor: "rgba(220,187,99,.18)" }}>
              <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={C.goldBright}
                   strokeWidth={1.9} strokeLinecap="round">
                <Path d="M12 3v18" /><Path d="M8 7v10" /><Path d="M16 7v10" /><Path d="M4 10v4" /><Path d="M20 10v4" />
              </Svg>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: F.sansSemi, fontSize: fs(13.5), letterSpacing: 1.3,
                             textTransform: "uppercase", color: C.cream,
                             textAlign: rtl ? "right" : "left" }}>
                {t("home.listen_live", "Listen live")}</Text>
              <Text style={{ fontFamily: F.sans, fontSize: fs(12), color: "rgba(243,239,227,.7)", marginTop: 2,
                             textAlign: rtl ? "right" : "left" }}>
                {t("home.tune_in_to_taiyabah", "Tune in to Taiyabah Masjid")}</Text>
            </View>
            {/* the little equaliser the web banner carries */}
            <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 2, height: 26, opacity: 0.55 }}>
              {[7, 13, 20, 11, 25, 16, 9, 22, 14, 6, 18, 11].map((h, i) => (
                <View key={i} style={{ width: 2.5, height: h, borderRadius: 2, backgroundColor: C.goldBright }} />))}
            </View>
            <Ionicons name={rtl ? "chevron-back" : "chevron-forward"} size={18} color={C.goldBright} />
          </LinearGradient>
        </Press>

        {/* ---- Services -------------------------------------------------- */}
        <SecH t={t} fs={fs} rtl={rtl} title={t("home.services", "Services")} />
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          {TILES.map(x => (
            <Pressable key={x.k} onPress={() => { tap(); x.to ? navigation.navigate(x.to) : open(x.href); }}
              /* "link" is not decoration: a screen reader says "link" for
                 something that leaves the app and "button" for something that
                 does not, and Join WhatsApp leaving the app is worth being
                 warned about before you tap it. */
              accessibilityRole={x.to ? "button" : "link"}
              style={({ pressed }) => ({ flexBasis: "30.5%", flexGrow: 1, alignItems: "center", gap: 8,
                                         backgroundColor: C.card, borderWidth: 1, borderColor: C.line,
                                         borderRadius: 15, paddingTop: 15, paddingBottom: 13, paddingHorizontal: 6,
                                         ...SHADOW,
                                         transform: [{ scale: pressed ? 0.97 : 1 }], opacity: pressed ? 0.9 : 1 })}>
              {/* the tinted chip the web tiles sit their glyph on */}
              <View style={{ width: 44, height: 44, borderRadius: 14, alignItems: "center",
                             justifyContent: "center", backgroundColor: "rgba(119,33,87,.07)" }}>
                <TileIcon name={x.icon} />
              </View>
              <Text style={{ fontFamily: F.sansSemi, fontSize: fs(11.5), color: C.ink, textAlign: "center" }}>
                {t(x.k, x.t)}</Text>
            </Pressable>))}
        </View>

        <PageFoot />

      </View>
    </Screen>
  );
}

/* The web app's section heading: a title, a rule across the rest of the line,
 * and sometimes a tag on the end. */
function SecH({ t, fs, rtl, title, tag }) {
  return (
    <View style={{ flexDirection: rtl ? "row-reverse" : "row", alignItems: "center", gap: 10,
                   marginTop: 22, marginBottom: 11 }}>
      <Text style={{ fontFamily: F.display, fontSize: fs(19), color: C.ink }}>{title}</Text>
      <View style={{ flex: 1, height: 1, backgroundColor: C.line }} />
      {!!tag && <Text style={{ fontFamily: F.sans, fontSize: fs(11.5), color: C.muted }}>{tag}</Text>}
    </View>
  );
}

const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
