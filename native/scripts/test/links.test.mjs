/**
 * Taiyabah Masjid — every link in the app goes where the website's goes.
 * Copyright (c) 2026 Yameen Bux. All rights reserved. See LICENSE.md.
 *
 * The home screen's "Join WhatsApp" tile pointed at https://chat.whatsapp.com/
 * — the bare host, no invite code. It opened WhatsApp and joined nothing, and
 * on a phone it looked exactly like a tile that worked. The website has the
 * whole link. check-links.mjs compares the two sides but matched on the Stripe
 * links, the phone numbers and the addresses; a link that was merely TRUNCATED
 * went through it.
 *
 * So: every http(s) link the app holds has to appear verbatim in index.html,
 * unless it is one of the few that cannot.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const NATIVE = path.resolve(import.meta.dirname, "../..");
const WEB = fs.readFileSync(path.join(NATIVE, "..", "index.html"), "utf8");

const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => {
  const f = path.join(d, e.name);
  return e.isDirectory() ? walk(f) : /\.(js|jsx|json)$/.test(e.name) ? [f] : [];
});
const RE = /https?:\/\/[^\s"'<>)\\`]+/g;

/* Links the app has and the website does not, each for a reason:
 *   · the app's own pages on the Pages site (privacy, delete-data) — the
 *     website IS that site and links to them relatively;
 *   · one Stripe link the app reaches with its own client_reference_id;
 *   · the two feeds Zakat reads for metal prices, which the website asks its
 *     own worker for. */
const ALLOWED = [
  "https://taiyabahapp.ysbdesigns.uk",
  "https://donate.stripe.com/aFaeVd37egCs2x8eZEf3a0b?client_reference_id=general",
  "https://www.bullionbypost.co.uk/gold-price/gold-price-per-gram/",
];

const links = new Map();
for (const f of walk(path.join(NATIVE, "src")))
  for (const u of fs.readFileSync(f, "utf8").match(RE) || []) {
    const url = u.replace(/[.,;]+$/, "");
    if (/\$\{/.test(url)) continue;                       // a template, not a link
    if (!links.has(url)) links.set(url, path.relative(NATIVE, f));
  }

test("the app holds the links the website holds", () => {
  const strays = [...links].filter(([u]) =>
    !WEB.includes(u) && !ALLOWED.some(a => u.startsWith(a)));
  assert.deepEqual(strays.map(([u, f]) => `${u}  (${f})`), []);
});

test("every link the app opens is https", () => {
  const plain = [...links].filter(([u]) => u.startsWith("http://"));
  assert.deepEqual(plain.map(([u, f]) => `${u}  (${f})`), []);
});

test("the WhatsApp tile carries an invite code, not just the host", () => {
  const wa = [...links.keys()].filter(u => u.includes("chat.whatsapp.com"));
  assert.equal(wa.length, 1, "exactly one WhatsApp group link");
  assert.match(wa[0], /chat\.whatsapp\.com\/[A-Za-z0-9]{10,}/);
  assert.ok(WEB.includes(wa[0]), "and it is the group the website invites people to");
});
