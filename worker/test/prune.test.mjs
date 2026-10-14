/**
 * Taiyabah Masjid — crash reports do not pile up for ever.
 * Copyright (c) 2026 Yameen Bux. All rights reserved. See LICENSE.md.
 *
 * Worth being accurate about what was wrong here, because it was less than it
 * looked. Migration 145 already bounds crash reports in NUMBER: the same fault
 * from a hundred phones is one row, since (masjid_id, fingerprint,
 * app_version) is unique and a repeat only bumps a counter, and a trigger caps
 * new faults at forty per masjid per hour. A crash loop across five thousand
 * congregants costs one update, not five thousand rows.
 *
 * What nothing bounded was TIME. Every distinct fault the app has ever had was
 * kept for ever, including ones from versions nobody runs and ones marked
 * fixed months ago — slow and small rather than dangerous, and so the sort of
 * thing noticed only when the database is already full.
 *
 * The rules live in db/148_prune_app_crashes.sql and the schedule in
 * worker.js. This checks the two agree, that the job is actually scheduled —
 * a tidy-up nobody calls is the same as no tidy-up — and that a congregant's
 * app cannot reach it.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { shouldPrune } from "../worker.js";

const root = path.resolve(import.meta.dirname, "../..");
const sql = fs.readFileSync(path.join(root, "db/148_prune_app_crashes.sql"), "utf8");
const worker = fs.readFileSync(path.join(root, "worker/worker.js"), "utf8")
  .replace(/\/\*[\s\S]*?\*\//g, " ")
  .replace(/^\s*\/\/.*$/gm, " ");

test("exactly one minute of the day owns the prune", () => {
  assert.equal(shouldPrune("03:10"), true);
  let owners = 0;
  for (let h = 0; h < 24; h++)
    for (let m = 0; m < 60; m++)
      if (shouldPrune(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`)) owners++;
  assert.equal(owners, 1, "the prune would run more than once a day, or never");
});

test("the prune is actually scheduled", () => {
  /* A tidy-up nobody calls is the same as no tidy-up, and it would look
     exactly as healthy. */
  assert.match(worker, /ctx\.waitUntil\(runPrune\(env\)\)/,
    "runPrune exists but the cron never calls it");
  assert.match(worker, /rpc\/prune_app_crashes/,
    "the Worker does not call the function the migration defines");
});

test("it runs once a day, not once a minute", () => {
  const body = worker.slice(worker.indexOf("async function runPrune"));
  assert.match(body, /SENT_KV\.get\(key\)/, "nothing stops it running every minute at 03:10");
  assert.match(body, /SENT_KV\.put\(key/, "the day is never marked as done");
});

test("a congregant's app cannot delete crash reports", () => {
  /* report_app_crash is granted to anon, because a phone has to be able to
     say it fell over. Deleting the evidence is a different matter. */
  assert.match(sql, /revoke all on function public\.prune_app_crashes\(\) from [^;]*anon/,
    "anon can call the prune — the app could clear the evidence of its own bugs");
  assert.doesNotMatch(sql, /grant execute on function public\.prune_app_crashes/,
    "the prune is granted to somebody; it should be reachable only by the service key");
});

test("it keeps anything open and recent", () => {
  /* A crash report is evidence. Deleting it early is worse than keeping it
     too long, so both rules are generous and neither touches an open fault
     that is still being seen. */
  assert.match(sql, /fixed_at is not null[\s\S]*?interval '30 days'/,
    "the fixed-and-stale rule is missing or no longer requires fixed_at");
  assert.match(sql, /last_seen_at < now\(\) - interval '180 days'/,
    "the not-seen-for-ages rule is missing or its window changed");
  assert.doesNotMatch(sql, /delete from public\.app_crashes\s*;/,
    "an unconditional delete would take everything, open faults included");
});
