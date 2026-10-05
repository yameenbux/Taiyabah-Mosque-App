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
  danger:   "#B4532F",
  onAir:    "#3FBE73",
};

export const R = { card: 18, pill: 999, tile: 16 };

/* The web app multiplies every size by --ts, defaulted to 1.12 because the
 * community said the old size made people squint. Same default here. */
export const TS = 1.12;
export const fs = n => Math.round(n * TS);

export const F = {
  sans:        "HankenGrotesk",
  sansMedium:  "HankenGroteskMedium",
  sansBold:    "HankenGroteskBold",
  display:     "Fraunces",          // the serif used for prayer names
  arabic:      "Amiri",             // scripture is set in Amiri, never a fallback
};
