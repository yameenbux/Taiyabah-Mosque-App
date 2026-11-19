/* How big the text actually gets.
 * Copyright (c) 2026 Yameen Bux. All rights reserved. See LICENSE.md.
 *
 * Its own module, with no imports, because it is arithmetic that decides
 * whether the app is readable and it had no test under it. React Native
 * applies the phone's font setting on top of whatever fontSize it is handed,
 * and this app has a text-size control of its own because the website does —
 * so the two used to MULTIPLY. Android at its largest with "Extra large"
 * chosen here drew 16px text at 45px.
 */

/* The text does not grow past 1.5×, and that is a decision, not an oversight.
 *
 * WCAG 1.4.4 asks that text reach 200% without loss of content; this reaches
 * 150%, and the gap is deliberate. Rendered at 2.0× (ceiling lifted, on a
 * 402pt phone), nothing is LOST — every screen still scrolls to all of its
 * content — but the flagship screens strain in ways that make them harder to
 * read, not easier: the prayer table's column headings split mid-word
 * (BEGINNIN/G, JAMĀʿA/H), a filter chip clips off the right edge, the Arabic
 * beside a prayer name wraps a single word across two lines, and the bottom
 * tab labels wrap. For an app whose whole job is to show a prayer time at a
 * glance, a prayer table that has fallen apart at 2.0× serves the person who
 * needs large text worse than one capped at 1.5× that is still a table.
 *
 * So the ceiling holds the text where the layout stays intact. It is NOT a
 * floor: wantedScale() never returns LESS than the phone asked for up to this
 * cap, so somebody who has set a large OS font still gets it. Raising this
 * number is a real change — it needs the prayer table and strip, the tab bar
 * and the header chips reflowing gracefully first, screen by screen — not a
 * one-line edit. */
export const SCALE_CEILING = 1.5;

/* The bigger of the two wins, never the product.
 *
 * It never returns LESS than the phone asked for: somebody who has told
 * Android they need large text has said something about their eyesight, and
 * no in-app setting should quietly undo it. The control in the app can still
 * take them above it. */
export function wantedScale(chosen, osScale) {
  const os = Number.isFinite(osScale) && osScale > 0 ? osScale : 1;
  const app = Number.isFinite(chosen) && chosen > 0 ? chosen : 1;
  return Math.min(Math.max(os, app), SCALE_CEILING);
}

/* What to hand React Native so that the text ends up at `wanted`. It is about
 * to multiply by the phone's scale, so that is divided out here. */
export function fontSize(n, chosen, osScale) {
  const os = Number.isFinite(osScale) && osScale > 0 ? osScale : 1;
  return Math.round(n * wantedScale(chosen, os) / os);
}
