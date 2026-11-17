/* What a problem report says, decided away from React Native.
 * Copyright (c) 2026 Yameen Bux. All rights reserved. See LICENSE.md.
 *
 * The same split crash-report.js makes, for the same reason: diagnostics.js
 * imports react-native and expo-constants, which a Node test cannot load, so
 * everything that DECIDES anything — how the trail is trimmed, what the log
 * reads like, what the payload holds — lives here where a test can reach it.
 * diagnostics.js is left holding only the trail itself and the two facts Node
 * cannot know, the platform and the app version.
 */

/* The rolling breadcrumb trail is a plain array the caller owns; these operate
 * on it in place so diagnostics.js can keep one module-level buffer and still
 * have every rule about it checked here. Newest is last. */
export function pushCrumb(trail, text, max = 24) {
  const s = String(text == null ? "" : text).replace(/\s+/g, " ").trim().slice(0, 120);
  if (!s) return trail;
  trail.push({ t: Date.now(), s });
  while (trail.length > max) trail.shift();
  return trail;
}

/* The trail as one compact block, newest last, each line stamped with how long
 * ago it happened — "-4s opened Recordings". Relative rather than a clock time
 * because the useful thing is the ORDER and the gaps, and a wall-clock time
 * would be one more thing that could identify when a particular person was
 * using the app. Capped to the column the database allows. */
export function formatLog(trail, now = Date.now()) {
  if (!Array.isArray(trail) || !trail.length) return "";
  return trail.map(e => `${fmtAgo(now - e.t)}  ${e.s}`).join("\n").slice(0, 8000);
}
function fmtAgo(ms) {
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 60) return `-${s}s`;
  const m = Math.round(s / 60);
  if (m < 60) return `-${m}m`;
  return `-${Math.round(m / 60)}h`;
}

/* The payload report_app_issue() expects. The masjid is NOT set here: rpc()
 * puts it into every write the app makes, in one place, so a call site cannot
 * forget it. Empty strings become null so the RPC's nullif has nothing to do. */
export function issuePayload({ note, screen, log, version, build, platform, osVersion, device } = {}) {
  return {
    note: clean(note, 1000),
    screen: clean(screen, 64),
    log: log ? String(log).slice(0, 8000) : null,
    app_version: version || "unknown",
    build: build ? String(build) : null,
    platform: platform === "ios" ? "ios" : "android",
    os_version: osVersion || null,
    device: device || null,
  };
}
const clean = (v, n) => { const s = (v == null ? "" : String(v)).trim(); return s ? s.slice(0, n) : null; };

/* The two things the function refuses on, asked here so a report that would be
 * dropped can be seen in a test rather than in an empty table. */
export const issueWouldBeAccepted = p =>
  !!p && typeof p.app_version === "string" && p.app_version.trim() !== "" && p.app_version !== "unknown"
      && (p.platform === "android" || p.platform === "ios");
