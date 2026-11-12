/**
 * Taiyabah Masjid — the words on the download poster, in one place.
 * Copyright (c) 2026 Yameen Bux. All rights reserved. See LICENSE.md.
 *
 * Separate from the builder so that changing what the poster SAYS does not
 * mean reading three hundred lines of layout, and so that
 * scripts/check-app-poster.mjs can tell whether the PDF on disk was built
 * from these words or from an older set.
 *
 * THE REGISTER. This is an announcement, not a brochure. It is allowed to
 * sound pleased with itself — the masjid built something and wants people to
 * have it — but it is going on a wall people walk past on their way to pray,
 * so nothing here shouts, nothing is in capitals for emphasis, and nothing
 * claims more than the app does. Every line below is a thing the app actually
 * ships: if a feature is removed, the line goes with it.
 */

/* Small gold line above the headline — the announcement itself. */
export const KICKER = "New · from your masjid";

/* The headline, over two lines. Big, cream, and plainly an introduction. */
export const LEAD_1 = "Introducing the";
export const LEAD_2 = "Taiyabah Masjid app.";

/* The line the App Store screenshots already lead with. It earns its place as
   the supporting line rather than the headline now: the headline announces,
   this says why it is worth having. */
export const TAG = "Times from the masjid. Not from an algorithm.";

export const BLURB =
  "Everything that used to mean a phone call or a look at the noticeboard — " +
  "now in your pocket, and free for everybody.";

/* Three claims, each of which must stay true. "Works offline" is the cached
   timetable and the local reminders; "no adverts" and "nothing tracked" are
   the absence of any analytics, advertising or tracking service in the build,
   which docs/app-review-reply.md states to Apple in those words. */
export const PILLS = ["Free", "No adverts", "Works offline"];

export const THINGS = [
  "Jamāʿah times, straight from the masjid",
  "A quiet reminder before every adhān",
  "Notices the moment they go up",
  "The Qur’ān, with English alongside it",
  "Qibla compass and a Zakat calculator",
  "Donate, book the hall, pay madrasah fees",
];

export const SCAN_HEAD = "Download it free, today";
export const SCAN_SUB = "Open your camera and point it at the square";

/* The two stores, and only the two stores. There is a third way to open this
   app — the web build — and it is deliberately NOT here: that host is a
   working address for building and testing, not somewhere to send the
   congregation, and it has been obsolete as a way in since the Android and
   iOS apps shipped. Do not add it back. The keys name entries in
   scripts/lib/app-poster-qr.mjs. */
/* badge: Apple's and Google's own artwork, unmodified — see the README beside
   the files. width: the two are NOT the same number, on purpose. Apple's SVG
   is tight to the badge; Google's PNG carries its required clear space and an
   outline inside the image, so an equal width would print a visibly smaller
   Google badge. These two widths make them read as the same size, which is
   what Apple's guidelines ask for when badges appear together. */
export const WAYS = [
  { key: "appstore", kicker: "iPhone & iPad", name: "App Store",
    badge: "docs/store-assets/poster/badges/app-store.svg",   width: 36 },
  { key: "play",     kicker: "Android",       name: "Google Play",
    badge: "docs/store-assets/poster/badges/google-play.png", width: 41.8 },
];

/* The masjid's own public details — not a person's. See CLAUDE.md. */
export const MASJID = "Taiyabah Masjid · 31a Draycott Street, Bolton BL1 8HD · info@taiyabahmasjid.com";
export const CHARITY = "Bolton Central Islamic Society · Registered charity 1041569";

/* The app's home screen, as the smoke run photographed it on a real Android
   emulator. Replacing it is how the poster stays current when the home screen
   changes; the fingerprint notices if it is replaced without rebuilding. */
export const SHOT = "docs/store-assets/poster/app-home.png";
