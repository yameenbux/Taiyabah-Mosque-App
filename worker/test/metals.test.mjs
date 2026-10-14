/**
 * Taiyabah Masjid — the nisab is in the right units.
 * Copyright (c) 2026 Yameen Bux. All rights reserved. See LICENSE.md.
 *
 * Every provider quotes a troy ounce; the calculator works in grams. There are
 * 31.1034768 grams in a troy ounce, so getting this wrong does not produce an
 * error — it produces a nisab thirty-one times too big or too small, in a
 * screen whose whole job is to tell somebody whether they owe zakat. Nothing
 * about the page would look broken.
 *
 * So gramPrices() is pure and checked here: the conversion, the order the
 * sources are preferred in, and the sanity ranges that exist to catch a
 * provider which has quietly changed its units or started answering with an
 * error page that happens to parse as a number.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { gramPrices } from "../worker.js";

const OZ = 31.1034768;
const near = (a, b) => Math.abs(a - b) < 1e-9;

test("pounds an ounce become pounds a gram", () => {
  const r = gramPrices({ gbp: { xauPrice: 1987.5, xagPrice: 25.82 } });
  assert.ok(r, "a plausible quote was rejected");
  assert.ok(near(r.gold, 1987.5 / OZ), `gold: ${r.gold}`);
  assert.ok(near(r.silver, 25.82 / OZ), `silver: ${r.silver}`);
  assert.equal(r.source, "goldprice.org");
  /* And the figure a person would recognise. */
  assert.ok(r.gold > 60 && r.gold < 70, `£${r.gold.toFixed(2)}/g is not a gold price`);
});

test("dollars an ounce are converted, then turned into grams", () => {
  const r = gramPrices({ goldOz: 2600, silverOz: 31, rate: 0.79 });
  assert.ok(r);
  assert.ok(near(r.gold, (2600 / OZ) * 0.79));
  assert.equal(r.source, "gold-api.com");
});

test("the already-in-pounds source wins when both answered", () => {
  const r = gramPrices({
    gbp: { xauPrice: 1987.5, xagPrice: 25.82 },
    goldOz: 2600, silverOz: 31, rate: 0.79,
  });
  assert.equal(r.source, "goldprice.org", "the route needing no exchange rate is preferred");
});

test("a provider that switched to grams is refused, not believed", () => {
  /* The failure this range exists for: a source starts quoting per gram, the
     divide happens anyway, and the nisab silently drops to a thirty-first of
     itself. £63.90 is a real gold price PER GRAM — divided again it is £2.05,
     which is below the floor and must be rejected. */
  assert.equal(gramPrices({ gbp: { xauPrice: 63.9, xagPrice: 0.83 } }), null);
});

test("an exchange rate that is not an exchange rate is refused", () => {
  assert.equal(gramPrices({ goldOz: 2600, silverOz: 31, rate: 50 }), null);
  assert.equal(gramPrices({ goldOz: 2600, silverOz: 31, rate: 0 }), null);
});

test("an error page that parses as a number is refused", () => {
  assert.equal(gramPrices({ gbp: { xauPrice: "not a price", xagPrice: 25.82 } }), null);
  assert.equal(gramPrices({ gbp: { xauPrice: 0, xagPrice: 0 } }), null);
  assert.equal(gramPrices({ goldOz: 1e9, silverOz: 31, rate: 0.79 }), null);
});

test("half an answer is no answer", () => {
  /* Gold without silver cannot produce a silver nisab, and a calculator that
     offers the silver standard must not fill it from nowhere. */
  assert.equal(gramPrices({ goldOz: 2600, rate: 0.79 }), null);
  assert.equal(gramPrices({ silverOz: 31, rate: 0.79 }), null);
  assert.equal(gramPrices({ goldOz: 2600, silverOz: 31 }), null);
  assert.equal(gramPrices({}), null);
});

test("a dead source does not poison a live one", () => {
  /* goldprice.org answering with nonsense must fall through to the dollar
     route rather than failing the whole request — which is the shape of the
     fault that left the screen empty in the first place. */
  const r = gramPrices({
    gbp: { xauPrice: null, xagPrice: null },
    goldOz: 2600, silverOz: 31, rate: 0.79,
  });
  assert.ok(r, "a usable second source was thrown away");
  assert.equal(r.source, "gold-api.com");
});
