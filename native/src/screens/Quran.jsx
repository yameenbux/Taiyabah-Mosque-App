/* The Qurʼan: two ways of reading it, chosen on the way in.
 *
 *   Mushaf      the 13-line muṣḥaf most of this community learned on, called
 *               "13 Line Quraan" throughout because that is what people here
 *               ask for by name,
 *               as page images. Streamed and then cached, because 848 pages is
 *               66MB and would nearly triple the download.
 *   Translation the Arabic verse by verse with Abdullah Yusuf Ali beneath it.
 *               Bundled, so it works with no signal — which is where people
 *               mostly are when they open it, sitting in the masjid.
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, FlatList, Pressable, TextInput, useWindowDimensions, ActivityIndicator } from "react-native";
import { Image } from "expo-image";
import * as ScreenOrientation from "expo-screen-orientation";
import { Ionicons } from "@expo/vector-icons";
import { C, F, R } from "../theme";
import { useApp } from "../store";
import { Screen, Hero, Heading, Card, Note, NavRow, RowGroup, MenuRow, Press, Pill, Empty, tap } from "../ui";
import { SHEETS } from "../Blocks";
import IDX from "../data/quran-index.json";
import MUSHAF from "../data/mushaf.json";


const HOST = "https://taiyabahapp.ysbdesigns.uk";
const pageUrl = n => `${HOST}/quran/mushaf/${MUSHAF.id}/p/${n}.${MUSHAF.ext}`;

/* ---------- the way in --------------------------------------------------- */

/* The surahs people come back to most often. Not a ranking — just the ones a
 * masjid's own copy falls open at. */
const COMMON = [18, 36, 55, 56, 67];

/* The mode picker is the website's own markup: its wording, its order and its
 * two drawings — an open book for the translation, a ruled page for the
 * muṣḥaf. Only where each row goes is the app's business. */
const MODE = (() => {
  const b = SHEETS.quran?.blocks || [];
  const rows = b.filter(x => x.type === "row");
  if (rows.length !== 2) throw new Error(`quran: the website now has ${rows.length} mode rows, not 2`);
  return { hero: b.find(x => x.type === "hero"), rows };
})();

