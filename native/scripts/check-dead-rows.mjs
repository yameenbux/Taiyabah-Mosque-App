/* A row a finger lands on must go somewhere.
 *
 * WHAT WENT WRONG. The Admissions screen carried a row reading "Holiday
 * Planner" with a telephone handset beside it. Tapping it did nothing. It had
 * looked like that since the screen was built, and nothing failed: the block
 * was well formed, its words were translated into four languages, every other
 * check passed, and the screen rendered.
 *
 * The cause was one line in extract-content.mjs. The website dresses that link
 * in the same chip-line-chevron styling it uses for a phone number, because on
 * a web page that is exactly what the row should look like. The extractor saw
 * the class, decided it was a telephone, hard-coded the handset and threw the
 * element's id away — and the id was the only thing that could have told the
 * app where the row leads. Two more rows had gone the same way: the Funeral
 * screen's link to the Islamic Will, and the Holiday Planner's own link back
 * to Admissions. All three ids were already in Blocks.jsx's ROUTE table,
 * waiting for data that never arrived.
 *
 * THIS IS THE CHECK THAT WOULD HAVE CAUGHT IT. Every block in the sheet tree
 * that draws as something tappable must lead somewhere: a href, an id the app
 * has a route for, or an explicit "coming soon" that tells the reader it is
 * not ready. Anything else is a dead row, and a dead row is indistinguishable
 * from a working one until somebody presses it.
 *
 *   node scripts/check-dead-rows.mjs
 */
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const sheets = JSON.parse(fs.readFileSync(path.join(root, "src/data/sheets.json"), "utf8"));

/* The ROUTE table, read out of Blocks.jsx rather than copied here. A second
 * copy of it is a second thing to forget to update, and this file exists
 * because of something nobody updated. */
const blocksSrc = fs.readFileSync(path.join(root, "src/Blocks.jsx"), "utf8");
const routeBlock = blocksSrc.slice(blocksSrc.indexOf("const ROUTE = {"),
                                   blocksSrc.indexOf("};", blocksSrc.indexOf("const ROUTE = {")));
const ROUTES = new Set([...routeBlock.matchAll(/"([^"]+)":\s*"([^"]+)"/g)].map(m => m[1]));

if (ROUTES.size === 0) {
  console.error("check-dead-rows: could not read ROUTE out of src/Blocks.jsx");
  process.exit(1);
}

/* WHICH SHEETS THIS APPLIES TO. Only the ones rendered straight out of the
 * block tree, named in App.jsx's SHEET map — read from there rather than
 * listed here, because a list would go stale the first time a sheet gets a
 * real screen. Qurʼan, Athkār, Holidays and the rest have screens somebody
 * wrote and looked at; their sheet blocks are unused data, and reporting
 * them would be eight false alarms burying the one real catch.
 */
const appSrc = fs.readFileSync(path.join(root, "src/App.jsx"), "utf8");
const sheetBlock = appSrc.slice(appSrc.indexOf("const SHEET = {"),
                                appSrc.indexOf("};", appSrc.indexOf("const SHEET = {")));
const RENDERED = new Set([...sheetBlock.matchAll(/:\s*"([a-z]+)"/g)].map(m => m[1]));

if (RENDERED.size === 0) {
  console.error("check-dead-rows: could not read SHEET out of src/App.jsx");
  process.exit(1);
}

const dead = [];
let checked = 0;

/* TWO RULES, BOTH NARROW, BOTH THE SHAPE OF THE BUG ABOVE.
 *
 * 1. An id is the website saying "this row goes somewhere". If the app has no
 *    route for it AND no href to fall back on, the row is drawn and does
 *    nothing. The href matters: the madrasah's "Apply for a place" carries
 *    id="mdr-go-apply", which the app does not route, and is perfectly fine
 *    because it opens the admission form in a browser instead. An earlier
 *    version of this check reported it, which is the kind of false alarm
 *    that gets a check deleted.
 * 2. A `call` block with no href is not a call. It is a navigation row that
 *    came through wearing the wrong clothes, and it will draw a telephone
 *    handset beside words that have nothing to do with ringing anybody.
 *
 * A row with neither an id nor an href is NOT reported. Education's "More
 * courses" is one: it carries no promise of a destination and its own words
 * tell the reader to ring the office. A card that says something is allowed
 * to be a card that says something.
 */
function visit(sheet, b) {
  if (!b || typeof b !== "object") return;
  if (Array.isArray(b)) { b.forEach(x => visit(sheet, x)); return; }

  const words = () => String(
    (b.v && (b.v.t || b.v.k)) || (b.label && (b.label.t || b.label.k))
    || (b.k && (b.k.t || b.k.k)) || b.t || "(no words)").trim();

  if (typeof b.type === "string") {
    if (b.id && !b.href) {
      checked++;
      if (!ROUTES.has(b.id))
        dead.push({ sheet, why: `id="${b.id}" is not in Blocks.jsx ROUTE, and there `
                              + `is no href to fall back on`, words: words() });
    }
    if (b.type === "call" && !b.href) {
      checked++;
      if (!b.id)
        dead.push({ sheet, why: "a call with no number and no id — it will draw a handset "
                              + "and do nothing", words: words() });
    }
  }
  for (const v of Object.values(b)) if (v && typeof v === "object") visit(sheet, v);
}

for (const [name, sheet] of Object.entries(sheets))
  if (RENDERED.has(name)) visit(name, sheet.blocks);

if (dead.length) {
  console.error(`${dead.length} row(s) a finger can land on that lead nowhere:\n`);
  for (const d of dead)
    console.error(`  ${d.sheet.padEnd(14)} ${JSON.stringify(d.words).padEnd(34)} ${d.why}`);
  console.error(`\nAn id the website already carries is dropped unless`
              + ` extract-content.mjs passes it through.`);
  process.exit(1);
}

console.log(`every routed row in the ${RENDERED.size} sheet-rendered screens`
          + ` leads somewhere (${checked} checked)`);
