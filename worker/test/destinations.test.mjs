/**
 * Taiyabah Masjid — a notification takes you into the app, not out of it.
 * Copyright (c) 2026 Yameen Bux. All rights reserved. See LICENSE.md.
 *
 * Every send used to carry one `url`, the website's. In a browser that is
 * right: the page is the app. On a phone it is wrong twice over — it throws
 * somebody out of the app they just installed and into a web page, and once
 * the website is retired it opens a dead address. Every janāzah alert, every
 * announcement, for everybody who installed from the App Store.
 *
 * So each send now carries web_url for browser subscribers and app_url for
 * the app. Neither may be confused for the other: an app_url pointing at a
 * website is the original fault wearing a different name.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { reminderPayload } from "../worker.js";

const src = fs.readFileSync(path.resolve(import.meta.dirname, "../worker.js"), "utf8")
  .replace(/\/\*[\s\S]*?\*\//g, " ")
  .replace(/^\s*\/\/.*$/gm, " ");

test("a reminder names both destinations and neither is the other's", () => {
  const p = reminderPayload("app", { title: "t", body: "b", tagMins: 10, webOnly: true });
  assert.match(p.web_url, /^https:\/\//, "browser subscribers need a web address");
  assert.match(p.app_url, /^taiyabah:\/\//, "the app needs a deep link, not a web address");
  assert.equal("url" in p, false,
    "a bare `url` goes to every platform, which is the fault this replaced");
});

test("no send still addresses the app with the website", () => {
  /* Both spellings. The first version of this test only looked for the literal
     address and sailed straight past `url: `${SITE}/#notices``, which is the
     form the code actually uses — a guard that agrees with the bug. */
  assert.doesNotMatch(src, /\burl:\s*[`"'][^`"'\n]*(taiyabahapp|\$\{SITE\})/,
    "a notification still carries a plain `url` pointing at the website — on a " +
    "phone that opens a browser, and a dead page once the site is retired");
});

test("every notification payload names an app destination", () => {
  /* The count that cannot be fooled by swapping one field for another: every
     payload sent to OneSignal declares app_id, and every one of them must
     also say where the app should go. */
  const payloads = (src.match(/\bapp_id:/g) || []).length;
  const appUrls  = (src.match(/\bapp_url:/g) || []).length;
  assert.ok(payloads > 0, "no OneSignal payloads found — has this file moved?");
  assert.equal(appUrls, payloads,
    `${payloads} notification payloads but ${appUrls} app destinations — one of ` +
    "them sends app users nowhere, or to a web page");
});

test("every send that names one destination names the other", () => {
  const web = (src.match(/\bweb_url:/g) || []).length;
  const app = (src.match(/\bapp_url:/g) || []).length;
  assert.ok(web > 0, "no send has a web destination at all");
  assert.equal(web, app,
    `${web} sends name a web destination and ${app} name an app one — a send ` +
    "with only one of the two silently drops a whole platform");
});

test("an app destination is always the app's own scheme", () => {
  for (const m of src.matchAll(/\bapp_url:\s*([A-Za-z_$][\w$]*|[`"'][^`"'\n]*[`"'])/g)) {
    const v = m[1];
    if (/^[`"']/.test(v)) {
      assert.match(v.slice(1, -1), /^taiyabah:\/\//,
        `app_url is ${v} — a web address here opens a browser from inside the app`);
    } else {
      /* A constant: it must be one of the APP_ ones, which are asserted below. */
      assert.match(v, /^APP_/, `app_url is ${v}, which is not an APP_ deep-link constant`);
    }
  }
});

test("the deep-link constants are deep links", () => {
  for (const m of src.matchAll(/const (APP_[A-Z_]+)\s*=\s*["'`]([^"'`]+)["'`]/g))
    assert.match(m[2], /^taiyabah:\/\/[a-z]+$/, `${m[1]} is not a deep link`);
});
