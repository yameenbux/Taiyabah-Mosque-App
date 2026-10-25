/* Ramadan — the guard, and the countdown to the month.
 *
 * TWO SCREENS IN ONE FILE, and which you get is not decided here.
 * src/ramadan.js decides it, so the rule can be tested rather than read: a
 * week before the first night, and one day past the last.
 *
 * SHUT — a poster. The words, the count, the mark, and nothing else.
 *
 * OPEN — the month: which night it is, when sehri ends and iftar is, tonight\u2019s
 * juz and the isha jam\u0101\u02bfah it follows, who leads the twenty, the two
 * bayaans, the last ten nights, i\u02bftik\u0101f, fitrana and Eid.
 *
 * EVERY FIGURE IS READ, NOT TYPED. The night, the times and the juz come from
 * the timetable and the mu\u1e63\u1e25af at the moment of asking. Only what the masjid
 * decides \u2014 the rota, the booking, the amounts \u2014 comes from ramadan.json, and
 * anything the committee has not given is null there and prints as "To be
 * confirmed" rather than vanishing.
 *
 * WHY THERE IS NOTHING ELSE ON IT. The first draft carried a reminders
 * toggle, a list of what was coming, two preparation tiles and a duʿā. All of
 * it was defensible and all of it was wrong: a screen that exists to say one
 * thing should say one thing. Everything that was explaining itself has gone.
 */
import React, { useEffect, useMemo, useState } from "react";
import { View, Text, Image } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { C, F, R } from "../theme";
import Svg, { Polygon } from "react-native-svg";
import { Screen, Hero, Heading, Card, RowGroup, P, Note, PageFoot } from "../ui";
import { useApp } from "../store";
import { allDays } from "../timetable";
import { shortDate } from "../dates";
import { nowLondon, pretty } from "../prayer";
import { ramadanAccess, firstNightBegins, countdown } from "../ramadan";
import MUSHAF from "../data/mushaf.json";
import RAMADAN from "../data/ramadan.json";

const pad2 = n => String(n).padStart(2, "0");

/* The app's own eight-point girih, unfilled and centred on the screen. */
const POINTS = "50,2 57.3,32.4 83.9,16.1 67.6,42.7 98,50 67.6,57.3 83.9,83.9 "
             + "57.3,67.6 50,98 42.7,67.6 16.1,83.9 32.4,57.3 2,50 32.4,42.7 "
             + "16.1,16.1 42.7,32.4";

function Star({ size, color, opacity, width }) {
  return (
    <View pointerEvents="none"
          style={{ position: "absolute", top: "50%", left: "50%",
                   marginLeft: -size / 2, marginTop: -size / 2, opacity }}>
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Polygon points={POINTS} fill="none" stroke={color} strokeWidth={width} />
      </Svg>
    </View>
  );
}

/* ---- the month, once the gate has opened ------------------------------- */

/* Sehri is ten minutes before Fajr begins, which is the masjid's own cushion
   and the same one the reminder cards use. Iftar is Maghrib to the minute. */
const minusMins = (hhmm, n) => {
  const [h, m] = hhmm.split(":").map(Number);
  const mins = (((h * 60 + m - n) % 1440) + 1440) % 1440;
  return `${pad2(Math.floor(mins / 60))}:${pad2(mins % 60)}`;
};

function ramTimes(iso, days) {
  const rec = days && days[iso];
  if (!rec || !rec.begins) return {};
  return {
    sehri: rec.begins.fajr ? minusMins(rec.begins.fajr, 10) : null,
    fajr:  rec.begins.fajr || null,
    iftar: rec.begins.maghrib || null,
    isha:  (rec.jamaat && rec.jamaat.isha) || null,
  };
}

/* Juz 7 is pages 169 to 196 — where juz 8 starts, less one. The thirtieth
   runs to the end of the muṣḥaf, which is what the fallback is for. */
