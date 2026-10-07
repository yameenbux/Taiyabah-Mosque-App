/* Adhkār, duʿās and the rabbanās.
 *
 * The web app does not dump all of these into one list: Daily Adhkār is a menu
 * of five — three sets of its own, then the everyday duʿās and the forty
 * rabbanās — and that menu is how most people here know where things are. Same
 * five rows, same wording, same order.
 *
 * One reader serves all of them, because they are the same thing on the page:
 * Arabic, how to say it, what it means, and where it comes from. The Arabic is
 * set in Amiri at a size nobody has to squint at and is always first in the
 * block. Transliteration is a crutch for somebody still learning the script, so
 * it sits under the Arabic rather than beside it — you can stop reading it
 * without having to look away.
 */
import React from "react";
import { View, Text, SectionList } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { C, F, R } from "../theme";
import { useApp } from "../store";
import { SHEETS } from "../Blocks";
import { Screen, Hero, Press, Note, MenuRow } from "../ui";
import ATHKAR from "../data/athkar.json";
import DUAS from "../data/duas.json";
import RABBANAS from "../data/rabbanas.json";

/* ---------- the menu the web app opens on -------------------------------
 *
 * The rows come from the website's own markup now — its wording, its order
 * and its five hand-drawn glyphs (a sun, a minaret, a crescent, a page, an
 * open book). They used to be retyped here with the nearest thing in an icon
 * font, which put a repeat arrow on "After Every Ṣalāh", a heart on
 * "Everyday Duʿās" and sparkles on the forty Rabbanā. Only where each row
 * GOES is the app's business, and that is all this table says. */
const GOES = [
  n => ({ to: "AthkarSet", params: { n: 0 } }),
  n => ({ to: "AthkarSet", params: { n: 1 } }),
  n => ({ to: "AthkarSet", params: { n: 2 } }),
  n => ({ to: "Duas" }),
  n => ({ to: "Rabbanas" }),
];

export function Athkar({ navigation }) {
  const { t, tx } = useApp();
  const sheet = SHEETS.athkar;
  const hero = sheet?.blocks.find(b => b.type === "hero");
  const rows = (sheet?.blocks || []).filter(b => b.type === "row");
  if (rows.length !== GOES.length)
    throw new Error(`athkar: the website now has ${rows.length} rows, not ${GOES.length}`);

  return (
    <Screen pad={false}>
      {/* .wl-ar then .wl-en — أَذْكَار in gold at 28px over "Morning, evening
          and after ṣalāh". The app had no Arabic line at all and used the
          sheet's header title, "Daily Athkār", as the hero instead, so the
          screen said its own name twice and never said it in Arabic. */}
      <Hero lines={hero?.lines || []} />
      <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
        {rows.map((r, i) => {
          const go = GOES[i]();
          return <MenuRow key={i} label={tx(r.label)} sub={r.sub ? tx(r.sub) : null}
                          svg={r.svg} ext={r.ext}
                          onPress={() => navigation.navigate(go.to, go.params)} />;
        })}
        <View style={{ marginTop: 13 }}>
          <Note>{t("athkar.review_note", ATHKAR.reviewNote)}</Note>
        </View>
      </View>
    </Screen>
  );
}

/* ---------- the reader -------------------------------------------------- */

