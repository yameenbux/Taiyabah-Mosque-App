/**
 * Walks the exported web build and photographs every screen, so a change can be
 * looked at rather than described. Not a substitute for the phone — the compass,
 * the audio and the haptics do not exist here — but it catches a broken layout
 * or a screen that throws before an APK is ever built.
 *
 *   node scripts/shots.mjs
 */
import pw from "/opt/node22/lib/node_modules/playwright/index.js";
import http from "node:http"; import fs from "node:fs"; import path from "node:path";

const DIST = path.resolve(import.meta.dirname, "../dist");
const OUT  = process.env.SHOT_DIR || path.resolve(import.meta.dirname, "../../.shots");
fs.mkdirSync(OUT, { recursive: true });

const TYPES = { ".js": "text/javascript", ".html": "text/html", ".ttf": "font/ttf",
                ".png": "image/png", ".json": "application/json", ".css": "text/css" };
const server = http.createServer((req, res) => {
  let p = path.join(DIST, decodeURIComponent(req.url.split("?")[0]));
  if (!fs.existsSync(p) || fs.statSync(p).isDirectory()) p = path.join(DIST, "index.html");
  res.setHeader("Content-Type", TYPES[path.extname(p)] || "application/octet-stream");
  fs.createReadStream(p).pipe(res);
});
await new Promise(r => server.listen(4173, r));

const browser = await pw.chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const page = await browser.newPage({ viewport: { width: 414, height: 896 }, deviceScaleFactor: 2 });

const errors = [];
page.on("pageerror", e => errors.push(String(e.message).split("\n")[0]));
page.on("console", m => { if (m.type() === "error") errors.push(m.text().slice(0, 160)); });

await page.goto("http://localhost:4173/", { waitUntil: "networkidle" });
await page.waitForTimeout(2500);

const shot = async name => {
  await page.waitForTimeout(650);
  await page.screenshot({ path: path.join(OUT, name + ".png") });
  process.stdout.write("  shot  " + name + "\n");
};
/* Find by the words on screen rather than by a test id: if the label a person
 * reads has gone, the shot should fail. */
const tapText = async (text, { exact = false } = {}) => {
  const all = typeof text === "string" ? page.getByText(text, { exact }) : page.getByText(text);
  const n = await all.count();
  /* A hidden tab screen stays in the tree, so the same words can appear two or
   * three times. Try each in turn and take the one that actually accepts a tap. */
  for (let i = 0; i < n; i++) {
    const el = all.nth(i);
    if (!(await el.isVisible())) continue;
    try { await el.click({ timeout: 2500 }); await page.waitForTimeout(500); return; } catch {}
  }
  throw new Error(`nothing tappable for ${text}`);
};
/* The hero's own back chevron, which is what a person actually taps — the
 * browser's history is not wired up on these screens and should not be. */
const back = async () => {
  /* The screen you came from stays mounted but hidden, so there can be several
   * back buttons in the tree; only one of them is on screen. */
  const all = page.getByLabel("Back");
  for (let i = await all.count(); i-- > 0;) {
    const b = all.nth(i);
    if (await b.isVisible()) { await b.click(); await page.waitForTimeout(550); return true; }
  }
  await page.goBack().catch(() => {}); await page.waitForTimeout(550); return false;
};

const steps = [
  ["01-home",      async () => {}],
  ["02-times",     async () => tapText("Prayer times")],
  ["03-timetable", async () => tapText("Full prayer timetable")],
  ["04-notices",   async () => { await back(); await tapText("Notices"); }],
  ["05-more",      async () => tapText("More")],
];

for (const [name, go] of steps) { await go(); await shot(name); }

/* Everything the More menu opens, one at a time, returning to the menu between. */
const MENU = [
  ["06-quran", /^Holy Qur.an$/], ["07-athkar", /^Daily Adhk/], ["08-duas", /^Everyday du/],
  ["09-rabbanas", /^40 Rabban/], ["10-bukhari", /^..a.*al-Bukh/], ["11-videos", /^Videos & bayaans$/],
  ["12-qibla", /^Qibla$/], ["13-live", /^Listen live$/], ["14-zakat", /^Zakat calculator$/],
  ["15-madrasah", /^Madrasah$/], ["16-admissions", /^Admissions & Fees$/],
  ["17-curriculum", /^What is taught$/], ["18-holidays", /^Holiday Planner$/],
  ["19-portal", /^Madrasah Portal$/], ["20-lifestages", /^Birth, Marriage & Death$/],
  ["21-nikah", /^Nik.*Services$/], ["22-funeral", /^Funeral Services$/],
  ["23-hallhire", /^Hall \/ Room Hire$/], ["24-collect", /^Charity Collections$/],
  ["25-advice", /^Imams. Advice$/], ["26-education", /^Education$/], ["27-about", /^About us$/],
  ["28-membership", /^Membership$/], ["29-contact", /^Contact us$/], ["30-newbuild", /^The new build$/],
  ["31-giving", /^Sadaqah & Lillah$/], ["32-prefs", /^Display & language$/],
  ["33-alerts", /^Notifications$/], ["34-privacy", /^Privacy notice$/],
];
for (const [name, label] of MENU) {
  try {
    await tapText(label);
    await shot(name);
    await back();
  } catch (e) { process.stdout.write("  MISS  " + name + "  (" + label + ") " + String(e.message).split("\n")[0].slice(0, 70) + "\n"); }
}

await browser.close(); server.close();
const seen = [...new Set(errors)];
if (seen.length) { console.log("\nruntime errors:"); seen.slice(0, 14).forEach(e => console.log("  ! " + e)); }
else console.log("\nno runtime errors");
console.log("shots in " + OUT);
