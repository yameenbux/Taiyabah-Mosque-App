/* One branch of the Hajj section — packing, heat, paperwork, iḥrām, the
 * rites, the duʿās, coming home.
 * Copyright (c) 2026 Yameen Bux. All rights reserved. See LICENSE.md.
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
 *
 * MISHKĀT. Same lamp, same frosted panels as the section front — the ticked
 * item is the one thing that goes gold, because on this ground a tick that
 * went plum would vanish.
 */
import React, { useState, useEffect, useCallback, useRef } from "react";
import { View, Text } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import Svg, { Path } from "react-native-svg";
import { F, R, HJ } from "../theme";
import { useApp } from "../store";
import { Press } from "../ui";
import { HajjScreen, Panel, HajjTitle, HajjLead, HajjKicker, HajjChip, HajjJumpBar }
  from "../hajj-ui";
import HajjArt from "../hajj-art";
import { visibleSections, leadOf } from "../hajj";
import { branchById } from "../hajj-data";

const KEY = "taiyabah.hajj.packed";

/* Three verdicts, and only "dam" takes a colour — the same rule the panels on
   the section front follow, so the two cannot drift apart. */
/* ONLY DAM TAKES A COLOUR. That was the rule from the start and "avoid" had
   drifted to gold, which put three gold things on a screen meant to have at
   most one and made the warn tone stop meaning "this costs you something".
   Allowed and avoid are the ordinary states and read in the ordinary ink. */
const VERDICT = {
  allowed: { k: "hajj.allowed", en: "Allowed", tone: "plain" },
  avoid:   { k: "hajj.avoid",   en: "Avoid",   tone: "plain" },
  dam:     { k: "hajj.dam_due", en: "Dam due", tone: "warn"  },
};

