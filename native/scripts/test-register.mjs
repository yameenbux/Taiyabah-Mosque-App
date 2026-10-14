/* Hooks the loader in before the tests import anything. */
import { register } from "node:module";
import { createRequire } from "node:module";
register("./test-loader.mjs", import.meta.url);

/* Metro resolves `require("./quran/2.json")` and Node ESM does not even define
 * the word. The app's lazy sūrah index is written the way Metro needs it —
 * 114 explicit requires so the bundler can see every edge — and that is the
 * right shape for the thing that ships. So the TEST HARNESS adapts, which is
 * the same bargain test-loader.mjs already makes for extensionless imports:
 * the tests exercise the real module the app ships, not a copy of it that has
 * been bent into Node's shape and can drift away from it. */
/* Anchored at src/data/, because that is where the generated sūrah index
 * lives and its paths — "./quran/2.json" — are relative to it. A global
 * require has no idea which module called it, so it has to be anchored
 * somewhere; everything else in the app that reaches for require asks for a
 * PACKAGE by name, and those resolve from anywhere inside the project. */
/* The phone-only modules have to be stood in for HERE as well as in the
 * loader. test-loader.mjs redirects `import`; it cannot touch `require`, and
 * src/timetable.js reaches for AsyncStorage with require() on purpose — so
 * that importing the prayer arithmetic does not drag native storage in with
 * it. Without this the tests get the real package, every read fails, and the
 * cache looks permanently empty: a test about not re-downloading the year
 * would fail for a reason that has nothing to do with the app. */
const STUBBED = {
  "@react-native-async-storage/async-storage":
    await import("./test/stubs/async-storage.mjs"),
};

if (typeof globalThis.require === "undefined") {
  const base = createRequire(new URL("../src/data/", import.meta.url));
  const shim = id => (id in STUBBED ? STUBBED[id] : base(id));
  /* require.cache and require.resolve come with it. quran.test.mjs counts the
     files a sūrah pulls in by reading require.cache, and a bare arrow function
     has none — which failed that test for a reason that had nothing to do with
     the Qurʼan. */
  Object.assign(shim, base);
  globalThis.require = shim;
}