function Block({ item }) {
  const { fs } = useApp();
  const ar = item.ar || item.arabic;
  const en = item.en || item.english || item.meaning;
  const tr = item.tr || item.translit || item.transliteration;
  return (
    <View style={{ backgroundColor: C.card, borderRadius: R.card, borderWidth: 1, borderColor: C.line,
                   padding: 16, marginTop: 12 }}>
      {!!item.label && (
        <Text style={{ fontFamily: F.sansSemi, fontSize: fs(11), letterSpacing: 1.2,
                       color: C.gold, marginBottom: 9 }}>{String(item.label).toUpperCase()}</Text>)}
      {!!ar && (
        <Text style={{ fontFamily: F.arabic, fontSize: fs(23), lineHeight: fs(46), color: C.ink,
                       textAlign: "right", writingDirection: "rtl" }}>{ar}</Text>)}
      {!!tr && (
        <Text style={{ fontFamily: F.sans, fontSize: fs(13), color: C.brand600, marginTop: 11,
                       lineHeight: fs(21), fontStyle: "italic" }}>{tr}</Text>)}
      {!!en && (
        <Text style={{ fontFamily: F.sans, fontSize: fs(14), color: C.ink, marginTop: 9, lineHeight: fs(23) }}>
          {en}</Text>)}
      <View style={{ flexDirection: "row", gap: 12, marginTop: 11, flexWrap: "wrap" }}>
        {/* `times` is sometimes a count and sometimes a sentence — "3" but also
            "Once, morning and evening". Only a number gets the × . */}
        {!!item.times && (
          <Text style={{ fontFamily: F.sansSemi, fontSize: fs(11), color: C.brand600 }}>
            {/^\d+$/.test(String(item.times)) ? `×${item.times}` : item.times}</Text>)}
        {!!(item.source || item.ref || item.src) && (
          <Text style={{ fontFamily: F.sans, fontSize: fs(11), color: C.muted }}>
            {item.source || item.ref || item.src}</Text>)}
      </View>
      {!!item.note && (
        <Text style={{ fontFamily: F.sans, fontSize: fs(12), color: C.muted, marginTop: 7, lineHeight: fs(19) }}>
          {item.note}</Text>)}
    </View>
  );
}

function Collection({ groups, note, caution }) {
  const { fs, t } = useApp();
  return (
    <SectionList
      style={{ backgroundColor: C.paper }}
      contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 30 }}
      sections={groups}
      keyExtractor={(it, i) => String(i)}
      stickySectionHeadersEnabled={false}
      ListHeaderComponent={
        <View style={{ marginTop: 14, gap: 7 }}>
          {!!note && <Text style={{ fontFamily: F.sans, fontSize: fs(12), color: C.muted,
                                    lineHeight: fs(19) }}>{note}</Text>}
          {!!caution && <Note>{caution}</Note>}
        </View>}
      renderSectionHeader={({ section }) => (
        <View style={{ marginTop: 24 }}>
          <Text style={{ fontFamily: F.display, fontSize: fs(20), color: C.ink }}>{section.title}</Text>
          {!!section.intro && (
            <Text style={{ fontFamily: F.sans, fontSize: fs(13), color: C.muted, marginTop: 5,
                           lineHeight: fs(21) }}>{section.intro}</Text>)}
        </View>)}
      renderItem={({ item }) => <Block item={item} />}
    />
  );
}

export function AthkarSet({ route }) {
  const { t } = useApp();
  const s = ATHKAR.sections[route.params.n];
  return <Collection groups={[{ title: s.title, intro: s.intro, data: s.items }]}
    caution={`${t("athkar.confirm_the_wording_with_the", "Confirm the wording with the imam")} · ${
      t("athkar.wording_varies_between_narrations_and", "Wording varies between narrations and printings.")}`} />;
}

export const Duas = () => {
  const { t } = useApp();
  return <Collection note={t("duas.du_as_for_the_day", "Duʿās for the day, with transliteration")}
    caution={`${t("duas.confirm_the_wording_with_the", "Confirm the wording with the imam")} · ${
      t("duas.wording_varies_between_narrations_and", "Wording varies between narrations and printings.")}`}
    groups={DUAS.categories.map(c => ({ title: c.title, intro: c.intro, data: c.items }))} />;
};

export const Rabbanas = () => {
  const { t } = useApp();
  const list = Array.isArray(RABBANAS) ? RABBANAS : (RABBANAS.items || RABBANAS.rabbanas || []);
  return <Collection note={t("rabbanas.the_du_as_of_the", "The duʿās of the Qur'an that begin “Our Lord…”, in the order they appear.")}
    groups={[{ title: t("rabbanas.40_rabbana", "40 Rabbanā"), data: list }]} />;
};
