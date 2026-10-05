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
import { Screen, Hero, Heading, Card, P, Note, RowGroup, NavRow, Pill, Press, tap, open } from "../ui";

const SIZES = [
  { v: 1.0,  k: "sysprefs.small",   t: "Small" },
  { v: 1.12, k: "sysprefs.default", t: "Default" },
  { v: 1.28, k: "sysprefs.large",   t: "Large" },
  { v: 1.45, k: "sysprefs.larger",  t: "Larger" },
];

export default function Prefs({ navigation }) {
  const { t, fs, lang, setLang, scale, setScale } = useApp();
  return (
    <Screen pad={false}>
      <Hero lines={[{ k: "sysprefs.system_preferences", t: "System Preferences", w: "title" }]} />
      <View style={{ paddingHorizontal: 16 }}>

        <Heading>{t("sysprefs.display_language", "Display & language")}</Heading>
        <Note>{t("sysprefs.choose_the_language_the_app",
          "Choose the language the app runs in. Packs download once and then work offline.")}</Note>
        <Card gap={0} pad={0}>
          {LANGS.map((l, i) => {
            const on = l.code === lang;
            return (
              <Press key={l.code} onPress={() => { tap(); setLang(l.code); }}
                style={{ flexDirection: "row", alignItems: "center", gap: 12,
                         paddingHorizontal: 15, paddingVertical: 14,
                         borderTopWidth: i ? 1 : 0, borderTopColor: C.line }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: F.sansMedium, fontSize: fs(14.5), color: C.ink }}>{l.name}</Text>
                  {/* Amiri is an Arabic face — it carries Urdu, but it has no
                      Gujarati at all, so that one stays in the sans. */}
                  <Text style={{ fontFamily: l.code === "ar" || l.code === "ur" ? F.arabic : F.sans,
                                 fontSize: fs(l.code === "en" ? 12 : 15), color: C.muted, marginTop: 2,
                                 textAlign: "left", alignSelf: "flex-start",
                                 writingDirection: l.code === "ar" || l.code === "ur" ? "rtl" : "ltr" }}>
                    {l.native}</Text>
                </View>
                {l.code !== "en" && <Pill>{t("sysprefs.not_yet_reviewed", "Being reviewed")}</Pill>}
                {on && <Ionicons name="checkmark" size={20} color={C.brand600} />}
              </Press>);
          })}
        </Card>
        <View style={{ marginTop: 11 }}>
          <Note>{t("sysprefs.lang_note",
            "The Urdu, Gujarati and Arabic wording has not yet been checked by a native speaker. Anything not yet translated shows in English rather than as a blank.")}</Note>
        </View>

        <Heading>{t("sysprefs.text_size", "Text size")}</Heading>
        <P muted>{t("sysprefs.pick_the_size_that_reads",
          "Pick the size that reads most easily. It applies everywhere in the app.")}</P>
        <View style={{ flexDirection: "row", gap: 7, marginTop: 12 }}>
          {SIZES.map(s => {
            const on = Math.abs(scale - s.v) < 0.01;
            return (
              <Pressable key={s.v} onPress={() => { tap(); setScale(s.v); }}
                style={{ flex: 1, alignItems: "center", paddingVertical: 13, borderRadius: 13,
                         borderWidth: on ? 1.6 : 1, borderColor: on ? C.brand600 : C.line,
                         backgroundColor: on ? "rgba(119,33,87,.07)" : C.card }}>
                <Text style={{ fontFamily: F.sansMedium, fontSize: Math.round(13 * s.v),
                               color: on ? C.brand600 : C.ink }}>Aa</Text>
                <Text style={{ fontFamily: F.sans, fontSize: 10.5, color: C.muted, marginTop: 3 }}>
                  {t(s.k, s.t)}</Text>
              </Pressable>);
          })}
        </View>
        <Card style={{ marginTop: 13 }}>
          <Text style={{ fontFamily: F.display, fontSize: fs(15), color: C.ink }}>
            {t("sysprefs.sample_h", "A sample, at this size")}</Text>
          <P muted>{t("sysprefs.the_quick_brown_sample", "Bismillāh — this is how the app will read.")}</P>
          <P muted>{t("sysprefs.sample",
            "“And establish prayer and give zakāh and obey the Messenger — that you may receive mercy.”")}</P>
        </Card>

        <Heading>{t("sysprefs.about_this_app", "About this app")}</Heading>
        <RowGroup>
          <NavRow icon="shield-checkmark-outline" label={t("privacy.privacy_notice", "Privacy notice")}
                  onPress={() => navigation.navigate("Privacy")} />
          <NavRow icon="information-circle-outline" label={t("about.about_us", "About us")}
                  onPress={() => navigation.navigate("About")} />
        </RowGroup>
        <View style={{ marginTop: 14, alignItems: "center", gap: 3 }}>
          <Text style={{ fontFamily: F.sans, fontSize: fs(11), color: C.muted }}>
            Taiyabah Masjid · {t("collect.version", "Version")} 1.0.0</Text>
          <Text style={{ fontFamily: F.sans, fontSize: fs(11), color: C.muted }}>
            Bolton Central Islamic Society · Registered charity 1041569</Text>
        </View>
      </View>
    </Screen>
  );
}
