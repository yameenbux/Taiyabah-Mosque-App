/* Why a reminder that was sent never appeared.
 *
 * On 5 October a test push was accepted by OneSignal, accepted by Google's
 * FCM servers for this exact handset, and never shown. The phone — a Huawei
 * on EMUI — had stopped the app in the background, and a stopped app receives
 * nothing at all. Switching App launch from "Manage automatically" to manual,
 * with all three toggles on, was the moment it started working: the phone
 * buzzed on the next send, and the one before it — which had been sent to a
 * locked screen and silently held — was flushed through at the same time.
 *
 * That flush is worth knowing when helping somebody. Nothing is lost while a
 * phone is blocking delivery; it arrives late, in a burst, once the app is
 * allowed to run. A jamāʿah reminder delivered twenty minutes late is still a
 * reminder nobody wanted, which is why this is worth fixing rather than
 * explaining away.
 *
 * This is not a Huawei quirk. Xiaomi, Oppo, Realme, Vivo, OnePlus and Samsung
 * all ship their own version, usually on by default, and the congregation is
 * full of these phones. Nothing the masjid or this app can do will get past
 * it: the send succeeds, every dashboard says delivered, and the person simply
 * concludes the app does not work. The only fix is the person changing a
 * setting, so the app has to be able to tell them which one — on their phone,
 * in their words, not a support page written for somebody else's.
 *
 * Paths are as the manufacturers' own settings apps word them. They move
 * between versions, which is why each ends with somewhere to look rather than
 * a promise, and why "Open this app's settings" is offered alongside.
 */
import { Platform } from "react-native";

/* Platform.constants carries the manufacturer on Android with no extra
 * dependency. It is absent on iOS and on web, hence the guard. */
export function maker() {
  if (Platform.OS !== "android") return "";
  const c = Platform.constants || {};
  return String(c.Manufacturer || c.Brand || "").toLowerCase();
}

const GUIDES = [
  {
    match: /huawei|honor/,
    name: "Huawei",
    steps: [
      "Settings → Battery → App launch",
      "Find Taiyabah Masjid and turn OFF “Manage automatically”, so it says Manage manually",
      "Switch on all three: Auto-launch, Secondary launch, Run in background",
    ],
  },
  {
    match: /xiaomi|redmi|poco/,
    name: "Xiaomi",
    steps: [
      "Settings → Apps → Manage apps → Taiyabah Masjid",
      "Turn Autostart on",
      "Battery saver → No restrictions",
    ],
  },
  {
    match: /oppo|realme|oneplus/,
    name: "Oppo",
    steps: [
      "Settings → Battery → App battery usage → Taiyabah Masjid",
      "Allow background activity, and turn off any battery optimisation",
    ],
  },
  {
    match: /vivo|iqoo/,
    name: "Vivo",
    steps: [
      "Settings → Battery → Background power consumption management",
      "Find Taiyabah Masjid and allow it to run in the background",
    ],
  },
  {
    match: /samsung/,
    name: "Samsung",
    steps: [
      "Settings → Battery → Background usage limits",
      "Make sure Taiyabah Masjid is not under Sleeping or Deep sleeping apps",
    ],
  },
];

/* Everything else, including phones that do none of this — the steps are
 * harmless on a phone that was never going to stop the app. */
const GENERIC = {
  name: "",
  steps: [
    "Settings → Apps → Taiyabah Masjid → Battery",
    "Choose Unrestricted, or turn battery optimisation off",
  ],
};

export function batteryHelp() {
  if (Platform.OS !== "android") return null;
  const m = maker();
  return GUIDES.find(g => g.match.test(m)) || GENERIC;
}
