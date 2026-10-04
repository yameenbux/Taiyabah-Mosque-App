/* Prayer reminders, scheduled on the phone itself.
 *
 * No server, no push certificate, no OneSignal: these are local notifications,
 * which means they work with no signal and cost the masjid nothing. The web app
 * could not do this at all — a browser cannot wake itself to tell you Asr is in
 * ten minutes.
 *
 * Jamāʿah times change every day, so there is nothing to repeat daily. Instead
 * a rolling week is armed each time the app opens, and the old set is cleared
 * first so a change of mind takes effect immediately rather than leaving
 * yesterday's reminders to fire.
 */
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { dayFor, NAMES, ORDER } from "./prayer";

const DAYS_AHEAD = 7;

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowAlert: true, shouldPlaySound: true, shouldSetBadge: false }),
});

export async function ask() {
  const { status } = await Notifications.getPermissionsAsync();
  if (status === "granted") return true;
  const asked = await Notifications.requestPermissionsAsync();
  return asked.status === "granted";
}

/* `reminders` is {fajr: 15, zuhr: 0, …} — minutes before the jamāʿah, or absent
 * for off. Returns how many were armed, which is the only honest thing to show
 * on the settings screen. */
export async function arm(reminders) {
  if (Platform.OS === "web") return 0;
  await Notifications.cancelAllScheduledNotificationsAsync();

  const wanted = Object.entries(reminders || {}).filter(([, v]) => v !== undefined && v !== null && v !== false);
  if (!wanted.length) return 0;
  if (!(await ask())) return 0;

  if (Platform.OS === "android")
    await Notifications.setNotificationChannelAsync("prayer", {
      name: "Prayer reminders", importance: Notifications.AndroidImportance.HIGH,
      sound: "default", vibrationPattern: [0, 220, 120, 220],
    });

  const now = new Date();
  let armed = 0;
  for (let d = 0; d < DAYS_AHEAD; d++) {
    const date = new Date(now); date.setDate(date.getDate() + d);
    const day = dayFor(date);
    if (!day) continue;
    for (const [key, before] of wanted) {
      const at = day.jamaat[key];
      if (!at || !ORDER.includes(key)) continue;
      const [h, m] = at.split(":").map(Number);
      const when = new Date(date); when.setHours(h, m - Number(before), 0, 0);
      if (when <= now) continue;              // never schedule into the past
      await Notifications.scheduleNotificationAsync({
        content: {
          title: Number(before) === 0
            ? `${NAMES[key].en} jamāʿah`
            : `${NAMES[key].en} jamāʿah in ${before} min`,
          body: `${pretty(at)} at Taiyabah Masjid`,
          sound: "default",
        },
        trigger: Platform.OS === "android" ? { date: when, channelId: "prayer" } : { date: when },
      });
      armed++;
    }
  }
  return armed;
}

const pretty = hhmm => {
  let [h, m] = hhmm.split(":").map(Number);
  const s = h >= 12 ? "pm" : "am"; h = h % 12 || 12;
  return `${h}:${String(m).padStart(2, "0")}${s}`;
};
