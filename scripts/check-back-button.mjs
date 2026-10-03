/* ===========================================================================
   The Android Back button — the suite that found the Play Store crash
   Taiyabah Masjid · Bolton Central Islamic Society · Registered charity 1041569

   REPORTED 2 October 2026: "click anything on the burger stack then click
   back, the app freezes and closes down." It did, on every screen.

   NOT IN CI, AND SAYING SO RATHER THAN PRETENDING. It needs Playwright and a
   local server, neither of which this repository declares, and a suite that
   silently cannot run is worse than no suite (the sister repo has four scars
   from exactly that). The automated guard is check 3n2 in check-release.mjs,
   which is static and runs on every push. This is the one that actually drove
   a browser, and it is kept so the next person can re-run it rather than
   re-derive it.

   To run:
       npm i -D playwright && npx playwright install chromium
       python3 -m http.server 8111 &
       node scripts/check-back-button.mjs

   It is blackbox on purpose: it taps real controls and asserts only on things
   visible from outside — which layers are open, whether the scroll lock is
   released, whether the page is still loaded, and whether the sentinel history
   entry exists. It never reads the app's own variables, because a test that
   agrees with a bookkeeping flag still passes when that flag has drifted from
   the truth.

   Proved able to fail: with the sentinel disabled it reports 12 failures,
   including "Back left the page — in a TWA the app closes", which is the
   reported bug reproduced as an assertion.
   =========================================================================== */
import { chromium } from "playwright";

const b = await chromium.launch();
let pass = 0; const fails = [];
const check = (ok, why) => { if (ok) pass++; else fails.push(why); };

async function fresh() {
  const ctx = await b.newContext({ viewport: { width: 540, height: 960 }, serviceWorkers: "block" });
  const p = await ctx.newPage();
  const errs = []; p.on("pageerror", e => errs.push(String(e).slice(0, 160)));
  await p.goto("http://127.0.0.1:8111/index.html?cb=" + Date.now() + Math.random(), { waitUntil: "load" });
  await p.waitForTimeout(1500);
  return { ctx, p, errs };
}
const state = p => p.evaluate(() => ({
  open: Array.from(document.querySelectorAll('[data-open="1"]')).map(e => e.id),
  overflow: document.body.style.overflow || "",
  armed: !!(history.state && history.state.tLayer),
  onPage: location.pathname.endsWith("index.html"),
}));
const back = async p => { await p.evaluate(() => history.back()); await p.waitForTimeout(500); };
const tap  = async (p, sel) => {
  await p.locator(sel).first().waitFor({ state: "visible", timeout: 15000 });
  await p.locator(sel).first().click({ timeout: 15000 });
  await p.waitForTimeout(400);
};
/* A crash in one scenario must not hide the others — and it must say WHICH
   one crashed. Every call passes the same name, so a thrown scenario used to
   report "block threw: locator.click: Timeout" with no way to tell which of
   the twelve it was; the only route to an answer was commenting them out one
   at a time. They are numbered in the order they run. */
let scenarioNo = 0;
const scenario = async (name, fn) => {
  const n = ++scenarioNo;
  try { await fn(); }
  catch (e) { fails.push(`scenario ${n} threw: ` + String(e.message || e).split("\n")[0].slice(0, 120)); }
};

/* 1 — THE REPORTED BUG: burger menu, tap a row, press Back */
await scenario("block", async () => {
  const { ctx, p, errs } = await fresh();
  await tap(p, "#nav-more");
  check((await state(p)).armed, "1a opening the menu did not arm the sentinel");
  await tap(p, '.dr-row[data-act="advice"]');
  let s = await state(p);
  check(s.open.join() === "advice", "1b menu row left open=" + s.open.join());
  check(s.armed, "1c sentinel lost in the menu->sheet handoff");
  await back(p);
  s = await state(p);
  check(s.onPage,          "1d THE BUG: Back left the page — in a TWA the app closes");
  /* 1e CHANGED, deliberately. It used to require that Back from a menu-opened
     sheet left NOTHING open — the sheet closed and the person was on the home
     screen. Thirteen screens are reachable only from that menu, so that rule
     meant getting from Contact to Membership was: Done, open the menu, find it
     again. Back now returns to the menu it came from, which is where the
     person actually was.

     1d is untouched and is the assertion this scenario exists for: the bug was
     Back LEAVING THE PAGE, which in a TWA closes the app. Returning to the
     menu is still being on the page. */
  check(s.open.join() === "drawer",
        "1e Back did not return to the menu the sheet was opened from, open=" + s.open.join());
  /* The scroll lock belongs to whatever is open. The menu is open, so it stays
     on — the freeze this guards against is a lock with nothing open under it. */
  check(s.overflow === "hidden", "1f scroll lock released while the menu was still open, overflow=" + s.overflow);
  check(errs.length === 0,   "1g page errors: " + errs.join(" | "));
  await ctx.close();
});
/* 2 — Back on the home screen must STILL leave. Nobody may be trapped. */
await scenario("block", async () => {
  const { ctx, p } = await fresh();
  const before = p.url();
  await back(p);
  check(p.url() !== before, "2a Back on the home screen did not leave — people trapped in the app");
  await ctx.close();
});
/* 3 — one press per layer, and then leave.

   The count changed when the "More" menu became somewhere Back returns to.
   It is still one press per layer; there is simply one more layer, because
   opening a sheet from the menu is now two steps rather than one. Menu,
   sheet, home, gone. The principle this scenario defends is unchanged: no
   press is swallowed, and none is doubled. */
