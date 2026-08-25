<div align="center">

# Taiyabah Masjid

**Prayer times, live audio, Qur'an, zakat and community alerts for Taiyabah Masjid.**

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
  published timetable — never calculated, never sourced elsewhere
- Live countdown to the next jamāʿah, with the current prayer highlighted from
  its *beginning* time rather than its jamāʿah
- Both Jumuʿah times shown inline on Fridays, with Jumuʿah replacing Zuhr in
  the timetable and the day's heading
- Browse any date, jump to Today or the next Jumuʿah, or open the full month
- A Friday-only call to give, paired with an authentic hadith on the day's virtue

**Reminders on screen**
- Contextual cards tied to the day and time — Sūrah al-Kahf on Fridays,
  morning and evening adhkār in their true windows, duʿā between adhān and iqāmah
- Advance notice of voluntary fasts *the day before*, with the suhūr end time
  computed from the next day's Fajr
- The Islamic calendar days the masjid's own timetable marks
- A quiet countdown to Ramadan, appearing only in the final 30 days

**Notifications**
- Opt-in by category — jamāʿah reminders, janāzah, announcements, events — so
  urgent messages stay urgent
- **Two automatic alerts per prayer**: an advance reminder at each subscriber's
  own lead time (5/10/15 min), and **"Jamāʿah Time Now"** at the jamāʿah itself
- A trustee compose screen (`admin.html`), password-protected, sending through
  the masjid's own Cloudflare Worker — the OneSignal key never touches a browser
- Built-in diagnostics ("Having trouble?") so notification problems are
  self-serviceable rather than a support conversation

**Recite**
- **Daily Athkar** — morning and evening remembrance, sourced and cited
- **Qur'an** — Sūrah al-Fātiḥah with the official tajweed colour legend
- **Common Duas** — everyday supplications in a tile grid, each opening in place
- **40 Rabbanā** — the forty short Qur'anic duʿās, numbered, in Indo-Pak script

**Qibla**
- Great-circle bearing to the Kaʿbah with a live compass where supported,
  refining to the user's own location if allowed
- Degrades honestly: states the bearing even without a working compass, and
  explains exactly why the compass can't run when it can't

**Listen live**
- In-app player for the masjid's broadcast, with background playback and
  lock-screen controls
- The masjid's videos and bayaans, playing in-app rather than sending people away

**Zakat calculator**
- Nisab from a live gold/silver spot price (fetched key-free, sanity-checked,
  falling back to manual entry if the figure looks implausible)
- Silver standard by default — the Hanafi position, being the lower threshold
- Plain-English guidance written for someone who has never calculated zakat
- States plainly that it's a guide, not a ruling

**Giving**
- Online donation via Apple Pay, Google Pay, PayPal and card, with Gift Aid
- Donor tiers as **pledges**, settled afterwards by transfer or at the office
- Bank details with tap-to-copy

**Community information**
- Masjid history — established 1967, founders, the ulema who have led imaamat
- Contact, hall hire at Taiyabah Centre, Imams' Advice
- Birth (including circumcision referral), Marriage, Islamic Will, and Funerals

**Settings**
- **Language** — English, Urdu, Gujarati and Arabic. Packs download on demand,
  cache offline, and switch the interface instantly, including right-to-left

## Repository structure

```
├── index.html                 The app. Self-contained — the whole year's
│                               timetable is embedded, so prayer times need
│                               no network request.
├── admin.html                  Password-gated notification compose screen.
├── sw.js                       Service worker — offline shell, push handlers.
├── manifest.webmanifest         Home-screen install metadata.
├── logo-*.png, icon-*.png       Masjid logo and app icons.
├── LICENSE.md                   Ownership and usage terms.
│
├── .github/workflows/           Deploys the Worker automatically on push,
│   └── deploy-worker.yml         so no local tooling is ever required.
│
├── push/onesignal/              OneSignal's own service workers, kept on a
│                                 separate scope so they don't collide with sw.js.
│
├── worker/                      Notification backend — a Cloudflare Worker.
│   ├── worker.js                 Holds the OneSignal REST key as a secret;
│   ├── wrangler.toml              handles manual sends and the scheduled
│   ├── hash-password.js            jamāʿah reminders.
│   ├── REMINDERS.md               See README.md to deploy, REMINDERS.md for
│   └── README.md                   how the automated reminders work.
│
├── lang/                        Language packs — fetched only when a user
│   ├── ur.js  gu.js  ar.js       chooses that language, never on load.
│
├── quran/                       Qur'anic content — lazy-loaded, so the main
│   ├── fatiha-demo.js            app never pays for carrying it.
│   └── rabbanas.js
│
└── data/                        Timetable pipeline — not served to users.
    ├── parse_timetable.py           Converts the masjid's published PDF into
    ├── timetable-2026.json           the app's dataset, with verification.
    └── VERIFICATION.md               Also read once a minute by the Worker's
                                       reminder scheduler.
```

## Prayer time data

Times come from the masjid's official published Salah timetable — **never
calculated, never sourced from a third party**. There is no calculation engine
in this app.

