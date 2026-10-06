/* The brand, lifted straight from the web app's :root so the two cannot drift.
 * If a colour changes there, it changes here — they are the same masjid. */
export const C = {
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
     what shape of thing to type — were very nearly invisible on the paper. */
  hint:     "#9A8F95",
  danger:   "#B4532F",
  onAir:    "#3FBE73",
};

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
export const SHADOW = {
  shadowColor: "#3C0B2A",
  shadowOffset: { width: 0, height: 6 },
  shadowOpacity: 0.16,
  shadowRadius: 10,
  elevation: 3,
};

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
