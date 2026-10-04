/* The kit every screen is built from.
 *
 * It exists so that forty screens cannot drift from one another, and so that
 * the two things that make an app feel native — a real pressed state and type
 * that respects the reader's chosen size — are decided once rather than forty
 * times. Everything here reads the live preferences, so changing the language
 * or the text size redraws the whole app with no screen knowing about it.
 */
import React from "react";
import { View, Text, ScrollView, Pressable, Platform, Linking, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Polygon } from "react-native-svg";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Clipboard from "expo-clipboard";
import * as WebBrowser from "expo-web-browser";
import { C, F, R } from "./theme";
import { useApp } from "./store";

export const tap = () => { if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); };

/* A link leaves the app. A tel: or mailto: hands off to the dialler or the mail
 * app; a web page opens in an in-app browser that keeps our chrome around it,
 * because being thrown out to Chrome is the exact seam we are here to remove. */
export async function open(href) {
  if (!href) return;
  tap();
  try {
    if (/^(tel:|mailto:|sms:|geo:)/.test(href)) await Linking.openURL(href);
    else await WebBrowser.openBrowserAsync(href, {
      toolbarColor: C.brand900, controlsColor: C.cream, enableBarCollapsing: true,
    });
  } catch { /* nothing useful to say to the user if the OS refuses */ }
}

/* --- text ---------------------------------------------------------------- */

/* The copy uses *bold* and _italic_ in a handful of places (the masjid's name,
 * the Arabic root it comes from). Rendering that inline keeps the emphasis the
 * web app has without letting HTML into the native tree. */
export function Rich({ children, style, arabic }) {
  const { rtl } = useApp();
  const s = String(children ?? "");
  const parts = s.split(/(\*[^*]+\*|_[^_]+_)/g).filter(Boolean);
  const base = [{ writingDirection: rtl ? "rtl" : "ltr" }, style];
  if (parts.length === 1 && !/^[*_]/.test(parts[0]))
    return <Text style={base}>{s}</Text>;
  return (
    <Text style={base}>
      {parts.map((p, i) =>
        p.startsWith("*") ? <Text key={i} style={{ fontFamily: arabic ? F.arabic : F.sansMedium }}>{p.slice(1, -1)}</Text>
        : p.startsWith("_") ? <Text key={i} style={{ fontStyle: "italic" }}>{p.slice(1, -1)}</Text>
        : <Text key={i}>{p}</Text>)}
    </Text>
  );
}

export function P({ children, muted, center, style }) {
  const { fs, rtl } = useApp();
  return <Rich style={[{ fontFamily: F.sans, fontSize: fs(14.5), lineHeight: fs(23),
                         color: muted ? C.muted : C.ink,
                         textAlign: center ? "center" : rtl ? "right" : "left" }, style]}>{children}</Rich>;
}

export function Sub({ children }) {
  const { fs, rtl } = useApp();
  return <Rich style={{ fontFamily: F.sansMedium, fontSize: fs(15), color: C.ink,
                        marginTop: 4, marginBottom: 2, textAlign: rtl ? "right" : "left" }}>{children}</Rich>;
}

export function Note({ children }) {
  const { fs, rtl } = useApp();
  return <Rich style={{ fontFamily: F.sans, fontSize: fs(12.5), lineHeight: fs(19), color: C.muted,
                        textAlign: rtl ? "right" : "left" }}>{children}</Rich>;
}

export function Arabic({ children, size = 26, center = true }) {
  const { fs } = useApp();
  return <Text style={{ fontFamily: F.arabic, fontSize: fs(size), lineHeight: fs(size * 1.75),
                        color: C.ink, textAlign: center ? "center" : "right", writingDirection: "rtl" }}>{children}</Text>;
}

/* --- structure ----------------------------------------------------------- */

