/* Which way to face.
 *
 * The web app could only ask the browser for a compass heading, which on
 * Android means a permission prompt inside a permission prompt and on iOS means
 * nothing at all unless the page is served over HTTPS and the user taps first.
 * Here we read the magnetometer directly — this is the screen that most
 * obviously had to stop being a web page.
 *
 * Cross-check: from the masjid this gives 118.3°, matching the published Qibla
 * direction for Bolton (118°).
 */
import React, { useEffect, useRef, useState } from "react";
import { View, Text, Animated, Easing, Pressable } from "react-native";
import Svg, { Circle, Line, Path, G, Polygon, Rect, Defs, RadialGradient, Stop, Text as SvgText } from "react-native-svg";
import { Magnetometer } from "expo-sensors";
import * as Location from "expo-location";
import { Ionicons } from "@expo/vector-icons";
import { C, F, R, SHADOW, LIGHT } from "../theme";
import { useApp } from "../store";
import { LinearGradient } from "expo-linear-gradient";
import { Screen, TopBar, Heading, Card, Note, tap } from "../ui";

const KAABA  = { lat: 21.4224779, lon: 39.8251832 };
const MASJID = { lat: 53.5869, lon: -2.4361 };
const rad = d => (d * Math.PI) / 180;

function bearingTo(lat, lon) {
  const p1 = rad(lat), p2 = rad(KAABA.lat), dl = rad(KAABA.lon - lon);
  const y = Math.sin(dl) * Math.cos(p2);
  const x = Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dl);
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}
function kmTo(lat, lon) {
  const R6 = 6371, p1 = rad(lat), p2 = rad(KAABA.lat);
  const dp = rad(KAABA.lat - lat), dl = rad(KAABA.lon - lon);
  const a = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
  return 2 * R6 * Math.asin(Math.sqrt(a));
}

const DIAL = 268;

