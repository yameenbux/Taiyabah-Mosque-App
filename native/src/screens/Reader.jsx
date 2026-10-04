import React from "react";
import { View, Text, SectionList, ScrollView } from "react-native";
import { C, F, R } from "../theme";
import { useApp } from "../store";
import ATHKAR from "../data/athkar.json";
import DUAS from "../data/duas.json";
import RABBANAS from "../data/rabbanas.json";

/* One reader for three collections, because they are the same thing on the
 * page: Arabic, how to say it, what it means, and where it comes from.
 *
 * The Arabic is set in Amiri at a size nobody has to squint at, and it is
 * always the first thing in the block. Transliteration is a crutch for
 * somebody still learning the script, so it sits under the Arabic rather than
 * beside it — you can stop reading it without having to look away.
 */
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
          {en}
        </Text>)}
      <View style={{ flexDirection: "row", gap: 12, marginTop: 11, flexWrap: "wrap" }}>
        {/* `times` is sometimes a count and sometimes a sentence — "3" but
            also "Once, morning and evening". Only a number gets the × . */}
        {!!item.times && (
          <Text style={{ fontFamily: F.sansMedium, fontSize: fs(11), color: C.brand600 }}>
            {/^\d+$/.test(String(item.times)) ? `×${item.times}` : item.times}
          </Text>)}
        {!!(item.source || item.ref || item.src) && (
          <Text style={{ fontFamily: F.sans, fontSize: fs(11), color: C.muted }}>{item.source || item.ref || item.src}</Text>)}
      </View>
      {!!item.note && (
        <Text style={{ fontFamily: F.sans, fontSize: fs(12), color: C.muted, marginTop: 7, lineHeight: fs(19) }}>
          {item.note}
        </Text>)}
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

export const Athkar = () => (
  <Collection note={ATHKAR.reviewNote}
    groups={ATHKAR.sections.map(s => ({ title: s.title, intro: s.intro, data: s.items }))} />
);

export const Duas = () => (
  <Collection note={DUAS.reviewNote}
    groups={DUAS.categories.map(c => ({ title: c.title, intro: c.intro, data: c.items }))} />
);

export const Rabbanas = () => {
  const { t } = useApp();
  const list = Array.isArray(RABBANAS) ? RABBANAS : (RABBANAS.items || RABBANAS.rabbanas || []);
  return <Collection groups={[{ title: t("athkar.the_forty_rabbana_du_as", "Forty Rabban\u0101 du\u02bf\u0101s"), data: list }]} />;
};
