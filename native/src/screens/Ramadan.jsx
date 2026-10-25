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
import React, { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, Image, Switch, Share } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { C, F, R } from "../theme";
import Svg, { Polygon } from "react-native-svg";
import { Screen, Hero, Heading, Card, RowGroup, P, Note, PageFoot, Press, tap, open } from "../ui";
import { useApp } from "../store";
import { allDays } from "../timetable";
import { shortDate, dowDay } from "../dates";
import { nowLondon, pretty } from "../prayer";
import { ramadanAccess, firstNightBegins, countdown, sehriEnds } from "../ramadan";
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

/* Sehri is the masjid's own cushion before Fajr — ramadan.js owns the number,
   because the reminder cards, the nightly notification and the website all
   have to agree with it. Iftar is Maghrib to the minute. */
function ramTimes(iso, days) {
  const rec = days && days[iso];
  if (!rec || !rec.begins) return {};
  return {
    sehri: sehriEnds(rec.begins.fajr),
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

/* ---- the layer on top of the month ------------------------------------ *
 *
 * The month answers "what is happening". This answers "and what do I do about
 * it": read tonight's juz, hear taraweeh if you cannot get to the masjid, be
 * told when sehri ends, and reach the timetable, the zakāt calculator or the
 * car park without going back to the menu. The website's own, component for
 * component.
 */

/* How many nights are shown ahead of tonight before "All 30 nights". */
const AHEAD = 4;

/* Where the month has got to in the Qurʼan. */
function Progress({ st, onRead }) {
  const { t, fs, rtl } = useApp();
  const pages = juzPages(st.juz);
  return (
    <Card>
      <View style={{ flexDirection: rtl ? "row-reverse" : "row", alignItems: "center", gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: F.sansSemi, fontSize: fs(14), color: C.ink,
                         textAlign: rtl ? "right" : "left" }}>
            {t("ramadan.tonights_juz", "Tonight’s juz")}
          </Text>
          <Text style={{ fontFamily: F.sans, fontSize: fs(12), color: C.muted, marginTop: 2,
                         textAlign: rtl ? "right" : "left" }}>
            {t("ramadan.juz_n", "Juz {n}").replace("{n}", String(st.juz))
              + (pages ? " · " + t("ramadan.pages_a_b", "pages {a}–{b}")
                   .replace("{a}", String(pages.from)).replace("{b}", String(pages.to)) : "")}
          </Text>
        </View>
        <Press onPress={() => { tap(); onRead(pages && pages.from); }}
               style={{ borderWidth: 1, borderColor: C.line, borderRadius: R.pill,
                        paddingHorizontal: 13, paddingVertical: 7 }}>
          <Text style={{ fontFamily: F.sansSemi, fontSize: fs(12.5), color: C.goldInk }}>
            {t("ramadan.read_it", "Read it")}
          </Text>
        </Press>
      </View>
      <View style={{ height: 7, borderRadius: R.pill, backgroundColor: C.line, overflow: "hidden" }}>
        <View style={{ width: `${(st.night / st.total * 100).toFixed(1)}%`, height: 7,
                       borderRadius: R.pill, backgroundColor: C.brand700 }} />
      </View>
      <View style={{ flexDirection: rtl ? "row-reverse" : "row", justifyContent: "space-between", gap: 8 }}>
        <Text style={{ fontFamily: F.sansSemi, fontSize: fs(11), color: C.muted }}>
          {t("ramadan.juz_n_of_m", "Juz {n} of {m}")
            .replace("{n}", String(st.juz)).replace("{m}", String(Math.min(st.total, 30)))}
        </Text>
        <Text style={{ fontFamily: F.sans, fontSize: fs(11), color: C.muted }}>
          {st.nightsToEid > 0
            ? t("ramadan.n_nights_to_go", "{n} nights to go").replace("{n}", String(st.nightsToEid))
            : t("ramadan.the_last_night", "The last night")}
        </Text>
      </View>
    </Card>
  );
}

/* Who is leading it, and — while it is actually being prayed — the stream. */
function Leading({ onAir, onRota, onListen }) {
  const { t, fs, rtl } = useApp();
  const tbc = t("ramadan.to_be_confirmed", "To be confirmed");
  /* BUILT from the rota rather than written out, so the summary cannot come
     to disagree with the list it summarises — which is exactly what a
     hand-written summary does the year the arrangement changes. */
  const ls = RAMADAN.taraweeh.leaders || [];
  const named = ls.filter(l => l.name);
  const rest = ls.length - named.length;
  const who = !named.length ? tbc
    : rest ? t("ramadan.x_and_n_students", "{who} and {n} students")
               .replace("{who}", named.map(l => l.name).join(", ")).replace("{n}", String(rest))
           : named.map(l => l.name).join(", ");
  const row = { flexDirection: rtl ? "row-reverse" : "row", alignItems: "center",
                gap: 12, paddingVertical: 13, paddingHorizontal: 16 };
  return (
    <RowGroup>
      <View style={row}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: F.sansSemi, fontSize: fs(14), color: C.ink,
                         textAlign: rtl ? "right" : "left" }}>
            {t("ramadan.leading", "Leading")}
          </Text>
          <Text style={{ fontFamily: F.sans, fontSize: fs(12), color: C.muted, marginTop: 2,
                         textAlign: rtl ? "right" : "left" }}>{who}</Text>
        </View>
        <Press onPress={() => { tap(); onRota(); }}>
          <Text style={{ fontFamily: F.sansSemi, fontSize: fs(12.5), color: C.goldInk }}>
            {t("ramadan.who_leads", "Who leads")} ›
          </Text>
        </Press>
      </View>
      {onAir ? (
        <View style={[row, { backgroundColor: C.tintPlum }]}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: C.onAir }} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: F.sansSemi, fontSize: fs(14), color: C.ink,
                           textAlign: rtl ? "right" : "left" }}>
              {t("ramadan.taraweeh_is_on_air", "Taraweeh is on air")}
            </Text>
            <Text style={{ fontFamily: F.sans, fontSize: fs(12), color: C.muted, marginTop: 2,
                           textAlign: rtl ? "right" : "left" }}>
              {t("ramadan.listen_from_home", "Listen from home")}
            </Text>
          </View>
          <Press onPress={() => { tap(); onListen(); }}
                 style={{ backgroundColor: C.brand700, borderRadius: R.pill,
                          paddingHorizontal: 15, paddingVertical: 8 }}>
            <Text style={{ fontFamily: F.sansSemi, fontSize: fs(12.5), color: C.cream }}>
              {t("home.listen", "Listen")}
            </Text>
          </Press>
        </View>) : null}
    </RowGroup>
  );
}

