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

/* The first-run offer appears 1.4s after launch and covers the bottom half of
 * whatever is behind it. Every shot after it is a photograph of the same card,
 * which is how a run can finish "successfully" and tell you nothing. The smoke
 * runner clears it for the same reason. */
for (let i = 0; i < 12; i++) {
  const notNow = page.getByText(/^Not now$/).first();
  if (await notNow.isVisible().catch(() => false)) {
    await notNow.click({ timeout: 2000 }).catch(() => {});
    await page.waitForTimeout(500);
    process.stdout.write("  cleared the first-run offer\n");
    break;
  }
  await page.waitForTimeout(300);
}

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
    /* The words are often a text node inside the thing that actually takes the
     * tap — a tab, or a row with its own press handler — and clicking the text
     * itself does nothing. The tab bar is exactly this: visible, matched, and
     * inert. So try what encloses it before giving up. */
    for (const role of ['[role="tab"]', '[role="button"]', "button", "a"]) {
      try {
        const owner = el.locator("xpath=ancestor-or-self::*").filter({ has: page.locator(role) });
        const anc = el.locator(`xpath=ancestor-or-self::*[@role="${role.replace(/[^a-z]/g, "")}"]`).first();
        await anc.click({ timeout: 1500 }); await page.waitForTimeout(500); return;
      } catch {}
    }
    try { await el.click({ timeout: 1500, force: true }); await page.waitForTimeout(500); return; } catch {}
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
  /* Never fall through to the browser's own history: these screens do not use
   * it, and going back in it leaves the app entirely. */
  return false;
};

const steps = [
  ["01-home",      async () => {}],
  ["02-times",     async () => tapText("Prayer times")],
  ["04-notices",   async () => { await back(); await tapText("Notices"); }],
  ["05-more",      async () => tapText("More")],
];

for (const [name, go] of steps) { await go(); await shot(name); }

/* The twelve home tiles, in the order the home screen shows them, then
 * everything the More menu opens. Both lists follow the web app, which is the
 * point: if a row moves, a shot goes missing and this run says so. */
const toHome = async () => {
  for (let i = 0; i < 4; i++) if (!(await back())) break;
  await tapText(/^Home$/).catch(() => {});
  await page.waitForTimeout(350);
};
const toMenu = async () => {
  for (let i = 0; i < 4; i++) if (!(await back())) break;
  await tapText("More").catch(() => {});
  await page.waitForTimeout(350);
};

const TILES = [
  ["06-quran", /^Holy Qur.an$/], ["07-athkar", /^Daily Adhk/], ["10-bukhari", /al-Bukh/],
  ["12-qibla", /^Qibla$/], ["15-madrasah", /^Madrasah$/], ["21-nikah", /^Nik.*Services$/],
  ["22-funeral", /^Funeral Services$/], ["23-hallhire", /^Hall Booking$/],
  ["30-newbuild", /^Donate$/], ["31-giving", /^Sadaqah & Lillah$/],
  ["24-collect", /^Charity Collections$/],
];
for (const [name, label] of TILES) {
  try { await toHome(); await tapText(label); await shot(name); }
  catch (e) { process.stdout.write("  MISS  " + name + "  (" + label + ") " + String(e.message).split("\n")[0].slice(0, 70) + "\n"); }
}

const MENU = [
  ["03-timetable", /^Full prayer timetable$/], ["11-videos", /^Videos & bayaans$/],
  ["14-zakat", /^Zakat calculator$/], ["16-admissions", /^Admissions & Fees$/],
  ["18-holidays", /^Holiday Planner$/], ["19-portal", /^Madrasah Portal$/],
  ["27-about", /^About us$/], ["28-membership", /^Membership$/], ["29-contact", /^Contact us$/],
  ["20-lifestages", /^Birth, Marriage & Death$/], ["25-advice", /^Imams. Advice$/],
  ["26-education", /^Education$/], ["33-alerts", /^Notifications$/],
  ["32-prefs", /^System Preferences$/], ["37-help", /^Help$/],
];
for (const [name, label] of MENU) {
  try { await toMenu(); await tapText(label); await shot(name); }
  catch (e) { process.stdout.write("  MISS  " + name + "  (" + label + ") " + String(e.message).split("\n")[0].slice(0, 70) + "\n"); }
}

/* Two more that are only reached from inside another screen. */
try { await toHome(); await tapText(/^Listen live$/); await shot("13-live"); } catch {}
try { await toHome(); await tapText(/^Daily Adhk/); await tapText(/^Everyday Du/); await shot("08-duas"); } catch {}
try { await toHome(); await tapText(/^Daily Adhk/); await tapText(/Rabban/); await shot("09-rabbanas"); } catch {}
try { await toMenu(); await tapText(/^Privacy notice$/); await shot("34-privacy"); } catch {}
try { await toHome(); await tapText(/^Madrasah$/); await tapText(/What is taught|Curriculum/); await shot("17-curriculum"); } catch {}

/* The real test of four languages: switch to Urdu and photograph the app in it.
 * A language pack that loads but leaves half the screen in English is worth
 * knowing about before an APK is built, not after. */
try {
  await toMenu();
  await tapText(/^System Preferences$/);
  await page.waitForTimeout(600);
  await tapText(/^Urdu$/);
  await page.waitForTimeout(900);
  await shot("35-urdu-prefs");
  await toMenu();
  await shot("36-urdu-more");
  /* The tab labels are in Urdu by now, so the Home tab is found by its position
   * rather than by a word this script would have to know the translation of. */
  await page.locator('[role="tablist"] button, [role="tab"]').first().click({ timeout: 4000 }).catch(() => {});
  await page.waitForTimeout(600);
  await shot("37-urdu-home");
  /* …and back to English, so the next run starts where this one did. */
  await toMenu();
  const langRow = page.getByText(/زبان|System Preferences/).first();
  if (await langRow.count()) { await langRow.click({ timeout: 3000 }).catch(() => {}); await page.waitForTimeout(500); }
  await tapText(/^English$/).catch(() => {});
} catch (e) { process.stdout.write("  MISS  language switch: " + String(e.message).split("\n")[0].slice(0, 70) + "\n"); }

await browser.close(); server.close();
const seen = [...new Set(errors)];
if (seen.length) { console.log("\nruntime errors:"); seen.slice(0, 14).forEach(e => console.log("  ! " + e)); }
else console.log("\nno runtime errors");
console.log("shots in " + OUT);