export function Screen({ children, scroll = true, pad = true, bg = C.paper, top = 0, ...rest }) {
  const insets = useSafeAreaInsets();
  const style = { backgroundColor: bg };
  const inner = { paddingHorizontal: pad ? 16 : 0, paddingTop: top, paddingBottom: insets.bottom + 30 };
  if (!scroll) return <View style={[{ flex: 1 }, style]} {...rest}>{children}</View>;
  return (
    <ScrollView style={[{ flex: 1 }, style]} contentContainerStyle={inner}
                /* the platform's own overscroll, which is half of why a list
                   feels native rather than scripted */
                showsVerticalScrollIndicator={false} {...rest}>
      {children}
    </ScrollView>
  );
}

/* The eight-point motif from the masjid's own artwork, used the same way the
 * web app uses it: very faint, behind a hero, never as decoration on its own. */
export function Girih({ size = 190, color = "#FFFFFF", opacity = 0.035, style }) {
  return (
    <View pointerEvents="none" style={[{ position: "absolute", opacity }, style]}>
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Polygon fill={color} points="50,2 57.3,32.4 83.9,16.1 67.6,42.7 98,50 67.6,57.3 83.9,83.9 57.3,67.6 50,98 42.7,67.6 16.1,83.9 32.4,57.3 2,50 32.4,42.7 16.1,16.1 42.7,32.4" />
      </Svg>
    </View>
  );
}

