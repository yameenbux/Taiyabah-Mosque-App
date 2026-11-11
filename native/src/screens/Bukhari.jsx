/* Ṣaḥīḥ al-Bukhārī — 97 books, 7,563 narrations.
 *
 * The book headings are bundled so the list is instant and works offline; the
 * narrations themselves are fetched a book at a time, because all 97 come to
 * 8.7MB and most people open two or three.
 */
import React, { useEffect, useRef, useState } from "react";
import { View, Text, FlatList, TextInput, ActivityIndicator } from "react-native";
import { C, F, R } from "../theme";
import { useApp } from "../store";
import { Ionicons } from "@expo/vector-icons";
import { Screen, Hero, Card, Note, Press, Empty, Arabic, Advisory, tap } from "../ui";
import B from "../data/bukhari.json";

/* The highest hadith NUMBER, which is not the same as how many there are:
   the pack carries 7580 narrations numbered to 7563, because the standard
   numbering gives one number to some narrations that the edition prints
   separately. Derived from the books rather than hard-coded, so a rebuilt
   pack moves this with it. */
const HIGHEST = B.list.reduce((hi, b) => Math.max(hi, b.last), 0);

const HOST = "https://taiyabahapp.ysbdesigns.uk";

/* MUST MATCH scripts/build-bukhari.mjs AND the website's hdSearchable()
 * EXACTLY. Written as checked escapes, never as literal characters: this
 * class has been silently corrupted in transit before, and the corruption is
 * invisible — the app quietly stops matching the index it is searching. */
const searchable = x => String(x)
  .replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u08D3-\u08FF\u0640]/gu, "")
  .replace(/[\u0622\u0623\u0625\u0671]/gu, "\u0627")
  .replace(/\u0629/gu, "\u0647")
  .replace(/\u0649/gu, "\u064A")
  .replace(/\s+/gu, " ")
  .trim();

