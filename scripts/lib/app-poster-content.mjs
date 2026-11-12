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

/* Small gold line above the headline — the announcement. It is the KICKER
   and not the headline on purpose. A poster on a foyer wall gets about three
   seconds at three metres, and whatever is biggest is the only thing most
   people read. "Introducing the Taiyabah Masjid app" is a product name; it
   tells somebody what this is but gives them no reason to reach for their
   phone. So the name goes up here, small, and the reason goes below, big. */
export const KICKER = "Introducing the Taiyabah Masjid app";

/* The headline, over two lines. These are the words the App Store screenshots
   already lead with, and they are the best line anybody has written for this
   app: a point of view, not a feature list. They were the secondary line on
   the first draft of this poster, at a third of the size — which is the wrong
   way round, and the single change most likely to turn a glance into an
   install. */
export const LEAD_1 = "Times from the masjid.";
export const LEAD_2 = "Not from an algorithm.";

export const BLURB =
  "The masjid’s own app — free, for iPhone and Android.";

/* Three claims, each of which must stay true. "Works offline" is the cached
   timetable and the local reminders; "no adverts" and "nothing tracked" are
   the absence of any analytics, advertising or tracking service in the build,
   which docs/app-review-reply.md states to Apple in those words. */
export const PILLS = ["Free", "No adverts", "Works offline"];

/* FOUR, NOT SIX. Standing in a foyer nobody reads six lines, and every line
   added is a line everything else has to shrink for. The three that went are
   not gone from the app — they are the reasons somebody KEEPS it, which is
   the store listing's job, not a poster's. */
export const THINGS = [
  "Jamāʿah times, straight from the masjid",
  "A quiet reminder before every adhān",
  "Notices the moment they go up",
  "Qur’ān, Qibla, Zakat and giving — in one place",
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
    badge: "docs/store-assets/poster/badges/app-store.svg",   width: 44 },
  { key: "play",     kicker: "Android",       name: "Google Play",
    badge: "docs/store-assets/poster/badges/google-play.png", width: 51 },
];

/* THERE IS NO SALAM ON THIS POSTER. There was one under the logo and it is
   gone: the logo already carries مسجد طيبة in the same gold, so the greeting
   repeated the one Arabic note on the page instead of adding to it, and it
   pushed the announcement a centimetre and a half down the sheet. The app's
   home screen opens with the full greeting; a poster does not need to.

   The masjid's own public details — not a person's. See CLAUDE.md. */
export const MASJID = "Taiyabah Masjid · 31a Draycott Street, Bolton BL1 8HD · info@taiyabahmasjid.com";
export const CHARITY = "Bolton Central Islamic Society · Registered charity 1041569";

/* The app's home screen, as the smoke run photographed it on a real Android
   emulator. Replacing it is how the poster stays current when the home screen
   changes; the fingerprint notices if it is replaced without rebuilding. */
export const SHOT = "docs/store-assets/poster/app-home.png";
