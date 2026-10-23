/* Hajj & Umrah — the front of the section, and the gate.
 * Copyright (c) 2026 Yameen Bux. All rights reserved. See LICENSE.md.
 *
 * HELD, which is what the public sees today: the row that reaches this screen
 * used to be dead on both platforms, so somebody going for Hajj tapped it and
 * got silence. This says what the section will carry and sends them to the
 * two things that already work with no signal. It promises nothing it cannot
 * keep: nothing here reaches the masjid and nobody is signed up for anything.
 *
 * OPEN, once the masjid releases it: the same screen becomes the way in, and
 * the four panels give way to the branches that are actually ready. hajj.js
 * decides which those are — a fiqh branch whose entries carry no approver's
 * name is not offered at all, so the drafts in hajj/content.js cannot appear
 * here however the switch is thrown.
 *
 * MISHKĀT. The section is the one dark place in the app: the lamp at the top,
 * frosted panels, the masjid's mark at the foot. hajj-ui.jsx holds that and
 * index.html#hajj is the same screen on the website.
 */
import React, { useState, useEffect } from "react";
import { View, Text } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Ionicons from "@expo/vector-icons/Ionicons";
import { F, R, HJ } from "../theme";
import { useApp } from "../store";
import { HajjScreen, Panel, HajjTitle, HajjLead, HajjKicker, HajjChip, HajjRow, HajjChevron }
  from "../hajj-ui";
import { hajjAccess, visibleItems } from "../hajj";
import { BRANCHES, byStage } from "../hajj-data";

/* The packing list's own key, read here so the branch row can say how far
   through the case somebody is rather than how many lines the branch has. */
const PACKED = "taiyabah.hajj.packed";

/* One of the four panels on the held screen. `lit` is the gold one — the
   counters, because they are the one thing on this screen that already
   works. */
function Tile({ lit, top, title, detail, fs, rtl }) {
  return (
    <Panel tone={lit ? "gold" : "plain"}
           style={{ flex: 1, minHeight: 154, paddingHorizontal: 14, paddingTop: 15,
                    paddingBottom: 16, justifyContent: "space-between" }}>
      <View>{top}</View>
      <View>
        <Text style={{ fontFamily: F.sansSemi, fontSize: fs(14.5), color: HJ.ink,
                       textAlign: rtl ? "right" : "left" }}>{title}</Text>
        <Text style={{ fontFamily: F.sans, fontSize: fs(12), lineHeight: fs(18), marginTop: 3,
                       color: HJ.inkFaint, textAlign: rtl ? "right" : "left" }}>{detail}</Text>
      </View>
    </Panel>
  );
}

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

  return (
    <HajjScreen>
      <View style={{ alignSelf: rtl ? "flex-end" : "flex-start" }}>
        <HajjChip tone="gold" style={{ borderRadius: R.pill, paddingHorizontal: 10 }}>
          {t("marriage.coming_soon", "Coming soon")}
        </HajjChip>
      </View>

      <View style={{ marginTop: 14 }}>
        <HajjTitle>{t("hajj.what_you_will_carry", "What you will carry with you")}</HajjTitle>
      </View>
      <HajjLead>
        {t("hajj.four_things_offline",
           "Four things, on your phone, working without signal in the Ḥaram.")}
      </HajjLead>

      <View style={[row, { marginTop: 20 }]}>
        <Tile fs={fs} rtl={rtl}
              top={<Text style={{ fontFamily: F.arabic, fontSize: fs(20), lineHeight: fs(34),
                                  color: HJ.gold, textAlign: "right" }}>
                     لَبَّيْكَ اللَّهُمَّ لَبَّيْكَ
                   </Text>}
              title={t("hajj.the_duas", "The duʿās")}
              detail={t("hajj.duas_detail", "Iḥrām, talbiyah, ṭawāf, saʿī, with the transliteration")} />

        <Tile lit fs={fs} rtl={rtl}
              top={<View style={{ flexDirection: "row", alignItems: "baseline", gap: 5 }}>
                     <Text style={{ fontFamily: F.display, fontSize: fs(40), color: HJ.ink }}>4</Text>
                     <Text style={{ fontFamily: F.sansSemi, fontSize: fs(13), color: HJ.gold }}>
                       {t("hajj.of_seven", "of 7")}
                     </Text>
                   </View>}
              title={t("hajj.the_counters", "The counters")}
              detail={t("hajj.counters_detail", "Ṭawāf and saʿī without losing count, and a tasbīḥ")} />
      </View>

      <View style={[row, { marginTop: 12 }]}>
        <Tile fs={fs} rtl={rtl}
              top={<View>
                     {[1, 2, 3].map(n => (
                       <View key={n} style={{ flexDirection: "row", alignItems: "center", gap: 7,
                                              marginTop: n === 1 ? 0 : 6 }}>
                         <View style={{ width: 18, height: 18, borderRadius: R.pill,
                                        alignItems: "center", justifyContent: "center",
                                        borderWidth: 1,
                                        borderColor: n === 1 ? HJ.goldLine : HJ.panelLine,
                                        backgroundColor: n === 1 ? HJ.goldFill : "transparent" }}>
                           <Text style={{ fontFamily: F.sansBold, fontSize: fs(9),
                                          color: n === 1 ? HJ.gold : HJ.inkFaint }}>{n}</Text>
                         </View>
                         <View style={{ flex: 1, height: 2, borderRadius: 2,
                                        backgroundColor: n === 1 ? HJ.goldLine : HJ.panelLine }} />
                       </View>
                     ))}
                   </View>}
              title={t("hajj.the_steps", "The steps")}
              detail={t("hajj.steps_detail", "How each rite is performed, in order, one step at a time")} />

        <Tile fs={fs} rtl={rtl}
              /* Allowed is the ordinary state and takes the ordinary ink; dam
                 is the exception and is the only one that takes a colour. A
                 green/red pair would have leaned on hue alone. */
              top={<View style={{ gap: 6, alignItems: rtl ? "flex-end" : "flex-start" }}>
                     <HajjChip>{t("hajj.allowed", "Allowed")}</HajjChip>
                     <HajjChip tone="warn">{t("hajj.dam_due", "Dam due")}</HajjChip>
                   </View>}
              title={t("hajj.the_rulings", "The rulings")}
              detail={t("hajj.rulings_detail", "In iḥrām, shortening salāh, and when a dam is owed")} />
      </View>

      <Text style={{ fontFamily: F.sans, fontSize: fs(12), lineHeight: fs(18.5),
                     color: HJ.inkFaint, textAlign: "center", marginTop: 18 }}>
        {t("hajj.checked_by_ulama",
           "Every ruling will be checked and approved by the ʿulamā at the masjid before it appears here.")}
      </Text>

      {/* The two things that already exist and already work offline, which is
          the whole reason they are what is offered meanwhile. */}
      <HajjKicker style={{ marginTop: 26 }}>{t("hajj.until_then", "Until then")}</HajjKicker>
      <HajjRow icon={<Ionicons name="book-outline" size={19} color={HJ.inkSoft} />}
               label={t("hajj.the_dua_book", "The duʿā book")}
               trail={<HajjChevron />}
               onPress={() => navigation.navigate("Duas")} />
      <HajjRow icon={<Ionicons name="call-outline" size={19} color={HJ.inkSoft} />}
               label={t("hajj.ask_the_ulama", "Ask the ʿulamā")}
               trail={<HajjChevron />}
               onPress={() => navigation.navigate("Contact")} />
    </HajjScreen>
  );
}