export function Hero({ lines = [], children, tall, minHeight }) {
  const { fs, tx, rtl } = useApp();
  const insets = useSafeAreaInsets();
  /* These screens draw their own hero behind the status bar, so they carry no
   * platform header — and with it no back arrow. The swipe-back gesture still
   * works, but an arrow you can see is not optional: plenty of people never
   * learn the gesture, and a screen with no visible way out is the single
   * loudest "this was a website" tell there is. */
  const nav = useNavigation();
  /* Only on a pushed screen. Inside a tab, canGoBack() is true as soon as you
   * have visited another tab, and an arrow that takes you sideways rather than
   * back is worse than no arrow at all. */
  const canBack = nav?.getState?.()?.type === "stack" && nav.canGoBack();
  return (
    <LinearGradient colors={[C.brand900, C.brand700]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      style={{ paddingTop: insets.top + (tall ? 30 : 18), paddingBottom: tall ? 32 : 24,
               paddingHorizontal: 22, overflow: "hidden",
               minHeight, justifyContent: minHeight ? "center" : "flex-start" }}>
      <Girih style={{ right: -70, top: -62 }} size={215} />
      {canBack && (
        <Pressable onPress={() => { tap(); nav.goBack(); }} accessibilityLabel="Back" accessibilityRole="button"
          hitSlop={10}
          style={({ pressed }) => ({ position: "absolute", left: 12, top: insets.top + 6,
                                     width: 40, height: 40, borderRadius: 20, alignItems: "center",
                                     justifyContent: "center", zIndex: 2,
                                     backgroundColor: pressed ? "rgba(243,239,227,.16)" : "transparent" })}>
          <Ionicons name={rtl ? "chevron-forward" : "chevron-back"} size={25} color={C.cream} />
        </Pressable>)}
      <View style={{ height: canBack ? 34 : 0 }} />
      {lines.map((l, i) => {
        const text = tx(l);
        if (!text) return null;
        const style =
          l.w === "arabic"  ? { fontFamily: F.arabic, fontSize: fs(27), lineHeight: fs(46), color: C.goldBright }
          : l.w === "eyebrow" ? { fontFamily: F.sansMedium, fontSize: fs(10.5), letterSpacing: 1.6,
                                  textTransform: "uppercase", color: C.gold, marginBottom: 7 }
          : l.w === "title"   ? { fontFamily: F.display, fontSize: fs(23), lineHeight: fs(31), color: C.cream }
          : { fontFamily: F.sans, fontSize: fs(13.5), lineHeight: fs(21), color: "rgba(243,239,227,.8)", marginTop: 7 };
        return <Rich key={i} style={[{ textAlign: "center" }, style]}>{text}</Rich>;
      })}
      {children}
    </LinearGradient>
  );
}

export function Heading({ children, tag }) {
  const { fs, rtl } = useApp();
  return (
    <View style={{ flexDirection: rtl ? "row-reverse" : "row", alignItems: "center", gap: 10,
                   marginTop: 26, marginBottom: 11 }}>
      <Text style={{ fontFamily: F.display, fontSize: fs(17), color: C.ink }}>{children}</Text>
      <View style={{ flex: 1, height: 1, backgroundColor: C.line }} />
      {!!tag && <Pill>{tag}</Pill>}
    </View>
  );
}

export function Pill({ children, tone = "muted" }) {
  const { fs } = useApp();
  const bg = tone === "gold" ? "rgba(198,162,76,.16)" : tone === "live" ? "rgba(63,190,115,.15)" : "rgba(124,110,119,.12)";
  const fg = tone === "gold" ? C.goldInk : tone === "live" ? "#1F7A46" : C.muted;
  return (
    <View style={{ backgroundColor: bg, borderRadius: R.pill, paddingHorizontal: 9, paddingVertical: 3.5 }}>
      <Text style={{ fontFamily: F.sansMedium, fontSize: fs(10.5), color: fg }}>{children}</Text>
    </View>
  );
}

export function Card({ children, style, pad = 15, gap = 10 }) {
  return (
    <View style={[{ backgroundColor: C.card, borderRadius: R.card, borderWidth: 1, borderColor: C.line,
                    padding: pad, gap, marginTop: 12 }, style]}>{children}</View>
  );
}

/* A card whose rows are themselves the content — the row owns its own padding
 * so a pressed row fills the full width of the card, with no inset gutter
 * giving the game away. */
export function RowGroup({ children, style }) {
  const rows = React.Children.toArray(children).filter(Boolean);
  return (
    <View style={[{ backgroundColor: C.card, borderRadius: R.card, borderWidth: 1, borderColor: C.line,
                    overflow: "hidden", marginTop: 12 }, style]}>
      {rows.map((ch, i) => (
        <View key={i} style={{ borderTopWidth: i ? 1 : 0, borderTopColor: C.line }}>{ch}</View>
      ))}
    </View>
  );
}

export function Press({ children, onPress, disabled, style }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} android_ripple={{ color: "rgba(119,33,87,.10)" }}
      style={({ pressed }) => [{ backgroundColor: pressed && Platform.OS !== "android" ? "rgba(119,33,87,.07)" : "transparent",
                                 opacity: disabled ? 0.45 : 1 }, style]}>
      {children}
    </Pressable>
  );
}

export function NavRow({ icon, label, sub, soon, onPress, href, value, right, tone }) {
  const { fs, rtl } = useApp();
  const act = onPress || (href ? () => open(href) : null);
  return (
    <Press onPress={act} disabled={!act || soon}
      style={{ flexDirection: rtl ? "row-reverse" : "row", alignItems: "center", gap: 13,
               paddingVertical: 14, paddingHorizontal: 15 }}>
      {!!icon && (
        <View style={{ width: 34, height: 34, borderRadius: 11, alignItems: "center", justifyContent: "center",
                       backgroundColor: tone === "gold" ? "rgba(198,162,76,.15)" : "rgba(119,33,87,.08)" }}>
          <Ionicons name={icon} size={18} color={tone === "gold" ? C.goldInk : C.brand600} />
        </View>)}
      <View style={{ flex: 1 }}>
        <Rich style={{ fontFamily: F.sansMedium, fontSize: fs(14.5), color: C.ink,
                       textAlign: rtl ? "right" : "left" }}>{label}</Rich>
        {!!sub && <Rich style={{ fontFamily: F.sans, fontSize: fs(12), lineHeight: fs(17.5), color: C.muted,
                                 marginTop: 2, textAlign: rtl ? "right" : "left" }}>{sub}</Rich>}
      </View>
      {!!value && <Text style={{ fontFamily: F.sansMedium, fontSize: fs(13.5), color: C.brand600 }}>{value}</Text>}
      {soon ? <Pill>{soon}</Pill> : right !== undefined ? right
        : act ? <Ionicons name={rtl ? "chevron-back" : "chevron-forward"} size={17} color={C.muted} /> : null}
    </Press>
  );
}

