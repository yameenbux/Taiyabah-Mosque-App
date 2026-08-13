<div align="center">

# Taiyabah Masjid

**Prayer times, live audio, Qibla, zakat and community alerts for Taiyabah Masjid.**

Bolton Central Islamic Society · Registered charity 1041569
31a Draycott Street, Bolton BL1 8HD

[**Open the app →**](https://yameenbux.github.io/Taiyabah-Mosque-App/)

</div>

---

## About

A dedicated app for Taiyabah Masjid, built so the community gets the masjid's
own prayer timetable, announcements and resources directly — not filtered
through a third-party aggregator. It installs to the home screen, works
offline, and its notifications reach the congregation the moment something
needs saying.

Progressive web app: no app store, no install friction, one URL.

## Features

**Prayer times**
- Beginning and jamāʿah times for all five prayers, from the masjid's own
  published timetable — not calculated, not sourced from anywhere else
- Live countdown to the next jamāʿah, current prayer highlighted correctly
  from its beginning time (not its jamāʿah)
- Both Jumuʿah times shown inline on Fridays, with Jumuʿah replacing Zuhr
  in both the timetable and the day's heading
- Browse any date: previous/next, jump to Today or the next Jumuʿah, or open
  the full month as a proper timetable
- A Friday-only call to give, paired with an authentic hadith on the virtue
  of the day

**Reminders**
- Contextual cards tied to the day and time of day — Sūrah al-Kahf and
  salawāt on Fridays, morning/evening adhkār in their true windows, duʿā
  between adhān and iqāmah
- Advance notice of voluntary fasts *the day before*, with the suhūr end
  time computed from the next day's Fajr
- The Islamic calendar days the masjid's own timetable marks — Shab-e-Miʿrāj,
  Shab-e-Barāʾat, Ramadan, both Eids, the days of Hajj, ʿĀshūrāʾ, the Hijrah
- A quiet countdown to Ramadan, appearing only in the final 30 days

**Qibla**
- Great-circle bearing to the Kaʿbah with a live compass where the device
  supports it, refining to the user's own location if allowed
- Degrades honestly: states the bearing even without a working compass,
  explains exactly why the compass can't run when it can't

**Listen live**
- In-app player for the masjid's live audio stream, with background
  playback and lock-screen controls
- A full menu of the masjid's videos and bayaans, playing in-app rather
  than sending people to YouTube

**Zakat calculator**
- Nisab calculated from a live gold/silver spot price (fetched key-free,
  sanity-checked, falls back to manual entry if the fetch fails or looks
  implausible)
- Silver standard by default (the Hanafi position — the lower threshold)
- Plain-English guidance on what counts and what doesn't, written for
  someone who has never calculated zakat before
- States plainly that it's a guide, not a ruling

**Alerts**
- Push notifications via OneSignal, opt-in by category — Jamāʿah reminders,
  Janāzah, Announcements, Events — so urgent messages stay urgent
- **Automated jamāʿah reminders**, sent by a scheduled job, respecting each
  subscriber's own lead time (5/10/15 min), correctly relabelled to Jumuʿah
  on Fridays
- A trustee compose screen (`admin.html`), password-protected, sending
  through the masjid's own Cloudflare Worker — the OneSignal key never
  touches a browser
- Built-in diagnostics ("Having trouble?") so notification issues are
  self-serviceable rather than a support conversation

**About & Contact**
- The masjid's history — established 1967, founders, the ulema who have
  led imaamat, the present Imam — as a proper in-app page
- Contact details, address, and social links, one tap to call, email, or
  get directions

## Repository structure

```
├── index.html               The app. Fully self-contained — the whole
│                             year's timetable is embedded, so prayer
│                             times need no network request.
├── admin.html                Password-gated notification compose screen.
├── sw.js                     Service worker — offline shell, OneSignal
│                             push handlers, network-first page updates.
├── manifest.webmanifest       Home-screen install metadata.
├── logo-cream.png             Masjid logo, dark backgrounds.
├── logo-dark.png               Masjid logo, light backgrounds.
├── icon-*.png                  App icons (Arabic calligraphy wordmark).
├── LICENSE.md                  Ownership and usage terms.
│
├── push/onesignal/              OneSignal's own service worker files
│   ├── OneSignalSDKWorker.js       (kept on a separate scope so they
│   └── OneSignalSDKUpdaterWorker.js don't collide with sw.js above).
│
├── worker/                      The notification backend — a Cloudflare
│   ├── worker.js                   Worker, not hosted on any personal
│   ├── wrangler.toml                server. Holds the OneSignal REST key
│   ├── hash-password.js             as a Cloudflare secret; the key is
│   ├── REMINDERS.md                 never in this repo or in a browser.
│   └── README.md                    See worker/README.md to deploy,
│                                     worker/REMINDERS.md for the
│                                     automated jamāʿah reminders.
│
└── data/                        Timetable pipeline — not served to users.
    ├── parse_timetable.py           Converts the masjid's published PDF
    ├── raw_timetable_2026.txt        timetable into the app's dataset,
    ├── timetable-2026.json           with automated verification.
    └── VERIFICATION.md               Also fetched live, once a minute,
                                       by the Worker's reminder scheduler.
```

## Prayer time data

Times come from the masjid's official published Salah timetable — never
calculated, never sourced from a third party.

The dataset is **generated, not hand-entered**. `data/parse_timetable.py`
reads the published rows, resolves ditto marks, maps Hijri dates, and runs a
series of checks — correct day counts per month, jamāʿah never earlier than
beginning time, Jumuʿah present on every Friday, the BST transitions handled
correctly — before writing anything. If any check fails, it writes no output.

Current dataset: **1 January – 31 December 2026** (1447–1448 AH).

### Annual refresh

The masjid publishes the following year's timetable around late November or
December. Updating is routine, not a repair:

1. Add the new year's rows to `data/raw_timetable_2026.txt`'s format.
2. `python3 data/parse_timetable.py` — verifies and refuses to write output
   on any failure.
3. Embed the generated JSON into `index.html`, replacing the
   `const DATA = { … }` block.
4. Complete the sign-off checklist in `data/VERIFICATION.md` — checking the
   generated times against the printed board — before deploying.
5. No change needed to the Worker: the scheduled reminders fetch the live
   dataset from the deployed app, so they pick up the new year automatically
   once step 3 is live.

Step 4 is not optional. Automated checks confirm internal consistency; only
a person can confirm it matches what the masjid intends.

## Notifications — how the pieces fit together

Three separate things, deliberately kept apart:

- **`index.html`** carries the OneSignal Web SDK and the Alerts tab's opt-in
  UI. It writes each device's topic preferences as OneSignal tags the moment
  the device subscribes — not only when Save is pressed.
- **`worker/`** is a Cloudflare Worker holding the OneSignal REST API key as
  a secret. `admin.html` calls it to send manual messages (janāzah,
  announcements); a Cron Trigger calls it every minute to check whether any
  jamāʿah reminder is due.
- **OneSignal itself** handles actual delivery and device subscriptions.

The REST key can message the entire congregation, so it exists in exactly
one place: Cloudflare's secret store. It is never in this repository, never
in `admin.html`, never in a browser.

See `worker/README.md` to deploy the Worker, and `worker/REMINDERS.md` for
how the automated jamāʿah reminders work.

## Development

No build step, no framework, no dependencies for the app itself — edit
`index.html` directly and commit. GitHub Pages deploys from `main`.

The compass, notifications, and home-screen install all require HTTPS and
won't work from a local file or a sandboxed preview — test against the
deployed URL.

The `worker/` folder is a small Node/Cloudflare project with its own
dependencies (`npm install` inside `worker/`) and its own deploy step
(`npx wrangler deploy`) — separate from the static site above.

## Roadmap

- **Website companion** — a marketing/info site sharing this app's design
  system, for browsers and search, separate from the day-to-day PWA.
- **MyMasjid Live integration** and **Apple Pay checkout on Donate** —
  both pending exact URLs/confirmation from the committee.
- **Vector logo** — current assets are upscaled from a small source image;
  requested from the masjid for icon and print quality.
- A small number of fiqh/date decisions are flagged inline in the code
  (`MARK_MAWLID`, the Ramadan 2027 fallback date) pending the imam's
  confirmation before launch.

## Credits

Built for Bolton Central Islamic Society. Prayer times, the Taiyabah Masjid
name, and the masjid's logo belong to the charity. See `LICENSE.md`.
