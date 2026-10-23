/* The drawings in the Hajj section.
 * Copyright (c) 2026 Yameen Bux. All rights reserved. See LICENSE.md.
 *
 * WHY THERE IS NO PERSON IN ANY OF THEM. This is the masjid's own app, for a
 * community that would not thank us for a drawn human figure and certainly
 * not a face. So the iḥrām drawing is of the CLOTH, not of a man wearing it —
 * which is also the better illustration, because the question "what is
 * iḥrām?" is answered by the cloth. The first three attempts drew a figure
 * with the body left out and every one of them read as a dress.
 *
 * WHY NOTHING HERE CARRIES A VERDICT. Every ruling in this section is an
 * unapproved draft until a scholar's name is on it, and a drawing that puts a
 * tick on one sandal and a cross on another is a ruling — one nobody at the
 * masjid has made. So these are DESCRIPTIVE only: the instep drawing shows
 * where the instep IS, which is anatomy, and the sandal under it is drawn
 * plainly with no judgement attached. The entry's own words do the fiqh, and
 * they can be rewritten without the drawing becoming wrong.
 *
 * The women's section gets no drawing at all, deliberately. There is no
 * special garment, so a drawing of one would contradict the entry it sat
 * under.
 *
 * index.html's HJ_ART is the same set of paths. check-hajj.mjs asserts that
 * every art id the content names exists on both platforms, so a typo is a
 * failed build rather than a blank space on a phone.
 */
import React from "react";
import { View, Text } from "react-native";
import Svg, { Path, G } from "react-native-svg";
import { F, HJ } from "./theme";
import { useApp } from "./store";

const GOLD = { stroke: HJ.gold, strokeWidth: 1.6, strokeLinecap: "round",
               strokeLinejoin: "round", fill: "none" };

/* The izār and the ridāʾ, hanging. Two lengths of cloth and nothing else:
   the fold lines and the uneven hem are what stop them reading as two
   rectangles. */
function Cloth() {
  return (
    <Svg width="100%" height="100%" viewBox="0 0 300 214">
      {/* a breath of gold inside the outline, so they have weight — at 6% it
          is not a fill you notice, only one you miss when it is gone */}
      <G fill={HJ.gold} fillOpacity={0.06} stroke="none">
        <Path d="M22 28 Q74 20 126 26 Q137 110 131 190 Q102 176 72 190 Q45 202 19 190 Q14 108 22 28Z" />
        <Path d="M174 28 Q224 20 276 26 Q285 100 279 168 Q252 156 227 168 Q202 180 178 168 Q170 98 174 28Z" />
      </G>
      <Path {...GOLD} d="M22 28 Q74 20 126 26" />
      <Path {...GOLD} d="M22 28 Q14 108 19 190" />
      <Path {...GOLD} d="M126 26 Q137 110 131 190" />
      <Path {...GOLD} d="M19 190 Q45 202 72 190 Q102 176 131 190" />
      <Path {...GOLD} strokeOpacity={0.42} d="M48 25 Q38 110 43 196" />
      <Path {...GOLD} strokeOpacity={0.25} d="M74 22 Q72 108 72 190" />
      <Path {...GOLD} strokeOpacity={0.42} d="M100 24 Q108 110 103 182" />
      <Path {...GOLD} d="M174 28 Q224 20 276 26" />
      <Path {...GOLD} d="M174 28 Q170 98 178 168" />
      <Path {...GOLD} d="M276 26 Q285 100 279 168" />
      <Path {...GOLD} d="M178 168 Q202 180 227 168 Q252 156 279 168" />
      <Path {...GOLD} strokeOpacity={0.42} d="M198 25 Q190 98 195 174" />
      <Path {...GOLD} strokeOpacity={0.25} d="M226 22 Q224 96 225 170" />
      <Path {...GOLD} strokeOpacity={0.42} d="M254 24 Q261 98 256 162" />
    </Svg>
  );
}

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
      <Path {...GOLD} d="M44 120 L226 120 Q238 120 238 127 Q238 134 226 134 L44 134 Q34 134 34 127 Q34 120 44 120Z" />
      <Path {...GOLD} strokeOpacity={0.8} d="M178 120 Q190 108 206 102" />
      <Path {...GOLD} strokeOpacity={0.8} d="M56 120 Q48 104 57 91" />
      <Path {...GOLD} strokeWidth={4.5} strokeOpacity={0.95} d="M112 64 Q133 73 158 82" />
    </Svg>
  );
}

/* id -> the element, and the box to lay it out in. The ELEMENT rather than
   the component: a component pulled out of a map and rendered as <Drawing/>
   is invisible to check-refs.mjs, which reads the source statically and
   cannot follow a variable — it reported this file as a screen that would
   crash. Both drawings are pure and take no props, so there is nothing to
   build per render anyway. The aspect lives here because React Native needs
   the box before it can lay an SVG out. */
const ART = {
  cloth:  { el: <Cloth />,  aspect: 300 / 214 },
  instep: { el: <Instep />, aspect: 222 / 144 },
};

/** Draws `art` from the content file — { id, cap } — or nothing at all if the
    id is unknown, which check-hajj.mjs makes impossible to ship. */
export default function HajjArt({ art, style }) {
  const { fs } = useApp();
  const entry = art && ART[art.id];
  if (!entry) return null;
  return (
    <View style={style}>
      {/* The drawing is decoration beside words that already say it, so a
          screen reader is given the caption and not the paths. */}
      <View style={{ width: "100%", aspectRatio: entry.aspect }} accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants">
        {entry.el}
      </View>
      {!!art.cap && (
        <Text style={{ fontFamily: F.sans, fontSize: fs(11.5), lineHeight: fs(17),
                       color: HJ.inkFaint, textAlign: "center", marginTop: 11 }}>
          {art.cap}
        </Text>)}
    </View>
  );
}

export const ART_IDS = Object.keys(ART);