/* A label and a value on one line. Tapping one that has a link behind it does
 * the obvious thing; one without stays inert instead of pretending. */
export function KV({ k, v, href, icon, onPress }) {
  const { fs, rtl } = useApp();
  const act = onPress || (href ? () => open(href) : null);
  return (
    <Press onPress={act} disabled={!act}
      style={{ flexDirection: rtl ? "row-reverse" : "row", alignItems: "center", gap: 13,
               paddingVertical: 13, paddingHorizontal: 15 }}>
      {!!icon && <Ionicons name={icon} size={19} color={C.brand600} style={{ width: 22, textAlign: "center" }} />}
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: F.sans, fontSize: fs(11.5), letterSpacing: 0.3, color: C.muted,
                       textAlign: rtl ? "right" : "left" }}>{k}</Text>
        <Rich style={{ fontFamily: F.sansMedium, fontSize: fs(14.5), lineHeight: fs(20), color: C.ink,
                       marginTop: 1.5, textAlign: rtl ? "right" : "left" }}>{v}</Rich>
      </View>
      {!!act && <Ionicons name={rtl ? "chevron-back" : "chevron-forward"} size={16} color={C.muted} />}
    </Press>
  );
}

export function DL({ items }) {
  const { fs, rtl, tx } = useApp();
  return (
    <Card gap={0} pad={0}>
      {items.map((it, i) => (
        <View key={i} style={{ flexDirection: rtl ? "row-reverse" : "row", alignItems: "flex-start", gap: 12,
                               paddingVertical: 12, paddingHorizontal: 15,
                               borderTopWidth: i ? 1 : 0, borderTopColor: C.line }}>
          <Rich style={{ flex: 1, fontFamily: F.sans, fontSize: fs(13.5), lineHeight: fs(20), color: C.muted,
                         textAlign: rtl ? "right" : "left" }}>{tx(it.k)}</Rich>
          <Rich style={{ fontFamily: F.sansMedium, fontSize: fs(13.5), lineHeight: fs(20), color: C.ink,
                         textAlign: rtl ? "left" : "right", maxWidth: "52%" }}>{tx(it.v)}</Rich>
        </View>))}
    </Card>
  );
}

export function Chips({ items }) {
  const { fs, tx } = useApp();
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 7, marginTop: 4 }}>
      {items.map((it, i) => (
        <View key={i} style={{ backgroundColor: "rgba(119,33,87,.06)", borderWidth: 1, borderColor: C.line,
                               borderRadius: R.pill, paddingHorizontal: 11, paddingVertical: 6 }}>
          <Text style={{ fontFamily: F.sans, fontSize: fs(12.5), color: C.brand600 }}>{tx(it)}</Text>
          {!!it.sub && <Text style={{ fontFamily: F.sans, fontSize: fs(10.5), color: C.muted }}>{tx(it.sub)}</Text>}
        </View>))}
    </View>
  );
}

export function Ticks({ items, ordered }) {
  const { fs, rtl, tx } = useApp();
  return (
    <View style={{ gap: 9, marginTop: 4 }}>
      {items.map((it, i) => (
        <View key={i} style={{ flexDirection: rtl ? "row-reverse" : "row", gap: 9, alignItems: "flex-start" }}>
          {ordered
            ? <Text style={{ fontFamily: F.sansMedium, fontSize: fs(12.5), color: C.brand600, width: 16,
                             lineHeight: fs(21) }}>{i + 1}.</Text>
            : <Ionicons name="checkmark" size={16} color={C.brand600} style={{ marginTop: 3 }} />}
          <Rich style={{ flex: 1, fontFamily: F.sans, fontSize: fs(13.5), lineHeight: fs(21), color: C.ink,
                         textAlign: rtl ? "right" : "left" }}>{tx(it)}</Rich>
        </View>))}
    </View>
  );
}

