/* The duʿās, the steps and the rulings — one screen, three sections.
 *
 * They are three lists of entries that differ in what each entry carries, not
 * in how a person moves through them, so three near-identical screens would
 * be three places to fix the same bug. The section arrives as a route param
 * and SHAPES below says what to draw for it.
 *
 * NOTHING HERE WRITES FIQH. Every entry comes from src/hajj-data.js, which
 * the masjid's ʿulamā fill; this file renders what they wrote and attributes
 * it to them. While those lists are empty the gate in hajj.js keeps the whole
 * section shut, so the empty state below is not what the public sees — it is
 * what a developer sees with the gate forced open, and it says which file is
 * waiting rather than pretending the section is broken.
 */
import React from "react";
import { View, Text } from "react-native";
import { C, F, R } from "../theme";
import { useApp } from "../store";
import { Screen } from "../ui";
import { DUAS, STEPS, RULINGS } from "../hajj-data";

/* Three verdicts, and only one of them takes a colour — the same rule the
   tiles on the section front follow, so the two cannot drift apart. */
const VERDICT = {
  allowed: { k: "hajj.allowed",  en: "Allowed",  ink: () => C.ink,         bg: () => C.tintGreen, line: () => C.line },
  avoid:   { k: "hajj.avoid",    en: "Avoid",    ink: () => C.ink,         bg: () => C.tintGold,  line: () => C.line },
  dam:     { k: "hajj.dam_due",  en: "Dam due",  ink: () => C.tintRoseInk, bg: () => C.tintRose,  line: () => C.tintRoseLine },
};

const SHAPES = {
  duas:    { data: () => DUAS,    title: ["hajj.the_duas", "The duʿās"] },
  steps:   { data: () => STEPS,   title: ["hajj.the_steps", "The steps"] },
  rulings: { data: () => RULINGS, title: ["hajj.the_rulings", "The rulings"] },
};

function Chip({ verdict, t, fs }) {
  const v = VERDICT[verdict];
  if (!v) return null;
  return (
    <View style={{ alignSelf: "flex-start", borderWidth: 1, borderColor: v.line(),
                   backgroundColor: v.bg(), borderRadius: 7,
                   paddingHorizontal: 7, paddingVertical: 3 }}>
      <Text style={{ fontFamily: F.sansBold, fontSize: fs(9.5), letterSpacing: 0.6,
                     textTransform: "uppercase", color: v.ink() }}>{t(v.k, v.en)}</Text>
    </View>
  );
}

/* Who said it. A ruling with nothing after it is worth less than no ruling at
   all in front of a congregation, so this is never optional in practice. */
function Source({ item, t, fs, rtl }) {
  const bits = [item.by, item.source].filter(Boolean);
  if (!bits.length) return null;
  return (
    <Text style={{ fontFamily: F.sans, fontSize: fs(11.5), lineHeight: fs(17), color: C.muted,
                   marginTop: 9, textAlign: rtl ? "right" : "left" }}>
      {bits.join(" · ")}
    </Text>
  );
}

export default function HajjList({ route }) {
  const { t, fs, rtl } = useApp();
  const section = (route && route.params && route.params.section) || "duas";
  const shape = SHAPES[section] || SHAPES.duas;
  const items = shape.data();
  const align = rtl ? "right" : "left";

  if (!items.length)
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

  return (
    <Screen top={16}>
      {items.map((item, i) => (
        <View key={item.id || i}
              style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.line,
                       borderRadius: R.card, padding: 17, marginTop: i === 0 ? 0 : 12 }}>

          {/* A duʿā leads with the Arabic, because that is the thing being
              read; everything else leads with the question or the step. */}
          {!!item.ar && (
            <Text style={{ fontFamily: F.arabic, fontSize: fs(22), lineHeight: fs(42),
                           color: C.ink, textAlign: "right", writingDirection: "rtl" }}>
              {item.ar}
            </Text>)}
          {!!item.tr && (
            <Text style={{ fontFamily: F.sansMedium, fontSize: fs(13), lineHeight: fs(21),
                           color: C.brand600, marginTop: 8, textAlign: align }}>
              {item.tr}
            </Text>)}

          {!!item.verdict && <View style={{ marginBottom: 9 }}><Chip verdict={item.verdict} t={t} fs={fs} /></View>}

          {!!(item.title || item.q) && (
            <Text style={{ fontFamily: F.sansSemi, fontSize: fs(15), lineHeight: fs(22), color: C.ink,
                           marginTop: item.ar || item.tr ? 10 : 0, textAlign: align }}>
              {item.n ? `${item.n}. ` : ""}{item.title || item.q}
            </Text>)}

          {!!(item.en || item.body || item.a) && (
            <Text style={{ fontFamily: F.sans, fontSize: fs(14), lineHeight: fs(22), color: C.muted,
                           marginTop: 6, textAlign: align }}>
              {item.en || item.body || item.a}
            </Text>)}

          {!!item.when && (
            <Text style={{ fontFamily: F.sansMedium, fontSize: fs(12.5), lineHeight: fs(19),
                           color: C.goldInk, marginTop: 9, textAlign: align }}>
              {item.when}
            </Text>)}

          <Source item={item} t={t} fs={fs} rtl={rtl} />
        </View>
      ))}
    </Screen>
  );
}
