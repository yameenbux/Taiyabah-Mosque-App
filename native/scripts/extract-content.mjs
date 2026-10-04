/**
 * Taiyabah Masjid — content extractor
 * Copyright (c) 2026 Yameen Bux. All rights reserved. See LICENSE.md.
 *
 * Reads the web app's index.html in a real browser and turns each of its
 * sheets into a block tree the native app renders. Doing it through the DOM
 * rather than with regexes is the only way this stays honest: the prose, the
 * nesting and — critically — every data-i18n key come across exactly as the
 * web app has them, so the Urdu, Gujarati and Arabic packs keep working
 * without a single string being retyped.
 *
 *   node scripts/extract-content.mjs
 */
import pw from "/opt/node22/lib/node_modules/playwright/index.js";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "../..");
const OUT  = path.resolve(import.meta.dirname, "../src/data");

/* The sheets worth lifting wholesale. Anything with real logic — the zakat
 * calculator, the mushaf, the forms, the compass — is hand-written native and
 * deliberately absent from this list. */
const SHEETS = [
  "about", "membership", "contact", "marriagedeath", "funeral", "will", "birth",
  "education", "eduarabic", "edughusl", "curriculum", "advice",
  "madrasah", "madmissions", "holidays", "giving", "collect", "hallhire",
  /* The nikāḥ and hall-hire screens are hand-written native forms, so only the
   * prose above the form comes across — stop at the heading where it starts. */
  { id: "marriage", stopKey: "nikah.request_a_date" },
];

const browser = await pw.chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const page = await browser.newPage();
/* Stop the app's own boot code from running — we only want the markup. */
await page.route("**/*", r => (r.request().resourceType() === "script" ? r.abort() : r.continue()));
await page.goto("file://" + path.join(ROOT, "index.html"), { waitUntil: "domcontentloaded" });

