/* The counters — ṭawāf, saʿī, tasbīḥ.
 * Copyright (c) 2026 Yameen Bux. All rights reserved. See LICENSE.md.
 *
 * THE FAILURE THIS EXISTS TO PREVENT is losing count, and everything on the
 * screen is shaped by it.
 *
 *   The count is written on every single press, not on a timer and not when
 *   the screen closes. A phone that dies at the fourth circuit comes back at
 *   the fourth circuit. This is the whole reason the counter is worth having
 *   over a hand.
 *
 *   The target is the dial, and the dial is nearly the width of the glass. A
 *   person is walking in a crowd, in iḥrām, not looking down. Anything that
 *   needs aim is wrong.
 *
 *   Undo is one press and silent. Reset asks first, because the only thing
 *   worse than losing count is a stray thumb destroying a count that was
 *   right.
 *
 *   Nothing here is a ruling. A counter counts; it does not tell anybody when
 *   a circuit began or whether it was valid, and it says so rather than
 *   implying otherwise by staying quiet.
 *
 * MISHKĀT, and this is the screen the palette was chosen for: the lamp sits
 * BEHIND the dial rather than at the top of the screen, so the numeral is lit
 * from under and the glow never crosses the digits. The mark at the foot is
 * off here — the dial is the whole composition and a logo under it crowds.
 *
 * THE SCREEN WILL STILL SLEEP. expo-keep-awake is not a dependency of this
 * app and adding one is not this screen's call to make, so a phone left alone
 * mid-ṭawāf dims as usual. Worth fixing, and noted rather than hidden.
 *
 * The arithmetic is all in hajj.js so that it can be tested under plain Node:
 * seven circuits and no eighth, and which hill the next saʿī lap leaves from.
 */
import React, { useState, useEffect, useCallback, useRef } from "react";
import { View, Text, Alert, useWindowDimensions } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import Svg, { Circle, Path, Defs, LinearGradient, Stop } from "react-native-svg";
import Ionicons from "@expo/vector-icons/Ionicons";
import { F, R, HJ } from "../theme";
import { useApp } from "../store";
import { HajjScreen, Panel } from "../hajj-ui";
import { COUNTER_MODES, COUNTERS, tick, untick, isComplete, saiFrom, progress } from "../hajj";

/* Its own key rather than a field on prefs: this is written on every press,
   and prefs writes the whole settings blob each time. */
const KEY = "taiyabah.hajj.counts";
const EMPTY = { tawaf: 0, sai: 0, tasbih: 0 };

const STROKE = 12;

/* Drawn rather than taken from Ionicons: arrow-undo-outline is not in the
   app's 33KB subset, and regenerating that font for one glyph is a bigger
   risk than one path. It is the website's own undo arrow, so the two
   platforms draw the same mark. */
function Undo({ color }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={color}
         strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M9 14 4 9l5-5" />
      <Path d="M4 9h10a6 6 0 0 1 0 12h-3" />
    </Svg>
  );
}

/* The dial. The arc is the glance: a thumb's width of gold per circuit, so
   four of seven is legible without reading the numeral at all. */
function Ring({ size, fraction }) {
  const r = (size - STROKE) / 2;
  const c = 2 * Math.PI * r;
  return (
    <Svg width={size} height={size} style={{ position: "absolute" }}>
      <Defs>
        <LinearGradient id="hjDial" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#DCBB63" />
          <Stop offset="1" stopColor="#C6A24C" />
        </LinearGradient>
      </Defs>
      {/* the glass of the dial, then the unfilled track, then the arc */}
      <Circle cx={size / 2} cy={size / 2} r={r} fill={HJ.panel} stroke={HJ.panelLine} strokeWidth={1} />
      <Circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={HJ.panelLine} strokeWidth={STROKE} />
      <Circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="url(#hjDial)" strokeWidth={STROKE}
              strokeDasharray={`${c} ${c}`} strokeDashoffset={c * (1 - fraction)}
              strokeLinecap="round" rotation="-90" origin={`${size / 2}, ${size / 2}`} />
    </Svg>
  );
}

