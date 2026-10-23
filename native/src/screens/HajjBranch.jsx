/* One branch of the Hajj section — packing, heat, paperwork, iḥrām, the
 * rites, the duʿās, coming home.
 *
 * ONE SCREEN FOR ALL OF THEM, because they differ in what an entry carries,
 * not in how a person moves through them: a lead, then sections, then items.
 * Seven near-identical screens would be seven places to fix the same bug.
 *
 * WHAT IT WILL NOT SHOW. It draws visibleSections() from hajj.js, never the
 * raw branch, so an unapproved fiqh draft cannot appear here even if somebody
 * navigates straight to the route. The thirty drafts in hajj/content.js are a
 * starting document for the ʿulamā; this screen is one of the three places
 * that make sure they stay that way until a scholar is named.
 *
 * THE PACKING LIST TICKS, and it saves on every tap rather than on leaving.
 * Somebody packs a case over a week, in four sittings, at eleven at night.
 * A list that forgets is worse than a list on paper.
 */
import React, { useState, useEffect, useCallback, useRef } from "react";
import { View, Text } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import Svg, { Path } from "react-native-svg";
import { C, F, R } from "../theme";
import { useApp } from "../store";
import { Screen, Press } from "../ui";
import { visibleSections } from "../hajj";
import { branchById } from "../hajj-data";

const KEY = "taiyabah.hajj.packed";

/* Three verdicts, and only "dam" takes a colour — the same rule the tiles on
   the section front follow, so the two cannot drift apart. */
const VERDICT = {
  allowed: { k: "hajj.allowed", en: "Allowed",  ink: () => C.ink,         bg: () => C.tintGreen, line: () => C.line },
  avoid:   { k: "hajj.avoid",   en: "Avoid",    ink: () => C.ink,         bg: () => C.tintGold,  line: () => C.line },
  dam:     { k: "hajj.dam_due", en: "Dam due",  ink: () => C.tintRoseInk, bg: () => C.tintRose,  line: () => C.tintRoseLine },
};

function Tick({ on }) {
  return (
    <View style={{ width: 24, height: 24, borderRadius: 7, alignItems: "center", justifyContent: "center",
                   borderWidth: on ? 0 : 1.5, borderColor: C.line,
                   backgroundColor: on ? C.brand600 : "transparent" }}>
      {on && (
        <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={C.cream}
             strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
          <Path d="M20 6 9 17l-5-5" />
        </Svg>
      )}
    </View>
  );
}