export default function Quran({ navigation }) {
  const { t, tx, fs, lastRead } = useApp();
  const resume = lastRead && (lastRead.mode === "mushaf"
    ? { label: `${t("mushaf.page", "Page")} ${lastRead.page}`, go: () => navigation.navigate("Mushaf", { page: lastRead.page }) }
    : { label: t(`surah.${lastRead.surah}.name`, IDX.surahs.find(s => s.n === lastRead.surah)?.nameEn || ""),
        go: () => navigation.navigate("Surah", { n: lastRead.surah }) });

  return (
    <Screen pad={false}>
      {/* .wl-ar — القرآن الكريم in gold at 28px above the question. It was
          missing, so the one screen in the app whose subject is the Arabic
          Qurʾān opened on a line of English with nothing above it. */}
      <Hero lines={MODE.hero?.lines || []} />
      <View style={{ paddingHorizontal: 16 }}>
        {!!resume && (
          <RowGroup>
            <NavRow icon="bookmark-outline" tone="gold"
                    label={t("quran.continue", "Continue where you left off")}
                    sub={resume.label} onPress={resume.go} />
          </RowGroup>)}

        {/* Two separate .md-row CARDS, translation first, in the website's
            own words and with its own drawings — not one bordered group with
            the muṣḥaf on top and a sub-line ("848 pages · needs a connection
            the first time") that was written here. That warning has moved
            into the muṣḥaf itself, where somebody with no signal actually
            meets it; a browser never needed one. */}
        {MODE.rows.map((r, i) => (
          <MenuRow key={i} label={tx(r.label)} sub={r.sub ? tx(r.sub) : null} svg={r.svg} ext={r.ext}
                   onPress={() => navigation.navigate(i === 0 ? "Surahs" : "Mushaf", i === 0 ? undefined : {})} />
        ))}

        <Heading>{t("quran.often_read", "Often read")}</Heading>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 9 }}>
          {COMMON.map(n => {
            const s = IDX.surahs.find(x => x.n === n);
            return (
              <Press key={n} onPress={() => { tap(); navigation.navigate("Surah", { n }); }}
                style={{ flexBasis: "47%", flexGrow: 1, backgroundColor: C.card, borderWidth: 1,
                         borderColor: C.line, borderRadius: R.tile, paddingVertical: 14, paddingHorizontal: 13 }}>
                <Text style={{ fontFamily: F.arabic, fontSize: fs(19), color: C.brand600 }}>{s.name}</Text>
                <Text style={{ fontFamily: F.sansSemi, fontSize: fs(13), color: C.ink, marginTop: 3 }}>
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
              <Text style={{ fontFamily: F.sansSemi, fontSize: fs(13.5), color: C.brand600 }}>{j}</Text>
            </Press>))}
        </View>

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
      ListHeaderComponent={<View style={{ height: 8 }} />}
      renderItem={({ item: s }) => (
        <Press onPress={() => { tap(); navigation.navigate("Surah", { n: s.n }); }}
          style={{ flexDirection: rtl ? "row-reverse" : "row", alignItems: "center", gap: 13,
                   paddingHorizontal: 16, paddingVertical: 13,
                   borderBottomWidth: 1, borderBottomColor: "rgba(228,222,207,.7)" }}>
          {/* The number in an eight-point frame, the way a muṣḥaf prints it. */}
          <View style={{ width: 36, height: 36, alignItems: "center", justifyContent: "center",
                         transform: [{ rotate: "45deg" }], borderWidth: 1, borderColor: C.line,
                         borderRadius: 7, backgroundColor: C.card }}>
            <Text style={{ fontFamily: F.sansSemi, fontSize: fs(12.5), color: C.brand600,
                           transform: [{ rotate: "-45deg" }] }}>{s.n}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: F.sansSemi, fontSize: fs(14.5), color: C.ink,
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
          {/* The translator stays — that is an attribution. The script's own
              name does not: the masjid calls this the 13-Line Qurʼan. */}
          <Note>{`${t("quran.translation_label", "Translation")}: ${IDX.translation}`}</Note>
        </View>}
      renderItem={({ item: [vn, ar, en] }) => (
        <View style={{ paddingHorizontal: 18, paddingVertical: 16,
                       borderBottomWidth: 1, borderBottomColor: "rgba(228,222,207,.7)" }}>
          <Text style={{ fontFamily: F.arabic, fontSize: fs(23), lineHeight: fs(46), color: C.ink,
                         textAlign: "right", writingDirection: "rtl" }}>{ar}</Text>
          <View style={{ flexDirection: "row", gap: 9, marginTop: 11 }}>
            <View style={{ minWidth: 23, height: 23, borderRadius: 12, backgroundColor: "rgba(119,33,87,.09)",
                           alignItems: "center", justifyContent: "center", paddingHorizontal: 6 }}>
              <Text style={{ fontFamily: F.sansSemi, fontSize: fs(11), color: C.brand600 }}>{vn}</Text>
            </View>
            <Text style={{ flex: 1, fontFamily: F.sans, fontSize: fs(14), lineHeight: fs(23), color: C.muted }}>
              {en}</Text>
          </View>
        </View>)} />
  );
}

/* ---------- the muṣḥaf -------------------------------------------------- */

