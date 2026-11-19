/* Ṣaḥīḥ al-Bukhārī — 97 books, 7,563 narrations.
 *
 * The "Index & Card" layout: the book list and each book's hadith are cards,
 * and a card opens a reader of its own — Narrator, Arabic, English, with Save,
 * Copy and Share. The book headings are bundled so the list is instant and
 * works offline; the narrations are fetched a book at a time, because all 97
 * come to 8.7MB and most people open two or three.
 */
import React, { useEffect, useRef, useState } from "react";
import { View, Text, FlatList, ScrollView, TextInput, ActivityIndicator, Share } from "react-native";
import * as Clipboard from "expo-clipboard";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { C, F, R } from "../theme";
import { useApp } from "../store";
import { Ionicons } from "@expo/vector-icons";
import { Screen, Note, Press, Empty, Arabic, Advisory, tap } from "../ui";
import Animated from "react-native-reanimated";
import { Appear, SkeletonRows, usePop, useRing } from "../motion";
import B from "../data/bukhari.json";

const HOST = "https://taiyabahapp.ysbdesigns.uk";

/* MUST MATCH scripts/build-bukhari.mjs AND the website's hdSearchable()
 * EXACTLY. Written as checked escapes, never as literal characters: this
 * class has been silently corrupted in transit before, and the corruption is
 * invisible — the app quietly stops matching the index it is searching. */
const searchable = x => String(x)
  .replace(/[ؐ-ًؚ-ٰٟۖ-ۭ࣓-ࣿـ]/gu, "")
  .replace(/[آأإٱ]/gu, "ا")
  .replace(/ة/gu, "ه")
  .replace(/ى/gu, "ي")
  .replace(/\s+/gu, " ")
  .trim();

/* English folds the same way the build folded the index it is matched
 * against: the honorific glyph ﷺ dropped, lower-cased, whitespace collapsed. */
const enSearchable = x => String(x)
  .replace(/ﷺ/gu, " ")
  .toLowerCase()
  .replace(/\s+/gu, " ")
  .trim();

/* Split the standard "Narrated X:" opening from the body, so the reader can
 * label the narrator the way a printed Bukhārī does. ~2% have no such opening;
 * those fall back to the whole text with no narrator. */
function narrator(en) {
  const m = String(en).match(/^(Narrated[^:]*):\s*([\s\S]*)$/);
  return m ? { narr: m[1].trim(), body: m[2].trim() } : { narr: "", body: String(en).trim() };
}

/* Saved hadith live in their own AsyncStorage key, not the global prefs blob. */
const SAVED_KEY = "bukhari.saved";
async function loadSaved() {
  try { const v = await AsyncStorage.getItem(SAVED_KEY); const a = v ? JSON.parse(v) : []; return new Set(Array.isArray(a) ? a : []); }
  catch { return new Set(); }
}
async function toggleSaved(n) {
  const s = await loadSaved();
  s.has(n) ? s.delete(n) : s.add(n);
  try { await AsyncStorage.setItem(SAVED_KEY, JSON.stringify([...s])); } catch {}
  return s.has(n);
}

/* A few books either side of the one being read stay in memory; the whole
 * collection does not. */
const bookCache = new Map();
async function fetchBook(n) {
  if (bookCache.has(n)) return bookCache.get(n);
  const r = await fetch(`${HOST}/quran/hadith/bukhari/b/${n}.json`);
  if (!r.ok) throw new Error(String(r.status));
  const data = await r.json();
  if (bookCache.size > 4) bookCache.delete(bookCache.keys().next().value);
  bookCache.set(n, data);
  return data;
}

/* The same 5MB index the website fetches, held for the life of the screen. */
let INDEX = null;
async function searchIndex() {
  if (INDEX) return INDEX;
  const r = await fetch(`${HOST}/quran/hadith/bukhari/search.json`);
  if (!r.ok) throw new Error("index " + r.status);
  INDEX = await r.json();
  return INDEX;
}

