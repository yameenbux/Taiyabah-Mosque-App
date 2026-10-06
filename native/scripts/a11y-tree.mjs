/**
 * Taiyabah Masjid — what a screen reader would actually say.
 * Copyright (c) 2026 Yameen Bux. All rights reserved. See LICENSE.md.
 *
 * Accessibility work is invisible in a screenshot: the screen looks identical
 * before and after, which is the point and also why it is so easy to claim
 * and so hard to show. This reads the ACCESSIBILITY TREE out of the web
 * build — the same tree TalkBack and VoiceOver walk — and prints it the way
 * it would be announced, so the work can be looked at rather than asserted.
 *
 * react-native-web maps accessibilityRole to the ARIA role and
 * accessibilityState to aria-checked/selected, so what Chromium exposes here
 * is what the phone exposes there.
 *
 *   node scripts/a11y-tree.mjs <screen>
 */
import pw from "/opt/node22/lib/node_modules/playwright/index.js";
const { chromium } = pw;
import path from "node:path";
import { createServer } from "node:http";
import fs from "node:fs";

const screen = process.argv[2] || "home";
const ROOT = path.resolve(import.meta.dirname, "../dist");
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".json": "application/json",
                ".png": "image/png", ".ttf": "font/ttf", ".css": "text/css" };
const srv = createServer((req, res) => {
  const u = decodeURIComponent(req.url.split("?")[0]);
  let f = path.join(ROOT, u === "/" ? "index.html" : u);
  if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) f = path.join(ROOT, "index.html");
  res.writeHead(200, { "Content-Type": TYPES[path.extname(f)] || "application/octet-stream" });
  fs.createReadStream(f).pipe(res);
}).listen(4393);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 414, height: 1200 } });
await page.goto("http://localhost:4393/", { waitUntil: "networkidle" }).catch(() => {});
await page.waitForTimeout(2200);

/* The welcome sheet covers the app on a fresh profile, exactly as it does on
   a fresh install; the comparison harness dismisses it the same way. */
for (let i = 0; i < 12; i++) {
  const b = page.getByText(/^Not now$/).first();
  if (await b.isVisible().catch(() => false)) { await b.click().catch(() => {}); await page.waitForTimeout(500); break; }
  await page.waitForTimeout(250);
}
/* Anything other than Home is reached the way a finger would reach it. */
if (screen !== "home") {
  const target = page.getByText(new RegExp(screen, "i")).first();
  if (await target.isVisible().catch(() => false)) { await target.click().catch(() => {}); await page.waitForTimeout(900); }
}
await page.waitForTimeout(600);

/* Chromium's own accessibility tree, pruned to the things a screen reader
   stops on. "generic" nodes are containers it walks straight past. */
const snap = await page.accessibility.snapshot({ interestingOnly: true });
const SKIP = new Set(["generic", "none", "presentation", "GenericContainer"]);
const out = [];
(function walk(n, depth) {
  if (!n) return;
  const role = n.role || "";
  const name = (n.name || "").replace(/\s+/g, " ").trim();
  if (!SKIP.has(role) && (name || role !== "text")) {
    const state = [n.checked && `checked=${n.checked}`, n.selected && "selected",
                   n.disabled && "disabled", n.pressed && `pressed=${n.pressed}`]
                  .filter(Boolean).join(" ");
    out.push({ depth, role, name, state });
  }
  (n.children || []).forEach(c => walk(c, depth + 1));
})(snap, 0);

/* A control a sighted user can tap but a listener cannot identify. */
const TAPPABLE = new Set(["button", "link", "tab", "radio", "checkbox", "switch", "menuitem"]);
let named = 0, unnamed = 0;
for (const n of out) if (TAPPABLE.has(n.role)) (n.name ? named++ : unnamed++);
const texts = out.filter(n => n.role === "text" && n.name).length;

console.log(`\n  WHAT A SCREEN READER WALKS THROUGH ON "${screen}"\n`);
for (const n of out) {
  const label = n.name || "(no name)";
  const role = n.role === "text" ? "" : `  [${n.role}${n.state ? " · " + n.state : ""}]`;
  console.log("  " + "  ".repeat(Math.min(n.depth, 6)) + label + role);
}
console.log(`\n  ${out.length} stops · ${named + unnamed} announced as a control ` +
            `(${unnamed} of them with no name) · ${texts} read as plain text`);
console.log(`  Anything tappable that is NOT in that control count is announced as ` +
            `plain text, so a listener never learns they can tap it.\n`);
await browser.close();
srv.close();
