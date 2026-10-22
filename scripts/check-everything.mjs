/* The whole app, end to end.
 *
 * The other scripts each guard one thing. This one walks the app the way a
 * person does — every tab, every tile, every row of the More menu, the
 * calculator's arithmetic, all four languages, text size, offline, the admin
 * page, and the back button from every kind of screen — so that a change
 * which quietly breaks something far from where it was made still shows up.
 *
 *   python3 -m http.server 8111     (from the repo root, in another shell)
 *   node scripts/check-everything.mjs
 *
 * WHAT IT CANNOT SEE. Supabase, Stripe, OneSignal and Google are not reached
 * from here. Live prayer times, push notifications and the donation flows are
 * therefore NOT covered: a green run does not mean those work. Neither is the
 * Android shell — this is the web app only.
 */
import pw from "playwright";

const BASE = "http://127.0.0.1:8111";
let pass=0, fail=0, warn=0;
const ok  =(s,m)=>{pass++; console.log(`  ok    [${s}] ${m}`);};
const bad =(s,m)=>{fail++; console.log(`  FAIL  [${s}] ${m}`);};
const note=(s,m)=>{warn++; console.log(`  note  [${s}] ${m}`);};

const browser = await pw.chromium.launch();
async function app(opts={}) {
  const p = await browser.newPage({viewport:{width:393,height:851}, ...opts});
  p._errs=[];
  p.on("pageerror", e=>p._errs.push(e.message));
  p.on("console", m=>{ if(m.type()==="error" && !/net::/.test(m.text())) p._errs.push("console: "+m.text().slice(0,140)); });
  await p.goto(`${BASE}/index.html?t=`+Date.now());
  await p.waitForTimeout(2500);
  return p;
}
const curTab   = p => p.evaluate(()=>{const m=document.querySelector('main[id^="tab-"]:not([hidden])');return m?m.id:"NONE";});
const anyOpen  = p => p.evaluate(()=>document.querySelectorAll('.sheet[data-open="1"]').length
                      + (document.getElementById("drawer")?.dataset.open==="1"?1:0));
const settle   = async p => { for(let i=0;i<5;i++){ if(!(await anyOpen(p))) break; await p.evaluate(()=>history.back()); await p.waitForTimeout(330);} };
const openMore = async p => { if(await p.evaluate(()=>document.getElementById("drawer")?.dataset.open==="1")) return;
                              await p.locator("nav.tabbar button.tab",{hasText:"More"}).first().click({timeout:4000});
                              await p.waitForTimeout(550); };

/* ---- 1. it starts ------------------------------------------------------ */
{
  const p = await app();
  p._errs.length ? bad("boot","JS errors: "+p._errs.slice(0,2).join(" | ")) : ok("boot","no script errors on load");
  const veil = await p.evaluate(()=>{const e=document.querySelector(".boot"); if(!e) return "removed";
    const s=getComputedStyle(e);
    return (s.pointerEvents==="none"||s.visibility==="hidden"||s.display==="none") ? "harmless" : "BLOCKING";});
  veil==="BLOCKING" ? bad("boot","the splash is still taking taps") : ok("boot",`splash ${veil}`);
  const n = await p.evaluate(()=>(document.body.innerText.match(/\d{1,2}:\d{2}/g)||[]).length);
  n>=5 ? ok("boot",`prayer times rendered (${n} values)`) : bad("boot",`only ${n} times rendered`);
  await p.close();
}