function juzPages(juz) {
  const jp = MUSHAF.juzPage || {};
  if (!jp[juz]) return null;
  return { from: +jp[juz], to: jp[juz + 1] ? +jp[juz + 1] - 1 : MUSHAF.pages };
}

/* .rm-row: the label left in soft ink, the figure right at 600, a hairline
   between. `sub` is the quiet line under the figure — the leader's role, the
   bayaan's subject, the Eid venue — fields the committee fills in, which a
   row with nowhere to put them would have thrown away. */
function RmRow({ k, v, sub, first }) {
  const { fs, rtl } = useApp();
  return (
    <View style={{ flexDirection: rtl ? "row-reverse" : "row", justifyContent: "space-between",
                   alignItems: "baseline", gap: 14, paddingVertical: 12, paddingHorizontal: 16,
                   borderTopWidth: first ? 0 : 1, borderTopColor: C.line }}>
      <Text style={{ flexShrink: 1, fontFamily: F.sans, fontSize: fs(14), lineHeight: fs(21),
                     color: C.muted, textAlign: rtl ? "right" : "left" }}>{k}</Text>
      <View style={{ flexShrink: 1, maxWidth: "58%" }}>
        <Text style={{ fontFamily: F.sansSemi, fontSize: fs(14.5), lineHeight: fs(21),
                       color: C.ink, textAlign: rtl ? "left" : "right" }}>{v}</Text>
        {!!sub && (
          <Text style={{ fontFamily: F.sans, fontSize: fs(11.5), lineHeight: fs(17),
                         color: C.hint, marginTop: 2,
                         textAlign: rtl ? "left" : "right" }}>{sub}</Text>)}
      </View>
    </View>
  );
}

/* A duʿā as the website sets one: the Arabic, the transliteration in gold,
   the English, then where it is from. */
function Dua({ ar, tr, en, src }) {
  const { fs, rtl } = useApp();
  return (
    <Card>
      <Text style={{ fontFamily: F.arabic, fontSize: fs(21), lineHeight: fs(40), color: C.ink,
                     textAlign: "right", writingDirection: "rtl" }}>{ar}</Text>
      <Text style={{ fontFamily: F.sansMedium, fontSize: fs(13), lineHeight: fs(21),
                     color: C.goldInk, textAlign: rtl ? "right" : "left" }}>{tr}</Text>
      <P>{en}</P>
      <Note>{src}</Note>
    </Card>
  );
}

/* The crescent in the hero's ring, the same path the website draws. */
const MOON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6">'
           + '<path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8Z"/></svg>';

