/* Ṣaḥīḥ al-Bukhārī — 97 books, 7,563 narrations.
 *
 * The book headings are bundled so the list is instant and works offline; the
 * narrations themselves are fetched a book at a time, because all 97 come to
 * 8.7MB and most people open two or three.
 */
import React, { useEffect, useState } from "react";
import { View, Text, FlatList, TextInput, ActivityIndicator } from "react-native";
import { C, F, R } from "../theme";
import { useApp } from "../store";
import { Screen, Hero, Card, Note, Press, Empty, Arabic, tap } from "../ui";
import B from "../data/bukhari.json";

const HOST = "https://taiyabahapp.ysbdesigns.uk";

export default function Bukhari({ navigation }) {
  const { t, fs, rtl } = useApp();
  const [num, setNum] = useState("");
  const [err, setErr] = useState("");

  /* Somebody given "Bukhārī 3461" has no way to find it otherwise but to guess
   * which of ninety-seven books it falls in. The website resolves it from the
   * book ranges; so does this. */
  const goTo = () => {
    const n = Number(num);
    if (!n) return;
    const b = B.list.find(x => n >= x.first && n <= x.last);
    if (!b) return setErr(t("bukhari.no_such_hadith", "There is no hadith with that number."));
    tap(); setErr("");
    navigation.navigate("BukhariBook", { n: b.n, name: b.name, at: n });
  };

  return (
    <FlatList
      style={{ backgroundColor: C.paper }}
      data={B.list}
      keyExtractor={b => String(b.n)}
      initialNumToRender={14}
      contentContainerStyle={{ paddingBottom: 34 }}
      ListHeaderComponent={
        <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
          <Card>
            <Text style={{ fontFamily: F.arabic, fontSize: fs(24), color: C.ink, textAlign: "center" }}>
              {B.nameAr}</Text>
            <Note>{`${B.books} ${t("bukhari.books", "books")} · ${B.count.toLocaleString("en-GB")} ${t("bukhari.narrations", "narrations")} · ${B.licence}`}</Note>
          </Card>

          <View style={{ flexDirection: "row", alignItems: "center", gap: 9, marginTop: 13 }}>
            <TextInput
              value={num}
              onChangeText={v => { setErr(""); setNum(v.replace(/[^0-9]/g, "")); }}
              keyboardType="number-pad" returnKeyType="go" onSubmitEditing={goTo}
              placeholder={t("bukhari.go_to", "Go to hadith")} placeholderTextColor={C.muted}
              style={{ flex: 1, fontFamily: F.sans, fontSize: fs(13.5), color: C.ink,
                       borderWidth: 1, borderColor: C.line, borderRadius: R.pill,
                       paddingHorizontal: 15, paddingVertical: 10, backgroundColor: C.card }} />
            <Press onPress={goTo}
              style={{ paddingHorizontal: 18, paddingVertical: 11, borderRadius: R.pill,
                       backgroundColor: C.brand600 }}>
              <Text style={{ fontFamily: F.sansBold, fontSize: fs(13), color: C.cream }}>
                {t("bukhari.go", "Go")}</Text>
            </Press>
          </View>
          {!!err && <Note>{err}</Note>}

          {/* Why there is no English here: a licensing fact, not an omission. */}
          <Note>{t("bukhari.arabic_only", "Arabic here, English on sunnah.com")}</Note>
          <Note>{t("bukhari.no_translation_note",
            "The Arabic is 9th-century and free to reproduce. Every complete English translation in circulation is a modern work still in copyright, so rather than copy one, each hadith links out to its English on sunnah.com. That needs a connection; the Arabic does not.")}</Note>
        </View>}
      renderItem={({ item: b }) => (
        <Press onPress={() => { tap(); navigation.navigate("BukhariBook", { n: b.n, name: b.name }); }}
          style={{ flexDirection: rtl ? "row-reverse" : "row", alignItems: "center", gap: 13,
                   paddingHorizontal: 16, paddingVertical: 14,
                   borderBottomWidth: 1, borderBottomColor: "rgba(228,222,207,.7)" }}>
          <View style={{ width: 30, height: 30, borderRadius: 10, backgroundColor: "rgba(119,33,87,.07)",
                         alignItems: "center", justifyContent: "center" }}>
            <Text style={{ fontFamily: F.sansMedium, fontSize: fs(12), color: C.brand600 }}>{b.n}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: F.sansMedium, fontSize: fs(14.5), color: C.ink,
                           textAlign: rtl ? "right" : "left" }}>{b.name}</Text>
            <Text style={{ fontFamily: F.sans, fontSize: fs(11.5), color: C.muted, marginTop: 1.5,
                           textAlign: rtl ? "right" : "left" }}>
              {b.count} {t("bukhari.narrations", "narrations")} · {b.first}–{b.last}</Text>
          </View>
        </Press>)} />
  );
}

export function BukhariBook({ route }) {
  const { t, fs } = useApp();
  const { n } = route.params;
  const [state, setState] = useState({ loading: true });

  useEffect(() => {
    let live = true;
    fetch(`${HOST}/quran/hadith/bukhari/b/${n}.json`)
      .then(r => { if (!r.ok) throw new Error(String(r.status)); return r.json(); })
      .then(rows => live && setState({ rows }))
      .catch(() => live && setState({ error: true }));
    return () => { live = false; };
  }, [n]);

  if (state.loading)
    return (
      <View style={{ flex: 1, backgroundColor: C.paper, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={C.brand600} />
      </View>);

  if (state.error)
    return (
      <Screen>
        <Empty icon="cloud-offline-outline"
               title={t("bukhari.couldnt_load", "Couldn't load this book")}
               body={t("bukhari.needs_connection",
                 "The narrations are fetched from the masjid's site as you open each book, so this one needs a connection. The book list works without one.")} />
      </Screen>);

  return (
    <FlatList
      style={{ backgroundColor: C.paper }}
      data={state.rows}
      keyExtractor={h => String(h.n)}
      initialNumToRender={5}
      contentContainerStyle={{ paddingBottom: 40 }}
      renderItem={({ item: h }) => (
        <View style={{ paddingHorizontal: 18, paddingVertical: 17,
                       borderBottomWidth: 1, borderBottomColor: "rgba(228,222,207,.7)" }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <View style={{ backgroundColor: "rgba(198,162,76,.16)", borderRadius: R.pill,
                           paddingHorizontal: 9, paddingVertical: 3 }}>
              <Text style={{ fontFamily: F.sansMedium, fontSize: fs(11), color: C.goldInk }}>
                {t("bukhari.hadith", "Ḥadīth")} {h.n}</Text>
            </View>
          </View>
          <Arabic size={20} center={false}>{h.ar}</Arabic>
        </View>)} />
  );
}
