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


/**
 * The second trap, found the hard way on 13 October.
 *
 * The wrapper pins an exact native Android SDK, and that SDK's Kotlin has to
 * match the kotlinVersion in app.json's expo-build-properties (1.9.25). It did
 * not for one narrow window: OneSignal built 5.7.1, 5.7.2 and 5.7.3 with
 * Kotlin 2.2.0 and then went BACK to 1.9.25 at 5.7.7. So the newest 5.3.x
 * (5.3.6 -> 5.7.3) fails to compile while the newer 5.4.3 (-> 5.7.7) is fine,
 * which reads like nonsense until you look at the POMs:
 *
 *     e: notifications-5.7.3-api.jar ... metadata is 2.2.0, expected 1.9.0
 *
 * Recorded as a fact rather than inferred, because nothing in the version
 * number says it.
 */
const KOTLIN_2_SDKS = new Set(["5.7.1", "5.7.2", "5.7.3"]);

/**
 * Pure: the native Android SDK version the installed wrapper pins.
 *
 * Two spellings, because the wrapper changed one without telling anybody:
 *
 *   api("com.onesignal:OneSignal:5.7.7")        up to 5.4.x — a literal
 *   def oneSignalVersion = '5.11.0'             5.5.x — a variable, used below
 *
 * The first regex kept matching nothing against the second form and yielding
 * undefined, which read as "nothing to check here".
 */
export function pinnedNativeSdk(gradleText) {
  const direct = String(gradleText).match(/com\.onesignal:(?:OneSignal|core|notifications):([0-9]+\.[0-9]+\.[0-9]+)/);
  if (direct) return direct[1];
  const viaVar = String(gradleText).match(/\bdef\s+oneSignalVersion\s*=\s*['"]([0-9]+\.[0-9]+\.[0-9]+)['"]/);
  return viaVar ? viaVar[1] : null;
}

/** Pure: is the pinned native SDK compilable at this project's Kotlin? */
export function nativeSdkOk(sdkVersion, kotlinVersion) {
  const kotlinMajor = Number(String(kotlinVersion || "").split(".")[0]);
  if (!KOTLIN_2_SDKS.has(String(sdkVersion))) return { ok: true };
  if (kotlinMajor >= 2) return { ok: true };
  return { ok: false, message:
    `OneSignal's native SDK ${sdkVersion} is built with Kotlin 2.2 and this project ` +
    `compiles with ${kotlinVersion}. Only 5.7.1-5.7.3 are affected; 5.7.7 and later ` +
    `went back to 1.9.25. Choose a react-native-onesignal that pins outside that window.` };
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

  /* An iOS-only prebuild writes no gradle.properties, and the pairing still
     matters there — 5.4.x cannot run on this project's iOS at all. So fall
     back to what app.json ASKS for. On Android the gradle file is the better
     source, because it is what prebuild actually wrote. */
  const asked = JSON.parse(fs.readFileSync(path.join(root, "app.json"), "utf8"))
    .expo.newArchEnabled === true;
  /* The native SDK the installed wrapper pins, and the Kotlin we compile with. */
  const gradlePath = path.join(root, "node_modules", "react-native-onesignal", "android", "build.gradle");
  if (fs.existsSync(gradlePath)) {
    const sdk = pinnedNativeSdk(fs.readFileSync(gradlePath, "utf8"));
    const app = JSON.parse(fs.readFileSync(path.join(root, "app.json"), "utf8")).expo;
    const props = (app.plugins || []).find(p => Array.isArray(p) && /build-properties/.test(p[0]));
    const kotlin = props?.[1]?.android?.kotlinVersion;
    /* A version this cannot read is a check that proves nothing. It used to
       print "native SDK undefined" and carry on green, which is how the whole
       Kotlin window below went untested the moment the wrapper switched to a
       variable. Not being able to look is a failure, not a pass. */
    if (!sdk) {
      const why = `Could not read the native Android SDK version out of ${gradlePath}. ` +
        "The Kotlin check below is the only thing standing between this project and " +
        "a compile failure nothing in the version numbers predicts, so it does not " +
        "get to pass by default. Teach pinnedNativeSdk() the new spelling.";
      console.error("FAIL  " + why);
      if (process.env.GITHUB_ACTIONS) console.log(`::error::${why}`);
      process.exit(1);
    }
    const k = nativeSdkOk(sdk, kotlin);
    console.log(`    native SDK ${sdk}, kotlinVersion ${kotlin}`);
    if (!k.ok) {
      console.error("FAIL  " + k.message);
      if (process.env.GITHUB_ACTIONS) console.log(`::error::${k.message}`);
      process.exit(1);
    }
  }

  const flagIsOn = text ? /^newArchEnabled=true\s*$/m.test(text) : asked;
  console.log(`    ${text ? `${gradle} says` : "app.json asks for"} newArchEnabled=${flagIsOn}`);
  const v = verdict(version, flagIsOn);
  console.log((v.ok ? "ok  " : "FAIL  ") + v.message);
  if (!v.ok && process.env.GITHUB_ACTIONS) console.log(`::error::${v.message}`);
  process.exit(v.ok ? 0 : 1);
}