function Month({ access, now }) {
  const { t, fs, rtl } = useApp();
  /* TWO STATES, AND THE DIFFERENCE MATTERS ON ONE MORNING A YEAR. `st` is the
     night being prayed right now, and is null for both states this section is
     deliberately open in without one: the WEEK BEFORE, and the MORNING AFTER.
     `last` keeps the night just kept, which is what puts the Eid times on the
     screen on the morning they are needed. Nothing else uses it: on Eid
     morning there is no taraweeh tonight and no juz to read, so the hero and
     "Tonight" stand down rather than print the thirtieth night over Eid. */
  const last = access.state;
  const st = access.trailing ? null : last;
  const days = allDays();
  /* Open EARLY — in the week before the first night — and there is no night
     to be on yet, so the hero and the two computed cards stand down and the
     month's arrangements are all there is to show. That is the whole point of
     opening early: iʿtikāf has to be bookable before Ramadan starts. */
  const iso = st ? st.tonight.iso : null;
  const tm = iso ? ramTimes(iso, days) : {};
  const tbc = t("ramadan.to_be_confirmed", "To be confirmed");
  const pages = st ? juzPages(st.juz) : null;
  const align = rtl ? "right" : "left";

  /* "3 hr 12 min", and nothing at all once Maghrib has gone. */
  let until = null;
  if (iso && tm.iftar) {
    const [h, m] = tm.iftar.split(":").map(Number);
    const at = new Date(iso + "T00:00:00");
    at.setHours(h, m, 0, 0);
    const mins = Math.round((at - now) / 60000);
    if (mins > 0)
      until = mins >= 60
        ? t("ramadan.hr_min", "{h} hr {m} min")
            .replace("{h}", String(Math.floor(mins / 60))).replace("{m}", String(mins % 60))
        : t("ramadan.n_min", "{m} min").replace("{m}", String(mins));
  }

  const it = RAMADAN.itikaf;
  /* Both null reads as pending rather than "0 of 0 left", which would read as
     fully booked — the one wrong answer a blank must not give. */
  const places = it.places == null ? tbc
    : t("ramadan.n_of_m_left", "{a} of {b} left")
        .replace("{a}", String(Math.max(0, it.places - (it.taken || 0))))
        .replace("{b}", String(it.places));

  /* The odd nights of the last ten, which in a 29-day month begin at 21 and
     in a 30-day month at 21 as well — but the TEN begin at 20 or 21, and
     that is counted, never assumed. */
  const odds = st && st.lastTen
    ? Array.from({ length: st.total }, (_, i) => i + 1)
        .filter(n => n > st.total - 10 && n % 2 === 1)
    : [];

  return (
    <Screen pad={false}>
      <Hero ring={MOON} lines={[{ k: "ramadan.ramadan", t: "Ramadan", w: "eyebrow" }]}>
        {!!st && (
          <View>
            <View style={{ alignItems: "center", marginTop: 4 }}>
              <Text style={{ fontFamily: F.display, fontSize: fs(30), color: C.cream }}>
                {t("ramadan.day_n", "Day {n}").replace("{n}", String(st.night))}
              </Text>
              <Text style={{ fontFamily: F.sans, fontSize: fs(12.5),
                             color: "rgba(243,239,227,.72)", marginTop: 5 }}>
                {`${shortDate(t, new Date(iso + "T12:00:00"))} · ${st.night} `
                 + t("ramadan.ramadan", "Ramadan")}
              </Text>
            </View>

            {/* The two times the day turns on. Iftar is the lit one: it is the
                time everybody in the masjid is waiting for. */}
            <View style={{ flexDirection: "row", gap: 10, marginTop: 16 }}>
              {[{ lab: t("ramadan.sehri_ends", "Sehri ends"), v: tm.sehri,
                  /* THE DESIGN PUT FAJR ITSELF UNDER "SEHRI ENDS" and the app
                     has been telling people otherwise for a year: the reminder
                     cards say suhūr ends ten minutes before Fajr, which is the
                     masjid's own cushion. Two sehri times in one app is worse
                     than either choice, so the cushion wins and Fajr is
                     printed underneath rather than standing in for it. */
                  sub: t("ramadan.fajr_at", "Fajr {t}")
                         .replace("{t}", tm.fajr ? pretty(tm.fajr) : "—") },
                { lab: t("ramadan.iftar", "Iftar"), v: tm.iftar, lit: true,
                  sub: t("ramadan.maghrib_lbl", "Maghrib") }].map(c => (
                <View key={c.lab}
                      style={{ flex: 1, borderRadius: R.tile, paddingVertical: 13,
                               paddingHorizontal: 13, borderWidth: 1,
                               borderColor: c.lit ? "rgba(220,187,99,.34)" : "rgba(243,239,227,.14)",
                               backgroundColor: c.lit ? "rgba(220,187,99,.13)"
                                                      : "rgba(243,239,227,.045)" }}>
                  <Text style={{ fontFamily: F.sansBold, fontSize: fs(9.5), letterSpacing: 1.9,
                                 textTransform: "uppercase", color: C.gold, textAlign: align }}>
                    {c.lab}
                  </Text>
                  <Text style={{ fontFamily: F.display, fontSize: fs(24), color: C.cream,
                                 marginTop: 4, textAlign: align }}>
                    {c.v ? pretty(c.v) : "—"}
                  </Text>
                  <Text style={{ fontFamily: F.sans, fontSize: fs(11.5),
                                 color: "rgba(243,239,227,.62)", marginTop: 2, textAlign: align }}>
                    {c.sub}
                  </Text>
                </View>))}
            </View>

            {!!until && (
              <View style={{ alignSelf: "center", marginTop: 13, borderRadius: R.pill,
                             paddingVertical: 8, paddingHorizontal: 15,
                             backgroundColor: "rgba(243,239,227,.08)" }}>
                <Text style={{ fontFamily: F.sansMedium, fontSize: fs(12.5), color: C.cream }}>
                  {t("ramadan.iftar_in", "Iftar in {t}").replace("{t}", until)}
                </Text>
              </View>)}
          </View>)}
      </Hero>

      <View style={{ paddingHorizontal: 16 }}>
        <Card>
          <P>{t("ramadan.ramadan_is_the_month_the",
                "Ramadan is the month the Qur’an was sent down — a month of fasting from first "
                + "light until sunset, of standing in prayer at night, and of giving.")}</P>
          <P>{t("ramadan.everything_the_masjid_is_running",
                "Everything the masjid is running this month is here: who is leading taraweeh, "
                + "who is speaking, and how to book i’tikaf.")}</P>
        </Card>

        {/* ---- tonight ---- */}
        {!!st && (
          <View>
            <Heading tag={t("ramadan.juz_n", "Juz {n}").replace("{n}", String(st.juz))}>
              {t("ramadan.tonight", "Tonight")}
            </Heading>
            <RowGroup>
              <RmRow first k={t("ramadan.isha_jamaah", "Isha jamāʿah")}
                     v={tm.isha ? pretty(tm.isha) : tbc} />
              <RmRow first k={t("ramadan.tonights_juz", "Tonight’s juz")}
                     v={t("ramadan.juz_n", "Juz {n}").replace("{n}", String(st.juz))
                        + (pages ? " · " + t("ramadan.pages_a_b", "pages {a}–{b}")
                             .replace("{a}", String(pages.from))
                             .replace("{b}", String(pages.to)) : "")} />
            </RowGroup>
          </View>)}

        <Heading>{t("ramadan.on_sighting_the_new_moon", "On sighting the new moon")}</Heading>
        <Dua ar="اللَّهُمَّ أَهْلِلْهُ عَلَيْنَا بِالْيُمْنِ وَالإِيمَانِ وَالسَّلاَمَةِ وَالإِسْلاَمِ رَبِّي وَرَبُّكَ اللَّهُ"
             tr={t("ramadan.allahumma_ahlilhu_alayna_bil_yumni",
                   "Allāhumma ahlilhu ʿalaynā bil-yumni wal-īmāni was-salāmati wal-islām. "
                   + "Rabbī wa Rabbukallāh")}
             en={t("ramadan.o_allah_bring_it_over",
                   "O Allah, bring it over us with blessing and faith, with safety and with "
                   + "Islam. My Lord and your Lord is Allah.")}
             src={t("ramadan.jami_al_tirmidhi", "Jāmiʿ al-Tirmidhī")} />

        <Heading>{t("ramadan.taraweeh", "Taraweeh")}</Heading>
        <Card>
          <P>{t("ramadan.twenty_rak_ahs_each_night",
                "Twenty rak’ahs each night, led by five. Mufti Faiyaz, the Imam of the masjid, "
                + "leads the first four rak’ahs, and four students of the masjid lead the rest.")}</P>
          <P>{t("ramadan.the_four_students_are_confirmed",
                "The four students are confirmed around a month before Ramadan begins. One juz "
                + "of the Qur’an is read each night, so the whole Qur’an is completed in "
                + "taraweeh by the end of the month.")}</P>
        </Card>
        <RowGroup>
          <View style={{ paddingHorizontal: 16, paddingTop: 13, paddingBottom: 2 }}>
            <Text style={{ fontFamily: F.sansBold, fontSize: fs(10.5), letterSpacing: 1.9,
                           textTransform: "uppercase", color: C.goldInk, textAlign: align }}>
              {t("ramadan.who_leads", "Who leads")}
            </Text>
          </View>
          {RAMADAN.taraweeh.leaders.map(l => (
            <RmRow key={l.rakahs} k={l.rakahs} v={l.name || tbc} sub={l.role} first />))}
        </RowGroup>

        <Heading>{t("ramadan.bayaan", "Bayaan")}</Heading>
        <Card>
          <P>{t("ramadan.two_talks_a_day_one", "Two talks a day, one after Asr and one after Isha.")}</P>
          <P>{t("ramadan.changes_are_announced_in_the", "Changes are announced in the app.")}</P>
        </Card>
        <RowGroup>
          {RAMADAN.bayaan.slots.map(b => (
            <RmRow key={b.when} k={b.when} v={b.speaker || tbc} sub={b.subject} first />))}
        </RowGroup>

        <Heading>{t("ramadan.i_tikaf", "I’tikaf")}</Heading>
        <Card>
          <P>{t("ramadan.staying_in_the_masjid_for",
                "Staying in the masjid for the last ten nights of Ramadan, brothers only.")}</P>
          <P>{t("ramadan.places_are_limited_so_booking",
                "Places are limited, so booking is asked for — book your place in the app.")}</P>
        </Card>
        <RowGroup>
          <RmRow first k={t("ramadan.begins", "Begins")} v={it.begins} />
          <RmRow first k={t("ramadan.who", "Who")} v={it.who} />
          <RmRow first k={t("ramadan.places", "Places")} v={places} />
          <RmRow first k={t("ramadan.book_by", "Book by")} v={it.bookBy || tbc} />
          <View style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
            <Note>{it.asks}</Note>
          </View>
        </RowGroup>

        <Heading>{t("ramadan.zakat_al_fitr", "Zakat al-Fitr")}</Heading>
        <Card>
          <P>{t("ramadan.due_per_person_in_the",
                "Due per person in the household, before the Eid prayer.")}</P>
        </Card>
        <RowGroup>
          <RmRow first k={t("ramadan.amount", "Amount")} v={RAMADAN.fitrana.amount || tbc} />
          <View style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
            <Note>{RAMADAN.fitrana.note}</Note>
          </View>
        </RowGroup>

        {/* Eid belongs on this screen the morning after the last night, which
            is the whole reason the section stays open a day past the month. */}
        {!!(last && last.nightsToEid <= 0) && (
          <View>
            <Heading>{t("ramadan.eid_al_fitr", "Eid al-Fitr")}</Heading>
            <RowGroup>
              <RmRow k={t("ramadan.jamaah", "Jamāʿah")} v={RAMADAN.eid.jamaats || tbc}
                     sub={RAMADAN.eid.venue} first />
              <View style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
                <Note>{RAMADAN.eid.note}</Note>
              </View>
            </RowGroup>
          </View>)}

        <Heading>{t("ramadan.parking", "Parking")}</Heading>
        <Card>
          <P>{t("ramadan.the_masjid_car_park_is",
                "The masjid car park is on Draycott Street. Please use it first.")}</P>
          <P>{t("ramadan.when_it_is_full_park",
                "When it is full, park with consideration for our neighbours and the wider "
                + "community — never across a driveway. The masjid sits on a main road, so "
                + "take care pulling out, and keep hold of children.")}</P>
        </Card>

        {/* ---- the last ten nights, once they are the ones being prayed ---- */}
        {!!(st && st.lastTen) && (
          <View>
            <Heading>{t("ramadan.the_last_ten_nights", "The last ten nights")}</Heading>
            <Card>
              <Text style={{ fontFamily: F.sansBold, fontSize: fs(10.5), letterSpacing: 1.9,
                             textTransform: "uppercase", color: C.goldInk, textAlign: align }}>
                {RAMADAN.lastTen.kicker}
              </Text>
              <P>{RAMADAN.lastTen.lead}</P>
              <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap", marginTop: 3 }}>
                {odds.map(n => (
                  <View key={n}
                        style={{ minWidth: 46, borderRadius: 11, paddingVertical: 9,
                                 alignItems: "center",
                                 backgroundColor: n === st.night ? C.gold : C.tintGold,
                                 borderWidth: 1, borderColor: "rgba(198,162,76,.4)" }}>
                    <Text style={{ fontFamily: F.display, fontSize: fs(17),
                                   color: n === st.night ? C.brand900 : C.goldInk }}>{n}</Text>
                  </View>))}
              </View>
            </Card>
          </View>)}

        <Heading>{t("ramadan.on_laylat_al_qadr", "On Laylat al-Qadr")}</Heading>
        <Dua ar="اللَّهُمَّ إِنَّكَ عَفُوٌّ تُحِبُّ الْعَفْوَ فَاعْفُ عَنِّي"
             tr={t("ramadan.allahumma_innaka_afuwwun_tuhibbul",
                   "Allāhumma innaka ʿafuwwun tuḥibbul-ʿafwa faʿfu ʿannī")}
             en={t("ramadan.o_allah_you_are_most",
                   "O Allah, You are most forgiving, and You love to forgive, so forgive me.")}
             src={t("ramadan.sunan_ibn_majah", "Sunan Ibn Mājah")} />

        <PageFoot note={t("ramadan.dates_follow_the_masjid_s",
                          "Dates follow the masjid’s own timetable and the sighting of the moon, "
                          + "so the first night can move by a day.")} />
      </View>
    </Screen>
  );
}

