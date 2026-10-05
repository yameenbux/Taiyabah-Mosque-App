/* The prayer times tab.
 *
 * The web app put this behind a sheet with a toggle. Here it is a tab of its
 * own, because it is the second-most-asked question in the app after "when is
 * the next jamāʿah" and should never be more than one tap away.
 */
import React, { useMemo, useState } from "react";
import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { C, F, R } from "../theme";
import { useApp } from "../store";
import { Screen, Hero, Heading, Card, Note, Press, Pill, NavRow, RowGroup, tap } from "../ui";
import { dayFor, pretty, nowLondon, londonInstant, NAMES, ORDER, nextJamaah } from "../prayer";
import { longDate, shortDate, hijri } from "../dates";

/* How many days from today to the jumuʿah people mean when they say "next".
 *
 * Ported from the website's nextJummah(), including the part that is easy to
 * get wrong: on a Friday it is still TODAY until the last jumuʿah has actually
 * been prayed, and only then does it become next week. Two clocks, for the
 * reason the rest of this app uses two — which Friday it is, is a London
 * question; whether it has passed is a question about this instant. */
function daysToJumuah() {
  const london = nowLondon();
  if (london.getDay() === 5) {
    const rec = dayFor(london);
    const last = rec?.jummah ? (rec.jummah.second || rec.jummah.first) : null;
    if (last && londonInstant(london, last) > new Date()) return 0;
  }
  let d = 1;
  const probe = new Date(london);
  probe.setDate(probe.getDate() + 1);
  while (probe.getDay() !== 5) { probe.setDate(probe.getDate() + 1); d++; }
  return d;
}

/* Which prayer we are IN, and which jamāʿah is still to come.
 *
 * Ported from the website, including its two awkward edges: before dawn the
 * prayer you are in is still Isha, and between sunrise and Zuhr you are in
 * none at all — so there is no "Now" to show, rather than Fajr lingering on
 * the row for five hours after it has gone. */
function nowAndNext(day, at, now) {
  const b = day.begins;
  const key = now < at(b.fajr)    ? "isha"
            : now < at(b.sunrise) ? "fajr"
            : now < at(b.zuhr)    ? null
            : now < at(b.asr)     ? "zuhr"
            : now < at(b.maghrib) ? "asr"
            : now < at(b.isha)    ? "maghrib"
            : "isha";
  let next = null;
  for (const k of ORDER) {
    const j = day.jamaat[k];
    if (j && at(j) > now) { next = k; break; }
  }
  return { now: key, next };
}

