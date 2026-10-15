/**
 * Taiyabah Masjid — the usage counts answer the question and keep the promise.
 * Copyright (c) 2026 Yameen Bux. All rights reserved. See LICENSE.md.
 *
 * THE PROMISE UNDER TEST, in the words the congregation was given it: the
 * Qur'an and the rest "work without an account and without sending anything
 * about you anywhere", and there is "no tracking of any kind".
 *
 * That is not a thing to assert in a comment. The tests below take every row
 * this module can produce and check that there is nothing in one that could
 * be joined to a person — no identifier, no address, no agent string, no
 * free text at all, only a date, a name from a fixed list, a platform from a
 * fixed list, and a number. If somebody later adds a field, the shape test
 * fails rather than the promise quietly becoming untrue.
 *
 * The other half is that counting must never cost a reader their page. A
 * database that is down, a flush that throws, a URL nobody anticipated: none
 * of them may reach the person trying to read the Qur'an.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  FEATURES, PLATFORMS, FLUSH_AT, FLUSH_EVERY_MS,
  count, due, flush, featureOf, platformOf, dayKey, pending, reset, note,
} from "../src/usage.js";

const fresh = () => reset();

/* ── the promise ─────────────────────────────────────────────────────────── */

test("a row carries a date, a feature, a platform and a number — and nothing else", () => {
  fresh();
  count("mushaf", "ios");
  const [row] = pending();
  assert.deepEqual(Object.keys(row).sort(), ["day", "feature", "n", "platform"]);
  assert.match(row.day, /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(typeof row.n, "number");
});

test("nothing that identifies anybody can get into a row, however it is called", () => {
  fresh();
  /* Everything an attacker, or a careless caller, might try to smuggle in. */
  const nasty = ["192.168.1.7", "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0)",
                 "user-9f3a", "yameen@example.com", "../../etc/passwd",
                 "mushaf; drop table app_usage", "", null, undefined, {}, 42];
  for (const bad of nasty) {
    count(bad, "ios");                 /* as a feature */
    count("mushaf", bad);              /* as a platform */
  }
  for (const row of pending()) {
    assert.ok(FEATURES.has(row.feature), `feature "${row.feature}" is not on the allowlist`);
    assert.ok(PLATFORMS.has(row.platform), `platform "${row.platform}" is not on the allowlist`);
  }
  const text = JSON.stringify(pending());
  for (const bad of nasty.filter((b) => typeof b === "string" && b)) {
    if (bad === "mushaf") continue;
    assert.ok(!text.includes(bad), `"${bad}" reached a row`);
  }
});

test("an unknown platform becomes \"other\" rather than being dropped, so totals add up", () => {
  fresh();
  count("mushaf", "symbian");
  assert.deepEqual(pending().map((r) => r.platform), ["other"]);
});

test("the user agent decides the platform and is never itself recorded", () => {
  assert.equal(platformOf("okhttp/4.12.0"), "android");
  assert.equal(platformOf("Taiyabah/2.0 CFNetwork/1498 Darwin/23.2.0"), "ios");
  assert.equal(platformOf("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)"), "web");
  assert.equal(platformOf(""), "other");
  assert.equal(platformOf(undefined), "other");
  fresh();
  count("mushaf", platformOf("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)"));
  assert.ok(!JSON.stringify(pending()).includes("iPhone OS"));
});

/* ── what gets counted ───────────────────────────────────────────────────── */

test("the paths the question is about are counted", () => {
  assert.equal(featureOf("/quran/mushaf/madani/p/255.webp"), "mushaf");
  assert.equal(featureOf("/quran/hadith/bukhari/b/12.json"), "hadith");
  assert.equal(featureOf("/quran/hadith/bukhari/search.json"), "hadith");
  assert.equal(featureOf("/api/poster/1760000000-ab12cd34.jpg"), "poster");
  assert.equal(featureOf("/api/metals"), "metals");
  assert.equal(featureOf("/api/set-my-tags"), "prefs");
});

test("the admin and secret paths are not counted, on purpose", () => {
  /* Who sends a notice, and when somebody logs in, is not usage of the app by
     the congregation — and a login count is a thing worth not having. */
  /* /api/notice is the OFFICE publishing a notice, not anybody reading one.
     Counting it would read as congregation interest and mean the opposite. */
  for (const p of ["/api/notice", "/api/login", "/api/send", "/api/health", "/api/reports",
                   "/api/force-tag", "/api/check-tags", "/api/test-reminders",
                   "/", "/privacy.html", "/admin.html", "/nonsense"])
    assert.equal(featureOf(p), null, p);
});

test("a feature name cannot be invented by a crafted URL", () => {
  for (const p of ["/quran/mushaf/../../etc/passwd", "/api/metals?x=1&feature=evil",
                   "/quran/", "/quran/mushaf", "/api/poster", "/API/METALS"])
    assert.ok(featureOf(p) === null || FEATURES.has(featureOf(p)), p);
});

/* ── adding up ───────────────────────────────────────────────────────────── */

test("the same feature from the same platform on the same day is one row", () => {
  fresh();
  for (let i = 0; i < 120; i++) count("mushaf", "ios");
  assert.equal(pending().length, 1);
  assert.equal(pending()[0].n, 120);
});

test("different platforms are different rows, so the split is visible", () => {
  fresh();
  count("mushaf", "ios"); count("mushaf", "android"); count("mushaf", "ios");
  const rows = pending().sort((a, b) => a.platform.localeCompare(b.platform));
  assert.deepEqual(rows.map((r) => [r.platform, r.n]), [["android", 1], ["ios", 2]]);
});

test("a flush is due on volume, or on age, and not before", () => {
  fresh();
  const t0 = 1_000_000;
  assert.equal(due(t0), false, "nothing held, nothing due");
  for (let i = 0; i < FLUSH_AT - 1; i++) count("mushaf", "ios", t0);
  assert.equal(due(t0), false, "just under the threshold");
  count("mushaf", "ios", t0);
  assert.equal(due(t0), true, "at the threshold");

  fresh();
  count("mushaf", "ios", t0);
  assert.equal(due(t0 + FLUSH_EVERY_MS - 1), false, "a lone count, not yet old enough");
  assert.equal(due(t0 + FLUSH_EVERY_MS), true, "a lone count, old enough");
});

test("flushing empties the tally, so nothing is written twice", async () => {
  fresh();
  const sent = [];
  const rpc = async (_env, fn, args) => { sent.push([fn, args]); return { data: { ok: true } }; };
  count("mushaf", "ios"); count("metals", "web");
  const res = await flush({}, rpc);
  assert.equal(res.ok, true);
  assert.equal(res.rows, 2);
  assert.equal(sent.length, 1);
  assert.equal(sent[0][0], "bump_usage");
  assert.equal(sent[0][1].payload.rows.length, 2);
  assert.deepEqual(pending(), [], "the tally must be empty after a flush");
  assert.deepEqual(await flush({}, rpc), { ok: true, rows: 0 }, "a second flush writes nothing");
});

test("counts arriving during a flush belong to the next one, not to neither", async () => {
  fresh();
  count("mushaf", "ios");
  let during;
  const rpc = async () => { count("mushaf", "ios"); during = pending(); return { data: {} }; };
  await flush({}, rpc);
  assert.equal(during.length, 1, "the count made mid-flush is held");
  assert.equal(pending()[0].n, 1, "and is still held after the flush returns");
});

/* ── it must never cost anybody their page ───────────────────────────────── */

test("a database that refuses does not throw, and does not keep retrying", async () => {
  fresh();
  count("mushaf", "ios");
  const res = await flush({}, async () => ({ error: "503 upstream" }));
  assert.equal(res.ok, false);
  assert.match(res.error, /503/);
  assert.deepEqual(pending(), [], "a failed flush must not leave an ever-growing buffer");
});

test("an rpc that throws is swallowed", async () => {
  fresh();
  count("mushaf", "ios");
  const res = await flush({}, async () => { throw new Error("network down"); });
  assert.equal(res.ok, false);
  assert.deepEqual(pending(), []);
});

test("note() survives anything a route can hand it", () => {
  fresh();
  const req = (ua, url) => ({ url, headers: { get: () => ua } });
  assert.equal(note({}, null, req("okhttp", "https://x/quran/mushaf/a/p/1.webp"), null), true);
  assert.equal(note({}, null, req("okhttp", "https://x/api/login"), null), false);
  /* No request, no url, no headers, a broken ctx — none of it may throw. */
  assert.equal(note({}, null, null, null), false);
  assert.equal(note({}, {}, {}, null), false);
  assert.equal(note({}, { waitUntil: () => { throw new Error("nope"); } },
                    req("okhttp", "https://x/api/metals"), async () => ({})), true);
});

test("note() does not call the database on every request", () => {
  fresh();
  let flushes = 0;
  const ctx = { waitUntil: (p) => { flushes++; return p; } };
  const rpc = async () => ({ data: {} });
  const req = { url: "https://x/quran/mushaf/a/p/1.webp", headers: { get: () => "okhttp" } };
  for (let i = 0; i < FLUSH_AT - 1; i++) note({}, ctx, req, rpc);
  assert.equal(flushes, 0, `${FLUSH_AT - 1} requests should not have written anything`);
  note({}, ctx, req, rpc);
  assert.equal(flushes, 1, "the threshold should write exactly once");
});

test("the day is London's, because that is the day the masjid counts in", () => {
  /* 00:30 on 1 July in London is still 1 July; 23:30 UTC on 30 June is the
     1st of July in London, which is the case a UTC date gets wrong. */
  assert.equal(dayKey(new Date("2026-06-30T23:30:00Z")), "2026-07-01");
  assert.equal(dayKey(new Date("2026-01-15T23:30:00Z")), "2026-01-15");
});

/* ── the wiring, not just the module ─────────────────────────────────────── */

test("a real request through the Worker's own fetch() is counted, or isn't", async () => {
  const { default: worker } = await import("../worker.js");
  const req = (path, ua = "okhttp/4.12.0") =>
    new Request(`https://taiyabahapp.ysbdesigns.uk${path}`, { headers: { "user-agent": ua } });
  const env = { ALLOWED_ORIGIN: "https://taiyabahapp.ysbdesigns.uk" };
  const ctx = { waitUntil: () => {} };

  fresh();
  await worker.fetch(req("/api/metals"), env, ctx).catch(() => {});
  assert.deepEqual(pending().map((r) => [r.feature, r.platform, r.n]), [["metals", "android", 1]],
    "a gold-rate lookup is the congregation using the zakat screen");

  fresh();
  await worker.fetch(req("/api/health"), env, ctx).catch(() => {});
  await worker.fetch(new Request("https://x/api/login", { method: "POST" }), env, ctx).catch(() => {});
  assert.deepEqual(pending(), [], "health checks and logins are not usage");
});

test("counting cannot stop the Worker answering", async () => {
  const { default: worker } = await import("../worker.js");
  const env = { ALLOWED_ORIGIN: "*" };

  /* The things a real request can actually be odd about: no user agent at
     all, an enormous one, and one full of characters that are not a platform
     name. None may reach the response, and none may invent a row. */
  /* Header values are byte strings, so anything outside Latin-1 cannot reach
     a Worker at all — the Request constructor refuses it first. These are the
     odd ones that genuinely can arrive. */
  for (const ua of [undefined, "", "x".repeat(8000), "'; drop table app_usage --",
                    "Mozilla/5.0 (compatible; Bot/1.0; +http://example.invalid)"]) {
    fresh();
    const headers = ua === undefined ? {} : { "user-agent": ua };
    const res = await worker.fetch(
      new Request("https://taiyabahapp.ysbdesigns.uk/api/metals", { headers }), env,
      { waitUntil: () => {} });
    assert.ok(res instanceof Response, `a response is still returned for ${JSON.stringify(ua)?.slice(0, 30)}`);
    for (const row of pending()) {
      assert.ok(PLATFORMS.has(row.platform), `platform "${row.platform}" is not on the allowlist`);
      assert.ok(FEATURES.has(row.feature));
    }
  }

  /* And a ctx whose waitUntil throws — which is the one way counting could
     reach the caller, because it is the only part that runs outside note(). */
  fresh();
  const res = await worker.fetch(
    new Request("https://taiyabahapp.ysbdesigns.uk/api/metals",
                { headers: { "user-agent": "okhttp" } }),
    env, { waitUntil: () => { throw new Error("waitUntil is broken"); } });
  assert.ok(res instanceof Response, "a broken waitUntil must not reach the caller");
});
