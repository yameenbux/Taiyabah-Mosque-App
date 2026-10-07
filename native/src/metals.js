/* Today's gold and silver price, for the nisab.
 * Copyright (c) 2026 Yameen Bux. All rights reserved. See LICENSE.md.
 *
 * THE WEBSITE LOOKS THIS UP FOR YOU AND THE APP WAS MAKING PEOPLE GO AND FIND
 * IT. On taiyabahmasjid.com the zakat calculator fetches the metal price,
 * fills the box in, says where the figure came from and when, and only asks
 * you to type one in when every source has failed. The app shipped with an
 * empty box and a link, so the single most useful thing that screen does —
 * telling you whether you are over the nisab — needed a trip to a bullion
 * site first.
 *
 * This is the website's own mechanism, source for source: the same three
 * routes in the same order, the same sanity ranges, the same cache of the
 * last good figures, and the same willingness to use yesterday's price rather
 * than nothing.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";

const TROY_OZ_G = 31.1034768;

/* Wide enough for years of movement and narrow enough to catch a provider
 * that has changed its units, or started answering with an error page that
 * happens to parse as a number. */
const SANE = { goldOz: [500, 20000], silverOz: [3, 500], fx: [0.4, 1.6],
               goldG: [15, 700], silverG: [0.05, 20] };

const LAST_PRICE = "zakat.lastPrice";
const LAST_FX    = "zakat.lastRate";
const MAX_DAYS   = 7;

/* Both metals in one call and already in pounds, so it needs no exchange rate
 * at all — worth trying first, and worth having when the rate is what is
 * missing. */
const GBP_URL = "https://data-asg.goldprice.org/dbXRates/GBP";

const GOLD_SOURCES   = [{ url: "https://api.gold-api.com/price/XAU", pick: d => d?.price }];
const SILVER_SOURCES = [{ url: "https://api.gold-api.com/price/XAG", pick: d => d?.price }];
const FX_SOURCES = [
  { url: "https://api.frankfurter.app/latest?from=USD&to=GBP", pick: d => d?.rates?.GBP },
  { url: "https://api.frankfurter.dev/v1/latest?base=USD&symbols=GBP", pick: d => d?.rates?.GBP },
  { url: "https://open.er-api.com/v6/latest/USD", pick: d => d?.rates?.GBP },
  { url: "https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json",
    pick: d => d?.usd?.gbp },
];

const inRange = (v, [lo, hi]) => Number.isFinite(v) && v >= lo && v <= hi;

async function fetchJSON(url, ms = 6000) {
  const c = new AbortController();
  const timer = setTimeout(() => c.abort(), ms);
  try {
    const r = await fetch(url, { signal: c.signal, cache: "no-store" });
    if (!r.ok) throw new Error("HTTP " + r.status);
    return await r.json();
  } finally { clearTimeout(timer); }
}

async function firstSane(sources, range) {
  for (const src of sources) {
    try {
      const v = Number(src.pick(await fetchJSON(src.url)));
      if (inRange(v, range)) return v;
    } catch { /* next one */ }
  }
  return null;
}

const read = async (k, d = null) => {
  try { const v = await AsyncStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; }
};
const write = (k, v) => AsyncStorage.setItem(k, JSON.stringify(v)).catch(() => {});

/* A nisab from this morning is still a nisab. Only when there is nothing at
 * all is the reader asked to type a price in. */
async function lastGoodPrices() {
  const v = await read(LAST_PRICE);
  if (!v || !inRange(Number(v.gold), SANE.goldG) || !inRange(Number(v.silver), SANE.silverG)) return null;
  const at = new Date(Number(v.at) || 0);
  if (Date.now() - at.getTime() > MAX_DAYS * 864e5) return null;   // too old to stand for today
  return { gold: Number(v.gold), silver: Number(v.silver), at };
}

/* Returns { gold, silver, at, stale } in pounds per GRAM, or null when every
 * route has failed and there is nothing remembered either. */
export async function fetchMetalPrices() {
  /* 1. both metals, already in pounds */
  try {
    const d = await fetchJSON(GBP_URL);
    const it = d?.items?.[0];
    if (it) {
      const gold = Number(it.xauPrice) / TROY_OZ_G, silver = Number(it.xagPrice) / TROY_OZ_G;
      if (inRange(gold, SANE.goldG) && inRange(silver, SANE.silverG)) {
        const at = new Date();
        write(LAST_PRICE, { gold, silver, at: at.getTime() });
        return { gold, silver, at, stale: false };
      }
    }
  } catch { /* fall through to the dollar route */ }

  /* 2. dollars an ounce, converted */
  const [goldOz, silverOz, freshRate] = await Promise.all([
    firstSane(GOLD_SOURCES, SANE.goldOz),
    firstSane(SILVER_SOURCES, SANE.silverOz),
    firstSane(FX_SOURCES, SANE.fx),
  ]);
  if (freshRate) write(LAST_FX, { rate: freshRate, at: Date.now() });

  /* The rate is the piece most likely to be missing, and the piece that
   * matters least: pounds and dollars move by about a percent in a week,
   * where the metal itself can do that in a day. So a rate from the last few
   * days is allowed to convert today's price rather than throwing it away. */
  let rate = freshRate;
  if (!rate) {
    const v = await read(LAST_FX);
    if (v && inRange(Number(v.rate), SANE.fx) && Date.now() - Number(v.at) <= 7 * 864e5)
      rate = Number(v.rate);
  }
  if (goldOz && silverOz && rate) {
    const gold = (goldOz / TROY_OZ_G) * rate, silver = (silverOz / TROY_OZ_G) * rate;
    if (inRange(gold, SANE.goldG) && inRange(silver, SANE.silverG)) {
      const at = new Date();
      write(LAST_PRICE, { gold, silver, at: at.getTime() });
      return { gold, silver, at, stale: false };
    }
  }

  /* 3. whatever was good last time */
  const last = await lastGoodPrices();
  return last ? { ...last, stale: true } : null;
}
