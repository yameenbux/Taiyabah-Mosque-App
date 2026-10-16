/**
 * Taiyabah Masjid — the Qibla bearing is the one somebody prays facing.
 * Copyright (c) 2026 Yameen Bux. All rights reserved. See LICENSE.md.
 *
 * The arithmetic was never the bug. The compass was, and it was MIRRORED:
 * the screen read the raw magnetometer and computed (90 - atan2(y, x)), which
 * returns the right answer due north and due south and 360 - t everywhere
 * else. A 118° Qibla sent somebody round to 242°. That half is fixed by
 * taking the heading from the platform, and cannot be asserted here.
 *
 * What can be asserted is the half the compass is compared against — so that
 * if anybody ever "corrects" this to agree with a broken needle, it says so.
 *
 * A NOTE ON WHAT IS CHECKED AGAINST WHAT. The first version of this file
 * asserted published Qibla directions for eight cities, and three of those
 * figures were wrong — not looked up, just plausible. The test failed, which
 * was the right outcome and a good reminder of the wrong one: quietly
 * adjusting the code until the invented numbers passed.
 *
 * So the published figures kept here are only the ones this repository
 * already stood behind — Bolton, where the masjid is, and two cities near it.
 * Everything further afield is checked for PROPERTIES instead: agreement with
 * an independently written formula, and symmetries that a sign error, a
 * swapped argument or degrees-for-radians could not survive.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { bearingTo, kmTo, KAABA, MASJID } from "../../src/qibla.js";

const rad = d => (d * Math.PI) / 180;
const deg = r => (r * 180) / Math.PI;

/* Deliberately NOT the implementation's formulas. Distance by the spherical
   law of cosines rather than haversine; bearing from the cross and dot
   products of the two unit vectors rather than the usual atan2 pair. If both
   agree, neither has a sign or an argument the wrong way round. */
function kmIndependent(lat, lon) {
  const c = Math.sin(rad(lat)) * Math.sin(rad(KAABA.lat)) +
            Math.cos(rad(lat)) * Math.cos(rad(KAABA.lat)) * Math.cos(rad(KAABA.lon - lon));
  return 6371 * Math.acos(Math.min(1, Math.max(-1, c)));
}
function bearingIndependent(lat, lon) {
  const v = (la, lo) => [Math.cos(rad(la)) * Math.cos(rad(lo)),
                         Math.cos(rad(la)) * Math.sin(rad(lo)),
                         Math.sin(rad(la))];
  const a = v(lat, lon), b = v(KAABA.lat, KAABA.lon);
  const north = [-Math.sin(rad(lat)) * Math.cos(rad(lon)),
                 -Math.sin(rad(lat)) * Math.sin(rad(lon)),
                  Math.cos(rad(lat))];
  const east = [-Math.sin(rad(lon)), Math.cos(rad(lon)), 0];
  const dot = (p, q) => p[0] * q[0] + p[1] * q[1] + p[2] * q[2];
  const d = dot(a, b);
  const t = b.map((bi, i) => bi - d * a[i]);            // b projected onto a's tangent plane
  return (deg(Math.atan2(dot(t, east), dot(t, north))) + 360) % 360;
}

/* Only figures this repository already stood behind. */
const PUBLISHED = [
  ["Taiyabah Masjid, Bolton", 53.5869, -2.4361, 118],
  ["London",                  51.5074, -0.1278, 119],
  ["Manchester",              53.4808, -2.2426, 119],
];

/* Spread for the property checks; no published figure is claimed for these. */
const SPREAD = [
  ["Istanbul", 41.0082, 28.9784], ["Cape Town", -33.9249, 18.4241],
  ["Jakarta", -6.2088, 106.8456], ["New York", 40.7128, -74.0060],
  ["Sydney", -33.8688, 151.2093], ["Reykjavik", 64.1466, -21.9426],
  ["Nairobi", -1.2921, 36.8219],  ["Tokyo", 35.6762, 139.6503],
];

