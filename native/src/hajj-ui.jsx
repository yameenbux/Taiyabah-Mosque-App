/* Mishkāt — the shared furniture of the Hajj & Umrah section.
 * Copyright (c) 2026 Yameen Bux. All rights reserved. See LICENSE.md.
 *
 * Every screen in the section is built from these pieces, so the look is
 * defined once rather than re-typed on three screens and allowed to drift.
 * The website half is the .hj-* block in index.html and the two are the same
 * design: same ground, same panels, same ink, same mark at the foot.
 *
 * THE LAMP is the whole idea. One warm source, everything below lit by it
 * and falling away into plum. It is drawn as a real radial gradient rather
 * than faked with stacked linear ones, because a fake one bands visibly on
 * an OLED phone in a dark room — which is exactly where this section gets
 * opened: a hotel room in Makkah at three in the morning.
 *
 * THE GROUND IS NOT THE APP'S DARK MODE. The section is this whether the
 * phone is set to light or dark, the way the Ramadan screen is always plum.
 * HJ in theme.js holds the values and the measurement behind each one.
 */
import React from "react";
import { View, Text, Image, Pressable, Platform } from "react-native";
import Svg, { Defs, RadialGradient, LinearGradient, Stop, Rect, Path } from "react-native-svg";
import { F, R, HJ } from "./theme";
import { useApp } from "./store";
import { Screen } from "./ui";

/* The ground and the lamp, behind everything. pointerEvents none so it can
   never swallow a touch meant for a panel sitting on top of it. */
function Lamp({ at }) {
  return (
    <View pointerEvents="none"
          style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}>
      <Svg width="100%" height="100%">
        <Defs>
          <LinearGradient id="hjGround" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={HJ.groundTop} />
            <Stop offset="0.40" stopColor={HJ.groundMid} />
            <Stop offset="1" stopColor={HJ.ground} />
          </LinearGradient>
          {/* rx/ry rather than r: the glow is wider than it is tall, which is
              what makes it read as light falling across a room and not as a
              circle somebody drew. */}
          <RadialGradient id="hjLamp" cx="50%" cy={at} rx="80%" ry="34%">
            <Stop offset="0" stopColor="#C6A24C" stopOpacity="0.30" />
            <Stop offset="1" stopColor="#C6A24C" stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#hjGround)" />
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#hjLamp)" />
      </Svg>
    </View>
  );
}

/** Every screen in the section.
 *
 *  `lamp` moves the source: at the top for a screen that is read, behind the
 *  dial for the counter, where the dial is the composition.
 *  `foot` turns off the mark, for the same reason. */
export function HajjScreen({ children, foot = true, top = 18, lamp = "2%" }) {
  return (
    <View style={{ flex: 1, backgroundColor: HJ.ground }}>
      <Lamp at={lamp} />
      {/* bg transparent so the ground shows through the column; Screen still
          supplies the 520px cap, the 16px gutter and the offline-bar room. */}
      <Screen bg="transparent" top={top}>
        {children}
        {foot ? <HajjFoot /> : null}
      </Screen>
    </View>
  );
}

/* The mark at the foot, where design C had a star behind the words. Small and
   centred: it signs the screen rather than decorating it, and it is the same
   placement and the same two lines the Ramadan screen ends on. */
export function HajjFoot() {
  const { t, fs } = useApp();
  return (
    <View style={{ alignItems: "center", marginTop: 34, paddingBottom: 4 }}>
      <Image source={require("../assets/logo.png")}
             style={{ width: 118, height: 84, resizeMode: "contain", opacity: 0.92 }}
             accessibilityLabel={t("a11y.taiyabah_masjid", "Taiyabah Masjid")} />
      <Text style={{ fontFamily: F.sansSemi, fontSize: fs(8.5), letterSpacing: 2.2,
                     textTransform: "uppercase", color: HJ.inkFaint, marginTop: 12,
                     textAlign: "center" }}>
        {t("app.bolton_central_islamic_society", "Bolton Central Islamic Society")}
      </Text>
    </View>
  );
}

/* Which of the three panels. `gold` is the lit one — one per screen at most,
   or it stops meaning anything. `warn` is dam, and only ever dam. */
function skinOf(tone) {
  if (tone === "gold") return { backgroundColor: HJ.goldPanel, borderColor: HJ.goldLine };
  if (tone === "warn") return { backgroundColor: HJ.warnPanel, borderColor: HJ.warnLine };
  return { backgroundColor: HJ.panel, borderColor: HJ.panelLine };
}

/** A frosted panel, pressable or not.
 *
 *  It does NOT go through <Press>. Press composes its pressed background
 *  BEFORE the caller's style, so a panel that sets its own backgroundColor —
 *  which every panel here does — wins and the press feedback disappears
 *  silently. On the cream screens that is a plum tint going missing; on this
 *  ground it would be every row in the section with no feedback at all. So
 *  the pressed state is composed here, where it can lighten rather than
 *  darken, and the accessibility props are spread after the defaults the same
 *  way Press spreads them. */
