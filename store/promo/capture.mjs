import { chromium } from "playwright";
const b = await chromium.launch({ executablePath:"/opt/pw-browsers/chromium" });
const ctx = await b.newContext({ viewport:{width:360,height:800}, deviceScaleFactor:3,
                                 hasTouch:true, isMobile:true, serviceWorkers:"block",
                                 permissions:["geolocation"], geolocation:{latitude:53.5869,longitude:-2.4382} });

// The metal-price services are unreachable from this sandbox, so the calculator
// would show its "couldn't fetch" state. Serve plausible quotes instead.
await ctx.route(/api\.gold-api\.com\/price\/XAU/, r => r.fulfill({status:200,contentType:"application/json",body:JSON.stringify({price:2650})}));
await ctx.route(/api\.gold-api\.com\/price\/XAG/, r => r.fulfill({status:200,contentType:"application/json",body:JSON.stringify({price:31})}));
await ctx.route(/frankfurter|er-api|currency-api/, r => r.fulfill({status:200,contentType:"application/json",body:JSON.stringify({rates:{GBP:0.78}})}));
await ctx.route(/goldprice\.org/, r => r.abort());

const page = await ctx.newPage();
const errs=[]; page.on("pageerror",e=>errs.push(String(e)));
await page.goto("http://127.0.0.1:8111/index.html",{waitUntil:"networkidle"});
await page.waitForTimeout(1400);

// ---- 1. home screen, the hero ----
await page.screenshot({path:"/tmp/shots/1-home.png"});
console.log("1 home  :", await page.evaluate(()=>document.querySelector(".tab[data-on='1'], .tabbar .on")?.textContent?.trim() || "home"));

// ---- 3. qibla, mid-use ----
await page.evaluate(()=>{ switchTab("qibla"); drawTicks(); });
await page.waitForTimeout(500);
await page.click("#q-start");
await page.waitForTimeout(400);
// No magnetometer in a browser, so feed the app a real DeviceOrientation event
// and let its own handler compute and draw the needle.
await page.evaluate(()=>{
  const fire = alpha => window.dispatchEvent(Object.assign(
    new Event("deviceorientationabsolute"), { absolute:true, alpha, beta:2, gamma:1 }));
  fire(300); fire(295); fire(290);            // settle, then hold at heading 70°
});
await page.waitForTimeout(700);
console.log("3 qibla :", await page.evaluate(()=>({
  bearing: document.getElementById("q-bearing")?.textContent.trim(),
  button:  document.getElementById("q-start")?.textContent.trim(),
  note:    document.getElementById("q-note")?.textContent.trim().slice(0,48) })));
await page.screenshot({path:"/tmp/shots/3-qibla.png"});

// ---- 4. zakat, with figures ----
await page.evaluate(()=>openZakat());
await page.waitForTimeout(1500);
const fill = async (id, v) => page.evaluate(([id,v])=>{
  const el=document.getElementById(id); if(!el) return;
  el.value=v; el.dispatchEvent(new Event("input",{bubbles:true}));
  el.dispatchEvent(new Event("change",{bubbles:true}));
}, [id,v]);
// Gold and silver are entered in GRAMS, and on the silver standard the app
// deliberately does not value gold — it says so instead. Silver only, so the
// figures add up on screen with no warning showing.
await fill("zk-cash","8500"); await fill("zk-silver","200");
await fill("zk-owed","400");  await fill("zk-invest","2000"); await fill("zk-debts","1300");
await page.waitForTimeout(700);
console.log("4 zakat :", await page.evaluate(()=>({
  live:   document.getElementById("zk-live")?.textContent.trim().slice(0,44),
  nisab:  document.getElementById("zk-nisab")?.textContent.trim().slice(0,44),
  net:    document.getElementById("zk-net")?.textContent.trim(),
  verdict:document.getElementById("zk-verdict")?.textContent.trim().slice(0,44),
  due:    document.getElementById("zk-due")?.textContent.trim().slice(0,40),
  warning:document.getElementById("zk-gsnote")?.hidden === false })));
// Frame it deliberately: the result card sitting high, with whole elements
// above and below rather than a chopped input at the top edge.
await page.evaluate(()=>{
  const el = document.getElementById("zk-result");
  let sc = el.parentElement;
  while(sc && sc !== document.body){
    const o = getComputedStyle(sc).overflowY;
    if(o === "auto" || o === "scroll") break;
    sc = sc.parentElement;
  }
  const target = 170;                                  // px from the top of the frame
  const delta = el.getBoundingClientRect().top - target;
  if(sc && sc !== document.body) sc.scrollTop += delta; else window.scrollBy(0, delta);
});
await page.waitForTimeout(400);
await page.screenshot({path:"/tmp/shots/4-zakat.png"});

console.log("errors:", errs.length?errs:"none");
await b.close();
