/* Hajj & Umrah — the front of the section, and the gate.
 * Copyright (c) 2026 Yameen Bux. All rights reserved. See LICENSE.md.
 *
 * HELD, which is what the public sees today: a poster on the Ramadan
 * countdown's own furniture, offering the two things that already work with
 * no signal — the duʿā book and the way to reach the ʿulamā. It promises
 * nothing it cannot keep: nothing here reaches the masjid and nobody is
 * signed up for anything.
 *
 * It used to be a COMING SOON chip over four tiles previewing the duʿās, the
 * counters, the steps and the rulings. That is placeholder content, which
 * guideline 2.1 asks to have scrubbed before submission, and it was found by
 * App Review. The screen now states what the masjid offers today rather than
 * what the app will offer later.
 *
 * OPEN, once the masjid releases it: a different screen entirely, listing the
 * branches that are actually ready. hajj.js decides which those are — a fiqh
 * branch whose entries carry no approver's name is not offered at all, so the
 * drafts in hajj/content.js cannot appear here however the switch is thrown.
 *
 * MISHKĀT. The section is the one dark place in the app: the lamp at the top,
 * frosted panels, the masjid's mark at the foot. hajj-ui.jsx holds that and
 * index.html#hajj is the same screen on the website.
 */
import React from "react";
import { View, Text, Image } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Ionicons from "@expo/vector-icons/Ionicons";
import { C, F, R, HJ } from "../theme";
import { useApp } from "../store";
import { Screen, Press, StarField } from "../ui";
import { HajjRow, HajjChevron } from "../hajj-ui";
import { hajjAccess } from "../hajj";
import { BRANCHES } from "../hajj-data";





/* ONE JOURNEY, AS A CARD. The picture carries the place and the words carry
 * the promise, laid out the way a phone is held: the image on the leading
 * edge where the eye starts, the label beside it, the chevron where the thumb
 * already is.
 *
 * THE SCRIM IS NOT DECORATION. Both photographs are bright — a lit marble
 * floor, white canvas at dusk — and dropped straight onto this ground they
 * read as two windows cut out of the screen. A plum veil over each one sits
 * them back into the section and keeps the cream type above them legible,
 * which on a frosted panel it otherwise is not.
 */
function JourneyCard({ image, label, detail, onPress }) {
  const { fs, rtl } = useApp();
  return (
    <Press onPress={onPress} accessibilityRole="button" accessibilityLabel={label}
           style={{ flexDirection: rtl ? "row-reverse" : "row", alignItems: "center",
                    gap: 14, padding: 12, marginTop: 12,
                    backgroundColor: HJ.panel, borderRadius: R.card,
                    borderWidth: 1, borderColor: HJ.panelLine }}>
      <View style={{ width: 92, height: 92, borderRadius: 14, overflow: "hidden",
                     borderWidth: 1, borderColor: HJ.goldLine }}>
        <Image source={image} style={{ width: "100%", height: "100%", resizeMode: "cover" }} />
        <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
                       backgroundColor: "rgba(27,6,19,0.16)" }} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: F.sansSemi, fontSize: fs(15), lineHeight: fs(21),
                       color: HJ.ink, textAlign: rtl ? "right" : "left" }}>{label}</Text>
        <Text style={{ fontFamily: F.sans, fontSize: fs(12.5), lineHeight: fs(18.5),
                       color: HJ.inkFaint, marginTop: 4,
                       textAlign: rtl ? "right" : "left" }}>{detail}</Text>
      </View>
      <HajjChevron />
    </Press>
  );
}