function Tick({ on }) {
  return (
    <View style={{ width: 25, height: 25, borderRadius: 8, alignItems: "center",
                   justifyContent: "center", borderWidth: on ? 0 : 1.5,
                   borderColor: HJ.panelLine,
                   backgroundColor: on ? HJ.gold : "transparent" }}>
      {on && (
        <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={HJ.groundMid}
             strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round">
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
      <HajjScreen top={30}>
        <Text style={{ fontFamily: F.display, fontSize: fs(22), color: HJ.ink, textAlign: "center" }}>
          {t("hajj.nothing_here_yet", "Nothing here yet")}
        </Text>
      </HajjScreen>
    );

  /* Empty is not what the public sees — the gate keeps a branch with nothing
     in it out of the list entirely. This is what a developer sees having
     navigated straight to the route, and it names what is missing. */
  if (!sections.length)
    return (
      <HajjScreen top={30}>
        <Text style={{ fontFamily: F.display, fontSize: fs(22), lineHeight: fs(28), color: HJ.ink,
                       textAlign: "center" }}>
          {t("hajj.nothing_here_yet", "Nothing here yet")}
        </Text>
        <HajjLead center>
          {t("hajj.awaiting_ulama",
             "This section is waiting on the ʿulamā at the masjid. Until it arrives, the section stays shut.")}
        </HajjLead>
      </HajjScreen>
    );

  const all = sections.flatMap(s => s.items);
  const total = all.filter(i => i.pack).length;
  const done = all.filter(i => i.pack && packed[i.id]).length;

  /* Where each section starts in the scroll, measured as it lays out rather
     than guessed from line counts — a translation, a longer photograph
     caption or a bigger text size moves all of them. */
  const scroller = useRef(null);
  const tops = useRef({});
  const jump = i => scroller.current?.scrollTo({ y: Math.max(0, (tops.current[i] || 0) - 10),
                                                 animated: true });

  return (
    <HajjScreen top={16} scrollRef={scroller}
                bar={<HajjJumpBar labels={sections.map(s => s.title)} onJump={jump} />}>
      {!!branch.lead && <HajjLead>{branch.lead}</HajjLead>}

      {/* A count, not a progress bar: it is a case being packed, not a task
          being completed, and a bar implies a deadline nobody set. The ring
          of pips is the same glance the counter's dial gives. */}
      {total > 0 && (
        <Panel tone="gold" style={{ marginTop: 16, paddingVertical: 13,
                                    flexDirection: rtl ? "row-reverse" : "row",
                                    alignItems: "center", gap: 12 }}>
          <Text style={{ fontFamily: F.display, fontSize: fs(26), color: HJ.ink }}>{done}</Text>
          <Text style={{ flex: 1, fontFamily: F.sansSemi, fontSize: fs(12.5), letterSpacing: 0.6,
                         color: HJ.inkSoft, textAlign: align }}>
            {t("hajj.packed_count", "{a} of {b} packed")
              .replace("{a}", String(done)).replace("{b}", String(total))}
          </Text>
        </Panel>)}

      {sections.map((s, si) => (
        <View key={s.id} style={{ marginTop: si === 0 ? 22 : 28 }}
              onLayout={e => { tops.current[si] = e.nativeEvent.layout.y; }}>
          <HajjKicker>{s.title}</HajjKicker>
          {!!s.lead && (
            <Text style={{ fontFamily: F.sans, fontSize: fs(13), lineHeight: fs(20.5),
                           color: HJ.inkFaint, marginTop: 7, textAlign: align }}>{s.lead}</Text>)}
          {/* A drawing belonging to the whole section sits above its items,
              where it can be looked at once and then read past. HajjArt wears
              its own frame — a panel for a drawing, none for a photograph. */}
          {!!s.art && <HajjArt art={s.art} style={{ marginTop: 13 }} />}

          {s.items.map((item, ii) => {
            const v = VERDICT[item.verdict];
            const src = [item.by, item.source].filter(Boolean).join(" · ");
            const on = !!packed[item.id];

            const body = (
              <>
                {!!item.ar && (
                  <Text style={{ fontFamily: F.arabic, fontSize: fs(22), lineHeight: fs(42),
                                 color: HJ.ink, textAlign: "right", writingDirection: "rtl" }}>
                    {item.ar}
                  </Text>)}
                {!!item.tr && (
                  <Text style={{ fontFamily: F.sansMedium, fontSize: fs(13), lineHeight: fs(21),
                                 color: HJ.gold, marginTop: 6, textAlign: align }}>{item.tr}</Text>)}
                {/* The chip used to sit ABOVE the title, so "ALLOWED" was the
                    first word read on the card and the least informative one
                    there. It belongs with the thing it qualifies. */}
                <Text style={{ fontFamily: F.sansSemi, fontSize: fs(14.5), lineHeight: fs(21.5),
                               color: on ? HJ.inkFaint : HJ.ink, textAlign: align,
                               textDecorationLine: on ? "line-through" : "none" }}>
                  {item.n ? `${item.n}. ` : ""}{item.t}
                </Text>
                {!!v && (
                  <View style={{ alignSelf: rtl ? "flex-end" : "flex-start", marginTop: 8 }}>
                    <HajjChip tone={v.tone}>{t(v.k, v.en)}</HajjChip>
                  </View>)}
                {/* LEAD FIRST. The body runs to sixty and ninety words, which
                    is a wall on the one screen somebody reads mid-ṭawāf. The
                    prose is already written lead-first — what to do, then why
                    and what catches people — so the first sentence is drawn in
                    full ink and the rest beneath it in the soft. Nothing is
                    hidden, reworded or truncated; the eye gets somewhere to
                    land. hajj.js owns the rule and tests it. */}
                {!!item.d && (() => {
                  const { lead, rest } = leadOf(item.d);
                  return (
                    <>
                      <Text style={{ fontFamily: F.sansMedium, fontSize: fs(13.5),
                                     lineHeight: fs(21.5), color: HJ.ink, marginTop: 6,
                                     textAlign: align }}>{lead}</Text>
                      {!!rest && (
                        <Text style={{ fontFamily: F.sans, fontSize: fs(12.5),
                                       lineHeight: fs(20), color: HJ.inkFaint, marginTop: 7,
                                       textAlign: align }}>{rest}</Text>)}
                    </>
                  );
                })()}
                {!!item.when && (
                  <Text style={{ fontFamily: F.sansMedium, fontSize: fs(12.5), lineHeight: fs(19),
                                 color: HJ.gold, marginTop: 8, textAlign: align }}>{item.when}</Text>)}
                {!!item.art && <HajjArt art={item.art} style={{ marginTop: 14 }} />}
                {!!src && (
                  <Text style={{ fontFamily: F.sans, fontSize: fs(11.5), lineHeight: fs(17),
                                 color: HJ.inkFaint, marginTop: 9, textAlign: align }}>{src}</Text>)}
              </>
            );

            /* A dam entry wears the warn panel, so the one thing on the screen
               that costs money looks different from across the room. */
            const tone = v && v.tone === "warn" ? "warn" : "plain";
            const gap = { marginTop: ii === 0 ? 13 : 10 };

            if (!item.pack)
              return <Panel key={item.id} tone={tone} style={gap}>{body}</Panel>;

            /* A PACKING LIST IS A LIST. Thirty-five full cards was a wall
               three screens tall; a row with a hairline above it is half the
               height and twice as quick to run an eye down. Cards are still
               right for a ruling, which carries a chip, a source and a
               paragraph — this carries a line and a tick. */
            return (
              <Press key={item.id} onPress={toggle(item.id)} dim={false}
                     accessibilityRole="checkbox" accessibilityState={{ checked: on }}
                     accessibilityLabel={item.t}
                     style={{ flexDirection: rtl ? "row-reverse" : "row", gap: 13,
                              alignItems: "flex-start", paddingVertical: 13,
                              paddingHorizontal: 2,
                              borderTopWidth: ii === 0 ? 0 : 1, borderTopColor: HJ.panelLine }}>
                <View style={{ paddingTop: 1 }}><Tick on={on} /></View>
                <View style={{ flex: 1 }}>{body}</View>
              </Press>
            );
          })}
        </View>
      ))}
    </HajjScreen>
  );
}
