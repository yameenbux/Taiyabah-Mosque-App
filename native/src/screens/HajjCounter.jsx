/* The counters — ṭawāf, saʿī, tasbīḥ.
 *
 * THE FAILURE THIS EXISTS TO PREVENT is losing count, and everything on the
 * screen is shaped by it.
 *
 *   The count is written on every single press, not on a timer and not when
 *   the screen closes. A phone that dies at the fourth circuit comes back at
 *   the fourth circuit. This is the whole reason the counter is worth having
 *   over a hand.
 *
 *   The target is the whole card, not a button inside it. A person is walking
 *   in a crowd, in iḥrām, not looking down. Anything that needs aim is wrong.
 *
 *   Undo is one press and silent. Reset asks first, because the only thing
 *   worse than losing count is a stray thumb destroying a count that was
 *   right.
 *
 *   Nothing here is a ruling. A counter counts; it does not tell anybody when
 *   a circuit began or whether it was valid, and it says so rather than
 *   implying otherwise by staying quiet.
 *
 * THE SCREEN WILL STILL SLEEP. expo-keep-awake is not a dependency of this
 * app and adding one is not this screen's call to make, so a phone left alone
 * mid-ṭawāf dims as usual. Worth fixing, and noted rather than hidden.
 *
 * The arithmetic is all in hajj.js so that it can be tested under plain Node:
 * seven circuits and no eighth, and which hill the next saʿī lap leaves from.
 */
import React, { useState, useEffect, useCallback, useRef } from "react";
import { View, Text, Alert } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import Svg, { Circle, Path } from "react-native-svg";
import Ionicons from "@expo/vector-icons/Ionicons";
import { C, F, R } from "../theme";
import { useApp } from "../store";
import { Screen, Press } from "../ui";
import { COUNTER_MODES, COUNTERS, tick, untick, isComplete, saiFrom, progress } from "../hajj";

/* Its own key rather than a field on prefs: this is written on every press,
   and prefs writes the whole settings blob each time. */
const KEY = "taiyabah.hajj.counts";
const EMPTY = { tawaf: 0, sai: 0, tasbih: 0 };

const RING = 132;          // outer diameter of the dial
const STROKE = 7;

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

function Ring({ fraction, done }) {
  const r = (RING - STROKE) / 2;
  const c = 2 * Math.PI * r;
  return (
    <Svg width={RING} height={RING} style={{ position: "absolute" }}>
      <Circle cx={RING / 2} cy={RING / 2} r={r} stroke={C.line} strokeWidth={STROKE} fill="none" />
      <Circle cx={RING / 2} cy={RING / 2} r={r}
              stroke={done ? C.onAir : C.brand600} strokeWidth={STROKE} fill="none"
              strokeDasharray={`${c} ${c}`} strokeDashoffset={c * (1 - fraction)}
              strokeLinecap="round" rotation="-90" origin={`${RING / 2}, ${RING / 2}`} />
    </Svg>
  );
}