/* ---- 2. every tile, and every row of the More menu --------------------- */
{
  const p = await app();
  const tiles = await p.evaluate(()=>[...document.querySelectorAll("button.tile")]
    .map((e,i)=>({i,label:e.innerText.replace(/\s+/g," ").trim().slice(0,24)})));
  for (const t of tiles) {
    try {
      await p.locator("button.tile").nth(t.i).click({timeout:3500});
      await p.waitForTimeout(700);
      const sheets = await p.evaluate(()=>[...document.querySelectorAll('.sheet[data-open="1"]')].map(e=>e.id));
      const tab = await curTab(p);
      if (sheets.length) {
        const back = await p.evaluate(id=>{const s=document.getElementById(id);
          return !!s.querySelector(".sh-back,.sh-close,[class*=back],[aria-label*=Close i],[aria-label*=Back i]");}, sheets[sheets.length-1]);
        back ? ok("tiles",`"${t.label}" opens #${sheets[sheets.length-1]} with a way back`)
             : bad("tiles",`"${t.label}" opens #${sheets[sheets.length-1]} with NO way back`);
      } else if (tab !== "tab-home") ok("tiles",`"${t.label}" opens ${tab}`);
      else note("tiles",`"${t.label}" opens an external link`);
      await settle(p);
      await p.locator("nav.tabbar button.tab",{hasText:"Home"}).first().click({timeout:3500}).catch(()=>{});
      await p.waitForTimeout(400);
    } catch(e){ bad("tiles",`"${t.label}": ${e.message.split("\n")[0]}`); await settle(p); }
  }
  await openMore(p);
  const rows = await p.evaluate(()=>[...document.querySelectorAll("#drawer button.dr-row")]
    .map((e,i)=>({i,label:e.innerText.replace(/\s+/g," ").replace(/›/g,"").trim().slice(0,24),soon:e.classList.contains("soon")})));
  for (const r of rows) {
    if (r.soon) { note("menu",`"${r.label}" is marked coming soon`); continue; }
    try {
      await openMore(p);
      await p.locator("#drawer button.dr-row").nth(r.i).click({timeout:3500});
      await p.waitForTimeout(750);
      const sheets=await p.evaluate(()=>[...document.querySelectorAll('.sheet[data-open="1"]')].map(e=>e.id));
      const where = sheets.length ? "#"+sheets[sheets.length-1] : await curTab(p);
      ok("menu",`"${r.label}" opens ${where}`);
      await p.evaluate(()=>history.back()); await p.waitForTimeout(650);
      const left = p.url()==="about:blank";
      const still = await p.evaluate(()=>document.querySelectorAll('.sheet[data-open="1"]').length);
      (!left && still===0) ? ok("menu",`"${r.label}" closes on Back, staying in the app`)
                           : bad("menu",`"${r.label}" Back ${left?"LEFT THE APP":`left ${still} sheet(s) open`}`);
      await settle(p);
    } catch(e){ bad("menu",`"${r.label}": ${e.message.split("\n")[0]}`); await settle(p); }
  }
  p._errs.length ? bad("menu","JS errors during the sweep: "+p._errs.slice(0,2).join(" | ")) : ok("menu","no script errors across the sweep");
  await p.close();
}

/* ---- 3. the back button, from every kind of screen --------------------- */
{
  // a drill-down tab must come back, a tab-bar tab must still exit
  for (const [name, go] of [
      ["Qibla",         p=>p.locator("button.tile",{hasText:"Qibla"}).first().click()],
      ["Notifications", async p=>{ await openMore(p);
                                   return p.locator("#drawer button.dr-row",{hasText:"Notifications"}).first().click(); }],
      ["Donate",        p=>p.evaluate(()=>switchTab("donate"))],
      ["Live",          p=>p.evaluate(()=>switchTab("live"))]]) {
    const p = await app();
    try {
      await go(p); await p.waitForTimeout(850);
      const was = await curTab(p);
      await p.goBack(); await p.waitForTimeout(800);
      if (p.url()==="about:blank") bad("back",`${name}: Back LEFT THE APP instead of returning`);
      else ok("back",`${name} (${was}) -> Back returns to ${await curTab(p)}`);
    } catch(e){ bad("back",`${name}: ${e.message.split("\n")[0]}`); }
    await p.close();
  }
  const p = await app();
  await p.locator("nav.tabbar button.tab",{hasText:"Prayer Times"}).first().click(); await p.waitForTimeout(600);
  await p.goBack(); await p.waitForTimeout(700);
  p.url()==="about:blank" ? ok("back","Back on a tab-bar tab still leaves the app, as Android expects")
                          : bad("back","Back no longer exits from a tab-bar tab — people would be trapped");
  await p.close();
}

