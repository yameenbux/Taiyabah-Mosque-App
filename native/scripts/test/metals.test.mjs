/**
 * Taiyabah Masjid — the zakat calculator fills its own price box in.
 * Copyright (c) 2026 Yameen Bux. All rights reserved. See LICENSE.md.
 *
 * The one thing that screen is for is telling somebody whether they are over
 * the nisab, and it cannot do that without a price. When every route fails it
 * asks them to go and look one up — the errand the screen exists to save.
 *
 * It has four routes for that reason, and the order matters: the masjid's own
 * server first (it has asked on everyone's behalf and kept the answer), then
 * the two direct ones, then whatever was good last time. What is tested here
 * is that a dead route falls through to a live one instead of taking the
 * screen down with it, which is the shape of the fault reported from the
 * field — the website's calculator fills in happily while the app says it
 * could not fetch anything.
 */
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { fetchMetalPrices } from "../../src/metals.js";
import { __reset } from "./stubs/async-storage.mjs";

const OZ = 31.1034768;
const json = body => ({ ok: true, status: 200, json: async () => body });
const dead = status => ({ ok: false, status, json: async () => ({}) });

/* Each test says what every host answers; anything unlisted refuses. */
function serve(routes) {
  globalThis.fetch = async url => {
    for (const [needle, reply] of Object.entries(routes))
      if (String(url).includes(needle)) {
        if (reply instanceof Error) throw reply;
        return reply;
      }
    return dead(403);
  };
}

beforeEach(() => __reset());

test("the masjid's server is asked first and believed", async () => {
  serve({ "/api/metals": json({ gold: 63.9, silver: 0.83, at: Date.now(), stale: false }) });
  const r = await fetchMetalPrices();
  assert.equal(r.ok, true);
  assert.equal(r.gold, 63.9);
  assert.equal(r.stale, false);
});

test("a stale figure from the masjid is used, and says so", async () => {
  serve({ "/api/metals": json({ gold: 63.9, silver: 0.83, at: Date.now() - 2 * 864e5, stale: true }) });
  const r = await fetchMetalPrices();
  assert.equal(r.ok, true);
  assert.equal(r.stale, true, "a remembered price must not be presented as live");
});

test("the server being down falls through to the direct route", async () => {
  serve({
    "/api/metals": dead(503),
    "goldprice.org": json({ items: [{ xauPrice: 1987.5, xagPrice: 25.82 }] }),
  });
  const r = await fetchMetalPrices();
  assert.equal(r.ok, true);
  assert.ok(Math.abs(r.gold - 1987.5 / OZ) < 1e-9, "ounces were not converted to grams");
});

test("both of those failing still reaches the dollar route", async () => {
  serve({
    "/api/metals": dead(503),
    "goldprice.org": dead(403),
    "XAU": json({ price: 2600 }),
    "XAG": json({ price: 31 }),
    "frankfurter": json({ rates: { GBP: 0.79 } }),
  });
  const r = await fetchMetalPrices();
  assert.equal(r.ok, true);
  assert.ok(Math.abs(r.gold - (2600 / OZ) * 0.79) < 1e-9);
});

test("yesterday's price is used rather than nothing", async () => {
  serve({ "/api/metals": json({ gold: 63.9, silver: 0.83, at: Date.now(), stale: false }) });
  await fetchMetalPrices();                       // remembers it
  serve({});                                      // now everything refuses
  const r = await fetchMetalPrices();
  assert.equal(r.ok, true, "a remembered price was thrown away");
  assert.equal(r.stale, true);
});

test("when everything fails it says WHICH route failed and why", async () => {
  /* The reported fault is indistinguishable from three different causes
     without this, and only the person holding the phone can see it. */
  serve({});
  const r = await fetchMetalPrices();
  assert.equal(r.ok, false);
  assert.match(r.reason, /masjid/, "the server's failure is not named");
  assert.match(r.reason, /goldprice\.org/);
  assert.match(r.reason, /gold-api\.com/);
  assert.match(r.reason, /HTTP 403/, "the status code is what identifies a refusal");
});

test("a timeout is reported as a timeout, not as a blank", async () => {
  globalThis.fetch = async () => { const e = new Error("Aborted"); e.name = "AbortError"; throw e; };
  const r = await fetchMetalPrices();
  assert.equal(r.ok, false);
  assert.match(r.reason, /timed out/);
});

test("an implausible figure is refused rather than shown", async () => {
  /* A provider quietly switching to grams: £63.90 is a real price per gram,
     divided again it is £2.05, and a nisab built on that is nonsense. */
  serve({
    "/api/metals": dead(503),
    "goldprice.org": json({ items: [{ xauPrice: 63.9, xagPrice: 0.83 }] }),
  });
  const r = await fetchMetalPrices();
  assert.equal(r.ok, false);
  assert.match(r.reason, /out of range/);
});