await scenario("block", async () => {
  const { ctx, p } = await fresh();
  await tap(p, "#nav-more"); await tap(p, '.dr-row[data-act="advice"]');
  await back(p);
  let s = await state(p);
  check(s.onPage, "3a first Back left the page");
  check(s.open.join() === "drawer", "3b first Back did not return to the menu, open=" + s.open.join());
  await back(p);
  s = await state(p);
  check(s.onPage, "3c second Back left the page");
  check(s.open.length === 0, "3d second Back did not close the menu, open=" + s.open.join());
  check(s.overflow === "", "3e scroll lock survived the last layer closing, overflow=" + s.overflow);
  const before = p.url();
  await back(p);
  check(p.url() !== before, "3f third Back did not leave — Back is being swallowed");
  await ctx.close();
});
/* 4 — closed with the X: the sentinel must be given back */
await scenario("block", async () => {
  const { ctx, p } = await fresh();
  await tap(p, "#nav-more"); await tap(p, '.dr-row[data-act="advice"]');
  await tap(p, "#ia-close");
  let s = await state(p);
  check(s.open.length === 0, "4a X did not close the sheet");
  check(!s.armed,            "4b sentinel still held after closing with X");
  const before = p.url();
  await back(p);
  check(p.url() !== before, "4c after an X close, Back did nothing instead of leaving");
  await ctx.close();
});
/* 5 — scrim tap */
await scenario("block", async () => {
  const { ctx, p } = await fresh();
  await tap(p, "#nav-more");
  await p.evaluate(() => document.getElementById("dr-scrim").click());
  await p.waitForTimeout(500);
  const s = await state(p);
  check(s.open.length === 0 && !s.armed, "5a scrim tap left the sentinel armed");
  await ctx.close();
});
/* 6 — SUB-VIEW: Back leaves the section, not the whole sheet */
await scenario("block", async () => {
  const { ctx, p, errs } = await fresh();
  await tap(p, '[data-tile="athkar"]');
  check((await state(p)).open.includes("athkar"), "6a athkar did not open");
  await tap(p, "#ak-go-0");
  const inSub = await p.evaluate(() => {
    const bk = document.getElementById("ak-back");
    return !!bk && bk.offsetParent !== null;
  });
  check(inSub, "6b could not reach a sub-view — 6c-6g prove nothing");
  if (inSub) {
    await back(p);
    let s = await state(p);
    check(s.open.includes("athkar"), "6c Back shut the whole sheet instead of leaving the sub-view");
    check(await p.evaluate(() => { const m = document.getElementById("ak-mode-view"); return !!m && !m.hidden; }),
          "6d Back did not return to the list");
    check(s.armed, "6e sentinel not re-armed after stepping back a sub-view");
    await back(p);
    s = await state(p);
    check(s.open.length === 0, "6f second Back did not close the sheet");
    check(s.onPage,            "6g Back left the page while a sheet was open");
    check(s.overflow === "",   "6h scroll lock not released");
  }
  check(errs.length === 0, "6i page errors: " + errs.join(" | "));
  await ctx.close();
});
/* 7 — Escape */
await scenario("block", async () => {
  const { ctx, p } = await fresh();
  await tap(p, "#nav-more"); await tap(p, '.dr-row[data-act="advice"]');
  await p.keyboard.press("Escape"); await p.waitForTimeout(500);
  const s = await state(p);
  check(s.open.length === 0 && !s.armed, "7a Escape left the sentinel armed");
  await ctx.close();
});
/* 8 — ten rounds, nothing may drift.

   A round is two Backs now, not one: the first returns to the menu and the
   second closes it. With only one, the menu was still open when the round
   ended, the burger button underneath it could not be clicked, and this
   scenario failed by timing out rather than by drifting — which is how the
   change to the menu's place in the trail first showed up here. */