The dataset is **generated, not hand-entered**. `parse_timetable.py` reads the
published rows, resolves ditto marks, maps Hijri dates, and runs a series of
checks — correct day counts per month, jamāʿah never earlier than beginning
time, Jumuʿah present on every Friday, BST transitions handled — before writing
anything. If any check fails, it writes no output.

Current dataset: **1 January – 31 December 2026** (1447–1448 AH).

### Times cannot drift

The app displays times embedded in `index.html`; the reminder scheduler reads
`data/timetable-2026.json`. Both are generated from the same source, but if an
annual refresh ever updated one and not the other, notifications could fire at
a time the app doesn't show.

To make that impossible, **every scheduled run cross-checks its times against
the app's own timetable before sending**, and halts with a logged discrepancy
rather than announcing a time nobody can see. If the app simply can't be
reached, it proceeds — an outage shouldn't silence prayer reminders.

### Annual refresh

The masjid publishes the following year's timetable around late November or
December. Updating is routine, not a repair:

1. Add the new year's rows in `data/raw_timetable_2026.txt`'s format.
2. `python3 data/parse_timetable.py` — verifies, and refuses to write output on
   any failure.
3. Embed the generated JSON into `index.html`, replacing the `const DATA` block.
4. **Update `data/timetable-2026.json` too** — the scheduler reads it, and the
   integrity check above will halt reminders if the two disagree.
5. Complete the sign-off checklist in `data/VERIFICATION.md`, checking the
   generated times against the printed board, before deploying.

Step 5 is not optional. Automated checks confirm internal consistency; only a
person can confirm it matches what the masjid intends.

## Notifications — how the pieces fit together

Three separate things, deliberately kept apart:

- **`index.html`** carries the OneSignal Web SDK and the opt-in UI. It writes
  each device's topic preferences **via the Worker**, not the browser SDK —
  the SDK's own tag write proved unreliable across every device tested
  ([OneSignal-Website-SDK#1093](https://github.com/OneSignal/OneSignal-Website-SDK/issues/1093)).
- **`worker/`** is a Cloudflare Worker holding the OneSignal REST API key as a
  secret. `admin.html` calls it to send manual messages; a Cron Trigger calls
  it every minute to check whether any jamāʿah reminder is due.
- **OneSignal** handles delivery and device subscriptions.

The REST key can message the entire congregation, so it exists in exactly one
place: Cloudflare's secret store. Never in this repository, never in
`admin.html`, never in a browser.

**iOS note:** web push only reaches devices where the app has been **added to
the Home Screen**. A bookmarked tab receives nothing — an Apple restriction, and
one that makes install instructions part of the feature.

## Development

No build step, no framework, no dependencies for the app itself — edit
`index.html` directly and commit. GitHub Pages deploys from `main`.

The compass, notifications and home-screen install all require HTTPS and won't
work from a local file — test against the deployed URL.

`worker/` is a small Cloudflare project with its own deploy step. Pushing any
change inside `worker/` triggers the GitHub Action, so **no local Node or
Wrangler is needed** — edit and push from anywhere, including a tablet.

**Performance principle:** content that is small, permanent and core to daily
use (prayer times, duʿās) is embedded so it works instantly and offline.
Content that is large, growing or supplementary (Qur'an, language packs) lives
in its own folder and is fetched only when opened. Architecture is matched to
the content, not applied uniformly.

## Roadmap

- **App store release** — mid-October target. Requires wrapping the PWA,
  an Apple Developer Organization account under BCIS, and Google Play's
  mandatory 12-tester / 14-day period.
- **Qur'an** — currently al-Fātiḥah with the tajweed legend. A full Mus-haf
  needs a verified rules dataset integrated properly, not hand-marked.
- **Translations** — the Urdu, Gujarati and Arabic packs cover navigation and
  prayer names only, and **have not been reviewed by a native speaker**.
- **Religious content review** — the Islamic Will, Marriage and 40 Rabbanā
  pages, and the transcribed Arabic throughout, need the imam's sign-off
  before wider release.
- **Account ownership** — OneSignal, Cloudflare and GitHub are currently under
  a personal account rather than the charity's.
- **Vector logo** — current assets are upscaled from a small source image.

## Ownership and credits

Built for Bolton Central Islamic Society by **Yameen Bux**.

Ownership is split, and the distinction matters:

**Owned by Bolton Central Islamic Society (Taiyabah Masjid)**
- The Taiyabah Masjid name and logo
- The prayer timetable and all prayer times
- All masjid content — history, photography, announcements, service details,
  contact and campaign information

**Owned by Yameen Bux** — © 2026, all rights reserved
- The source code, in full
- The interface and visual design, layout and component structure
- The timetable parsing and verification pipeline
- The notification architecture and Cloudflare Worker
- All original written content authored for the app

The charity holds a **perpetual, irrevocable, royalty-free licence** to use,
host and operate this application for the purposes of the masjid and its
community — including engaging others to maintain it on the charity's behalf.
That licence covers use of this app; it does not transfer ownership of the code
or design, and it grants no right to reuse either elsewhere.

No permission is granted to any other person or organisation to copy, reuse or
redeploy this code or design — including for another masjid. See
[`LICENSE.md`](LICENSE.md) for the full terms.