/* The nudge people actually want, and the one place in the app they will say
   yes to it. The same setting as the switch on Notifications — KeepReminders
   watches the prefs and re-arms the week the moment either one moves. */
function Remind() {
  const { t, fs, rtl, alerts, setAlerts } = useApp();
  const title = t("ramadan.sehri_iftar_reminders", "Sehri & iftar reminders");
  const sub = t("ramadan.a_nudge_before_sehri_ends",
                "A nudge 20 minutes before sehri ends, and one at iftar.");
  return (
    <View style={{ flexDirection: rtl ? "row-reverse" : "row", alignItems: "center", gap: 13,
                   backgroundColor: C.tintPlum, borderRadius: R.card,
                   paddingHorizontal: 16, paddingVertical: 15, marginTop: 12 }}>
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: F.sansSemi, fontSize: fs(14), color: C.ink,
                       textAlign: rtl ? "right" : "left" }}>{title}</Text>
        <Text style={{ fontFamily: F.sans, fontSize: fs(12), lineHeight: fs(18), color: C.muted,
                       marginTop: 3, textAlign: rtl ? "right" : "left" }}>{sub}</Text>
      </View>
      <Switch value={!!alerts.ramadan} onValueChange={v => { tap(); setAlerts({ ramadan: v }); }}
              accessibilityLabel={`${title}. ${sub}`}
              trackColor={{ false: "#D9D2C0", true: C.brand600 }}
              thumbColor="#FFFFFF" activeThumbColor="#FFFFFF" ios_backgroundColor={C.line} />
    </View>
  );
}

