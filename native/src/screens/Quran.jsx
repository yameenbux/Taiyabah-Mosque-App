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
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { useAnimatedStyle, useSharedValue, withTiming, runOnJS } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { clampScale, clampOffset, doubleTap as dtap, pagerEnabled, MIN } from "../zoom";
import { C, F, R } from "../theme";
import { useApp } from "../store";
import { surah } from "../data/quran-index";
import { Screen, Hero, Heading, Card, Note, NavRow, RowGroup, MenuRow, Press, Pill, Empty, tap } from "../ui";
import { SHEETS } from "../Blocks";
import IDX from "../data/quran-index.json";
import MUSHAF from "../data/mushaf.json";
import { surahAt, pageOf } from "../mushaf";


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
  /* Six across, however wide the column turns out to be. See the grid below. */
  const JUZ_COLS = 6, JUZ_GAP = 7;
  const [juzW, setJuzW] = useState(0);
  const juzTile = juzW
    ? Math.floor((juzW - JUZ_GAP * (JUZ_COLS - 1)) / JUZ_COLS)
    : 46;
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
                <Text style={{ fontFamily: F.quranic, fontSize: fs(19), color: C.brand600 }}>{s.name}</Text>
                <Text style={{ fontFamily: F.sansSemi, fontSize: fs(13), color: C.ink, marginTop: 3 }}>
                  {t(`surah.${n}.name`, s.nameEn)}</Text>
                <Text style={{ fontFamily: F.sans, fontSize: fs(11), color: C.muted, marginTop: 1 }}>
                  {s.ayahs} {t("quran.ayahs", "āyāt")}</Text>
              </Press>);
          })}
        </View>

        <Heading tag={t("quran.in_the_mushaf", "in the muṣḥaf")}>{t("quran.by_juz", "By juzʼ")}</Heading>
        {/* THE GRID FILLS THE COLUMN, RATHER THAN A FIXED 46pt EACH.
            At 46 wide with 7 between, six tiles came to 311pt in a 370pt
            column and the remaining 59 sat empty on the right, so thirty
            numbers that are each perfectly centred in their own tile read as a
            block shoved to one side. The width is measured and divided
            instead, which fills the row exactly, keeps the left edge in line
            with the cards above, and holds at six across whatever the column
            is — a phone, a larger phone, or the 520pt cap on a tablet, where a
            fixed size would have fitted nine and left a last row of three
            stranded. The 46 stays as the width to use before the first
            measurement, so nothing jumps on the first frame. */}
        <View onLayout={e => setJuzW(e.nativeEvent.layout.width)}
              style={{ flexDirection: "row", flexWrap: "wrap", gap: JUZ_GAP }}>
          {Object.entries(MUSHAF.juzPage).map(([j, page]) => (
            <Press key={j} onPress={() => { tap(); navigation.navigate("Mushaf", { page }); }}
              hitSlop={{ top: 1, bottom: 1, left: 0, right: 0 }}
              style={{ width: juzTile, height: 42, alignItems: "center", justifyContent: "center",
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
          <Text style={{ fontFamily: F.quranic, fontSize: fs(19), color: C.brand600 }}>{s.name}</Text>
        </Press>)} />
  );
}

/* ---------- one surah, verse by verse ----------------------------------- */

export function Surah({ route, navigation }) {
  const { t, fs, setLastRead } = useApp();
  const n = route.params.n;
  useEffect(() => { setLastRead({ mode: "surah", surah: n }); }, [n]);
  const meta = IDX.surahs.find(s => s.n === n);
  /* ONE SŪRAH, not all 114. This used to require the whole 2.3MB file — late
   * rather than at startup, which was the easy half of the problem, but the
   * first sūrah anybody opened still parsed every other sūrah with it and
   * froze the thread while it did. surah() reaches one generated file: 391
   * bytes for al-Fātiḥah, 10KB for the median, 174KB for al-Baqarah. */
  const verses = useMemo(() => surah(n), [n]);

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
          <Text style={{ fontFamily: F.quranic, fontSize: fs(30), color: C.brand600 }}>{meta.name}</Text>
          <Text style={{ fontFamily: F.display, fontSize: fs(17), color: C.ink, marginTop: 5 }}>
            {t(`surah.${n}.name`, meta.nameEn)}</Text>
          <Text style={{ fontFamily: F.sans, fontSize: fs(12), color: C.muted, marginTop: 3 }}>
            {t(`surah.${n}.meaning`, meta.meaning)} · {meta.ayahs} {t("quran.ayahs", "āyāt")} · {meta.revealed}</Text>
          {n !== 1 && n !== 9 && (
            <Text style={{ fontFamily: F.quranic, fontSize: fs(19), lineHeight: fs(36), color: C.ink,
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
          <Text style={{ fontFamily: F.quranic, fontSize: fs(23), lineHeight: fs(46), color: C.ink,
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

/* ---------- one page, which you can get closer to ------------------------
 *
 * The 13-line muṣḥaf is small print photographed small, and a committee member
 * reading it on an Android phone could not make it any bigger: the page was a
 * plain image fitted to the glass with no zoom at all. React Native's own
 * ScrollView zoom is iOS-only, so on the phones most of this community uses it
 * would have done nothing — hence gestures rather than a scroll view.
 *
 * Three gestures, which is what people already try: pinch, drag once you are
 * in, and double tap. Double tap matters most — it is the one gesture somebody
 * who has never pinched a screen will still find, and it is the way back out.
 *
 * The sums are in src/zoom.js and tested in Node; everything here is wiring.
 */
function Page({ n, width, height, uri, dim, children, onZoom }) {
  const scale = useSharedValue(1), start = useSharedValue(1);
  const x = useSharedValue(0), y = useSharedValue(0);
  const fromX = useSharedValue(0), fromY = useSharedValue(0);
  /* Zoomed-in-ness in ordinary React state as well as in a shared value,
     because it decides whether the drag gesture below is CONFIGURED at all,
     and a gesture is configured on the JS side. */
  const [zoomed, setZoomed] = useState(false);

  /* The pager above has to be told, because a sideways drag at 2x means "look
     across this page", not "turn it". */
  const tell = s => {
    const fitted = pagerEnabled(s);
    onZoom(fitted);
    setZoomed(!fitted);
  };

  const settle = () => {
    "worklet";
    if (scale.value <= MIN + 0.01) {
      scale.value = withTiming(MIN); x.value = withTiming(0); y.value = withTiming(0);
    } else {
      x.value = clampOffset(x.value, width, scale.value);
      y.value = clampOffset(y.value, height, scale.value);
    }
    runOnJS(tell)(scale.value);
  };

  const pinch = Gesture.Pinch()
    .onStart(() => { "worklet"; start.value = scale.value; })
    .onUpdate(e => { "worklet"; scale.value = clampScale(start.value * e.scale); })
    .onEnd(() => { "worklet"; settle(); });

  /* Only while zoomed in, which is what lets a fitted page be swiped at all.
     A Pan that merely EXISTS takes the finger off the pager underneath it:
     gesture-handler gives its own recogniser first refusal on the touch, so
     the swipe went to a drag that had been told to do nothing, and the page
     did not turn. Returning early inside onUpdate cannot help — by then the
     touch has been claimed. Disabled, there is nothing to claim it, and the
     list gets the swipe.

     The cost is that you cannot slide the page around in the middle of a
     pinch, only once that pinch has ended; which nobody notices, because a
     pinch is two fingers converging and a drag is one finger travelling. */
  const pan = Gesture.Pan()
    .enabled(zoomed)
    .averageTouches(true)
    .onStart(() => { "worklet"; fromX.value = x.value; fromY.value = y.value; })
    .onUpdate(e => {
      "worklet";
      if (scale.value <= MIN + 0.01) return;      /* fitted: the pager has it */
      x.value = clampOffset(fromX.value + e.translationX, width, scale.value);
      y.value = clampOffset(fromY.value + e.translationY, height, scale.value);
    })
    .onEnd(() => { "worklet"; settle(); });

  const twice = Gesture.Tap().numberOfTaps(2).maxDuration(260)
    .onEnd(e => {
      "worklet";
      const out = dtap({ scale: scale.value, x: e.x - width / 2, y: e.y - height / 2,
                         ox: x.value, oy: y.value, width, height });
      scale.value = withTiming(out.scale, { duration: 180 });
      x.value = withTiming(out.x, { duration: 180 });
      y.value = withTiming(out.y, { duration: 180 });
      runOnJS(tell)(out.scale);
    });

  /* Pinch and pan together, so you can frame a line in one movement; the
     double tap races them, because it must not be swallowed by the pan. */
  const gesture = Gesture.Race(twice, Gesture.Simultaneous(pinch, pan));

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }, { translateY: y.value }, { scale: scale.value }],
  }));

  return (
    <GestureDetector gesture={gesture}>
      <View style={{ width, height, justifyContent: "center", backgroundColor: dim }}>
        {children}
        <Animated.View style={[{ width, height }, style]}>
          <Image {...uri} style={{ width, height }} contentFit="contain"
                 cachePolicy="disk" transition={140} placeholder={null} />
        </Animated.View>
      </View>
    </GestureDetector>
  );
}

export function Mushaf({ route, navigation }) {
  const { t, fs, setLastRead, muMark, muFavSurahs, toggleMushafMark, toggleMushafFavSurah } = useApp();
  /* Not Dimensions.get(): that is measured once, and this screen is the one
   * place in the app that turns sideways on purpose. The window is only the
   * STARTING guess, though — see `box` below. */
  const { width, height } = useWindowDimensions();
  const start = route.params?.page || 1;
  const [page, setPage] = useState(start);
  const [jump, setJump] = useState(false);
  const [land, setLand] = useState(false);
  const [toast, setToast] = useState(null);
  const [failed, setFailed] = useState(() => new Set());
  /* False while a page is zoomed in, so a sideways drag looks across the page
     instead of turning it. Pages report this up as they are pinched. */
  const [canPage, setCanPage] = useState(true);
  /* How much glass this reader ACTUALLY has, and how much of it the page bar
   * is standing on.
   *
   * Pages used to be built a whole window tall. They are not shown in a whole
   * window: the muṣḥaf keeps its header, so the strip starts an inch down and
   * runs off the bottom of the phone by exactly that much. A page centred in
   * a box like that is centred somewhere you cannot see — which on a phone
   * came out as a black band across the top and the last line of the page
   * tucked under the bar.
   *
   * So the strip reports its own size, and the bar reports its own height, and
   * a page is given what is left. Measured rather than worked out from the
   * window, because the header is a different height on every phone and the
   * answer is sitting right there in the layout. */
  const [box, setBox] = useState({ w: width, h: height });
  const [bar, setBar] = useState(0);
  const pageW = box.w;
  const pageH = Math.max(1, box.h - bar);
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

  const measure = e => {
    const { width: w, height: h } = e.nativeEvent.layout;
    setBox(b => (b.w === w && b.h === h ? b : { w, h }));
  };

  /* Turning the phone changes how wide a page is, and the strip is laid out in
   * page-widths — so without this the reader would be left between two pages. */
  useEffect(() => {
    const id = setTimeout(() => {
      try { list.current?.scrollToIndex({ index: page - 1, animated: false }); } catch {}
    }, 60);
    return () => clearTimeout(id);
  }, [pageW, pageH]);

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

  /* THE FAVOURITE IS A SŪRAH, NOT A PAGE. Keeping page numbers gave a list
     reading "Page 247, Page 408, Page 611" — a page belongs to one printing
     and names no sūrah anybody could ask for, which is why the committee
     reported favourites as missing rather than as unhelpful.
     Eight pages near the end open more than one sūrah, so `here` is the last
     one to open at or before this page: the sūrah the page runs into. That
     is a judgement, so it is never acted on silently — the control carries
     the sūrah's name and so does the note after it. */
  const here = surahAt(page);
  const hereName = here ? t(`surah.${here}.name`, IDX.surahs.find(x => x.n === here)?.nameEn || "")
                        : "";
  const fav = !!here && muFavSurahs.includes(here);

  const bookmark = () => {
    tap();
    toggleMushafMark(page);
    say(marked ? t("mushaf.bookmark_taken_away", "Bookmark taken off this page")
               : t("mushaf.bookmark_put_here", "Bookmark put on this page"));
  };

  /* The note NAMES THE SŪRAH, which is the whole safeguard on a page that
     opens more than one: the reader is told what was kept, not merely that
     something was, and the Sūrah list is one tap away if it was the other. */
  const favourite = () => {
    if (!here) return;
    tap();
    toggleMushafFavSurah(here);
    say((fav ? t("mushaf.surah_removed", "{s} removed from favourites")
             : t("mushaf.surah_added", "{s} added to favourites")).replace("{s}", hereName));
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#15060F" }}>
      <View style={{ flex: 1 }} onLayout={measure}>
        <FlatList
          ref={list}
          data={pages}
          horizontal
          pagingEnabled
          scrollEnabled={canPage}
          /* Right to left, because that is the direction a muṣḥaf turns. */
          inverted
          initialScrollIndex={start - 1}
          getItemLayout={(_, i) => ({ length: pageW, offset: pageW * i, index: i })}
          keyExtractor={n => String(n)}
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={e => setPage(Math.round(e.nativeEvent.contentOffset.x / pageW) + 1)}
          windowSize={3}
          renderItem={({ item: n }) => (
            <Page n={n} width={pageW} height={pageH} dim="#15060F" onZoom={setCanPage}
                  uri={{ source: { uri: pageUrl(n) },
                         onError: () => setFailed(f => new Set(f).add(n)),
                         onLoad: () => setFailed(f => { if (!f.has(n)) return f; const g = new Set(f); g.delete(n); return g; }) }}>
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
            </Page>)} />
      </View>

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
      {/* READ THE EVENT BEFORE THE UPDATER, NOT INSIDE IT. This used to be
          `setBar(h => { const next = e.nativeEvent.layout.height; ... })`, and
          React is free to run that updater after the handler has returned — by
          which time React Native has recycled the synthetic event and
          nativeEvent is null. The result was "Cannot read property 'layout' of
          null", reported seven times from this screen across iOS 27 and
          Android 11 before anybody read the crash table. It is intermittent by
          nature, which is why it survived testing.

          measure() above already does it this way round. This was the outlier. */}
      <View onLayout={e => {
                       const next = e.nativeEvent.layout.height;
                       setBar(h => (h === next ? h : next));
                     }}
            style={{ position: "absolute", left: 0, right: 0, bottom: 0, flexDirection: "row",
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
                                     : t("a11y.bookmark_this_page", "Bookmark this page")}>
          <Ionicons name={marked ? "bookmark" : "bookmark-outline"} size={19}
                    color={marked ? C.goldBright : "rgba(243,239,227,.65)"} />
        </Press>
        {/* THE HEART IS ON THE BAR NOW. Favourites existed before this change
            but the only way to add one was to open the jump sheet and find a
            pill inside it, which is why the committee reported the feature as
            missing: it was there, and unreachable. */}
        <Press onPress={favourite} disabled={!here} dim={false} style={{ padding: 8, opacity: here ? 1 : 0.35 }}
          accessibilityLabel={fav ? t("a11y.remove_this_surah", "Remove this sūrah from favourites")
                                  : t("a11y.favourite_this_surah", "Add this sūrah to favourites")}>
          <Ionicons name={fav ? "heart" : "heart-outline"} size={19}
                    color={fav ? C.goldBright : "rgba(243,239,227,.65)"} />
        </Press>
        <Press onPress={orient} style={{ padding: 8 }}
          accessibilityLabel={t("mushaf.horizontal", "Horizontal")}>
          <Ionicons name={land ? "phone-portrait-outline" : "phone-landscape-outline"} size={19}
                    color="rgba(243,239,227,.65)" />
        </Press>
      </View>

      {jump && <Jump page={page} here={here} onPick={goto} onClose={() => setJump(false)}
                     onFav={n => {
                       tap();
                       const was = muFavSurahs.includes(n);
                       toggleMushafFavSurah(n);
                       const name = t(`surah.${n}.name`, IDX.surahs.find(x => x.n === n)?.nameEn || "");
                       say((was ? t("mushaf.surah_removed", "{s} removed from favourites")
                                : t("mushaf.surah_added", "{s} added to favourites")).replace("{s}", name));
                     }} />}
    </View>
  );
}

function Jump({ page, here, onPick, onClose, onFav }) {
  const { t, fs, muFavSurahs, muMark } = useApp();
  const [mode, setMode] = useState("juz");
  const [typed, setTyped] = useState("");

  /* A sūrah row carries its number so the heart has something to toggle; a
     juzʼ row does not, because a juzʼ is not a thing you can favourite. */
  const surahRow = n => ({
    n,
    label: `${n}. ${t(`surah.${n}.name`, IDX.surahs.find(x => x.n === n)?.nameEn || "")}`,
    sub: `p.${pageOf(n)}`,
    page: pageOf(n),
  });

  const items = mode === "juz"
    ? Object.entries(MUSHAF.juzPage).map(([j, p]) => ({ label: `${t("quran.juz", "Juzʼ")} ${j}`, sub: `p.${p}`, page: p }))
    : mode === "surah"
      ? IDX.surahs.map(x => surahRow(x.n))
      /* THE FAVOURITES ARE SŪRAHS, in the muṣḥaf's own order rather than the
         order they happened to be added, which is how somebody looks for
         one. */
      : [...muFavSurahs].sort((a, b) => a - b).map(surahRow);

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
        <Press onPress={onClose} style={{ padding: 10 }}
          accessibilityRole="button" accessibilityLabel={t("a11y.close", "Close")}>
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

      {/* Keeping the sūrah you are reading, BY NAME. The old pill said "Add
          this page to favourites" and saved a number; this says which sūrah
          it is about to keep, which is the only way a reader can tell on one
          of the eight pages that open more than one. */}
      {!!here && (
        <Press onPress={() => onFav(here)}
          style={{ marginHorizontal: 16, marginBottom: 10, flexDirection: "row", alignItems: "center",
                   gap: 9, paddingHorizontal: 15, paddingVertical: 11, borderRadius: R.pill,
                   borderWidth: 1, borderColor: "rgba(243,239,227,.22)" }}>
          <Ionicons name={muFavSurahs.includes(here) ? "heart" : "heart-outline"} size={16}
                    color={muFavSurahs.includes(here) ? C.goldBright : "rgba(243,239,227,.7)"} />
          <Text style={{ fontFamily: F.sansSemi, fontSize: fs(12.5), color: C.cream }}>
            {(muFavSurahs.includes(here) ? t("mushaf.remove_surah", "Remove {s} from favourites")
                                         : t("mushaf.keep_surah", "Keep {s} in favourites"))
              .replace("{s}", t(`surah.${here}.name`, IDX.surahs.find(x => x.n === here)?.nameEn || ""))}</Text>
        </Press>)}

      {mode === "fav" && !muFavSurahs.length
        ? <Text style={{ fontFamily: F.sans, fontSize: fs(13), color: "rgba(243,239,227,.55)",
                         textAlign: "center", paddingHorizontal: 30, paddingTop: 24 }}>
            {t("mushaf.no_surahs_kept_yet",
               "No sūrahs kept yet. The button above keeps the sūrah you are reading.")}</Text>
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
                {/* SETTING A FAVOURITE FROM THE LIST is the unambiguous way
                    to do it: a sūrah row is one sūrah, with no page to share.
                    Its own hit area, so tapping the row still jumps. */}
                {!!item.n && (
                  <Press onPress={() => onFav(item.n)} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                    style={{ paddingHorizontal: 4, paddingVertical: 2 }}
                    accessibilityLabel={(muFavSurahs.includes(item.n)
                        ? t("a11y.remove_s_from_favourites", "Remove {s} from favourites")
                        : t("a11y.add_s_to_favourites", "Add {s} to favourites")).replace("{s}", item.label)}>
                    <Ionicons name={muFavSurahs.includes(item.n) ? "heart" : "heart-outline"} size={16}
                              color={muFavSurahs.includes(item.n) ? C.goldBright : "rgba(243,239,227,.4)"} />
                  </Press>)}
              </Press>)} />}
    </View>
  );
}