/* A standing caveat — "the masjid does not provide this directly". It has to
 * read as a caution without reading as an error. */
export function Warn({ children }) {
  const { fs, rtl } = useApp();
  return (
    <View style={{ flexDirection: rtl ? "row-reverse" : "row", gap: 10, alignItems: "flex-start",
                   backgroundColor: "rgba(180,83,47,.07)", borderWidth: 1, borderColor: "rgba(180,83,47,.22)",
                   borderRadius: 13, padding: 13, marginTop: 12 }}>
      <Ionicons name="alert-circle-outline" size={18} color={C.danger} style={{ marginTop: 1 }} />
      <Rich style={{ flex: 1, fontFamily: F.sans, fontSize: fs(13), lineHeight: fs(20), color: "#8A3E22",
                     textAlign: rtl ? "right" : "left" }}>{children}</Rich>
    </View>
  );
}

export function Notice({ children }) {
  const { fs, rtl } = useApp();
  return (
    <View style={{ flexDirection: rtl ? "row-reverse" : "row", gap: 10, alignItems: "flex-start",
                   backgroundColor: "rgba(198,162,76,.11)", borderWidth: 1, borderColor: "rgba(198,162,76,.3)",
                   borderRadius: 13, padding: 13, marginTop: 12 }}>
      <Ionicons name="information-circle-outline" size={18} color={C.goldInk} style={{ marginTop: 1 }} />
      <Rich style={{ flex: 1, fontFamily: F.sans, fontSize: fs(13), lineHeight: fs(20), color: "#5E4A12",
                     textAlign: rtl ? "right" : "left" }}>{children}</Rich>
    </View>
  );
}

export function Callout({ lab, h, ps, cta }) {
  const { fs, tx, rtl } = useApp();
  return (
    <View style={{ backgroundColor: "rgba(119,33,87,.045)", borderWidth: 1, borderColor: "rgba(119,33,87,.14)",
                   borderRadius: R.card, padding: 15, gap: 8, marginTop: 14 }}>
      {!!lab && <Text style={{ fontFamily: F.sansMedium, fontSize: fs(10), letterSpacing: 1.4,
                               textTransform: "uppercase", color: C.brand600,
                               textAlign: rtl ? "right" : "left" }}>{tx(lab)}</Text>}
      {!!h && <Rich style={{ fontFamily: F.display, fontSize: fs(16), lineHeight: fs(23), color: C.ink,
                             textAlign: rtl ? "right" : "left" }}>{tx(h)}</Rich>}
      {(ps || []).map((p, i) => <P key={i} muted>{tx(p)}</P>)}
      {!!cta && <CTA label={tx(cta)} href={cta.href} compact />}
    </View>
  );
}