/* The three things people reach for. */
function Tiles({ onTimes, onShare, onZakat }) {
  const { t, fs } = useApp();
  const [said, setSaid] = useState(false);
  const tile = { flex: 1, backgroundColor: C.card, borderWidth: 1, borderColor: C.line,
                 borderRadius: R.tile, paddingTop: 13, paddingBottom: 12, paddingHorizontal: 10,
                 alignItems: "center", gap: 7 };
  const lab = { fontFamily: F.sansSemi, fontSize: fs(11.5), lineHeight: fs(15),
                color: C.ink, textAlign: "center" };
  return (
    <View style={{ flexDirection: "row", gap: 9, marginTop: 12 }}>
      <Press onPress={() => { tap(); onTimes(); }} style={tile}>
        <Ionicons name="calendar-outline" size={19} color={C.brand700} />
        <Text style={lab}>{t("ramadan.timetable", "Timetable")}</Text>
      </Press>
      <Press onPress={async () => { tap(); if (await onShare()) { setSaid(true); setTimeout(() => setSaid(false), 1600); } }}
             style={tile}>
        <Ionicons name="share-outline" size={19} color={C.brand700} />
        <Text style={lab}>{said ? t("ramadan.copied", "Copied") : t("ramadan.share", "Share")}</Text>
      </Press>
      <Press onPress={() => { tap(); onZakat(); }} style={tile}>
        <Ionicons name="star-outline" size={19} color={C.brand700} />
        <Text style={lab}>{t("ramadan.zakat", "Zakat")}</Text>
      </Press>
    </View>
  );
}

/* One night: its number and date, its juz and pages, and a way in. */
function NightRow({ n, now, onRead }) {
  const { t, fs, rtl } = useApp();
  const pages = juzPages(n.juz);
  const d = new Date(n.iso + "T12:00:00");
  return (
    <Press onPress={() => { tap(); onRead(pages && pages.from); }}
           style={{ flexDirection: rtl ? "row-reverse" : "row", alignItems: "center", gap: 11,
                    paddingVertical: 11, paddingHorizontal: 14,
                    backgroundColor: now ? C.tintPlum : "transparent" }}>
      <View style={{ width: 40, alignItems: "center" }}>
        <Text style={{ fontFamily: F.display, fontSize: fs(now ? 18 : 17),
                       color: now ? C.brand700 : C.ink }}>{n.night}</Text>
        <Text style={{ fontFamily: F.sansSemi, fontSize: fs(9), letterSpacing: 0.5,
                       textTransform: "uppercase", color: C.muted, marginTop: 1 }}>
          {dowDay(t, d)}
        </Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: F.sansSemi, fontSize: fs(13.5), color: C.ink,
                       textAlign: rtl ? "right" : "left" }}>
          {t("ramadan.juz_n", "Juz {n}").replace("{n}", String(n.juz))}
        </Text>
        {!!pages && (
          <Text style={{ fontFamily: F.sans, fontSize: fs(11.5), color: C.muted, marginTop: 2,
                         textAlign: rtl ? "right" : "left" }}>
            {t("ramadan.pages_a_b", "pages {a}–{b}")
              .replace("{a}", String(pages.from)).replace("{b}", String(pages.to))}
          </Text>)}
      </View>
      <View style={{ borderRadius: R.pill, paddingHorizontal: now ? 13 : 12,
                     paddingVertical: now ? 7 : 6,
                     backgroundColor: now ? C.brand700 : "transparent",
                     borderWidth: now ? 0 : 1, borderColor: C.line }}>
        <Text style={{ fontFamily: F.sansSemi, fontSize: fs(11.5),
                       color: now ? C.cream : C.goldInk }}>{t("ramadan.read", "Read")}</Text>
      </View>
    </Press>
  );
}

