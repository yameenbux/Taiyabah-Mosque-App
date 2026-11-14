/* The tasbīḥ counter in Daily Adhkār.
 * Copyright (c) 2026 Yameen Bux. All rights reserved. See LICENSE.md.
 *
 * THIS IS NOT THE HAJJ COUNTER, and the two are deliberately separate.
 *
 *   HajjCounter.jsx holds ṭawāf, saʿī and a tasbīḥ together under the Mishkāt
 *   palette, behind the Hajj & Umrah section, and its count belongs to a
 *   journey: somebody walking the maṭāf wants their circuits where their
 *   circuits are. This one belongs to the daily adhkār a person says at home
 *   after every prayer. Sharing one stored number between them would mean the
 *   ninety-third SubḥānAllāh said in a front room turned up in the middle of
 *   saʿī, which is nonsense in both directions. Different key, different
 *   screen, different palette.
 *
 * WHAT IT COUNTS, and the reason the first mode is the one it opens on:
 *
 *   After ṣalāh — the tasbīḥ proper. 33 SubḥānAllāh, 33 Alḥamdulillāh, 33
 *   Allāhu akbar, then the tahlīl once: a hundred, in four steps, and the
 *   dial shows WHICH step rather than only how far round. The words are not
 *   written here or in tasbih.js — they are sliced out of the dhikr already
 *   in the app, athkar.json's "After Every Ṣalāh" entry, which carries its
 *   own counts inline as ﴿٣٣﴾. All 142 supplications are published awaiting
 *   two ʿulamā signatures and are fingerprinted so an approved wording
 *   cannot drift; a counter holding its own second copy of four of them
 *   would sit outside that entirely. See the header of src/tasbih.js.
 *
 *   33, 100 and Free — for any other dhikr. No words shown, because the app
 *   would be putting a phrase in somebody's mouth it was never asked for.
 *
 *   Each mode keeps ITS OWN count. Somebody part-way through a hundred
 *   ṣalawāt does not lose it by glancing at the tasbīḥ, and the mode they
 *   were last in is where the screen opens.
 *
 * THE COUNT IS WRITTEN ON EVERY PRESS, not on a timer and not on close. A
 * phone that dies on the ninetieth comes back on the ninetieth, which is the
 * whole reason a counter beats keeping it in your head.
 *
 * The arithmetic is in src/tasbih.js so it can be tested under plain Node,
 * and scripts/test/tasbih.test.mjs asserts that every phrase this screen
 * shows appears verbatim in the reviewed dhikr.
 */
import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { View, Text, Alert, useWindowDimensions } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { activateKeepAwakeAsync, deactivateKeepAwake } from "expo-keep-awake";
import { useIsFocused } from "@react-navigation/native";
import Svg, { Circle, Path, Defs, LinearGradient, Stop } from "react-native-svg";
import { C, F, R } from "../theme";
import { useApp } from "../store";
import { Screen, Press } from "../ui";
import { sequence, at as stepAt } from "../tasbih";

/* The same key the web app writes, and the same shape — {mode, n:{…}} — so a
   person who counts on the website and then installs the app is not started
   from zero. They are separate stores on separate devices; this only means
   the two halves agree on what they are storing. */
const KEY = "taiyabah.athkar.tasbih";
/* Tagged, so releasing our hold cannot release one another screen is keeping
   for its own reasons. */
const AWAKE = "taiyabah.athkar.tasbih";

/* null = the four-step tasbīḥ, 0 = no total at all, a number = count to it. */
const MODES = [
  { m: "salah", target: null },
  { m: "33",    target: 33 },
  { m: "100",   target: 100 },
  { m: "free",  target: 0 },
];
const EMPTY = { salah: 0, 33: 0, 100: 0, free: 0 };

const STROKE = 11;

/* Drawn rather than taken from Ionicons: arrow-undo-outline is not in the
   app's subset font, and it is the same mark the website and the Hajj counter
   draw, so all three agree. */
function Undo({ color }) {
  return (
    <Svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke={color}
         strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M9 14 4 9l5-5" />
      <Path d="M4 9h10a6 6 0 0 1 0 12h-3" />
    </Svg>
  );
}

