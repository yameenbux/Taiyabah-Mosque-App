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
import { Screen, Hero, Press, Note } from "../ui";
import ATHKAR from "../data/athkar.json";
import DUAS from "../data/duas.json";
import RABBANAS from "../data/rabbanas.json";

/* ---------- the menu the web app opens on ------------------------------- */

const MENU = [
  { section: 0, k: "athkar.morning_evening", t: "Morning & Evening",
    sk: "athkar.after_fajr_and_after_asr", st: "Once after Fajr and once after ʿAṣr", icon: "sunny-outline" },
  { section: 1, k: "athkar.after_every_salah", t: "After Every Ṣalāh",
    sk: "athkar.the_words_said_after_each", st: "The words said after each prayer", icon: "repeat-outline" },
  { section: 2, k: "athkar.before_sleep", t: "Before Sleep",
    sk: "athkar.what_to_say_on_going_to_bed", st: "What to say on going to bed", icon: "moon-outline" },
  { to: "Duas", k: "athkar.everyday_du_as", t: "Everyday Duʿās",
    sk: "athkar.waking_eating_travelling_worry_rain", st: "Waking, eating, travelling, health, marriage, loss",
    icon: "heart-outline" },
  { to: "Rabbanas", k: "athkar.du_as_from_the_qur_an", t: "Duʿās from the Qurʼan",
    sk: "athkar.the_forty_rabbana_du_as", st: "The forty Rabbanā duʿās", icon: "sparkles-outline" },
];

export function Athkar({ navigation }) {
  const { t, fs, rtl } = useApp();
  return (
    <Screen pad={false}>
      <Hero lines={[
        { k: "athkar.daily_athkar", t: "Daily Athkār", w: "title" },
        { k: "athkar.morning_evening_and_after_salah", t: "Morning, evening and after ṣalāh", w: "sub" },
      ]} />
      <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
        <View style={{ backgroundColor: C.card, borderRadius: R.card, borderWidth: 1, borderColor: C.line,
                       overflow: "hidden" }}>
          {MENU.map((m, i) => (
            <Press key={m.k}
              onPress={() => m.to ? navigation.navigate(m.to)
                                  : navigation.navigate("AthkarSet", { n: m.section })}
              style={{ flexDirection: rtl ? "row-reverse" : "row", alignItems: "center", gap: 13,
                       paddingVertical: 14, paddingHorizontal: 15,
                       borderTopWidth: i ? 1 : 0, borderTopColor: C.line }}>
              <View style={{ width: 34, height: 34, borderRadius: 11, alignItems: "center",
                             justifyContent: "center", backgroundColor: "rgba(119,33,87,.08)" }}>
                <Ionicons name={m.icon} size={18} color={C.brand600} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: F.sansMedium, fontSize: fs(14.5), color: C.ink,
                               textAlign: rtl ? "right" : "left" }}>{t(m.k, m.t)}</Text>
                <Text style={{ fontFamily: F.sans, fontSize: fs(12), lineHeight: fs(17.5), color: C.muted,
                               marginTop: 2, textAlign: rtl ? "right" : "left" }}>{t(m.sk, m.st)}</Text>
              </View>
              <Ionicons name={rtl ? "chevron-back" : "chevron-forward"} size={17} color={C.muted} />
            </Press>))}
        </View>
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
        <Text style={{ fontFamily: F.sansMedium, fontSize: fs(11), letterSpacing: 1.2,
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
          <Text style={{ fontFamily: F.sansMedium, fontSize: fs(11), color: C.brand600 }}>
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

function Collection({ groups, note }) {
  const { fs } = useApp();
  return (
    <SectionList
      style={{ backgroundColor: C.paper }}
      contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 30 }}
      sections={groups}
      keyExtractor={(it, i) => String(i)}
      stickySectionHeadersEnabled={false}
      ListHeaderComponent={note
        ? <Text style={{ fontFamily: F.sans, fontSize: fs(12), color: C.muted, lineHeight: fs(19),
                         marginTop: 14 }}>{note}</Text>
        : null}
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
  const s = ATHKAR.sections[route.params.n];
  return <Collection groups={[{ title: s.title, intro: s.intro, data: s.items }]} />;
}

export const Duas = () => {
  const { t } = useApp();
  return <Collection note={t("duas.du_as_for_the_day", "Duʿās for the day, with transliteration")}
    groups={DUAS.categories.map(c => ({ title: c.title, intro: c.intro, data: c.items }))} />;
};

export const Rabbanas = () => {
  const { t } = useApp();
  const list = Array.isArray(RABBANAS) ? RABBANAS : (RABBANAS.items || RABBANAS.rabbanas || []);
  return <Collection note={t("rabbanas.the_du_as_of_the",
      "The duʿās of the Qurʼan that begin “Our Lord…”, in the order they appear.")}
    groups={[{ title: t("rabbanas.40_rabbana", "40 Rabbanā"), data: list }]} />;
};