export default function PrayerTimes({ navigation }) {
  const { t, fs, rtl } = useApp();
  const [offset, setOffset] = useState(0);         // days from today
  const jumuah = daysToJumuah();
  const jumuahDate = (() => { const d = nowLondon(); d.setDate(d.getDate() + jumuah); return d; })();
  const when = nowLondon(); when.setDate(when.getDate() + offset);
  const day = dayFor(when);
  const mark = useMemo(() => (day && offset === 0)
    ? nowAndNext(day, hhmm => londonInstant(when, hhmm), new Date())
    : { now: null, next: null }, [day, offset]);
  const next = offset === 0 ? nextJamaah(when) : null;

  const step = n => { tap(); setOffset(o => o + n); };
  const label = offset === 0 ? t("app.today", "Today")
              : offset === 1 ? t("times.tomorrow", "Tomorrow")
              : offset === -1 ? t("times.yesterday", "Yesterday")
              : longDate(t, when);

  return (
    <Screen pad={false}>
      <Hero lines={[
        { t: t("nav.prayer_times", "Prayer times"), w: "title" },
        { t: day ? hijri(t, day.hijri) : "", w: "sub" },
      ]}>
        {/* Day stepper. Inside the hero so the date and the times you are
            looking at never appear in two different places on the screen. */}
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center",
                       gap: 6, marginTop: 16 }}>
          <Press onPress={() => step(-1)} style={{ padding: 9, borderRadius: R.pill }}>
            <Ionicons name="chevron-back" size={19} color={C.goldBright} />
          </Press>
          <Press onPress={() => { tap(); setOffset(0); }}
            style={{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: R.pill,
                     borderWidth: 1, borderColor: "rgba(220,187,99,.4)", minWidth: 168, alignItems: "center" }}>
            <Text style={{ fontFamily: F.sansMedium, fontSize: fs(13.5), color: C.cream }}>{label}</Text>
            <Text style={{ fontFamily: F.sans, fontSize: fs(11), color: "rgba(243,239,227,.6)", marginTop: 1 }}>
              {`${shortDate(t, when)} ${when.getFullYear()}`}
            </Text>
          </Press>
          <Press onPress={() => step(1)} style={{ padding: 9, borderRadius: R.pill }}>
            <Ionicons name="chevron-forward" size={19} color={C.goldBright} />
          </Press>
        </View>

        {/* The website's three chips. Without them the only way to a Friday was
            to press the arrow until you reached one, and the full month had no
            way in from this screen at all. */}
        <View style={{ flexDirection: "row", justifyContent: "center", flexWrap: "wrap",
                       gap: 7, marginTop: 12 }}>
          {[{ k: "today", lab: t("app.today", "Today"), on: offset === 0,
              go: () => setOffset(0) },
            { k: "fri", lab: t("app.next_jumu_ah", "Next Jumuʿah"), on: offset === jumuah,
              go: () => setOffset(jumuah), off: !dayFor(jumuahDate) },
            { k: "month", lab: t("app.full_month", "Full month"),
              go: () => navigation.navigate("Timetable") }].map(c => (
            <Press key={c.k} disabled={c.off} onPress={() => { tap(); c.go(); }}
              style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: R.pill,
                       borderWidth: 1,
                       borderColor: c.on ? C.goldBright : "rgba(243,239,227,.28)",
                       backgroundColor: c.on ? "rgba(220,187,99,.18)" : "transparent",
                       opacity: c.off ? .4 : 1 }}>
              <Text style={{ fontFamily: F.sansMedium, fontSize: fs(12.5),
                             color: c.on ? C.goldBright : "rgba(243,239,227,.85)" }}>{c.lab}</Text>
            </Press>))}
        </View>
      </Hero>

      <View style={{ paddingHorizontal: 16 }}>
        {!day ? (
          <Card><Note>{t("times.off_timetable",
            "That date is outside the published timetable. The masjid prints one year at a time.")}</Note></Card>
        ) : (
          <>
            {/* The table. A row per prayer rather than five columns, because a
                column of five-character times is unreadable at any text size
                the community actually uses. */}
            {/* The website names this card and says what the two columns are.
                Without the tag the table has two unlabelled times in it. */}
            <Heading tag={t("sheet.beginning_jama_ah", "Beginning & Jamāʿah")}>
              {offset === 0 ? t("sheet.today", "Today")
                            : `${t("app.viewing", "Viewing")} · ${shortDate(t, when)}`}</Heading>
            <Card gap={0} pad={0} style={{ marginTop: 2 }}>
              <View style={{ flexDirection: rtl ? "row-reverse" : "row", paddingHorizontal: 15,
                             paddingTop: 13, paddingBottom: 9 }}>
                <Text style={{ flex: 1, fontFamily: F.sans, fontSize: fs(10.5), letterSpacing: 1.2,
                               color: C.muted, textTransform: "uppercase" }}>
                  {t("nikah.prayer", "Prayer")}</Text>
                <Text style={{ width: 78, textAlign: "center", fontFamily: F.sans, fontSize: fs(10.5),
                               letterSpacing: 1.2, color: C.muted, textTransform: "uppercase" }}>
                  {t("sheet.begins", "Begins")}</Text>
                <Text style={{ width: 78, textAlign: "center", fontFamily: F.sans, fontSize: fs(10.5),
                               letterSpacing: 1.2, color: C.gold, textTransform: "uppercase" }}>
                  {t("sheet.jamaah", "Jamāʿah")}</Text>
              </View>
              {["fajr", "sunrise", "zuhr", "asr", "maghrib", "isha"].map(k => {
                /* Only on today: a "Now" pill on a date you are merely looking
                   at would be telling you the time somewhere that is not now. */
                const isNow  = offset === 0 && mark.now === k;
                const isNext = offset === 0 && mark.next === k && mark.next !== mark.now;
                const jamaat = day.jamaat[k];
                return (
                  <View key={k} style={{ flexDirection: rtl ? "row-reverse" : "row", alignItems: "center",
                                         paddingHorizontal: 15, paddingVertical: 13,
                                         borderTopWidth: 1, borderTopColor: C.line,
                                         backgroundColor: isNow ? "rgba(94,24,68,.07)"
                                                        : isNext ? "rgba(198,162,76,.10)" : "transparent" }}>
                    <View style={{ flex: 1, flexDirection: rtl ? "row-reverse" : "row", alignItems: "center", gap: 7,
                                   flexWrap: "wrap" }}>
                      <Text style={{ fontFamily: F.display, fontSize: fs(15.5), color: C.ink }}>
                        {t(`prayer.${k}`, NAMES[k].en)}</Text>
                      <Text style={{ fontFamily: F.arabic, fontSize: fs(15), color: C.muted }}>{NAMES[k].ar}</Text>
                      {(isNow || isNext) && (
                        <Text style={{ fontFamily: F.sansBold, fontSize: fs(9.5), letterSpacing: .9,
                                       textTransform: "uppercase", overflow: "hidden",
                                       color: isNow ? C.cream : C.goldInk,
                                       backgroundColor: isNow ? C.brand600 : "rgba(198,162,76,.22)",
                                       borderRadius: R.pill, paddingHorizontal: 7, paddingVertical: 2 }}>
                          {isNow ? t("times.now", "Now") : t("times.next", "Next")}</Text>)}
                    </View>
                    <Text style={{ width: 78, textAlign: "center", fontFamily: F.sansMedium,
                                   fontSize: fs(14.5), color: C.ink }}>{pretty(day.begins[k])}</Text>
                    <View style={{ width: 78, alignItems: "center" }}>
                      {jamaat
                        ? <Text style={{ fontFamily: F.sansMedium, fontSize: fs(14.5), color: C.brand600 }}>
                            {pretty(jamaat)}</Text>
                        : <Text style={{ fontFamily: F.sans, fontSize: fs(14), color: C.line }}>—</Text>}
                    </View>
                  </View>);
              })}
            </Card>

            <Note>{t("sheet.times_from_the_official_2026",
              "Times from the official 2026 Salah Timetable")}</Note>

            {/* Maghrib is prayed the minute it begins. That is the masjid's
                practice, and it looks like a data error unless it is said. */}
            <View style={{ marginTop: 11 }}>
              <Note>{t("times.maghrib_note",
                "Maghrib jamāʿah is at the beginning time — the masjid prays it as it comes in.")}</Note>
            </View>

            {day.jummah && (
              <>
                <Heading tag={t("sheet.friday", "Friday")}>{t("giving.jumuah", "Jumuʿah")}</Heading>
                <Card gap={0} pad={0}>
                  {[["first", t("sheet.first_jummah", "First jamāʿah")],
                    ["second", t("sheet.second_jummah", "Second jamāʿah")]].map(([k, lab], i) =>
                    day.jummah[k] ? (
                      <View key={k} style={{ flexDirection: rtl ? "row-reverse" : "row", alignItems: "center",
                                             paddingHorizontal: 15, paddingVertical: 13,
                                             borderTopWidth: i ? 1 : 0, borderTopColor: C.line }}>
                        <Text style={{ flex: 1, fontFamily: F.sans, fontSize: fs(14), color: C.ink }}>{lab}</Text>
                        <Text style={{ fontFamily: F.sansMedium, fontSize: fs(15), color: C.brand600 }}>
                          {pretty(day.jummah[k])}</Text>
                      </View>) : null)}
                </Card>
              </>
            )}
          </>
        )}

        <RowGroup style={{ marginTop: 22 }}>
          <NavRow icon="calendar-outline" label={t("menu.timetable", "Full prayer timetable")}
                  sub={t("times.whole_year", "Every day of 2026, month by month")}
                  onPress={() => navigation.navigate("Timetable")} />
          <NavRow icon="notifications-outline" label={t("menu.notifications", "Notifications")}
                  sub={t("times.remind_sub", "Be reminded before each jamāʿah")}
                  onPress={() => navigation.navigate("Alerts")} />
        </RowGroup>
      </View>
    </Screen>
  );
}
