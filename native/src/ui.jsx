/* The kit every screen is built from.
 *
 * It exists so that forty screens cannot drift from one another, and so that
 * the two things that make an app feel native — a real pressed state and type
 * that respects the reader's chosen size — are decided once rather than forty
 * times. Everything here reads the live preferences, so changing the language
 * or the text size redraws the whole app with no screen knowing about it.
 */
import React from "react";
import { View, Text, ScrollView, Pressable, Platform, Linking, StyleSheet, Image } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Polygon, SvgXml } from "react-native-svg";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Clipboard from "expo-clipboard";
import * as WebBrowser from "expo-web-browser";
import { C, F, R, SHADOW } from "./theme";
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
        /* <b> and <strong> are weight 700 in a browser, and that is what every
           one of these was in the website's markup. Setting them in the 500
           was indistinguishable from the 400 around them at 13px, so every
           bold line in the app — "The office takes calls between 5pm and 7pm",
           "Once the office has rung you and agreed your date" — simply was
           not bold. */
        p.startsWith("*") ? <Text key={i} style={{ fontFamily: arabic ? F.arabic : F.sansBold }}>{p.slice(1, -1)}</Text>
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
  return <Rich style={{ fontFamily: F.sansSemi, fontSize: fs(15), color: C.ink,
                        marginTop: 4, marginBottom: 2, textAlign: rtl ? "right" : "left" }}>{children}</Rich>;
}