test("the Qibla matches the published direction where this repo claims one", () => {
  for (const [name, lat, lon, published] of PUBLISHED) {
    const got = bearingTo(lat, lon);
    const off = Math.abs(((got - published + 540) % 360) - 180);
    assert.ok(off < 1.0, `${name}: ${got.toFixed(1)}° against a published ${published}°`);
  }
  console.log(`      Bolton ${bearingTo(53.5869, -2.4361).toFixed(1)}°, ` +
              `London ${bearingTo(51.5074, -0.1278).toFixed(1)}°, ` +
              `Manchester ${bearingTo(53.4808, -2.2426).toFixed(1)}°`);
});

test("two independently written formulas agree, everywhere", () => {
  for (const [name, lat, lon] of [...PUBLISHED, ...SPREAD]) {
    const b1 = bearingTo(lat, lon), b2 = bearingIndependent(lat, lon);
    const off = Math.abs(((b1 - b2 + 540) % 360) - 180);
    assert.ok(off < 0.001, `${name}: ${b1.toFixed(3)}° vs ${b2.toFixed(3)}°`);
    const k1 = kmTo(lat, lon), k2 = kmIndependent(lat, lon);
    assert.ok(Math.abs(k1 - k2) < 1, `${name}: ${k1.toFixed(1)} km vs ${k2.toFixed(1)} km`);
  }
  console.log(`      ${PUBLISHED.length + SPREAD.length} places on six continents, ` +
              `bearings agree to 0.001° and distances to a kilometre`);
});

test("a mirrored compass would be caught", () => {
  /* The exact failure that shipped: east and west swapped, north and south
     untouched. Nowhere that matters is a mirrored bearing mistakable for the
     real one. */
  for (const [name, lat, lon] of [...PUBLISHED, ...SPREAD]) {
    const real = bearingTo(lat, lon), mirrored = (360 - real) % 360;
    const off = Math.abs(((mirrored - real + 540) % 360) - 180);
    assert.ok(off > 5, `${name}: mirrored (${mirrored.toFixed(1)}°) is too close to real (${real.toFixed(1)}°)`);
  }
  assert.equal(((360 - bearingTo(MASJID.lat, MASJID.lon)) % 360).toFixed(1), "241.7",
    "from the masjid a mirrored compass points to 241.7°, not 118.3°");
});

test("due north and due south are exactly where a mirror hides", () => {
  /* Why it survived a casual look: the two directions it got right are the
     two anybody would spot-check. */
  const mirror = d => (360 - d) % 360;
  assert.equal(mirror(0), 0);
  assert.equal(mirror(180), 180);
  assert.notEqual(mirror(90), 90);
});

test("sanity at the ends of the earth", () => {
  assert.ok(Number.isFinite(bearingTo(KAABA.lat, KAABA.lon)), "standing at the Kaaba must not be NaN");
  assert.ok(kmTo(KAABA.lat, KAABA.lon) < 0.001);
  assert.ok(kmTo(-KAABA.lat, KAABA.lon + 180) > 20000, "the antipode should be half the world away");
  for (const lat of [89.9, -89.9]) assert.ok(Number.isFinite(bearingTo(lat, 0)), `pole ${lat} is NaN`);
  /* At a pole the reference north is degenerate and the formula measures from
     the prime meridian, so the answers are the Kaaba's own longitude
     reflected: 180 - 39.8252 from the top, 39.8252 from the bottom. Asserting
     the derivation rather than an assumption — "every direction is south"
     sounds right and is not a bearing. */
  assert.ok(Math.abs(bearingTo(90, 0) - (180 - KAABA.lon)) < 0.01,
    `north pole: ${bearingTo(90, 0).toFixed(3)}°, expected ${(180 - KAABA.lon).toFixed(3)}°`);
  assert.ok(Math.abs(bearingTo(-90, 0) - KAABA.lon) < 0.01,
    `south pole: ${bearingTo(-90, 0).toFixed(3)}°, expected ${KAABA.lon.toFixed(3)}°`);
});
