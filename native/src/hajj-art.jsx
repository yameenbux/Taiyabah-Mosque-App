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
 * THE WOMEN'S PICTURE SHOWS NO FACE BY FRAMING, not by blurring. The man's
 * is blurred because he is photographed from the front; hers is taken from
 * behind at three-quarters, so there is no face in the frame to remove. That
 * is the better answer where the composition allows it — a blur is a repair,
 * and a repair can be undone by whoever next re-exports the asset.
 *
 * It carries no special garment, because there is none: what it shows is
 * ordinary clothing, loose and full length, with the head covered. The marks
 * name what is in the picture and the entry beside it carries the ruling.
 *
 * THE FACE SCREEN IS PHOTOGRAPHED AS AN OBJECT, on a plain wooden block.
 * It is the thing pilgrims from this community buy wrong, so it earns a
 * picture, but every way of showing it worn runs into the same wall: a head
 * form has a nose and a chin on it, and that is a face however little else
 * is there. Three side-view diagrams were drawn before this and all three
 * read as a lamp rather than as a head and a cloth; the drafts that would
 * have read properly are exactly the ones the masjid's rule forbids.
 *
 * A featureless cylinder solves it. The veil needs something to hang CLEAR
 * of or the gap — the entire point of the item — cannot be seen, which is
 * why the version photographed with no block at all was rejected: it read
 * as a hat floating in the dark.
 *
 * index.html's HJ_ART is the same set, and check-hajj.mjs asserts that every
 * id the content names exists on both platforms and that every file it points
 * at is really in the repository.
 */
import React from "react";
import { View, Text, Image } from "react-native";
import Svg, { Circle, Path, Rect, G } from "react-native-svg";
import { F, R, HJ } from "./theme";
import { useApp } from "./store";

const fill = { width: "100%", height: "100%", resizeMode: "cover" };

/* THE MAṬĀF, drawn rather than photographed.
 *
 * It is a plan of six shapes, so it is vector: a few hundred bytes that stay
 * sharp at any size and recolour with the palette, where the generated
 * bitmaps of the same thing came to 275KB and 639KB and still had to be
 * keyed off their background.
 *
 * THE GEOGRAPHY IS THE POINT AND IT HAD BETTER BE RIGHT. Going anticlockwise
 * from al-Ḥajar al-Aswad the corners are Aswad (bottom right here), ʿIrāqī
 * (top right), Shāmī (top left), Yamānī (bottom left). The door is on the
 * Aswad–ʿIrāqī wall with the Multazam between the stone and it. The Ḥaṭīm is
 * on the ʿIrāqī–Shāmī wall — ADJACENT to the door wall, sharing the ʿIrāqī
 * corner, not opposite it, which is what an earlier draft of this drawing had
 * and what the masjid sent it back for.
 *
 * Two drawing decisions that are not taste. The box is near square because
 * the Kaʿbah is, and a wide box under an arc stops reading as a plan and
 * starts reading as a handbag. The Ḥaṭīm stands clear of both corners with
 * its enclosure tinted, because the gaps at its ends are real and because an
 * arc welded to the rectangle reads as a padlock — four drafts did.
 *
 * IT CARRIES NO WORDS. The numbers over it come from the entry's `marks` and
 * the key under it from their labels, so it translates, it cannot clip, and
 * the drawing itself asserts nothing.
 *
 * `full` is the plan: the maṭāf, its arrows and the Maqām. The dial takes the
 * other one — the building, the Ḥaṭīm and the stone, centred and cropped in.
 * Its own seven segments are already the circuit, and a landmark that is not
 * the corner you are looking for is one more thing to read at 90pt. */
const GOLD = HJ.gold, DIMLINE = "rgba(220,187,99,.45)";

function Arrow({ deg, r }) {   /* tangential, anticlockwise */
  return <Path d={`M-7 ${-r} L2 ${-r - 4.6} L2 ${-r + 4.6} Z`} fill={GOLD} opacity={0.9}
               transform={`translate(100 100) rotate(${deg})`} />;
}