export function Mushaf({ route, navigation }) {
  const { t, fs, setLastRead, muMark, muFavs, toggleMushafMark, toggleMushafFav } = useApp();
  /* Not Dimensions.get(): that is measured once, and this screen is the one
   * place in the app that turns sideways on purpose. */
  const { width, height } = useWindowDimensions();
  const start = route.params?.page || 1;
  const [page, setPage] = useState(start);
  const [jump, setJump] = useState(false);
  const [land, setLand] = useState(false);
  const [toast, setToast] = useState(null);
  const [failed, setFailed] = useState(() => new Set());
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

  /* A note that says what just happened, because a ribbon quietly filling in is
   * not an answer to "where did that go?". */
  const toastRef = useRef(0);
  const say = msg => {
    setToast(msg);
    clearTimeout(toastRef.current);
    toastRef.current = setTimeout(() => setToast(null), 2600);
  };
  useEffect(() => () => clearTimeout(toastRef.current), []);

  const goto = n => {
    const i = Math.min(MUSHAF.pages, Math.max(1, n));
    setJump(false); setPage(i);
    list.current?.scrollToIndex({ index: i - 1, animated: false });
  };

  /* Turning the phone changes how wide a page is, and the strip is laid out in
   * page-widths — so without this the reader would be left between two pages. */
  useEffect(() => {
    const id = setTimeout(() => {
      try { list.current?.scrollToIndex({ index: page - 1, animated: false }); } catch {}
    }, 60);
    return () => clearTimeout(id);
  }, [width, height]);

  /* The web app turns the page a quarter turn inside an upright window, because
   * a browser cannot unlock rotation. An app can, so this turns the screen
   * itself — the same intent, done the way the platform does it. */
  const orient = async () => {
    tap();
    try {
      await ScreenOrientation.lockAsync(land
        ? ScreenOrientation.OrientationLock.PORTRAIT_UP
        : ScreenOrientation.OrientationLock.LANDSCAPE);
      setLand(!land);
    } catch { say(t("mushaf.could_not_turn", "This phone would not turn the screen")); }
  };
  /* Whatever happens, the rest of the app is upright. Leaving a lock behind
   * would turn every other screen sideways too. */
  useEffect(() => () => {
    ScreenOrientation.unlockAsync().catch(() => {});
  }, []);

  const marked = muMark === page;
  const fav = muFavs.includes(page);

  const bookmark = () => {
    tap();
    toggleMushafMark(page);
    say(marked ? t("mushaf.bookmark_taken_away", "Bookmark taken off this page")
               : t("mushaf.bookmark_put_here", "Bookmark put on this page"));
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
          <View style={{ width, height, justifyContent: "center", backgroundColor: "#15060F" }}>
            {/* 848 pages are streamed and then kept, so the first read of any
                page needs signal. The website never had to say so — it cannot
                be opened without a connection — and the app used to say it on
                the row outside, which the website does not. Said here instead,
                where somebody with no signal is looking at the page that will
                not come, rather than guessing the app is broken. */}
            {failed.has(n) && (
              <View style={{ position: "absolute", left: 24, right: 24, alignItems: "center", gap: 6 }}>
                <Ionicons name="cloud-offline-outline" size={26} color="rgba(243,239,227,.5)" />
                <Text style={{ fontFamily: F.sans, fontSize: fs(13), lineHeight: fs(20), textAlign: "center",
                               color: "rgba(243,239,227,.66)" }}>
                  {t("mushaf.needs_signal",
                     "This page has not been read before, so it needs a connection the first time. Once read, it stays on the phone.")}
                </Text>
              </View>)}
            <Image
              onError={() => setFailed(f => new Set(f).add(n))}
              onLoad={() => setFailed(f => { if (!f.has(n)) return f; const g = new Set(f); g.delete(n); return g; })}
              source={{ uri: pageUrl(n) }}
              /* Fitted to the whole window rather than to a fixed aspect, so the
                 same page fills the screen upright and sideways. */
              style={{ width, height }}
              contentFit="contain"
              /* Cached to disk on first read, so a page loads instantly the
                 second time and works with no signal after that. */
              cachePolicy="disk"
              transition={140}
              placeholder={null} />
          </View>)} />

      {/* The way back to the bookmark, which is the whole point of having one.
          It stays out of the way while you are standing on it. */}
      {!!muMark && !marked && !jump && (
        <Press onPress={() => { tap(); goto(muMark); }}
          style={{ position: "absolute", left: 0, right: 0, bottom: 74, alignItems: "center" }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 7, paddingHorizontal: 14,
                         paddingVertical: 7, borderRadius: R.pill, backgroundColor: "rgba(220,187,99,.17)",
                         borderWidth: 1, borderColor: "rgba(220,187,99,.45)" }}>
            <Ionicons name="bookmark" size={13} color={C.goldBright} />
            <Text style={{ fontFamily: F.sansSemi, fontSize: fs(12), color: C.goldBright }}>
              {t("mushaf.page", "Page")} {muMark}</Text>
          </View>
        </Press>)}

      {!!toast && (
        <Press onPress={() => { tap(); setToast(null); setJump(true); }}
          style={{ position: "absolute", left: 16, right: 16, bottom: 120, alignItems: "center" }}
          accessibilityLabel={t("mushaf.view_favourites", "View favourites")}>
          <Text style={{ fontFamily: F.sans, fontSize: fs(12.5), color: C.cream, textAlign: "center",
                         backgroundColor: "rgba(21,6,15,.94)", borderWidth: 1, borderColor: "rgba(243,239,227,.18)",
                         borderRadius: R.pill, paddingHorizontal: 15, paddingVertical: 9, overflow: "hidden" }}>
            {toast}</Text>
        </Press>)}

      {/* The page bar. Tapping the number opens a jump list of juzʼ and surah. */}
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, flexDirection: "row",
                     alignItems: "center", justifyContent: "center", gap: 10,
                     paddingVertical: 11, backgroundColor: "rgba(21,6,15,.9)" }}>
        <Press onPress={() => goto(page - 1)} style={{ padding: 8 }}
          accessibilityLabel={t("mushaf.previous", "Previous")}>
          <Ionicons name="chevron-forward" size={20} color={C.goldBright} />
        </Press>
        <Press onPress={() => { tap(); setJump(j => !j); }}
          style={{ paddingHorizontal: 16, paddingVertical: 6, borderRadius: R.pill,
                   borderWidth: 1, borderColor: "rgba(220,187,99,.4)", alignItems: "center" }}>
          <Text style={{ fontFamily: F.sansSemi, fontSize: fs(13), color: C.cream }}>
            {t("mushaf.page", "Page")} {page}</Text>
          <Text style={{ fontFamily: F.sans, fontSize: fs(10.5), color: "rgba(243,239,227,.6)" }}>
            {t("quran.juz", "Juzʼ")} {juz}</Text>
        </Press>
        <Press onPress={() => goto(page + 1)} style={{ padding: 8 }}
          accessibilityLabel={t("mushaf.next", "Next")}>
          <Ionicons name="chevron-back" size={20} color={C.goldBright} />
        </Press>

        {/* The ribbon on the bar is the bookmark, and only the bookmark. */}
        <Press onPress={bookmark} style={{ padding: 8 }}
          accessibilityLabel={marked ? t("a11y.take_the_bookmark_off", "Take the bookmark off this page")
                                     : t("a11y.bookmark_this_page", "Put your bookmark on this page")}>
          <Ionicons name={marked ? "bookmark" : "bookmark-outline"} size={19}
                    color={marked ? C.goldBright : "rgba(243,239,227,.65)"} />
        </Press>
        <Press onPress={orient} style={{ padding: 8 }}
          accessibilityLabel={t("mushaf.horizontal", "Horizontal")}>
          <Ionicons name={land ? "phone-portrait-outline" : "phone-landscape-outline"} size={19}
                    color="rgba(243,239,227,.65)" />
        </Press>
      </View>

      {jump && <Jump page={page} fav={fav} onPick={goto} onClose={() => setJump(false)}
                     onFav={() => {
                       tap(); toggleMushafFav(page);
                       say(fav ? t("mushaf.removed_from_favourites", "Removed from your favourites")
                               : t("mushaf.added_to_favourites", "Added to your favourites"));
                     }} />}
    </View>
  );
}

