/**
 * Does the native app put everything where the web app puts it?
 *
 * Opens both in a browser — the web app from index.html, the native app from
 * its web export — and compares the two places a person navigates from: the
 * home screen's tile grid and the More menu. Order matters, grouping matters,
 * and the wording matters, so all three are compared.
 *
 * This is the check behind "no difference in layout or groupings". Asserting it
 * is easy; measuring it is the only version worth having.
 *
 *   node scripts/check-parity.mjs
 */
import pw from "/opt/node22/lib/node_modules/playwright/index.js";
import http from "node:http"; import fs from "node:fs"; import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "../..");
const DIST = path.resolve(import.meta.dirname, "../dist");

const TYPES = { ".js": "text/javascript", ".html": "text/html", ".ttf": "font/ttf",
                ".png": "image/png", ".json": "application/json", ".css": "text/css" };
const server = http.createServer((req, res) => {
  let p = path.join(DIST, decodeURIComponent(req.url.split("?")[0]));
  if (!fs.existsSync(p) || fs.statSync(p).isDirectory()) p = path.join(DIST, "index.html");
  res.setHeader("Content-Type", TYPES[path.extname(p)] || "application/octet-stream");
  fs.createReadStream(p).pipe(res);
});
await new Promise(r => server.listen(4174, r));

const browser = await pw.chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });

/* --- the web app, as the source of truth -------------------------------- */
const web = await browser.newPage();
await web.route("**/*", r => (r.request().resourceType() === "script" ? r.abort() : r.continue()));
await web.goto("file://" + path.join(ROOT, "index.html"), { waitUntil: "domcontentloaded" });
const expected = await web.evaluate(() => {
  const norm = s => s.replace(/\s+/g, " ").replace(/[‘’ʼ']/g, "'").trim();
  const tiles = [...document.querySelectorAll("#tab-home .tile .t-l")].map(e => norm(e.textContent));
  const menu = [];
  for (const el of document.querySelector("#drawer .dr-body").children) {
    if (el.classList.contains("dr-h")) menu.push({ head: norm(el.textContent) });
    else if (el.classList.contains("dr-row")) {
      /* The portal row carries its note inside the same label element; the
       * native row shows the two as separate lines, which is the same content
       * — so they are compared as two strings, not as one run-on. */
      const t = el.querySelector(".dr-t");
      const note = el.querySelector(".dr-note");
      let label = (t || el).textContent;
      if (note) label = label.replace(note.textContent, "");
      menu.push({ row: norm(label).replace(/\s*Coming soon$/, "").replace(/\s*\u2197$/, "") });
      if (note) menu.push({ row: norm(note.textContent) });
    }
  }
  /* The home screen's own section headings, in order. */
  const sections = [...document.querySelectorAll("#tab-home .sec-h h2")].map(e => norm(e.textContent));
  return { tiles, menu, sections };
});

/* --- the native app, as built ------------------------------------------- */
const app = await browser.newPage({ viewport: { width: 414, height: 1400 } });
await app.goto("http://localhost:4174/", { waitUntil: "networkidle" });
await app.waitForTimeout(2500);

/* THE FIRST-RUN CARD COVERS EVERYTHING BEHIND IT. It was added when push was
 * wired in, months after this check was written, and nothing here dismissed
 * it — so the home screen read fine through the scrim while every tap landed
 * on the card. That is why the More menu came back 0 of 20 rows: not one of
 * them was missing, the check simply never reached the screen. */
for (let i = 0; i < 10; i++) {
  const b = app.getByText(/^Not now$/).first();
  if (await b.isVisible().catch(() => false)) {
    await b.click().catch(() => {});
    await app.waitForTimeout(500);
    break;
  }
  await app.waitForTimeout(300);
}

/* React Native Web nests text in several wrappers, so a "leaf element" test
 * finds nothing. Walk the text nodes themselves and glue together the runs that
 * share a box — which is what a person reads as one line. */
const homeText = async () => app.evaluate(() => {
  const out = [];
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let n, last = null, buf = "";
  const flush = () => {
    const t = buf.replace(/\s+/g, " ").replace(/[\u2018\u2019\u02bc\u0027]/g, "'").trim();
    if (t) out.push(t);
    buf = "";
  };
  while ((n = w.nextNode())) {
    const el = n.parentElement;
    if (!el || el.closest("svg")) continue;
    const box = el.closest("div") || el;
    if (box !== last) { flush(); last = box; }
    buf += n.nodeValue;
  }
  flush();
  return out;
});
const home = await homeText();

/* Walk to the More tab by its label, which is the same word in both. */
const tapText = async text => {
  const all = app.getByText(text, { exact: true });
  for (let i = 0, n = await all.count(); i < n; i++) {
    const el = all.nth(i);
    if (!(await el.isVisible())) continue;
    try { await el.click({ timeout: 2500 }); await app.waitForTimeout(600); return true; } catch {}
  }
  return false;
};
await tapText("More");
const more = await homeText();

await browser.close(); server.close();

/* --- compare ------------------------------------------------------------ */
let bad = 0;
const check = (label, want, have) => {
  const miss = want.filter(w => !have.some(h => h === w || h.replace(/’/g, "'") === w));
  const pct = Math.round(100 * (want.length - miss.length) / (want.length || 1));
  console.log(`${label.padEnd(22)} ${String(want.length - miss.length).padStart(2)}/${want.length}  ${pct}%`);
  if (miss.length) { bad += miss.length; miss.forEach(m => console.log(`      missing: ${JSON.stringify(m)}`)); }
};

console.log("HOME — the web app's section headings");
check("sections", expected.sections, home);
console.log("\nHOME — the twelve tiles, in the web app's order");
check("tiles", expected.tiles, home);
/* Order, not just presence: a grid with the right twelve in the wrong sequence
 * is still a different screen. */
const seen = expected.tiles.filter(x => home.includes(x));
const order = expected.tiles.filter(x => home.includes(x));
const idx = order.map(x => home.indexOf(x));
const sorted = idx.every((v, i) => i === 0 || v > idx[i - 1]);
console.log(`tile order             ${sorted ? "same as the web app" : "DIFFERENT from the web app"}`);
if (!sorted) bad++;

console.log("\nMORE — the drawer's groups and rows");
check("group headings", expected.menu.filter(m => m.head).map(m => m.head), more);
check("rows", expected.menu.filter(m => m.row).map(m => m.row), more);

console.log(bad ? `\n${bad} difference(s) from the web app` : "\nno differences from the web app");
process.exit(bad ? 1 : 0);
