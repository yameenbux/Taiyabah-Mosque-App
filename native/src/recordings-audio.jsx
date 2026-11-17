/**
 * Taiyabah Masjid — the recordings player, held above the navigator like the radio.
 * Copyright (c) 2026 Yameen Bux. All rights reserved. See LICENSE.md.
 *
 * This is to the recordings archive what src/live-audio.jsx is to the stream:
 * the one place the sound actually lives, mounted above the whole navigator so
 * a dars keeps playing while somebody walks off to read Qurʼan — the exact
 * thing the live stream was moved up here to allow. A recording is if anything
 * MORE of a sit-and-listen than the stream, so it would be odd for it to stop
 * the moment you left the list to look something up.
 *
 * HOW IT DIFFERS FROM THE STREAM, and why it is its own file rather than a flag
 * on that one. The stream is one endless thing with a volume; a recording is a
 * FILE with a start, an end and a place you are up to. So this carries position
 * and duration, it can seek, and it loads a different URL every time you pick a
 * new one. Folding that into live-audio.jsx would make the simple thing (a
 * radio with a play button) carry the weight of the complicated one.
 *
 * ONLY ONE SOUND AT A TIME. The stream and a recording must never play over
 * each other. Neither provider knows about the other; both go through
 * src/audio-bus.js, and the rule is simply: claim the output before you start,
 * release it when you stop. Starting a recording stops the stream, and starting
 * the stream stops a recording, without either file importing the other.
 */
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { Audio } from "expo-av";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { claimAudio, releaseAudio } from "./audio-bus";

const Ctx = createContext(null);

/* Where we remember how far through each recording somebody got — keyed by the
   recording's own URL. It does two jobs: a reopened dars resumes instead of
   restarting, and the browse screen can show a "Continue listening" row. A
   recording drops off that row once it is within 20s of the end or past 97%,
   so a dars somebody actually finished does not sit there forever. */
const POS_KEY = "rec:positions";
const DONE_TAIL_MS = 20000;
const loadPositions = async () => {
  try { return JSON.parse(await AsyncStorage.getItem(POS_KEY)) || {}; } catch { return {}; }
};
const isUnfinished = e =>
  !!e && e.pos > 8000 && (!e.dur || (e.pos < e.dur - DONE_TAIL_MS && e.pos / e.dur < 0.97));