export default function HajjCounter() {
  const { t, fs, rtl } = useApp();
  const { width } = useWindowDimensions();
  /* As wide as the glass allows and no wider: 268 on a 390pt phone, smaller
     on an SE, and capped so it does not become a dinner plate on a tablet. */
  const dial = Math.max(196, Math.min(276, width - 84));

  const [mode, setMode] = useState("tawaf");
  const [counts, setCounts] = useState(EMPTY);
  const [ready, setReady] = useState(false);
  /* The latest counts, for the writer — so a fast double press cannot write
     a value it read before the previous press landed. */
  const latest = useRef(EMPTY);

  useEffect(() => {
    let alive = true;
    AsyncStorage.getItem(KEY)
      .then(raw => { if (!alive) return;
        const v = { ...EMPTY, ...(raw ? JSON.parse(raw) : null) };
        latest.current = v; setCounts(v); setReady(true); })
      /* A corrupt or missing store starts at zero rather than bricking the
         screen — but it must not silently pretend a saved count was zero, so
         nothing is written back until the person presses. */
      .catch(() => { if (alive) setReady(true); });
    return () => { alive = false; };
  }, []);

  const write = useCallback(next => {
    latest.current = next;
    setCounts(next);
    AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {});
  }, []);

  const n = counts[mode];
  const total = COUNTERS[mode].total;
  const done = isComplete(mode, n);

  const press = () => {
    if (done) return;
    const next = tick(mode, latest.current[mode]);
    write({ ...latest.current, [mode]: next });
    isComplete(mode, next)
      ? Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {})
      : Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
  };

  const back = () => {
    const next = untick(mode, latest.current[mode]);
    if (next === latest.current[mode]) return;
    write({ ...latest.current, [mode]: next });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  };

  /* Asks first, always. A reset cannot be undone and the thing it destroys
     cannot be reconstructed from anywhere. */
  const reset = () => {
    if (latest.current[mode] === 0) return;
    Alert.alert(
      t("hajj.start_again_q", "Start again?"),
      t("hajj.reset_warning", "The count goes back to zero. There is no way to get it back."),
      [{ text: t("hajj.not_now", "Not now"), style: "cancel" },
       { text: t("hajj.start_again_short", "Start again"), style: "destructive",
         onPress: () => write({ ...latest.current, [mode]: 0 }) }]);
  };

  /* Under the numeral: what the next press means, which for saʿī is which
     hill it leaves from and for the rest is how far there is to go. */
  const from = saiFrom(n);
  const under = mode === "sai" && from !== null
    ? (from === 0 ? t("hajj.next_from_safa", "Next lap leaves from Ṣafā")
                  : t("hajj.next_from_marwa", "Next lap leaves from Marwa"))
    : done ? t("hajj.all_seven_complete", "All seven complete")
    : total ? t("hajj.of_total", "of {n}").replace("{n}", String(total))
    : t("hajj.keep_going", "Keep going");

  const foot = { flex: 1, flexDirection: rtl ? "row-reverse" : "row", gap: 8,
                 alignItems: "center", justifyContent: "center", paddingVertical: 14,
                 borderRadius: 14, borderWidth: 1 };

  return (
    /* The lamp sits where the dial sits, not at the top of the screen. */
    <HajjScreen top={16} foot={false} lamp="38%">
      {/* Which counter. Three, so they fit a row without becoming a menu. */}
      <View style={{ flexDirection: rtl ? "row-reverse" : "row", gap: 7 }}>
        {COUNTER_MODES.map(m => {
          const on = m === mode;
          return (
            <Panel key={m} tone={on ? "gold" : "plain"} onPress={() => setMode(m)}
                   accessibilityRole="tab" accessibilityState={{ selected: on }}
                   style={{ flex: 1, paddingVertical: 11, paddingHorizontal: 4,
                            borderRadius: R.pill, alignItems: "center" }}>
              <Text style={{ fontFamily: F.sansBold, fontSize: fs(11.5), letterSpacing: 0.9,
                             textTransform: "uppercase", color: on ? HJ.gold : HJ.inkFaint }}>
                {t(`hajj.mode_${m}`, m === "tawaf" ? "Ṭawāf" : m === "sai" ? "Saʿī" : "Tasbīḥ")}
              </Text>
            </Panel>
          );
        })}
      </View>

      {/* The target. The dial IS the button — no card around it, because a
          card would only draw a second edge inside the first. */}
      <View style={{ alignItems: "center", marginTop: 34 }}>
        <Panel onPress={press} disabled={done || !ready}
               accessibilityLabel={t("hajj.count_one_more", "Count one more")}
               accessibilityValue={{ now: n, min: 0, max: total || undefined }}
               style={{ width: dial, height: dial, borderRadius: dial / 2, borderWidth: 0,
                        backgroundColor: "transparent", padding: 0,
                        alignItems: "center", justifyContent: "center" }}>
          <Ring size={dial} fraction={progress(mode, n)} />
          <Text style={{ fontFamily: F.display, fontSize: fs(Math.round(dial * 0.38)),
                         lineHeight: fs(Math.round(dial * 0.42)), color: HJ.ink }}>{n}</Text>
          <Text style={{ fontFamily: F.sansBold, fontSize: fs(11), letterSpacing: 2.2,
                         textTransform: "uppercase", color: HJ.gold, marginTop: 6,
                         textAlign: "center", paddingHorizontal: 24 }}>{under}</Text>
        </Panel>
      </View>

      <Text style={{ fontFamily: F.sans, fontSize: fs(13), lineHeight: fs(20), color: HJ.inkSoft,
                     marginTop: 28, textAlign: "center", paddingHorizontal: 30 }}>
        {t("hajj.tap_the_dial", "Tap the dial. The count is kept even if the phone dies.")}
      </Text>

      <View style={{ flexDirection: rtl ? "row-reverse" : "row", gap: 10, marginTop: 22 }}>
        <Panel onPress={back} disabled={n === 0}
               style={[foot, { backgroundColor: HJ.panel, borderColor: HJ.panelLine }]}>
          <Undo color={HJ.ink} />
          <Text style={{ fontFamily: F.sansSemi, fontSize: fs(13.5), color: HJ.ink }}>
            {t("hajj.undo_one", "Undo one")}
          </Text>
        </Panel>
        {/* Start again is the only destructive thing in the section, and the
            only place the warn tone appears outside a dam ruling. */}
        <Panel onPress={reset} disabled={n === 0} tone="warn" style={foot}>
          <Ionicons name="refresh-outline" size={16} color={HJ.warn} />
          <Text style={{ fontFamily: F.sansSemi, fontSize: fs(13.5), color: HJ.warn }}>
            {t("hajj.start_again_short", "Start again")}
          </Text>
        </Panel>
      </View>

      <Text style={{ fontFamily: F.sans, fontSize: fs(12), lineHeight: fs(18.5),
                     color: HJ.inkFaint, marginTop: 22, textAlign: "center" }}>
        {t("hajj.counter_is_not_a_ruling",
           "This counts, and nothing more. It cannot tell you whether a circuit was valid, and the count is kept on this phone only.")}
      </Text>
    </HajjScreen>
  );
}
