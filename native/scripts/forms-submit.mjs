/**
 * Does each form actually send — and does it say so only when it did?
 *
 * WHY THIS EXISTS. rpc() answers {ok, data} or {ok:false, message}; it never
 * answers the row the Postgres function returned. The charity collection form
 * stored that answer whole and tested it for truthiness, so a request the
 * masjid had REFUSED drew "Your request has been sent" and the reference it
 * tells people to keep was never there to print. A test that only pressed Send
 * and looked for the success screen would have called that a pass — so each
 * form is put through twice: once with the masjid accepting, once with it
 * refusing, and the refusal must NOT produce a success screen.
 *
 * It fills whatever the screen puts in front of it rather than knowing the
 * fields by name: every box gets something of the right shape, the first option
 * of every choice is taken, every box is ticked. A form that grows a field
 * keeps being filled; a form that grows a REQUIRED field it cannot fill fails
 * here, which is the right way round.
 *
 *   node scripts/forms-submit.mjs
 */
import pw from "/opt/node22/lib/node_modules/playwright/index.js";
import http from "node:http"; import fs from "node:fs"; import path from "node:path";

const DIST = path.resolve(import.meta.dirname, "../dist");
if (!fs.existsSync(path.join(DIST, "index.html")))
  { console.error("no dist/ — run: npx expo export --platform web --output-dir dist"); process.exit(1); }
const TYPES = { ".js": "text/javascript", ".html": "text/html", ".ttf": "font/ttf",
                ".png": "image/png", ".json": "application/json", ".css": "text/css" };
const server = http.createServer((req, res) => {
  let p = path.join(DIST, decodeURIComponent(req.url.split("?")[0]));
  if (!fs.existsSync(p) || fs.statSync(p).isDirectory()) p = path.join(DIST, "index.html");
  res.setHeader("Content-Type", TYPES[path.extname(p)] || "application/octet-stream");
  fs.createReadStream(p).pipe(res);
});
await new Promise(r => server.listen(4183, r));

const REFERENCE = "ZZ-26-0042";
const REFUSAL = "The masjid already has a request from this email address for that date.";

const results = [];
const ok = (yes, line) => { results.push(`${yes ? "ok  " : "FAIL"} ${line}`); return yes; };

const browser = await pw.chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });

/* Each form, twice: accepted, then refused. */
/* Each form ends in its own words, and they matter: the hall does not say
   "sent", it says the date is HELD, because the deposit is what books it. */
const FORMS = [
  ["the imāms' advice", "menu", /^Imams. Advice$/, /question is with the imams|Your question/i],
  ["the nikāḥ request", "home", /^Nik.*Services$/, /Request sent/i],
  ["the hall booking",  "home", /^Hall Booking$/, /date is held for you/i],
  /* The one the fault was actually in. It asks for the charity's BMCC
     certificate before it will send, so a file has to be handed to the picker. */
  ["the charity collection", "home", /^Charity Collections$/, /request has been sent/i],
];

