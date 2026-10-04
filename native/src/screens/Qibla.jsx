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
import { View, Text, Animated, Easing } from "react-native";
import Svg, { Circle, Line, Path, G } from "react-native-svg";
import { Magnetometer } from "expo-sensors";
import * as Location from "expo-location";
import { Ionicons } from "@expo/vector-icons";
import { C, F, R } from "../theme";
import { useApp } from "../store";
import { Screen, Hero, Card, Note, CTA, RowGroup, KV, Pill } from "../ui";

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

export default function Qibla() {
  const { t, fs } = useApp();
  const [from, setFrom] = useState({ ...MASJID, mine: false });
  const [heading, setHeading] = useState(null);
  const [denied, setDenied] = useState(false);
  const spin = useRef(new Animated.Value(0)).current;
  const last = useRef(0);

  const qibla = bearingTo(from.lat, from.lon);
  const km = kmTo(from.lat, from.lon);

  /* The magnetometer. Averaged over a short window, because the raw reading
   * from a phone jitters by several degrees and a needle that twitches reads as
   * broken rather than as precise. */
  useEffect(() => {
    let sub;
    Magnetometer.isAvailableAsync().then(ok => {
      if (!ok) return;
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
  }, []);

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

  const locate = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") { setDenied(true); return; }
    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    setFrom({ lat: pos.coords.latitude, lon: pos.coords.longitude, mine: true });
  };

  const rotate = spin.interpolate({ inputRange: [-360, 360], outputRange: ["-360deg", "360deg"] });
  /* With a compass, the needle sits at the bearing relative to where the phone
   * points. Without one, the dial stays north-up and the needle shows the
   * absolute bearing — still useful with a paper compass or the sun. */
  const aligned = heading !== null && Math.abs(((qibla - heading + 540) % 360) - 180) < 4;

  return (
    <Screen pad={false}>
      <Hero lines={[{ t: t("tiles.qibla", "Qibla"), w: "title" },
                    { t: t("qibla.hold_flat", "Hold the phone flat and turn until the needle meets the mark."), w: "sub" }]} />
      <View style={{ paddingHorizontal: 16 }}>
        <View style={{ alignItems: "center", marginTop: 22 }}>
          <Animated.View style={{ width: DIAL, height: DIAL, transform: [{ rotate }] }}>
            <Svg width={DIAL} height={DIAL} viewBox="0 0 100 100">
              <Circle cx="50" cy="50" r="48" fill={C.card} stroke={C.line} strokeWidth="0.8" />
              <Circle cx="50" cy="50" r="38" fill="none" stroke={C.line} strokeWidth="0.5" />
              {/* 72 ticks, every sixth one long — the same dial the web app drew
                  with 72 absolutely positioned divs. */}
              {Array.from({ length: 72 }, (_, i) => {
                const a = rad(i * 5), major = i % 6 === 0;
                const r1 = 48, r2 = 48 - (major ? 5 : 2.6);
                return <Line key={i} stroke={major ? C.brand600 : C.line} strokeWidth={major ? 0.8 : 0.5}
                             opacity={major ? 0.85 : 0.75}
                             x1={50 + r1 * Math.sin(a)} y1={50 - r1 * Math.cos(a)}
                             x2={50 + r2 * Math.sin(a)} y2={50 - r2 * Math.cos(a)} />;
              })}
              {/* The Qibla mark on the rim. */}
              <G rotation={qibla} origin="50, 50">
                <Path d="M50 1.5 L53.4 9 L46.6 9 Z" fill={C.gold} />
                <Line x1="50" y1="9" x2="50" y2="17" stroke={C.gold} strokeWidth="0.9" />
              </G>
              {/* North. */}
              <G rotation={0} origin="50, 50">
                <Line x1="50" y1="12" x2="50" y2="20" stroke={C.muted} strokeWidth="0.7" />
              </G>
              {/* The needle. */}
              <G rotation={qibla} origin="50, 50">
                <Path d="M50 14 L55 50 L50 56 L45 50 Z" fill={aligned ? C.onAir : C.brand600} />
                <Path d="M50 86 L46.5 50 L50 44 L53.5 50 Z" fill="rgba(124,110,119,.35)" />
              </G>
              <Circle cx="50" cy="50" r="4.2" fill={C.card} stroke={aligned ? C.onAir : C.brand600} strokeWidth="1.1" />
            </Svg>
          </Animated.View>

          <View style={{ alignItems: "center", marginTop: 18, gap: 4 }}>
            <Text style={{ fontFamily: F.display, fontSize: fs(44), color: C.ink }}>{qibla.toFixed(0)}°</Text>
            {aligned
              ? <Pill tone="live">{t("qibla.facing", "You are facing the Qibla")}</Pill>
              : heading === null
                ? <Pill>{t("qibla.no_compass", "No compass on this phone — dial is north-up")}</Pill>
                : <Pill tone="gold">{t("qibla.turn_until", "Turn until the needle meets the mark")}</Pill>}
          </View>
        </View>

        <RowGroup style={{ marginTop: 24 }}>
          <KV k={t("sheet.bearing", "Bearing")} v={`${qibla.toFixed(1)}° ${t("qibla.true", "true")}`} />
          <KV k={t("qibla.distance", "Distance to the Kaʿbah")} v={`${Math.round(km).toLocaleString("en-GB")} km`} />
          <KV k={t("sheet.measured_from", "Measured from")}
              v={from.mine ? t("qibla.your_location", "Your location") : t("about.taiyabah_masjid", "Taiyabah Masjid")} />
        </RowGroup>

        {!from.mine && (
          <CTA label={t("qibla.use_my_location", "Use my location instead")} onPress={locate} tone="gold" />
        )}
        {denied && (
          <View style={{ marginTop: 11 }}>
            <Note>{t("qibla.denied",
              "Location is turned off for this app, so the bearing is the one from the masjid. Within Bolton the difference is a fraction of a degree.")}</Note>
          </View>)}

        <Card style={{ marginTop: 18 }}>
          <View style={{ flexDirection: "row", gap: 10, alignItems: "flex-start" }}>
            <Ionicons name="magnet-outline" size={18} color={C.muted} style={{ marginTop: 1 }} />
            <Note>{t("qibla.calibrate",
              "A phone compass is thrown off by anything magnetic — a car, a radiator, a metal table. If the needle wanders, move away from it and wave the phone in a figure of eight.")}</Note>
          </View>
        </Card>
      </View>
    </Screen>
  );
}
