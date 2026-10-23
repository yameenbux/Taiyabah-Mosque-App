/* Hajj & Umrah — the front of the section, and the gate.
 *
 * HELD, which is what the public sees today: the row that reaches this screen
 * used to be dead on both platforms, so somebody going for Hajj tapped it and
 * got silence. This says what the section will carry and sends them to the
 * two things that already work with no signal. It promises nothing it cannot
 * keep: nothing here reaches the masjid and nobody is signed up for anything.
 *
 * OPEN, once the masjid releases it: the same screen becomes the way in, and
 * the four tiles give way to the branches that are actually ready. hajj.js
 * decides which those are — a fiqh branch whose entries carry no approver's
 * name is not offered at all, so the drafts in hajj/content.js cannot appear
 * here however the switch is thrown.
 *
 * The website half is index.html#hajj and the two are the same screen.
 */
import React from "react";
import { View, Text } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Ionicons from "@expo/vector-icons/Ionicons";
import { C, F, R } from "../theme";
import { useApp } from "../store";
import { Screen, Press } from "../ui";
import { hajjAccess, visibleItems } from "../hajj";
import { BRANCHES } from "../hajj-data";

/* One of the four tiles on the held screen. `on` is the plum one. */
function Tile({ on, top, title, detail, fs, rtl }) {
  const body = (
    <>
      <View>{top}</View>
      <View>
        <Text style={{ fontFamily: F.sansSemi, fontSize: fs(14.5),
                       color: on ? C.cream : C.ink, textAlign: rtl ? "right" : "left" }}>
          {title}
        </Text>
        <Text style={{ fontFamily: F.sans, fontSize: fs(12), lineHeight: fs(18), marginTop: 3,
                       color: on ? "rgba(243,239,227,0.62)" : C.muted,
                       textAlign: rtl ? "right" : "left" }}>
          {detail}
        </Text>
      </View>
    </>
  );
  const shape = { flex: 1, minHeight: 150, borderRadius: R.tile,
                  paddingHorizontal: 14, paddingTop: 15, paddingBottom: 16,
                  justifyContent: "space-between" };
  /* While the section is held these four are a picture of what is coming, so
     they are not controls and a screen reader is not offered them as any. */
  if (on)
    return (
      <LinearGradient colors={[C.brand700, C.brand900]} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }}
                      style={shape}>{body}</LinearGradient>);
  return (
    <View style={[shape, { backgroundColor: C.card, borderWidth: 1, borderColor: C.line }]}>
      {body}
    </View>
  );
}

