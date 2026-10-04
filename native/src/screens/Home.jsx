import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { C, F, fs, R } from "../theme";
import { dayFor, nextJamaah, countdown, pretty, NAMES, ORDER } from "../prayer";

/* The home screen. One job above all others: tell somebody when the next
 * jamāʿah is, before they have to look for it. Everything else on this screen
 * is secondary to that number. */
export default function Home() {
  const top = useSafeAreaInsets().top;
  const [now, setNow] = useState(new Date());

  /* Tick on the minute rather than the second: the only thing that changes is
   * the countdown, and a per-second timer is a battery cost for nothing. */
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(id);
  }, []);

  const day = dayFor(now);
  const next = nextJamaah(now);
  if (!day || !next) return null;

  /* How far through the gap between this jamāʿah and the last one we are —
   * the thin gold line under the countdown. */
  /* How far through the wait we are. Measured from when this prayer BEGAN,
   * not from an arbitrary window — the bar then means something: how much of
   * the gap between adhān and jamāʿah is gone. */
  const gap = (() => {
    const [bh, bm] = next.begins.split(":").map(Number);
    const [jh, jm] = next.at.split(":").map(Number);
    const total = (jh * 60 + jm) - (bh * 60 + bm);
    return total > 0 ? Math.max(0, Math.min(1, 1 - next.minutesAway / total)) : 0;
  })();

  return (
    <ScrollView style={{ backgroundColor: C.paper }} contentContainerStyle={{ paddingBottom: 24 }}>
      <View style={{ backgroundColor: C.brand900, paddingTop: top + 12, paddingHorizontal: 18, paddingBottom: 24 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <View>
            <Text style={{ fontFamily: F.sansMedium, fontSize: fs(10), letterSpacing: 1.7, color: C.cream }}>
              BOLTON CENTRAL
            </Text>
            <Text style={{ fontFamily: F.sansMedium, fontSize: fs(10), letterSpacing: 1.7, color: C.cream }}>
              ISLAMIC SOCIETY
            </Text>
          </View>
          <Pressable
            style={{ width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: "rgba(243,239,227,.25)",
                     alignItems: "center", justifyContent: "center" }}>
            <Ionicons name="notifications-outline" size={19} color={C.goldBright} />
          </Pressable>
        </View>

        <Text style={{ fontFamily: F.sans, fontSize: fs(21), color: C.goldBright, marginTop: 20, textAlign: "left", writingDirection: "ltr" }}>
          السَّلَامُ عَلَيْكُم
        </Text>

        <View style={{ alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 7,
                       borderWidth: 1, borderColor: "rgba(243,239,227,.18)", borderRadius: R.pill,
                       paddingHorizontal: 12, paddingVertical: 6, marginTop: 14 }}>
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: C.goldBright }} />
          <Text style={{ fontFamily: F.sans, fontSize: fs(12), color: "#D0BFCA" }}>
            {now.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })} · {day.hijri}
          </Text>
        </View>

        <Text style={{ fontFamily: F.sansMedium, fontSize: fs(11), letterSpacing: 1.5, color: C.goldBright, marginTop: 22 }}>
          NEXT JAMĀʿAH
        </Text>
        <View style={{ flexDirection: "row", alignItems: "baseline", gap: 10, marginTop: 2 }}>
          <Text style={{ fontFamily: F.display, fontSize: fs(29), color: C.cream }}>{NAMES[next.key].en}</Text>
          <Text style={{ fontFamily: F.sans, fontSize: fs(22), color: C.cream }}>{NAMES[next.key].ar}</Text>
        </View>
        <Text style={{ fontFamily: F.sansMedium, fontSize: fs(50), color: "#fff", marginTop: 2 }}>
          {pretty(next.at)}
        </Text>

        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginTop: 10 }}>
          <View style={{ borderWidth: 1, borderColor: "rgba(220,187,99,.45)", borderRadius: R.pill,
                         paddingHorizontal: 13, paddingVertical: 6 }}>
            <Text style={{ fontFamily: F.sansMedium, fontSize: fs(13), color: C.goldBright }}>
              {countdown(next.minutesAway)}
            </Text>
          </View>
          <Text style={{ fontFamily: F.sans, fontSize: fs(13), color: "#D0BFCA" }}>
            Beginning time <Text style={{ fontFamily: F.sansMedium, color: "#fff" }}>{pretty(next.begins)}</Text>
            {next.tomorrow ? " · tomorrow" : ""}
          </Text>
        </View>

        <View style={{ height: 4, borderRadius: 2, backgroundColor: "rgba(255,255,255,.14)", marginTop: 16 }}>
          <View style={{ height: 4, borderRadius: 2, width: `${gap * 100}%`, backgroundColor: C.goldBright }} />
        </View>
      </View>

      <View style={{ paddingHorizontal: 16, paddingTop: 18 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <Text style={{ fontFamily: F.display, fontSize: fs(19), color: C.ink }}>Today</Text>
          <View style={{ flex: 1, height: 1, backgroundColor: C.line }} />
          <Text style={{ fontFamily: F.sans, fontSize: fs(12), color: C.muted }}>Beginning &amp; jamāʿah</Text>
        </View>

        <View style={{ flexDirection: "row", backgroundColor: C.card, borderRadius: R.card, borderWidth: 1,
                       borderColor: C.line, marginTop: 12, overflow: "hidden" }}>
          {ORDER.map((k, i) => {
            const isNext = k === next.key && !next.tomorrow;
            return (
              <View key={k} style={{ flex: 1, alignItems: "center", paddingVertical: 13,
                                     borderLeftWidth: i ? 1 : 0, borderLeftColor: C.line,
                                     backgroundColor: isNext ? "rgba(198,162,76,.10)" : "transparent" }}>
                <Ionicons name={k === "isha" ? "moon-outline" : "sunny-outline"} size={15} color={C.gold} />
                <Text style={{ fontFamily: F.sans, fontSize: fs(11), color: C.muted, marginTop: 5 }}>{NAMES[k].en}</Text>
                <Text style={{ fontFamily: F.sansMedium, fontSize: fs(15), color: C.ink, marginTop: 3 }}>
                  {pretty(day.begins[k]).replace(/ (am|pm)$/, "")}
                </Text>
                <View style={{ backgroundColor: "rgba(119,33,87,.09)", borderRadius: R.pill,
                                paddingHorizontal: 7, paddingVertical: 2, marginTop: 5 }}>
                  <Text style={{ fontFamily: F.sansMedium, fontSize: fs(11), color: C.brand600 }}>
                    {pretty(day.jamaat[k]).replace(/ (am|pm)$/, "")}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      </View>
    </ScrollView>
  );
}
