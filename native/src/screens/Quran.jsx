/* The Qurʼan: two ways of reading it, chosen on the way in.
 *
 *   Mushaf      the 13-line Indo-Pak muṣḥaf most of this community learned on,
 *               as page images. Streamed and then cached, because 848 pages is
 *               66MB and would nearly triple the download.
 *   Translation the Arabic verse by verse with Abdullah Yusuf Ali beneath it.
 *               Bundled, so it works with no signal — which is where people
 *               mostly are when they open it, sitting in the masjid.
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, FlatList, Pressable, Dimensions, ActivityIndicator } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { C, F, R } from "../theme";
import { useApp } from "../store";
import { Screen, Hero, Heading, Card, Note, NavRow, RowGroup, Press, Pill, Empty, tap } from "../ui";
import IDX from "../data/quran-index.json";
import MUSHAF from "../data/mushaf.json";

const HOST = "https://taiyabahapp.ysbdesigns.uk";
const pageUrl = n => `${HOST}/quran/mushaf/${MUSHAF.id}/p/${n}.${MUSHAF.ext}`;

/* ---------- the way in --------------------------------------------------- */

/* The surahs people come back to most often. Not a ranking — just the ones a
 * masjid's own copy falls open at. */
const COMMON = [18, 36, 55, 56, 67];

export default function Quran({ navigation }) {
  const { t, fs, lastRead } = useApp();
  const resume = lastRead && (lastRead.mode === "mushaf"
    ? { label: `${t("mushaf.page", "Page")} ${lastRead.page}`, go: () => navigation.navigate("Mushaf", { page: lastRead.page }) }
    : { label: t(`surah.${lastRead.surah}.name`, IDX.surahs.find(s => s.n === lastRead.surah)?.nameEn || ""),
        go: () => navigation.navigate("Surah", { n: lastRead.surah }) });

  return (
    <Screen pad={false}>
      <Hero lines={[{ k: "quran.how_would_you_like_to_read", t: "How would you like to read?", w: "title" }]} />
      <View style={{ paddingHorizontal: 16 }}>
        {!!resume && (
          <RowGroup>
            <NavRow icon="bookmark-outline" tone="gold"
                    label={t("quran.continue", "Continue where you left off")}
                    sub={resume.label} onPress={resume.go} />
          </RowGroup>)}

        <RowGroup>
          <NavRow icon="book-outline" label={MUSHAF.name}
                  sub={`${MUSHAF.pages} ${t("quran.mushaf_sub", "pages · needs a connection the first time")}`}
                  onPress={() => navigation.navigate("Mushaf", {})} />
          <NavRow icon="language-outline" label={t("quran.english_translation", "English translation")}
                  sub={`${IDX.translation} · ${t("quran.works_offline", "works offline")}`}
                  onPress={() => navigation.navigate("Surahs")} />
        </RowGroup>

        <Heading>{t("quran.often_read", "Often read")}</Heading>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 9 }}>
          {COMMON.map(n => {
            const s = IDX.surahs.find(x => x.n === n);
            return (
              <Press key={n} onPress={() => { tap(); navigation.navigate("Surah", { n }); }}
                style={{ flexBasis: "47%", flexGrow: 1, backgroundColor: C.card, borderWidth: 1,
                         borderColor: C.line, borderRadius: R.tile, paddingVertical: 14, paddingHorizontal: 13 }}>
                <Text style={{ fontFamily: F.arabic, fontSize: fs(19), color: C.brand600 }}>{s.name}</Text>
                <Text style={{ fontFamily: F.sansMedium, fontSize: fs(13), color: C.ink, marginTop: 3 }}>
                  {t(`surah.${n}.name`, s.nameEn)}</Text>
                <Text style={{ fontFamily: F.sans, fontSize: fs(11), color: C.muted, marginTop: 1 }}>
                  {s.ayahs} {t("quran.ayahs", "āyāt")}</Text>
              </Press>);
          })}
        </View>

        <Heading tag={t("quran.in_the_mushaf", "in the muṣḥaf")}>{t("quran.by_juz", "By juzʼ")}</Heading>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 7 }}>
          {Object.entries(MUSHAF.juzPage).map(([j, page]) => (
            <Press key={j} onPress={() => { tap(); navigation.navigate("Mushaf", { page }); }}
              style={{ width: 46, height: 42, alignItems: "center", justifyContent: "center",
                       backgroundColor: C.card, borderWidth: 1, borderColor: C.line, borderRadius: 12 }}>
              <Text style={{ fontFamily: F.sansMedium, fontSize: fs(13.5), color: C.brand600 }}>{j}</Text>
            </Press>))}
        </View>

        <Card style={{ marginTop: 20 }}>
          <Note>{MUSHAF.licence}</Note>
        </Card>
      </View>
    </Screen>
  );
}

