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
  for (const fn of listeners) { try { fn(state); } catch {} }
}

export const reach = () => state;
export const offline = () => state === "unreachable";

export function onReach(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/* For tests, and for a screen that wants to start over after a manual retry. */
export function resetReach() { state = "unknown"; failures = 0; }

/* The hook lives here rather than beside the bar, because the bar is not the
 * only thing that needs the answer: Screen has to leave room at the bottom of
 * every scroll for a bar that is about to cover the last thing on it. */
export function useOffline() {
  const [down, setDown] = useState(offline());
  useEffect(() => onReach(() => setDown(offline())), []);
  return down;
}
