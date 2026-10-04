/**
 * Does the extracted block tree actually carry every word the web sheet shows?
 * Walks the real DOM for text, walks the JSON for text, and reports whatever
 * the extractor dropped. An extractor you have not measured is a guess.
 */
import pw from "/opt/node22/lib/node_modules/playwright/index.js";
import fs from "node:fs"; import path from "node:path";
const ROOT = path.resolve(import.meta.dirname, "../..");
const sheets = JSON.parse(fs.readFileSync(path.resolve(import.meta.dirname, "../src/data/sheets.json"), "utf8"));

const browser = await pw.chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const page = await browser.newPage();
await page.route("**/*", r => (r.request().resourceType() === "script" ? r.abort() : r.continue()));
await page.goto("file://" + path.join(ROOT, "index.html"), { waitUntil: "domcontentloaded" });

const STOPS = { marriage: "nikah.request_a_date" };
const dom = await page.evaluate(([ids, stops]) => {
  const out = {};
  for (const id of ids) {
    const body = document.getElementById(id)?.querySelector(".sh-body");
    if (!body) { out[id] = []; continue; }
    const stopEl = stops[id] ? body.querySelector(`[data-i18n="${stops[id]}"]`) : null;
    const bits = [];
    const w = document.createTreeWalker(body, NodeFilter.SHOW_TEXT);
    let n; while ((n = w.nextNode())) {
      if (n.parentElement.closest("svg,script,style")) continue;
      { const h = n.parentElement.closest("[hidden]");
        if (h && h.querySelector("input,textarea,select,form")) continue; }
      /* once past where the hand-written form takes over, stop comparing */
      if (stopEl && (stopEl.compareDocumentPosition(n) & Node.DOCUMENT_POSITION_FOLLOWING)) break;
      const t = n.nodeValue.replace(/\s+/g, " ").trim();
      if (t && t.length > 2 && !/^[›·—&|]+$/.test(t)) bits.push(t);
    }
    out[id] = bits;
  }
  return out;
}, [Object.keys(sheets), STOPS]);
await browser.close();

const norm = s => String(s).replace(/[*_]/g, "").replace(/\s+/g, " ").trim().toLowerCase();
let missTotal = 0, bitsTotal = 0;
for (const [id, s] of Object.entries(sheets)) {
  const hay = [];
  (function walk(b) {
    for (const x of b) for (const [kk, v] of Object.entries(x)) {
      if (kk === "blocks") { walk(v); continue; }
      const push = o => { if (!o) return; if (typeof o === "string") hay.push(o);
        else if (typeof o === "object") { if (o.t) hay.push(o.t); for (const y of Object.values(o)) if (y && typeof y === "object") push(y); } };
      if (Array.isArray(v)) v.forEach(push); else push(v);
    }
  })(s.blocks || []);
  const blob = norm(hay.join(" ¶ "));
  const miss = dom[id].filter(t => !blob.includes(norm(t)));
  bitsTotal += dom[id].length; missTotal += miss.length;
  const pct = dom[id].length ? Math.round(100 * (1 - miss.length / dom[id].length)) : 100;
  console.log(id.padEnd(15), String(pct).padStart(3) + "%", String(dom[id].length).padStart(4), "bits",
              miss.length ? " missing: " + miss.slice(0, 6).map(x => JSON.stringify(x.slice(0, 48))).join(" ") + (miss.length > 6 ? ` …+${miss.length - 6}` : "") : "");
}
console.log(`\n${bitsTotal - missTotal}/${bitsTotal} text bits carried across (${Math.round(100*(1-missTotal/bitsTotal))}%)`);