/* ---------- the surah list ---------------------------------------------- */

export function Surahs({ navigation }) {
  const { t, fs, rtl } = useApp();
  return (
    <FlatList
      style={{ backgroundColor: C.paper }}
      data={IDX.surahs}
      keyExtractor={s => String(s.n)}
      initialNumToRender={14}
      contentContainerStyle={{ paddingBottom: 34 }}
      ListHeaderComponent={
        <View style={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 6 }}>
          <Note>{`${IDX.script} · ${IDX.translation}`}</Note>
        </View>}
      renderItem={({ item: s }) => (
        <Press onPress={() => { tap(); navigation.navigate("Surah", { n: s.n }); }}
          style={{ flexDirection: rtl ? "row-reverse" : "row", alignItems: "center", gap: 13,
                   paddingHorizontal: 16, paddingVertical: 13,
                   borderBottomWidth: 1, borderBottomColor: "rgba(228,222,207,.7)" }}>
          {/* The number in an eight-point frame, the way a muṣḥaf prints it. */}
          <View style={{ width: 36, height: 36, alignItems: "center", justifyContent: "center",
                         transform: [{ rotate: "45deg" }], borderWidth: 1, borderColor: C.line,
                         borderRadius: 7, backgroundColor: C.card }}>
            <Text style={{ fontFamily: F.sansMedium, fontSize: fs(12.5), color: C.brand600,
                           transform: [{ rotate: "-45deg" }] }}>{s.n}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: F.sansMedium, fontSize: fs(14.5), color: C.ink,
                           textAlign: rtl ? "right" : "left" }}>
              {t(`surah.${s.n}.name`, s.nameEn)}</Text>
            <Text style={{ fontFamily: F.sans, fontSize: fs(11.5), color: C.muted, marginTop: 1.5,
                           textAlign: rtl ? "right" : "left" }}>
              {t(`surah.${s.n}.meaning`, s.meaning)} · {s.ayahs} {t("quran.ayahs", "āyāt")} · {s.revealed}
            </Text>
          </View>
          <Text style={{ fontFamily: F.arabic, fontSize: fs(19), color: C.brand600 }}>{s.name}</Text>
        </Press>)} />
  );
}

/* ---------- one surah, verse by verse ----------------------------------- */

