/**
 * Taiyabah Masjid — putting the next jamāʿah in the Dynamic Island.
 * Copyright (c) 2026 Yameen Bux. All rights reserved. See LICENSE.md.
 *
 * WHY IT HANGS OFF THE APP OPENING. ActivityKit will only start an activity
 * while the app is in the foreground. Everything else about the thing is
 * free — the countdown and the ring are date ranges iOS redraws by itself,
 * with the app closed and nothing pushed to it, so there is no APNs
 * certificate, no OneSignal quota and no server. The price of that is this:
 * the island appears for people who have opened the app inside the window
 * between the adhān and the iqāmah, and not otherwise.
 *
 * That is a real limitation and it is the right trade. The thing that
 * actually tells people jamāʿah is coming is the reminder, which is a local
 * notification and fires whether the app has been opened or not. The island
 * is a courtesy on top of it, so it is allowed to be a courtesy that costs
 * nothing.
 *
 * IT FOLLOWS THE JAMĀʿAH REMINDER SWITCH. Somebody who has turned prayer
 * reminders off has said they do not want the app telling them about
 * jamāʿah; putting a countdown on their Lock Screen instead would be
 * answering a different question from the one they were asked. Turning the
 * switch off ends anything already running.
 *
 * IT NEVER ASKS FOR ANYTHING. There is no permission prompt for Live
 * Activities — there is a switch in Settings, which the native side reads.
 * If it is off, start() returns false and nothing here cares.
 */
import { useEffect, useRef } from "react";
import { AppState, Platform } from "react-native";
import { useApp } from "./store";
import { nextJamaah, nowLondon, londonInstant, isJumuah, NAMES, dayFor } from "./prayer";
import { activityPlan, nextAction } from "./activity-plan";
import { start, end, isAvailable } from "../modules/live-activity";

export default function KeepActivity() {
  const { alerts, t } = useApp();
  const running = useRef(null);

  useEffect(() => {
    if (Platform.OS !== "ios") return;
    let alive = true;

    const sync = async () => {
      if (!alive) return;

      /* The switch is off, or this phone cannot show one. Tidy up anything
         left over from before it was turned off, then stop. */
      if (!alerts?.jamaah || !isAvailable()) {
        if (running.current) { running.current = null; try { await end(); } catch {} }
        return;
      }

      const london = nowLondon();
      const next = nextJamaah(london);
      if (!next) { running.current = null; return; }

      /* Two clocks, the same as the reminders use. WHICH jamāʿah is a London
         question, because that is what the timetable is in. WHEN it is, is a
         real instant, because that is what a countdown counts to — and on a
         phone that has travelled those are not the same thing. */
      const day = new Date(london);
      if (next.tomorrow) day.setDate(day.getDate() + 1);
      const iqamahMs = londonInstant(day, next.at).getTime();
      const adhanMs = next.begins ? londonInstant(day, next.begins).getTime() : undefined;

      const name = isJumuah(next, london)
        ? t("giving.jumuah", "Jumuʿah")
        : t(`prayer.${next.key}`, NAMES[next.key].en);

      const plan = activityPlan({ ...next, name }, { now: Date.now(), iqamahMs, adhanMs });

      const action = nextAction(running.current, plan);

      /* NOTHING ELSE WILL EVER TAKE IT OFF THE SCREEN.
         iOS does not dismiss a Live Activity on a schedule — the island sat
         at 0:00 after the jamāʿah because this branch used to return without
         ending it, assuming iOS had. See nextAction in activity-plan.js. */
      if (action === "end") {
        running.current = null;
        try { await end(); } catch {}
        return;
      }
      if (action === "none") return;

      const ok = await start(plan);
      if (alive && ok) running.current = plan;
    };

    sync();
    const sub = AppState.addEventListener("change", s => { if (s === "active") sync(); });
    return () => { alive = false; try { sub.remove(); } catch {} };
  }, [alerts, t]);

  return null;
}