await scenario("block", async () => {
  const { ctx, p, errs } = await fresh();
  for (let i = 0; i < 10; i++) {
    await tap(p, "#nav-more");
    await tap(p, '.dr-row[data-act="advice"]');
    await back(p);                       // sheet -> menu
    await back(p);                       // menu -> home
  }
  const s = await state(p);
  check(s.onPage, "8a left the page somewhere in ten rounds");
  check(s.open.length === 0 && !s.armed, "8b drifted after ten rounds: " + JSON.stringify(s));
  check(errs.length === 0, "8c page errors: " + errs.join(" | "));
  await ctx.close();
});

/* 9 — Back with ONLY the burger menu open. The report says "click anything
      on the burger stack", but plenty of people will open it and think
      better of it. */
await scenario("block", async () => {
  const { ctx, p, errs } = await fresh();
  await tap(p, "#nav-more");
  check((await state(p)).open.includes("drawer"), "9a drawer did not open");
  await back(p);
  const s = await state(p);
  check(s.onPage, "9b Back with the menu open left the page — app would close");
  check(s.open.length === 0, "9c Back did not close the menu, open=" + s.open.join());
  check(s.overflow === "", "9d scroll lock not released after closing the menu");
  check(errs.length === 0, "9e page errors: " + errs.join(" | "));
  await ctx.close();
});

/* 10 — the month timetable, whose layer id is literally "sheet". Worth its
       own case because a generic fix that assumed ids were unique-ish, or
       that matched on the class name, would trip over this one. */
await scenario("block", async () => {
  const { ctx, p, errs } = await fresh();
  await tap(p, '[data-tab="times"]');
  const opened = await p.evaluate(() => {
    const b = document.querySelector('#tab-times [data-act="month"], #tab-times .tt-month, #month-open');
    if (b) { b.click(); return true; } return false;
  });
  await p.waitForTimeout(700);
  const s0 = await state(p);
  if (!opened || !s0.open.length) {
    console.log("   (10 skipped: could not open the month sheet from the harness)");
  } else {
    check(s0.armed, "10a month sheet did not arm");
    await back(p);
    const s = await state(p);
    check(s.onPage, "10b Back left the page from the month sheet");
    check(s.open.length === 0, "10c Back did not close the month sheet");
  }
  check(errs.length === 0, "10d page errors: " + errs.join(" | "));
  await ctx.close();
});

/* 11 — one sheet opening another: Back must peel one layer, not both,
       and not leave the page. */
await scenario("block", async () => {
  const { ctx, p, errs } = await fresh();
  await tap(p, '[data-tile="madrasah"]');
  const s0 = await state(p);
  check(s0.open.length > 0, "11a madrasah did not open");
  const went = await p.evaluate(() => {
    const b = document.getElementById("mdr-go-admissions");
    if (b) { b.click(); return true; } return false;
  });
  await p.waitForTimeout(800);
  const s1 = await state(p);
  if (!went) { console.log("   (11 skipped: no route to a second sheet)"); }
  else {
    check(s1.open.includes("madmissions"), "11b second sheet did not open, open=" + s1.open.join());
    await back(p);
    const s2 = await state(p);
    check(s2.onPage, "11c Back left the page with two sheets open");
    check(!s2.open.includes("madmissions"), "11d Back did not close the top sheet");
    check(s2.overflow === "" || s2.open.length > 0,
          "11e scroll lock released while a sheet was still open");
  }
  check(errs.length === 0, "11f page errors: " + errs.join(" | "));
  await ctx.close();
});

/* 12 — ONE STEP BACK, NOT ALL THE WAY HOME.

   Twelve journeys in this app go sheet-to-sheet, and each one is written as
   "close this, open that 120ms later". That leaves nothing underneath, so
   both Done and Android's Back used to land on the home screen: three levels
   into the madrasah pages meant walking back in from the beginning. A header
   arrow now returns to the sheet the current one was opened from, and Back
   follows the same trail. Done still means done. */
