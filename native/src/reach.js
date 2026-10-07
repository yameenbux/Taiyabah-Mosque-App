/**
 * Taiyabah Masjid — can the app reach the masjid?
 * Copyright (c) 2026 Yameen Bux. All rights reserved. See LICENSE.md.
 *
 * NOT "is there a network". A phone can hold four bars of a hotel wifi that
 * needs a login, or a train's wifi that drops every tunnel, and NetInfo calls
 * all of that connected. The question the app actually has to answer is
 * narrower and more useful: did the last thing we asked the masjid for come
 * back? That is also true when the masjid's own server is down, which a
 * network API will cheerfully report as online.
 *
 * So this is measured rather than asked. Every request in the app goes through
 * one function in supabase.js, which tells this module what happened. No new
 * native module, nothing to configure, and it cannot disagree with reality
 * because it IS reality.
 *
 * It stays quiet until something has actually failed. A fresh install that has
 * not asked for anything yet is not "offline"; it is simply unasked.
 */
import { useEffect, useState } from "react";

let state = "unknown";          // unknown | reachable | unreachable
let failures = 0;
const listeners = new Set();

/* One failure is a blip — a request cancelled by a screen that unmounted, a
 * server hiccup. Two in a row is a condition worth telling somebody about. */
const PATIENCE = 2;

export function noteReach(ok) {
  if (ok) { failures = 0; set("reachable"); return; }
  failures += 1;
  if (failures >= PATIENCE) set("unreachable");
}

function set(next) {
  if (next === state) return;
  state = next;
  if (state === "unreachable") startProbing(); else stopProbing();
  for (const fn of listeners) { try { fn(state); } catch {} }
}

export const reach = () => state;
export const offline = () => state === "unreachable";

export function onReach(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/* ---------------------------------------------------------------------------
   GETTING BACK.

   Measuring from real requests answers "is the masjid there" honestly, and it
   had one hole: nothing ever asked again. The only thing that could clear
   "unreachable" was a request that happened to succeed, and a screen whose
   request already failed does not repeat it. So a phone that lost signal for
   five seconds in a lift — or simply started the app before the wifi had
   associated — wore the bar until it was force-closed. Reported from a real
   phone, on a desk, on wifi: "the connection error sticks to the screen and
   cannot be removed."

   So while the answer is "no", ask again. Gently: 5 seconds, then 10, 20, 40,
   up to a minute, because a phone that is genuinely in a tunnel should not
   have its battery emptied finding that out. The moment anything answers, the
   probe stops and the bar goes with it.

   The probe is injected rather than imported. supabase.js already imports this
   module, so reaching back into it would be a cycle.
   --------------------------------------------------------------------------- */
let probe = null, timer = null, wait = 0;
const FIRST = 5000, MAX = 60000;

export function setProbe(fn) { probe = fn; }

function stopProbing() { if (timer) { clearTimeout(timer); timer = null; } wait = 0; }

function startProbing() {
  if (!probe || timer) return;          // nothing to ask with, or already asking
  wait = wait ? Math.min(wait * 2, MAX) : FIRST;
  timer = setTimeout(async () => {
    timer = null;
    /* The probe reports through noteReach itself, like every other request,
       so there is one path into this state machine and not two. */
    try { await probe(); } catch { /* noteReach(false) already ran */ }
    if (state === "unreachable") startProbing();
  }, wait);
}

/* Coming back to the app is the other moment worth asking again: the phone has
   usually been somewhere with signal since. */
export function wokeUp() { if (state === "unreachable") { wait = 0; stopProbing(); startProbing(); } }

/* For tests, and for a screen that wants to start over after a manual retry. */
export function resetReach() { state = "unknown"; failures = 0; stopProbing(); }

/* The hook lives here rather than beside the bar, because the bar is not the
 * only thing that needs the answer: Screen has to leave room at the bottom of
 * every scroll for a bar that is about to cover the last thing on it. */
export function useOffline() {
  const [down, setDown] = useState(offline());
  useEffect(() => onReach(() => setDown(offline())), []);
  return down;
}
