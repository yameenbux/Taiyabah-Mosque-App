/**
 * Taiyabah Masjid — one sound out of the phone at a time.
 * Copyright (c) 2026 Yameen Bux. All rights reserved. See LICENSE.md.
 *
 * There are now two things that play audio: the live stream (src/live-audio.jsx)
 * and the recordings archive (src/recordings-audio.jsx). A phone has one pair
 * of ears, and a bayaan playing over a dars is nobody's idea of either. But the
 * two players are separate providers, mounted side by side above the navigator,
 * and wiring each to reach into the other would tie them in a knot — a circular
 * import and two files that cannot be understood apart.
 *
 * So they do not know about each other. They know about this: a single slot
 * that holds "whoever is currently making sound, and how to stop them". Before
 * a player starts, it claims the slot; claiming it stops whoever held it. When
 * a player stops, it releases. That is the whole of it — mutual exclusion with
 * no player aware of the other's existence, which is exactly how it should be.
 *
 * It is a module singleton on purpose: there is one audio output, so there is
 * one slot, and it lives for the life of the app like the output does.
 */

let activeStop = null;

/**
 * Take the audio output. If someone else holds it, they are stopped first.
 * Pass the function that stops YOU, so the next claimer can stop you in turn.
 */
export function claimAudio(stopFn) {
  const prev = activeStop;
  activeStop = stopFn;
  if (prev && prev !== stopFn) { try { prev(); } catch { /* a stuck stop must not block a start */ } }
}

/**
 * Give the output back. Only clears the slot if you are the one holding it —
 * a late release from a player that was already stopped by someone else must
 * not wipe the new holder.
 */
export function releaseAudio(stopFn) {
  if (activeStop === stopFn) activeStop = null;
}