for (const [name, where, label, success] of FORMS) {
  for (const accepted of [true, false]) {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    let posted = false;
    await page.route(/supabase\.co/, route => {
      const url = route.request().url();
      if (!/\/rpc\/request_/.test(url))
        return route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
      /* isOpen() asks with an empty payload and reads the status; a real
         request carries the form. Both get the same answer while the masjid is
         accepting, and only the real one is refused. */
      const body = route.request().postData() || "";
      const real = body.length > 120;
      if (real) posted = true;
      if (accepted || !real)
        return route.fulfill({ status: 200, contentType: "application/json",
                               body: JSON.stringify({ reference: REFERENCE }) });
      return route.fulfill({ status: 409, contentType: "application/json",
                             body: JSON.stringify({ message: REFUSAL }) });
    });
    /* expo-document-picker opens a file chooser on the web as it opens the
       phone's one. A real file is handed to it — a one-pixel PNG — because the
       screen checks the type and the size before it will accept it. */
    page.on("filechooser", async chooser => {
      const png = Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
        "base64");
      await chooser.setFiles([{ name: "certificate.png", mimeType: "image/png", buffer: png }]).catch(() => {});
    });
    await page.goto("http://localhost:4183/", { waitUntil: "networkidle" });
    await page.waitForTimeout(2600);
    for (let i = 0; i < 10; i++) {
      const notNow = page.getByText(/^Not now$/).first();
      if (await notNow.isVisible().catch(() => false)) { await notNow.click().catch(() => {}); break; }
      await page.waitForTimeout(300);
    }

    const tapText = async re => {
      const all = page.getByText(re); const n = await all.count();
      for (let i = 0; i < n; i++) {
        const el = all.nth(i);
        if (!(await el.isVisible())) continue;
        try { await el.click({ timeout: 2500 }); await page.waitForTimeout(500); return true; } catch {}
        for (const role of ["button", "tab"]) {
          try { await el.locator(`xpath=ancestor-or-self::*[@role="${role}"]`).first().click({ timeout: 1200 });
                await page.waitForTimeout(500); return true; } catch {}
        }
      }
      return false;
    };
    if (where === "menu") await tapText(/^More$/);
    if (!(await tapText(label))) { ok(false, `${name}: could not open the screen`); await page.close(); continue; }
    await page.waitForTimeout(900);

    /* A day, where there is a calendar. */
    const days = page.locator('[role="button"]').filter({ hasText: /^(1[5-9]|2[0-8])$/ });
    const dn = await days.count();
    for (let i = 0; i < dn; i++) {
      const d = days.nth(i);
      if (!(await d.isVisible().catch(() => false))) continue;
      if (await d.getAttribute("aria-disabled") === "true") continue;
      await d.scrollIntoViewIfNeeded().catch(() => {});
      try { await d.click({ timeout: 1500 }); break; } catch {}
    }
    await page.waitForTimeout(500);

    /* Every box, every choice, every tick. Run twice where a screen asks a
       question before it shows the form: the hall confirms the day and what is
       being hired before it asks for a name, as the website does. */
    const fill = async () => await page.evaluate(() => {
      const set = (el, v) => {
        const proto = el.tagName === "TEXTAREA" ? HTMLTextAreaElement : HTMLInputElement;
        Object.getOwnPropertyDescriptor(proto.prototype, "value").set.call(el, v);
        el.dispatchEvent(new Event("input", { bubbles: true }));
        el.dispatchEvent(new Event("change", { bubbles: true }));
      };
      let n = 0;
      for (const el of document.querySelectorAll("input, textarea")) {
        if (el.type === "file" || el.closest('[aria-hidden="true"]')) continue;
        const kind = (el.inputMode || el.type || "").toLowerCase();
        const hint = ((el.placeholder || "") + " " + (el.getAttribute("aria-label") || "")).toLowerCase();
        let v = "Test Person";
        if (el.type === "email" || kind === "email") v = "test@example.com";
        else if (kind === "tel") v = "07000 000000";
        else if (kind === "numeric" || kind === "number") v = "25";
        else if (/postcode|post code/.test(hint)) v = "BL1 1AA";
        set(el, v);
        n++;
      }
      return n;
    });
    /* The postcode and age boxes are told apart by their label rather than the
       keyboard they ask for, so fill the ones the form will refuse by shape. */
    const byLabel = async () => {
      /* A date the screen will accept: the certificate must have been issued
         within the last three months, so a month ago rather than today. */
      const d = new Date(); d.setMonth(d.getMonth() - 1);
      const recent = d.toISOString().slice(0, 10);
      for (const [re, v] of [[/postcode/i, "BL1 1AA"], [/age/i, "30"],
                             [/date on the certificate/i, recent]]) {
        const labels = page.getByText(re);
        const n = await labels.count();
        for (let i = 0; i < n; i++) {
          const box = labels.nth(i).locator("xpath=following::input[1]");
          try { await box.fill(v, { timeout: 700 }); } catch {}
        }
      }
    };
    /* TICKING TWICE UNTICKS. choose() presses things that toggle, so it
       remembers what it has already pressed: the charity collection form was
       filled, its two agreement boxes ticked, its certificate attached — and
       the second pass over the page turned both boxes off again, so the run
       reported a form that would not send when what would not send was the
       test. */
    const pressed = new Set();
    const choose = async () => {
      const radios = page.locator('[role="radio"]');
      const rn = await radios.count();
      const groups = new Set();
      for (let i = 0; i < rn; i++) {
        const r = radios.nth(i);
        if (!(await r.isVisible().catch(() => false))) continue;
        const box = await r.boundingBox().catch(() => null);
        if (!box) continue;
        const row = Math.round(box.y / 40);                   // one per band of the page
        if (groups.has(row)) continue;
        groups.add(row);
        try { await r.click({ timeout: 900 }); } catch {}
      }
      for (const cb of await page.locator('[role="checkbox"]').all()) {
        if (!(await cb.isVisible().catch(() => false))) continue;
        if (await cb.getAttribute("aria-checked") === "true") continue;
        const where = JSON.stringify(await cb.boundingBox().catch(() => null)) + (await cb.textContent().catch(() => ""));
        if (pressed.has(where)) continue;
        pressed.add(where);
        try { await cb.click({ timeout: 900 }); } catch {}
      }
    };
    let filled = await fill();
    await byLabel(); await choose();

    /* The certificate, where one is asked for. */
    const pick = page.getByText(/^(Choose a file|Choose the certificate|Attach|Upload)/).first();
    if (await pick.isVisible().catch(() => false)) {
      try { await pick.click({ timeout: 2500 }); await page.waitForTimeout(1200); } catch {}
      filled += await fill();
      await byLabel();
    }

    /* The hall asks before it shows the form: the day, what is being hired and
       the terms, then Book. Nothing else in the app has a step like it. */
    const book = page.getByText(/^Book$/).last();
    if (await book.isVisible().catch(() => false)) {
      await book.scrollIntoViewIfNeeded().catch(() => {});
      try { await book.click({ timeout: 2500 }); await page.waitForTimeout(900); } catch {}
      filled += await fill();
      await byLabel();
    }

    /* Each form's own words for the last button: the hall's says what happens
       next ("Continue to the deposit"), because paying is what books it. */
    await choose();
    const send = page.getByText(/^(Send|Send my request|Send this request|Send the request|Continue to the deposit)/).last();
    try { await send.scrollIntoViewIfNeeded(); await send.click({ timeout: 4000 }); }
    catch {
      ok(false, `${name}: could not press Send`);
      if (process.env.SHOT) await page.screenshot({ path: `/tmp/claude-0/forms-${name.replace(/\W+/g, "")}-${accepted}.png`, fullPage: true });
      await page.close(); continue;
    }
    await page.waitForTimeout(2500);

    const text = await page.evaluate(() => document.body.textContent);
    if (process.env.SHOT && accepted && !(success.test(text) && text.includes(REFERENCE))) {
      console.log("   [what the screen says instead] …" + text.slice(-320).replace(/\s+/g, " "));
      await page.screenshot({ path: `/tmp/claude-0/forms-${name.replace(/\W+/g, "")}-sent.png`, fullPage: true });
    }
    if (process.env.SHOT && !posted) {
      console.log("   [why it did not send] " +
        (text.match(/Please [^.]{0,120}\./g) || ["(no message on screen)"]).join(" | "));
      await page.screenshot({ path: `/tmp/claude-0/forms-${name.replace(/\W+/g, "")}-${accepted}.png`, fullPage: true });
    }
    const sent = success.test(text) && text.includes(REFERENCE);
    if (accepted) {
      ok(sent, `${name}: accepted — the screen answers in its own words and shows ${REFERENCE}`);
    } else {
      /* Without this the two checks below would both pass on a form that never
         sent anything at all — which is the shape of check this whole file
         exists because of. */
      ok(posted, `${name}: refused — the form did reach the masjid`);
      ok(!text.includes(REFERENCE), `${name}: refused — no reference is printed`);
      ok(/didn.t send|already has a request|Please/i.test(text),
         `${name}: refused — the screen says what went wrong`);
    }
    /* Filling nothing would make all of the above meaningless. */
    if (filled < 3) ok(false, `${name}: only ${filled} field(s) were filled — this run proved nothing`);
    await page.close();
  }
}

await browser.close(); server.close();
console.log("the forms, accepted and refused:\n");
results.forEach(r => console.log("  " + r));
if (results.some(r => r.startsWith("FAIL"))) process.exit(1);
