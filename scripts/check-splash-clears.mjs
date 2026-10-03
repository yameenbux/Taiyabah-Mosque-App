/* Does the opening screen always let go of the app?
 *
 * The splash is a full-screen layer over everything. On 3 October it shipped
 * accepting pointer events, relying on a `visibility: hidden` keyframe to
 * stop being in the way. `visibility` inside a keyframe is a discrete
 * animation, and a renderer that does not apply it leaves the layer at its
 * base `visible` with opacity 0 — invisible to the eye, solid to the finger.
 * Every button in the app stopped working.
 *
 * So this does not check that the splash fades. It checks that a tap reaches
 * the app, under conditions where the fade does not do what it is told.
 *
 *   python3 -m http.server 8111   (from the repo root), then
 *   node scripts/check-splash-clears.mjs
 */
import pw from "playwright";

const BASE = "http://127.0.0.1:8111/index.html";
let pass = 0, fail = 0;
const ok  = m => { pass++; console.log("  ok   " + m); };
const bad = m => { fail++; console.log("  FAIL " + m); };

const browser = await pw.chromium.launch();

async function tabsWork(label, { breakVisibility = false, noScript = false, reduced = false } = {}) {
  const page = await browser.newPage({
    viewport: { width: 393, height: 851 },
    reducedMotion: reduced ? "reduce" : "no-preference",
    javaScriptEnabled: !noScript,
  });
  if (breakVisibility) {
    // Stand in for a renderer that ignores discrete `visibility` in keyframes.
    await page.addInitScript(() => {
      document.addEventListener("DOMContentLoaded", () => {
        const s = document.createElement("style");
        s.textContent = "@keyframes boot-veil{0%{opacity:1}100%{opacity:0}}";
        document.head.appendChild(s);
      });
    });
  }
  await page.goto(BASE);
  await page.waitForTimeout(2800);

  // 1. nothing of the splash may still be taking taps
  const blocking = await page.evaluate(() => {
    const b = document.querySelector(".boot");
    if (!b) return false;
    const s = getComputedStyle(b);
    return s.pointerEvents !== "none" && s.visibility !== "hidden" && s.display !== "none";
  });
  blocking ? bad(`${label}: the splash is still swallowing taps`)
           : ok(`${label}: the splash is not in the way`);

  // 2. and a real tap must actually reach a real button
  try {
    await page.locator("nav.tabbar button.tab", { hasText: "Prayer Times" }).first().click({ timeout: 3000 });
    ok(`${label}: tapping a tab reaches the app`);
  } catch {
    bad(`${label}: tapping a tab did NOT reach the app`);
  }
  await page.close();
}

await tabsWork("normal");
await tabsWork("reduced motion",            { reduced: true });
await tabsWork("visibility keyframe ignored", { breakVisibility: true });
await tabsWork("no javascript",             { noScript: true });

await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
