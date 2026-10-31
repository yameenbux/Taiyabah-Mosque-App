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
import { View, Text, Image, Pressable, Platform, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
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
export function HajjScreen({ children, foot = true, top = 18, lamp = "2%",
                            scrollRef, bar }) {
  return (
    <View style={{ flex: 1, backgroundColor: HJ.ground }}>
      <Lamp at={lamp} />
      {/* bg transparent so the ground shows through the column; Screen still
          supplies the 520px cap, the 16px gutter and the offline-bar room. */}
      <Screen ref={scrollRef} bg="transparent" top={top}>
        {children}
        {foot ? <HajjFoot /> : null}
        {/* room for the bar to sit over, so it never covers the last item */}
        {bar ? <View style={{ height: 58 }} /> : null}
      </Screen>
      {bar}
    </View>
  );
}

/** THE JUMP BAR — the section names, fixed at the bottom of the screen.
 *
 *  A branch is one scroll of everything it holds, which is right at home and
 *  wrong in the Ḥaram: during ṭawāf you want "Ṭawāf, point by point", and
 *  reaching it means scrolling past thirteen entries you are not doing right
 *  now, one-handed, in a crowd. These are the sections, and a tap goes
 *  straight there.
 *
 *  AT THE BOTTOM, not the top, because that is where the thumb already is.
 *  A bar at the top would be the same list and a reach away. */
/* "Ṭawāf, point by point" is a good heading and a bad chip: four of them
   filled the bar twice over and the last was off the edge. A section's name
   is the part before its comma — "Ṭawāf", "Saʿī", "For women" — which is
   what somebody is looking for anyway. The Arabic comma counts too. */
const chipOf = title => String(title || "").split(/[,،—]/)[0].trim() || title;

export function HajjJumpBar({ labels, onJump }) {
  const { fs, rtl } = useApp();
  const insets = useSafeAreaInsets();
  if (!labels || labels.length < 2) return null;
  return (
    <View style={{ position: "absolute", left: 0, right: 0, bottom: 0,
                   paddingBottom: insets.bottom + 8, paddingTop: 8,
                   backgroundColor: HJ.barGround, borderTopWidth: 1,
                   borderTopColor: HJ.panelLine }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingHorizontal: 12, gap: 8,
                                           flexDirection: rtl ? "row-reverse" : "row" }}>
        {labels.map((label, i) => (
          <Pressable key={i} onPress={() => onJump(i)} accessibilityRole="button"
                     accessibilityLabel={label}
                     /* 42px tall, which is the smallest a chip can be and
                        still be hit without looking at it */
                     style={({ pressed }) => ({
                       minHeight: 42, justifyContent: "center", paddingHorizontal: 14,
                       borderRadius: R.pill, borderWidth: 1,
                       borderColor: pressed ? HJ.goldLine : HJ.panelLine,
                       backgroundColor: pressed ? HJ.panelHi : HJ.panel })}>
            <Text numberOfLines={1}
                  style={{ fontFamily: F.sansSemi, fontSize: fs(12.5), color: HJ.inkSoft }}>
              {chipOf(label)}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
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

/** A branch as a TILE rather than a row.
 *
 *  WHY THE SECTION FRONT IS A GRID. A full-width row is 88px of screen to
 *  carry a glyph and two short lines, and seven of them under three headings
 *  do not fit a phone — so the one screen a pilgrim opens in the Ḥaram asked
 *  them to scroll to find the counters. Two columns put every branch above
 *  the fold and inside the thumb's arc, which is the whole requirement: one
 *  hand, the other holding the izār, in a crowd, in the sun.
 *
 *  The tile keeps the row's skin so the section still looks like itself, and
 *  `lit` still marks the counters — the one thing here that is a tool rather
 *  than a text, and the one most likely to be opened mid-ṭawāf. */
export function HajjTile({ icon, label, detail, tone, wide, onPress }) {
  const { fs, rtl } = useApp();
  const lit = tone === "gold";
  return (
    <Panel tone={tone} onPress={onPress} accessibilityLabel={label}
           style={wide
             ? { flex: 1, minHeight: 68, padding: 11, gap: 11, alignItems: "center",
                 flexDirection: rtl ? "row-reverse" : "row" }
             : { flex: 1, minHeight: 98, padding: 11, justifyContent: "space-between" }}>
      <View style={[{ width: 30, height: 30, alignItems: "center", justifyContent: "center" },
                    lit && { borderRadius: 10, backgroundColor: HJ.goldFill }]}>
        {icon}
      </View>
      <View style={wide ? { flex: 1 } : null}>
        <Text numberOfLines={2}
              style={{ fontFamily: F.sansSemi, fontSize: fs(14.5), lineHeight: fs(19),
                       color: HJ.ink, textAlign: rtl ? "right" : "left" }}>{label}</Text>
        {!!detail && (
          <Text numberOfLines={2}
                style={{ fontFamily: F.sans, fontSize: fs(11.5), lineHeight: fs(15.5),
                         color: HJ.inkFaint, marginTop: 2,
                         textAlign: rtl ? "right" : "left" }}>{detail}</Text>)}
      </View>
    </Panel>
  );
}

/** Tiles laid two to a row, with an odd one left at its own width rather than
 *  stretched across — a half-width tile beside a gap reads as a grid; a
 *  full-width one reads as a row that lost its friends. */
export function HajjTileGrid({ children }) {
  const { rtl } = useApp();
  const items = React.Children.toArray(children);
  const rows = [];
  for (let i = 0; i < items.length; i += 2) rows.push(items.slice(i, i + 2));
  return (
    <View style={{ marginTop: 9 }}>
      {rows.map((row, i) => (
        <View key={i} style={{ flexDirection: rtl ? "row-reverse" : "row", gap: 10,
                               marginTop: i === 0 ? 0 : 10 }}>
          {/* An odd branch count left half the row empty on three of the four
              stages — a third of the screen carrying nothing, on the screen
              that most needs the room. A lone tile takes the whole width and
              lays itself out sideways instead, which is a different shape
              rather than a stretched one. */}
          {row.length === 1 ? React.cloneElement(row[0], { wide: true }) : row}
        </View>
      ))}
    </View>
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