export default function Qibla({ navigation }) {
  const { t, fs, rtl } = useApp();
  const [from, setFrom] = useState({ ...MASJID, mine: false });
  const [heading, setHeading] = useState(null);
  const [denied, setDenied] = useState(false);
  /* The website does not read the compass until you ask it to — that is what
     "Use my phone's compass" is for. The app subscribed to the magnetometer
     the moment the screen opened, which left that button, once it was drawn,
     with nothing to do. It does what it says now, and the sensor is off until
     somebody wants it. */
  const [live, setLive] = useState(false);
  const spin = useRef(new Animated.Value(0)).current;
  const last = useRef(0);

  const qibla = bearingTo(from.lat, from.lon);
  const km = kmTo(from.lat, from.lon);

  /* The magnetometer. Averaged over a short window, because the raw reading
   * from a phone jitters by several degrees and a needle that twitches reads as
   * broken rather than as precise. */
  useEffect(() => {
    if (!live) { setHeading(null); return; }
    let sub;
    Magnetometer.isAvailableAsync().then(ok => {
      if (!ok) { setHeading(null); setLive(false); return; }
      Magnetometer.setUpdateInterval(120);
      const window = [];
      sub = Magnetometer.addListener(({ x, y }) => {
        let deg = Math.atan2(y, x) * 180 / Math.PI;
        deg = (90 - deg + 360) % 360;
        window.push(deg);
        if (window.length > 6) window.shift();
        /* A plain mean is wrong across the 359→0 seam; average the vectors. */
        const sx = window.reduce((s, d) => s + Math.cos(rad(d)), 0);
        const sy = window.reduce((s, d) => s + Math.sin(rad(d)), 0);
        setHeading((Math.atan2(sy, sx) * 180 / Math.PI + 360) % 360);
      });
    }).catch(() => {});
    return () => sub?.remove();
  }, [live]);

  /* Animate along the short way round, so turning past north does not send the
   * dial the long way about. */
  useEffect(() => {
    if (heading === null) return;
    let target = -heading;
    while (target - last.current > 180) target -= 360;
    while (target - last.current < -180) target += 360;
    last.current = target;
    Animated.timing(spin, { toValue: target, duration: 160, easing: Easing.out(Easing.quad),
                            useNativeDriver: true }).start();
  }, [heading, spin]);

  /* The website asks the browser for a position as the screen opens and
   * silently keeps the masjid's bearing if it is refused — there is no button
   * for it, because within Bolton the difference is a fraction of a degree and
   * nobody should have to press something to get a number that was already
   * right. The app had made it a second plum button under the table, so the
   * screen carried two large buttons where the website has one.
   *
   * So: ask once, on open, exactly as the site does. A refusal sets the note
   * that explains which bearing is being shown and why. */
  useEffect(() => {
    let gone = false;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") { if (!gone) setDenied(true); return; }
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        if (!gone) setFrom({ lat: pos.coords.latitude, lon: pos.coords.longitude, mine: true });
      } catch { if (!gone) setDenied(true); }
    })();
    return () => { gone = true; };
  }, []);

  const rotate = spin.interpolate({ inputRange: [-360, 360], outputRange: ["-360deg", "360deg"] });
  /* With a compass, the needle sits at the bearing relative to where the phone
   * points. Without one, the dial stays north-up and the needle shows the
   * absolute bearing — still useful with a paper compass or the sun. */
  const aligned = heading !== null && Math.abs(((qibla - heading + 540) % 360) - 180) < 4;

  return (
    /* Qibla is one of the website's seven PAGES, not a sheet: it wears the app
       bar — the wordmark, the society's name and the bell — and names itself
       in a section heading, "Qibla direction ——— From the masjid". The app
       gave it a plum hero instead and moved the calibration sentence up into
       it, so the screen announced itself twice and the instruction arrived
       before there was anything to calibrate. */
    <Screen pad={false} bg={C.paper}>
      <LinearGradient colors={[C.brand900, C.brand800]} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}>
        <TopBar navigation={navigation} />
      </LinearGradient>
      <View style={{ paddingHorizontal: 16, paddingTop: 6 }}>
        <Heading tag={from.mine ? t("qibla.your_location", "Your location")
                                : t("sheet.from_the_masjid", "From the masjid")}>
          {t("sheet.qibla_direction", "Qibla direction")}</Heading>

        {/* .qcard — the dial, the reading, the button and the note are ONE
            card, padded 20/16/16 and centred. These were loose on the paper
            with the button below a separate table. */}
        <Card pad={0} style={{ paddingTop: 20, paddingHorizontal: 16, paddingBottom: 16, alignItems: "center" }}>
          <Animated.View style={{ width: DIAL, height: DIAL, transform: [{ rotate }] }}>
            <Svg width={DIAL} height={DIAL} viewBox="0 0 100 100">
              <Defs>
                <RadialGradient id="face" cx="50%" cy="45%" r="72%">
                  <Stop offset="0" stopColor="#FFFFFF" />
                  <Stop offset="1" stopColor="#F6F2E6" />
                </RadialGradient>
              </Defs>
              {/* .dial-ring is a radial gradient from white to #F6F2E6 at 72%,
                  inside a single hairline — not a flat card fill.
                  THE DIAL FACE IS CREAM IN BOTH THEMES: it is an instrument,
                  the way a real compass has a pale face, and it is the one
                  surface in the app that does not follow the page. So its
                  markings are taken from LIGHT in both themes too — read from
                  C they would inverted with everything else, and the dark
                  theme drew a salmon N and pale grey W/E/S on cream. */}
              <Circle cx="50" cy="50" r="49.5" fill="url(#face)" stroke={LIGHT.line} strokeWidth="0.5" />
              {/* .ticks i — 72 hairlines in #D8D0BB, every one the same. The
                  app made every sixth one long and PLUM, which turned a
                  compass face into a decorated plum dial. */}
              {Array.from({ length: 72 }, (_, i) => {
                const a = rad(i * 5), r1 = 48.2, r2 = 45.4;
                return <Line key={i} stroke="#D8D0BB" strokeWidth="0.45"
                             x1={50 + r1 * Math.sin(a)} y1={50 - r1 * Math.cos(a)}
                             x2={50 + r2 * Math.sin(a)} y2={50 - r2 * Math.cos(a)} />;
              })}
              {/* .cardinal — N, E, S and W at 12px bold in the muted grey, N in
                  the danger red. The app drew none of them, so the dial could
                  not be read as a compass at all. */}
              {[["N", 0], ["E", 90], ["S", 180], ["W", 270]].map(([ltr, deg]) => {
                const a = rad(deg), r = 41;
                return (
                  <SvgText key={ltr} x={50 + r * Math.sin(a)} y={50 - r * Math.cos(a) + 2.4}
                           fontSize="6.4" fontWeight="700" textAnchor="middle"
                           fill={ltr === "N" ? LIGHT.danger : LIGHT.muted}>{ltr}</SvgText>);
              })}
              {/* .needle — ONE gold arrow with a thin gold stem at 55%, and the
                  kaaba tile on the rim at its head. The app drew a plum
                  two-tone needle instead, so the only gold on the dial was a
                  mark the needle never met. */}
              <G rotation={qibla} origin="50, 50">
                <Polygon points="50,9 57,32 50,28 43,32" fill={C.gold} />
                <Line x1="50" y1="28" x2="50" y2="84" stroke={C.gold} strokeWidth="1.25" opacity="0.55" />
              </G>
              <Circle cx="50" cy="50" r="2.75" fill={C.brand800} stroke="rgba(255,255,255,.9)" strokeWidth="1.5" />
            </Svg>
            {/* .kaaba — a 26px gold tile on the rim with the Kaʿbah in it. */}
            <View style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0,
                           transform: [{ rotate: `${qibla}deg` }] }}>
              <View style={{ position: "absolute", top: -2, left: DIAL / 2 - 13, width: 26, height: 26,
                             borderRadius: 7, backgroundColor: C.gold, alignItems: "center",
                             justifyContent: "center", ...SHADOW }}>
                <Svg width={16} height={16} viewBox="0 0 24 24">
                  <Rect x="4" y="6" width="16" height="14" rx="1.5" fill="#0C3B2A" />
                  <Rect x="4" y="10" width="16" height="2.6" fill="#C6A24C" />
                </Svg>
              </View>
            </View>
          </Animated.View>

          {/* .qbig is 40px at weight 600 over a 12.5px muted line. */}
          <View style={{ alignItems: "center", marginTop: 10 }}>
            <Text style={{ fontFamily: F.display, fontSize: fs(40), lineHeight: fs(44), color: C.ink }}>
              {qibla.toFixed(0)}°</Text>
            <Text style={{ fontFamily: F.sans, fontSize: fs(12.5), color: C.muted, marginTop: 4,
                           textAlign: "center" }}>
              {/* The website's own string is the WHOLE line with the distance
                  dropped into it — "from true north · {km} km to Makkah" —
                  so a language can put the number where it belongs. Gluing
                  three fragments together here made the order English's. */}
              {from.mine
                ? t("qibla.from_true_north", "from true north · {km} km to Makkah")
                    .replace("{km}", Math.round(km).toLocaleString("en-GB"))
                : t("sheet.from_true_north_5_042", "from true north · 5,042 km to Makkah")}</Text>
          </View>

          {/* .enable — a brand-700 to brand-800 gradient at 13px of radius,
              15px semibold cream, full width. Once it is on, the website
              swaps it for a #F0E9ED panel with plum text and no lift. */}
          <Pressable onPress={() => { tap(); setLive(v => !v); }}
            style={({ pressed }) => [{ width: "100%", marginTop: 12, borderRadius: 13, overflow: "hidden",
                                       opacity: pressed ? 0.9 : 1 },
                                     live ? { borderWidth: 1, borderColor: C.line } : SHADOW]}>
            {live ? (
              <View style={{ paddingVertical: 14, alignItems: "center", backgroundColor: C.tintPlum }}>
                <Text style={{ fontFamily: F.sansSemi, fontSize: fs(15), letterSpacing: 0.2, color: C.brand600 }}>
                  {t("qibla.compass_on", "Compass on")}</Text>
              </View>
            ) : (
              <LinearGradient colors={[C.ctaTop, C.ctaBot]} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
                style={{ paddingVertical: 14, alignItems: "center" }}>
                <Text style={{ fontFamily: F.sansSemi, fontSize: fs(15), letterSpacing: 0.2, color: C.cream }}>
                  {t("sheet.use_my_phone_s_compass", "Use my phone's compass")}</Text>
              </LinearGradient>)}
          </Pressable>

          {/* .qnote — 11.5px muted, inside the card under the button, which is
              where it means something. It had been hoisted into the hero. */}
          <Text style={{ fontFamily: F.sans, fontSize: fs(11.5), lineHeight: fs(18), color: C.muted,
                         marginTop: 11, textAlign: "center" }}>
            {live && heading === null
              /* The website says what to DO about it, with the bearing in the
                  sentence. "dial is north-up" describes the screen; it does
                  not help somebody standing in a room trying to face Makkah. */
              ? t("qibla.no_compass",
                  "This device has no compass. Face {d}° using a compass app, or follow the mihrab in the masjid.")
                  .replace("{d}", qibla.toFixed(0))
              : t("sheet.hold_the_phone_flat_compasses",
                  "Hold the phone flat. Compasses drift near metal, cars and speakers — turn in a figure-of-eight to calibrate.")}
          </Text>
        </Card>

        {/* .qhelp — THREE rows, not four. "From the masjid" is the section
            tag at the top of the screen, not a row of its own. */}
        <Card pad={0} style={{ marginTop: 14, paddingHorizontal: 15, paddingVertical: 4 }}>
          {[[t("sheet.bearing", "Bearing"),
             /* From the masjid this is the website's own line, so it reads in
                the reader's language and in their numerals; from the reader's
                own position it has to be computed. */
             from.mine ? `${qibla.toFixed(1)}° ${t("qibla.true", "true")}`
                       : t("sheet.118_true", "118.3° true")],
            [t("sheet.distance", "Distance"),
             from.mine ? `${Math.round(km).toLocaleString("en-GB")} km` : t("sheet.5_042_km", "5,042 km")],
            [t("sheet.measured_from", "Measured from"),
             from.mine ? t("qibla.your_location", "Your location") : t("sheet.taiyabah_masjid", "Taiyabah Masjid")],
          ].map(([k, v], i) => (
            <View key={i} style={{ flexDirection: rtl ? "row-reverse" : "row", alignItems: "center",
                                   justifyContent: "space-between", paddingVertical: 12,
                                   borderTopWidth: i ? 1 : 0, borderTopColor: C.line }}>
              {/* .qh-k is 12px uppercase tracked .1em; .qh-v 14.5px at 600. */}
              <Text style={{ fontFamily: F.sans, fontSize: fs(12), letterSpacing: 1.2,
                             textTransform: "uppercase", color: C.muted }}>{k}</Text>
              <Text style={{ fontFamily: F.sansSemi, fontSize: fs(14.5), color: C.ink }}>{v}</Text>
            </View>))}
        </Card>

        {denied && (
          <View style={{ marginTop: 11 }}>
            <Note>{t("qibla.denied",
              "Location is turned off for this app, so the bearing is the one from the masjid. Within Bolton the difference is a fraction of a degree.")}</Note>
          </View>)}

        {/* .qfoot — what a phone compass is not, centred at 11.5px. The magnet
            card above it was the app's own: the website says the same thing in
            .qnote, inside the card, which it now does here too. */}
        <Text style={{ fontFamily: F.sans, fontSize: fs(11.5), lineHeight: fs(18.5), color: C.muted,
                       textAlign: "center", marginTop: 14, marginHorizontal: 6 }}>
          {t("sheet.a_phone_compass_is_a",
             "A phone compass is a guide, not a survey instrument. If in doubt, follow the mihrab in the masjid.")}
        </Text>
      </View>
    </Screen>
  );
}
