/**
 * Taiyabah Masjid — which notices this phone has seen, and which it has cleared.
 * Copyright (c) 2026 Yameen Bux. All rights reserved. See LICENSE.md.
 *
 * The WEBSITE has had this since notices shipped: ids of what has been shown
 * kept on the device, a red dot while any are unseen, a "New" pill on each
 * one. The app had none of it — the bell sat in the corner of every screen
 * saying nothing, and a notice sent on Tuesday looked exactly like one from
 * last month. This is that machinery, ported, so the two agree.
 *
 * NOTHING HERE LEAVES THE PHONE. The masjid is never told who has read what;
 * there is no field to tell it with and none may be added. `notices_live`
 * exposes the notice and nothing about the reader, which is why it is safe to
 * read with a public key, and that property is worth keeping.
 *
 * WHY THE BELL NEEDS ITS OWN FETCH. The dot has to be right on the Home
 * screen, before anyone has opened Notices — so the ids cannot come from the
 * Notices screen's own load. One request per app session, cached here, shared
 * by every TopBar on every screen. When the Notices screen does load, it
 * publishes its rows back so the two never disagree and the session does not
 * fetch twice.
 */
import { useEffect, useState } from "react";
import { readList } from "./supabase";
/* The counting rules live apart so a test can load them without React or a
   network client in the way — see notices-unread.js. */
export { unseenCount, pruneCleared } from "./notices-unread";

let ids = [];                 // live notice ids, newest first
let fetched = false;          // one fetch per app session
const subs = new Set();
const emit = () => { for (const set of subs) set(ids); };

/** Called by the Notices screen after its own load — no second request. */
export function publishNoticeIds(rows) {
  ids = (rows || []).map(r => r && r.id).filter(Boolean);
  fetched = true;
  emit();
}

export async function refreshNoticeIds(force) {
  if (fetched && !force) return ids;
  fetched = true;
  /* A phone with no signal simply does not light the bell. An unreachable
     masjid is not news, and a dot that appears because a fetch failed would
     be worse than no dot at all. */
  try { publishNoticeIds(await readList("notices_live")); } catch { /* quiet */ }
  return ids;
}

/** Live notice ids, fetching once per session the first time anything asks. */
export function useNoticeIds() {
  const [v, setV] = useState(ids);
  useEffect(() => {
    subs.add(setV);
    refreshNoticeIds();
    return () => { subs.delete(setV); };
  }, []);
  return v;
}