function Jump({ page, fav, onPick, onClose, onFav }) {
  const { t, fs, muFavs, muMark } = useApp();
  const [mode, setMode] = useState("juz");
  const [typed, setTyped] = useState("");

  const items = mode === "juz"
    ? Object.entries(MUSHAF.juzPage).map(([j, p]) => ({ label: `${t("quran.juz", "Juzʼ")} ${j}`, sub: `p.${p}`, page: p }))
    : mode === "surah"
      ? IDX.surahs.map(s => ({ label: `${s.n}. ${t(`surah.${s.n}.name`, s.nameEn)}`,
                               sub: `p.${MUSHAF.surahPage[s.n]}`, page: MUSHAF.surahPage[s.n] }))
      : muFavs.map(p => ({ label: `${t("mushaf.page", "Page")} ${p}`,
                           sub: p === muMark ? t("mushaf.bookmark", "Bookmark") : "", page: p }));

  const TABS = [["juz", t("mushaf.juz", "Juz")],
                ["surah", t("mushaf.s_rah", "Sūrah")],
                ["fav", t("mushaf.favourites", "Favourites")]];

  return (
    <View style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0, backgroundColor: "rgba(21,6,15,.97)" }}>
      <View style={{ flexDirection: "row", gap: 8, padding: 14, paddingTop: 20 }}>
        {TABS.map(([k, lab]) => (
          <Press key={k} onPress={() => { tap(); setMode(k); }}
            style={{ flex: 1, alignItems: "center", paddingVertical: 10, borderRadius: R.pill,
                     borderWidth: 1, borderColor: mode === k ? C.goldBright : "rgba(243,239,227,.22)",
                     backgroundColor: mode === k ? "rgba(220,187,99,.16)" : "transparent" }}>
            <Text style={{ fontFamily: F.sansSemi, fontSize: fs(12.5),
                           color: mode === k ? C.goldBright : "rgba(243,239,227,.7)" }}>{lab}</Text>
          </Press>))}
        <Press onPress={onClose} style={{ padding: 10 }}>
          <Ionicons name="close" size={22} color={C.cream} />
        </Press>
      </View>

      {/* Straight to a page number. Somebody being told "page 412" in a ḥalqa
          should not have to work out which juzʼ that is first. */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 9, paddingHorizontal: 16, paddingBottom: 12 }}>
        <TextInput
          value={typed}
          onChangeText={v => setTyped(v.replace(/[^0-9]/g, ""))}
          keyboardType="number-pad"
          returnKeyType="go"
          onSubmitEditing={() => typed && onPick(Number(typed))}
          placeholder={`${t("mushaf.page", "Page")} 1–${MUSHAF.pages}`}
          placeholderTextColor="rgba(243,239,227,.4)"
          style={{ flex: 1, fontFamily: F.sans, fontSize: fs(13.5), color: C.cream,
                   borderWidth: 1, borderColor: "rgba(243,239,227,.22)", borderRadius: R.pill,
                   paddingHorizontal: 15, paddingVertical: 9 }} />
        <Press onPress={() => typed && onPick(Number(typed))}
          style={{ paddingHorizontal: 16, paddingVertical: 10, borderRadius: R.pill,
                   backgroundColor: "rgba(220,187,99,.18)", borderWidth: 1, borderColor: "rgba(220,187,99,.45)" }}>
          <Text style={{ fontFamily: F.sansSemi, fontSize: fs(12.5), color: C.goldBright }}>
            {t("bukhari.go", "Go")}</Text>
        </Press>
      </View>

      <Press onPress={onFav}
        style={{ marginHorizontal: 16, marginBottom: 10, flexDirection: "row", alignItems: "center",
                 gap: 9, paddingHorizontal: 15, paddingVertical: 11, borderRadius: R.pill,
                 borderWidth: 1, borderColor: "rgba(243,239,227,.22)" }}>
        <Ionicons name={fav ? "heart" : "heart-outline"} size={16}
                  color={fav ? C.goldBright : "rgba(243,239,227,.7)"} />
        <Text style={{ fontFamily: F.sansSemi, fontSize: fs(12.5), color: C.cream }}>
          {fav ? t("mushaf.remove_this_page", "Remove this page from favourites")
               : t("mushaf.add_this_page", "Add this page to favourites")}</Text>
      </Press>

      {mode === "fav" && !muFavs.length
        ? <Text style={{ fontFamily: F.sans, fontSize: fs(13), color: "rgba(243,239,227,.55)",
                         textAlign: "center", paddingHorizontal: 30, paddingTop: 24 }}>
            {t("mushaf.no_favourites_yet", "No favourites yet. Add a page and it will be listed here.")}</Text>
        : <FlatList
            data={items}
            keyExtractor={(x, i) => String(i)}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: 30 }}
            renderItem={({ item }) => (
              <Press onPress={() => { tap(); onPick(item.page); }}
                style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 18, paddingVertical: 13,
                         borderBottomWidth: 1, borderBottomColor: "rgba(243,239,227,.08)" }}>
                {item.page === muMark && <Ionicons name="bookmark" size={13} color={C.goldBright} />}
                <Text style={{ flex: 1, fontFamily: F.sans, fontSize: fs(14), color: C.cream }}>{item.label}</Text>
                <Text style={{ fontFamily: F.sans, fontSize: fs(12), color: "rgba(243,239,227,.5)" }}>{item.sub}</Text>
              </Press>)} />}
    </View>
  );
}