export default function HajjCounter() {
  const { t, fs, rtl } = useApp();
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

  const from = saiFrom(n);
  const label = mode === "sai" && from !== null
    ? (from === 0 ? t("hajj.next_from_safa", "Next lap leaves from Ṣafā")
                  : t("hajj.next_from_marwa", "Next lap leaves from Marwa"))
    : done ? t("hajj.all_seven_complete", "All seven complete")
    : total ? t("hajj.of_total", "of {n}").replace("{n}", String(total))
    : t("hajj.keep_going", "Keep going");

  return (
    <Screen top={16}>
      {/* Which counter. Three, so they fit a row without becoming a menu. */}
      <View style={{ flexDirection: rtl ? "row-reverse" : "row", gap: 7 }}>
        {COUNTER_MODES.map(m => {
          const on = m === mode;
          return (
            <Press key={m} onPress={() => setMode(m)} dim={false}
                   style={{ flex: 1, paddingVertical: 10, borderRadius: R.pill, alignItems: "center",
                            backgroundColor: on ? C.pick : C.tintPlum }}>
              <Text style={{ fontFamily: F.sansBold, fontSize: fs(11.5), letterSpacing: 0.9,
                             textTransform: "uppercase", color: on ? C.pickInk : C.brand600 }}>
                {t(`hajj.mode_${m}`, m === "tawaf" ? "Ṭawāf" : m === "sai" ? "Saʿī" : "Tasbīḥ")}
              </Text>
            </Press>
          );
        })}
      </View>

      {/* The target. The whole card counts, because a thumb in a crowd cannot aim. */}
      <Press onPress={press} disabled={done || !ready} dim={false}
             accessibilityRole="button"
             accessibilityLabel={t("hajj.count_one_more", "Count one more")}
             accessibilityValue={{ now: n, min: 0, max: total || undefined }}
             style={{ marginTop: 16, backgroundColor: C.card, borderWidth: 1, borderColor: C.line,
                      borderRadius: R.card, paddingVertical: 34, alignItems: "center" }}>
        <View style={{ width: RING, height: RING, alignItems: "center", justifyContent: "center" }}>
          <Ring fraction={progress(mode, n)} done={done} />
          <Text style={{ fontFamily: F.display, fontSize: fs(54), lineHeight: fs(60),
                         color: done ? C.onAir : C.ink }}>{n}</Text>
        </View>
        <Text style={{ fontFamily: F.sansMedium, fontSize: fs(13.5), color: C.muted, marginTop: 14,
                       textAlign: "center", paddingHorizontal: 20 }}>{label}</Text>

        {/* Seven pips, for the glance that does not read. */}
        {!!total && (
          <View style={{ flexDirection: "row", gap: 7, marginTop: 16 }}>
            {Array.from({ length: total }, (_, i) => (
              <View key={i} style={{ width: 8, height: 8, borderRadius: R.pill,
                                     backgroundColor: i < n ? C.brand600 : C.line }} />
            ))}
          </View>
        )}
      </Press>

      <View style={{ flexDirection: rtl ? "row-reverse" : "row", gap: 10, marginTop: 12 }}>
        <Press onPress={back} disabled={n === 0} dim={false}
               style={{ flex: 1, flexDirection: rtl ? "row-reverse" : "row", gap: 7,
                        alignItems: "center", justifyContent: "center", paddingVertical: 13,
                        borderRadius: 13, borderWidth: 1, borderColor: C.line,
                        backgroundColor: C.card, opacity: n === 0 ? 0.45 : 1 }}>
          <Undo color={C.brand600} />
          <Text style={{ fontFamily: F.sansSemi, fontSize: fs(13.5), color: C.ink }}>
            {t("hajj.undo_one", "Undo one")}
          </Text>
        </Press>
        <Press onPress={reset} disabled={n === 0} dim={false}
               style={{ flex: 1, flexDirection: rtl ? "row-reverse" : "row", gap: 7,
                        alignItems: "center", justifyContent: "center", paddingVertical: 13,
                        borderRadius: 13, borderWidth: 1, borderColor: C.line,
                        backgroundColor: C.card, opacity: n === 0 ? 0.45 : 1 }}>
          <Ionicons name="refresh-outline" size={16} color={C.tintRoseInk} />
          <Text style={{ fontFamily: F.sansSemi, fontSize: fs(13.5), color: C.ink }}>
            {t("hajj.start_again_short", "Start again")}
          </Text>
        </Press>
      </View>

      <Text style={{ fontFamily: F.sans, fontSize: fs(12), lineHeight: fs(18.5), color: C.muted,
                     marginTop: 18, textAlign: "center" }}>
        {t("hajj.counter_is_not_a_ruling",
           "This counts, and nothing more. It cannot tell you whether a circuit was valid, and the count is kept on this phone only.")}
      </Text>
    </Screen>
  );
}