export function CTA({ label, sub, onPress, href, compact, tone = "brand", disabled }) {
  const { fs } = useApp();
  const act = onPress || (href ? () => open(href) : null);
  const colors = tone === "gold" ? [C.goldBright, C.gold] : [C.brand700, C.brand900];
  return (
    <Pressable onPress={act} disabled={disabled || !act}
      style={({ pressed }) => ({ marginTop: 16, borderRadius: R.pill, overflow: "hidden",
                                 opacity: disabled ? 0.5 : pressed ? 0.88 : 1,
                                 transform: [{ scale: pressed ? 0.985 : 1 }] })}>
      <LinearGradient colors={colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={{ paddingVertical: compact ? 12 : 15, paddingHorizontal: 20, alignItems: "center" }}>
        <Text style={{ fontFamily: F.sansMedium, fontSize: fs(compact ? 14 : 15),
                       color: tone === "gold" ? C.brand900 : C.cream }}>{label}</Text>
        {!!sub && <Text style={{ fontFamily: F.sans, fontSize: fs(11.5), marginTop: 2.5,
                                 color: tone === "gold" ? "rgba(60,11,42,.72)" : "rgba(243,239,227,.72)" }}>{sub}</Text>}
      </LinearGradient>
    </Pressable>
  );
}

/* Bank details. Every row copies on tap, because the alternative is squinting
 * at a sort code and typing it into a banking app from memory. */
export function Bank({ items }) {
  const { fs, tx, t, rtl } = useApp();
  const [copied, setCopied] = React.useState(null);
  const copy = async (i, v) => {
    tap(); await Clipboard.setStringAsync(v);
    setCopied(i); setTimeout(() => setCopied(c => (c === i ? null : c)), 1600);
  };
  return (
    <RowGroup>
      {items.map((it, i) => (
        <Press key={i} onPress={() => copy(i, tx(it.v))}
          style={{ flexDirection: rtl ? "row-reverse" : "row", alignItems: "center", gap: 12,
                   paddingVertical: 13, paddingHorizontal: 15 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: F.sans, fontSize: fs(11.5), color: C.muted,
                           textAlign: rtl ? "right" : "left" }}>{tx(it.k)}</Text>
            <Text style={{ fontFamily: F.sansMedium, fontSize: fs(15), color: C.ink, marginTop: 1.5,
                           textAlign: rtl ? "right" : "left" }}>{tx(it.v)}</Text>
          </View>
          {copied === i
            ? <Pill tone="live">{t("ui.copied", "Copied")}</Pill>
            : <Ionicons name="copy-outline" size={17} color={C.muted} />}
        </Press>))}
    </RowGroup>
  );
}

export function Social({ items }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "center", gap: 14, marginTop: 20 }}>
      {items.map((it, i) => {
        const name = /instagram/i.test(it.href) ? "logo-instagram"
                   : /youtube/i.test(it.href) ? "logo-youtube"
                   : /twitter|x\.com/i.test(it.href) ? "logo-twitter" : "globe-outline";
        return (
          <Pressable key={i} onPress={() => open(it.href)} accessibilityLabel={it.label}
            style={({ pressed }) => ({ width: 42, height: 42, borderRadius: 21, alignItems: "center",
                                       justifyContent: "center", borderWidth: 1, borderColor: C.line,
                                       backgroundColor: pressed ? "rgba(119,33,87,.08)" : C.card })}>
            <Ionicons name={name} size={19} color={C.brand600} />
          </Pressable>);
      })}
    </View>
  );
}

export function Foot({ lines }) {
  const { fs } = useApp();
  return (
    <View style={{ marginTop: 26, gap: 3 }}>
      {lines.map((l, i) => (
        <Text key={i} style={{ fontFamily: F.sans, fontSize: fs(11), lineHeight: fs(17), color: C.muted,
                               textAlign: "center" }}>{l}</Text>))}
    </View>
  );
}

export function Empty({ icon = "leaf-outline", title, body }) {
  const { fs } = useApp();
  return (
    <View style={{ alignItems: "center", paddingVertical: 54, paddingHorizontal: 30, gap: 8 }}>
      <Ionicons name={icon} size={34} color={C.line} />
      <Text style={{ fontFamily: F.display, fontSize: fs(17), color: C.ink, textAlign: "center" }}>{title}</Text>
      {!!body && <Text style={{ fontFamily: F.sans, fontSize: fs(13.5), lineHeight: fs(21), color: C.muted,
                                textAlign: "center" }}>{body}</Text>}
    </View>
  );
}

export const line = StyleSheet.create({ h: { height: 1, backgroundColor: C.line } }).h;