export function RecordingsAudioProvider({ children }) {
  const sound = useRef(null);
  /* The recording that is loaded, in full, so the bar and the screen can name
     it without being handed it again. null when nothing is loaded. */
  const [current, setCurrent] = useState(null);
  /* idle (nothing loaded) | loading | playing | paused. "idle" is the only one
     where `current` is null; the others always have a recording. */
  const [state, setState] = useState("idle");
  const [positionMs, setPositionMs] = useState(0);
  const [durationMs, setDurationMs] = useState(0);
  /* The slug of what is loaded, read inside callbacks without making play()
     depend on `current` — a stale closure is how "resume" would resume the
     wrong file after you had picked another. */
  const loaded = useRef(null);
  /* The current recording's full meta, in a ref so the status callback can save
     a position without depending on `current` (a stale closure would save the
     spot against the wrong file). */
  const currentRef = useRef(null);

  /* Remembered positions: a ref for the callbacks, mirrored into state as the
     "Continue listening" list the browse screen reads. Loaded once on mount. */
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

  const unload = useCallback(async () => {
    const s = sound.current;
    sound.current = null;
    loaded.current = null;
    try { s?.setOnPlaybackStatusUpdate(null); } catch {}
    await s?.unloadAsync().catch(() => {});
  }, []);

  /* The stop that the audio bus calls when the stream (or anything else) takes
     the output. Clears everything so the bar goes and nothing lingers loaded. */
  const stop = useCallback(async () => {
    releaseAudio(stop);
    /* Record the spot before letting go, so "stop" on the bar still leaves a
       place to continue from. */
    if (currentRef.current) { remember(currentRef.current, positionMs, durationMs); persist(); }
    currentRef.current = null;
    setState("idle");
    setCurrent(null);
    setPositionMs(0);
    setDurationMs(0);
    await unload();
  }, [unload, remember, persist, positionMs, durationMs]);

  useEffect(() => {
    /* The audio mode (play in silent mode, keep going in the background) is set
       once for the app by the live-audio provider above this one, so a loaded
       recording already inherits it. Nothing to set here; nothing to tear down
       either, because this provider lives as long as the app does. */
    return () => { releaseAudio(stop); };
  }, [stop]);

  const onStatus = useCallback(st => {
    if (!st) return;
    if (st.didJustFinish) {
      /* Ended: keep it loaded at the start so the bar offers a replay rather
         than vanishing mid-thought, but hand the output back so the stream is
         free to take over — and drop it from "Continue listening", since it is
         done. */
      setState("paused");
      setPositionMs(0);
      sound.current?.setPositionAsync?.(0).catch(() => {});
      sound.current?.pauseAsync?.().catch(() => {});
      releaseAudio(stop);
      if (currentRef.current) forget(currentRef.current.mp3);
      return;
    }
    if (typeof st.positionMillis === "number") setPositionMs(st.positionMillis);
    if (typeof st.durationMillis === "number" && st.durationMillis > 0) setDurationMs(st.durationMillis);
    if (st.isPlaying) setState("playing");
    else if (st.isLoaded) setState(s => (s === "loading" ? "loading" : "paused"));
    /* Remember the spot while playing, at most once every five seconds, so a
       backgrounded or killed app still knows where the listener was. */
    if (st.isPlaying && currentRef.current && typeof st.positionMillis === "number") {
      const now = Date.now();
      if (now - lastSaved.current > 5000) {
        lastSaved.current = now;
        remember(currentRef.current, st.positionMillis, st.durationMillis || 0);
        persist();
      }
    }
  }, [stop, forget, remember, persist]);

  /**
   * Play a recording. If it is the one already loaded, this is a resume; if it
   * is a different one, the old sound is unloaded and the new one opened. Either
   * way the output is claimed first, which stops the live stream.
   */
  const play = useCallback(async rec => {
    if (!rec || !rec.mp3) return;
    claimAudio(stop);

    if (loaded.current === rec.mp3 && sound.current) {
      try { await sound.current.playAsync(); setState("playing"); } catch { setState("error"); }
      return;
    }

    await unload();
    setCurrent(rec);
    currentRef.current = rec;
    setState("loading");
    /* Resume where they left off, if we remember and it is not basically done;
       otherwise from the top. */
    const saved = positions.current[rec.mp3];
    const from = isUnfinished(saved) ? saved.pos : 0;
    setPositionMs(from);
    /* A sensible duration to draw the bar with before the file reports its own,
       taken from the length encoded in the recording's own name. */
    setDurationMs(Number(rec.durationSec) > 0 ? rec.durationSec * 1000 : 0);
    try {
      const { sound: s } = await Audio.Sound.createAsync(
        { uri: rec.mp3 },
        { shouldPlay: true, progressUpdateIntervalMillis: 500, positionMillis: from },
      );
      sound.current = s;
      loaded.current = rec.mp3;
      s.setOnPlaybackStatusUpdate(onStatus);
      setState("playing");
    } catch {
      setState("error");
      releaseAudio(stop);
    }
  }, [onStatus, stop, unload]);

  const pause = useCallback(async () => {
    await sound.current?.pauseAsync().catch(() => {});
    setState("paused");
    /* Pausing is a deliberate "I'll come back" — save the spot at once rather
       than waiting for the five-second tick. */
    if (currentRef.current) { remember(currentRef.current, positionMs, durationMs); persist(); }
  }, [positionMs, durationMs, remember, persist]);

  const toggle = useCallback(() => {
    if (state === "playing") return pause();
    if (current) return play(current);
  }, [state, current, pause, play]);

  /* Seek to an absolute millisecond, clamped to the file. The screen's scrubber
     hands a fraction; it multiplies by duration before calling this. */
  const seek = useCallback(async ms => {
    const d = durationMs || 0;
    const to = Math.max(0, d ? Math.min(ms, d) : ms);
    setPositionMs(to);
    await sound.current?.setPositionAsync?.(Math.round(to)).catch(() => {});
  }, [durationMs]);

  /* Jump a number of seconds (negative to go back), for the ±15s buttons. */
  const skip = useCallback(secs => seek((positionMs || 0) + secs * 1000), [positionMs, seek]);

  return (
    <Ctx.Provider value={{
      current, state, playing: state === "playing",
      positionMs, durationMs,
      play, pause, toggle, stop, seek, skip,
      /* The "Continue listening" row and a per-recording resume marker for the
         list, so a row can show a progress sliver. */
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