/* One juz a night, laid out night by night. */
function Nights({ st, onRead }) {
  const { t, fs, rtl } = useApp();
  const [all, setAll] = useState(false);
  const [past, setPast] = useState(false);
  const nights = [...st.past, st.tonight, ...st.ahead];
  const behind = nights.filter(n => n.night < st.night);
  const ahead = nights.filter(n => n.night > st.night);
  const shown = all ? ahead : ahead.slice(0, AHEAD);

  return (
    <View>
      <Heading tag={t("ramadan.one_juz", "One juz")}>
        {t("ramadan.night_by_night", "Night by night")}
      </Heading>
      <RowGroup>
        {behind.length && !past ? (
          <Press onPress={() => { tap(); setPast(true); }}
                 style={{ flexDirection: rtl ? "row-reverse" : "row", alignItems: "center",
                          gap: 11, paddingVertical: 12, paddingHorizontal: 14,
                          backgroundColor: C.paper }}>
            <View style={{ width: 40, alignItems: "center" }}>
              <Text style={{ fontFamily: F.display, fontSize: fs(15), color: C.muted }}>
                {`1–${behind.length}`}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: F.sansSemi, fontSize: fs(13), color: C.muted,
                             textAlign: rtl ? "right" : "left" }}>
                {t("ramadan.n_nights_behind_you", "{n} nights behind you")
                  .replace("{n}", String(behind.length))}
              </Text>
              <Text style={{ fontFamily: F.sans, fontSize: fs(11.5), color: C.muted, marginTop: 2,
                             textAlign: rtl ? "right" : "left" }}>
                {t("ramadan.juz_a_to_b_look_back", "Juz {a} to {b} · tap to look back")
                  .replace("{a}", "1").replace("{b}", String(behind.length))}
              </Text>
            </View>
            <Ionicons name="chevron-down" size={16} color={C.muted} />
          </Press>
        ) : behind.map(n => <NightRow key={n.night} n={n} onRead={onRead} />)}

        <NightRow n={st.tonight} now onRead={onRead} />
        {shown.map(n => <NightRow key={n.night} n={n} onRead={onRead} />)}

        {ahead.length > AHEAD ? (
          <Press onPress={() => { tap(); setAll(v => !v); }}
                 style={{ paddingVertical: 12, paddingHorizontal: 14, alignItems: "center" }}>
            <Text style={{ fontFamily: F.sansSemi, fontSize: fs(12.5), color: C.goldInk }}>
              {(all ? t("ramadan.fewer_nights", "Fewer nights")
                    : t("ramadan.all_n_nights", "All {n} nights").replace("{n}", String(st.total)))} ›
            </Text>
          </Press>) : null}
      </RowGroup>
    </View>
  );
}

/* Taraweeh is prayed after Isha. "On air" is offered from the Isha jamāʿah
   until the clock turns over, which is the window the stream actually carries
   it in — a row saying the masjid is broadcasting when it is not sends people
   to a player that would play silence. */
function onAirNow(tm, now) {
  if (!tm || !tm.isha) return false;
  const [h, m] = String(tm.isha).split(":").map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return false;
  return now.getHours() * 60 + now.getMinutes() >= h * 60 + m;
}

