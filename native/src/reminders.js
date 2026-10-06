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
import { dayFor, nowLondon, londonInstant, NAMES, ORDER } from "./prayer";

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
export async function arm(reminders, extras = {}) {
  if (Platform.OS === "web") return 0;
  await Notifications.cancelAllScheduledNotificationsAsync();

  const wanted = Object.entries(reminders || {}).filter(([, v]) => v !== undefined && v !== null && v !== false);
  if (!wanted.length && !extras.kahf) return 0;
  if (!(await ask())) return 0;

  if (Platform.OS === "android")
    await Notifications.setNotificationChannelAsync("prayer", {
      name: "Prayer reminders", importance: Notifications.AndroidImportance.HIGH,
      sound: "default", vibrationPattern: [0, 220, 120, 220],
    });

  /* Two clocks here, deliberately. Which DAY and which jamāʿah come from
   * London, because that is what the timetable is in. The alarm itself is set
   * for a real instant, because that is what the OS wakes on — and on a phone
   * that has travelled, those are not the same thing. */
  const london = nowLondon();
  const realNow = new Date();
  let armed = 0;
  for (let d = 0; d < DAYS_AHEAD; d++) {
    const date = new Date(london); date.setDate(date.getDate() + d);
    const day = dayFor(date);
    if (!day) continue;
    for (const [key, before] of wanted) {
      const at = day.jamaat[key];
      if (!at || !ORDER.includes(key)) continue;
      const when = new Date(londonInstant(date, at).getTime() - Number(before) * 60000);
      if (when <= realNow) continue;          // never schedule into the past
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

  /* Sūrah al-Kahf, Friday morning. The website sends this one as a push; it
   * needs no server at all, because the day it falls on is known for ever. A
   * weekly trigger is the whole of it. */
  if (extras.kahf) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Sūrah al-Kahf",
        body: "It is Friday — a reminder to read it.",
        sound: "default",
      },
      /* expo-notifications counts weekdays from Sunday, so Friday is 6. */
      trigger: Platform.OS === "android"
        ? { weekday: 6, hour: 7, minute: 30, repeats: true, channelId: "prayer" }
        : { weekday: 6, hour: 7, minute: 30, repeats: true },
    });
    armed++;
  }
  return armed;
}

const pretty = hhmm => {
  let [h, m] = hhmm.split(":").map(Number);
  const s = h >= 12 ? "pm" : "am"; h = h % 12 || 12;
  return `${h}:${String(m).padStart(2, "0")}${s}`;
};
