/**
 * Taiyabah Masjid — the radio, held above the navigator so it survives it.
 * Copyright (c) 2026 Yameen Bux. All rights reserved. See LICENSE.md.
 *
 * The Live screen used to own the Audio.Sound itself, in a ref, and tidy it
 * away on unmount:
 *
 *     return () => { sound.current?.unloadAsync().catch(() => {}); };
 *
 * which is correct housekeeping for a screen and wrong for a radio. Leaving
 * Live unmounts it, so the bayaan stopped the moment anybody went to read
 * Qurʼan — while the note at the bottom of that same screen said, in three
 * languages, "Audio keeps playing while you use the rest of the app or other
 * apps." The copy was right and the code was not. A committee member found it
 * the obvious way: they tried to listen and read at once.
 *
 * So the sound moves up here, to a provider mounted above the whole navigator.
 * It is never unloaded on unmount because this never unmounts — it lives and
 * dies with the app, which is exactly the lifetime a stream wants. Live is now
 * one of several views onto it rather than its owner, and the On air bar is
 * another.
 *
 * PAUSE AND STOP ARE DIFFERENT THINGS HERE, deliberately.
 *
 *   pause() keeps the loaded sound, because that is the play/pause button on
 *   the Live screen and somebody tapping it twice expects to be back where
 *   they were, quickly.
 *
 *   stop() unloads. It is what the On air bar's square does, and what somebody
 *   means when they stop a broadcast from three screens away: finished, not
 *   held. It also means the next play reconnects rather than resuming from a
 *   buffer that has since gone stale — on a LIVE stream a resumed buffer is
 *   the wrong audio, played late.
 *
 * Both land on "idle", so nothing downstream has to know which happened.
 */
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { Audio } from "expo-av";

export const LIVE_URL = "https://taiyabahmbolton.radioca.st/;";

const Ctx = createContext(null);

export function LiveAudioProvider({ children }) {
  const sound = useRef(null);
  /* idle | loading | playing | error — the same four Live has always had, so
     its chip and its button needed no new states to read. */
  const [state, setState] = useState("idle");
  const [vol, setVol] = useState(1);
  /* The level the slider is at, readable from a callback without making
     play() depend on it — a stale `vol` in a useCallback closure is how the
     stream would open at last week's volume. */
  const level = useRef(1);

  useEffect(() => {
    /* Keep playing when the screen locks or the app goes to the background —
       the setting that makes this feel like a radio rather than a web page.
       Set once for the app rather than once per visit to the Live screen. */
    Audio.setAudioModeAsync({ staysActiveInBackground: true, playsInSilentModeIOS: true,
                              shouldDuckAndroid: true }).catch(() => {});
    /* No cleanup. Unloading here would be the original bug with a longer
       reach: this unmounts only when the app is going away, and the OS
       reclaims the player then regardless. */
  }, []);

  const setVolume = useCallback(v => {
    const clamped = Math.max(0, Math.min(1, v));
    level.current = clamped;
    setVol(clamped);
    sound.current?.setVolumeAsync?.(clamped).catch(() => {});
  }, []);

  const play = useCallback(async () => {
    setState("loading");
    try {
      /* Already loaded — paused rather than stopped — so this is a resume. */
      if (sound.current) { await sound.current.playAsync(); setState("playing"); return; }
      /* Opened at whatever the slider is already set to, so a level chosen
         before pressing play is the level it plays at. */
      const { sound: s } = await Audio.Sound.createAsync({ uri: LIVE_URL },
                                                         { shouldPlay: true, volume: level.current });
      sound.current = s;
      s.setOnPlaybackStatusUpdate(st => {
        if (st.isPlaying) setState("playing");
        /* The masjid going off air, or the connection dropping mid-bayaan.
           Treated as idle rather than as an error: nothing is broken, there
           is simply nothing being broadcast, and the bar should go. */
        else if (st.didJustFinish) setState("idle");
      });
      setState("playing");
    } catch { setState("error"); }
  }, []);

  const pause = useCallback(async () => {
    await sound.current?.pauseAsync().catch(() => {});
    setState("idle");
  }, []);

  const stop = useCallback(async () => {
    const s = sound.current;
    /* Cleared BEFORE the await, so a second tap on a slow unload cannot find
       the same sound still sitting here and unload it twice. */
    sound.current = null;
    setState("idle");
    try { s?.setOnPlaybackStatusUpdate(null); } catch {}
    await s?.unloadAsync().catch(() => {});
  }, []);

  const toggle = useCallback(() => {
    if (state === "playing") return pause();
    return play();
  }, [state, pause, play]);

  return (
    <Ctx.Provider value={{ state, playing: state === "playing", vol, setVolume, play, pause, stop, toggle }}>
      {children}
    </Ctx.Provider>
  );
}

/**
 * The radio, from anywhere under the provider.
 *
 * Outside it this answers with a dead player rather than throwing, because the
 * one thing that must never take the app down is a bar in the corner. Screen
 * (src/ui.jsx) asks for this on every screen in the app to know whether to
 * leave room at the bottom, and a screen rendered in a test harness or a
 * storybook has no provider over it.
 */
const SILENT = { state: "idle", playing: false, vol: 1, setVolume() {}, play() {}, pause() {}, stop() {}, toggle() {} };
export function useLiveAudio() {
  return useContext(Ctx) || SILENT;
}
