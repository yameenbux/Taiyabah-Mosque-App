/**
 * Taiyabah Masjid — the radio must outlive the screen that started it.
 * Copyright (c) 2026 Yameen Bux. All rights reserved. See LICENSE.md.
 *
 * The bug these guard against shipped, and a committee member found it the
 * obvious way: they pressed play, went to read Qurʼan, and the bayaan stopped.
 *
 * The cause was one line of ordinary good practice in the wrong place —
 * Live.jsx held the Audio.Sound itself and tidied it away on unmount:
 *
 *     return () => { sound.current?.unloadAsync().catch(() => {}); };
 *
 * which is right for a screen and wrong for a radio. Nothing failed, nothing
 * logged, and the note at the bottom of that same screen promised, in four
 * languages, that audio keeps playing while you use the rest of the app.
 *
 * It is an easy thing to put back. Somebody tidying up finds a sound created
 * in one file and no cleanup near it, and adds one. So these tests do not
 * check that the stream plays — no test here can — they check the SHAPE that
 * makes it possible, and they read the real source to do it:
 *
 *   1. One file owns the player, and it is not a screen.
 *   2. No screen unloads a sound.
 *   3. The provider is mounted ABOVE the navigator, so navigating cannot
 *      unmount it.
 *   4. Something still draws the bar, or there is a stream nobody can stop.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const src = path.resolve(import.meta.dirname, "../../src");
const read = p => fs.readFileSync(path.join(src, p), "utf8");

/** Every .js/.jsx under src/, as [relative path, text]. */
function sources() {
  const out = [];
  (function walk(dir, rel) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name), r = rel ? `${rel}/${e.name}` : e.name;
      if (e.isDirectory()) walk(p, r);
      else if (/\.jsx?$/.test(e.name)) out.push([r, fs.readFileSync(p, "utf8")]);
    }
  })(src, "");
  return out;
}

test("only the two audio providers reach for expo-audio", () => {
  /* There are two things that make sound now: the live stream and the
     recordings archive. Each owns its player in a provider above the navigator
     — live-audio.jsx and recordings-audio.jsx — and nothing else opens one, so
     a screen can never again create a sound it will tidy away on unmount. The
     two never play at once; src/audio-bus.js keeps one output between them.

     (This moved from expo-av to expo-audio with the lock-screen controls; the
     rule is the same, only the library's name changed.) */
  const owners = sources()
    .filter(([, t]) => /from\s+"expo-audio"/.test(t))
    .map(([f]) => f).sort();
  assert.deepEqual(owners, ["live-audio.jsx", "recordings-audio.jsx"],
    "a third file opened its own player — only the stream and the recordings archive own one, both above the navigator");
});

test("no screen unloads a sound", () => {
  const guilty = sources()
    .filter(([f]) => f.startsWith("screens/"))
    .filter(([, t]) => /unloadAsync|stopAsync/.test(t))
    .map(([f]) => f);
  assert.deepEqual(guilty, [],
    "a screen unloading the stream on unmount is exactly the bug this file exists for");
});

test("the player is mounted above the navigator, not inside it", () => {
  const app = read("App.jsx");
  assert.match(app, /<LiveAudioProvider>/,
    "App.jsx no longer mounts the provider at all");
  /* Root is what renders NavigationContainer. The provider has to WRAP it, or
     a screen change can take the sound down with it. */
  const open = app.indexOf("<LiveAudioProvider>");
  const root = app.indexOf("<Root />");
  const close = app.indexOf("</LiveAudioProvider>");
  assert.ok(open !== -1 && root !== -1 && close !== -1 && open < root && root < close,
    "the navigator must be rendered INSIDE <LiveAudioProvider>");
  assert.ok(!read("App.jsx").match(/<Stack\.Screen[^>]*component=\{?\s*LiveAudioProvider/),
    "the provider is not a screen");
});

test("the recordings player is mounted above the navigator too", () => {
  const app = read("App.jsx");
  /* Same rule as the stream: the provider has to WRAP Root, or leaving the
     Recordings list would stop a dars somebody meant to keep listening to. */
  const open = app.indexOf("<RecordingsAudioProvider>");
  const root = app.indexOf("<Root />");
  const close = app.indexOf("</RecordingsAudioProvider>");
  assert.ok(open !== -1 && root !== -1 && close !== -1 && open < root && root < close,
    "the navigator must be rendered INSIDE <RecordingsAudioProvider>");
});

test("something draws the recordings bar", () => {
  const app = read("App.jsx");
  assert.match(app, /<RecBar\b/,
    "a recording that survives navigation with no bar is audio nobody can pause from elsewhere");
  assert.match(app, /onRec=\{/, "the bar is not told whether the Recordings screen is on top");
});

test("live-audio.jsx does not tear the player down on unmount", () => {
  const t = read("live-audio.jsx");
  /* The provider lives as long as the app does. A cleanup function returned
     from its MOUNT effect (the one that sets the audio mode) would be the
     original bug with a longer reach. */
  const effect = t.slice(t.indexOf("useEffect("), t.indexOf("const teardown"));
  assert.ok(!/return\s*\(\)\s*=>/.test(effect),
    "the provider's mount effect returns a cleanup — nothing it holds should be torn down");
  assert.match(t, /\.remove\??\.?\(\)/,
    "stop() still has to actually tear the player down, or the square on the bar does nothing");
  assert.match(t, /clearLockScreenControls/,
    "stop() must also clear the lock-screen controls, or they linger after the stream is gone");
});

test("something draws the On air bar", () => {
  const app = read("App.jsx");
  assert.match(app, /<OnAirBar\b/,
    "audio that survives navigation with no bar is a stream nobody can stop");
  assert.match(app, /onLive=\{/, "the bar is not told which screen is on top");
  assert.match(app, /onTabs=\{/, "the bar is not told whether there is a tab bar to sit on");
});

test("every screen leaves room for the bar", () => {
  const ui = read("ui.jsx");
  assert.match(ui, /ON_AIR_ROOM/,
    "Screen() stopped padding for the bar, so it now covers the last line of every page");
});
