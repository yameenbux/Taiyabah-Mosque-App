# Automated jamāʿah reminders

**One** automatic notification per prayer:

- **Advance reminder** — "Zuhr Jamāʿah in 10 min", sent at each subscriber's
  own chosen lead time (5/10/15 min — the setting in the app's Alerts tab).

There used to be a second one, "Jamaat Time Now", sent as the prayer began.
It was removed: the committee's view was that two notifications per prayer —
ten a day — is more than people want from a masjid, and the advance reminder
is the useful one because it is the one you can still act on.

This runs entirely inside the existing Worker — no new service, no change to
`admin.html`. It fires on a schedule rather than a click.

## Who each one goes to, and why it is not everybody

The native app schedules its jamāʿah and Sūrah al-Kahf reminders **on the
phone**. That is why they arrive with no signal, and it is what the app's
Notifications screen promises. A push for the same prayer is therefore not a
reminder — it is a second copy of one the person already has.

A browser subscriber has no local reminders at all. Nothing wakes a web page
to say Asr is in ten minutes, which is why this scheduler exists. On
14 October 2026 they were also the majority: of the fifteen devices on the
jamāʿah reminder, nine were Safari or Chrome and six were the app.

So the two reminders the app arms for itself are sent to **browsers only**
(`webOnly: true`, which sets `isAnyWeb` and clears `isIos`, `isAndroid`,
`isHuawei`, `isAdm`):

| Send | Armed on the phone? | Pushed to |
|---|---|---|
| Advance reminder ("in 10 min") | yes | browsers only |
| Sūrah al-Kahf, Friday | yes (07:30 local) | browsers only |
| Janāzah, announcements, events | no | everyone |

**Everybody still gets their 5/10/15-minute reminder.** App users get it from
their own phone, browser users get it from here. Nobody gets it twice, and
nobody goes without.

The platform flag is an extra condition, never a replacement for the tag
filter: a web subscriber who switched jamāʿah off is still not sent it.

`test/duplicates.test.mjs` holds this table to the code, in both directions —
adding a third scheduled send fails until somebody decides which column it
belongs in, and the at-the-jamāʿah notification cannot come back unnoticed.

### ⚠️ Deploy this AFTER the app build that fixed `arm()`

An app older than that build has **no working local reminders at all**
(`arm()` threw before scheduling anything). Deploying `webOnly` while those
phones are still out there leaves them with neither copy: no push, because
they are not browsers, and no local reminder, because their `arm()` is broken.

Order: ship the app build first, then `npm run deploy` here. Reversing it is
not dangerous — it is one prayer's reminder missed per phone until they
update — but there is no reason to accept even that.

## How it works

- A **Cron Trigger** fires the Worker every minute (Cloudflare's minimum
  granularity; free plan allows this).
- Each run fetches the live timetable from
  `https://yameenbux.github.io/Taiyabah-Mosque-App/data/timetable-2026.json`
  — the same file the parser generates — so there is one source of truth,
  never a copy that can drift out of sync.
- It converts the current time to Europe/London wall-clock (handles BST
  automatically) and checks, for each of the 5 prayers and each of the 3
  offsets, whether *now* is exactly that many minutes before that prayer's
  jamāʿah time.
- On Fridays the Zuhr slot is announced as **Jumuʿah**, matching the wording
  already used in the app itself.
- A **Workers KV** namespace records what's already been sent today, so a
  reminder is never sent twice — including if OneSignal itself fails; a
  failed send is still marked sent rather than retried every minute for the
  rest of the window.

## Setup

**1. Create the KV namespace** (one-off):
```
npx wrangler kv namespace create SENT_KV
```
It prints an `id`. Paste it into `wrangler.toml` in place of
`REPLACE_WITH_ID_FROM_WRANGLER`.

**2. Deploy:**
```
npx wrangler deploy
```
Wrangler registers the cron trigger automatically — nothing further needed
on Cloudflare's dashboard.

**3. Test without waiting for the clock**, using the existing admin session:
```
curl -X POST https://taiyabah-sender.yameenbux.workers.dev/api/test-reminders ^
  -H "Authorization: Bearer <token from signing in>"
```
Returns exactly what the scheduled run would have done — useful for checking
the logic without a real jamāʿah time lining up.

**4. Watch it run for real**: Cloudflare dashboard → Workers → taiyabah-sender
→ Logs, or `npx wrangler tail`. A line is only logged on a minute where
something was actually due — most runs are silent.

## Prayer times can never drift

Prayer times are never calculated by the app or by this scheduler — every value
comes from the masjid's own published timetable, parsed once with verification
and used as-is.

There is one place a drift could theoretically occur: the app displays times
embedded in `index.html`, while this scheduler reads `data/timetable-2026.json`.
Both are generated from the same source, but if an annual refresh ever updated
one and not the other, notifications could fire at a time the app doesn't show.

To make that impossible, every scheduled run cross-checks its own times against
the app's embedded timetable before sending. On a mismatch it **stops and logs
the discrepancy** rather than announcing a time nobody can see. If the app
simply can't be reached, it proceeds — an outage should not silence reminders.

## Limits worth knowing

- **Free plan CPU time is 10ms per run.** The work here (parsing a ~130KB
  JSON file, a handful of comparisons) is well under that in testing, but if
  Cloudflare ever reports CPU-limit errors in the logs, the fix is the $5/mo
  Workers Paid plan, which raises the ceiling to 30 seconds.
- **The reminder only fires if the app has actually written the tag.**
  A device shows as subscribed the moment permission is granted, but the
  `jamaah`/`jamaah_mins` tags are written when the Alerts tab is opened
  (auto-tag on subscribe) or Save is pressed. If a device never opens that
  tab, it gets no reminders — same as any other tag-filtered send.
- **The timetable dataset ends 31 Dec 2026.** Past that date the scheduled
  run finds no entry and does nothing — no error, no crash. Once the 2027
  timetable is embedded and deployed, reminders resume automatically; no
  Worker change needed.