const out = await page.evaluate(ids => {
  let STOP = null;
  const KEY = el => el.getAttribute("data-i18n") || el.getAttribute("data-i18n-html") || null;
  const clean = s => (s || "").replace(/\s+/g, " ").trim();

  /* Inline markup survives as *bold* / _italic_ — enough for the three or four
   * places the copy leans on emphasis, and trivially renderable natively. */
  const inline = el => {
    let s = "";
    for (const n of el.childNodes) {
      /* HTML wraps its source lines for readability; those newlines are not
       * the author's. Only a <br> is, and it travels as a sentinel so the
       * collapse below cannot eat it. */
      if (n.nodeType === 3) { s += n.nodeValue.replace(/\s+/g, " "); continue; }
      if (n.nodeType !== 1) continue;
      const t = n.tagName.toLowerCase();
      if (t === "br") { s += "\u0001"; continue; }
      if (t === "svg") continue;
      const inner = inline(n);
      if (t === "b" || t === "strong") s += "*" + inner.trim() + "*";
      else if (t === "i" || t === "em") s += "_" + inner.trim() + "_";
      else s += inner;
    }
    return s;
  };
  const txt = el => clean(inline(el)).replace(/ ?\u0001 ?/g, "\n");
  const node = (type, o) => ({ type, ...o });
  const has = (el, c) => el.classList.contains(c);

  /* A text-bearing leaf: keep the key beside the English so a language pack
   * can replace it, and keep the English so a missing key still reads. */
  const isForm = el => {
    if (!el || el.nodeType !== 1) return false;
    const tag = el.tagName.toLowerCase();
    if (/^(input|textarea|select|form|label|option)$/.test(tag)) return true;
    /* A panel that holds a form control IS the form — drop it whole. A plain
     * wrapper that happens to contain one further down is not, or every sheet
     * with a form anywhere in it would come back empty. */
    const names = (el.className || "") + " " + (el.id || "");
    return !!el.querySelector("input,textarea,select") &&
           (/(^|\s)card(\s|$)/.test(el.className || "") ||
            /form|panel|-pay|-field|-btns|-agree|-upload/.test(names));
  };
  const str = el => { const k = KEY(el); const t = txt(el); return k ? { k, t } : { t }; };

  function walk(el, blocks) {
    for (const c of el.children) {
      const tag = c.tagName.toLowerCase();

      if (tag === "svg" || tag === "script" || tag === "style") continue;
      /* Every form in this app is hand-written native, so the markup for one is
       * not content. (The `hidden` attribute is no help: these panels are
       * revealed by script, and the DOM we read has already lost it.) */
      if (isForm(c)) continue;

      /* heroes ------------------------------------------------------------ */
      if (tag === "section" && /-hero$/.test(c.className.split(" ").find(x => /-hero$/.test(x)) || "")) {
        const hero = { type: "hero", lines: [] };
        for (const k of c.querySelectorAll("div,p,span")) {
          if (k.closest("svg")) continue;
          if (k.children.length && !KEY(k)) continue;
          const t = txt(k); if (!t) continue;
          const weight =
            has(k, "arabic") ? "arabic" :
            /-(eyebrow|est|lab)$/.test(k.className) ? "eyebrow" :
            /-(en|lead)$/.test(k.className) ? "title" : "sub";
          hero.lines.push({ ...str(k), w: weight });
        }
        blocks.push(hero);
        continue;
      }

      /* section heading --------------------------------------------------- */
      if (has(c, "sec-h")) {
        const h = c.querySelector("h2,h3");
        /* Where a hand-written form takes over, the prose ends here. */
        if (STOP && h && KEY(h) === STOP) return "stop";
        const tagEl = c.querySelector(".tag");
        blocks.push(node("heading", { ...(h ? str(h) : { t: "" }), tag: tagEl ? str(tagEl) : null }));
        continue;
      }

      /* callout (label + headline + prose) -------------------------------- */
      if (has(c, "ad-note") || has(c, "nk-note") || has(c, "bk-note")) {
        const lab = c.querySelector(".lab");
        const h = c.querySelector("h3,h4");
        const ps = [...c.querySelectorAll("p")].map(str).filter(p => p.t);
        const a = c.querySelector("a[href],button[id]");
        blocks.push(node("callout", { lab: lab ? str(lab) : null, h: h ? str(h) : null, ps,
          cta: a ? { ...str(a), href: a.getAttribute("href") || null, id: a.id || null } : null }));
        continue;
      }

      /* definition list --------------------------------------------------- */
      if (tag === "dl") {
        const items = [...c.querySelectorAll("div")].map(d => {
          const dt = d.querySelector("dt"), dd = d.querySelector("dd");
          return dt && dd ? { k: str(dt), v: str(dd) } : null;
        }).filter(Boolean);
        blocks.push(node("dl", { items, card: has(c, "card") }));
        continue;
      }

      /* bank details (each row copies on tap) ----------------------------- */
      if (has(c, "bank")) {
        const items = [...c.querySelectorAll(".bk")].map(b => ({
          k: str(b.querySelector(".bk-k")), v: str(b.querySelector(".bk-v")),
        }));
        blocks.push(node("bank", { items }));
        continue;
      }

      /* a card is a container: recurse ------------------------------------ */
      if (has(c, "card")) {
        const inner = [];
        /* a plain list-of-divs card, e.g. the founders */
        const divs = [...c.children].filter(x => x.tagName === "DIV" && !x.children.length ||
                                                (x.tagName === "DIV" && [...x.children].every(y => y.tagName === "SPAN")));
        const anyKV = divs.some(d => d.querySelector('[class$="-k"], :scope > .k, :scope > .n') &&
                                     d.querySelector('[class*="-v"], :scope > .v, :scope > .p'));
        if (divs.length >= 3 && divs.length === c.children.length && !anyKV) {
          inner.push(node("list", {
            items: divs.map(d => {
              const notes = [...d.querySelectorAll(".ab-note,.ab-now")];
              const main = d.querySelector("span:not(.ab-note):not(.ab-now)");
              return { ...(main ? str(main) : str(d)), note: notes.length ? str(notes[0]) : null,
                       now: notes.some(n => n.classList.contains("ab-now")) };
            }),
          }));
        } else if (walk(c, inner) === "stop") { blocks.push(node("card", { blocks: inner })); return "stop"; }
        blocks.push(node("card", { blocks: inner }));
        continue;
      }

      /* chip rows --------------------------------------------------------- */
      if (has(c, "ab-plans") || has(c, "gv-grid") || has(c, "md-chips")) {
        const kids = [...c.children];
        blocks.push(node("chips", {
          items: kids.map(k => {
            const t1 = k.querySelector(".gv-t"), t2 = k.querySelector(".gv-s");
            return t1 ? { ...str(t1), sub: t2 ? str(t2) : null } : str(k);
          }),
        }));
        continue;
      }

      /* a legal advisory: a headline and the warning under it ------------- */
      if (/-advisory$/.test(c.className)) {
        const h = c.querySelector('[class$="-adv-h"], h3, h4');
        blocks.push(node("advisory", { h: h ? str(h) : null,
          ps: [...c.querySelectorAll("p")].map(str).filter(x => x.t) }));
        continue;
      }

      /* "the masjid does not provide this directly" — a standing caveat ---- */
      if (/notprovided|not-provided/.test(c.className)) {
        blocks.push(node("warn", str(c))); continue;
      }

      /* a boxed notice: an icon and one run of prose ----------------------- */
      if (/-notice$/.test(c.className)) {
        const sp = [...c.children].find(x => x.tagName === "SPAN" && !/-ico$/.test(x.className));
        blocks.push(node("notice", sp ? str(sp) : str(c))); continue;
      }

      /* a ticked list of rules -------------------------------------------- */
      if (tag === "ul" || tag === "ol") {
        blocks.push(node("ticks", {
          ordered: tag === "ol",
          items: [...c.querySelectorAll(":scope > li")].map(li => {
            const sp = [...li.children].find(x => x.tagName === "SPAN" && !x.classList.contains("tick"));
            return sp ? str(sp) : str(li);
          }).filter(x => x.t),
        }));
        continue;
      }

      /* an outbound call to action, with or without a strapline ----------- */
      if ((tag === "a" || tag === "button") &&
          /(donate-cta|ad-apply|hh-cta|cc-cta|bk-cta|nk-cta|fn-cta)/.test(c.className + " " + c.id)) {
        const m = c.querySelector(".dc-main,.hh-cta-m,.bk-cta-m");
        const sub = c.querySelector(".dc-sub,.hh-cta-s,.bk-cta-s");
        blocks.push(node("cta", {
          ...(m ? str(m) : str(c)), sub: sub ? str(sub) : null,
          href: c.getAttribute("href") || null, id: c.id || null,
        }));
        continue;
      }

      /* a key/value row: Address, Telephone, Email, Website, Radio … ------ */
      if (/(^|\s)[a-z-]*-(row|line|r)(\s|$)/.test(c.className)) {
        const k = c.querySelector('[class$="-k"], :scope > .k, :scope > * > .k, :scope > .n');
        const v = c.querySelector('[class*="-v"], :scope > .v, :scope > * > .v, :scope > .p');
        if (k && v) {
          const href = c.getAttribute("href") || null;
          blocks.push(node("kv", {
            k: str(k), v: str(v), href,
            icon: !href ? (/radio|frequency/i.test(k.textContent || "") ? "radio" : null)
                : href.startsWith("tel:") ? "call"
                : href.startsWith("mailto:") ? "mail"
                : /maps\./.test(href) ? "location" : "globe",
            id: c.id || null, static: has(c, "static") || !href,
          }));
          continue;
        }
      }

      /* social icon strip -------------------------------------------------- */
      if (has(c, "dr-social")) {
        blocks.push(node("social", {
          items: [...c.querySelectorAll("a")].map(a => ({
            href: a.getAttribute("href"), label: a.getAttribute("aria-label") || "",
          })),
        }));
        continue;
      }

      /* a navigation / call row ------------------------------------------- */
      if (has(c, "md-row") || has(c, "hh-call") || has(c, "ab-video") || has(c, "dr-row")) {
        const t1 = c.querySelector(".md-t1,.hh-call-k,.ab-v1");
        const t2 = c.querySelector(".md-t2,.hh-call-v,.ab-v2");
        blocks.push(node("row", {
          label: t1 ? str(t1) : str(c), sub: t2 ? str(t2) : null,
          href: c.getAttribute("href") || null, id: c.id || null,
          soon: (() => { const t = c.querySelector(".soon-tag"); return t ? str(t) : (has(c, "soon") ? { t: "Coming soon" } : null); })(),
        }));
        continue;
      }

      /* the big primary action ------------------------------------------- */
      if (tag === "button" && /(-cta|-donate|ab-donate|gv-cta)/.test(c.className + " " + c.id)) {
        blocks.push(node("cta", { ...str(c), id: c.id || null })); continue;
      }
      if (tag === "a" && has(c, "gv-cta")) {
        const m = c.querySelector(".gv-cta-m"), sb = c.querySelector(".gv-cta-s");
        blocks.push(node("cta", { ...(m ? str(m) : str(c)), sub: sb ? str(sb) : null,
                                  href: c.getAttribute("href") || null, id: c.id || null }));
        continue;
      }

      /* footer ------------------------------------------------------------ */
      if (/-foot$/.test(c.className) || has(c, "ab-foot")) {
        blocks.push(node("foot", { lines: txt(c).split("\n").filter(Boolean) })); continue;
      }

      /* a term: a bold line that titles the paragraph under it ------------ */
      if (/(^|\s)[a-z-]*-term(\s|$)/.test(c.className)) {
        const b = c.querySelector("b,strong"), ps = [...c.querySelectorAll("p")].map(str).filter(x => x.t);
        if (b) { blocks.push(node("sub", str(b))); ps.forEach(x => blocks.push(node("note", x))); continue; }
      }

      /* plain prose ------------------------------------------------------- */
      if (tag === "p") {
        const t = txt(c); if (!t) continue;
        const cls = c.className;
        blocks.push(node(/note$/.test(cls) || /hint/.test(cls) ? "note" : "p", str(c)));
        continue;
      }
      if (/^h[1-6]$/.test(tag) || tag === "b" || tag === "strong") { blocks.push(node("sub", str(c))); continue; }

      if (tag === "a") {
        blocks.push(node("link", { ...str(c), href: c.getAttribute("href") })); continue;
      }

      /* anything else is a wrapper */
      if (c.children.length) { if (walk(c, blocks) === "stop") return "stop"; continue; }
      const t = txt(c);
      if (t) blocks.push(node("p", str(c)));
    }
  }

  const res = {};
  for (const spec of ids) {
    const id = typeof spec === "string" ? spec : spec.id;
    STOP = (typeof spec === "object" && spec.stopKey) || null;
    const sheet = document.getElementById(id);
    if (!sheet) { res[id] = { missing: true }; continue; }
    const title = sheet.querySelector(".sh-top h3");
    const body = sheet.querySelector(".sh-body");
    const blocks = [];
    if (body) walk(body, blocks);
    res[id] = { title: title ? str(title) : { t: id }, blocks };
  }
  return res;
}, SHEETS);

await browser.close();

fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, "sheets.json"), JSON.stringify(out, null, 1));

/* A visible tally, because "it ran" is not the same as "it got the content". */
const count = b => b.reduce((n, x) => n + 1 + (x.blocks ? count(x.blocks) : 0), 0);
let keys = 0;
const walkKeys = b => b.forEach(x => {
  for (const v of Object.values(x)) {
    if (v && typeof v === "object") {
      if (v.k) keys++;
      if (Array.isArray(v)) v.forEach(y => { if (y && y.k) keys++; if (y && y.k && y.k.k) keys++; });
    }
  }
  if (x.blocks) walkKeys(x.blocks);
});
for (const spec of SHEETS) {
  const id = typeof spec === "string" ? spec : spec.id;
  const s = out[id];
  if (s.missing) { console.log(id.padEnd(16), "MISSING"); continue; }
  const before = keys; walkKeys(s.blocks);
  console.log(id.padEnd(16), String(count(s.blocks)).padStart(4), "blocks ", String(keys - before).padStart(4), "i18n keys");
}
console.log("\nwrote src/data/sheets.json");
