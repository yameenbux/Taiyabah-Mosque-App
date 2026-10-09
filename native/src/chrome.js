/**
 * Taiyabah Masjid — how tall the tab bar has to be
 * Copyright (c) 2026 Yameen Bux. All rights reserved. See LICENSE.md.
 *
 * A committee member's Samsung showed the tab bar with its icons but no
 * labels: Home, Prayer Times, Notices and More were all underneath Android's
 * three-button navigation bar.
 *
 * The cause is a trap worth writing down. React Navigation sizes the tab bar
 * to include the bottom safe-area inset by itself — but the moment you put an
 * explicit `height` in tabBarStyle, yours wins and the inset is gone. The bar
 * had a height, because it has to grow with the text size, and so it lost the
 * inset without anything saying so.
 *
 * It is invisible almost everywhere it is tested. An emulator and most modern
 * phones run gesture navigation, where the inset is a slim bar — the labels
 * are only shaved. Switch the phone to three buttons and the inset roughly
 * doubles, and the labels go entirely.
 *
 * Pure: no imports, no React Native, so the arithmetic can be tested in Node.
 */

/** The tab bar's own content, before anything the system reserves. */
export function barContent({ rtl = false, line, wraps = false }) {
  const base = rtl ? 74 : 64;          /* what the design wants at normal size */
  const want = rtl ? 22 : 14;          /* the line height it was drawn against */
  const l = Number.isFinite(line) ? line : want;
  /* Whatever the label's line gains beyond the design size is added to the
     bar, so a bigger text setting cannot slice the words in half. */
  const grown = Math.max(0, l - want);
  /* And a second line once a two-word label needs one. */
  return base + grown + (wraps ? l : 0);
}

/**
 * The style the tab bar needs: tall enough for its content AND for whatever
 * the system has reserved underneath it.
 *
 * paddingBottom as well as height, or the content centres itself inside the
 * taller bar and floats above the navigation instead of sitting on it.
 */
export function tabBar({ rtl = false, line, wraps = false, inset = 0 }) {
  const safe = Number.isFinite(inset) && inset > 0 ? inset : 0;
  const content = barContent({ rtl, line, wraps });
  return { content, height: content + safe, paddingBottom: safe };
}
