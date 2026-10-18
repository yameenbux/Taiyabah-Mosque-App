/* Ramadan — the guard, and the countdown to the month.
 *
 * WHAT THIS SCREEN IS FOR RIGHT NOW. The Ramadan section is built but shut:
 * the schedules, the iʿtikāf booking and the nightly juz are all designed and
 * none of them has anything to say until the committee has published the
 * year Ramadan falls in and settled who is leading. Until then this is what
 * the row opens: a poster, not a page. The words, the count, the mark.
 *
 * WHEN IT OPENS is not decided here — src/ramadan.js decides it, so that the
 * rule can be tested rather than read. Ten days before the first night, and
 * one day past the last.
 *
 * WHY THERE IS NOTHING ELSE ON IT. The first draft carried a reminders
 * toggle, a list of what was coming, two preparation tiles and a duʿā. All of
 * it was defensible and all of it was wrong: a screen that exists to say one
 * thing should say one thing. Everything that was explaining itself has gone.
 */
import React, { useEffect, useMemo, useState } from "react";
import { View, Text, Image } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { C, F } from "../theme";
import Svg, { Polygon } from "react-native-svg";
import { Screen } from "../ui";
import { useApp } from "../store";
import { allDays } from "../timetable";
import { nowLondon } from "../prayer";
import { ramadanAccess, firstNightBegins, countdown } from "../ramadan";

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

  const view = useMemo(() => {
    const days = allDays();
    const access = ramadanAccess(now, days);

    /* The section being open is not this screen's business yet — the month
       itself is still to be built — so an open month reads as "it begins
       tonight" rather than pretending to be the page it will become. */
    if (access.open) {
      return { kind: "words",
               phrase: t("ramadan.it_begins_tonight", "It begins tonight"),
               when: t("ramadan.first_taraweeh_after_isha", "First taraweeh after Isha") };
    }

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
      when: t("ramadan.on_the_sighting_of_the", "On the sighting of the moon"),
    };
  }, [now, t]);

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
