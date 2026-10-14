/**
 * Taiyabah Masjid — the reminders do not quietly run out.
 * Copyright (c) 2026 Yameen Bux. All rights reserved. See LICENSE.md.
 *
 * WHAT WAS WRONG. reminders.js says, at the top of the file, that "a rolling
 * week is armed each time the app opens". Nothing armed it when the app
 * opened. arm() had exactly two callers: the first-run card, once, when
 * somebody says yes; and the Notifications screen, while it is on screen.
 *
 * So the jamāʿah reminders lasted seven days from the moment they were
 * switched on. After that they stopped — no error, no empty state, nothing to
 * notice. Somebody who set them up in Ramadan and did not go back into the
 * settings would simply find that the phone had stopped telling them, and the
 * likeliest reading of that is that the app is broken or that they turned it
 * off themselves. For an app whose whole purpose is to say "jamāʿah is in ten
 * minutes", that is the worst failure it has.
 *
 * So: on launch, and whenever the app comes back to the foreground, the week
 * is armed again.
 *
 * IT MUST NEVER ASK FOR PERMISSION. arm() calls ask(), and ask() raises the
 * system dialog when permission has not been decided. Raising it from a
 * launch effect would throw the dialog over the splash screen before the app
 * has said what it is for — which is precisely what FirstRun.jsx exists to
 * avoid, and the dialog can only be raised once. So permission is READ here
 * and never requested: no permission, no arming, no dialog.
 *
 * AND IT MUST NOT THRASH. Arming cancels every scheduled notification and
 * writes about three dozen back. Doing that each time somebody glances at the
 * app would be a lot of native calls for no gain, so the foreground path is
 * throttled. A change to the switches is not throttled — that has to take
 * effect at once.
 */
import { useEffect, useRef } from "react";
import { AppState } from "react-native";
import * as Notifications from "expo-notifications";
import { useApp } from "./store";
import { arm, plan } from "./reminders";

/* Six hours, against a window of seven days. Generous either way: a phone
 * opened once a week stays armed, and one opened forty times a day re-arms
 * four times. */
const THROTTLE_MS = 6 * 60 * 60 * 1000;

export default function KeepReminders() {
  const { alerts } = useApp();
  const lastArmed = useRef(0);

  useEffect(() => {
    let alive = true;

    const rearm = async force => {
      if (!alive) return;
      if (!force && Date.now() - lastArmed.current < THROTTLE_MS) return;
      /* READ, never request. See the header. */
      let granted = false;
      try {
        const p = await Notifications.getPermissionsAsync();
        granted = p.status === "granted";
      } catch { return; }
      if (!granted || !alive) return;
      const { per, extras } = plan(alerts);
      try { await arm(per, extras); lastArmed.current = Date.now(); } catch {}
    };

    /* Forced: the switches have just changed, or the app has just started. */
    rearm(true);

    const sub = AppState.addEventListener("change", s => { if (s === "active") rearm(false); });
    return () => { alive = false; try { sub.remove(); } catch {} };
  }, [alerts]);

  return null;
}