/* A row at the foot, and a branch row once the section is open. */
function Go({ icon, label, detail, onPress, fs, rtl }) {
  return (
    <Press onPress={onPress} dim={false}
           style={{ flexDirection: rtl ? "row-reverse" : "row", alignItems: "center", gap: 11,
                    paddingVertical: 13, paddingHorizontal: 2 }}>
      <View style={{ width: 29, height: 29, borderRadius: 9, alignItems: "center",
                     justifyContent: "center", backgroundColor: C.tintPlum }}>
        <Ionicons name={icon} size={16} color={C.brand600} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: F.sansSemi, fontSize: fs(14.5), color: C.ink,
                       textAlign: rtl ? "right" : "left" }}>{label}</Text>
        {!!detail && (
          <Text style={{ fontFamily: F.sans, fontSize: fs(12), lineHeight: fs(17.5), color: C.muted,
                         marginTop: 2, textAlign: rtl ? "right" : "left" }}>{detail}</Text>)}
      </View>
      <Ionicons name={rtl ? "chevron-back" : "chevron-forward"} size={17} color={C.muted} />
    </Press>
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

  if (access.open)
    return (
      <Screen top={18}>
        <Text style={{ fontFamily: F.display, fontSize: fs(27), lineHeight: fs(33), color: C.ink,
                       textAlign: rtl ? "right" : "left" }}>
          {t("hajj.what_you_carry", "What you carry with you")}
        </Text>
        {/* "Four things" is the held screen's promise about four tiles, and
            it is false once the branches are listed. */}
        <Text style={{ fontFamily: F.sans, fontSize: fs(14.5), lineHeight: fs(23), color: C.muted,
                       marginTop: 10, textAlign: rtl ? "right" : "left" }}>
          {t("hajj.what_is_ready",
             "Everything the masjid has ready for the journey, working without signal in the Ḥaram.")}
        </Text>
        {/* The approval line is shown only when a ruling is actually showing;
            with every fiqh branch shut it would boast about content nobody
            can see. */}
        {access.branches.some(b => b.kind === "fiqh") && (
          <Text style={{ fontFamily: F.sans, fontSize: fs(12), lineHeight: fs(18.5), color: C.muted,
                         marginTop: 12, textAlign: "center" }}>
            {t("hajj.approved_by_ulama",
               "Every ruling here was checked and approved by the ʿulamā at the masjid.")}
          </Text>)}
        <View style={{ marginTop: 14 }}>
          {access.branches.map(b => (
            <Go key={b.id} fs={fs} rtl={rtl}
                icon={BRANCH_ICON[b.id] || "chevron-forward"}
                label={b.title}
                /* A branch only partly approved says so by its count rather
                   than by looking whole. */
                detail={b.kind === "tool" ? b.lead
                      : t("hajj.n_entries", "{n} entries").replace("{n}", String(visibleItems(b).length))}
                onPress={() => navigation.navigate(
                  b.route || "HajjBranch", b.route ? undefined : { branch: b.id })} />
          ))}
        </View>
        <Text style={{ fontFamily: F.sansBold, fontSize: fs(10.5), letterSpacing: 1.7,
                       textTransform: "uppercase", color: C.goldInk, marginTop: 20,
                       textAlign: rtl ? "right" : "left" }}>
          {t("hajj.a_question", "A question")}
        </Text>
        <Go fs={fs} rtl={rtl} icon="call-outline"
            label={t("hajj.ask_the_ulama", "Ask the ʿulamā")}
            onPress={() => navigation.navigate("Contact")} />
      </Screen>
    );

  return (
    <Screen top={18}>
      <View style={{ alignSelf: rtl ? "flex-end" : "flex-start", borderWidth: 1,
                     borderColor: "rgba(198,162,76,.45)", borderRadius: R.pill,
                     paddingHorizontal: 8, paddingVertical: 3 }}>
        <Text style={{ fontFamily: F.sansBold, fontSize: fs(9.5), letterSpacing: 0.95,
                       textTransform: "uppercase", color: C.gold }}>
          {t("marriage.coming_soon", "Coming soon")}
        </Text>
      </View>

      <Text style={{ fontFamily: F.display, fontSize: fs(27), lineHeight: fs(33), color: C.ink,
                     marginTop: 13, textAlign: rtl ? "right" : "left" }}>
        {t("hajj.what_you_will_carry", "What you will carry with you")}
      </Text>
      <Text style={{ fontFamily: F.sans, fontSize: fs(14.5), lineHeight: fs(23), color: C.muted,
                     marginTop: 10, textAlign: rtl ? "right" : "left" }}>
        {t("hajj.four_things_offline", "Four things, on your phone, working without signal in the Ḥaram.")}
      </Text>

      <View style={[row, { marginTop: 18 }]}>
        <Tile fs={fs} rtl={rtl}
              top={<Text style={{ fontFamily: F.arabic, fontSize: fs(20), lineHeight: fs(32),
                                  color: C.brand600, textAlign: "right" }}>
                     لَبَّيْكَ اللَّهُمَّ لَبَّيْكَ
                   </Text>}
              title={t("hajj.the_duas", "The duʿās")}
              detail={t("hajj.duas_detail", "Iḥrām, talbiyah, ṭawāf, saʿī, with the transliteration")} />

        <Tile on fs={fs} rtl={rtl}
              top={<View style={{ flexDirection: "row", alignItems: "baseline", gap: 5 }}>
                     <Text style={{ fontFamily: F.display, fontSize: fs(38), color: C.cream }}>4</Text>
                     <Text style={{ fontFamily: F.sansSemi, fontSize: fs(13),
                                    color: "rgba(243,239,227,0.55)" }}>
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
                                              marginTop: n === 1 ? 0 : 5 }}>
                         <View style={{ width: 17, height: 17, borderRadius: R.pill,
                                        alignItems: "center", justifyContent: "center",
                                        backgroundColor: n === 1 ? C.brand600 : "rgba(119,33,87,.16)" }}>
                           <Text style={{ fontFamily: F.sansBold, fontSize: fs(9),
                                          color: n === 1 ? C.cream : C.brand600 }}>{n}</Text>
                         </View>
                         <View style={{ flex: 1, height: 3, borderRadius: 2, backgroundColor: C.line }} />
                       </View>
                     ))}
                   </View>}
              title={t("hajj.the_steps", "The steps")}
              detail={t("hajj.steps_detail", "How each rite is performed, in order, one step at a time")} />

        <Tile fs={fs} rtl={rtl}
              /* Allowed is the ordinary state and takes the ordinary ink; dam
                 is the exception and is the only one that takes a colour. A
                 green/red pair would have leaned on hue alone. */
              top={<View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap" }}>
                     {[[t("hajj.allowed", "Allowed"), C.ink, C.tintGreen, C.line],
                       [t("hajj.dam_due", "Dam due"), C.tintRoseInk, C.tintRose, C.tintRoseLine]]
                       .map(([label, ink, bg, line]) => (
                         <View key={label} style={{ borderWidth: 1, borderColor: line, backgroundColor: bg,
                                                    borderRadius: 7, paddingHorizontal: 7, paddingVertical: 3 }}>
                           <Text style={{ fontFamily: F.sansBold, fontSize: fs(9.5), letterSpacing: 0.6,
                                          textTransform: "uppercase", color: ink }}>{label}</Text>
                         </View>
                       ))}
                   </View>}
              title={t("hajj.the_rulings", "The rulings")}
              detail={t("hajj.rulings_detail", "In iḥrām, shortening salāh, and when a dam is owed")} />
      </View>

      <Text style={{ fontFamily: F.sans, fontSize: fs(12), lineHeight: fs(18.5), color: C.muted,
                     textAlign: "center", marginTop: 16 }}>
        {t("hajj.checked_by_ulama",
           "Every ruling will be checked and approved by the ʿulamā at the masjid before it appears here.")}
      </Text>

      {/* The two things that already exist and already work offline, which is
          the whole reason they are what is offered meanwhile. */}
      <Text style={{ fontFamily: F.sansBold, fontSize: fs(10.5), letterSpacing: 1.7,
                     textTransform: "uppercase", color: C.goldInk, marginTop: 22,
                     textAlign: rtl ? "right" : "left" }}>
        {t("hajj.until_then", "Until then")}
      </Text>
      <Go fs={fs} rtl={rtl} icon="book-outline"
          label={t("hajj.the_dua_book", "The duʿā book")}
          onPress={() => navigation.navigate("Duas")} />
      <Go fs={fs} rtl={rtl} icon="call-outline"
          label={t("hajj.ask_the_ulama", "Ask the ʿulamā")}
          onPress={() => navigation.navigate("Contact")} />
    </Screen>
  );
}