export default function Bukhari({ navigation }) {
  const { t, fs, rtl } = useApp();
  const [num, setNum] = useState("");
  const [err, setErr] = useState("");
  const [q, setQ] = useState("");
  const [hits, setHits] = useState(null);     // null = showing the book list
  const [busy, setBusy] = useState(false);
  const run = useRef(0);

  /* List entrance fires on the first paint only: the opening screenful rises
     in, and rows scrolled to afterwards (or when searching) just appear —
     motion on arrival, never on scroll. */
  const firstPaint = useRef(true);
  useEffect(() => { const id = setTimeout(() => { firstPaint.current = false; }, 900); return () => clearTimeout(id); }, []);

  useEffect(() => {
    /* Which language is searched is decided by what is typed: any Arabic
       letter means the matn, otherwise the English translation. The index
       carries both — [n, b, arabic, english] — so one fetch serves either. */
    const arabic = /[؀-ۿ]/.test(q);
    const term = arabic ? searchable(q) : enSearchable(q);
    if (term.length < 2) { setHits(null); setErr(""); return; }
    const id = ++run.current;
    const timer = setTimeout(async () => {
      setBusy(true);
      try {
        const idx = await searchIndex();
        if (run.current !== id) return;
        const name = {}; B.list.forEach(b => { name[b.n] = b.name; });
        const out = [];
        for (const row of idx) {
          if (out.length >= 200) break;
          const n = row[0], b = row[1];
          const text = arabic ? row[2] : (row[3] || "");
          if (!text) continue;
          const at = text.indexOf(term);
          if (at < 0) continue;
          out.push({ n, book: b, name: name[b] || "", ar: arabic,
                     before: text.slice(Math.max(0, at - 38), at),
                     hit: text.slice(at, at + term.length),
                     after: text.slice(at + term.length, at + term.length + 38) });
        }
        if (run.current !== id) return;
        setErr(out.length ? "" : t("bukhari.nothing_matches", "Nothing matches that."));
        setHits(out);
      } catch {
        if (run.current !== id) return;
        setErr(t("bukhari.search_unavailable",
          "Search needs a connection the first time. Try again when you are online."));
        setHits([]);
      } finally { if (run.current === id) setBusy(false); }
    }, 220);
    return () => clearTimeout(timer);
  }, [q, t]);

  const goTo = () => {
    const n = Number(num);
    if (!n) return;
    const b = B.list.find(x => n >= x.first && n <= x.last);
    if (!b) return setErr(t("bukhari.no_such_hadith", "There is no hadith with that number."));
    tap(); setErr("");
    navigation.navigate("BukhariHadith", { bookN: b.n, n, name: b.name });
  };

  return (
    <FlatList
      style={{ backgroundColor: C.paper }}
      data={hits || B.list}
      keyExtractor={(b, i) => (hits ? `h${b.n}-${i}` : String(b.n))}
      initialNumToRender={14}
      contentContainerStyle={{ paddingBottom: 34 }}
      ListHeaderComponent={
        <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
          <TextInput
            value={q} onChangeText={setQ}
            placeholder={t("a11y.search_arabic_or_english", "Search Arabic or English…")} placeholderTextColor={C.muted}
            autoCapitalize="none" autoCorrect={false} returnKeyType="search"
            style={{ fontFamily: F.sans, fontSize: fs(14), color: C.ink, borderWidth: 1,
                     borderColor: C.line, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 9,
                     backgroundColor: C.card, textAlign: rtl ? "right" : "left" }} />
          <View style={{ flexDirection: rtl ? "row-reverse" : "row", alignItems: "center", gap: 8,
                         marginTop: 9, marginBottom: 12 }}>
            <Text style={{ fontFamily: F.sansSemi, fontSize: fs(12.5), color: C.muted }}>
              {t("bukhari.go_to", "Go to hadith")}</Text>
            <TextInput
              value={num}
              onChangeText={v => { setErr(""); setNum(v.replace(/[^0-9]/g, "")); }}
              keyboardType="number-pad" returnKeyType="go" onSubmitEditing={goTo}
              style={{ width: 100, fontFamily: F.sans, fontSize: fs(14), color: C.ink,
                       borderWidth: 1, borderColor: C.line, borderRadius: 10,
                       paddingHorizontal: 10, paddingVertical: 9, backgroundColor: C.card }} />
            <Press onPress={goTo}
              style={{ paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10,
                       borderWidth: 1, borderColor: C.line, backgroundColor: C.card }}>
              <Text style={{ fontFamily: F.sansSemi, fontSize: fs(13), color: C.brand600 }}>
                {t("bukhari.go", "Go")}</Text>
            </Press>
            {busy && <ActivityIndicator color={C.brand600} />}
          </View>
          {!!err && <Note>{err}</Note>}
          {!!hits?.length && (
            <Note>{t("bukhari.n_matching", "{n} hadith matching").replace("{n}", String(hits.length))
                 + (hits.length >= 200 ? t("bukhari.first_200", " — showing the first 200") : "")}</Note>)}
        </View>}
      ListFooterComponent={
        <View style={{ paddingHorizontal: 16, paddingTop: 4 }}>
          <Advisory h={{ k: "bukhari.what_is_here", t: "About this text" }}
                    ps={[{ k: "bukhari.arabic_is_carried",
                           t: "The Arabic is carried in full, from the public-domain edition named at the top of this page." },
                         { k: "bukhari.english_by_permission",
                           t: "The English is Dr Muhammad Muhsin Khan's translation, published by Darussalam. It is a modern work still in copyright and is not public domain — it is included here because Taiyabah Masjid has been given permission to use it." }]} />
        </View>}
      renderItem={({ item: b, index }) => (
        <Appear index={index} animate={firstPaint.current && !hits && index < 14}>{hits ? (
        /* A search result: the hadith number over its book, then the matching
           line with the hit in it. Tapping opens that hadith directly. */
        <Press onPress={() => { tap(); navigation.navigate("BukhariHadith", { bookN: b.book, n: b.n, name: b.name }); }}
          style={{ marginHorizontal: 16, marginBottom: 9, paddingHorizontal: 13, paddingVertical: 12,
                   backgroundColor: C.card, borderWidth: 1, borderColor: C.line, borderRadius: 14 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 5 }}>
            <Text style={{ fontFamily: F.sansBold, fontSize: fs(11.5), letterSpacing: 0.46, color: C.brand600 }}>
              {t("bukhari.hadith_n", "Hadith {n}").replace("{n}", String(b.n))}</Text>
            <Text style={{ fontFamily: F.sans, fontSize: fs(11.5), color: C.muted }}>{b.name}</Text>
          </View>
          <Text numberOfLines={2} accessibilityLanguage={b.ar ? "ar" : undefined} style={b.ar
              ? { fontFamily: F.quranic, fontSize: fs(17), lineHeight: fs(32), color: C.ink,
                  textAlign: "right", writingDirection: "rtl" }
              : { fontFamily: F.sans, fontSize: fs(13.5), lineHeight: fs(21), color: C.ink,
                  textAlign: "left", writingDirection: "ltr" }}>
            {"…" + b.before}
            <Text style={{ color: C.brand600, fontFamily: b.ar ? F.quranic : F.sansSemi }}>{b.hit}</Text>
            {b.after + "…"}
          </Text>
        </Press>
      ) : (
        /* A book card: a plum number badge, the name over its count, chevron. */
        <Press onPress={() => { tap(); navigation.navigate("BukhariBook", { n: b.n, name: b.name }); }}
          style={{ flexDirection: rtl ? "row-reverse" : "row", alignItems: "center", gap: 12,
                   marginHorizontal: 16, marginBottom: 9, paddingHorizontal: 13, paddingVertical: 11,
                   backgroundColor: C.card, borderWidth: 1, borderColor: C.line, borderRadius: 14 }}>
          <View style={{ width: 30, height: 30, borderRadius: 9, backgroundColor: C.brand600,
                         alignItems: "center", justifyContent: "center" }}>
            <Text style={{ fontFamily: F.sansBold, fontSize: fs(13), color: C.cream }}>{b.n}</Text>
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={{ fontFamily: F.sansSemi, fontSize: fs(14.5), color: C.ink,
                           textAlign: rtl ? "right" : "left" }}>{b.name}</Text>
            <Text style={{ fontFamily: F.sans, fontSize: fs(12), color: C.muted,
                           textAlign: rtl ? "right" : "left" }}>
              {t("bukhari.n_hadith", "{n} hadith").replace("{n}", String(b.count))}</Text>
          </View>
          <Ionicons name={rtl ? "chevron-back" : "chevron-forward"} size={17} color={C.muted} />
        </Press>)}</Appear>)} />
  );
}

