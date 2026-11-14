/**
 * Taiyabah Masjid — a different glyph for each of the five prayers.
 * Copyright (c) 2026 Yameen Bux. All rights reserved. See LICENSE.md.
 *
 * The Today strip on Home drew ONE sun for Fajr, Zuhr, Asr and Maghrib and a
 * moon for Isha, so four fifths of the row said the same thing. The committee
 * asked for five that can be told apart at a glance, and the distinction they
 * named is dawn against dusk: the strip is read sideways on, at 15 points,
 * usually while walking.
 *
 * So the horizon does the work. Fajr is the disc still UNDER the line with the
 * light coming up and the arrow rising; Maghrib is the same disc and the same
 * line with the arrow going down. Zuhr is the sun at its height, rays even all
 * round. Asr is that same sun pushed low and right, its rays longer on one
 * side — two suns of identical size would say nothing, and the lean is what
 * carries afternoon. Isha is a crescent with a star.
 *
 * WHY PATHS AND NOT THE ICON FONT. The app bundles a subset of Ionicons and
 * that set has no sunrise and no sunset — which is precisely the distinction
 * being drawn. Adding two glyphs to the subset is a font rebuild and a new
 * failure mode (see scripts/check-icons.mjs); six `d` strings are neither.
 *
 * WHY THE SHAPES LIVE HERE AND NOT IN TWO PLACES. The website draws the same
 * strip from its own copy in index.html, and the app and the website have
 * drifted apart four times now in ways nobody noticed until a screenshot sat
 * beside a phone. scripts/check-prayer-icons.mjs reads BOTH files and fails
 * the build if a single `d` differs, so the next person to redraw one of these
 * is told, immediately, to redraw the other. That check is the whole reason
 * the data is a flat list of path strings rather than nicer-looking markup:
 * two files can only be compared if they say the same thing the same way.
 *
 * Circles are written as paths for the same reason — <circle> and <Circle> are
 * different spellings of one shape, and the check would have to know that.
 */
import React from "react";
import Svg, { Path } from "react-native-svg";

/* Drawn on a 24×24 box, stroked, never filled. Keep them in prayer order: the
   strip reads left to right and so should this. */
export const STRIP_ICONS = {
  /* FAJR — the disc still below the horizon, light and arrow rising. */
  fajr: [
    "M3 18h18",
    "M7.5 18a4.5 4.5 0 0 1 9 0",
    "M12 3.2v3.4",
    "M9.6 5.9 12 3.3l2.4 2.6",
    "M5 9.6 6.4 11",
    "M19 9.6 17.6 11",
  ],
  /* ZUHR — the sun at its height, eight even rays. */
  zuhr: [
    "M16 12a4 4 0 1 1-8 0 4 4 0 1 1 8 0",
    "M12 3.6v2M12 18.4v2M5.6 5.6 7 7M17 17l1.4 1.4M3.6 12h2M18.4 12h2M5.6 18.4 7 17M17 7l1.4-1.4",
  ],
  /* ASR — the same sun, lower and leaning, its rays longer on one side. */
  asr: [
    "M16.7 13.2a3.5 3.5 0 1 1-7 0 3.5 3.5 0 1 1 7 0",
    "M13.2 4.8v2.1",
    "M4.6 13.2h2.1",
    "M7.1 7.1 8.6 8.6",
    "M7.1 19.3 8.6 17.8",
    "M19.3 7.1 17.8 8.6",
    "M19.6 13.2h2",
  ],
  /* MAGHRIB — the same horizon as Fajr, the arrow going the other way. */
  maghrib: [
    "M3 18h18",
    "M7.5 18a4.5 4.5 0 0 1 9 0",
    "M12 9.6V3.2",
    "M9.6 7 12 9.7 14.4 7",
    "M5 9.6 6.4 11",
    "M19 9.6 17.6 11",
  ],
  /* ISHA — crescent and star. */
  isha: [
    "M19.5 14.6A7.6 7.6 0 0 1 9.4 4.5a7.7 7.7 0 1 0 10.1 10.1Z",
    "M18.2 3v2.6",
    "M16.9 4.3h2.6",
  ],
  /* Sunrise, for the line under the strip rather than a column in it. The
     same horizon Fajr and Maghrib stand on, but a WHOLE disc resting on it
     and no arrow: Fajr's arrow rises and Maghrib's falls, and sunrise is the
     moment between them where nothing is moving yet. */
  sunrise: [
    "M3 18h18",
    "M16 13.6a4 4 0 1 1-8 0 4 4 0 1 1 8 0",
    "M12 5.4v2.2",
    "M5.6 7.6 7.1 9.1",
    "M18.4 7.6 16.9 9.1",
  ],
};

/* 1.6, which is what the website strokes them at. Thinner and the crescent
   breaks up at 15 points on a dense screen; thicker and Zuhr's rays close up
   into a blob. */
export const STROKE = 1.6;

/**
 * One prayer's glyph. `k` is a key of STRIP_ICONS; anything else draws
 * nothing rather than throwing, because a timetable that gained a sixth row
 * should not take the home screen down with it.
 */
export function PrayerIcon({ k, size = 15, color }) {
  const paths = STRIP_ICONS[k];
  if (!paths) return null;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {paths.map((d, i) => (
        <Path key={i} d={d} stroke={color} strokeWidth={STROKE}
              strokeLinecap="round" strokeLinejoin="round" />
      ))}
    </Svg>
  );
}
