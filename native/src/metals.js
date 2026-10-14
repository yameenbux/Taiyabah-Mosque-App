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
 * This is the website's own mechanism, source for source: the same routes in
 * the same order, the same sanity ranges, the same cache of the last good
 * figures, and the same willingness to use yesterday's price rather than
 * nothing — with the masjid's own server tried ahead of all of them.
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

/* The masjid's own Worker, which asks the providers on everyone's behalf and
 * keeps the answer. Tried FIRST, because a phone is refused by a bullion API
 * far more often than a server is — user-agent filtering, a captive portal, an
 * operator's DNS — and when all three refused, the one screen whose job is to
 * tell somebody whether they are over the nisab could only ask them to go and
 * look the price up themselves. The direct routes below are kept, so the
 * Worker being down is no worse than it was before the Worker existed. */
const SENDER = "https://taiyabah-sender.yameenbux.workers.dev";

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

/* The browser sends an Accept header and these providers answer browsers all
 * day — the masjid's own website fetches the same three and fills its
 * calculator in. A bare request from a phone is the thing they have never
 * seen, so it is worth not looking stranger than necessary. */
const HEAD = { Accept: "application/json" };

async function fetchJSON(url, ms = 8000) {
  const c = new AbortController();
  const timer = setTimeout(() => c.abort(), ms);
  try {
    const r = await fetch(url, { signal: c.signal, headers: HEAD });
    if (!r.ok) throw new Error("HTTP " + r.status);
    return await r.json();
  } finally { clearTimeout(timer); }
}

/* Why each route failed, in the order they were tried.
 *
 * "Couldn't fetch today's price" is true and useless: it cannot tell apart a
 * provider refusing this app, a phone with no route to it, and a figure that
 * arrived and was rejected for being implausible. Those want three different
 * fixes, and the only person who can see which one it is is holding the
 * phone. So the reason is carried out of here and shown under the message. */
const host = u => { try { return String(u).split("/")[2]; } catch { return String(u); } };
const why = e => {
  const m = String((e && e.message) || e);
  return m === "Aborted" || /abort/i.test(m) ? "timed out" : m;
};

async function firstSane(sources, range, log) {
  for (const src of sources) {
    try {
      const v = Number(src.pick(await fetchJSON(src.url)));
      if (inRange(v, range)) return v;
      log.push(`${host(src.url)}: ${Number.isFinite(v) ? `${v} is out of range` : "no figure in the reply"}`);
    } catch (e) { log.push(`${host(src.url)}: ${why(e)}`); }
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
  const tried = [];

  /* 1. the masjid's server, which has asked on our behalf and remembered */
  try {
    const d = await fetchJSON(`${SENDER}/api/metals`);
    const gold = Number(d && d.gold), silver = Number(d && d.silver);
    if (inRange(gold, SANE.goldG) && inRange(silver, SANE.silverG)) {
      const at = new Date(Number(d.at) || Date.now());
      write(LAST_PRICE, { gold, silver, at: at.getTime() });
      return { ok: true, gold, silver, at, stale: !!d.stale };
    }
    tried.push(`the masjid's server: ${(d && d.error) || "no figure in the reply"}`);
  } catch (e) { tried.push(`the masjid's server: ${why(e)}`); }

  /* 2. both metals, already in pounds */
  try {
    const d = await fetchJSON(GBP_URL);
    const it = d?.items?.[0];
    if (it) {
      const gold = Number(it.xauPrice) / TROY_OZ_G, silver = Number(it.xagPrice) / TROY_OZ_G;
      if (inRange(gold, SANE.goldG) && inRange(silver, SANE.silverG)) {
        const at = new Date();
        write(LAST_PRICE, { gold, silver, at: at.getTime() });
        return { ok: true, gold, silver, at, stale: false };
      }
      tried.push(`${host(GBP_URL)}: the figures are out of range`);
    } else tried.push(`${host(GBP_URL)}: nothing in the reply`);
  } catch (e) { tried.push(`${host(GBP_URL)}: ${why(e)}`); }

  /* 3. dollars an ounce, converted */
  const [goldOz, silverOz, freshRate] = await Promise.all([
    firstSane(GOLD_SOURCES, SANE.goldOz, tried),
    firstSane(SILVER_SOURCES, SANE.silverOz, tried),
    firstSane(FX_SOURCES, SANE.fx, tried),
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
      return { ok: true, gold, silver, at, stale: false };
    }
  }

  /* 4. whatever was good last time */
  const last = await lastGoodPrices();
  if (last) return { ok: true, ...last, stale: true };
  return { ok: false, reason: tried.join(" · ") };
}
