/* Display and language.
 *
 * Both settings take effect the instant they are tapped, across the whole app —
 * no reload, no restart, nothing to confirm. The sample paragraph above the size
 * control changes with it, because the only way to choose a text size is to read
 * something at it.
 */
import React from "react";
import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { C, F, R } from "../theme";
import { useApp, LANGS } from "../store";
import { SHEETS } from "../Blocks";
import { Screen, Hero, Heading, Card, P, Note, Press, tap, open } from "../ui";
import Constants from "expo-constants";

/* TS_STEPS, exactly as the website has them: the same four multipliers and
 * the same four names. The app had renamed the middle two "Default" and
 * "Larger", and used 1.28 and 1.45 where the site uses 1.26 and 1.42 — so a
 * reader who had chosen a size on the website got a different size here, and
 * the one they had chosen was not on the list. */
const SIZES = [
  { v: 1.00, k: "sysprefs.small",       t: "Small" },
  { v: 1.12, k: "sysprefs.medium",      t: "Medium" },
  { v: 1.26, k: "sysprefs.large",       t: "Large" },
  { v: 1.42, k: "sysprefs.extra_large", t: "Extra large" },
];

export default function Prefs() {
  const { t, fs, lang, setLang, scale, setScale } = useApp();
  return (
    <Screen pad={false}>
      {/* .ia-hero's title is "Display & Language". The app used the sheet
          header's own title instead, so the bar said System Preferences and
          the hero said it again directly underneath. */}
      <Hero ring={SHEETS.sysprefs?.ring}
            lines={[{ k: "sysprefs.display_language", t: "Display & Language", w: "title" }]} />
      <View style={{ paddingHorizontal: 16 }}>

        <Heading>{t("sysprefs.text_size", "Text size")}</Heading>
        <P muted>{t("sysprefs.pick_the_size_that_reads",
          "Pick the size that reads most easily. It applies everywhere in the app.")}</P>
        {/* .ts-pick button: 12px of radius, 12/6 of padding, a line border,
            and the chosen one FILLED brand-700 with cream on it. A plum tint
            inside a plum outline reads as a hint rather than a choice. The
            glyph is a single A at the size it sets, over an uppercase label. */}
        <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
          {SIZES.map(s => {
            const on = Math.abs(scale - s.v) < 0.01;
            return (
              <Pressable key={s.v} onPress={() => { tap(); setScale(s.v); }}
                style={{ flex: 1, minWidth: 0, alignItems: "center", paddingVertical: 12, paddingHorizontal: 6,
                         borderRadius: 12, borderWidth: 1,
                         borderColor: on ? C.brand700 : C.line,
                         backgroundColor: on ? C.brand700 : C.card }}>
                <Text style={{ fontFamily: F.sansBold, fontSize: Math.round(14 * s.v),
                               color: on ? C.cream : C.ink }}>A</Text>
                <Text style={{ fontFamily: F.sansSemi, fontSize: 10, letterSpacing: 0.3,
                               textTransform: "uppercase", marginTop: 3,
                               color: on ? "#E7D9E2" : C.muted }}>{t(s.k, s.t)}</Text>
              </Pressable>);
          })}
        </View>
        {/* .ts-demo — one line on the paper, 12px radius, a line border. The
            heading and the second paragraph above it were mine. */}
        <View style={{ marginTop: 12, marginBottom: 10, paddingVertical: 13, paddingHorizontal: 15,
                       borderRadius: 12, backgroundColor: C.paper, borderWidth: 1, borderColor: C.line }}>
          <Text style={{ fontFamily: F.sans, fontSize: fs(15), lineHeight: fs(23), color: C.ink }}>
            {t("sysprefs.the_quick_brown_sample", "Bismillāh — this is how the app will read.")}</Text>
        </View>

        {/* No tag on the website: "Display & Language" is the hero's title,
            not a note at the end of this rule. */}
        <Heading>{t("sysprefs.language", "Language")}</Heading>
        <P muted>{t("sysprefs.choose_the_language_the_app",
          "Choose the language the app runs in. Packs download once and then work offline.")}</P>
        <Card gap={0} pad={0}>
          {LANGS.map((l, i) => {
            const on = l.code === lang;
            const rtlScript = l.code === "ar" || l.code === "ur";
            return (
              <Press key={l.code} onPress={() => { tap(); setLang(l.code); }}
                style={{ flexDirection: "row", alignItems: "center", gap: 12,
                         paddingHorizontal: 15, paddingVertical: 14,
                         borderTopWidth: i ? 1 : 0, borderTopColor: C.line }}>
                <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                  {/* .sp-native is the PRIMARY line — 15.5px at weight 700 in
                      ink — and the English name sits under it in the muted
                      grey. This had them the other way about, so every row
                      led in English and the script it offers was the note. */}
                  <Text style={{ fontFamily: rtlScript ? F.arabic : F.sansBold,
                                 fontSize: fs(rtlScript ? 16.5 : 15.5), color: C.ink,
                                 alignSelf: "flex-start",
                                 writingDirection: rtlScript ? "rtl" : "ltr" }}>
                    {l.native}</Text>
                  <Text style={{ fontFamily: F.sans, fontSize: fs(12.5), color: C.muted }}>{l.name}</Text>
                </View>
                {/* .sp-state: a white tick on a filled brand-600 circle when
                    this is the language in use, and nothing when it is not. */}
                {on && (
                  <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: C.brand600,
                                 alignItems: "center", justifyContent: "center" }}>
                    <Ionicons name="checkmark" size={14} color="#fff" />
                  </View>)}
              </Press>);
          })}
        </Card>
        <View style={{ marginTop: 11 }}>
          <Note>{t("sysprefs.lang_note",
            "The Urdu, Gujarati and Arabic wording has not yet been checked by a native speaker. Anything not yet translated shows in English rather than as a blank.")}</Note>
        </View>

        {/* The website ends here, with the charity line under the language
            card. An "About this app" section with Privacy notice and About us
            was the app's own, and both are one tap away in the menu — the
            same two rows, twice.

            The version stays: somebody reporting a problem has to be able to
            say which build they are on, and it is the only thing on this
            screen the website could not have. It reads the manifest rather
            than a number typed here, which had been stuck at 1.0.0 while the
            app shipped as 2.0.0. */}
        <View style={{ marginTop: 14, alignItems: "center", gap: 3 }}>
          <Text style={{ fontFamily: F.sans, fontSize: fs(11), color: C.muted }}>
            Bolton Central Islamic Society · Registered charity 1041569</Text>
          <Text style={{ fontFamily: F.sans, fontSize: fs(11), color: C.muted }}>
            Taiyabah Masjid · {t("collect.version", "Version")}{" "}
            {Constants.expoConfig?.version || ""}</Text>
        </View>
      </View>
    </Screen>
  );
}