export function MaTafPlan({ full = true }) {
  const r = 80;
  /* The dial crops in to the building. The full box is framed for the maṭāf
     ring, and reusing it there would leave a cube the size of a thumbnail in
     the middle of a 276pt dial. */
  /* The dial's crop had to open up when the Ḥaṭīm grew. Its apex is now at
     y=49 where the old arc topped out at 57, so the old "56 54 88 88" would
     have sliced the top off the wall on the counter screen. */
  return (
    <Svg viewBox={full ? "8 8 184 184" : "52 42 96 96"} width="100%" height="100%">
      {full && (
        <G>
          {/* the maṭāf — the floor walked on, not a line drawn round it */}
          <Circle cx="100" cy="100" r={r} fill="none" stroke="rgba(220,187,99,.07)" strokeWidth={22} />
          <Circle cx="100" cy="100" r={r} fill="none" stroke={DIMLINE} strokeWidth={1.2}
                  strokeDasharray={[3, 6]} strokeLinecap="round" />
          {[0, 90, 180, 270].map(d => <Arrow key={d} deg={d} r={r} />)}
        </G>)}
      {/* the line every circuit starts and ends on, out through the stone */}
      <Path d={`M127 128 L${full ? "157 157" : "148 149"}`} stroke={GOLD} strokeWidth={1.2}
            strokeDasharray={[2.5, 4]} opacity={0.75} />
      {/* THE ḤAṬĪM REACHES BOTH CORNERS. It was drawn as a smaller arc against
          the middle of the wall, its ends stopping well short of the stone at
          either side. The wall runs corner to corner across this face — from
          the Shāmī corner to the ʿIrāqī — so drawn short it reads as a bay
          against one part of the building rather than as the enclosure a
          pilgrim must walk outside of, which is the one thing this picture
          exists to show. It now spans the full 54 of the wall: radius 27.

          The real wall stands a little clear of the building at each end, and
          those openings are how people go in. At this size two gaps of a pixel
          or so would read as a drawing error rather than as doorways, so the
          arc is closed and the caption carries the meaning instead. */}
      <Path d="M73 76 A27 27 0 0 1 127 76 Z" fill="rgba(220,187,99,.13)" />
      <Path d="M73 76 a27 27 0 0 1 54 0" fill="none" stroke={GOLD}
            strokeWidth={1.6} strokeLinecap="round" />
      <Rect x="73" y="76" width="54" height="52" fill="#190511" stroke={GOLD} strokeWidth={2.6} />
      {/* NO LINE ACROSS THE BUILDING. A band ran the full width at y=90, which
          is a thing you would see on an elevation — the kiswah's belt, seen
          from the side. This picture is a plan, looked down on from above, and
          from above that band is the top of a wall you cannot see. Drawn
          anyway it split the roof in two and made the square read as two
          rooms. The caption says "from above"; the drawing now agrees. */}
      <Path d="M127 101 L127 114" stroke={GOLD} strokeWidth={4.6} strokeLinecap="round" />
      {full && <Rect x="152" y="92" width="13" height="13" fill="none" stroke={GOLD} strokeWidth={1.8} />}
      {[[73, 76], [127, 76], [73, 128], [127, 128]].map(([x, y]) =>
        <Circle key={`${x}-${y}`} cx={x} cy={y} r={2.4} fill={GOLD} opacity={0.55} />)}
      <Circle cx="127" cy="128" r={7} fill={GOLD} />
    </Svg>
  );
}

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
  mataf:         { el: <MaTafPlan />, aspect: 1, drawn: true },
  womenWorn:     { el: <Image source={require("../assets/ihram-women.jpg")} style={fill} />,
                   aspect: 688 / 1024 },
  faceScreen:    { el: <Image source={require("../assets/face-screen.jpg")} style={fill} />,
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