export function Note({ children, center }) {
  const { fs, rtl } = useApp();
  /* .lv-note and .qfoot are centred where the rest are not, so the one that
     closes a page reads as a note about the page rather than a last line of
     its prose. */
  return <Rich style={{ fontFamily: F.sans, fontSize: fs(12.5), lineHeight: fs(20), color: C.muted,
                        textAlign: center ? "center" : rtl ? "right" : "left" }}>{children}</Rich>;
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
 * web app uses it: behind a hero, never as decoration on its own.
 *
 * Gold at 9%, which is what .girih is on the website — not white at 3.5%,
 * which is what this was. White on plum reads as a pale wash and pulls the
 * whole hero lighter; gold on plum is the motif, and you only see it if you
 * look. Same size and offset as the site, too: it was 215px at -70/-62 here
 * against 190px at -46/-40 there, so the star sat further out and bigger. */
export function Girih({ size = 230, color = C.gold, opacity = 0.08, style }) {
  return (
    <View pointerEvents="none" style={[{ position: "absolute", opacity }, style]}>
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Polygon fill={color} points="50,2 57.3,32.4 83.9,16.1 67.6,42.7 98,50 67.6,57.3 83.9,83.9 57.3,67.6 50,98 42.7,67.6 16.1,83.9 32.4,57.3 2,50 32.4,42.7 16.1,16.1 42.7,32.4" />
      </Svg>
    </View>
  );
}

/* The bar the web app carries above every tab: the masjid's own wordmark, the
 * society's name, and a bell that goes to Notices. It sits on the plum so it
 * runs into the hero below it rather than sitting on top of one. */
export function TopBar({ navigation, onBell, back }) {
  const { t, fs, rtl } = useApp();
  const insets = useSafeAreaInsets();
  const nav = useNavigation();
  /* A pushed screen that wears the website's top bar still has to offer a way
   * out. The website's own pages do not need one — they are tabs — so this is
   * the one addition, and it is the arrow people look for. */
  const canBack = back && nav?.canGoBack?.();
  return (
    /* .topbar: padding 14px 20px, and a 1px gold hairline along the bottom at
       25% — the line that separates it from the hero. Without it the two
       plums run together and the bar stops reading as a bar. */
    <View style={{ flexDirection: rtl ? "row-reverse" : "row", alignItems: "center", gap: 11,
                   paddingTop: insets.top + 14, paddingBottom: 14, paddingHorizontal: 20,
                   borderBottomWidth: 1, borderBottomColor: "rgba(198,162,76,.25)" }}>
      {canBack && (
        <Pressable onPress={() => { tap(); nav.goBack(); }} accessibilityLabel="Back" accessibilityRole="button"
          hitSlop={10} style={({ pressed }) => ({ marginRight: -4, padding: 4, borderRadius: 18,
                                                  backgroundColor: pressed ? "rgba(243,239,227,.16)" : "transparent" })}>
          <Ionicons name={rtl ? "chevron-forward" : "chevron-back"} size={24} color={C.cream} />
        </Pressable>)}
      <Image source={require("../assets/logo.png")}
             style={{ width: 62, height: 44, resizeMode: "contain" }} />
      <View style={{ width: 1, height: 30, backgroundColor: "rgba(243,239,227,.22)" }} />
      <View style={{ flex: 1 }}>
        {t("app.bolton_central_islamic_society", "Bolton Central Islamic Society")
          .split(" ").reduce((rows, w) => {
            /* Two lines, as the web app's bar wraps it — and in a language that
             * does not split that way, one line that simply fits. */
            if (rows.length < 2 && rows.join(" ").length + w.length > 14) rows.push(w); 
            else rows[rows.length - 1] = (rows[rows.length - 1] + " " + w).trim();
            return rows;
          }, [""]).map((line, i) => (
            <Text key={i} style={{ fontFamily: F.sansSemi, fontSize: fs(10), letterSpacing: 1.5,
                                   color: C.cream, textTransform: "uppercase",
                                   textAlign: rtl ? "right" : "left" }}>{line}</Text>))}
      </View>
      <Pressable onPress={() => { tap(); onBell ? onBell() : navigation?.navigate("NoticesTab"); }}
        accessibilityLabel={t("a11y.notices", "Notices")}
        /* .bellbtn is gold: a 10% gold fill inside a 30% gold border. This was
           a cream outline on nothing, which reads as a disabled control. */
        style={({ pressed }) => ({ width: 40, height: 40, borderRadius: 11, alignItems: "center",
                                   justifyContent: "center", borderWidth: 1,
                                   borderColor: "rgba(198,162,76,.3)",
                                   backgroundColor: pressed ? "rgba(198,162,76,.24)" : "rgba(198,162,76,.1)" })}>
        <Ionicons name="notifications-outline" size={19} color={C.goldBright} />
      </Pressable>
    </View>
  );
}

/* THE SHEET HEADER, WHICH THIS APP DID NOT HAVE.
 *
 * Every one of the website's 28 sheets opens under the same bar: a plum
 * gradient running brand-900 to brand-800 — the opposite direction to the hero
 * below it, which is what makes the two read as separate pieces rather than
 * one long wash — with the sheet's title in Fraunces at 15.5px on the left and
 * a gold "Done" pill on the right. A 38px rounded square holding a left arrow
 * appears only when the sheet was opened from another sheet.
 *
 * The app had none of it. A pushed screen drew a bare chevron floating on top
 * of its own hero, so there was no bar, no title line and no Done — the hero
 * simply started at the status bar with one arrow in the corner.
 */
export function SheetTop({ title, canBack, onBack, onDone, onPrev, onNext, prevOff, nextOff }) {
  const { t, fs, rtl } = useApp();
  const insets = useSafeAreaInsets();
  return (
    <LinearGradient colors={[C.brand900, C.brand800]} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
      style={{ flexDirection: rtl ? "row-reverse" : "row", alignItems: "center", gap: 10,
               paddingTop: insets.top + 14, paddingBottom: 14, paddingHorizontal: 14 }}>
      {canBack && (
        /* .sh-upback — 38px, 11px of radius, a white 20% hairline over a white
           8% fill. In RTL the website flips the arrow with scaleX(-1). */
        <Pressable onPress={() => { tap(); onBack(); }} accessibilityLabel="Back" accessibilityRole="button"
          style={({ pressed }) => ({ width: 38, height: 38, borderRadius: 11, alignItems: "center",
                                     justifyContent: "center", borderWidth: 1,
                                     borderColor: "rgba(255,255,255,.2)",
                                     backgroundColor: pressed ? "rgba(255,255,255,.18)" : "rgba(255,255,255,.08)" })}>
          <Ionicons name={rtl ? "arrow-forward" : "arrow-back"} size={19} color={C.cream} />
        </Pressable>)}
      {/* .sh-nav — the month timetable steps its months from inside the HEADER,
          either side of the title, with the same 38px chrome as the back
          square. The app had put that stepper in a hero of its own below,
          which the website does not have on that sheet at all. */}
      {!!onPrev && (
        <Pressable onPress={() => { tap(); onPrev(); }} disabled={prevOff} accessibilityRole="button"
          style={({ pressed }) => ({ width: 38, height: 38, borderRadius: 11, alignItems: "center",
                                     justifyContent: "center", borderWidth: 1, opacity: prevOff ? 0.35 : 1,
                                     borderColor: "rgba(255,255,255,.2)",
                                     backgroundColor: pressed ? "rgba(255,255,255,.18)" : "rgba(255,255,255,.08)" })}>
          <Ionicons name={rtl ? "chevron-forward" : "chevron-back"} size={20} color={C.cream} />
        </Pressable>)}
      {/* Every sheet overrides the stylesheet's centre with text-align:left —
          except the month timetable, whose h3 keeps the stylesheet's centre
          because it sits between two stepper buttons. */}
      <Text numberOfLines={1} style={{ flex: 1, fontFamily: F.display, fontSize: fs(15.5), color: C.cream,
                                       textAlign: onPrev ? "center" : rtl ? "right" : "left" }}>{title}</Text>
      {!!onNext && (
        <Pressable onPress={() => { tap(); onNext(); }} disabled={nextOff} accessibilityRole="button"
          style={({ pressed }) => ({ width: 38, height: 38, borderRadius: 11, alignItems: "center",
                                     justifyContent: "center", borderWidth: 1, opacity: nextOff ? 0.35 : 1,
                                     borderColor: "rgba(255,255,255,.2)",
                                     backgroundColor: pressed ? "rgba(255,255,255,.18)" : "rgba(255,255,255,.08)" })}>
          <Ionicons name={rtl ? "chevron-back" : "chevron-forward"} size={20} color={C.cream} />
        </Pressable>)}
      {!!onDone && (
        <Pressable onPress={() => { tap(); onDone(); }} accessibilityRole="button"
          style={({ pressed }) => ({ paddingVertical: 9, paddingHorizontal: 14, borderRadius: 999,
                                     borderWidth: 1, borderColor: "rgba(198,162,76,.45)",
                                     backgroundColor: pressed ? "rgba(198,162,76,.28)" : "rgba(198,162,76,.14)" })}>
          <Text style={{ fontFamily: F.sansBold, fontSize: fs(13), color: C.goldBright }}>
            {t("vids.done", "Done")}
          </Text>
        </Pressable>)}
    </LinearGradient>
  );
}

/* The hero medallion: a 52px circle filled gold at 16% inside a gold 40%
 * hairline, the drawing inside it 26px in gold-bright, 16px of clearance
 * beneath. Eight of the website's heroes carry one and the app carried none,
 * so those heroes opened on a line of type with nothing above it.
 *
 * The drawing is the website's own SVG, rendered as-is. Every one is bespoke —
 * a house, a bank card, a calendar, a globe, a speech bubble, a crib, two
 * wedding bands — and picking the nearest glyph out of an icon font would have
 * put a different picture on seven screens. */
export function Ring({ xml }) {
  if (!xml) return null;
  return (
    <View style={{ width: 52, height: 52, borderRadius: 26, alignSelf: "center", marginBottom: 16,
                   alignItems: "center", justifyContent: "center", borderWidth: 1,
                   borderColor: "rgba(198,162,76,.4)", backgroundColor: "rgba(198,162,76,.16)" }}>
      <SvgXml xml={xml} width={26} height={26} color={C.goldBright} />
    </View>
  );
}

export function Hero({ lines = [], children, tall, minHeight, ring, align = "center" }) {
  const { fs, tx, rtl } = useApp();
  /* The hero no longer reaches behind the status bar and no longer carries a
   * back arrow of its own: SheetTop sits above it on every pushed screen, as
   * .sh-top does on the website, and that bar owns the inset, the title and
   * the way out. The floating chevron this used to draw in the corner was
   * invented here — the website has no such thing anywhere. */
  return (
    /* The website's own hero: linear-gradient(180deg, brand-800, brand-900).
       Straight down, and DARKER as it descends. This ran brand-900 to
       brand-700 on the diagonal, so it got brighter and pinker towards the
       bottom right — the single reason every screen read as a lighter, more
       magenta app than the one it is copying. Padding is the site's 26/22/30. */
    <LinearGradient colors={[C.brand800, C.brand900]} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
      style={{ paddingTop: tall ? 32 : 26, paddingBottom: tall ? 38 : 30,
               paddingHorizontal: 22, overflow: "hidden",
               minHeight, justifyContent: minHeight ? "center" : "flex-start" }}>
      <Girih style={{ right: -46, top: -40 }} size={230} />
      <Ring xml={ring} />
      {lines.map((l, i) => {
        const text = tx(l);
        if (!text) return null;
        /* SIZE AND COLOUR COME FROM THE WEBSITE, per line. Every hero on the
           site sets its own: .ct-name is 24px and .hh-en 22, .mg-en 19,
           .wl-en 18; the small line above a title is gold on giving and
           #BBA9B4 on contact. One hard-coded rule per weight was wrong
           somewhere whichever numbers it chose. */
        const px = l.px || (l.w === "arabic" ? 28 : l.w === "title" ? 22
                          : l.w === "eyebrow" ? 10.5 : 13.5);
        const col = l.col || (l.w === "arabic" ? C.goldBright
                            : l.w === "eyebrow" ? C.gold
                            : l.w === "title" ? C.cream : "rgba(243,239,227,.8)");
        const style =
          l.w === "arabic"  ? { fontFamily: F.arabic, fontSize: fs(px),
                                lineHeight: fs(px * 1.9), color: col }
          : l.w === "eyebrow" ? { fontFamily: F.sansSemi, fontSize: fs(px), letterSpacing: px * 0.16,
                                  textTransform: "uppercase", color: col, marginBottom: 7 }
          : l.w === "title"   ? { fontFamily: F.display, fontSize: fs(px),
                                  lineHeight: fs(px * 1.3), color: col }
          : { fontFamily: F.sans, fontSize: fs(px), lineHeight: fs(px * 1.55),
              color: col, marginTop: 7 };
        return <Rich key={i} style={[{ textAlign: align === "left" && !rtl ? "left"
                                                 : align === "left" ? "right" : "center" }, style]}>{text}</Rich>;
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
      {/* The title gives way, never the tag. A long heading — "Viewing · Friday
          9 October 2026" — used to push the tag clean off the right edge, so
          the one word explaining the two columns was cut in half. */}
      <Text numberOfLines={1}
            style={{ flexShrink: 1, fontFamily: F.display, fontSize: fs(17), color: C.ink }}>{children}</Text>
      <View style={{ flex: 1, minWidth: 8, height: 1, backgroundColor: C.line }} />
      {/* .sec-h .tag is plain 11px muted text — no fill, no radius. Drawing it
          as a pill turned a quiet note at the end of a rule ("From the
          masjid", "Tap to copy", "Apple & Google Pay") into something that
          looks like a status badge you could press. */}
      {!!tag && <Text style={{ flexShrink: 0, fontFamily: F.sans, fontSize: fs(11), color: C.muted }}>{tag}</Text>}
    </View>
  );
}

export function Pill({ children, tone = "muted" }) {
  const { fs } = useApp();
  const bg = tone === "gold" ? "rgba(198,162,76,.16)" : tone === "live" ? "rgba(63,190,115,.15)" : "rgba(124,110,119,.12)";
  const fg = tone === "gold" ? C.goldInk : tone === "live" ? "#1F7A46" : C.muted;
  return (
    <View style={{ flexShrink: 0, backgroundColor: bg, borderRadius: R.pill,
                   paddingHorizontal: 9, paddingVertical: 3.5 }}>
      <Text numberOfLines={1} style={{ fontFamily: F.sansSemi, fontSize: fs(10.5), color: fg }}>{children}</Text>
    </View>
  );
}

export function Card({ children, style, pad = 15, gap = 10 }) {
  return (
    <View style={[{ backgroundColor: C.card, borderRadius: R.card, borderWidth: 1, borderColor: C.line,
                    padding: pad, gap, marginTop: 12 }, SHADOW, style]}>{children}</View>
  );
}

/* A card whose rows are themselves the content — the row owns its own padding
 * so a pressed row fills the full width of the card, with no inset gutter
 * giving the game away. */
/* Every icon chip on the website — .ct-ico, .md-ico, .dr-ico, .fs-item .ic and
 * the whole .*-call-ico family — is the same thing: a rounded square filled a
 * SOLID #F0E9ED with a brand-600 glyph on it. Not a translucent plum tint, and
 * never gold: there is no gold chip anywhere on the site. The tints here were
 * each a shade or two light, and because the fill was translucent they changed
 * colour depending on whether the row sat on card or on paper. */
export function IconChip({ icon, size = 38, glyph = 19, radius = 11, muted }) {
  return (
    <View style={{ width: size, height: size, borderRadius: radius, alignItems: "center",
                   justifyContent: "center", backgroundColor: muted ? C.paper : "#F0E9ED" }}>
      <Ionicons name={icon} size={glyph} color={muted ? C.muted : C.brand600} />
    </View>
  );
}

export function RowGroup({ children, style }) {
  const rows = React.Children.toArray(children).filter(Boolean);
  return (
    <View style={[{ backgroundColor: C.card, borderRadius: R.card, borderWidth: 1, borderColor: C.line,
                    overflow: "hidden", marginTop: 12 }, SHADOW, style]}>
      {rows.map((ch, i) => (
        <View key={i} style={{ borderTopWidth: i ? 1 : 0, borderTopColor: C.line }}>{ch}</View>
      ))}
    </View>
  );
}

export function Press({ children, onPress, disabled, dim = true, style }) {
  return (
    /* `dim={false}` for a row that is inert but not greyed — the website fades
       a disabled nav button or an out-of-range day, and never a "coming soon"
       row, whose title and chip go muted on their own. */
    <Pressable onPress={onPress} disabled={disabled} android_ripple={{ color: "rgba(119,33,87,.10)" }}
      style={({ pressed }) => [{ backgroundColor: pressed && Platform.OS !== "android" ? "rgba(119,33,87,.07)" : "transparent",
                                 opacity: disabled && dim ? 0.45 : 1 }, style]}>
      {children}
    </Pressable>
  );
}

export function NavRow({ icon, label, sub, soon, onPress, href, value, right, tone }) {
  const { fs, rtl } = useApp();
  const act = onPress || (href ? () => open(href) : null);
  return (
    /* A "coming soon" row is NOT faded on the website: .md-row.soon and
       .dr-row.soon mute the title and tint the chip, and leave the row and
       its gold tag at full strength. Dimming the whole thing to 45% took the
       tag down with it, so the one bright thing on those rows — the part that
       says the masjid intends to do this — went pale. */
    <Press onPress={act} disabled={!act || soon} dim={!soon}
      style={{ flexDirection: rtl ? "row-reverse" : "row", alignItems: "center", gap: 13,
               paddingVertical: 14, paddingHorizontal: 15 }}>
      {!!icon && <IconChip icon={icon} muted={!!soon} />}
      <View style={{ flex: 1 }}>
        <Rich style={{ fontFamily: F.sansSemi, fontSize: fs(14.5), color: C.ink,
                       textAlign: rtl ? "right" : "left" }}>{label}</Rich>
        {!!sub && <Rich style={{ fontFamily: F.sans, fontSize: fs(12), lineHeight: fs(17.5), color: C.muted,
                                 marginTop: 2, textAlign: rtl ? "right" : "left" }}>{sub}</Rich>}
      </View>
      {!!value && <Text style={{ fontFamily: F.sansSemi, fontSize: fs(13.5), color: C.brand600 }}>{value}</Text>}
      {soon ? <Pill>{soon}</Pill> : right !== undefined ? right
        : act ? <Ionicons name={rtl ? "chevron-back" : "chevron-forward"} size={17} color={C.muted} /> : null}
    </Press>
  );
}

/* A label and a value on one line. Tapping one that has a link behind it does
 * the obvious thing; one without stays inert instead of pretending. */
export function KV({ k, v, href, icon, onPress, kind }) {
  const { fs, rtl } = useApp();
  const act = onPress || (href ? () => open(href) : null);
  /* A row with somewhere to go — Address, Telephone — stacks its label over its
   * value and takes a chevron. A row that is only a fact — "All classes · £10 /
   * week" — is a table row, and reads as one: label left, figure right. */
  const table = !act && !icon;
  if (table) {
    /* .ad-r is the fee table — the label in INK and the figure 15px bold in
       brand-600, because on a page of prices the money is the plum thing.
       .bk-rate-line is the tariff — both sides 13.5px ink, the figure bold,
       8px of padding rather than 12. .bt-row is the plain one. All three had
       been drawing as a muted label with an ink value. */
    const fee = kind === "fee", rate = kind === "rate";
    return (
      <View style={{ flexDirection: rtl ? "row-reverse" : "row", alignItems: "baseline", gap: 12,
                     paddingVertical: rate ? 8 : 12, paddingHorizontal: 16 }}>
        <Rich style={{ flex: 1, fontFamily: F.sans, fontSize: fs(rate ? 13.5 : fee ? 13.5 : 13),
                       lineHeight: fs(20), color: fee || rate ? C.ink : C.muted,
                       textAlign: rtl ? "right" : "left" }}>{k}</Rich>
        <Rich style={{ fontFamily: F.sansBold, fontSize: fs(rate ? 13.5 : 15), lineHeight: fs(20),
                       color: fee ? C.brand600 : C.ink,
                       textAlign: rtl ? "left" : "right", maxWidth: "52%" }}>{v}</Rich>
      </View>
    );
  }
  return (
    /* A row that is only a fact — "Radio frequency · 454.1000 MHz" — is inert,
       not disabled. Press faded it to 45% because it had nowhere to go, so on
       the contact screen the one row you cannot tap looked switched off. */
    <Press onPress={act} disabled={!act} dim={false}
      style={{ flexDirection: rtl ? "row-reverse" : "row", alignItems: "center", gap: 13,
               paddingVertical: 13, paddingHorizontal: 15 }}>
      {!!icon && <IconChip icon={icon} />}
      <View style={{ flex: 1 }}>
        {/* .ct-k is 11.76px, uppercase, 1.41px of tracking, in C.muted — not
            sentence case with a third of that tracking. The label is what
            tells you this is a record rather than a sentence. */}
        <Text style={{ fontFamily: F.sans, fontSize: fs(10.5), letterSpacing: 1.4,
                       textTransform: "uppercase", color: C.muted,
                       textAlign: rtl ? "right" : "left" }}>{k}</Text>
        {/* .ct-v is 16.8px at 600 — bigger and heavier than this was. */}
        <Rich style={{ fontFamily: F.sansSemi, fontSize: fs(15), lineHeight: fs(21), color: C.ink,
                       marginTop: 2, textAlign: rtl ? "right" : "left" }}>{v}</Rich>
      </View>
      {!!act && <Ionicons name={rtl ? "chevron-back" : "chevron-forward"} size={16} color={C.muted} />}
    </Press>
  );
}

/* "Ring the office" — the one row on a page that exists to be tapped.
 *
 * A card of its own at 15px of radius with 15/14 of padding, a #F0E9ED chip,
 * a 10.5px uppercase label and the number under it at 16px BOLD. It had been
 * folded in with .md-row, whose shape is the other way round — a 14.5px title
 * over a 12px muted sub — so on fourteen screens the label was large and black
 * and the phone number was small and grey beneath it. */
/* .md-row — a card of its own, not a row in a grouped list: 15px of radius,
 * 14 of padding, a hairline, the shared lift and 12px of air below the one
 * before it. Its 40px chip at 12px of radius holds a hand-drawn SVG — a crib,
 * two wedding bands, a shield with a tick — and the title is 15px BOLD over a
 * 12px muted line. Twenty of these across five screens, every one of them
 * flattened into one bordered group with hairlines between, titled 14.5px
 * medium, with the nearest icon-font glyph in place of the drawing.
 *
 * A row with nothing behind it yet takes the paper chip and muted type the
 * website gives .md-row.soon. */
export function MenuRow({ label, sub, svg, icon, soon, onPress, href, ext }) {
  const { fs, rtl } = useApp();
  const act = soon ? null : (onPress || (href ? () => open(href) : null));
  return (
    /* A "coming soon" row is not greyed out on the website — only its TITLE
       goes muted and its chip goes to the paper colour. Fading the whole row
       to 45% took the sub-line with it, so the sentence saying what the course
       would be was the hardest thing on the screen to read. */
    <Press onPress={act} disabled={!act} dim={!soon}
      style={[{ flexDirection: rtl ? "row-reverse" : "row", alignItems: "center", gap: 13,
                padding: 14, borderRadius: 15, marginTop: 12, backgroundColor: C.card,
                borderWidth: 1, borderColor: C.line }, SHADOW]}>
      <View style={{ width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center",
                     backgroundColor: soon ? C.paper : "#F0E9ED" }}>
        {svg ? <SvgXml xml={svg} width={20} height={20} color={soon ? C.muted : C.brand600} />
             : <Ionicons name={icon || "chevron-forward-outline"} size={19} color={soon ? C.muted : C.brand600} />}
      </View>
      <View style={{ flex: 1 }}>
        <Rich style={{ fontFamily: F.sansBold, fontSize: fs(15), color: soon ? C.muted : C.ink,
                       textAlign: rtl ? "right" : "left" }}>{label}</Rich>
        {!!sub && <Rich style={{ fontFamily: F.sans, fontSize: fs(12), lineHeight: fs(17), color: C.muted,
                                 marginTop: 2, textAlign: rtl ? "right" : "left" }}>{sub}</Rich>}
      </View>
      {/* .soon-tag is GOLD — 9.5px bold in the gold itself inside a 45% gold
          hairline. It was the app's grey Pill, so "coming soon" read as
          "disabled" rather than as something the masjid intends to do. */
       soon ? <View style={{ borderWidth: 1, borderColor: "rgba(198,162,76,.45)", borderRadius: R.pill,
                             paddingHorizontal: 8, paddingVertical: 3 }}>
                <Text style={{ fontFamily: F.sansBold, fontSize: fs(9.5), letterSpacing: 0.95,
                               textTransform: "uppercase", color: C.gold }}>{soon}</Text>
              </View>
            /* .dr-ext — a gold ↗ at 80%, which the website uses on every row
               that leaves the app, against .dr-ch's muted chevron for one
               that goes deeper. */
            : ext ? <Text style={{ fontFamily: F.sans, fontSize: fs(13), color: C.goldBright, opacity: 0.8 }}>↗</Text>
            : act ? <Ionicons name={rtl ? "chevron-back" : "chevron-forward"} size={17} color={C.muted} /> : null}
    </Press>
  );
}

/* .fs-item — one of the eight things the masjid does for a funeral: a card
 * with a 36px #F0E9ED chip holding a hand-drawn glyph, a 14.5px BOLD title
 * with an optional gold tag beside it, and a 13px muted line under it. These
 * had been flattened into alternating headings and paragraphs, so eight cards
 * read as sixteen loose lines on the one screen a family opens on the worst
 * day of their life. */
export function Items({ items }) {
  const { fs, tx, rtl } = useApp();
  return (
    <View style={{ gap: 10, marginTop: 12 }}>
      {items.map((it, i) => (
        <View key={i} style={[{ flexDirection: rtl ? "row-reverse" : "row", alignItems: "flex-start",
                                gap: 12, padding: 14, borderRadius: 14, backgroundColor: C.card,
                                borderWidth: 1, borderColor: C.line }, SHADOW]}>
          <View style={{ width: 36, height: 36, borderRadius: 11, alignItems: "center",
                         justifyContent: "center", backgroundColor: "#F0E9ED" }}>
            {it.svg ? <SvgXml xml={it.svg} width={19} height={19} color={C.brand600} />
                    : <Ionicons name="ellipse-outline" size={19} color={C.brand600} />}
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: rtl ? "row-reverse" : "row", alignItems: "center",
                           flexWrap: "wrap", gap: 7 }}>
              <Rich style={{ fontFamily: F.sansBold, fontSize: fs(14.5), color: C.ink,
                             textAlign: rtl ? "right" : "left" }}>{tx(it.h)}</Rich>
              {!!it.tag && (
                /* .fs-extra — 9.5px bold uppercase in #8A6A18 on an 18% gold
                   fill. It had been run straight onto the end of the title
                   with nothing between, so one card read "Feeding &
                   kitchenextra cost". */
                <Text style={{ fontFamily: F.sansBold, fontSize: fs(9.5), letterSpacing: 0.76,
                               textTransform: "uppercase", color: "#8A6A18", overflow: "hidden",
                               backgroundColor: "rgba(198,162,76,.18)", borderRadius: 5,
                               paddingHorizontal: 6, paddingVertical: 2 }}>{tx(it.tag)}</Text>)}
            </View>
            {!!it.p && <Rich style={{ fontFamily: F.sans, fontSize: fs(13), lineHeight: fs(21),
                                      color: C.muted, marginTop: 4,
                                      textAlign: rtl ? "right" : "left" }}>{tx(it.p)}</Rich>}
          </View>
        </View>))}
    </View>
  );
}

export function Call({ k, v, href, onPress, icon }) {
  const { fs, rtl } = useApp();
  const act = onPress || (href ? () => open(href) : null);
  /* Same as the key/value rows: a contact card with no link behind it — the
     funeral sheet has one — is inert, not greyed out. */
  return (
    <Press onPress={act} disabled={!act} dim={false}
      style={[{ flexDirection: rtl ? "row-reverse" : "row", alignItems: "center", gap: 13,
                marginTop: 14, paddingVertical: 15, paddingHorizontal: 14, borderRadius: 15,
                backgroundColor: C.card, borderWidth: 1, borderColor: C.line }, SHADOW]}>
      <IconChip icon={`${icon || (href?.startsWith("tel:") ? "call" : "open")}-outline`} />
      <View style={{ flex: 1, gap: 2 }}>
        <Rich style={{ fontFamily: F.sans, fontSize: fs(10.5), letterSpacing: 1.05,
                       textTransform: "uppercase", color: C.muted,
                       textAlign: rtl ? "right" : "left" }}>{k}</Rich>
        <Rich style={{ fontFamily: F.sansBold, fontSize: fs(16), lineHeight: fs(22), color: C.ink,
                       textAlign: rtl ? "right" : "left" }}>{v}</Rich>
      </View>
      {!!act && <Ionicons name={rtl ? "chevron-back" : "chevron-forward"} size={16} color={C.muted} />}
    </Press>
  );
}

/* .hh-facts — the stat strip at the top of hall hire, Arabic classes and the
 * ghusl workshop: equal columns divided by a hairline, each a 10.5px uppercase
 * label over a 28px figure in brand-600. Rendered as a plain card it came out
 * as two ordinary table rows, with the number — the only thing anybody opens
 * that panel to read — at 13.5px in grey. */
export function Facts({ items }) {
  const { fs, tx } = useApp();
  return (
    <Card gap={0} pad={0} style={{ flexDirection: "row" }}>
      {items.map((it, i) => (
        <View key={i} style={{ flex: 1, alignItems: "center", gap: 4, paddingVertical: 16, paddingHorizontal: 8,
                               borderRightWidth: i < items.length - 1 ? 1 : 0, borderRightColor: C.line }}>
          <Text style={{ fontFamily: F.sans, fontSize: fs(10.5), letterSpacing: 0.84,
                         textTransform: "uppercase", color: C.muted, textAlign: "center" }}>{tx(it.k)}</Text>
          <Text style={{ fontFamily: F.sansBold, fontSize: fs(it.small ? 20 : 28), color: C.brand600,
                         textAlign: "center" }}>{tx(it.v)}</Text>
        </View>))}
    </Card>
  );
}

export function DL({ items, kind }) {
  const { fs, rtl, tx } = useApp();
  const goes = kind === "goes";
  return (
    <Card gap={0} pad={0}>
      {items.map((it, i) => (
        /* The website STACKS these: dt is 10.5px uppercase with .1em of
           tracking in the muted grey, and dd sits under it at 13.5px in ink
           across the full width. Side by side with the value pinned right at
           52% turned every answer into a ragged right-aligned column, and a
           sentence as long as "At the office, by bank transfer, or by card"
           broke across four lines in half the width available to it. */
        <View key={i} style={{ paddingVertical: 12, paddingHorizontal: 15,
                               borderTopWidth: i ? 1 : 0, borderTopColor: C.line }}>
          <Rich style={{ fontFamily: goes ? F.sansBold : F.sans, fontSize: fs(goes ? 11.5 : 10.5),
                         letterSpacing: goes ? 1.15 : 1, textTransform: "uppercase",
                         color: goes ? C.brand600 : C.muted, marginBottom: 5,
                         textAlign: rtl ? "right" : "left" }}>{tx(it.k)}</Rich>
          <Rich style={{ fontFamily: F.sans, fontSize: fs(goes ? 14 : 13.5),
                         lineHeight: fs(goes ? 22.5 : 22), color: C.ink,
                         textAlign: rtl ? "right" : "left" }}>{tx(it.v)}</Rich>
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
            ? <Text style={{ fontFamily: F.sansSemi, fontSize: fs(12.5), color: C.brand600, width: 16,
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
/* .mg-advisory — "Please also register your marriage legally", which is the
 * one thing on that screen a couple can get legally wrong. The website gives
 * it a rose panel, #FBF0EB inside #EBCDBF at 14px of radius, with an 11px
 * uppercase BOLD heading tracked .1em in #7C3A20 and the prose under it at
 * 13px in the same brown. No icon.
 *
 * It was being flattened into the generic warning box: heading and body glued
 * together with a blank line and set at the same weight, behind an ⓘ the
 * website does not have, so the heading stopped being a heading. */
export function Advisory({ h, ps }) {
  const { fs, tx, rtl } = useApp();
  const INK = "#7C3A20";
  const align = rtl ? "right" : "left";
  return (
    <View style={{ marginTop: 12, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 15,
                   backgroundColor: "#FBF0EB", borderWidth: 1, borderColor: "#EBCDBF" }}>
      {!!h && <Text style={{ fontFamily: F.sansBold, fontSize: fs(11), letterSpacing: 1.1,
                             textTransform: "uppercase", color: INK, marginBottom: 7,
                             textAlign: align }}>{tx(h)}</Text>}
      {(ps || []).map((x, i) => (
        <Rich key={i} style={{ fontFamily: F.sans, fontSize: fs(13), lineHeight: fs(21), color: INK,
                               marginTop: i ? 8 : 0, textAlign: align }}>{tx(x)}</Rich>))}
    </View>
  );
}

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

/* The same shape in three colours, because on the website it is the same shape
 * in three colours and the colour is the message. "Ring BCoM first" is red
 * because somebody is reading it at three in the morning; "Who reads this" is
 * gold because it is a reassurance. Rendering both in the default plum makes
 * them look like the same kind of remark, which is the one thing they are not. */
const CALLOUT_TONES = {
  /* .ad-note is DARK — linear-gradient(180deg, brand-800, brand-900) with
   * cream on it, a gold-bright label and #CBB8C4 prose. It was a 4.5% plum
   * tint with ink text: the same words, but as a faint aside instead of the
   * panel the website uses to say "this part is not open yet". It appears on
   * membership, advice, holidays, admissions, both education sheets and
   * collect, so one wrong tone was wrong on seven screens.
   * .ia-conf, the gold one, is a 13% fill inside a 42% border. */
  plum:   { dark: true, grad: [C.brand800, C.brand900], lab: C.goldBright,
            head: C.cream, body: "#CBB8C4" },
  danger: { bg: "rgba(180,83,47,.07)",  line: "rgba(180,83,47,.26)",  lab: C.danger },
  gold:   { bg: "rgba(198,162,76,.13)", line: "rgba(198,162,76,.42)", lab: C.goldInk },
};

/* The funeral screen's first panel, and the loudest thing in the app.
 *
 * Solid dark red rather than a tint, because on the website it is solid dark
 * red: somebody opening this at three in the morning is not reading, they are
 * looking for a number. The numbers are rows inside the panel and every one of
 * them is here — a callout would have kept the first and dropped the second,
 * which is precisely what happened before check-links.mjs noticed. */
/* Rules somebody is about to agree to.
 *
 * The dark panel the website uses for anything meant to be read rather than
 * skimmed (.cc-rules). A tick list in grey on cream, sitting directly above a
 * checkbox that says "I have read and agree", is a consent nobody gave. */
export function Rules({ h, ver, items }) {
  const { fs, tx, rtl } = useApp();
  const align = rtl ? "right" : "left";
  return (
    /* .cc-rules is linear-gradient(155deg, brand-600 0%, brand-900 72%) — it
       starts on the BRIGHT plum and runs down and to the left, reaching the
       dark one short of the bottom. This was brand-700 straight down. */
    <LinearGradient colors={[C.brand600, C.brand900]} locations={[0, 0.72]}
      start={{ x: 0.9, y: 0 }} end={{ x: 0.1, y: 1 }}
      style={{ borderRadius: R.card, padding: 17, gap: 11, marginTop: 14 }}>
      {!!h && <Rich style={{ fontFamily: F.display, fontSize: fs(17), lineHeight: fs(23),
                             color: C.cream, marginBottom: ver ? -7 : 0,
                             textAlign: align }}>{tx(h)}</Rich>}
      {/* .cc-ver — which version is being agreed to, 10.5px uppercase in
          gold-bright right under the heading. The request stores
          rules_version, so the screen has to name the same thing the record
          does; it was printed at the foot of the page instead, nowhere near
          the rules or the box that agrees to them. */}
      {!!ver && <Rich style={{ fontFamily: F.sans, fontSize: fs(10.5), letterSpacing: 0.84,
                               textTransform: "uppercase", color: C.goldBright, marginBottom: 2,
                               textAlign: align }}>{tx(ver)}</Rich>}
      {(items || []).map((it, i) => (
        <View key={i} style={{ flexDirection: rtl ? "row-reverse" : "row", gap: 9,
                               alignItems: "flex-start" }}>
          <Ionicons name="checkmark" size={15} color={C.goldBright} style={{ marginTop: 3 }} />
          <Rich style={{ flex: 1, fontFamily: F.sans, fontSize: fs(13), lineHeight: fs(21),
                         color: "rgba(243,239,227,.88)", textAlign: align }}>{tx(it)}</Rich>
        </View>))}
    </LinearGradient>
  );
}

export function Urgent({ lab, h, ps, nums }) {
  const { fs, tx, rtl } = useApp();
  const align = rtl ? "right" : "left";
  return (
    <LinearGradient colors={["#7A2A18", "#5A1D10"]} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
      style={{ borderRadius: R.card, padding: 17, gap: 9, marginTop: 14 }}>
      {!!lab && <Text style={{ fontFamily: F.sansSemi, fontSize: fs(10), letterSpacing: 1.4,
                               textTransform: "uppercase", color: "#F0C9A8", textAlign: align }}>
        {tx(lab)}</Text>}
      {!!h && <Rich style={{ fontFamily: F.display, fontSize: fs(18), lineHeight: fs(25),
                             color: "#F3EFE3", textAlign: align }}>{tx(h)}</Rich>}
      {(ps || []).map((x, i) => (
        <Rich key={i} style={{ fontFamily: F.sans, fontSize: fs(13), lineHeight: fs(21),
                               color: "#E6C8BA", textAlign: align }}>{tx(x)}</Rich>))}
      <View style={{ gap: 8, marginTop: 5 }}>
        {(nums || []).map((n, i) => (
          <Press key={i} onPress={() => { tap(); open(n.href); }}
            style={{ flexDirection: rtl ? "row-reverse" : "row", alignItems: "center",
                     justifyContent: "space-between", gap: 10, paddingVertical: 11,
                     paddingHorizontal: 13, borderRadius: 12,
                     backgroundColor: "rgba(255,255,255,.1)",
                     borderWidth: 1, borderColor: "rgba(255,255,255,.18)" }}>
            {!!n.who && <Text style={{ fontFamily: F.sansSemi, fontSize: fs(11), letterSpacing: 0.7,
                                       textTransform: "uppercase", color: "#EFD3C4" }}>{tx(n.who)}</Text>}
            {!!n.no && <Text style={{ fontFamily: F.sansSemi, fontSize: fs(16), color: "#F3EFE3" }}>
              {tx(n.no)}</Text>}
          </Press>))}
      </View>
    </LinearGradient>
  );
}

export function Callout({ lab, h, ps, cta, ctaAt, tone = "plum" }) {
  const { fs, tx, rtl } = useApp();
  const c = CALLOUT_TONES[tone] || CALLOUT_TONES.plum;
  const align = rtl ? "right" : "left";
  const body = ps || [];
  /* .ad-apply — a FILLED brand-600 bar at 11px of radius, the label 13px bold
     on the left and the ↗ hard right, 11/13 of padding. It was the shared
     gradient pill with everything centred, which on a dark panel read as a
     second paragraph rather than the thing to tap. */
  const button = !cta ? null : (
    <Pressable key="cta" onPress={() => cta.href && open(cta.href)}
      style={({ pressed }) => ({ flexDirection: rtl ? "row-reverse" : "row", alignItems: "center",
                                 justifyContent: "space-between", gap: 8,
                                 marginTop: 10, marginBottom: 12, paddingVertical: 11, paddingHorizontal: 13,
                                 borderRadius: 11, backgroundColor: C.brand600,
                                 opacity: pressed ? 0.88 : 1 })}>
      <Text style={{ fontFamily: F.sansBold, fontSize: fs(13), color: "#FFFFFF" }}>{tx(cta)}</Text>
      <Text style={{ fontFamily: F.sans, fontSize: fs(13), color: "#FFFFFF" }}>↗</Text>
    </Pressable>
  );
  /* The website puts it BETWEEN the paragraphs on admissions, so "The office
     takes admission queries between 5pm and 7pm" is the last word before you
     tap. Appending it at the end stranded that line above the button. */
  const at = cta ? (typeof ctaAt === "number" ? ctaAt : body.length) : -1;
  const inner = (
    <>
      {!!lab && <Text style={{ fontFamily: F.sansSemi, fontSize: fs(10), letterSpacing: 1.4,
                               textTransform: "uppercase", color: c.lab, marginBottom: 7,
                               textAlign: align }}>{tx(lab)}</Text>}
      {!!h && <Rich style={{ fontFamily: F.display, fontSize: fs(15.5), lineHeight: fs(22.5),
                             color: c.dark ? c.head : C.ink, textAlign: align }}>{tx(h)}</Rich>}
      {body.flatMap((x, i) => [
        c.dark
          ? <Rich key={i} style={{ fontFamily: F.sans, fontSize: fs(13), lineHeight: fs(21.5),
                                   color: c.body, marginTop: 8, textAlign: align }}>{tx(x)}</Rich>
          : <P key={i} muted>{tx(x)}</P>,
        i + 1 === at ? button : null,
      ])}
      {at >= body.length ? button : null}
    </>
  );
  if (c.dark) return (
    <LinearGradient colors={c.grad} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
      style={{ borderRadius: 15, paddingVertical: 16, paddingHorizontal: 15, marginTop: 14 }}>
      {inner}
    </LinearGradient>
  );
  return (
    <View style={{ backgroundColor: c.bg, borderWidth: 1, borderColor: c.line,
                   borderRadius: 14, paddingVertical: 13, paddingHorizontal: 15, gap: 8, marginTop: 14 }}>
      {inner}
    </View>
  );
}

/* .gv-lab — the label over each chooser on the giving screen: 11px BOLD,
 * uppercase, .14em of tracking, muted, 18 above and 9 below. Each of these
 * had been a section Heading with a gold rule, which made one decision read
 * as three separate parts of the page. */
export function GLab({ children }) {
  const { fs, rtl } = useApp();
  return (
    <Text style={{ fontFamily: F.sansBold, fontSize: fs(11), letterSpacing: 1.54,
                   textTransform: "uppercase", color: C.muted, marginTop: 18, marginBottom: 9,
                   textAlign: rtl ? "right" : "left" }}>{children}</Text>
  );
}

/* .gv-cta — the one button in the app that takes money, and the only GOLD one
 * on the site: a gold-bright to gold gradient with near-black text, 16px of
 * radius and 15/18 of padding, the amount in Fraunces at 20 over a 10.5px
 * uppercase line at 85%. It was drawing as the ordinary plum pill, so it
 * looked like every other button in the app. */
export function GoldCTA({ label, sub, href, onPress, disabled }) {
  const { fs } = useApp();
  const act = onPress || (href ? () => open(href) : null);
  if (disabled || !act) return (
    <View style={{ marginTop: 16, borderRadius: 16, paddingVertical: 15, paddingHorizontal: 18,
                   alignItems: "center", gap: 3, backgroundColor: C.line }}>
      <Text style={{ fontFamily: F.display, fontSize: fs(20), color: C.muted }}>{label}</Text>
      {!!sub && <Text style={{ fontFamily: F.sans, fontSize: fs(10.5), letterSpacing: 0.95,
                               textTransform: "uppercase", color: C.muted }}>{sub}</Text>}
    </View>
  );
  return (
    <Pressable onPress={() => { tap(); act(); }}
      style={({ pressed }) => [{ marginTop: 16, borderRadius: 16, overflow: "hidden",
                                 opacity: pressed ? 0.9 : 1 }, SHADOW]}>
      <LinearGradient colors={[C.goldBright, C.gold]} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
        style={{ paddingVertical: 15, paddingHorizontal: 18, alignItems: "center", gap: 3 }}>
        <Text style={{ fontFamily: F.display, fontSize: fs(20), color: "#3A2A08" }}>{label}</Text>
        {!!sub && <Text style={{ fontFamily: F.sans, fontSize: fs(10.5), letterSpacing: 0.95,
                                 textTransform: "uppercase", color: "#3A2A08", opacity: 0.85,
                                 textAlign: "center" }}>{sub}</Text>}
      </LinearGradient>
    </Pressable>
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
        <Text style={{ fontFamily: F.sansBold, fontSize: fs(compact ? 14 : 17), letterSpacing: 0.17,
                       color: tone === "gold" ? C.brand900 : "#F6F2E6" }}>{label}</Text>
        {/* .dc-sub — 11.5px UPPERCASE with .08em of tracking in GOLD-BRIGHT.
            It was sentence case in a dimmed cream, which read as a caption
            under the button rather than as what the button accepts. */}
        {!!sub && <Text style={{ fontFamily: F.sans, fontSize: fs(11.5), letterSpacing: 0.92,
                                 textTransform: "uppercase", marginTop: 2.5, textAlign: "center",
                                 color: tone === "gold" ? "rgba(60,11,42,.72)" : C.goldBright }}>{sub}</Text>}
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
          <View style={{ flex: 1, gap: 3 }}>
            {/* .bk-k is 10.5px UPPERCASE with .12em of tracking and .bk-v is
                16px at 600. Sentence case at 11.5 over 15 made a sort code
                read as a sentence with a number after it. */}
            <Text style={{ fontFamily: F.sans, fontSize: fs(10.5), letterSpacing: 1.26,
                           textTransform: "uppercase", color: C.muted,
                           textAlign: rtl ? "right" : "left" }}>
              {tx(it.k)}{copied === i ? ` · ${t("ui.copied", "Copied")}` : ""}</Text>
            <Text style={{ fontFamily: F.sansSemi, fontSize: fs(16), letterSpacing: 0.16, color: C.ink,
                           textAlign: rtl ? "right" : "left" }}>{tx(it.v)}</Text>
          </View>
        </Press>))}
    </RowGroup>
  );
}

/* The three marks the website draws itself. Ionicons has no X — only the old
 * bird, which is a different company's logo and has not been Twitter's mark
 * since 2023. These are the website's own paths. */
const SOCIAL_SVG = {
  instagram: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.2" cy="6.8" r="1.1" fill="currentColor" stroke="none"/></svg>',
  x: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.53 3h3.06l-6.69 7.64L21.75 21h-6.16l-4.83-6.3L5.24 21H2.18l7.15-8.17L2.25 3h6.32l4.36 5.77L17.53 3Zm-1.07 16.13h1.7L7.62 4.78H5.8l10.66 14.35Z"/></svg>',
  youtube: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M21.6 7.2a2.5 2.5 0 0 0-1.76-1.77C18.25 5 12 5 12 5s-6.25 0-7.84.43A2.5 2.5 0 0 0 2.4 7.2 26.2 26.2 0 0 0 2 12a26.2 26.2 0 0 0 .4 4.8 2.5 2.5 0 0 0 1.76 1.77C5.75 19 12 19 12 19s6.25 0 7.84-.43a2.5 2.5 0 0 0 1.76-1.77A26.2 26.2 0 0 0 22 12a26.2 26.2 0 0 0-.4-4.8ZM10.1 14.9V9.1l5.05 2.9-5.05 2.9Z"/></svg>',
};

export function Social({ items }) {
  return (
    <View style={{ flexDirection: "row", gap: 9, marginTop: 22, marginHorizontal: 6 }}>
      {items.map((it, i) => {
        const key = /instagram/i.test(it.href) ? "instagram"
                  : /youtube/i.test(it.href) ? "youtube"
                  : /twitter|x\.com/i.test(it.href) ? "x" : null;
        return (
          <Pressable key={i} onPress={() => open(it.href)} accessibilityLabel={it.label}
            /* .dr-social a — a wide rounded rectangle filled #F0E9ED with no
               border, 12px of radius, 12px of vertical padding. These were
               42px outlined circles, which read as three small icon buttons
               rather than the row of panels the website has. */
            style={({ pressed }) => ({ flex: 1, paddingVertical: 12, paddingHorizontal: 4, borderRadius: 12,
                                       alignItems: "center", justifyContent: "center",
                                       backgroundColor: pressed ? "#E8DCE4" : "#F0E9ED" })}>
            {key ? <SvgXml xml={SOCIAL_SVG[key]} width={19} height={19} color={C.brand600} />
                 : <Ionicons name="globe-outline" size={19} color={C.brand600} />}
          </Pressable>);
      })}
    </View>
  );
}

/* A line whose words are split across spans — "Rafik Patel — 07951 795 465"
 * — carries the key for the part that translates and the English of that part
 * beside it, so the swap can be made inside the line and the digits left as
 * they are. Translating the whole line would have put the phone number through
 * the Urdu pack. */
export function partly(tx, b) {
  if (!b.k2 || !b.t2) return b.t;
  const one = tx({ k: b.k2, t: b.t2 });
  return one === b.t2 ? b.t : b.t.replace(b.t2, one);
}

/* .cc-help — the "Need help with this form?" card at the foot of the charity
 * collections form, and the only block on the site shaped like this: a
 * question in ink over a number in plum, 3px apart, in a quiet card with no
 * chip, no chevron and nothing to say it leads anywhere except that it is the
 * colour of a link. The app had been drawing the question as loose prose and
 * the number as a full-width navigation row with a handset in a tile, which
 * made the smallest thing on the screen the biggest. */
export function Help({ t: label, link }) {
  const { fs, tx } = useApp();
  return (
    <View style={{ marginTop: 18, paddingVertical: 13, paddingHorizontal: 15, borderRadius: 12,
                   borderWidth: 1, borderColor: C.line, backgroundColor: C.card, gap: 3 }}>
      <Text style={{ fontFamily: F.sansBold, fontSize: fs(13), lineHeight: fs(21), color: C.ink }}>
        {label}</Text>
      {!!link && (
        <Press onPress={() => { tap(); open(link.href); }} style={{ alignSelf: "flex-start" }}>
          <Text style={{ fontFamily: F.sansBold, fontSize: fs(13), lineHeight: fs(21), color: C.brand600 }}>
            {partly(tx, link)}</Text>
        </Press>)}
    </View>
  );
}

/* The <footer> that closes the two scrolling tab pages, Home and Prayer
 * Times. The website draws a 16px gold star, then — on Prayer Times only —
 * the line naming the timetable the figures come from, then the charity
 * registration and "Powered by MasjidOne", the last two a step smaller and
 * in a lighter grey than the muted used everywhere else, with the credit
 * underlined rather than coloured.
 *
 * Home had a 26px star at 75% opacity over an 11px charity line and a plum
 * MasjidOne, so the ornament was half again too big and the credit read as
 * something to press. Prayer Times had no footer at all: its "Times from the
 * official 2026 Salah Timetable" sat left-aligned as an ordinary note and the
 * charity line was missing from the screen entirely. */
export function PageFoot({ note }) {
  const { t, fs } = useApp();
  const faint = "#A49AA0";
  return (
    <View style={{ alignItems: "center", marginTop: 26, paddingHorizontal: 6 }}>
      <Svg width={16} height={16} viewBox="0 0 100 100">
        <Polygon fill={C.gold} points="50,2 57.3,32.4 83.9,16.1 67.6,42.7 98,50 67.6,57.3 83.9,83.9 57.3,67.6 50,98 42.7,67.6 16.1,83.9 32.4,57.3 2,50 32.4,42.7 16.1,16.1 42.7,32.4" />
      </Svg>
      {!!note && (
        <Text style={{ fontFamily: F.sans, fontSize: fs(11), lineHeight: fs(19), color: C.muted,
                       textAlign: "center", marginTop: 8 }}>{note}</Text>)}
      <Text style={{ fontFamily: F.sans, fontSize: fs(10.5), lineHeight: fs(18), color: faint,
                     textAlign: "center", marginTop: 12 }}>
        {t("common.registered_charity", "Bolton Central Islamic Society · Registered charity")} 1041569</Text>
      <Press onPress={() => { tap(); open("https://masjidone.co.uk"); }}
             style={{ flexDirection: "row", gap: 4, marginTop: 6 }}>
        <Text style={{ fontFamily: F.sans, fontSize: fs(10.5), color: faint }}>
          {t("sheet.app_built_by", "Powered by")}</Text>
        <Text style={{ fontFamily: F.sans, fontSize: fs(10.5), color: C.muted,
                       borderBottomWidth: 1, borderBottomColor: "rgba(124,110,119,.3)" }}>
          {t("sheet.masjidone", "MasjidOne")}</Text>
      </Press>
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

/* .vd-all — a centred link that is a full-width #F0E9ED panel, radius 12,
 * 13px of padding, the label 13px semibold in brand-600. It was a row with a
 * chevron in a bordered group, which is a different piece of furniture. */
export function PanelLink({ label, href, onPress }) {
  const { fs } = useApp();
  return (
    <Pressable onPress={onPress || (() => open(href))}
      style={({ pressed }) => ({ borderRadius: 12, paddingVertical: 13, paddingHorizontal: 13,
                                 marginTop: 16, marginBottom: 10,
                                 backgroundColor: pressed ? "#E8DCE4" : "#F0E9ED" })}>
      <Text style={{ fontFamily: F.sansSemi, fontSize: fs(13), color: C.brand600, textAlign: "center" }}>
        {label}
      </Text>
    </Pressable>
  );
}
