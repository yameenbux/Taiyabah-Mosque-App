#!/usr/bin/env node
/**
 * What the website's browser actually computes, for the pieces the app copies.
 *
 * Reading the stylesheet by hand is how you end up with the wrong numbers: the
 * girih has six .girih rules at different sizes behind media queries, and the
 * one that wins at 414px is not the one you find first. Asking the browser
 * removes the guessing — it reported 230px at opacity .08, where reading the
 * source had given 190 at .09, and both of mine were wrong.
 *
 * Add a selector here whenever a native component is being matched to one.
 *
 *   node scripts/web-styles.mjs
 */
import pw from "/opt/node22/lib/node_modules/playwright/index.js";
import http from "node:http"; import fs from "node:fs"; import path from "node:path";
const ROOT="/home/user/Taiyabah-Mosque-App";
const T={".js":"text/javascript",".html":"text/html",".ttf":"font/ttf",".png":"image/png",".json":"application/json",".svg":"image/svg+xml",".css":"text/css",".webp":"image/webp",".woff2":"font/woff2",".webmanifest":"application/manifest+json"};
const s=http.createServer((q,r)=>{let p=path.join(ROOT,decodeURIComponent(q.url.split("?")[0]));
 if(!fs.existsSync(p)){r.statusCode=404;r.end();return;} if(fs.statSync(p).isDirectory())p=path.join(p,"index.html");
 r.setHeader("Content-Type",T[path.extname(p)]||"application/octet-stream");fs.createReadStream(p).pipe(r);});
await new Promise(r=>s.listen(4391,r));
const b=await pw.chromium.launch({executablePath:"/opt/pw-browsers/chromium"});
const page=await b.newPage({viewport:{width:414,height:900}});
await page.goto("http://localhost:4391/index.html",{waitUntil:"networkidle"});
await page.waitForTimeout(2500);
const out = await page.evaluate(() => {
  const pick = (el, props) => { if(!el) return null; const c=getComputedStyle(el); const o={};
    for(const p of props) o[p]=c.getPropertyValue(p); 
    const r=el.getBoundingClientRect(); o.box=[Math.round(r.x),Math.round(r.y),Math.round(r.width),Math.round(r.height)]; return o; };
  return {
    girih: pick(document.querySelector("#tab-home .girih, .hero .girih"),
      ["color","opacity","width","height","right","top","position"]),
    topbar: pick(document.querySelector(".topbar"),
      ["background-image","border-bottom","box-shadow","padding"]),
    bell: pick(document.querySelector(".bellbtn"),
      ["background","background-color","border","border-radius","color","width","height"]),
    hero: pick(document.querySelector("#tab-home .hero, .hero"), ["background-image","padding"]),
    drawerHead: pick(document.querySelector("#drawer .dr-head, #drawer header, .dr-top"),
      ["background-image","background-color","padding"]),
    ccRules: pick(document.querySelector(".cc-rules"), ["background-image","background-color","border-radius","padding"]),
    zkResult: pick(document.querySelector(".zk-result"), ["background-image","background-color","border-radius","padding"]),
    tile: pick(document.querySelector(".tile"), ["background-color","border","border-radius","padding","box-shadow"]),
    card: pick(document.querySelector(".card"), ["background-color","border","border-radius","padding","box-shadow"]),
    secH: pick(document.querySelector(".sec-h h2, .sec-h h3"), ["font-family","font-size","color"]),
    submit: pick(document.querySelector(".bk-submit, .gv-cta, .cc-submit"),
      ["background-image","background-color","color","border-radius","padding"]),
    pcolNext: pick(document.querySelector('.pcol[data-next="1"]'), ["background-color"]),
  };
});
console.log(JSON.stringify(out,null,1));
await b.close(); s.close();
