/**
 * Taiyabah Masjid — the two rules behind the dot, with nothing else attached.
 * Copyright (c) 2026 Yameen Bux. All rights reserved. See LICENSE.md.
 *
 * These live apart from notices-state.js for one reason: that file imports
 * React and the Supabase client, so it cannot be loaded by a test. The rules
 * below are the part that is easy to get subtly wrong and impossible to
 * notice afterwards — a dot that is always lit is ignored within a week, and
 * a dot that never lights is indistinguishable from no notices.
 *
 * scripts/test/notices-unread.test.mjs holds them to it.
 */

/**
 * How many live notices this reader has neither seen nor cleared.
 *
 * `seen` is NULL until the first successful load, and that is the whole
 * subtlety. A phone that has just installed the app has not MISSED the
 * notices already there — it has never been offered them. Returning 0 while
 * seen is null keeps the dot meaning "new since you last looked" instead of
 * "you are new here", which would light it with months of history on first
 * open. An empty ARRAY is different and means what it says: seen nothing.
 *
 * A CLEARED NOTICE COUNTS AS READ, or clearing the list would leave the dot
 * lit by the very thing the reader just dealt with.
 */
export function unseenCount(liveIds, seen, cleared) {
  if (!Array.isArray(seen)) return 0;
  const gone = new Set(cleared || []);
  return (liveIds || []).filter(id => !seen.includes(id) && !gone.has(id)).length;
}

/**
 * Cleared ids, pruned against what is actually live.
 *
 * A notice retires on the server and its id would otherwise sit here for
 * ever — a store that only grows, holding ids for things nobody can see.
 *
 * Returns the SAME ARRAY when nothing was pruned, so a caller can compare by
 * identity and avoid a storage write on every render. Returning a fresh equal
 * array instead would write to disk each time the Notices screen drew.
 */
export function pruneCleared(cleared, liveIds) {
  if (!Array.isArray(cleared) || !cleared.length) return cleared || [];
  if (!liveIds || !liveIds.length) return cleared;   // nothing to prune against yet
  const live = new Set(liveIds);
  const kept = cleared.filter(id => live.has(id));
  return kept.length === cleared.length ? cleared : kept;
}