/* ---- one book: a preview card per hadith, opening the reader ---- */
export function BukhariBook({ route, navigation }) {
  const { t, fs } = useApp();
  const { n, name } = route.params;
  const [state, setState] = useState({ loading: true });
  const [saved, setSaved] = useState(new Set());
  const firstPaint = useRef(true);
  useEffect(() => { const id = setTimeout(() => { firstPaint.current = false; }, 900); return () => clearTimeout(id); }, []);

  useEffect(() => {
    let live = true;
    fetchBook(n)
      .then(rows => live && setState({ rows }))
      .catch(() => live && setState({ error: true }));
    loadSaved().then(s => live && setSaved(s));
    return () => { live = false; };
  }, [n]);

  /* Reflect a save made on the reader when we come back to this list. */
  useEffect(() => navigation.addListener("focus", () => { loadSaved().then(setSaved); }), [navigation]);

  /* While the book's narrations are fetched, branded skeletons the shape of
     the preview cards shimmer in gold — not a bare spinner on an empty page. */
  if (state.loading)
    return (
      <View style={{ flex: 1, backgroundColor: C.paper }}>
        <SkeletonRows count={7} height={76} style={{ paddingHorizontal: 16, paddingTop: 12 }} />
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
      initialNumToRender={10}
      contentContainerStyle={{ paddingTop: 12, paddingBottom: 40 }}
      renderItem={({ item: h, index }) => (
        <Appear index={index} animate={firstPaint.current && index < 10}>
        <Press onPress={() => { tap(); navigation.navigate("BukhariHadith", { bookN: n, n: h.n, name }); }}
          style={{ marginHorizontal: 16, marginBottom: 9, paddingHorizontal: 14, paddingVertical: 12,
                   backgroundColor: C.card, borderWidth: 1, borderColor: C.line, borderRadius: 14 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 9, marginBottom: 6 }}>
            <Text style={{ fontFamily: F.sansBold, fontSize: fs(11.5), letterSpacing: 0.46, color: C.brand600 }}>
              {t("bukhari.hadith_n", "Hadith {n}").replace("{n}", String(h.n))}</Text>
            <Text style={{ fontFamily: F.sans, fontSize: fs(11.5), color: C.muted }}>
              {t("bukhari.n_in_book", "{i} in this book").replace("{i}", String(h.i))}</Text>
            {saved.has(h.n) && <Ionicons name="bookmark" size={13} color={C.gold} style={{ marginLeft: "auto" }} />}
          </View>
          {h.en
            ? <Text numberOfLines={2} style={{ fontFamily: F.sans, fontSize: fs(13.5), lineHeight: fs(21),
                       color: C.ink, textAlign: "left", writingDirection: "ltr" }}>{h.en}</Text>
            : <Text numberOfLines={2} accessibilityLanguage="ar" style={{ fontFamily: F.quranic, fontSize: fs(17), lineHeight: fs(32),
                       color: C.ink, textAlign: "right", writingDirection: "rtl" }}>{h.ar}</Text>}
        </Press></Appear>)} />
  );
}