function Month({ access, now, navigation }) {
  const { t, fs, rtl } = useApp();
  /* "Who leads ›" goes to the rota further down this same screen, which on
     the website is an anchor and here is a measured offset. The ScrollView is
     reached through Screen's `...rest`; the rota reports where it landed. */
  const scroller = useRef(null);
  const rotaY = useRef(0);
  const go = (name, params) => navigation && navigation.navigate(name, params);
  const read = page => { if (page) go("Mushaf", { page }); };
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

  /* Tonight's two times, as a line somebody can send to their family. */
  const share = async () => {
    if (!st) return false;
    const message = [
      t("ramadan.day_n", "Day {n}").replace("{n}", String(st.night)) + " · "
        + shortDate(t, new Date(iso + "T12:00:00")),
      t("ramadan.sehri_ends", "Sehri ends") + " " + (tm.sehri ? pretty(tm.sehri) : "—"),
      t("ramadan.iftar", "Iftar") + " " + (tm.iftar ? pretty(tm.iftar) : "—"),
      "Taiyabah Masjid",
    ].join("\n");
    try { await Share.share({ message }); } catch { /* cancelled is not failed */ }
    return false;
  };

  return (
    <Screen pad={false} ref={scroller}>
      <Hero ring={MOON} lines={[{ k: "ramadan.ramadan", t: "Ramadan", w: "eyebrow" }]}>
        {!!st && (
          <View>
            <View style={{ alignItems: rtl ? "flex-end" : "flex-start", marginTop: 4 }}>
              {!!st.year && (
                <Text style={{ fontFamily: F.sansBold, fontSize: fs(10), letterSpacing: 2.2,
                               textTransform: "uppercase", color: C.gold, opacity: 0.85,
                               marginBottom: 9 }}>
                  {t("ramadan.n_ah", "{n} AH").replace("{n}", String(st.year))}
                </Text>)}
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
            {/* The juz used to be a second row here and again, by name, on
                the progress card below — the same two words twice on one
                screen, which reads as a bug rather than as emphasis. It
                belongs on the card that can say more about it than its own
                name. */}
            <RowGroup>
              <RmRow first k={t("ramadan.isha_jamaah", "Isha jamāʿah")}
                     v={tm.isha ? pretty(tm.isha) : tbc} />
            </RowGroup>
            <Progress st={st} onRead={read} />
          </View>)}

        {/* Leading, the nudge and the tiles need no night: the week before
            Ramadan is exactly when somebody turns the reminder on, and a
            blank where the switch should be is that week going to waste. */}
        <Leading onAir={onAirNow(tm, now)} onListen={() => go("Live")}
                 onRota={() => scroller.current
                   && scroller.current.scrollTo({ y: Math.max(0, rotaY.current - 12), animated: true })} />
        <Remind />
        <Tiles onTimes={() => go("Timetable")} onZakat={() => go("Zakat")} onShare={share} />

        <Heading>{t("ramadan.on_sighting_the_new_moon", "On sighting the new moon")}</Heading>
        <Dua ar="اللَّهُمَّ أَهْلِلْهُ عَلَيْنَا بِالْيُمْنِ وَالإِيمَانِ وَالسَّلاَمَةِ وَالإِسْلاَمِ رَبِّي وَرَبُّكَ اللَّهُ"
             tr={t("ramadan.allahumma_ahlilhu_alayna_bil_yumni",
                   "Allāhumma ahlilhu ʿalaynā bil-yumni wal-īmāni was-salāmati wal-islām. "
                   + "Rabbī wa Rabbukallāh")}
             en={t("ramadan.o_allah_bring_it_over",
                   "O Allah, bring it over us with blessing and faith, with safety and with "
                   + "Islam. My Lord and your Lord is Allah.")}
             src={t("ramadan.jami_al_tirmidhi", "Jāmiʿ al-Tirmidhī")} />

        <View onLayout={e => { rotaY.current = e.nativeEvent.layout.y; }}>
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
        </View>
        {!!st && <Nights st={st} onRead={read} />}

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
          {/* Somebody reading the parking advice is on their way. The address
              is the masjid's own, not the Centre's. */}
          <Press onPress={() => { tap(); open("https://maps.apple.com/?q=31a+Draycott+Street+Bolton+BL1+8HD"); }}
                 style={{ flexDirection: rtl ? "row-reverse" : "row", alignItems: "center", gap: 10,
                          paddingTop: 12, borderTopWidth: 1, borderTopColor: C.line }}>
            <Ionicons name="location-outline" size={18} color={C.brand700} />
            <Text style={{ flex: 1, fontFamily: F.sansSemi, fontSize: fs(13.5), color: C.ink,
                           textAlign: rtl ? "right" : "left" }}>
              {t("ramadan.directions", "Directions")}
            </Text>
            <Ionicons name={rtl ? "chevron-back" : "chevron-forward"} size={16} color={C.muted} />
          </Press>
        </Card>

        {/* ---- the last ten nights, once they are the ones being prayed ---- */}
        {!!(st && st.lastTen) && (
          <View>
            <Heading tag={t("ramadan.a_b_ramadan", "{a} – {b} Ramadan")
                          .replace("{a}", String(st.total - 9)).replace("{b}", String(st.total))}>
              {t("ramadan.the_last_ten_nights", "The last ten nights")}
            </Heading>
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

export default function Ramadan({ navigation }) {
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
  if (access.open) return <Month access={access} now={now} navigation={navigation} />;

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
