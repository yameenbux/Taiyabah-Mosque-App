/**
 * Taiyabah Masjid — where Makkah is from here.
 * Copyright (c) 2026 Yameen Bux. All rights reserved. See LICENSE.md.
 *
 * Pure, and importing nothing, so plain Node can check it — the same reason
 * activity-plan.js is separate from the module that talks to ActivityKit.
 * This is the one number in the app that somebody prays facing, so it is
 * worth being able to assert rather than to eyeball.
 *
 * The bearing is the INITIAL bearing of the great circle, which is what every
 * published Qibla direction means and what a compass needle should match. It
 * is a true bearing, measured from true north, so whatever it is compared
 * against has to be a true heading too — see the note in screens/Qibla.jsx
 * about why the magnetometer was the wrong source for that.
 */

/** The Kaaba. */
export const KAABA = { lat: 21.4224779, lon: 39.8251832 };

/** The masjid, used when there is no position of your own. */
export const MASJID = { lat: 53.5869, lon: -2.4361 };

const rad = d => (d * Math.PI) / 180;

/** Initial great-circle bearing from a point to the Kaaba, degrees true. */
export function bearingTo(lat, lon) {
  const p1 = rad(lat), p2 = rad(KAABA.lat), dl = rad(KAABA.lon - lon);
  const y = Math.sin(dl) * Math.cos(p2);
  const x = Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dl);
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}

/** Great-circle distance to the Kaaba, kilometres. */
export function kmTo(lat, lon) {
  const R6 = 6371, p1 = rad(lat), p2 = rad(KAABA.lat);
  const dp = rad(KAABA.lat - lat), dl = rad(KAABA.lon - lon);
  const a = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
  return 2 * R6 * Math.asin(Math.sqrt(a));
}
