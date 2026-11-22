/**
 * Taiyabah Masjid — the recordings section's own Islamic icon set.
 * Copyright (c) 2026 Yameen Bux. All rights reserved. See LICENSE.md.
 *
 * Ionicons has no mihrab, no minbar, no rehal — so the recordings screens draw
 * their own. These are plain stroked SVG, the same gold line the rest of the
 * app uses, which means they are crisp at any size (a tile, a list thumbnail,
 * or the 150px medallion on the player) and they carry no raster weight.
 *
 * NO HUMAN FACES anywhere in them, by the masjid's standing rule — they are
 * architecture, objects and geometry: a Qurʾān on its rehal, a scroll, a
 * minbar, a mihrab arch, a lantern, a crescent, a mosque, the eight-point
 * khatim star, a tasbīḥ. iconForCategory() maps a recordings section to one.
 *
 * The path data is shared, to the digit, with the website's twin so a dars
 * wears the same mark in both places.
 */
import React from "react";
import Svg, { Path, Polygon, Circle } from "react-native-svg";
import { C } from "./theme";

/* Each icon is a list of sub-paths on a 24×24 grid, stroked. The two that are
   not simple strokes — the star and the beads — are drawn below by hand. */
const D = {
  quran: [
    "M12 7.2C9.8 5.9 6.8 5.9 4.5 7v9.8c2.3-1.1 5.3-1.1 7.5.2 2.2-1.3 5.2-1.3 7.5-.2V7c-2.3-1.1-5.3-1.1-7.5.2z",
    "M12 7.2v9.9",
    "M8 17.3l-3 3.2M16 17.3l3 3.2",
  ],
  scroll: [
    "M8 4.5h9c.9 0 1.5.9 1.5 2v12c0 .9-.6 1.5-1.5 1.5H8",
    "M8 4.5c-1.1 0-1.8.9-1.8 2s.7 1.8 1.8 1.8h2.2V6.5c0-1.1-.9-2-2-2z",
    "M8 19.9c-1.1 0-1.8-.8-1.8-1.9",
    "M10 11h5M10 14h5",
  ],
  /* A minbar: steps rising to the pulpit platform, two posts to the ground,
     and an ogee (onion) domed canopy with a finial over the standing place —
     the shape a khaṭīb speaks from. The old mark was an open box with a stick
     on top beside a loose staircase, which read as a climbing frame. */
  minbar: [
    "M3.5 20.5V18h3v-2.5h3V13h2",
    "M11 13h8",
    "M12.5 20.5V13",
    "M18.5 20.5V13",
    "M12 13c0-2 1-3.3 2.2-4 .7-.4 1-.9 1.3-1.8.3.9.6 1.4 1.3 1.8 1.2.7 2.2 2 2.2 4",
    "M15.5 7.2V5.2",
  ],
  mihrab: [
    "M6.5 21V11.5C6.5 7.9 9 5 12 5s5.5 2.9 5.5 6.5V21",
    "M9.3 21v-9.2c0-1.9 1.2-3.6 2.7-3.6s2.7 1.7 2.7 3.6V21",
    "M4.5 21h15",
  ],
  lantern: [
    "M12 2.5v2",
    "M9.3 7.2h5.4l-1 2.1H10.3z",
    "M9.6 9.3h4.8v6.4H9.6z",
    "M11 15.7v-3.4c0-.6.4-1 1-1s1 .4 1 1v3.4",
    "M10.3 17.4h3.4l-1.7 3z",
  ],
  crescent: [
    "M16.5 3.7a8.3 8.3 0 1 0 0 16.6 6.6 6.6 0 0 1 0-16.6z",
    "M18.7 6.2l.8 1.7 1.8.2-1.3 1.2.3 1.8-1.6-.9-1.6.9.3-1.8-1.3-1.2 1.8-.2z",
  ],
  mosque: [
    "M5.5 12.5c0-3.6 2.9-5.5 6.5-5.5s6.5 1.9 6.5 5.5",
    "M12 7V4.6",
    "M5.5 12.5h13V21h-13z",
    "M9.8 21v-3.4c0-1.2 1-2.2 2.2-2.2s2.2 1 2.2 2.2V21",
    "M3.5 21V10.5",
    "M20.5 21V10.5",
  ],
};

/* The eight-point khatim star, the same points the app's Girih and the
   website's .girih draw, so the recordings mark and the app's motif are one. */
const STAR = "50,6 58,30 82,22 70,44 94,50 70,56 82,78 58,70 50,94 42,70 18,78 30,56 6,50 30,44 18,22 42,30";

/* The tasbīḥ beads, as centres on the 24 grid, with a tassel under them. */
const BEADS = [[12, 6.3], [16, 7.6], [18.4, 11], [18.4, 15], [8, 7.6], [5.6, 11], [5.6, 15]];

/**
 * One Islamic icon. `name` is a key below; falls back to the khatim star so a
 * category the map has never seen still gets a mark rather than a blank.
 */
export function IslamicIcon({ name, size = 24, color = C.goldBright, strokeWidth = 1.5 }) {
  const stroke = { stroke: color, strokeWidth, fill: "none", strokeLinecap: "round", strokeLinejoin: "round" };

  if (name === "khatim") {
    return (
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Polygon points={STAR} fill="none" stroke={color} strokeWidth={5} strokeLinejoin="round" />
      </Svg>
    );
  }
  if (name === "tasbih") {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24">
        {BEADS.map(([cx, cy], i) => <Circle key={i} cx={cx} cy={cy} r={1.4} fill="none" stroke={color} strokeWidth={strokeWidth} />)}
        <Path d="M12 17.5v2.2M10.6 19.7h2.8l-.5 1.8h-1.8z" {...stroke} />
      </Svg>
    );
  }
  const paths = D[name] || D.quran;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {paths.map((d, i) => <Path key={i} d={d} {...stroke} />)}
    </Svg>
  );
}

/** Every icon name, for the picker sheets and tests. */
export const ICON_NAMES = ["quran", "scroll", "minbar", "mihrab", "lantern", "crescent", "mosque", "khatim", "tasbih"];

/**
 * Which icon a recordings section wears. Matched on words rather than exact
 * names so eMasjid's own spellings — "Dars-e-Quran", "Dars-E-Hadith",
 * "Jumuʿah Bayans", "Qiraʾat" and the rest — all land somewhere sensible, and
 * anything unrecognised still gets the star rather than nothing.
 */
export function iconForCategory(name) {
  const s = String(name || "").toLowerCase();
  if (/(qur|quran)/.test(s)) return "quran";
  if (/(hadith|hadeeth)/.test(s)) return "scroll";
  if (/(jumu|bayan|khutb)/.test(s)) return "minbar";
  if (/(qira|qirat|tajwid|tajweed)/.test(s)) return "mihrab";
  if (/(nazam|naat|nasheed|nasheed)/.test(s)) return "lantern";
  if (/(ramadhan|ramadan|taraweeh|tarawih|laylat)/.test(s)) return "crescent";
  if (/(adhan|azan|athan)/.test(s)) return "mosque";
  if (/(nikkah|nikah|conference|khatme|nubuwwat)/.test(s)) return "khatim";
  return "khatim";
}