function Refresh({ color }) {
  return (
    <Svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke={color}
         strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M20.5 5.5v5h-5" />
      <Path d="M20 10.5A8 8 0 1 0 12 20a8 8 0 0 0 6.9-4" />
    </Svg>
  );
}

/* The dial.
 *
 * FOUR SEGMENTS, NOT ONE ARC, for the tasbīḥ — the same reasoning the ṭawāf
 * dial gives for seven. "Which one am I on" is a counting question, and
 * separate marks answer it without reading the numeral; the numeral then
 * carries the count inside the step. The other three modes have a single
 * total to be "of", so they keep the continuous arc.
 *
 * GAP IS 16°, NOT 6°. A round cap extends each end of a segment by half the
 * stroke width — a little over 3° at this radius — so a 6° gap was eaten
 * whole and four marks rendered as one continuous arc, which is the exact
 * thing segments were chosen instead of. Found on the web half first; the
 * geometry is identical here.
 */
function Ring({ size, steps, place, fraction }) {
  const r = (size - STROKE) / 2;
  const c = 2 * Math.PI * r;
  const mid = size / 2;
  const gold = (
    <Defs>
      <LinearGradient id="tbDial" x1="0" y1="0" x2="1" y2="1">
        <Stop offset="0" stopColor="#DCBB63" />
        <Stop offset="1" stopColor="#C6A24C" />
      </LinearGradient>
    </Defs>
  );

  if (!steps)
    return (
      <Svg width={size} height={size} style={{ position: "absolute" }}>
        {gold}
        <Circle cx={mid} cy={mid} r={r} fill={C.card} stroke={C.line} strokeWidth={1} />
        <Circle cx={mid} cy={mid} r={r} fill="none" stroke={C.line} strokeWidth={STROKE} />
        {fraction > 0 && (
          <Circle cx={mid} cy={mid} r={r} fill="none" stroke="url(#tbDial)" strokeWidth={STROKE}
                  strokeDasharray={`${c} ${c}`} strokeDashoffset={c * (1 - fraction)}
                  strokeLinecap="round" rotation="-90" origin={`${mid}, ${mid}`} />)}
      </Svg>
    );

  const GAP = 16;
  const step = 360 / steps.length;
  const arc = c * ((step - GAP) / 360);
  const lit = i => place.complete || i < place.i
                   || (i === place.i && place.into === place.step.count);
  return (
    <Svg width={size} height={size} style={{ position: "absolute" }}>
      {gold}
      <Circle cx={mid} cy={mid} r={r} fill={C.card} stroke={C.line} strokeWidth={1} />
      {steps.map((_, i) => (
        <Circle key={i} cx={mid} cy={mid} r={r} fill="none"
                stroke={lit(i) ? "url(#tbDial)" : C.line} strokeWidth={STROKE}
                strokeDasharray={`${arc} ${c - arc}`} strokeLinecap="round"
                rotation={-90 + i * step + GAP / 2} origin={`${mid}, ${mid}`} />
      ))}
    </Svg>
  );
}