export default function Ramadan() {
  const { t, fs } = useApp();

  /* Re-read the clock every second but only re-render when the MINUTE turns,
     which is the smallest thing on screen. A countdown that set state sixty
     times a minute to redraw the same digits would cost more than it shows. */
  const [now, setNow] = useState(() => nowLondon());
  useEffect(() => {
    const id = setInterval(() => {
      const next = nowLondon();
      setNow(prev =>
        Math.floor(next.getTime() / 60000) === Math.floor(prev.getTime() / 60000) ? prev : next);
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const access = useMemo(() => ramadanAccess(now, allDays()), [now]);

  const view = useMemo(() => {
    const days = allDays();

    /* Open, so the poster is not drawn and there is nothing to count. Said
       here rather than below the hooks: an open month carries no first-night
       date to count to, and firstNightBegins(undefined) is not a thing to
       find out at runtime in Ramadan. */
    if (access.open) return null;

    /* Nothing left to count to: the published year has not arrived and even
       the estimate is behind us. Only then does the screen go wordy. */
    if (access.phase === "awaiting") {
      return { kind: "words",
               phrase: t("ramadan.dates_to_be_confirmed", "Dates to be confirmed"),
               when: t("ramadan.on_the_sighting_of_the", "On the sighting of the moon") };
    }

    const left = countdown(now, firstNightBegins(access.iso, days));
    return {
      kind: "count",
      cells: [
        { n: String(left.days), label: t("ramadan.days", "Days") },
        { n: pad2(left.hours), label: t("ramadan.hours", "Hours") },
        { n: pad2(left.minutes), label: t("ramadan.minutes", "Minutes") },
      ],
      /* An estimated date says so in plainer words than a published one does.
         Both are subject to the sighting; only one of them is the masjid's. */
      when: access.estimated
        ? t("ramadan.subject_to_moon_sighting", "Subject to moon sighting")
        : t("ramadan.on_the_sighting_of_the", "On the sighting of the moon"),
    };
  }, [access, now, t]);

  /* THE GATE, AND THE ONLY PLACE IT IS ASKED. Everything below this line is
     the poster; everything in Month is the month. src/ramadan.js decides
     which, so the rule is tested rather than read. */
  if (access.open) return <Month access={access} now={now} />;

  return (
    <Screen scroll={false} pad={false} bg={C.brand900}>
      <LinearGradient
        colors={[C.brand700, C.brand800, C.brand900]}
        locations={[0, 0.44, 1]}
        style={{ flex: 1, alignItems: "center", justifyContent: "space-between",
                 paddingHorizontal: 34, paddingTop: 54, paddingBottom: 40 }}>

        {/* THE MOTIF, AS AN OUTLINE. ui.jsx's Girih fills the star, which at
            this size is a stain across the middle of the screen rather than a
            watermark behind it — the first render had a solid plum star
            swallowing the words. Drawn here instead, hairline and unfilled,
            the way the App Store frames and the widget draw it. */}
        <Star size={560} color={C.gold} opacity={0.3} width={0.35} />
        <Star size={330} color={C.goldBright} opacity={0.22} width={0.5} />

        {/* 1. the words */}
        <View style={{ alignItems: "center" }}>
          <Text style={{ fontFamily: F.sansBold, fontSize: fs(10.5), color: C.gold,
                         letterSpacing: 3.4, textTransform: "uppercase" }}>
            {t("ramadan.ramadan", "Ramadan")}
          </Text>
          <Text style={{ fontFamily: F.display, fontSize: fs(38), lineHeight: fs(42),
                         color: C.cream, textAlign: "center", marginTop: 14 }}>
            {t("ramadan.ramadan_is_coming", "Ramadan is coming")}
          </Text>
          <View style={{ width: 46, height: 2, backgroundColor: C.gold,
                         opacity: 0.9, marginTop: 20 }} />
        </View>

        {/* 2. the count, holding the middle */}
        <View style={{ alignItems: "center", width: "100%" }}>
          {view.kind === "count" ? (
            <View style={{ flexDirection: "row", gap: 9, width: "100%" }}>
              {view.cells.map(c => (
                <View key={c.label}
                      style={{ flex: 1, borderWidth: 1, borderColor: "rgba(220,187,99,0.34)",
                               borderRadius: 18, paddingVertical: 15,
                               backgroundColor: "rgba(243,239,227,0.045)", alignItems: "center" }}>
                  <Text style={{ fontFamily: F.display, fontSize: fs(36), color: C.cream }}>
                    {c.n}
                  </Text>
                  <Text style={{ fontFamily: F.sansBold, fontSize: fs(9), color: C.gold,
                                 letterSpacing: 1.9, textTransform: "uppercase", marginTop: 9 }}>
                    {c.label}
                  </Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={{ fontFamily: F.display, fontSize: fs(34), lineHeight: fs(40),
                           color: C.cream, textAlign: "center" }}>
              {view.phrase}
            </Text>
          )}
          <Text style={{ fontFamily: F.sansMedium, fontSize: fs(12.5),
                         color: "rgba(243,239,227,0.6)", textAlign: "center", marginTop: 22 }}>
            {view.when}
          </Text>
        </View>

        {/* 3. the mark */}
        <View style={{ alignItems: "center" }}>
          <Image source={require("../../assets/logo.png")}
                 style={{ width: 164, height: 116, resizeMode: "contain" }}
                 accessibilityLabel={t("a11y.taiyabah_masjid", "Taiyabah Masjid")} />
          <Text style={{ fontFamily: F.sansSemi, fontSize: fs(8.5),
                         color: "rgba(243,239,227,0.42)", letterSpacing: 2.2,
                         textTransform: "uppercase", marginTop: 16, textAlign: "center" }}>
            {t("app.bolton_central_islamic_society", "Bolton Central Islamic Society")}
          </Text>
        </View>
      </LinearGradient>
    </Screen>
  );
}
