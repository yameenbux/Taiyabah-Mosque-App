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

/* Past about 1.5 the prayer table stops fitting five columns on a phone and
 * the tab bar's labels start to clip. */
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
