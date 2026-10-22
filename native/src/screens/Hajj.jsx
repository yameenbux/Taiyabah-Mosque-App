/* Hajj & Umrah, while the section is still locked.
 *
 * The row that reaches this screen used to be dead on both platforms: the
 * website rendered `.dr-row.soon` with `disabled` on it, and More.jsx short-
 * circuited `act` to null. Somebody going for Hajj tapped it and nothing
 * happened at all, which is the worst of the three answers available
 * (nothing, a promise, or the truth).
 *
 * THIS SCREEN PROMISES NOTHING IT CANNOT KEEP. Nothing on it reaches the
 * masjid, nobody is signed up for anything, and no notification is arranged —
 * so it never says it will be in touch. It says what is coming, and then
 * sends the person to the two things that are already built and already work
 * with no signal at all.
 *
 * The plum tile is the counters, because a count is the one thing here a
 * person can picture. It shows 4 of 7 rather than describing a counter.
 *
 * The website half of this is index.html#hajj, and the two are the same
 * screen: same four tiles in the same order, same words, same two rows at the
 * foot. A change to either belongs in both.
 */
import React from "react";
import { View, Text } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Ionicons from "@expo/vector-icons/Ionicons";
import { C, F, R } from "../theme";
import { useApp } from "../store";
import { Screen, Press } from "../ui";
import { hajjAccess } from "../hajj";
import { HAJJ_CONTENT } from "../hajj-data";

/* One tile. `on` is the plum one; everything inside it has to be told its
   colour, because cream on plum is not what the paper tiles inherit. */
function Tile({ on, top, title, detail, fs, rtl, onPress }) {
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
  const inner = on
    ? <LinearGradient colors={[C.brand700, C.brand900]} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }}
                      style={[shape, onPress && { flex: undefined, minHeight: 150 }]}>{body}</LinearGradient>
    : <View style={[shape, { backgroundColor: C.card, borderWidth: 1, borderColor: C.line },
                    onPress && { flex: undefined }]}>{body}</View>;
  /* While the section is held these four are a picture of what is coming, so
     they are not controls and a screen reader should not offer them as any.
     Once it opens, the same four tiles are the way in. */
  if (!onPress) return inner;
  return <Press onPress={onPress} dim={false} accessibilityRole="button"
                accessibilityLabel={title} style={{ flex: 1 }}>{inner}</Press>;
}

/* A row at the foot. Not the drawer's Row: that one carries a coming-soon tag
   and lives in a list with hairlines between. These two go somewhere. */
function Go({ icon, label, onPress, fs, rtl }) {
  return (
    <Press onPress={onPress} dim={false}
           style={{ flexDirection: rtl ? "row-reverse" : "row", alignItems: "center", gap: 10,
                    paddingVertical: 13, paddingHorizontal: 2 }}>
      <View style={{ width: 29, height: 29, borderRadius: 9, alignItems: "center",
                     justifyContent: "center", backgroundColor: C.tintPlum }}>
        <Ionicons name={icon} size={16} color={C.brand600} />
      </View>
      <Text style={{ flex: 1, fontFamily: F.sansSemi, fontSize: fs(14.5), color: C.ink,
                     textAlign: rtl ? "right" : "left" }}>{label}</Text>
      <Ionicons name={rtl ? "chevron-back" : "chevron-forward"} size={17} color={C.muted} />
    </Press>
  );
}

export default function Hajj({ navigation }) {
  const { t, fs, rtl } = useApp();
  const row = { flexDirection: "row", gap: 12 };

  /* THE GATE. Held until the masjid says otherwise, and shut anyway while the
     ʿulamā's three sections are empty — so a release cannot put a blank
     rulings screen in front of somebody about to fly. hajj.js has the rule
     and check-hajj.mjs asserts it. The two states are the SAME four tiles:
     a picture of what is coming, or the way in. */
  const open = hajjAccess(HAJJ_CONTENT).open;
  const go = section => () => navigation.navigate("HajjList", { section });

  return (
    <Screen top={18}>
      {!open && (
        <View style={{ alignSelf: rtl ? "flex-end" : "flex-start", borderWidth: 1,
                       borderColor: "rgba(198,162,76,.45)", borderRadius: R.pill,
                       paddingHorizontal: 8, paddingVertical: 3 }}>
          <Text style={{ fontFamily: F.sansBold, fontSize: fs(9.5), letterSpacing: 0.95,
                         textTransform: "uppercase", color: C.gold }}>
            {t("marriage.coming_soon", "Coming soon")}
          </Text>
        </View>)}

      <Text style={{ fontFamily: F.display, fontSize: fs(27), lineHeight: fs(33), color: C.ink,
                     marginTop: open ? 0 : 13, textAlign: rtl ? "right" : "left" }}>
        {open ? t("hajj.what_you_carry", "What you carry with you")
              : t("hajj.what_you_will_carry", "What you will carry with you")}
      </Text>
      <Text style={{ fontFamily: F.sans, fontSize: fs(14.5), lineHeight: fs(23), color: C.muted,
                     marginTop: 10, textAlign: rtl ? "right" : "left" }}>
        {t("hajj.four_things_offline", "Four things, on your phone, working without signal in the Ḥaram.")}
      </Text>

      <View style={[row, { marginTop: 18 }]}>
        <Tile fs={fs} rtl={rtl} onPress={open ? go("duas") : undefined}
              top={<Text style={{ fontFamily: F.arabic, fontSize: fs(20), lineHeight: fs(32),
                                  color: C.brand600, textAlign: "right" }}>
                     لَبَّيْكَ اللَّهُمَّ لَبَّيْكَ
                   </Text>}
              title={t("hajj.the_duas", "The duʿās")}
              detail={t("hajj.duas_detail", "Iḥrām, talbiyah, ṭawāf, saʿī, with the transliteration")} />

        <Tile on fs={fs} rtl={rtl} onPress={open ? () => navigation.navigate("HajjCounter") : undefined}
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
        <Tile fs={fs} rtl={rtl} onPress={open ? go("steps") : undefined}
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

        <Tile fs={fs} rtl={rtl} onPress={open ? go("rulings") : undefined}
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
        {open
          ? t("hajj.approved_by_ulama", "Every ruling here was checked and approved by the ʿulamā at the masjid.")
          : t("hajj.checked_by_ulama",
              "Every ruling will be checked and approved by the ʿulamā at the masjid before it appears here.")}
      </Text>

      {/* Held: the two things that already exist and already work offline,
          which is the whole reason they are what is offered meanwhile. Open:
          the section carries its own, so only the office stays. */}
      <Text style={{ fontFamily: F.sansBold, fontSize: fs(10.5), letterSpacing: 1.7,
                     textTransform: "uppercase", color: C.goldInk, marginTop: 22,
                     textAlign: rtl ? "right" : "left" }}>
        {open ? t("hajj.a_question", "A question") : t("hajj.until_then", "Until then")}
      </Text>
      {!open && (
        <Go fs={fs} rtl={rtl} icon="book-outline"
            label={t("hajj.the_dua_book", "The duʿā book")}
            onPress={() => navigation.navigate("Duas")} />)}
      <Go fs={fs} rtl={rtl} icon="call-outline"
          label={t("hajj.ask_the_ulama", "Ask the ʿulamā")}
          onPress={() => navigation.navigate("Contact")} />
    </Screen>
  );
}