export function Surah({ route, navigation }) {
  const { t, fs, setLastRead } = useApp();
  const n = route.params.n;
  useEffect(() => { setLastRead({ mode: "surah", surah: n }); }, [n]);
  const meta = IDX.surahs.find(s => s.n === n);
  /* Required here rather than at the top of the file: 2.3MB of JSON should be
   * parsed when somebody opens a surah, not when the app starts. */
  const verses = useMemo(() => require("../data/quran-text.json")[n] || [], [n]);

  return (
    <FlatList
      style={{ backgroundColor: C.paper }}
      data={verses}
      keyExtractor={v => String(v[0])}
      initialNumToRender={6}
      contentContainerStyle={{ paddingBottom: 40 }}
      ListHeaderComponent={
        <View style={{ alignItems: "center", paddingVertical: 22, paddingHorizontal: 20,
                       borderBottomWidth: 1, borderBottomColor: C.line, backgroundColor: C.card }}>
          <Text style={{ fontFamily: F.arabic, fontSize: fs(30), color: C.brand600 }}>{meta.name}</Text>
          <Text style={{ fontFamily: F.display, fontSize: fs(17), color: C.ink, marginTop: 5 }}>
            {t(`surah.${n}.name`, meta.nameEn)}</Text>
          <Text style={{ fontFamily: F.sans, fontSize: fs(12), color: C.muted, marginTop: 3 }}>
            {t(`surah.${n}.meaning`, meta.meaning)} · {meta.ayahs} {t("quran.ayahs", "āyāt")} · {meta.revealed}</Text>
          {n !== 1 && n !== 9 && (
            <Text style={{ fontFamily: F.arabic, fontSize: fs(19), lineHeight: fs(36), color: C.ink,
                           marginTop: 16, textAlign: "center" }}>
              بِسْمِ اللّٰهِ الرَّحْمٰنِ الرَّحِيْمِ</Text>)}
        </View>}
      ListFooterComponent={
        <View style={{ paddingHorizontal: 16, paddingTop: 18 }}>
          <Note>{`${t("quran.translation_label", "Translation")}: ${IDX.translation} · ${IDX.script}`}</Note>
        </View>}
      renderItem={({ item: [vn, ar, en] }) => (
        <View style={{ paddingHorizontal: 18, paddingVertical: 16,
                       borderBottomWidth: 1, borderBottomColor: "rgba(228,222,207,.7)" }}>
          <Text style={{ fontFamily: F.arabic, fontSize: fs(23), lineHeight: fs(46), color: C.ink,
                         textAlign: "right", writingDirection: "rtl" }}>{ar}</Text>
          <View style={{ flexDirection: "row", gap: 9, marginTop: 11 }}>
            <View style={{ minWidth: 23, height: 23, borderRadius: 12, backgroundColor: "rgba(119,33,87,.09)",
                           alignItems: "center", justifyContent: "center", paddingHorizontal: 6 }}>
              <Text style={{ fontFamily: F.sansMedium, fontSize: fs(11), color: C.brand600 }}>{vn}</Text>
            </View>
            <Text style={{ flex: 1, fontFamily: F.sans, fontSize: fs(14), lineHeight: fs(23), color: C.muted }}>
              {en}</Text>
          </View>
        </View>)} />
  );
}

/* ---------- the muṣḥaf -------------------------------------------------- */

export function Mushaf({ route, navigation }) {
  const { t, fs, setLastRead } = useApp();
  const { width } = Dimensions.get("window");
  const start = route.params?.page || 1;
  const [page, setPage] = useState(start);
  const [jump, setJump] = useState(false);
  const list = useRef(null);
  const pages = useMemo(() => Array.from({ length: MUSHAF.pages }, (_, i) => i + 1), []);

  /* Which juzʼ a page falls in, for the header. The map is page-per-juzʼ, so the
   * answer is the last entry at or before this page. */
  const juz = useMemo(() => {
    let best = 1;
    for (const [j, p] of Object.entries(MUSHAF.juzPage)) if (p <= page) best = Math.max(best, Number(j));
    return best;
  }, [page]);

  /* Saved as you turn pages, not on the way out: people close a muṣḥaf by
   * putting the phone down, not by pressing back. */
  useEffect(() => { setLastRead({ mode: "mushaf", page }); }, [page]);

  const goto = n => {
    const i = Math.min(MUSHAF.pages, Math.max(1, n));
    setJump(false); setPage(i);
    list.current?.scrollToIndex({ index: i - 1, animated: false });
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#15060F" }}>
      <FlatList
        ref={list}
        data={pages}
        horizontal
        pagingEnabled
        /* Right to left, because that is the direction a muṣḥaf turns. */
        inverted
        initialScrollIndex={start - 1}
        getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
        keyExtractor={n => String(n)}
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={e => setPage(Math.round(e.nativeEvent.contentOffset.x / width) + 1)}
        windowSize={3}
        renderItem={({ item: n }) => (
          <View style={{ width, flex: 1, justifyContent: "center", backgroundColor: "#15060F" }}>
            <Image
              source={{ uri: pageUrl(n) }}
              style={{ width, aspectRatio: MUSHAF.width / MUSHAF.height }}
              contentFit="contain"
              /* Cached to disk on first read, so a page loads instantly the
                 second time and works with no signal after that. */
              cachePolicy="disk"
              transition={140}
              placeholder={null} />
          </View>)} />

      {/* The page bar. Tapping the number opens a jump list of juzʼ and surah. */}
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, flexDirection: "row",
                     alignItems: "center", justifyContent: "center", gap: 14,
                     paddingVertical: 11, backgroundColor: "rgba(21,6,15,.9)" }}>
        <Press onPress={() => goto(page - 1)} style={{ padding: 8 }}>
          <Ionicons name="chevron-forward" size={20} color={C.goldBright} />
        </Press>
        <Press onPress={() => { tap(); setJump(j => !j); }}
          style={{ paddingHorizontal: 16, paddingVertical: 6, borderRadius: R.pill,
                   borderWidth: 1, borderColor: "rgba(220,187,99,.4)", alignItems: "center" }}>
          <Text style={{ fontFamily: F.sansMedium, fontSize: fs(13), color: C.cream }}>
            {t("mushaf.page", "Page")} {page}</Text>
          <Text style={{ fontFamily: F.sans, fontSize: fs(10.5), color: "rgba(243,239,227,.6)" }}>
            {t("quran.juz", "Juzʼ")} {juz}</Text>
        </Press>
        <Press onPress={() => goto(page + 1)} style={{ padding: 8 }}>
          <Ionicons name="chevron-back" size={20} color={C.goldBright} />
        </Press>
      </View>

      {jump && <Jump onPick={goto} onClose={() => setJump(false)} />}
    </View>
  );
}

