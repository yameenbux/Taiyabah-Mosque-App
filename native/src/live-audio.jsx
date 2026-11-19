/**
 * Taiyabah Masjid — the radio, held above the navigator so it survives it.
 * Copyright (c) 2026 Yameen Bux. All rights reserved. See LICENSE.md.
 *
 * The Live screen used to own the sound itself and tidy it away on unmount,
 * which is right for a screen and wrong for a radio: leaving Live stopped the
 * bayaan the moment anybody went to read Qurʼan. So the sound lives up here, in
 * a provider mounted above the whole navigator, which never unmounts until the
 * app does — the lifetime a stream wants. Live is one view onto it; the On air
 * bar is another.
 *
 * NOW ON expo-audio, not expo-av. The move earns the thing a radio in the
 * background most needs and expo-av could not give: controls on the lock screen
 * and in the notification shade, so a bayaan can be paused without reopening the
 * app and hunting for the screen it started from. setActiveForLockScreen() is
 * what puts them there; it needs the exclusive 'doNotMix' audio focus set below,
 * which is also right for a broadcast — you do not want other audio mixed under
 * it. A live stream carries no seek buttons: it is not a thing you scrub.
 *
 * PAUSE AND STOP ARE DIFFERENT THINGS HERE, deliberately.
 *
 *   pause() keeps the player and the lock-screen controls, because that is the
 *   play/pause on the Live screen AND on the lock screen, and somebody tapping
 *   it expects to be back where they were.
 *
 *   stop() tears the player down and clears the lock screen. It is what the On
 *   air bar's square does: finished, not held. It also means the next play
 *   reconnects rather than resuming a buffer that has gone stale — on a LIVE
 *   stream a resumed buffer is the wrong audio, played late.
 */
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { createAudioPlayer, setAudioModeAsync } from "expo-audio";
import { claimAudio, releaseAudio } from "./audio-bus";
import { breadcrumb } from "./diagnostics";

export const LIVE_URL = "https://taiyabahmbolton.radioca.st/;";

const Ctx = createContext(null);

/* What the lock screen and notification show while the stream plays. English,
   because this provider sits above the language store — "Taiyabah Masjid" reads
   the same in every language, and the lock screen is chrome, not content. */
const LIVE_META = { title: "Taiyabah Masjid", artist: "Live broadcast" };

export function LiveAudioProvider({ children }) {
  const player = useRef(null);
  const sub = useRef(null);
  /* idle | loading | playing | error — the same four Live has always had. */
  const [state, setState] = useState("idle");
  const [vol, setVol] = useState(1);
  const level = useRef(1);

  useEffect(() => {
    /* Set once for the app: play in silent mode, keep going in the background,
       and take exclusive audio focus — the last is what the lock-screen and
       notification controls need ('doNotMix'). The recordings provider mounted
       below inherits this mode. */
    setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: true, interruptionMode: "doNotMix" })
      .catch(() => {});
  }, []);

  /* Drop the player and its lock-screen controls. Pulled out so stop() and a
     fresh play() share one teardown and neither can leave a listener behind. */
  const teardown = useCallback(() => {
    try { sub.current?.remove?.(); } catch {}
    sub.current = null;
    const p = player.current;
    player.current = null;
    /* Pause before releasing: expo-audio's remove() frees the JS handle but
       does not reliably stop a player mid-playback, so the square on the bar
       must pause first or the stream carries on after it. */
    try { p?.pause?.(); } catch {}
    try { p?.clearLockScreenControls?.(); } catch {}
    try { p?.remove?.(); } catch {}
  }, []);

  const setVolume = useCallback(v => {
    const clamped = Math.max(0, Math.min(1, v));
    level.current = clamped;
    setVol(clamped);
    try { if (player.current) player.current.volume = clamped; } catch {}
  }, []);

  const stop = useCallback(async () => {
    releaseAudio(stop);
    setState("idle");
    teardown();
  }, [teardown]);

  const play = useCallback(async () => {
    setState("loading");
    /* Take the phone's one audio output before opening the stream — this stops a
       recording that was playing, through src/audio-bus.js, without this file
       knowing a recordings player exists. */
    claimAudio(stop);
    try {
      /* Already loaded — paused rather than torn down — so this is a resume. */
      if (player.current) { player.current.play(); setState("playing"); return; }
      const p = createAudioPlayer({ uri: LIVE_URL }, { updateInterval: 500, keepAudioSessionActive: true });
      player.current = p;
      try { p.volume = level.current; } catch {}
      sub.current = p.addListener("playbackStatusUpdate", st => {
        if (!st) return;
        /* The masjid going off air, or the connection dropping mid-bayaan.
           Idle rather than an error: nothing is broken, there is simply nothing
           being broadcast, and the bar should go. */
        if (st.didJustFinish) { setState("idle"); return; }
        if (st.playing) { setState("playing"); return; }
        /* Loaded but not playing is a pause — including a pause pressed on the
           lock screen while the app is in the background. Keep the app in step
           with it so the bar and the Live button are not left saying "playing". */
        if (st.isLoaded) setState(s => (s === "loading" ? "loading" : "idle"));
      });
      p.play();
      try { p.setActiveForLockScreen(true, LIVE_META, { showSeekForward: false, showSeekBackward: false }); } catch {}
      breadcrumb("live: play");
      setState("playing");
    } catch {
      setState("error");
      breadcrumb("live: play failed");
    }
  }, [stop]);

  const pause = useCallback(async () => {
    /* Keep the player and the lock-screen controls so it can be resumed from
       either; only stop() tears them down. */
    try { player.current?.pause(); } catch {}
    setState("idle");
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
 * The radio, from anywhere under the provider. Outside it this answers with a
 * dead player rather than throwing — the one thing that must never take the app
 * down is a bar in the corner, and a screen in a test harness has no provider.
 */
const SILENT = { state: "idle", playing: false, vol: 1, setVolume() {}, play() {}, pause() {}, stop() {}, toggle() {} };
export function useLiveAudio() {
  return useContext(Ctx) || SILENT;
}