/* The Save action, with the one bit of motion the three actions earn: on save
 * the bookmark pops and a gold ring goes out from it; un-saving just pops. Kept
 * at module scope, not inline in the reader, so the save that re-renders the
 * reader does not remount this and cut the animation it just started. Both the
 * pop and the ring are no-ops under Reduce Motion. */
function SaveAction({ saved, label, onToggle }) {
  const { fs } = useApp();
  const { style: popStyle, pop } = usePop();
  const { style: ring, fire } = useRing();
  /* Fire the pop and the ring SYNCHRONOUSLY on tap, before the save touches
     AsyncStorage. A Reanimated value set in the async continuation after an
     await does not reliably reach the UI thread on device, so the animation
     was silently dropped on a real phone though it ran on web. The ring shows
     only when this tap is a SAVE (the bookmark is currently empty); then the
     storage write happens fire-and-forget. */
  const run = () => { pop(1.34); if (!saved) fire(); onToggle(); };
  return (
    <Press onPress={run}
      style={{ flex: 1, alignItems: "center", gap: 3, paddingVertical: 9, borderRadius: 12,
               borderWidth: 1, borderColor: saved ? C.gold : C.line, backgroundColor: C.card }}>
      <View>
        <Animated.View pointerEvents="none"
          style={[{ position: "absolute", left: "50%", top: "50%", width: 30, height: 30,
                    marginLeft: -15, marginTop: -15, borderRadius: 10, borderWidth: 2, borderColor: C.goldBright }, ring]} />
        <Animated.View style={popStyle}>
          <Ionicons name={saved ? "bookmark" : "bookmark-outline"} size={17} color={saved ? C.gold : C.brand600} />
        </Animated.View>
      </View>
      <Text style={{ fontFamily: F.sansSemi, fontSize: fs(11), color: C.muted }}>{label}</Text>
    </Press>);
}