export default function Hajj({ navigation }) {
  const { t, fs, rtl } = useApp();
  const access = hajjAccess(BRANCHES);

  /* THREE DESIGNS, SWITCHABLE WHILE THEY ARE BEING CHOSEN BETWEEN.
     TEMPORARY SCAFFOLDING — the chosen one stays and this switch goes. */
  const JOURNEYS = [
    { img: require("../../assets/journey-umrah.png"),
      label: t("hajj.plan_your_umrah", "Plan your journey: ʿUmrah"),
      detail: t("hajj.the_rites_in_order", "The rites in order, iḥrām, and the duʿās"),
      go: () => navigation.navigate("HajjJourney", { journey: "umrah" }) },
    { img: require("../../assets/journey-hajj.png"),
      label: t("hajj.plan_your_hajj", "Plan your journey: Hajj"),
      detail: t("hajj.the_case_the_heat", "The case, the heat, the paperwork and coming home"),
      go: () => navigation.navigate("HajjJourney", { journey: "hajj" }) },
  ];

  if (access.open) {

    /* THE PICTURE IS THE BUTTON. Careem's city list and Google Photos' memory
       cards both work this way: a photograph at the full width of the row, the
       words on a scrim at its foot, nothing else. It fills the height the
       first design left empty, and at this size the Ḥaram and the tents read
       as places rather than as stamps.

       THE PHOTOGRAPHS ARE CUT FOR THIS ROW AND NOT FOR A THUMBNAIL. Both were
       square, with their subject low in the frame, and a square dropped into a
       361×210 row is centre-cropped — which took the Kaʿbah out of the ʿUmrah
       card and left it a picture of some towers. They are now cut at the row's
       own 1.72, with the Kaʿbah where the eye lands and the valley at Minā
       carrying its hills, and both still stop above the crowd. An asset for a
       row is not an asset for a square. */
      return (
        <Screen scroll={false} pad={false} bg={HJ.ground}>
          <LinearGradient colors={[HJ.groundTop, HJ.groundMid, HJ.ground]} locations={[0, 0.45, 1]}
                          style={{ flex: 1, paddingHorizontal: 16, paddingTop: 22, paddingBottom: 18 }}>
            <Text style={{ fontFamily: F.sansBold, fontSize: fs(10.5), color: HJ.gold,
                           letterSpacing: 3.4, textTransform: "uppercase" }}>
              {t("marriage.hajj_umrah", "Hajj / Umrah")}
            </Text>
            <Text style={{ fontFamily: F.display, fontSize: fs(26), lineHeight: fs(31),
                           color: HJ.ink, marginTop: 7 }}>
              {t("hajj.before_you_travel", "Before you travel")}
            </Text>
            <Text style={{ fontFamily: F.sans, fontSize: fs(13), lineHeight: fs(20),
                           color: HJ.inkFaint, marginTop: 6 }}>
              {t("hajj.choose_the_journey",
                 "Choose the journey you are making. The packing, the heat and the paperwork are the same for both.")}
            </Text>

            <View style={{ flex: 1, justifyContent: "center", gap: 13, marginTop: 14 }}>
              {JOURNEYS.map(jn => (
                <Press key={jn.label} onPress={jn.go} accessibilityRole="button"
                       accessibilityLabel={jn.label}
                       style={{ flex: 1, maxHeight: 210, borderRadius: R.card, overflow: "hidden",
                                borderWidth: 1, borderColor: HJ.goldLine }}>
                  <Image source={jn.img} style={{ width: "100%", height: "100%", resizeMode: "cover" }} />
                  {/* THE SCRIM STARTS LATE AND STAYS OFF THE SUBJECT. Run from
                      the top at 0.55 it greyed the whole photograph and left
                      the Kaʿbah a shape behind the title. It now does nothing
                      for the first half of the card and only darkens where the
                      words actually sit — and the ʿUmrah picture is cut so the
                      Kaʿbah stands to the right of them, clear of the text. */}
                  <LinearGradient colors={["rgba(27,6,19,0)", "rgba(27,6,19,0.08)", "rgba(27,6,19,0.80)"]}
                                  locations={[0, 0.5, 1]}
                                  style={{ position: "absolute", left: 0, right: 0, bottom: 0, top: 0,
                                           justifyContent: "flex-end", padding: 15 }}>
                    <Text style={{ fontFamily: F.sansSemi, fontSize: fs(17), color: HJ.ink }}>{jn.label}</Text>
                    <Text style={{ fontFamily: F.sans, fontSize: fs(12.5), lineHeight: fs(18.5),
                                   color: HJ.inkSoft, marginTop: 3 }}>{jn.detail}</Text>
                  </LinearGradient>
                </Press>
              ))}
            </View>

            <Image source={require("../../assets/logo.png")}
                   style={{ width: 86, height: 62, resizeMode: "contain", alignSelf: "center", marginTop: 12 }}
                   accessibilityLabel={t("a11y.taiyabah_masjid", "Taiyabah Masjid")} />
          </LinearGradient>
        </Screen>
      );

  }

  /* THE HELD SCREEN. Built on the Ramadan countdown's own furniture — the
     same gradient, the same Star out of ui.jsx, the same three-part stack of
     words, middle and mark — so the two posters are one design rather than
     two that resemble each other. No countdown: Ramadan has a date to count
     to and this does not.

     IT SAYS NOTHING IN THE FUTURE TENSE, and that is deliberate. What stood
     here was a COMING SOON chip over four tiles previewing the duʿās, the
     counters, the steps and the rulings, under a line promising they would
     be checked "before it appears here". Guideline 2.1 asks for placeholder
     and temporary content to be scrubbed before submission, and a screen
     whose whole message is that a feature does not exist yet is the thing
     that rule names. This says what the masjid has for the journey TODAY,
     and both rows work offline. */
  return (
    <Screen scroll={false} pad={false} bg={C.brand900}>
      <LinearGradient
        colors={[C.brand700, C.brand800, C.brand900]}
        locations={[0, 0.44, 1]}
        style={{ flex: 1, alignItems: "center", justifyContent: "space-between",
                 paddingHorizontal: 34, paddingTop: 54, paddingBottom: 40 }}>

        {/* Sized to the phone and centred on the whole poster — ui.jsx
            says why the fixed 560 was wider than the screen. */}
        <StarField gold={C.gold} bright={C.goldBright} />

        {/* 1. the words */}
        <View style={{ alignItems: "center" }}>
          <Text style={{ fontFamily: F.sansBold, fontSize: fs(10.5), color: C.gold,
                         letterSpacing: 3.4, textTransform: "uppercase" }}>
            {t("marriage.hajj_umrah", "Hajj / Umrah")}
          </Text>
          <Text style={{ fontFamily: F.display, fontSize: fs(38), lineHeight: fs(42),
                         color: C.cream, textAlign: "center", marginTop: 14 }}>
            {t("hajj.before_you_travel", "Before you travel")}
          </Text>
          <View style={{ width: 46, height: 2, backgroundColor: C.gold,
                         opacity: 0.9, marginTop: 20 }} />
        </View>

        {/* 2. the two things that already work, holding the middle where the
               Ramadan poster holds its count */}
        <View style={{ alignItems: "center", width: "100%" }}>
          <HajjRow icon={<Ionicons name="book-outline" size={19} color={HJ.inkSoft} />}
                   label={t("hajj.the_dua_book", "The duʿā book")}
                   trail={<HajjChevron />}
                   onPress={() => navigation.navigate("Duas")} />
          <HajjRow icon={<Ionicons name="call-outline" size={19} color={HJ.inkSoft} />}
                   label={t("hajj.ask_the_ulama", "Ask the ʿulamā")}
                   trail={<HajjChevron />}
                   onPress={() => navigation.navigate("Contact")} />
          <Text style={{ fontFamily: F.sansMedium, fontSize: fs(12.5),
                         color: "rgba(243,239,227,0.6)", textAlign: "center", marginTop: 22 }}>
            {t("hajj.ulama_answer_in_person",
               "The masjid’s ʿulamā answer questions on Ḥajj and ʿUmrah in person and by telephone.")}
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
