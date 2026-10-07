/**
 * Taiyabah Masjid — one column, however wide the glass.
 * Copyright (c) 2026 Yameen Bux. All rights reserved. See LICENSE.md.
 *
 * This is not a tablet DESIGN. It is the website's own rule, which the app had
 * never implemented because a phone is narrower than the cap and so the cap
 * never showed:
 *
 *     body { max-width: 520px; margin-inline: auto }
 *
 * The web app has said that from the first release, and says it again on the
 * sheet panel and on the tab bar. Open the website on an iPad and you get a
 * centred column on the paper; open the app and you got a phone layout pulled
 * to 1024px, with lines of body text three times the length anyone can
 * comfortably read and a row of twelve service tiles smeared across the top.
 *
 * So the iPad layout is not a new design to be invented and argued about. It
 * is the design that already exists, finally reaching the width where it
 * matters — which is also the only reading of "the spitting image of the
 * Android app" that survives a 12.9-inch screen.
 */
export const COLUMN = 520;

/* A centred column, capped. Spread onto whatever holds the content. */
export const column = { width: "100%", maxWidth: COLUMN, alignSelf: "center" };

/* react-native's own useWindowDimensions is the honest source for this: it
 * updates on rotation and on an iPad split view, which a one-off read of
 * Dimensions.get() does not. */
export const isWide = width => width > COLUMN;