/* ---- one hadith: narrator, Arabic, English, and the three actions ---- */
export function BukhariHadith({ route }) {
  const { t, fs } = useApp();
  const { bookN, n } = route.params;
  const [state, setState] = useState({ loading: true });
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let live = true;
    fetchBook(bookN)
      .then(rows => {
        const h = rows.find(x => x.n === n);
        if (live) setState(h ? { h } : { error: true });
      })
      .catch(() => live && setState({ error: true }));
    loadSaved().then(s => live && setSaved(s.has(n)));
    return () => { live = false; };
  }, [bookN, n]);

  const h = state.h;
  const text = h ? (h.ar + "\n\n" + (h.en || "") + "\n\n— " + t("bukhari.title", "Ṣaḥīḥ al-Bukhārī") + " " + n) : "";
  const onSave = async () => { tap(); const s = await toggleSaved(n); setSaved(s); return s; };
  const onCopy = async () => { tap(); try { await Clipboard.setStringAsync(text); } catch {} setCopied(true); setTimeout(() => setCopied(false), 1400); };
  const onShare = async () => { tap(); try { await Share.share({ message: text }); } catch {} };

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

  const parts = h.en ? narrator(h.en) : { narr: "", body: "" };
  const Action = ({ icon, label, onPress, on }) => (
    <Press onPress={onPress}
      style={{ flex: 1, alignItems: "center", gap: 3, paddingVertical: 9, borderRadius: 12,
               borderWidth: 1, borderColor: on ? C.gold : C.line, backgroundColor: C.card }}>
      <Ionicons name={icon} size={17} color={on ? C.gold : C.brand600} />
      <Text style={{ fontFamily: F.sansSemi, fontSize: fs(11), color: C.muted }}>{label}</Text>
    </Press>);
  const Section = ({ label, children }) => (
    <View style={{ paddingVertical: 12, borderTopWidth: 1, borderTopColor: C.line }}>
      <Text style={{ fontFamily: F.sansBold, fontSize: fs(9.5), letterSpacing: 1.1,
                     textTransform: "uppercase", color: C.goldInk, marginBottom: 6 }}>{label}</Text>
      {children}
    </View>);

  return (
    <ScrollView style={{ backgroundColor: C.paper }} contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 16, paddingBottom: 40 }}>
      <View style={{ flexDirection: "row", gap: 8, marginBottom: 14 }}>
        <SaveAction saved={saved} label={t("bukhari.save", "Save")} onToggle={onSave} />
        <Action icon="copy-outline" label={copied ? t("bukhari.copied", "Copied") : t("bukhari.copy", "Copy")} onPress={onCopy} on={copied} />
        <Action icon="share-outline" label={t("bukhari.share", "Share")} onPress={onShare} />
      </View>
      <View style={{ alignSelf: "flex-start", backgroundColor: "rgba(198,162,76,.16)", borderRadius: R.pill,
                     paddingHorizontal: 11, paddingVertical: 4, marginBottom: 2 }}>
        <Text style={{ fontFamily: F.sansSemi, fontSize: fs(11.5), color: C.goldInk }}>
          {t("bukhari.hadith_n", "Hadith {n}").replace("{n}", String(n))}</Text>
      </View>
      {!!parts.narr && (
        <Section label={t("bukhari.narrator", "Narrator")}>
          <Text style={{ fontFamily: F.sansSemi, fontSize: fs(13.5), color: C.ink }}>{parts.narr}</Text>
        </Section>)}
      <Section label={t("bukhari.arabic", "Arabic")}>
        <Arabic size={20} center={false}>{h.ar}</Arabic>
      </Section>
      {!!h.en && (
        <Section label={t("bukhari.english", "English")}>
          <Text style={{ fontFamily: F.sans, fontSize: fs(14.5), lineHeight: fs(23),
                         color: C.ink, textAlign: "left", writingDirection: "ltr" }}>{parts.body}</Text>
        </Section>)}
    </ScrollView>
  );
}
