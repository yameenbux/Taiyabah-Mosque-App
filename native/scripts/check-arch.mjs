/**
 * The OneSignal version and the New Architecture flag have to agree.
 *
 * They are one setting wearing two hats, and on 13 October I moved one without
 * the other and broke the platform that worked:
 *
 *   5.4.x  NEEDS the New Architecture. Its Android half declares its event
 *          listeners as codegen EventEmitter properties, which exist nowhere
 *          else; without the flag the module loads, setupListeners reaches for
 *          a property codegen never generated, and the app dies on launch with
 *          "undefined is not a function" and a blank screen. It also registers
 *          its iOS module through codegenConfig.ios.modulesProvider, a React
 *          Native 0.79 field — so on this project's 0.76 the iOS app dies with
 *          "'OneSignal' could not be found", and no flag can fix that.
 *
 *   5.3.x  is built for the legacy bridge: NativeModules on both platforms, no
 *          codegen at all. It is the version that can run on React Native 0.76,
 *          and it wants the New Architecture OFF.
 *
 * So the pair is the invariant, not either half. Three workflows used to grep
 * for "newArchEnabled=true" inline, which is three copies of a rule that was
 * only ever true for one of the two versions.
 *
 *   node scripts/check-arch.mjs [path/to/gradle.properties]
 */
import fs from "node:fs";
import path from "node:path";

/** Pure: what the flag must be for a given OneSignal version. */
export function wants(version) {
  const m = String(version || "").match(/(\d+)\.(\d+)/);
  if (!m) return { known: false, reason: `cannot read a version from "${version}"` };
  const [, major, minor] = m.map(Number);
  if (major !== 5) return { known: false, reason: `OneSignal ${version} is not a 5.x this rule knows` };
  if (minor >= 4) return { known: true, newArch: true,  why: "5.4+ declares codegen EventEmitter listeners" };
  return { known: true, newArch: false, why: "5.3.x is a legacy bridge module and predates codegen" };
}

/** Pure: the verdict, given the version and what prebuild actually wrote. */
export function verdict(version, flagIsOn) {
  const want = wants(version);
  if (!want.known) return { ok: false, message: want.reason };
  if (want.newArch === flagIsOn) return { ok: true, message:
    `OneSignal ${version} with the New Architecture ${flagIsOn ? "on" : "off"} — ${want.why}` };
  return { ok: false, message:
    `OneSignal ${version} needs newArchEnabled=${want.newArch} and prebuild wrote ` +
    `${flagIsOn}. ${want.why}. Change both or neither.` };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const root = path.resolve(import.meta.dirname, "..");
  const version = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"))
    .dependencies["react-native-onesignal"];
  const gradle = process.argv[2] || path.join(root, "android", "gradle.properties");
  const text = fs.existsSync(gradle) ? fs.readFileSync(gradle, "utf8") : "";
  if (!text) {
    console.error(`no ${gradle} — did prebuild run?`);
    if (process.env.GITHUB_ACTIONS) console.log(`::error::no ${gradle} — did prebuild run?`);
    process.exit(1);
  }
  const flagIsOn = /^newArchEnabled=true\s*$/m.test(text);
  const v = verdict(version, flagIsOn);
  console.log((v.ok ? "ok  " : "FAIL  ") + v.message);
  if (!v.ok && process.env.GITHUB_ACTIONS) console.log(`::error::${v.message}`);
  process.exit(v.ok ? 0 : 1);
}