export default function Tasbih() {
  const { t, fs, rtl } = useApp();
  const { width } = useWindowDimensions();
  /* As wide as the glass allows and no wider, and capped so it does not
     become a dinner plate on a tablet. */
  const dial = Math.max(176, Math.min(248, width - 104));

  const focused = useIsFocused();
  const [mode, setMode] = useState("salah");
  const [counts, setCounts] = useState(EMPTY);
  const [ready, setReady] = useState(false);
  /* The latest counts, for the writer — so a fast double press cannot write a
     value it read before the previous press landed. */
  const latest = useRef(EMPTY);

  /* Derived once. tasbih.js THROWS rather than degrade if the dhikr it slices
     is no longer there, which is right for a build-time check — the unit test
     in the gate is what holds it — but a throw here would white-screen
     somebody mid-dhikr. So the screen catches it and falls back to counting
     without words, which is the one honest thing left to do: better a counter
     with no phrase than a blank screen, and never a retyped phrase. */
  const steps = useMemo(() => { try { return sequence(); } catch { return null; } }, []);
  const whole = steps ? steps.reduce((a, s) => a + s.count, 0) : 0;

  useEffect(() => {
    let alive = true;
    AsyncStorage.getItem(KEY)
      .then(raw => {
        if (!alive) return;
        const r = raw ? JSON.parse(raw) : null;
        const v = { ...EMPTY, ...(r && r.n ? r.n : null) };
        latest.current = v;
        setCounts(v);
        if (r && r.mode && MODES.some(x => x.m === r.mode)) setMode(r.mode);
        setReady(true);
      })
      /* A corrupt or missing store starts at zero rather than bricking the
         screen — but must not silently pretend a saved count was zero, so
         nothing is written back until the person presses. */
      .catch(() => { if (alive) setReady(true); });
    return () => { alive = false; };
  }, []);

  /* A hundred presses is several minutes with the phone in a hand and no
     taps between some of them, which is exactly when a screen dims. Tied to
     FOCUS, not to mounting: react-navigation keeps a pushed screen mounted
     underneath whatever is on top of it, so a plain useKeepAwake() here would
     hold the display on while somebody read a duʿā two screens away. Every
     call is guarded — a device that refuses the request must still count. */
  useEffect(() => {
    if (!focused) return undefined;
    activateKeepAwakeAsync(AWAKE).catch(() => {});
    return () => { try { deactivateKeepAwake(AWAKE)?.catch?.(() => {}); } catch {} };
  }, [focused]);

  const write = useCallback((next, nextMode) => {
    latest.current = next;
    setCounts(next);
    AsyncStorage.setItem(KEY, JSON.stringify({ mode: nextMode, n: next })).catch(() => {});
  }, []);

  const pick = m => {
    setMode(m);
    AsyncStorage.setItem(KEY, JSON.stringify({ mode: m, n: latest.current })).catch(() => {});
  };

  const n = counts[mode] || 0;
  const target = MODES.find(x => x.m === mode).target;
  const four = mode === "salah" && !!steps;
  const place = four ? stepAt(n, steps) : null;

  /* The tasbīḥ stops at a hundred: it is a fixed dhikr, not an open count,
     and Free is there for anybody who wants to keep going. */
  const cap = four ? whole : (target || Infinity);
  const done = four ? place.complete : (target ? n >= target : false);

  const press = () => {
    if (!ready || n >= cap) return;
    const next = { ...latest.current, [mode]: n + 1 };
    write(next, mode);
    const p = four ? stepAt(n + 1, steps) : null;
    /* A different buzz at the end of a step, so somebody counting with the
       phone in a pocket-warm hand and their eyes closed knows they have
       reached the thirty-third without looking. */
    const edge = four ? (p.complete || p.into === p.step.count)
                      : (target ? n + 1 >= target : (n + 1) % 100 === 0);
    (edge ? Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
          : Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)).catch(() => {});
  };

  const back = () => {
    if (n === 0) return;
    write({ ...latest.current, [mode]: n - 1 }, mode);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  };

  /* Asks first, always. A reset cannot be undone and what it destroys cannot
     be reconstructed from anywhere. */
  const reset = () => {
    if (n === 0) return;
    Alert.alert(
      t("tasbih.start_again_q", "Start again?"),
      t("tasbih.reset_warning", "The count goes back to zero. There is no way to get it back."),
      [{ text: t("tasbih.not_now", "Not now"), style: "cancel" },
       { text: t("tasbih.reset", "Reset"), style: "destructive",
         onPress: () => write({ ...latest.current, [mode]: 0 }, mode) }]);
  };

  /* Inside a step the numeral counts 1…33 rather than 1…100, because that is
     the number being said. Landing exactly ON 33 keeps 33 on the glass: see
     at() in tasbih.js for why the label does not move on first. */
  const shown = four ? (place.into === 0 && place.done > 0 ? place.step.count : place.into) : n;
  const under = four
    ? (place.complete ? t("tasbih.all_hundred", "All one hundred")
                      : t("tasbih.of_n", "of {n}").replace("{n}", String(place.step.count)))
    : target ? (done ? t("tasbih.complete", "Complete")
                     : t("tasbih.of_n", "of {n}").replace("{n}", String(target)))
    : t("tasbih.keep_going", "Keep going");

  const fraction = four ? 0 : (target ? Math.min(n / target, 1) : (n % 100) / 100);

  const tool = { flexDirection: rtl ? "row-reverse" : "row", gap: 7, alignItems: "center",
                 justifyContent: "center", paddingVertical: 10, paddingHorizontal: 22,
                 borderRadius: R.pill, borderWidth: 1, borderColor: C.line,
                 backgroundColor: C.card };

  return (
    /* top={16}: the modes sit directly under the pushed header, and without it
       the first row of the screen is flush against it. */
    <Screen top={16}>
      {/* Which dhikr. Four, so they fit one row without becoming a menu. */}
      <View style={{ flexDirection: rtl ? "row-reverse" : "row", gap: 6, marginBottom: 14 }}>
        {MODES.map(({ m }) => {
          const on = m === mode;
          return (
            <Press key={m} onPress={() => pick(m)} dim={false}
                   accessibilityRole="tab" accessibilityState={{ selected: on }}
                   style={{ flex: 1, paddingVertical: 9, paddingHorizontal: 4, borderRadius: 10,
                            borderWidth: 1, alignItems: "center",
                            borderColor: on ? C.brand600 : C.line,
                            backgroundColor: on ? C.brand600 : C.card }}>
              <Text numberOfLines={1} style={{ fontFamily: F.sansSemi, fontSize: fs(12),
                             color: on ? "#F3EFE3" : C.muted }}>
                {m === "salah" ? t("tasbih.after_salah", "After ṣalāh")
                 : m === "free" ? t("tasbih.free", "Free") : m}
              </Text>
            </Press>
          );
        })}
      </View>

      {/* The words, for the tasbīḥ only. The numeric modes show nothing here,
          because the app has not been told which dhikr is being counted and
          must not guess one. */}
      {four && (
        <View style={{ minHeight: 112, alignItems: "center", justifyContent: "center",
                       marginBottom: 6 }}>
          <Text style={{ fontFamily: F.quranic, fontSize: fs(26), lineHeight: fs(50),
                         color: C.ink, textAlign: "center", writingDirection: "rtl" }}>
            {place.step.ar}
          </Text>
          <Text style={{ fontFamily: F.sans, fontSize: fs(13), lineHeight: fs(20),
                         color: C.muted, textAlign: "center", marginTop: 6,
                         paddingHorizontal: 12 }}>
            {place.step.en}
          </Text>
        </View>
      )}

      {/* The target. The dial IS the button — no card around it, because a
          card would only draw a second edge inside the first. */}
      <View style={{ alignItems: "center", marginTop: four ? 6 : 24 }}>
        <Press onPress={press} disabled={!ready || n >= cap} dim={false}
               accessibilityLabel={t("tasbih.count_one_more", "Count one more")}
               accessibilityValue={{ now: shown, min: 0,
                                     max: four ? place.step.count : (target || undefined) }}
               style={{ width: dial, height: dial, borderRadius: dial / 2,
                        alignItems: "center", justifyContent: "center" }}>
          <Ring size={dial} steps={four ? steps : null} place={place} fraction={fraction} />
          <Text style={{ fontFamily: F.display, fontSize: fs(Math.round(dial * 0.3)),
                         lineHeight: fs(Math.round(dial * 0.34)),
                         color: done ? C.brand600 : C.ink }}>{shown}</Text>
          <Text style={{ fontFamily: F.sansBold, fontSize: fs(10.5), letterSpacing: 1.8,
                         textTransform: "uppercase", color: C.gold, marginTop: 5,
                         textAlign: "center", paddingHorizontal: 22 }}>{under}</Text>
        </Press>
      </View>

      <Text style={{ fontFamily: F.sans, fontSize: fs(12), lineHeight: fs(18),
                     color: C.muted, textAlign: "center", marginTop: 18 }}>
        {t("tasbih.tap_the_circle", "Tap the circle to count. It remembers where you were.")}
      </Text>

      <View style={{ flexDirection: rtl ? "row-reverse" : "row", gap: 10,
                     justifyContent: "center", marginTop: 14 }}>
        <Press onPress={back} disabled={n === 0} style={tool}>
          <Undo color={C.ink} />
          <Text style={{ fontFamily: F.sansSemi, fontSize: fs(13), color: C.ink }}>
            {t("tasbih.undo", "Undo")}
          </Text>
        </Press>
        <Press onPress={reset} disabled={n === 0} style={tool}>
          <Refresh color={C.ink} />
          <Text style={{ fontFamily: F.sansSemi, fontSize: fs(13), color: C.ink }}>
            {t("tasbih.reset", "Reset")}
          </Text>
        </Press>
      </View>
    </Screen>
  );
}
