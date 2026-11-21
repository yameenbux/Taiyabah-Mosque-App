/**
 * Taiyabah Masjid — the recordings player, held above the navigator like the radio.
 * Copyright (c) 2026 Yameen Bux. All rights reserved. See LICENSE.md.
 *
 * This is to the recordings archive what src/live-audio.jsx is to the stream:
 * the one place the sound lives, mounted above the whole navigator so a dars
 * keeps playing while somebody walks off to read Qurʼan — a recording is if
 * anything MORE of a sit-and-listen than the stream.
 *
 * HOW IT DIFFERS FROM THE STREAM. The stream is one endless thing; a recording
 * is a FILE with a start, an end and a place you are up to. So this carries
 * position and duration, it can seek, and it resumes where you left off.
 *
 * NOW ON expo-audio, not expo-av — the same move the stream made, for the same
 * prize: lock-screen and notification controls, so a dars can be paused or
 * scrubbed without reopening the app and finding the screen it began on, which
 * was the exact complaint. setActiveForLockScreen() puts them there, this time
 * WITH the ±15s seek buttons, because a recording is a thing you scrub. Times
 * come off expo-audio in seconds; this keeps its own public API in milliseconds
 * (positionMs/durationMs) so the bar and the player screen did not have to change.
 *
 * ONLY ONE SOUND AT A TIME. The stream and a recording must never play over each
 * other. Neither provider knows about the other; both go through
 * src/audio-bus.js: claim the output before you start, release it when you stop.
 */
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { createAudioPlayer } from "expo-audio";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { claimAudio, releaseAudio } from "./audio-bus";
import { breadcrumb } from "./diagnostics";

const Ctx = createContext(null);

/* Where we remember how far through each recording somebody got — keyed by the
   recording's own URL. A reopened dars resumes, and the browse screen shows a
   "Continue listening" row. A recording drops off that row once it is within
   20s of the end or past 97%, so one somebody finished does not sit there. */
const POS_KEY = "rec:positions";
const DONE_TAIL_MS = 20000;
const loadPositions = async () => {
  try { return JSON.parse(await AsyncStorage.getItem(POS_KEY)) || {}; } catch { return {}; }
};
const isUnfinished = e =>
  !!e && e.pos > 8000 && (!e.dur || (e.pos < e.dur - DONE_TAIL_MS && e.pos / e.dur < 0.97));