export default function HajjBranch({ route }) {
  const { t, fs, rtl } = useApp();
  const id = route?.params?.branch;
  const branch = branchById(id);
  const sections = visibleSections(branch);
  const align = rtl ? "right" : "left";

  const [packed, setPacked] = useState({});
  const latest = useRef({});
  useEffect(() => {
    let alive = true;
    AsyncStorage.getItem(KEY)
      .then(raw => { if (!alive || !raw) return;
        const v = JSON.parse(raw) || {}; latest.current = v; setPacked(v); })
      .catch(() => {});   // a corrupt store starts empty rather than bricking the list
    return () => { alive = false; };
  }, []);

  const toggle = useCallback(itemId => () => {
    const next = { ...latest.current, [itemId]: !latest.current[itemId] };
    if (!next[itemId]) delete next[itemId];
    latest.current = next;
    setPacked(next);
    AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {});
    Haptics.selectionAsync().catch(() => {});
  }, []);

  if (!branch)
    return (
      <Screen top={28}>
        <Text style={{ fontFamily: F.display, fontSize: fs(22), color: C.ink, textAlign: "center" }}>
          {t("hajj.nothing_here_yet", "Nothing here yet")}
        </Text>
      </Screen>
    );

  /* Empty is not what the public sees — the gate keeps a branch with nothing
     in it out of the list entirely. This is what a developer sees having
     navigated straight to the route, and it names what is missing. */
  if (!sections.length)
    return (
      <Screen top={28}>
        <Text style={{ fontFamily: F.display, fontSize: fs(22), lineHeight: fs(28), color: C.ink,
                       textAlign: "center" }}>
          {t("hajj.nothing_here_yet", "Nothing here yet")}
        </Text>
        <Text style={{ fontFamily: F.sans, fontSize: fs(13.5), lineHeight: fs(21), color: C.muted,
                       textAlign: "center", marginTop: 10 }}>
          {t("hajj.awaiting_ulama",
             "This section is waiting on the ʿulamā at the masjid. Until it arrives, the section stays shut.")}
        </Text>
      </Screen>
    );

  const total = sections.flatMap(s => s.items).filter(i => i.pack).length;
  const done = sections.flatMap(s => s.items).filter(i => i.pack && packed[i.id]).length;

  return (
    <Screen top={16}>
      {!!branch.lead && (
        <Text style={{ fontFamily: F.sans, fontSize: fs(14.5), lineHeight: fs(23), color: C.muted,
                       textAlign: align }}>{branch.lead}</Text>)}

      {/* A count, not a progress bar: it is a case being packed, not a task
          being completed, and a bar implies a deadline nobody set. */}
      {total > 0 && (
        <Text style={{ fontFamily: F.sansSemi, fontSize: fs(12.5), letterSpacing: 0.6, color: C.goldInk,
                       marginTop: 12, textAlign: align }}>
          {t("hajj.packed_count", "{a} of {b} packed")
            .replace("{a}", String(done)).replace("{b}", String(total))}
        </Text>)}

      {sections.map((s, si) => (
        <View key={s.id} style={{ marginTop: si === 0 ? 20 : 26 }}>
          <Text style={{ fontFamily: F.display, fontSize: fs(19), lineHeight: fs(25), color: C.ink,
                         textAlign: align }}>{s.title}</Text>
          {!!s.lead && (
            <Text style={{ fontFamily: F.sans, fontSize: fs(13), lineHeight: fs(20.5), color: C.muted,
                           marginTop: 6, textAlign: align }}>{s.lead}</Text>)}

          {s.items.map((item, ii) => {
            const v = VERDICT[item.verdict];
            const src = [item.by, item.source].filter(Boolean).join(" · ");
            const on = !!packed[item.id];

            const body = (
              <>
                {!!item.ar && (
                  <Text style={{ fontFamily: F.arabic, fontSize: fs(22), lineHeight: fs(42), color: C.ink,
                                 textAlign: "right", writingDirection: "rtl" }}>{item.ar}</Text>)}
                {!!item.tr && (
                  <Text style={{ fontFamily: F.sansMedium, fontSize: fs(13), lineHeight: fs(21),
                                 color: C.brand600, marginTop: 6, textAlign: align }}>{item.tr}</Text>)}
                {!!v && (
                  <View style={{ alignSelf: rtl ? "flex-end" : "flex-start", borderWidth: 1,
                                 borderColor: v.line(), backgroundColor: v.bg(), borderRadius: 7,
                                 paddingHorizontal: 7, paddingVertical: 3, marginBottom: 8 }}>
                    <Text style={{ fontFamily: F.sansBold, fontSize: fs(9.5), letterSpacing: 0.6,
                                   textTransform: "uppercase", color: v.ink() }}>{t(v.k, v.en)}</Text>
                  </View>)}
                <Text style={{ fontFamily: F.sansSemi, fontSize: fs(14.5), lineHeight: fs(21),
                               color: on ? C.muted : C.ink, textAlign: align,
                               textDecorationLine: on ? "line-through" : "none" }}>
                  {item.n ? `${item.n}. ` : ""}{item.t}
                </Text>
                {!!item.d && (
                  <Text style={{ fontFamily: F.sans, fontSize: fs(13), lineHeight: fs(20.5), color: C.muted,
                                 marginTop: 4, textAlign: align }}>{item.d}</Text>)}
                {!!item.when && (
                  <Text style={{ fontFamily: F.sansMedium, fontSize: fs(12.5), lineHeight: fs(19),
                                 color: C.goldInk, marginTop: 7, textAlign: align }}>{item.when}</Text>)}
                {!!src && (
                  <Text style={{ fontFamily: F.sans, fontSize: fs(11.5), lineHeight: fs(17), color: C.muted,
                                 marginTop: 8, textAlign: align }}>{src}</Text>)}
              </>
            );

            const card = {
              backgroundColor: C.card, borderWidth: 1, borderColor: C.line, borderRadius: R.card,
              padding: 15, marginTop: ii === 0 ? 12 : 10,
            };

            if (!item.pack)
              return <View key={item.id} style={card}>{body}</View>;

            return (
              <Press key={item.id} onPress={toggle(item.id)} dim={false}
                     accessibilityRole="checkbox" accessibilityState={{ checked: on }}
                     accessibilityLabel={item.t}
                     style={[card, { flexDirection: rtl ? "row-reverse" : "row", gap: 12,
                                     alignItems: "flex-start" }]}>
                <View style={{ paddingTop: 1 }}><Tick on={on} /></View>
                <View style={{ flex: 1 }}>{body}</View>
              </Press>
            );
          })}
        </View>
      ))}
    </Screen>
  );
}
