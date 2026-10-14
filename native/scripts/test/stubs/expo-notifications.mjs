/**
 * expo-notifications, reduced to a notebook.
 *
 * Every call is written down rather than performed, so a test can ask what the
 * app actually handed the operating system — which is the only way to catch a
 * trigger that is malformed, or a schedule call that was never reached.
 */
export const log = {
  scheduled: [],
  cancels: 0,
  channels: [],
  asked: 0,
  permission: "granted",
};

export function reset() {
  log.scheduled = [];
  log.cancels = 0;
  log.channels = [];
  log.asked = 0;
  log.permission = "granted";
}

export function setNotificationHandler() {}

export async function getPermissionsAsync() { return { status: log.permission }; }
export async function requestPermissionsAsync() { log.asked++; return { status: log.permission }; }

export async function cancelAllScheduledNotificationsAsync() {
  log.cancels++;
  log.scheduled = [];
}

export async function setNotificationChannelAsync(id, cfg) { log.channels.push({ id, cfg }); }
export const AndroidImportance = { DEFAULT: 3, HIGH: 4, MAX: 5 };

export async function scheduleNotificationAsync(request) {
  log.scheduled.push(request);
  return `id-${log.scheduled.length}`;
}

export async function getAllScheduledNotificationsAsync() { return log.scheduled.slice(); }
