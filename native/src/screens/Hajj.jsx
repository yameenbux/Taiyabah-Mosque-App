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
import React, { useState, useEffect } from "react";
import { View, Text, Image } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Ionicons from "@expo/vector-icons/Ionicons";
import { C, F, HJ } from "../theme";
import { useApp } from "../store";
import { Screen, Star } from "../ui";
import { HajjScreen, HajjTitle, HajjLead, HajjKicker, HajjRow, HajjChevron }
  from "../hajj-ui";
import { hajjAccess, visibleItems } from "../hajj";
import { BRANCHES, byStage } from "../hajj-data";

/* The packing list's own key, read here so the branch row can say how far
   through the case somebody is rather than how many lines the branch has. */
const PACKED = "taiyabah.hajj.packed";

/* Each branch keeps the same glyph on both platforms. check-icons.mjs refuses
   any name that is not in the app's 33KB Ionicons subset, so a wrong guess
   here stops the build rather than drawing an empty box on a phone. */
const BRANCH_ICON = {
  pack:     "clipboard-outline",
  heat:     "sunny-outline",
  papers:   "document-text-outline",
  ihram:    "shield-checkmark-outline",
  rites:    "walk-outline",
  duas:     "book-outline",
  counters: "ellipse-outline",
  home:     "airplane-outline",
};

export default function Hajj({ navigation }) {
  const { t, fs, rtl } = useApp();
  const row = { flexDirection: "row", gap: 12 };
  const access = hajjAccess(BRANCHES);
  const glyph = (id, lit) =>
    <Ionicons name={BRANCH_ICON[id] || "ellipse-outline"} size={19}
              color={lit ? HJ.gold : HJ.inkSoft} />;

  const [packed, setPacked] = useState(null);
  useEffect(() => {
    let alive = true;
    AsyncStorage.getItem(PACKED)
      .then(raw => { if (alive && raw) setPacked(JSON.parse(raw) || {}); })
      .catch(() => {});     // no progress to show is not an error
    return () => { alive = false; };
  }, []);

  /* WHAT A ROW SAYS UNDER ITS TITLE. "35 entries" was a developer's idea of
     a subtitle — nobody opening this wants to know how many lines a branch
     has. Reusing the screen's own lead instead was worse: four-line rows made
     the list TALLER than the counts it replaced. A row subtitle and a screen
     lead are different jobs, so every branch carries its own `sub`, one short
     line, and a branch with nothing to add says nothing. The packing list is
     the exception worth making: it knows how far through the case you are. */
  const detailFor = b => {
    if (b.id === "pack" && packed) {
      const all = visibleItems(b).filter(i => i.pack);
      if (all.length)
        return t("hajj.packed_count", "{a} of {b} packed")
          .replace("{a}", String(all.filter(i => packed[i.id]).length))
          .replace("{b}", String(all.length));
    }
    return b.sub || "";
  };

  if (access.open)
    return (
      <HajjScreen>
        <HajjTitle>{t("hajj.what_you_carry", "What you carry with you")}</HajjTitle>
        {/* "Four things" is the held screen's promise about four panels, and
            it is false once the branches are listed. */}
        <HajjLead>
          {t("hajj.what_is_ready",
             "Everything the masjid has ready for the journey, working without signal in the Ḥaram.")}
        </HajjLead>

        {/* GROUPED BY THE JOURNEY, which the branches were already ordered by
            and which the screen used to throw away: eight rows at one weight
            is a menu. A branch no stage names falls to the end under no
            heading rather than disappearing. */}
        {byStage(access.branches).map((g, gi) => (
          <View key={g.id} style={{ marginTop: gi === 0 ? 20 : 26 }}>
            {!!g.title && <HajjKicker style={{ marginBottom: 2 }}>{g.title}</HajjKicker>}
            {g.branches.map(b => {
              const lit = b.kind === "tool";
              return (
                <HajjRow key={b.id} icon={glyph(b.id, lit)} label={b.title}
                         tone={lit ? "gold" : "plain"} detail={detailFor(b)}
                         onPress={() => navigation.navigate(
                           b.route || "HajjBranch", b.route ? undefined : { branch: b.id })} />
              );
            })}
          </View>
        ))}

        <HajjKicker style={{ marginTop: 26 }}>{t("hajj.a_question", "A question")}</HajjKicker>
        <HajjRow icon={<Ionicons name="call-outline" size={19} color={HJ.inkSoft} />}
                 label={t("hajj.ask_the_ulama", "Ask the ʿulamā")}
                 trail={<HajjChevron />}
                 onPress={() => navigation.navigate("Contact")} />

        {/* Provenance, so it sits with the mark at the foot rather than as a
            banner between the title and the content. Shown only when a ruling
            is actually showing: with every fiqh branch shut it would boast
            about content nobody can see. */}
        {access.branches.some(b => b.kind === "fiqh") && (
          <Text style={{ fontFamily: F.sans, fontSize: fs(12), lineHeight: fs(18.5),
                         color: HJ.inkFaint, marginTop: 30, textAlign: "center" }}>
            {t("hajj.approved_by_ulama",
               "Every ruling here was checked and approved by the ʿulamā at the masjid.")}
          </Text>)}
      </HajjScreen>
    );

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

        <Star size={560} color={C.gold} opacity={0.3} width={0.35} />
        <Star size={330} color={C.goldBright} opacity={0.22} width={0.5} />

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
