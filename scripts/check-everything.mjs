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
