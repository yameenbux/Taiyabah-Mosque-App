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
import { OneSignal, LogLevel } from "react-native-onesignal";

const APP_ID = "2506fafe-179d-401c-b9e3-a0f320d68857";
const SENDER = "https://taiyabah-sender.yameenbux.workers.dev";

let started = false;

export function startPush() {
  if (started || Platform.OS === "web") return;
  started = true;
  try {
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
  try { return await OneSignal.Notifications.requestPermission(true); }
  catch { return false; }
}

export async function hasPush() {
  try { return await OneSignal.Notifications.getPermissionAsync(); }
  catch { return false; }
}

/* OneSignal does not issue an id the instant it is asked. A brand-new phone
 * routinely has none for a second or two, and giving up at the first attempt
 * is exactly what left devices untagged on the website. */
async function waitForId(tries = 6) {
  for (let i = 0; i < tries; i++) {
    try {
      const id = await OneSignal.User.getOnesignalId();
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
  try {
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
  try { OneSignal.User.pushSubscription.optOut(); } catch {}
}
export async function optIn() {
  try { OneSignal.User.pushSubscription.optIn(); } catch {}
}