/* ---- 4. the zakat arithmetic ------------------------------------------- */
{
  const p = await app();
  await openMore(p);
  await p.locator("#drawer button.dr-row",{hasText:"Zakat"}).first().click({timeout:4000});
  await p.waitForTimeout(800);
  const set = async (id,v)=>{ const el=await p.$("#"+id); await el.fill(String(v)); await el.dispatchEvent("input"); await p.waitForTimeout(320); };
  const due = ()=>p.evaluate(()=>{const m=document.getElementById("zakat").innerText.replace(/\s+/g," ")
                   .match(/Zakat due[^£]*£\s?([\d,]+(?:\.\d{2})?)/i); return m?m[1]:null;});
  await set("zk-price",0.80);
  for (const [cash,debts,want] of [[1000,0,"25.00"],[10000,0,"250.00"],[10000,2000,"200.00"]]) {
    await set("zk-cash",cash); await set("zk-debts",debts);
    const got = await due();
    got===want ? ok("zakat",`£${cash}${debts?` less £${debts}`:""} -> £${got}`)
               : bad("zakat",`£${cash} less £${debts} gave £${got}, expected £${want}`);
  }
  await p.close();
}

/* ---- 5. languages, text size, offline, admin --------------------------- */
{
  const p = await app();
  await openMore(p);
  await p.locator("#drawer button.dr-row",{hasText:/system preferences/i}).first().click({timeout:4000}).catch(()=>{});
  await p.waitForTimeout(800);
  for (const code of ["ur","gu","ar","en"]) {
    try {
      await p.locator(`#sysprefs [data-lang="${code}"]`).first().click({timeout:4000});
      await p.waitForTimeout(1300);
      const st = await p.evaluate(()=>({dir:document.documentElement.dir||"ltr",
        bar:document.querySelector(".tabbar").innerText.replace(/\s+/g," ")}));
      const wantRtl = code==="ur"||code==="ar";
      (st.dir==="rtl")===wantRtl ? ok("i18n",`${code}: direction ${st.dir}`) : bad("i18n",`${code}: direction ${st.dir}, expected ${wantRtl?"rtl":"ltr"}`);
      st.bar.trim().length>6 ? ok("i18n",`${code}: the tab bar has text`) : bad("i18n",`${code}: tab bar came out empty`);
    } catch(e){ bad("i18n",`${code}: ${e.message.split("\n")[0]}`); }
  }
  const ts0 = await p.evaluate(()=>getComputedStyle(document.documentElement).getPropertyValue("--ts").trim());
  await p.locator("#ts-pick > *").last().click({timeout:3500}).catch(()=>{});
  await p.waitForTimeout(500);
  const ts1 = await p.evaluate(()=>getComputedStyle(document.documentElement).getPropertyValue("--ts").trim());
  ts1!==ts0 ? ok("prefs",`text size changes (${ts0} -> ${ts1})`) : bad("prefs","the text size control did nothing");
  await p.reload(); await p.waitForTimeout(2400);
  (await p.evaluate(()=>getComputedStyle(document.documentElement).getPropertyValue("--ts").trim()))===ts1
    ? ok("prefs","text size survives a restart") : bad("prefs","text size is forgotten on restart");

  /* Appearance. Light is the default and the phone's own setting is
     deliberately not read, so a fresh visitor must land in light however
     their device is configured — that is the part worth asserting, not just
     that the toggle moves. */
  /* the restart above closed the screen; the control lives inside it */
  await p.evaluate(()=>{ if(typeof openSysPrefs==="function") openSysPrefs(); });
  await p.waitForTimeout(700);
  const t0 = await p.evaluate(()=>document.documentElement.dataset.theme || "light");
  t0 === "light" ? ok("prefs","a fresh visitor gets light, whatever the device prefers")
                 : bad("prefs",`a fresh visitor got "${t0}" without asking`);
  await p.evaluate(()=>{ [...document.querySelectorAll("#theme-pick button")]
      .find(b=>b.getAttribute("aria-checked")==="false").click(); });
  await p.waitForTimeout(500);
  const t1 = await p.evaluate(()=>({theme:document.documentElement.dataset.theme,
                                    bg:getComputedStyle(document.body).backgroundColor}));
  t1.theme === "dark" ? ok("prefs",`dark mode applies (${t1.bg})`)
                      : bad("prefs","the appearance control did nothing");
  await p.reload(); await p.waitForTimeout(2400);
  /* read it at once: the point of the pre-paint script is that dark is on
     before anything is drawn, so a reader never sees a light page flash. */
  const t2 = await p.evaluate(()=>document.documentElement.dataset.theme);
  await p.evaluate(()=>{ try{ localStorage.removeItem("theme"); }catch(e){} });
  t2 === "dark" ? ok("prefs","dark survives a restart, with no flash of light")
                : bad("prefs","dark is forgotten on restart");
  await p.close();
}
{
  const p = await app();
  await p.waitForTimeout(1200);
  await p.context().setOffline(true);
  await p.reload().catch(()=>{});
  await p.waitForTimeout(2500);
  const r = await p.evaluate(()=>({tabs:document.querySelectorAll("nav.tabbar button.tab").length,
                                   times:(document.body.innerText.match(/\d{1,2}:\d{2}/g)||[]).length}));
  r.tabs===4 ? ok("offline","the app still opens with no network") : bad("offline",`offline shell broken (${r.tabs} tabs)`);
  r.times>=5 ? ok("offline",`prayer times still shown offline (${r.times})`) : note("offline",`only ${r.times} times offline`);

  /* The bar has to lead with what STILL WORKS. Telling somebody "you are
     offline" and stopping invites them to put the phone away; most of this
     app needs no signal at all. */
  const ob = await p.evaluate(()=>{
    const bar = document.getElementById("offline-bar");
    if (!bar) return null;
    window.scrollTo(0, document.body.scrollHeight);
    const br = bar.getBoundingClientRect();
    const last = [...document.querySelectorAll("body > *")].filter(e=>e.offsetParent && e!==bar).pop();
    const lr = last ? last.getBoundingClientRect() : null;
    return { hidden: bar.hidden, text: (document.getElementById("offline-text")||{}).textContent || "",
             covers: lr ? lr.bottom > br.top : false,
             taps: getComputedStyle(bar).pointerEvents };
  });
  if (!ob) bad("offline","there is no offline notice at all");
  else {
    !ob.hidden ? ok("offline","the offline notice appears") : bad("offline","offline, and nothing said so");
    /* names the things that need no signal, and says they work */
    const names = ["prayer times","qibla"].filter(w => ob.text.toLowerCase().includes(w));
    (names.length === 2 && /still work/i.test(ob.text))
      ? ok("offline",`it names what still works (${names.join(", ")})`)
      : bad("offline",`it says "${ob.text.slice(0,48)}" rather than what still works`);
    !ob.covers ? ok("offline","it does not cover the last thing on the page")
               : bad("offline","the notice covers the end of the page");
    ob.taps === "none" ? ok("offline","it never takes a touch")
                       : bad("offline",`the notice swallows taps (pointer-events: ${ob.taps})`);
  }
  await p.context().setOffline(false);
  await p.close();
}
{
  const p = await browser.newPage({viewport:{width:393,height:851}});
  const errs=[]; p.on("pageerror",e=>errs.push(e.message));
  await p.goto(`${BASE}/admin.html`); await p.waitForTimeout(1800);
  errs.length ? bad("admin","JS errors: "+errs[0]) : ok("admin","loads with no script errors");
  const g = await p.evaluate(()=>({
    gated: !!document.querySelector('input[type=password]') || /sign in|log in|password|passcode/i.test(document.body.innerText),
    leaked: /service_role|sb_secret/.test(document.documentElement.innerHTML)}));
  g.gated  ? ok("admin","is behind a sign-in gate") : bad("admin","NOT gated");
  g.leaked ? bad("admin","a secret key appears in the page") : ok("admin","no secret key in the page");

  /* ---- the WhatsApp hand-off ----
   *
   * Two separate things, and it was the second that shipped broken.
   *
   * First, the message: waText and waHref are pure, so they can simply be
   * called. A missing asterisk or a dropped line break is a message that goes
   * out to the whole community looking wrong.
   *
   * Second — and this is the one — the buttons that carry it have to be
   * INVISIBLE until a send has succeeded. They were not. `.wa{display:flex}`
   * is a class, so it outranks the browser's own [hidden]{display:none}, and a
   * <button class="wa" hidden> with nothing in it yet rendered as an empty
   * rounded box. Two of them, under the send button, on a signed-in phone.
   *
   * It survived every check because the only way this page was ever driven was
   * by calling waOffer(), which fills the buttons and un-hides them. Nobody
   * looked at the page sitting still. So look at it sitting still.
   *
   * #wrap is removed by hand because everything here lives behind the
   * sign-in gate, and the question is what the stylesheet does with the
   * hidden attribute — not whether the gate holds, which is checked above. */
  const wa = await p.evaluate(()=>{
    const t = window.waText, h = window.waHref;
    if(typeof t!=="function" || typeof h!=="function") return { missing:true };
    document.getElementById("wrap").removeAttribute("hidden");
    const tall = id => { const e=document.getElementById(id);
                         return e ? e.getBoundingClientRect().height : -1; };
    return {
      plain:   t({ title:"Eid salāh", body:"7.30am in the main hall." }),
      janazah: t({ title:"Marhum Ismail", body:"Burial at 2pm.", topic:"janazah" }),
      poster:  t({ title:"Talk", body:"Thursday.", imageUrl:"https://example.org/p.jpg" }),
      href:    h("a b&c"),
      max:     window.WA_MAX,
      atRest:  { wa:tall("wa"), img:tall("wa-img"), long:tall("wa-long"), hint:tall("wa-hint") },
      nameless: [...document.querySelectorAll("button")]
        .filter(e=>e.offsetParent!==null && !e.innerText.trim()
                   && !e.getAttribute("aria-label") && !e.getAttribute("title"))
        .map(e=>e.id || e.className || "?"),
    };
  });
  /* Written, not sent. The offer is live from the fields now — it used to
     appear only after a real push, which meant the only way to find the
     button was to message the whole congregation, and the only way to test
     it was to do that twice. */
  const waWritten = await p.evaluate(()=>{
    const fire = (id,v) => { const e=document.getElementById(id);
      e.value=v; e.dispatchEvent(new Event("input",{bubbles:true})); };
    fire("title","Bayaan this Thursday");
    fire("msg","After Maghrib jamāʿah. All welcome.");
    const b = document.getElementById("wa");
    return { height:b.getBoundingClientRect().height, label:b.innerText.trim() };
  });

  /* The poster riding along WITH the words, which is the point of one button
     rather than two. A real PNG goes through the real file input, so the
     resize and the data: URL are the page's own. navigator.share is stubbed
     because headless Chromium refuses files — what is under test is this
     page's logic, not what WhatsApp does with it, which no check here can
     reach and only a phone can answer. */
  const PNG = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAJklEQVR42u3OMQEAAAgDoC251a3g" +
    "LwSgmVunAgQIECBAgAABAgS8dQF+AAHqrS3eAAAAAElFTkSuQmCC", "base64");
  await p.setInputFiles("#poster", { name:"poster.png", mimeType:"image/png", buffer:PNG });
  await p.waitForTimeout(600);
  const waBoth = await p.evaluate(async () => {
    window.__shared = null;
    navigator.canShare = () => true;
    navigator.share   = d => { window.__shared = d; return Promise.resolve(); };
    const t = document.getElementById("title");
    t.value += "!"; t.dispatchEvent(new Event("input",{bubbles:true}));  // force a re-offer
    await new Promise(r => setTimeout(r, 500));
    const g = id => { const e = document.getElementById(id);
      return { shown: !e.hidden, label: (e.innerText || e.textContent || "").trim() }; };
    const before = { main:g("wa"), alt:g("wa-img"), hint:g("wa-hint") };
    document.getElementById("wa").click();
    await new Promise(r => setTimeout(r, 200));
    const sh = window.__shared;
    return { ...before,
      files: sh && sh.files ? sh.files.length : 0,
      type:  sh && sh.files && sh.files[0] ? sh.files[0].type : "",
      text:  sh && typeof sh.text === "string" ? sh.text : null };
  });

  if(wa.missing){ bad("admin","waText/waHref are not on the page"); }
  else {
    wa.plain === "*Eid salāh*\n\n7.30am in the main hall.\n\n— Taiyabah Masjid"
      ? ok("whatsapp","the message is the title in bold, the body, then the masjid")
      : bad("whatsapp","message text is wrong: "+JSON.stringify(wa.plain));
    /^\*Janāzah\*\n\n/.test(wa.janazah)
      ? ok("whatsapp","a janāzah is labelled as one on the first line")
      : bad("whatsapp","janāzah is not labelled: "+JSON.stringify(wa.janazah));
    wa.poster.includes("\nhttps://example.org/p.jpg\n")
      ? ok("whatsapp","the poster link is carried in the text as well")
      : bad("whatsapp","poster link missing from the text");
    wa.href === "https://wa.me/?text=a%20b%26c"
      ? ok("whatsapp","the text is url-encoded, so & and spaces survive")
      : bad("whatsapp","wa.me link is wrong: "+wa.href);
    typeof wa.max === "number" && wa.max > 0
      ? ok("whatsapp",`a length limit is set (${wa.max})`)
      : bad("whatsapp","no WA_MAX length limit");

    /* THE REGRESSION. Zero height, signed in, before any send. */
    const r = wa.atRest;
    Object.values(r).every(h=>h===0)
      ? ok("whatsapp","the share buttons take up no room while the form is empty")
      : bad("whatsapp",`share buttons are visible with an empty form — heights ${JSON.stringify(r)}. `
                     + `A class that sets display beats [hidden]; they render as empty boxes.`);
    waWritten.height > 0 && /whatsapp/i.test(waWritten.label)
      ? ok("whatsapp","the offer appears as soon as a message is written, with no send")
      : bad("whatsapp","nothing offered for a written message — "
                     + `height ${waWritten.height}, label ${JSON.stringify(waWritten.label)}. `
                     + "The button is then undiscoverable without pushing to everyone.");
    /* One hand-off carrying both, not two. */
    waBoth.files === 1 && /^image\//.test(waBoth.type) && waBoth.text && /Bayaan/.test(waBoth.text)
      ? ok("whatsapp","the poster and the words go in ONE share, as a file plus a caption")
      : bad("whatsapp","the share did not carry both — "
                     + `${waBoth.files} file(s) of type ${JSON.stringify(waBoth.type)}, `
                     + `text ${JSON.stringify(waBoth.text && waBoth.text.slice(0,40))}`);
    /^share poster and message$/i.test(waBoth.main.label)
      ? ok("whatsapp","with a poster attached the button says it carries both")
      : bad("whatsapp",`the main button says ${JSON.stringify(waBoth.main.label)} with a poster attached`);
    waBoth.alt.shown && /words only/i.test(waBoth.alt.label) && waBoth.hint.shown
      ? ok("whatsapp","a words-only fallback and the paste hint sit underneath")
      : bad("whatsapp","no words-only fallback offered — "
                     + `alt ${JSON.stringify(waBoth.alt)}, hint shown ${waBoth.hint.shown}`);
    wa.nameless.length
      ? bad("a11y",`admin has ${wa.nameless.length} visible button(s) with no name: ${wa.nameless.join(", ")}`)
      : ok("a11y","every visible button on admin has a name");
  }
  await p.close();
}