export function Panel({ children, tone = "plain", style, onPress, disabled, ...rest }) {
  const shape = [{ borderRadius: R.card, borderWidth: 1, padding: 16 }, skinOf(tone), style];
  if (!onPress) return <View style={shape} {...rest}>{children}</View>;
  return (
    <Pressable onPress={onPress} disabled={disabled}
               android_ripple={{ color: "rgba(243,239,227,.09)" }}
               accessibilityRole="button"
               accessibilityState={{ disabled: !!disabled }}
               {...rest}
               style={({ pressed }) => [
                 ...shape,
                 /* lighten, never dim: a dark panel that goes darker on press
                    looks like a dead row rather than a pressed one. */
                 pressed && Platform.OS !== "android"
                   ? { backgroundColor: HJ.panelHi, borderColor: HJ.goldLine } : null,
                 disabled ? { opacity: 0.45 } : null,
               ]}>
      {children}
    </Pressable>
  );
}

/** The display line that opens a screen. */
export function HajjTitle({ children, size = 27 }) {
  const { fs, rtl } = useApp();
  return (
    <Text style={{ fontFamily: F.display, fontSize: fs(size), lineHeight: fs(size + 6),
                   color: HJ.ink, textAlign: rtl ? "right" : "left" }}>{children}</Text>
  );
}

/** The paragraph under it. */
export function HajjLead({ children, center }) {
  const { fs, rtl } = useApp();
  return (
    <Text style={{ fontFamily: F.sans, fontSize: fs(14.5), lineHeight: fs(23), color: HJ.inkSoft,
                   marginTop: 10, textAlign: center ? "center" : rtl ? "right" : "left" }}>
      {children}
    </Text>
  );
}

/** The small uppercase gold label that opens a group. */
export function HajjKicker({ children, style }) {
  const { fs, rtl } = useApp();
  return (
    <Text style={[{ fontFamily: F.sansBold, fontSize: fs(10.5), letterSpacing: 2.6,
                    textTransform: "uppercase", color: HJ.gold,
                    textAlign: rtl ? "right" : "left" }, style]}>{children}</Text>
  );
}

/** A chip: the "coming soon" pill, a verdict, a count. */
export function HajjChip({ children, tone = "plain", style }) {
  const { fs } = useApp();
  const ink = tone === "warn" ? HJ.warn : tone === "gold" ? HJ.gold : HJ.ink;
  return (
    <View style={[{ borderWidth: 1, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
                  skinOf(tone), style]}>
      <Text style={{ fontFamily: F.sansBold, fontSize: fs(9.5), letterSpacing: 0.8,
                     textTransform: "uppercase", color: ink }}>{children}</Text>
    </View>
  );
}

/** A row that goes somewhere: a branch on the front, a link at the foot.
 *
 *  ONLY THE GOLD ROW GETS A GOLD TILE. Eight rows each with a gold square
 *  behind the icon drew a bright vertical stripe down the left edge that was
 *  louder than any of the titles, and gold stopped meaning "this one is
 *  different" because everything was. The plain rows carry the glyph on its
 *  own now, and the chevron goes with them. */
export function HajjRow({ icon, label, detail, trail, tone, onPress }) {
  const { fs, rtl } = useApp();
  const lit = tone === "gold";
  return (
    <Panel tone={tone} onPress={onPress} accessibilityLabel={label}
           style={{ flexDirection: rtl ? "row-reverse" : "row", alignItems: "center",
                    gap: lit ? 14 : 12, paddingVertical: 15, marginTop: 11 }}>
      <View style={[{ width: 38, height: 38, alignItems: "center", justifyContent: "center" },
                    lit && { borderRadius: 12, backgroundColor: HJ.goldFill }]}>
        {icon}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: F.sansSemi, fontSize: fs(15.5), color: HJ.ink,
                       textAlign: rtl ? "right" : "left" }}>{label}</Text>
        {!!detail && (
          /* Two lines, hard. A row subtitle that wraps to four turns the list
             back into the wall this grouping exists to undo, and a longer
             translation must not be able to do that. */
          <Text numberOfLines={2}
                style={{ fontFamily: F.sans, fontSize: fs(12.5), lineHeight: fs(18.5),
                         color: HJ.inkFaint, marginTop: 2,
                         textAlign: rtl ? "right" : "left" }}>{detail}</Text>)}
      </View>
      {!!trail && (
        <Text style={{ fontFamily: F.display, fontSize: fs(17), color: HJ.gold }}>{trail}</Text>)}
    </Panel>
  );
}

/* The chevron, drawn rather than taken from Ionicons so that it is the same
   stroke weight as the rest of the section's line work and the same mark the
   website draws. The subset font's chevron is heavier and sits differently. */
export function HajjChevron({ color = HJ.inkFaint, size = 18, back }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color}
         strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d={back ? "M15 18l-6-6 6-6" : "M9 18l6-6-6-6"} />
    </Svg>
  );
}
