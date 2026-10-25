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
import { isRamadanMonth, hijriOf, sehriEnds, SEHRI_CUSHION_MIN, SEHRI_WARN_MIN } from "./ramadan";
import { at, weekly, FRIDAY } from "./triggers";
/* Re-exported so a caller needs one import, not two; it lives in its own file
   because that one has no native imports and can therefore be tested. */
export { plan } from "./plan";

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
  if (!wanted.length && !extras.kahf && !extras.ramadan) return 0;
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
      /* `jamaat` is the clock time as written in the timetable, "19:15".
       * NOT named `at`: that is the trigger builder imported at the top of
       * this file, and a local of the same name shadowed it for the whole of
       * this block — so `at(when, …)` below called a STRING, threw
       * "at is not a function" on the very first prayer, and left arm() to
       * reject after it had already cancelled the queue. Every local reminder
       * in the app was silently gone. scripts/test/arm.test.mjs now runs this
       * loop for real so that cannot happen again. */
      const time = day.jamaat[key];
      if (!time || !ORDER.includes(key)) continue;
      const when = new Date(londonInstant(date, time).getTime() - Number(before) * 60000);
      if (when <= realNow) continue;          // never schedule into the past
      await Notifications.scheduleNotificationAsync({
        content: {
          title: Number(before) === 0
            ? `${NAMES[key].en} jamāʿah`
            : `${NAMES[key].en} jamāʿah in ${before} min`,
          body: `${pretty(time)} at Taiyabah Masjid`,
          sound: "default",
        },
        /* src/triggers.js, and read its header before touching this: a
           trigger object without a `type` is not rejected by
           expo-notifications, it is delivered immediately. */
        trigger: at(when, Platform.OS === "android" ? "prayer" : undefined),
      });
      armed++;
    }
  }

  /* SEHRI AND IFTAR, every night of Ramadan.
   *
   * These are the two moments of a fasting day, and the website cannot send
   * them: a push for each would be sixty sends the masjid has to remember to
   * make, on times that differ every day. Here they are read off the same
   * timetable the rest of the app reads and set on the phone itself, so they
   * are right with no signal and cost nothing.
   *
   * SEHRI IS NOT FAJR. The masjid's own cushion is ten minutes, which is what
   * the eve-of-fast cards have said for a year, and the nudge goes twenty
   * minutes before THAT — half an hour before Fajr begins. Somebody told at
   * the moment sehri ends has been told too late to do anything about it.
   *
   * Only the days the timetable itself calls Ramadan get them, so this is
   * silent for eleven months whether the switch is on or not — which is why
   * it is safe to leave on, and why nobody has to remember to turn it off. */
  if (extras.ramadan) {
    for (let d = 0; d < DAYS_AHEAD; d++) {
      const date = new Date(london); date.setDate(date.getDate() + d);
      const day = dayFor(date);
      const h = hijriOf(day);
      if (!h || !isRamadanMonth(h.month) || !day.begins) continue;

      if (day.begins.fajr) {
        const sehri = new Date(londonInstant(date, day.begins.fajr).getTime()
                               - (SEHRI_CUSHION_MIN + SEHRI_WARN_MIN) * 60000);
        if (sehri > realNow) {
          await Notifications.scheduleNotificationAsync({
            content: { title: "Sehri ends soon",
                       body: `${SEHRI_WARN_MIN} minutes left — sehri ends `
                             + `${pretty(sehriEnds(day.begins.fajr))}.`,
                       sound: "default" },
            trigger: at(sehri, Platform.OS === "android" ? "prayer" : undefined),
          });
          armed++;
        }
      }
      if (day.begins.maghrib) {
        const iftar = londonInstant(date, day.begins.maghrib);
        if (iftar > realNow) {
          await Notifications.scheduleNotificationAsync({
            content: { title: "Iftar", body: `Maghrib ${pretty(day.begins.maghrib)} — time to open the fast.`,
                       sound: "default" },
            trigger: at(iftar, Platform.OS === "android" ? "prayer" : undefined),
          });
          armed++;
        }
      }
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
      trigger: weekly({ weekday: FRIDAY, hour: 7, minute: 30,
                        channelId: Platform.OS === "android" ? "prayer" : undefined }),
    });
    armed++;
  }

  /* Counted by asking the OS, not by counting what we sent it.
   *
   * The settings screen says "N reminders are scheduled on this phone", and
   * until now N was our own tally of scheduleNotificationAsync calls, which is
   * a promise rather than a reading. Every one of those calls had been
   * delivering immediately and leaving nothing behind, so the screen was
   * reporting thirty-six scheduled reminders against an empty queue. A number
   * that cannot be wrong in that direction is worth the one extra call. */
  try {
    const held = await Notifications.getAllScheduledNotificationsAsync();
    return held.length;
  } catch {
    return armed;
  }
}

const pretty = hhmm => {
  let [h, m] = hhmm.split(":").map(Number);
  const s = h >= 12 ? "pm" : "am"; h = h % 12 || 12;
  return `${h}:${String(m).padStart(2, "0")}${s}`;
};
