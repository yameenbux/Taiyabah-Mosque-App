/* The drawings and pictures in the Hajj section.
 * Copyright (c) 2026 Yameen Bux. All rights reserved. See LICENSE.md.
 *
 * WHERE THE IḤRĀM PICTURE CAME FROM. The first version of this file drew the
 * two cloths hanging, and no person at all — on the reasoning that a masjid's
 * own app should not carry a drawn human figure. The masjid asked for the
 * garment shown WORN, with references, because a first-time pilgrim cannot
 * picture the arrangement from words. That is their call to make and this is
 * it: a generated illustration, nobody real, commissioned to the section's
 * own palette so it sits on the plum ground without a frame.
 *
 * Four hand-drawn attempts at a figure came before it and all four read as a
 * man in a robe. The fault was technique, not patience: a drawing where the
 * skin and the cloth are the same gold line cannot say which is which. Worth
 * knowing before anyone tries to "simplify" this back to an SVG.
 *
 * WHY NOTHING HERE CARRIES A VERDICT. Every ruling in this section is an
 * unapproved draft until a scholar's name is on it, and a picture that puts a
 * tick on one sandal and a cross on another is a ruling — one nobody at the
 * masjid has made. So these are DESCRIPTIVE only: the instep drawing shows
 * where the instep IS, which is anatomy, and the sandal under it is drawn in
 * the shape the masjid supplied with no judgement attached. The entry's own
 * words do the fiqh, and they can be rewritten without the picture becoming
 * wrong. check-hajj.mjs rejects a caption that reads like a ruling.
 *
 * The women's section gets no picture at all, deliberately. There is no
 * special garment, so a picture of one would contradict the entry it sat
 * under.
 *
 * index.html's HJ_ART is the same set. check-hajj.mjs asserts that every id
 * the content names exists on both platforms and that every picture file it
 * points at is really there, so a typo is a failed build rather than a blank
 * space on a phone.
 */
import React from "react";
import { View, Text, Image } from "react-native";
import Svg, { Path, G } from "react-native-svg";
import { F, R, HJ } from "./theme";
import { useApp } from "./store";
import { Panel } from "./hajj-ui";

const GOLD = { stroke: HJ.gold, strokeWidth: 1.6, strokeLinecap: "round",
               strokeLinejoin: "round", fill: "none" };

/* A foot in profile on a plain sandal. The thickened segment of the foot's
   own top line is the instep — drawn ON the foot rather than as a floating
   label, because a bracket hovering above it pointed at nothing.
   The viewBox is cropped to the drawing: at "0 0 300 146" a fifth of the box
   was empty air on the right and the foot sat small and off to one side. */
function Instep() {
  return (
    <Svg width="100%" height="100%" viewBox="26 -2 222 144">
      {/* the leg runs off the top edge: it is a leg, not two sticks */}
      <Path {...GOLD} d="M64 0 Q59 34 57 60 Q49 80 51 96 Q53 110 68 112" />
      <Path {...GOLD} d="M100 0 Q101 32 98 56" />
      <Path {...GOLD} d="M98 56 Q118 68 146 78 Q180 90 208 98" />
      <Path {...GOLD} d="M208 98 Q222 103 219 111 Q215 117 202 116 L68 112" />
      {/* A thick sole with a lifted toe, and a toe-post strap drawn as a band
          running from the side of the sole up to just behind the toes. It is
          the shape in the reference, and it is the shape that matters here:
          the strap sits FORWARD of the instep, so nothing crosses it. */}
      <Path {...GOLD} d="M48 118 L212 118 Q230 118 234 126 Q236 133 228 137 L48 137 Q34 137 34 128 Q34 118 48 118Z" />
      <Path {...GOLD} d="M170 117 L196 100" />
      <Path {...GOLD} d="M180 118 L204 103" />
      <Path {...GOLD} d="M196 100 Q201 100 204 103" />
      <Path {...GOLD} strokeWidth={4.5} strokeOpacity={0.95} d="M110 63 Q132 72 158 82" />
    </Svg>
  );
}

/* id -> the element, and the box to lay it out in. The ELEMENT rather than
   the component: a component pulled out of a map and rendered as <Drawing/>
   is invisible to check-refs.mjs, which reads the source statically and
   cannot follow a variable — it reported this file as a screen that would
   crash. The drawings are pure and take no props, so there is nothing to
   build per render anyway. The aspect lives here because React Native needs
   the box before it can lay an SVG or an image out.

   `photo` marks the ones that are a picture rather than a drawing: they wear
   no panel, because the illustration already carries the section's own plum
   ground and a frosted card around it would draw a second edge inside the
   first. */
const ART = {
  worn:   { el: <Image source={require("../assets/ihram.jpg")}
                       style={{ width: "100%", height: "100%", resizeMode: "cover" }} />,
            aspect: 688 / 1008, photo: true },
  instep: { el: <Instep />, aspect: 222 / 144 },
};

/** Draws `art` from the content file — { id, cap } — or nothing at all if the
    id is unknown, which check-hajj.mjs makes impossible to ship. */
export default function HajjArt({ art, style }) {
  const { fs } = useApp();
  const entry = art && ART[art.id];
  if (!entry) return null;
  /* The drawing is decoration beside words that already say it, so a screen
     reader is given the caption and not the paths. */
  const box = (
    <View style={{ width: "100%", aspectRatio: entry.aspect,
                   borderRadius: entry.photo ? R.card : 0, overflow: "hidden" }}
          accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {entry.el}
    </View>
  );
  const cap = !!art.cap && (
    <Text style={{ fontFamily: F.sans, fontSize: fs(11.5), lineHeight: fs(17),
                   color: HJ.inkFaint, textAlign: "center", marginTop: 11 }}>
      {art.cap}
    </Text>);
  if (entry.photo) return <View style={style}>{box}{cap}</View>;
  return <Panel style={[{ paddingVertical: 18 }, style]}>{box}{cap}</Panel>;
}

export const ART_IDS = Object.keys(ART);