await scenario("block", async () => {
  const { ctx, p, errs } = await fresh();
  const arrow = () => p.evaluate(() => {
    const b = document.querySelector('[data-open="1"] .sh-upback');
    return b ? (b.getAttribute("aria-label") || "(unnamed)") : null;
  });

  await tap(p, '[data-tile="madrasah"]');
  check(await arrow() === null, "12a a sheet opened from the home screen offers a back arrow pointing at nothing");

  await tap(p, "#mdr-go-admissions");
  check((await state(p)).open.includes("madmissions"), "12b admissions did not open");
  const a1 = await arrow();
  check(a1 !== null, "12c no back arrow after one sheet handed over to another — Done would strand the person at home");
  check(/madrasah/i.test(a1 || ""), "12d the back arrow does not name the sheet it returns to, got: " + a1);

  await tap(p, "#ad-to-holidays");
  check((await state(p)).open.includes("holidays"), "12e holidays did not open");
  check(/admission/i.test((await arrow()) || ""), "12f three levels in, the arrow does not point one level back");

  /* Down three, now up three, one at a time. */
  await tap(p, '[data-open="1"] .sh-upback');
  check((await state(p)).open.includes("madmissions"), "12g the arrow did not step back one level");
  await tap(p, '[data-open="1"] .sh-upback');
  check((await state(p)).open.includes("madrasah"), "12h the second step back did not reach the first sheet");
  check(await arrow() === null, "12i an arrow survives at the first sheet, so back would walk forwards again");

  /* Done is not a step back: it is finished. */
  await tap(p, '[data-open="1"] .sh-close');
  await p.waitForTimeout(500);
  check((await state(p)).open.length === 0, "12j Done did not close the sheet");

  /* Finishing one sheet and starting another quickly must not look like a
     handover — that is how a false arrow gets onto an unrelated screen. */
  await tap(p, '[data-tile="madrasah"]');
  check(await arrow() === null, "12k finishing one sheet and opening another left a false back arrow");

  /* And Android's Back agrees with the arrow. */
  await tap(p, "#mdr-go-admissions");
  await back(p);
  const s = await state(p);
  check(s.onPage, "12l Back left the page");
  check(s.open.includes("madrasah"), "12m Back went home instead of one step back, open=" + s.open.join());

  check(errs.length === 0, "12n page errors: " + errs.join(" | "));
  await ctx.close();
});

/* 13 — THE SCREENS WITH ONLY A "DONE".

   Thirteen screens are reachable from the "More" menu and from nowhere else:
   Contact, Membership, Hall hire, Zakāt, Advice, Videos, About, Education,
   Admissions, Holidays, Collections, Marriage & Death, System preferences.
   Each one used to offer a single button, "Done", which closes to the home
   screen — so going from Contact to Membership meant Done, reopen the menu,
   scroll, find it. Two of those screens were photographed and sent in, which
   is how this was noticed; the arrow added for sheet-to-sheet journeys did not
   appear on any of them, because the menu was excluded from the trail.

   A screen opened from a home TILE still has no arrow, and should not: Done
   already returns to the home screen, and a second control doing the same
   thing is worse than one. The distinction this checks is "is there somewhere
   else to go back to", not "is this a sheet". */
await scenario("block", async () => {
  const { ctx, p, errs } = await fresh();
  const arrow = () => p.evaluate(() => {
    const b = document.querySelector('[data-open="1"] .sh-upback');
    return b ? (b.getAttribute("aria-label") || "(unnamed)") : null;
  });

  for (const act of ["contact", "membership"]) {
    await tap(p, "#nav-more");
    await tap(p, `.dr-row[data-act="${act}"]`);
    let s = await state(p);
    check(s.open.join() === act || s.open.includes(act),
          `13a ${act} did not open from the menu, open=` + s.open.join());

    const a = await arrow();
    check(a !== null,
          `13b ${act} offers no way back to the menu it was opened from — only "Done", which goes to the home screen`);

    /* The label is the menu's own aria-label, which the language packs
       already translate. A bare "Back" would have needed three new strings. */
    check(/more/i.test(a || ""),
          `13c the arrow on ${act} does not name the menu, got: ` + a);

    await tap(p, '[data-open="1"] .sh-upback');
    s = await state(p);
    check(s.open.join() === "drawer",
          `13d the arrow on ${act} did not return to the menu, open=` + s.open.join());
    check(s.onPage, `13e the arrow on ${act} left the page`);

    await back(p);                                   // menu -> home, ready for the next
    check((await state(p)).open.length === 0, `13f could not get back to the home screen after ${act}`);
  }

  /* And the other half of the rule: a sheet opened from a home tile has
     nowhere else to go, so it keeps its single button. */
  await tap(p, '[data-tile="madrasah"]');
  check(await arrow() === null,
        "13g a sheet opened from a home tile grew a back arrow that would do exactly what Done does");

  check(errs.length === 0, "13h page errors: " + errs.join(" | "));
  await ctx.close();
});

console.log(`${pass} passed, ${fails.length} failed`);
fails.forEach(f => console.log("  FAIL " + f));
await b.close();
process.exit(fails.length ? 1 : 0);
