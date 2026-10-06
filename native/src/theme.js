/* The brand, lifted straight from the web app's :root so the two cannot drift.
 * If a colour changes there, it changes here — they are the same masjid. */
/* TWO PALETTES, ONE MASJID.
 *
 * Dark mode is a choice in System Preferences, not a reading of the phone's
 * setting: the masjid's own screens are light, somebody who wants the app
 * dark says so, and light stays the default for everybody else.
 *
 * It is the same masjid at night rather than a generic dark theme — the plum
 * stays plum, the gold stays gold, and the cream that is the logo's own
 * becomes the text. Every pair below was measured rather than eyeballed; the
 * weakest is muted-on-card at 8.1:1, against the 4.5:1 that body text needs.
 *
 * ONE COLOUR CANNOT DO TWO JOBS HERE. brand-700 was both the top of a plum
 * gradient and the fill of a CHOSEN control. On light that works, because
 * plum is dark and the page is cream, so a plum fill reads as picked. Invert
 * it and the second job fails: a dark plum on a dark card is the same colour,
 * and the first dark render showed "Dark" selected and "Medium" selected with
 * no way to tell. So the roles are separate tokens now — brand-700/800/900
 * stay the CANVAS family and go darker at night, while `pick` and
 * `ctaTop`/`ctaBot` are the INTERACTIVE plum and come UP at night, which is
 * the direction a thing you can press has to move on a dark ground.
 */
export const LIGHT = {
  brand900: "#3C0B2A",   // hero canvas
  brand800: "#4B1136",
  brand700: "#5E1844",   // raised on dark
  brand600: "#772157",
  gold:     "#C6A24C",
  goldBright: "#DCBB63",
  goldInk:  "#7A5D14",
  cream:    "#F3EFE3",   // the logo's own cream
  paper:    "#F5F1E8",   // light content background
  card:     "#FCFAF3",
  ink:      "#261B22",
  muted:    "#7C6E77",
  line:     "#E4DECF",
  /* A browser's own placeholder is about 54% black — a mid grey you can read.
     The app had been using the HAIRLINE colour for placeholder text, so
     "NK-26-0001" and "e.g. 0.85" — the two placeholders that tell somebody
     what shape of thing to type — were very nearly invisible on the paper.
     Nudged from #9A8F95 to clear 3:1 against the card rather than miss it by
     a rounding error. */
  hint:     "#908490",
  danger:   "#B4532F",
  onAir:    "#3FBE73",
  /* The interactive plum. These three are brand-700/900 exactly as they were,
     so light renders to the same pixels it always did. */
  pick:     "#5E1844",   // a chosen chip, tab or radio
  /* brand-600 has the SAME two jobs brand-700 had: plum words and glyphs on a
     page, and a plum SURFACE with cream on it. On dark the first must come up
     to be read and the second must stay saturated to be read ON, so a lifted
     brand-600 turned the consent panel into pale pink with cream on it. This
     is brand-600 exactly, for the surfaces only. */
  plumFill: "#772157",
  pickInk:  "#E7D9E2",   // its uppercase label — the website's own value
  ctaTop:   "#5E1844",   // a filled button, top of the gradient
  ctaBot:   "#3C0B2A",   // and its bottom
  /* THE TINT PANELS, which the website uses to mark a surface as its own
     without drawing a border — a chip behind a glyph, a social button, the
     rose panel that carries a warning, the gold one that carries a tip.
     They were hex literals in fourteen places, every one of them a pale
     colour with dark text on it, so on a dark page each became a white card
     in the middle of the screen. These are those exact values. */
  tintPlum:     "#F0E9ED",
  tintPlumPress:"#E8DCE4",   // the same surface held down
  tintPlumPill: "#EFE6EC",   // the NEXT pill, a shade off the panel
  tintRose:     "#FBF0EB",
  tintRoseLine: "#EBCDBF",
  tintRoseInk:  "#7C3A20",
  tintGold:     "#FBF6E7",
  tintGoldInk:  "#7A5C13",
};

export const DARK = {
  /* The hero is still the darkest thing on the screen, so it goes darker
     still rather than disappearing into a dark page. */
  brand900: "#0E0309",
  brand800: "#1B0613",
  brand700: "#2A0C1E",
  /* Plum at full strength is unreadable on a dark ground; this is the same
     hue carried up until it clears 8:1 on the card. */
  brand600: "#D79BBD",
  gold:     "#DCBB63",
  goldBright: "#E8CC80",
  /* goldInk is dark gold text on a gold tint. On dark the tint is dark, so
     the ink has to come up with it. */
  goldInk:  "#E6C87A",
  cream:    "#F3EFE3",
  paper:    "#160410",
  card:     "#24091A",
  ink:      "#F3EFE3",
  muted:    "#B9A6B1",
  line:     "#3C1E31",
  hint:     "#9A8894",
  danger:   "#F0937A",
  onAir:    "#3FBE73",
  /* The interactive plum, carried UP rather than down — the same hue, raised
     until the fill itself clears 3:1 against the card (3.26:1) while cream on
     it still clears body text (4.97:1). Both had to hold at once, and the
     window between them is narrow: a shade lighter and the cream fails, a
     shade darker and the chosen state stops reading as chosen. */
  pick:     "#A5427D",
  plumFill: "#A5427D",   // the same surface plum as a chosen control
  /* The website's #E7D9E2 was picked against a DARK plum; on this lifted one
     it falls to 4.2:1, so the label is the full cream here (4.97:1). */
  pickInk:  "#F3EFE3",
  ctaTop:   "#A5427D",
  ctaBot:   "#732957",
  /* A tint is a surface that says "this part is different" without a border,
     so what matters is that it separates from the card by about as much as
     the light one does — 1.2-1.3:1 here against 1.03-1.14:1 there, a little
     more because a dark surface needs it. The text on each clears 6:1. */
  tintPlum:     "#42182F",
  tintPlumPress:"#4E1E39",
  tintPlumPill: "#42182F",
  tintRose:     "#431812",
  tintRoseLine: "#5E2419",
  tintRoseInk:  "#F0937A",   // the warning's own words, lifted to read
  tintGold:     "#352609",
  tintGoldInk:  "#E6C87A",
};

