/* The prayer times tab.
 *
 * The web app put this behind a sheet with a toggle. Here it is a tab of its
 * own, because it is the second-most-asked question in the app after "when is
 * the next jamāʿah" and should never be more than one tap away.
 */
import React, { useMemo, useState } from "react";
import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { C, F, R, SHADOW } from "../theme";
import { LinearGradient } from "expo-linear-gradient";
import { useApp } from "../store";
import { Screen, Hero, Heading, Card, Note, Press, Pill, NavRow, RowGroup, PageFoot, tap, TopBar } from "../ui";
import { dayFor, pretty, nowLondon, londonInstant, NAMES, ORDER, nextJamaah } from "../prayer";
import { dayMonthYear, fullDow, shortDate, hijri } from "../dates";

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
              : offset === 1 ? t("times.tomorrow", "tomorrow")
              : offset === -1 ? t("times.yesterday", "Yesterday")
              /* Beyond yesterday/tomorrow the website names the DAY and
                 nothing else — the date itself is the line underneath. */
              : fullDow(t, when);

  return (
    <Screen pad={false}>
      {/* Prayer Times is one of the website's seven PAGES: the app bar above
          it, then the day stepper and the three chips ON THE PAPER, as plain
          white controls. The app put all of it inside a plum hero with its
          own title and the Hijri date, so the screen named itself twice and
          the stepper and chips were gold-on-plum — a different set of
          controls from the ones the website draws. */}
      <LinearGradient colors={[C.brand900, C.brand800]} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}>
        <TopBar navigation={navigation} />
      </LinearGradient>

      {/* .datenav — two 42px cards either side of a .daypick card, 14px of
          padding above, 8px between. */}
      <View style={{ flexDirection: rtl ? "row-reverse" : "row", alignItems: "center", gap: 8,
                     paddingHorizontal: 16, paddingTop: 14 }}>
        <Press onPress={() => step(-1)}
          accessibilityRole="button" accessibilityLabel={t("a11y.previous_day", "Previous day")}
          style={[{ width: 42, height: 42, borderRadius: 12, alignItems: "center", justifyContent: "center",
                    borderWidth: 1, borderColor: C.line, backgroundColor: C.card }, SHADOW]}>
          <Ionicons name={rtl ? "chevron-forward" : "chevron-back"} size={22} color={C.ink} />
        </Press>
        <Press onPress={() => { tap(); setOffset(0); }}
          style={[{ flex: 1, paddingVertical: 7, paddingHorizontal: 10, borderRadius: 12,
                    alignItems: "center", borderWidth: 1, borderColor: C.line,
                    backgroundColor: C.card }, SHADOW]}>
          <Text style={{ fontFamily: F.sansSemi, fontSize: fs(15), color: C.ink }}>{label}</Text>
          <Text style={{ fontFamily: F.sans, fontSize: fs(11.5), color: C.muted, marginTop: 1 }}>
            {/* .dn-sub is the Gregorian date alone. The Hijri date sits on the
                home screen's hero on both the website and here, so naming it
                again on this line only crowds the control. */}
            {dayMonthYear(t, when)}</Text>
        </Press>
        <Press onPress={() => step(1)}
          accessibilityRole="button" accessibilityLabel={t("a11y.next_day", "Next day")}
          style={[{ width: 42, height: 42, borderRadius: 12, alignItems: "center", justifyContent: "center",
                    borderWidth: 1, borderColor: C.line, backgroundColor: C.card }, SHADOW]}>
          <Ionicons name={rtl ? "chevron-back" : "chevron-forward"} size={22} color={C.ink} />
        </Press>
      </View>

      {/* .chip — 12.5px semibold on a white pill inside a hairline, muted;
          chosen, it fills BRAND-700 with cream. These were gold outlines on
          plum, which is a different control in a different place. */}
      <View style={{ flexDirection: rtl ? "row-reverse" : "row", gap: 7,
                     paddingHorizontal: 16, paddingTop: 10 }}>
        {[{ k: "today", lab: t("app.today", "Today"), on: offset === 0, go: () => setOffset(0) },
          { k: "fri", lab: t("app.next_jumu_ah", "Next Jumuʿah"), on: offset === jumuah,
            go: () => setOffset(jumuah), off: !dayFor(jumuahDate) },
          { k: "month", lab: t("app.full_month", "Full month"),
            go: () => navigation.navigate("Timetable") }].map(c => (
          <Press key={c.k} disabled={c.off} onPress={() => { tap(); c.go(); }}
            style={{ paddingHorizontal: 13, paddingVertical: 8, borderRadius: R.pill, borderWidth: 1,
                     borderColor: c.on ? C.brand700 : C.line,
                     backgroundColor: c.on ? C.brand700 : C.card,
                     opacity: c.off ? 0.35 : 1 }}>
            <Text style={{ fontFamily: F.sansSemi, fontSize: fs(12.5),
                           color: c.on ? C.cream : C.muted }}>{c.lab}</Text>
          </Press>))}
      </View>

      <View style={{ paddingHorizontal: 16 }}>
        {!day ? (
          <Card><Note>{t("times.off_timetable", "That date is outside the published timetable.")}</Note></Card>
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
            {/* .tt — the card is padded 6, and each .row is 13/14 at 12px of
                radius with a hairline above it. */}
            <Card gap={0} pad={6} style={{ marginTop: 2 }}>
              {/* .col-h — three columns, all three 10.5px uppercase tracked
                  .12em in the MUTED grey, the two figure columns at least
                  64px wide and right-aligned. "Jamāʿah" was gold here, and
                  "Begins" is the website's "Beginning". */}
              <View style={{ flexDirection: rtl ? "row-reverse" : "row", gap: 12,
                             paddingHorizontal: 14, paddingTop: 10, paddingBottom: 8 }}>
                <Text style={{ flex: 1, fontFamily: F.sans, fontSize: fs(10.5), letterSpacing: 1.26,
                               color: C.muted, textTransform: "uppercase" }}>
                  {t("nikah.prayer", "Prayer")}</Text>
                {[t("sheet.beginning", "Beginning"), t("sheet.jamaah", "Jamāʿah")].map((h, i) => (
                  <Text key={i} style={{ minWidth: 64, textAlign: rtl ? "left" : "right",
                                         fontFamily: F.sans, fontSize: fs(10.5), letterSpacing: 1.26,
                                         color: C.muted, textTransform: "uppercase" }}>{h}</Text>))}
              </View>
              {["fajr", "sunrise", "zuhr", "asr", "maghrib", "isha"].map((k, i) => {
                /* Only on today: a "Now" pill on a date you are merely looking
                   at would be telling you the time somewhere that is not now. */
                const isNow  = offset === 0 && mark.now === k;
                const isNext = offset === 0 && mark.next === k && mark.next !== mark.now;
                const sun = k === "sunrise";
                const jamaat = day.jamaat[k];
                return (
                  /* NOW AND NEXT WERE THE WRONG WAY ROUND. On the website the
                     current prayer is the GOLD row — a 14%-to-4% gold wash with
                     a 3px gold bar down its left edge — and the next one is an
                     ordinary row whose jamāʿah figure alone turns plum. Here
                     the gold tint was on NEXT and a plum tint on NOW, so the
                     row that catches the eye was the wrong row. */
                  <View key={k} style={{ flexDirection: rtl ? "row-reverse" : "row", alignItems: "center",
                                         gap: 12, paddingHorizontal: 14, paddingVertical: 13,
                                         borderRadius: 12,
                                         borderTopWidth: i ? 1 : 0, borderTopColor: C.line,
                                         overflow: "hidden" }}>
                    {isNow && (
                      <>
                        <LinearGradient colors={["rgba(198,162,76,.14)", "rgba(198,162,76,.04)"]}
                          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                          style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }} />
                        <View style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 3,
                                       backgroundColor: C.gold }} />
                      </>)}
                    {/* .row .name is a COLUMN: the English at 16px/600 with the
                        Arabic at 14px muted beneath it. They sat side by side
                        here, which on Urdu and Arabic ran off the row. */}
                    <View style={{ flex: 1, gap: 1 }}>
                      <View style={{ flexDirection: rtl ? "row-reverse" : "row", alignItems: "center", gap: 8 }}>
                        <Text style={{ fontFamily: F.sansSemi, fontSize: fs(16),
                                       color: sun ? C.muted : C.ink }}>
                          {t(`prayer.${k}`, NAMES[k].en)}</Text>
                        {(isNow || isNext) && (
                          /* .pill.now is a GOLD fill with near-black text;
                             .pill.next is #EFE6EC with brand-600. */
                          <Text style={{ fontFamily: F.sansBold, fontSize: fs(9.5), letterSpacing: 0.95,
                                         textTransform: "uppercase", overflow: "hidden",
                                         color: isNow ? "#3A2C07" : C.brand600,
                                         backgroundColor: isNow ? C.gold : "#EFE6EC",
                                         borderRadius: R.pill, paddingHorizontal: 7, paddingVertical: 3 }}>
                            {isNow ? t("times.now", "Now") : t("times.next", "Next")}</Text>)}
                      </View>
                      <Text style={{ fontFamily: F.arabic, fontSize: fs(14), color: C.muted,
                                     textAlign: rtl ? "right" : "left" }}>{NAMES[k].ar}</Text>
                    </View>
                    {/* .row .begins is MUTED at weight 500; .row .jam is ink at
                        600, and only .row.is-next .jam turns plum. Every
                        jamāʿah figure was plum here, so the column that is
                        meant to say "this one is next" said it six times. */}
                    <Text style={{ minWidth: 64, textAlign: rtl ? "left" : "right", fontFamily: F.sansMedium,
                                   fontSize: fs(16), color: C.muted }}>{pretty(day.begins[k])}</Text>
                    <Text style={{ minWidth: 64, textAlign: rtl ? "left" : "right",
                                   fontFamily: jamaat ? F.sansSemi : F.sans, fontSize: fs(16),
                                   color: !jamaat ? C.line : isNext ? C.brand600 : C.ink }}>
                      {jamaat ? pretty(jamaat) : "—"}</Text>
                  </View>);
              })}
            </Card>

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
                        <Text style={{ fontFamily: F.sansSemi, fontSize: fs(15), color: C.brand600 }}>
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
          {/* Gold, because .remind is a gold ribbon on the website rather than
              another grey row. It is the one row here that offers something
              instead of going somewhere. */}
          <NavRow icon="notifications-outline" tone="gold"
                  label={t("menu.notifications", "Notifications")}
                  sub={t("times.remind_sub", "Be reminded before each jamāʿah")}
                  onPress={() => navigation.navigate("Alerts")} />
        </RowGroup>

        <PageFoot note={t("sheet.times_from_the_official_2026",
          "Times from the official 2026 Salah Timetable")} />
      </View>
    </Screen>
  );
}
