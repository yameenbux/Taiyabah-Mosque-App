/* The pictures in the Hajj section.
 * Copyright (c) 2026 Yameen Bux. All rights reserved. See LICENSE.md.
 *
 * WHERE THEY CAME FROM. The first version of this file drew the two cloths
 * hanging, and no person at all — on my reasoning that a masjid's own app
 * should not carry a drawn human figure. The masjid asked for the garment
 * shown WORN, with references, because a first-time pilgrim cannot picture
 * the arrangement from words. That is their call and this is it: generated
 * illustrations, nobody real, made to the section's own palette so they sit
 * on the plum ground without a frame.
 *
 * Four hand-drawn attempts at a figure came before them and all four read as
 * a man in a robe. The fault was technique, not patience: a drawing where the
 * skin and the cloth are the same gold line cannot say which is which. Worth
 * knowing before anyone tries to "simplify" these back to SVG.
 *
 * WHY NOTHING HERE CARRIES A VERDICT. Every ruling in this section is an
 * unapproved draft until a scholar's name is on it, and a pair of pictures
 * captioned "allowed" and "not allowed" is a ruling — one nobody at the
 * masjid has made. So the two sandals are captioned by what they physically
 * do: one leaves the instep uncovered and one covers it. That is the thing
 * the entry tells a pilgrim to look at in the shop, and it stays true
 * whatever the ʿulamā decide. The entry's own words carry the fiqh.
 * check-hajj.mjs rejects a caption or a label that reads like a ruling.
 *
 * NO FACES, ANYWHERE. The masjid's rule for the whole app, written up in
 * CLAUDE.md at the repository root. The iḥrām picture is the worked example:
 * the face is blurred past recognition under a feathered ellipse, heavy
 * enough that no feature survives and soft enough that it melts into the
 * hair rather than reading as a rectangle somebody forgot to remove. Any
 * picture added here gets the same treatment before it ships. No check can
 * catch a face, so this is on whoever adds the picture.
 *
 * The women's section gets no picture at all, deliberately. There is no
 * special garment, so a picture of one would contradict the entry it sat
 * under.
 *
 * index.html's HJ_ART is the same set, and check-hajj.mjs asserts that every
 * id the content names exists on both platforms and that every file it points
 * at is really in the repository.
 */
import React from "react";
import { View, Text, Image } from "react-native";
import { F, R, HJ } from "./theme";
import { useApp } from "./store";

const fill = { width: "100%", height: "100%", resizeMode: "cover" };

/* id -> the element and the shape of its box. The ELEMENT rather than the
   component: a component pulled out of a map and rendered as <Drawing/> is
   invisible to check-refs.mjs, which reads the source statically and cannot
   follow a variable — it reported an earlier version of this file as a screen
   that would crash. */
const ART = {
  worn:          { el: <Image source={require("../assets/ihram.jpg")} style={fill} />,
                   aspect: 688 / 1008 },
  instepBare:    { el: <Image source={require("../assets/instep-bare.jpg")} style={fill} />,
                   aspect: 1024 / 688 },
  instepCovered: { el: <Image source={require("../assets/instep-covered.jpg")} style={fill} />,
                   aspect: 1024 / 688 },
  ihramBelt:     { el: <Image source={require("../assets/ihram-belt.jpg")} style={fill} />,
                   aspect: 1024 / 688 },
};

/* A numbered dot, on the picture and again beside its line in the key. Gold
   on a dark ring so it survives both the cream cloth and the plum ground —
   there is nowhere on these pictures it can be dropped and vanish. */
function Dot({ n, size, fs }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2,
                   alignItems: "center", justifyContent: "center",
                   backgroundColor: HJ.gold, borderWidth: 1.5,
                   borderColor: "rgba(27,6,19,0.55)" }}>
      <Text style={{ fontFamily: F.sansBold, fontSize: fs(size * 0.46),
                     color: HJ.groundMid }}>{n}</Text>
    </View>
  );
}

/* One picture: the image, any numbered marks over it, the key under it, then
   the caption. The marks are placed in fractions of the picture rather than
   in pixels, so they stay put at every width and on every screen. */
function Shot({ art, entry, first }) {
  const { fs, rtl } = useApp();
  const marks = Array.isArray(art.marks) ? art.marks : [];
  return (
    <View style={{ marginTop: first ? 0 : 20 }}>
      <View style={{ width: "100%", aspectRatio: entry.aspect,
                     borderRadius: R.card, overflow: "hidden" }}>
        {/* The picture is decoration beside words that already say it, so a
            screen reader is given the key and the caption, not the image. */}
        <View style={{ width: "100%", height: "100%" }} accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants">
          {entry.el}
        </View>
        {marks.map(m => (
          <View key={m.n} pointerEvents="none"
                style={{ position: "absolute", left: `${m.x * 100}%`, top: `${m.y * 100}%`,
                         marginLeft: -11, marginTop: -11 }}>
            <Dot n={m.n} size={22} fs={fs} />
          </View>
        ))}
      </View>

      {marks.length > 0 && (
        <View style={{ marginTop: 13 }}>
          {marks.map(m => (
            <View key={m.n} style={{ flexDirection: rtl ? "row-reverse" : "row",
                                     alignItems: "flex-start", gap: 10,
                                     marginTop: m.n === marks[0].n ? 0 : 8 }}>
              <View style={{ paddingTop: 1 }}><Dot n={m.n} size={18} fs={fs} /></View>
              <Text style={{ flex: 1, fontFamily: F.sans, fontSize: fs(13),
                             lineHeight: fs(19.5), color: HJ.inkSoft,
                             textAlign: rtl ? "right" : "left" }}>{m.t}</Text>
            </View>
          ))}
        </View>)}

      {!!art.cap && (
        <Text style={{ fontFamily: F.sans, fontSize: fs(11.5), lineHeight: fs(17),
                       color: HJ.inkFaint, textAlign: "center", marginTop: 11 }}>
          {art.cap}
        </Text>)}
    </View>
  );
}

/** Draws the `art` a section or an item carries — one { id, cap, marks } or a
    list of them. An unknown id draws nothing, which check-hajj.mjs makes
    impossible to ship. */
export default function HajjArt({ art, style }) {
  const list = (Array.isArray(art) ? art : [art]).filter(a => a && ART[a.id]);
  if (!list.length) return null;
  return (
    <View style={style}>
      {list.map((a, i) => <Shot key={a.id} art={a} entry={ART[a.id]} first={i === 0} />)}
    </View>
  );
}

export const ART_IDS = Object.keys(ART);