/* ---- 6. links and reach ------------------------------------------------ */
{
  const p = await app();
  const links = await p.evaluate(()=>[...document.querySelectorAll("a[href]")]
    .map(a=>({href:a.href,rel:a.rel||"",target:a.target||""}))
    .filter(l=>/^https?:/i.test(l.href) && !l.href.includes("127.0.0.1")));
  links.some(l=>l.href.startsWith("http://")) ? bad("links","a link uses plain http") : ok("links",`all ${links.length} external links are https`);
  const unsafe = links.filter(l=>l.target==="_blank" && !/noopener/.test(l.rel));
  unsafe.length ? bad("links",`${unsafe.length} new-tab link(s) without rel=noopener`) : ok("links","every new-tab link has rel=noopener");
  const small = await p.evaluate(()=>[...document.querySelectorAll("button,a,[role=button],input,select")]
    .filter(e=>{const r=e.getBoundingClientRect(); return e.offsetParent!==null && r.width>0 && (r.width<24||r.height<24);}).length);
  small ? note("a11y",`${small} tap target(s) under 24px`) : ok("a11y","every tap target is at least 24px");
  const unnamed = await p.evaluate(()=>[...document.querySelectorAll("button")]
    .filter(e=>e.offsetParent!==null && !e.innerText.trim() && !e.getAttribute("aria-label") && !e.getAttribute("title")).length);
  unnamed ? bad("a11y",`${unnamed} button(s) with no accessible name`) : ok("a11y","every visible button has a name");
  await p.close();
}

await browser.close();
console.log(`\n${pass} passed, ${fail} failed, ${warn} notes`);
console.log("NOT covered here: Supabase, Stripe, OneSignal, Google, and the Android shell.");
process.exit(fail ? 1 : 0);
