/* Push from the masjid, through the same OneSignal app the website uses.
 *
 * One app, one set of tags, one place the office presses send. The alternative
 * — Expo's own push service — would have meant a second system to maintain and
 * a second list of who gets what, and the office would have had to remember
 * which audience lived where. The whole point of matching the website's tag
 * names exactly is that a segment built for the website reaches these phones
 * too, with nobody rebuilding anything.
 *
 * The App ID is public: it identifies the app to OneSignal and is in the
 * website's own source. The REST key is not here and must never be — tags are
 * written by the Worker, which holds it, for a reason the website records: the
 * client SDK's own tag write was unreliable, leaving brand-new devices
 * untagged and so unreachable by every targeted send. The same endpoint is
 * used here rather than discovering that again.
 */
import { Platform } from "react-native";

/* Loaded when it is first needed, not when this file is.
 *
 * react-native-onesignal reaches for TurboModuleRegistry.getEnforcing the
 * moment it is imported, and react-native-web has no TurboModuleRegistry — so
 * a plain top-level import takes the whole web bundle down before a single
 * screen renders. Every function below already refuses to act on web; this
 * makes the IMPORT refuse too.
 *
 * Not academic. The web export is what scripts/shots.mjs photographs, and that
 * is how a layout gets looked at before an APK is built. It had rendered blank
 * since the day push was wired in and nothing said so, which is why the Help
 * screen's empty hero reached a phone instead of a screenshot. */
/* It can also be absent on a phone, which is newer knowledge. An iOS build
 * carried OneSignal's native half — the Expo plugin's AppDelegate hooks and
 * the notification service extension — without the React Native module behind
 * them, and the first import threw
 *   Invariant Violation: TurboModuleRegistry.getEnforcing('OneSignal')
 * Every caller below already catches, so this returning null is not what saves
 * the app. It is that asking twice must not throw twice: the failure is
 * remembered, said once, and after that push is simply a thing this build does
 * not have. */
let SDK = null, missing = false;
function sdk() {
  if (Platform.OS === "web" || missing) return null;
  if (!SDK) {
    try {
      const m = require("react-native-onesignal");
      if (!m?.OneSignal) throw new Error("the module loaded with no OneSignal in it");
      SDK = { OneSignal: m.OneSignal, LogLevel: m.LogLevel };
    } catch (e) {
      missing = true;
      console.warn("push: react-native-onesignal is not available in this build — " +
                   String(e && e.message || e) + " — carrying on without notifications");
      return null;
    }
  }
  return SDK;
}

const APP_ID = "2506fafe-179d-401c-b9e3-a0f320d68857";
const SENDER = "https://taiyabah-sender.yameenbux.workers.dev";

let started = false;

export function startPush() {
  if (started || Platform.OS === "web") return;
  started = true;
  try {
    const api = sdk();
    if (!api) return;
    const { OneSignal, LogLevel } = api;
    OneSignal.Debug.setLogLevel(LogLevel.None);
    OneSignal.initialize(APP_ID);
  } catch (e) {
    /* Never fatal. A masjid app that will not open because a notification
     * service is unhappy is worse than one that opens without notifications. */
    console.warn("push: initialize failed — " + String(e && e.message || e));
    started = false;
  }
}

/* The system dialog, raised by OneSignal so it knows the answer. Returns what
 * the person actually chose rather than what we hoped for. */
export async function askPush() {
  try { return await sdk()?.OneSignal.Notifications.requestPermission(true) ?? false; }
  catch { return false; }
}

export async function hasPush() {
  try { return await sdk()?.OneSignal.Notifications.getPermissionAsync() ?? false; }
  catch { return false; }
}

/* OneSignal does not issue an id the instant it is asked. A brand-new phone
 * routinely has none for a second or two, and giving up at the first attempt
 * is exactly what left devices untagged on the website. */
async function waitForId(tries = 6) {
  for (let i = 0; i < tries; i++) {
    try {
      const id = await sdk()?.OneSignal.User.getOnesignalId();
      if (id) return id;
    } catch { /* not ready */ }
    await new Promise(r => setTimeout(r, 1200 * (i + 1)));
  }
  return null;
}

/* The six tags the website writes, spelled exactly as it spells them, so one
 * segment reaches both. Written through the Worker with the REST key, never
 * from here. */
export async function syncTags(alerts) {
  if (Platform.OS === "web") return "not on web";
  const tags = {
    jamaah:        alerts.jamaah ? "1" : "0",
    jamaah_mins:   String(alerts.mins),
    janazah:       alerts.janazah ? "1" : "0",
    announcements: alerts.announcements ? "1" : "0",
    events:        alerts.events ? "1" : "0",
    kahf:          alerts.kahf ? "1" : "0",
  };
  const id = await waitForId();
  if (!id) return "OneSignal has not issued this device an id yet";

  const MAX = 5;
  for (let n = 1; n <= MAX; n++) {
    try {
      const res = await fetch(`${SENDER}/api/set-my-tags`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...tags }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `server returned ${res.status}`);
      return "stored";
    } catch (e) {
      if (n === MAX) return "failed: " + String(e && e.message || e);
      await new Promise(r => setTimeout(r, 2000 * n));
    }
  }
  return "failed";
}

/* Who this phone is, to OneSignal.
 *
 * Shown under "Having trouble?" so a single handset can be sent a test without
 * sending one to the whole congregation. Every subscriber of this app is a
 * real person who signed up through the masjid's website, and "testing the
 * push" by sending to all of them is a mistake that cannot be taken back. */
export async function whoAmI() {
  if (Platform.OS === "web") return { user: null, sub: null, optedIn: false };
  try {
    const { OneSignal } = sdk();
    const user = await OneSignal.User.getOnesignalId();
    const sub = await OneSignal.User.pushSubscription.getIdAsync();
    const optedIn = await OneSignal.User.pushSubscription.getOptedInAsync();
    return { user: user || null, sub: sub || null, optedIn: !!optedIn };
  } catch (e) {
    return { user: null, sub: null, optedIn: false, error: String(e && e.message || e) };
  }
}

/* Nothing from the masjid wanted, so stop being a subscriber rather than stay
 * one who is sent nothing. */
export async function optOut() {
  try { sdk()?.OneSignal.User.pushSubscription.optOut(); } catch {}
}
export async function optIn() {
  try { sdk()?.OneSignal.User.pushSubscription.optIn(); } catch {}
}