/* The same 5MB index the website fetches, from the same path, held for the
 * life of the screen. It is not bundled: 5MB would be a tenth of the app
 * again for a feature most people never open. */
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

  /* Somebody given "Bukhārī 3461" has no way to find it otherwise but to guess
   * which of ninety-seven books it falls in. The website resolves it from the
   * book ranges; so does this. */
  /* THE SEARCH WAS NOT HERE AT ALL. The website's first control on this
     screen is a box that searches the Arabic of all 7,580 narrations, against
     an index it fetches from the same host this app already fetches books
     from. Without it the only way to a hadith was its number, which you only
     have if somebody has already told you. */
  const [q, setQ] = useState("");
  const [hits, setHits] = useState(null);     // null = showing the book list
  const [busy, setBusy] = useState(false);
  const run = useRef(0);

  useEffect(() => {
    const term = searchable(q);
    if (term.length < 2) { setHits(null); setErr(""); return; }
    const id = ++run.current;
    const timer = setTimeout(async () => {
      setBusy(true);
      try {
        const idx = await searchIndex();
        if (run.current !== id) return;
        const name = {}; B.list.forEach(b => { name[b.n] = b.name; });
        const out = [];
        for (const [n, b, text] of idx) {
          if (out.length >= 200) break;
          const at = text.indexOf(term);
          if (at < 0) continue;
          out.push({ n, book: b, name: name[b] || "",
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
    navigation.navigate("BukhariBook", { n: b.n, name: b.name, at: n });
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
          {/* WHERE THE TEXT COMES FROM, FIRST. The committee asked for the
              source and the reference to be at the top of the page rather
              than a footnote, and they were right to: a reader who cannot
              see what edition they are reading cannot judge it.

              An earlier version of this screen DID open with a credit card
              and it was taken out, on the grounds that the licence belongs
              at the foot of the book. The licence does. The provenance does
              not — so this names the compiler, the numbering and the edition
              at the top, and the bare attribution line stays at the foot.

              Not the rose Advisory panel: provenance is not a warning. */}
          <View style={{ borderRadius: 14, paddingVertical: 13, paddingHorizontal: 15,
                         backgroundColor: C.card, borderWidth: 1, borderColor: C.line,
                         marginBottom: 14 }}>
            <Text style={{ fontFamily: F.sansBold, fontSize: fs(11), letterSpacing: 1.1,
                           textTransform: "uppercase", color: C.brand600, marginBottom: 7,
                           textAlign: rtl ? "right" : "left" }}>
              {t("bukhari.where_this_comes_from", "Where this text comes from")}</Text>
            <Text style={{ fontFamily: F.sans, fontSize: fs(13), lineHeight: fs(21), color: C.ink,
                           textAlign: rtl ? "right" : "left" }}>
              {t("bukhari.compiled_by", "Ṣaḥīḥ al-Bukhārī, compiled by Imām Muḥammad ibn Ismāʿīl al-Bukhārī (d. 256 AH / 870 CE).")}</Text>
            {/* Read off the pack, never typed: the counts and the numbering
                are properties of the data that shipped, and a screen that
                states them from memory states them wrongly the first time
                the pack is rebuilt. */}
            <Text style={{ fontFamily: F.sans, fontSize: fs(13), lineHeight: fs(21), color: C.muted,
                           marginTop: 7, textAlign: rtl ? "right" : "left" }}>
              {t("bukhari.structure",
                 "{books} books · {count} narrations · numbered to {highest}, the numbering used when a hadith is cited.")
                .replace("{books}", String(B.books))
                .replace("{count}", String(B.count))
                .replace("{highest}", String(HIGHEST))}</Text>
            <Text style={{ fontFamily: F.sans, fontSize: fs(13), lineHeight: fs(21), color: C.muted,
                           marginTop: 7, textAlign: rtl ? "right" : "left" }}>
              {t("bukhari.edition", "Arabic text: {source}. {licence}.")
                .replace("{source}", B.source || "").replace("{licence}", B.licence || "")}</Text>
          </View>

          {/* .hd-bar — the search box over the go-to-hadith row, 9px apart. */}
          <TextInput
            value={q} onChangeText={setQ}
            placeholder={t("a11y.search_the_arabic", "Search the Arabic…")} placeholderTextColor={C.muted}
            autoCapitalize="none" autoCorrect={false} returnKeyType="search"
            style={{ fontFamily: F.sans, fontSize: fs(14), color: C.ink, borderWidth: 1,
                     borderColor: C.line, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 9,
                     backgroundColor: C.card, textAlign: rtl ? "right" : "left" }} />

          {/* .hd-jump — a label, a 100px field and a Go button that is an
              OUTLINED card with plum text, not a filled plum pill. The field
              was full width, which made the number look like the main way in
              when the search above it is. */}
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
          {/* .wl-advisory — the same rose panel the nikāḥ screen uses, and it
              comes AFTER the list on the website. Here it was grey prose
              above it, between the controls and the books. */}
          <Advisory h={{ k: "bukhari.what_is_here", t: "What is in the app, and what is a link" }}
                    ps={[{ k: "bukhari.arabic_is_carried",
                           t: "The Arabic above is carried inside the app in full, from the public-domain edition named at the top of this page. It reads with no connection and nothing is fetched to show it." },
                         { k: "bukhari.english_is_not_copied",
                           t: "No English translation is reproduced here. Every complete English Ṣaḥīḥ al-Bukhārī in circulation is a modern work still in copyright — the standard one is Dr Muhammad Muhsin Khan's, published by Darussalam, and it is the translation sunnah.com serves. The masjid has not been given permission to copy it, so it does not." },
                         { k: "bukhari.link_not_reproduce",
                           t: "Each hadith instead carries a link that opens sunnah.com in your browser at the matching number. Nothing from sunnah.com is stored in the app or shipped with it, and sunnah.com's own terms do not permit reproducing a collection in full." }]} />
        </View>}
      renderItem={({ item: b }) => (hits ? (
        /* .hd-hit — a search result: the hadith number in plum over the book
           it is in, then the Arabic line with the match in it, right-aligned
           and set in the scripture face. */
        <Press onPress={() => { tap(); navigation.navigate("BukhariBook", { n: b.book, name: b.name, at: b.n }); }}
          style={{ paddingHorizontal: 16, paddingVertical: 13,
                   borderBottomWidth: 1, borderBottomColor: C.line }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Text style={{ fontFamily: F.sansBold, fontSize: fs(11.5), letterSpacing: 0.46, color: C.brand600 }}>
              {t("bukhari.hadith_n", "Hadith {n}").replace("{n}", String(b.n))}</Text>
            <Text style={{ fontFamily: F.sans, fontSize: fs(11.5), color: C.muted }}>{b.name}</Text>
          </View>
          <Text style={{ fontFamily: F.quranic, fontSize: fs(19), lineHeight: fs(41), color: C.ink,
                         textAlign: "right", writingDirection: "rtl", marginTop: 4 }}>
            {"…" + b.before}
            <Text style={{ color: C.brand600 }}>{b.hit}</Text>
            {b.after + "…"}
          </Text>
        </Press>
      ) : (
        /* .hd-book — the number is 12px bold plum in a 2.2em right-aligned
            column, not a glyph in a tinted chip; the title is 14.5px at 600
            over a 12px muted count, and the row ends in a chevron. The count
            says "hadith" on the website, which is what the books are counted
            in — "narrations · 1–7" was written here. */
        <Press onPress={() => { tap(); navigation.navigate("BukhariBook", { n: b.n, name: b.name }); }}
          style={{ flexDirection: rtl ? "row-reverse" : "row", alignItems: "center", gap: 12,
                   paddingHorizontal: 16, paddingVertical: 13,
                   borderBottomWidth: 1, borderBottomColor: C.line }}>
          <Text style={{ width: 28, textAlign: rtl ? "left" : "right", fontFamily: F.sansBold,
                         fontSize: fs(12), color: C.brand600 }}>{b.n}</Text>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={{ fontFamily: F.sansSemi, fontSize: fs(14.5), color: C.ink,
                           textAlign: rtl ? "right" : "left" }}>{b.name}</Text>
            <Text style={{ fontFamily: F.sans, fontSize: fs(12), color: C.muted,
                           textAlign: rtl ? "right" : "left" }}>
              {t("bukhari.n_hadith", "{n} hadith").replace("{n}", String(b.count))}</Text>
          </View>
          <Ionicons name={rtl ? "chevron-back" : "chevron-forward"} size={17} color={C.muted} />
        </Press>))} />
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
              <Text style={{ fontFamily: F.sansSemi, fontSize: fs(11), color: C.goldInk }}>
                {t("bukhari.hadith", "Ḥadīth")} {h.n}</Text>
            </View>
          </View>
          <Arabic size={20} center={false}>{h.ar}</Arabic>
        </View>)} />
  );
}
