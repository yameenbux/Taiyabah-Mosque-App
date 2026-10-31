/* One journey's worth of the Hajj & ʿUmrah section — the branches themselves.
 * Copyright (c) 2026 Yameen Bux. All rights reserved. See LICENSE.md.
 *
 * THIS USED TO BE THE FRONT OF THE SECTION. Hajj.jsx opened straight onto
 * eight tiles, which asked somebody to pick a branch before they had said
 * which journey they were on. The two are not the same trip: ʿUmrah can be
 * done in an afternoon and Hajj is five days in a tent, and a person planning
 * one is not helped by the furniture of the other. Hajj.jsx now asks that
 * question first and this screen answers it.
 *
 * WHAT `journey` CHANGES, for now, is the title and nothing else. Seven of
 * the eight branches — the case, the heat, the paperwork, iḥrām, the duʿās,
 * the counters, coming home — are the same whichever trip it is, because they
 * are. The rites are where the two part, and the Hajj days are still held, so
 * splitting the tiles today would mean showing a Hajj pilgrim a shorter list
 * and no explanation of why. The param is carried so that the day the days
 * are written, this is the one place that needs the filter.
 *
 * MISHKĀT, like the rest of the section.
 */
import React, { useState, useEffect } from "react";
import { View, Text } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Ionicons from "@expo/vector-icons/Ionicons";
import { F, HJ } from "../theme";
import { useApp } from "../store";
import { HajjScreen, HajjTitle, HajjKicker, HajjRow, HajjTile, HajjTileGrid,
         HajjChevron } from "../hajj-ui";
import { hajjAccess, visibleItems } from "../hajj";
import { BRANCHES, byStage } from "../hajj-data";

const PACKED = "taiyabah.hajj.packed";

/* Each branch keeps the same glyph on both platforms. check-icons.mjs refuses
   any name that is not in the app's 33KB Ionicons subset. */
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

export default function HajjJourney({ navigation, route }) {
  const { t, fs } = useApp();
  const journey = route?.params?.journey === "hajj" ? "hajj" : "umrah";
  const access = hajjAccess(BRANCHES);
  const glyph = (id, lit) =>
    <Ionicons name={BRANCH_ICON[id] || "ellipse-outline"} size={19}
              color={lit ? HJ.gold : HJ.inkSoft} />;

  const [packed, setPacked] = useState(null);
  useEffect(() => {
    let alive = true;
    AsyncStorage.getItem(PACKED)
      .then(raw => { if (alive && raw) setPacked(JSON.parse(raw) || {}); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  /* The packing list is the one branch that knows how far through the case
     somebody is; every other branch carries its own one-line `sub`. */
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

  return (
    <HajjScreen>
      <HajjTitle size={22}>{t("hajj.what_you_carry", "What you carry with you")}</HajjTitle>

      {/* GROUPED BY THE JOURNEY, two to a row. Eight items at one weight is a
          menu; 88px rows put the counters below the fold. A pilgrim opening
          this in the Ḥaram has one hand, so every branch sits on the first
          screen and inside the thumb's arc. */}
      {byStage(access.branches).map((g, gi) => (
        <View key={g.id} style={{ marginTop: gi === 0 ? 16 : 20 }}>
          {!!g.title && <HajjKicker style={{ marginBottom: 2 }}>{g.title}</HajjKicker>}
          <HajjTileGrid>
            {g.branches.map(b => {
              const lit = b.kind === "tool";
              return (
                <HajjTile key={b.id} icon={glyph(b.id, lit)} label={b.title}
                          tone={lit ? "gold" : "plain"} detail={detailFor(b)}
                          onPress={() => navigation.navigate(
                            b.route || "HajjBranch", b.route ? undefined : { branch: b.id })} />
              );
            })}
          </HajjTileGrid>
        </View>
      ))}

      <HajjKicker style={{ marginTop: 20 }}>{t("hajj.a_question", "A question")}</HajjKicker>
      <HajjRow icon={<Ionicons name="call-outline" size={19} color={HJ.inkSoft} />}
               label={t("hajj.ask_the_ulama", "Ask the ʿulamā")}
               trail={<HajjChevron />}
               onPress={() => navigation.navigate("Contact")} />

      {access.branches.some(b => b.kind === "fiqh") && (
        <Text style={{ fontFamily: F.sans, fontSize: fs(12), lineHeight: fs(18.5),
                       color: HJ.inkFaint, marginTop: 30, textAlign: "center" }}>
          {t("hajj.published_by_the_masjid",
             "Published by Taiyabah Masjid, following the Islāmic Daʿwah Academy’s How to Perform ʿUmrah. For your own case, ask the ʿulamā.")}
        </Text>)}
    </HajjScreen>
  );
}
