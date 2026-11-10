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

test("only live-audio.jsx reaches for expo-av's Audio", () => {
  const owners = sources()
    .filter(([, t]) => /from\s+"expo-av"/.test(t))
    .map(([f]) => f);
  assert.deepEqual(owners, ["live-audio.jsx"],
    "a second file opened its own player — there is one radio, and it lives above the navigator");
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

test("live-audio.jsx does not unload on unmount", () => {
  const t = read("live-audio.jsx");
  /* The provider lives as long as the app does. A cleanup function returned
     from its own effect would be the original bug with a longer reach. */
  const effect = t.slice(t.indexOf("useEffect("), t.indexOf("const setVolume"));
  assert.ok(!/return\s*\(\)\s*=>/.test(effect),
    "the provider's mount effect returns a cleanup — nothing it holds should be torn down");
  assert.match(t, /unloadAsync/,
    "stop() still has to actually unload, or the square on the bar does nothing");
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