function Jump({ onPick, onClose }) {
  const { t, fs } = useApp();
  const [mode, setMode] = useState("juz");
  const items = mode === "juz"
    ? Object.entries(MUSHAF.juzPage).map(([j, p]) => ({ label: `${t("quran.juz", "Juzʼ")} ${j}`, sub: `p.${p}`, page: p }))
    : IDX.surahs.map(s => ({ label: `${s.n}. ${t(`surah.${s.n}.name`, s.nameEn)}`,
                             sub: `p.${MUSHAF.surahPage[s.n]}`, page: MUSHAF.surahPage[s.n] }));
  return (
    <View style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0, backgroundColor: "rgba(21,6,15,.97)" }}>
      <View style={{ flexDirection: "row", gap: 8, padding: 14, paddingTop: 20 }}>
        {[["juz", t("quran.by_juz", "By juzʼ")], ["surah", t("quran.by_surah", "By surah")]].map(([k, lab]) => (
          <Press key={k} onPress={() => { tap(); setMode(k); }}
            style={{ flex: 1, alignItems: "center", paddingVertical: 10, borderRadius: R.pill,
                     borderWidth: 1, borderColor: mode === k ? C.goldBright : "rgba(243,239,227,.22)",
                     backgroundColor: mode === k ? "rgba(220,187,99,.16)" : "transparent" }}>
            <Text style={{ fontFamily: F.sansMedium, fontSize: fs(13),
                           color: mode === k ? C.goldBright : "rgba(243,239,227,.7)" }}>{lab}</Text>
          </Press>))}
        <Press onPress={onClose} style={{ padding: 10 }}>
          <Ionicons name="close" size={22} color={C.cream} />
        </Press>
      </View>
      <FlatList
        data={items}
        keyExtractor={(x, i) => String(i)}
        contentContainerStyle={{ paddingBottom: 30 }}
        renderItem={({ item }) => (
          <Press onPress={() => { tap(); onPick(item.page); }}
            style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 18, paddingVertical: 13,
                     borderBottomWidth: 1, borderBottomColor: "rgba(243,239,227,.08)" }}>
            <Text style={{ flex: 1, fontFamily: F.sans, fontSize: fs(14), color: C.cream }}>{item.label}</Text>
            <Text style={{ fontFamily: F.sans, fontSize: fs(12), color: "rgba(243,239,227,.5)" }}>{item.sub}</Text>
          </Press>)} />
    </View>
  );
}