export function RecordingsAudioProvider({ children }) {
  const player = useRef(null);
  const sub = useRef(null);
  /* The recording that is loaded, in full, so the bar and the screen can name
     it. null when nothing is loaded. */
  const [current, setCurrent] = useState(null);
  /* idle (nothing loaded) | loading | playing | paused. */
  const [state, setState] = useState("idle");
  const [positionMs, setPositionMs] = useState(0);
  const [durationMs, setDurationMs] = useState(0);
  /* The live position and duration ALSO as refs. stop() and the status
     callback need the current spot to remember it, but if they close over the
     positionMs/durationMs STATE they are rebuilt on every tick — and that
     breaks src/audio-bus.js, which matches claim to release by function
     identity: a stop() that changes 500ms after it claimed the output can
     never release it, the [stop] effect below releases the slot every tick
     instead of on unmount, and a stale stop lingers to be invoked on the next
     play. Reading the refs keeps stop() ONE stable function for the app's life,
     which is exactly what the bus is built on. */
  const posRef = useRef(0);
  const durRef = useRef(0);
  const putPos = useCallback(v => { posRef.current = v; setPositionMs(v); }, []);
  const putDur = useCallback(v => { durRef.current = v; setDurationMs(v); }, []);
  /* The slug of what is loaded, read inside callbacks without making play()
     depend on `current` — a stale closure is how "resume" would resume the
     wrong file after you had picked another. */
  const loaded = useRef(null);
  const currentRef = useRef(null);
  /* The spot to jump to once the file reports itself loaded, in seconds. Applied
     from the status callback because seeking an unloaded player does nothing. */
  const pendingSeekSec = useRef(0);

  const positions = useRef({});
  const [continueList, setContinueList] = useState([]);
  const lastSaved = useRef(0);

  const pushContinue = useCallback(() => {
    setContinueList(Object.values(positions.current)
      .filter(isUnfinished)
      .sort((a, b) => (b.at || 0) - (a.at || 0))
      .slice(0, 12));
  }, []);
  const persist = useCallback(() => {
    AsyncStorage.setItem(POS_KEY, JSON.stringify(positions.current)).catch(() => {});
    pushContinue();
  }, [pushContinue]);
  const remember = useCallback((rec, posMs, durMs) => {
    if (!rec || !rec.mp3) return;
    positions.current[rec.mp3] = {
      title: rec.title, category: rec.category, date: rec.date, day: rec.day,
      time: rec.time, durationSec: rec.durationSec, mp3: rec.mp3,
      pos: Math.round(posMs || 0), dur: Math.round(durMs || 0), at: Date.now(),
    };
  }, []);
  const forget = useCallback(mp3 => { if (mp3) delete positions.current[mp3]; persist(); }, [persist]);

  useEffect(() => {
    let live = true;
    loadPositions().then(p => { if (live) { positions.current = p; pushContinue(); } });
    return () => { live = false; };
  }, [pushContinue]);

  /* Drop the player and its lock-screen controls, and detach the listener.
     Pulled out so stop() and a fresh play() share one teardown. */
  const teardown = useCallback(() => {
    try { sub.current?.remove?.(); } catch {}
    sub.current = null;
    const p = player.current;
    player.current = null;
    loaded.current = null;
    /* Pause BEFORE releasing. expo-audio's remove() frees the JS handle but
       does not reliably stop a player that is mid-playback, so without this
       the dars carries on after stop(), and starting a second recording
       plays it over the first instead of replacing it. Pausing first makes
       the release actually silence it. */
    try { p?.pause?.(); } catch {}
    try { p?.clearLockScreenControls?.(); } catch {}
    try { p?.remove?.(); } catch {}
  }, []);

  /* The stop the audio bus calls when the stream (or anything else) takes the
     output. Clears everything so the bar goes and nothing lingers loaded. */
  const stop = useCallback(async () => {
    releaseAudio(stop);
    /* Record the spot before letting go, so "stop" still leaves somewhere to
       continue from. From the refs, so this stays one stable function. */
    if (currentRef.current) { remember(currentRef.current, posRef.current, durRef.current); persist(); }
    currentRef.current = null;
    setState("idle");
    setCurrent(null);
    putPos(0);
    putDur(0);
    teardown();
  }, [teardown, remember, persist, putPos, putDur]);

  useEffect(() => {
    /* The audio mode (silent-mode, background, exclusive focus) is set once for
       the app by the live provider above this one, so a loaded recording
       inherits it. Nothing to set here; this provider lives as long as the app. */
    return () => { releaseAudio(stop); };
  }, [stop]);

  const onStatus = useCallback(st => {
    if (!st) return;
    if (st.didJustFinish) {
      /* Ended: keep it loaded at the start so the bar offers a replay rather
         than vanishing mid-thought, hand the output back so the stream is free,
         and drop it from "Continue listening". */
      setState("paused");
      putPos(0);
      try { player.current?.seekTo(0); } catch {}
      try { player.current?.pause(); } catch {}
      releaseAudio(stop);
      if (currentRef.current) forget(currentRef.current.mp3);
      return;
    }
    /* Resume: jump to the saved spot the first time the file reports loaded. */
    if (st.isLoaded && pendingSeekSec.current > 0) {
      const to = pendingSeekSec.current;
      pendingSeekSec.current = 0;
      try { player.current?.seekTo(to); } catch {}
    }
    if (typeof st.currentTime === "number") putPos(Math.round(st.currentTime * 1000));
    if (typeof st.duration === "number" && st.duration > 0) putDur(Math.round(st.duration * 1000));
    if (st.playing) setState("playing");
    else if (st.isLoaded) setState(s => (s === "loading" ? "loading" : "paused"));
    /* Remember the spot while playing, at most once every five seconds, so a
       backgrounded or killed app still knows where the listener was. */
    if (st.playing && currentRef.current && typeof st.currentTime === "number") {
      const now = Date.now();
      if (now - lastSaved.current > 5000) {
        lastSaved.current = now;
        remember(currentRef.current, st.currentTime * 1000, (st.duration || 0) * 1000);
        persist();
      }
    }
  }, [stop, forget, remember, persist, putPos, putDur]);

  /**
   * Play a recording. If it is the one already loaded, resume; otherwise tear
   * the old one down and open the new one. Either way the output is claimed
   * first, which stops the live stream.
   */
  const play = useCallback(async rec => {
    if (!rec || !rec.mp3) return;
    claimAudio(stop);

    if (loaded.current === rec.mp3 && player.current) {
      try { player.current.play(); setState("playing"); } catch { setState("error"); }
      return;
    }

    teardown();
    setCurrent(rec);
    currentRef.current = rec;
    setState("loading");
    /* Resume where they left off, if we remember and it is not basically done;
       otherwise from the top. */
    const saved = positions.current[rec.mp3];
    const fromMs = isUnfinished(saved) ? saved.pos : 0;
    putPos(fromMs);
    putDur(Number(rec.durationSec) > 0 ? rec.durationSec * 1000 : 0);
    pendingSeekSec.current = fromMs > 0 ? fromMs / 1000 : 0;
    try {
      const p = createAudioPlayer({ uri: rec.mp3 }, { updateInterval: 500, keepAudioSessionActive: true });
      player.current = p;
      loaded.current = rec.mp3;
      sub.current = p.addListener("playbackStatusUpdate", onStatus);
      p.play();
      /* Lock-screen controls, WITH the seek buttons a recording earns — the
         title names the dars so a glance at the lock screen says what is on. */
      try {
        p.setActiveForLockScreen(true,
          { title: rec.title || "Recording", artist: "Taiyabah Masjid" },
          { showSeekForward: true, showSeekBackward: true });
      } catch {}
      breadcrumb("recording: " + (rec.title || "?"));
      setState("playing");
    } catch {
      setState("error");
      releaseAudio(stop);
      breadcrumb("recording failed: " + (rec.title || "?"));
    }
  }, [onStatus, stop, teardown, putPos, putDur]);

  const pause = useCallback(async () => {
    try { player.current?.pause(); } catch {}
    setState("paused");
    /* Pausing is a deliberate "I'll come back" — save the spot at once. */
    if (currentRef.current) { remember(currentRef.current, posRef.current, durRef.current); persist(); }
  }, [remember, persist]);

  const toggle = useCallback(() => {
    if (state === "playing") return pause();
    if (current) return play(current);
  }, [state, current, pause, play]);

  /* Seek to an absolute millisecond, clamped to the file. The screen's scrubber
     hands a fraction; it multiplies by duration before calling this. */
  const seek = useCallback(async ms => {
    const d = durationMs || 0;
    const to = Math.max(0, d ? Math.min(ms, d) : ms);
    putPos(to);
    try { await player.current?.seekTo(to / 1000); } catch {}
  }, [durationMs, putPos]);

  /* Jump a number of seconds (negative to go back), for the ±15s buttons. */
  const skip = useCallback(secs => seek((positionMs || 0) + secs * 1000), [positionMs, seek]);

  return (
    <Ctx.Provider value={{
      current, state, playing: state === "playing",
      positionMs, durationMs,
      play, pause, toggle, stop, seek, skip,
      continueList, forget,
      positionOf: mp3 => positions.current[mp3] || null,
    }}>
      {children}
    </Ctx.Provider>
  );
}

/* A dead player outside the provider, so a screen in a test harness that asks
   for this never throws — the same guarantee live-audio makes. */
const SILENT = {
  current: null, state: "idle", playing: false, positionMs: 0, durationMs: 0,
  play() {}, pause() {}, toggle() {}, stop() {}, seek() {}, skip() {},
  continueList: [], forget() {}, positionOf: () => null,
};
export function useRecordings() {
  return useContext(Ctx) || SILENT;
}