/* Every component reads C.something at render time, and there are 28 files of
 * them. Rather than thread a theme through all of it, C is a live view of
 * whichever palette is current: the store sets the mode as preferences load
 * or change, and because every component also consumes the store, they all
 * re-render and read the new values on the same pass.
 *
 * The one deliberate exception is Boundary.jsx, which hard-codes its colours:
 * it is what draws when something has already thrown, and a fallback that
 * depends on app state could fail the same way. */
let MODE = "light";
const PALETTE = { light: LIGHT, dark: DARK };

export const setThemeMode = mode => { MODE = PALETTE[mode] ? mode : "light"; };
export const themeMode = () => MODE;
export const isDark = () => MODE === "dark";

/* ONE COLOUR, TWO THEMES, written where it is used.
 *
 * Most colours belong in the palettes above, because most are used in a dozen
 * places. A few are not: the website gives a particular element a particular
 * ink — #6B5410 on the Home reminder's title, #4A3B14 on a Donate phase pill
 * — and those values are the record of what the web app does. Promoting each
 * to a token would bury that, and five near-identical gold tokens help nobody.
 *
 * Every one of them is DARK INK ON A TRANSLUCENT TINT, and a translucent tint
 * composites over whatever is behind it: on a dark card the panel goes dark
 * and the dark ink on it disappears. So the light value stays exactly where
 * the website put it, and the dark one says what it becomes at night.
 *
 *   color: dual("#6B5410", C.goldInk)
 *
 * Call it at render, like any other colour here — scripts/check-theme.mjs
 * fails the build if it is read at module scope instead. */
export const dual = (light, dark) => (MODE === "dark" ? dark : light);

export const C = new Proxy({}, {
  get: (_, k) => PALETTE[MODE][k],
  /* So Object.keys(C) and spreads still behave. */
  ownKeys: () => Reflect.ownKeys(PALETTE[MODE]),
  getOwnPropertyDescriptor: (_, k) => ({ value: PALETTE[MODE][k], enumerable: true, configurable: true }),
  has: (_, k) => k in PALETTE[MODE],
});

/* The website's --shadow, which thirty-one of its rules use:
 *
 *   0 1px 2px rgba(60,11,42,.06), 0 12px 30px -18px rgba(60,11,42,.35)
 *
 * A soft plum lift, not a grey drop. The app had NO shadow anywhere — not one
 * shadow or elevation in any component — so every card, tile and panel sat
 * flat on the paper while the website's float a little above it. That is not
 * one screen looking different; it is all of them.
 *
 * React Native has no spread, so the second layer is approximated: the -18px
 * spread pulls a 30px blur back to roughly a 10px one, offset 6 down. */
/* A soft plum lift is invisible against a dark page — a shadow needs
 * something darker than the surface behind it to show, and on dark there is
 * almost nothing darker. So on dark the card separates itself with a lift
 * that is nearly black and much softer, and the hairline does the rest of the
 * work. Live, like C, so it follows the mode. */
const SHADOW_LIGHT = {
  shadowColor: "#3C0B2A",
  shadowOffset: { width: 0, height: 6 },
  shadowOpacity: 0.16,
  shadowRadius: 10,
  elevation: 3,
};
const SHADOW_DARK = {
  shadowColor: "#000000",
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.45,
  shadowRadius: 10,
  elevation: 2,
};
const SHADOWS = { light: SHADOW_LIGHT, dark: SHADOW_DARK };
export const SHADOW = new Proxy({}, {
  get: (_, k) => SHADOWS[MODE][k],
  ownKeys: () => Reflect.ownKeys(SHADOWS[MODE]),
  getOwnPropertyDescriptor: (_, k) => ({ value: SHADOWS[MODE][k], enumerable: true, configurable: true }),
  has: (_, k) => k in SHADOWS[MODE],
});

export const R = { card: 18, pill: 999, tile: 16 };

/* The web app multiplies every size by --ts, defaulted to 1.12 because the
 * community said the old size made people squint. Same default here. */
export const TS = 1.12;
export const fs = n => Math.round(n * TS);

export const F = {
  sans:        "HankenGrotesk",
  sansMedium:  "HankenGroteskMedium",   // 500 — the website uses it in five rules
  /* 600, and the website's commonest weight by a distance: 99 rules against
     93 at 700 and 5 at 500. The app bundled 400/500/700 only, so every one of
     those 99 was drawing at 500 — a step light on almost every label, value
     and row title in the app at once. */
  sansSemi:    "HankenGroteskSemiBold",
  sansBold:    "HankenGroteskBold",
  display:     "Fraunces",          // the serif used for prayer names
  arabic:      "Amiri",             // scripture is set in Amiri, never a fallback
};
