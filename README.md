<div align="center">

# Taiyabah Masjid

**Prayer times, live audio, Qur'an, zakat and community alerts for Taiyabah Masjid.**

Bolton Central Islamic Society · Registered charity 1041569
31a Draycott Street, Bolton BL1 8HD

[**Open the app →**](https://taiyabahapp.ysbdesigns.uk)

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
- **Qur'an** — the complete Mus-haf in IndoPak script: 114 sūrahs, 6,236 āyāt,
  with the official tajweed colour legend. Split by sūrah and fetched only when
  opened, then cached, so a sūrah read once can be read again in the masjid
  basement with no bars
- **Daily Athkar** — morning and evening remembrance, after every ṣalāh and
  before sleep, each sourced and cited
- **Common Duas** — everyday supplications in a tile grid, each opening in place
- **40 Rabbanā** — the forty short Qur'anic duʿās, numbered, in IndoPak script,
  every one verified against the Qur'an text itself rather than transcribed

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
- Card, Apple Pay and Google Pay through the masjid's own **Stripe** payment
  links, with Gift Aid — money reaches the charity directly, with no shop
  platform in between
- Donor tiers as **pledges**, settled afterwards by transfer or at the office
- Bank details with tap-to-copy

**The madrasah**
- **Admissions & Fees** — everything asked of a family before they apply: the
  fees, the class times, the 90% attendance the madrasah expects and what
  happens below it, the uniform rule, and that applying is not the same as
  having a place
- **Holiday Planner** — whether the madrasah is open *today*, twelve month
  grids that open on the month you are in, every closure of the 2026/27 year
  with its length, and the Islamic dates beside them. Calculated dates are
  labelled estimates; the madrasah's own closures are not, because they are fixed
- **Madrasah Portal** — sign-in for parents, teachers and staff, on the
  masjid's website

**Life-stage services**
- **Birth** — guidance for new arrivals, including circumcision referral
- **Nikāḥ** — what the masjid provides, the standing advice to also register
  the marriage civilly, and a date request: pick a day and the prayer it would
  follow, with that day's own jamāʿah time shown beside it
- **Islamic Will** — wasiyyah, the fixed shares, and where a solicitor is needed
- **Funeral Services** — BCoM's out-of-hours number first, because that call has
  to happen before anything else can, then everything the masjid itself
  arranges: ghusl, kafn, janāzah, transport, the fridge, burial, catering and
  the imams afterwards

**Hall hire and education**
- **Hall / Room Hire** — availability read live from the masjid's booking
  system, a session chosen, and a request submitted from the app
- **Education** — Arabic classes and the Ghusl workshop, for adults
- **Imams' Advice** — appointments through the office

**Community information**
- Masjid history — established 1967, founders, the ulema who have led imaamat
- Contact details and directions

**Settings**
- **Language** — English, Urdu, Gujarati and Arabic. Every word, number and
  date: 1,490 strings per language, digits in the reader's own numerals
  (۰۱۲ / ٠١٢ / ૦૧૨), calendars mirrored right-to-left, and identifiers such as
  postcodes and phone numbers deliberately left in Latin so they still work.
  Packs download on demand, cache offline, and switch the interface instantly

## Repository structure

The repository root **is** the public website — GitHub Pages serves it
verbatim. Anything committed here is reachable by URL.

```
├── index.html                 The app. Self-contained — the whole year's
│                               timetable is embedded, so prayer times need
│                               no network request.
├── admin.html                  Password-gated notification compose screen.
├── sw.js                       Service worker — offline shell, push handlers,
│                                and the update path (see below).
├── manifest.webmanifest         Home-screen install metadata.
├── logo-*.png, icon-*.png       Masjid logo and app icons.
├── LICENSE.md                   Ownership and usage terms.
│
├── .github/workflows/
│   ├── release-checks.yml       Runs scripts/check-release.mjs on every push.
│   └── deploy-worker.yml        Deploys the Worker automatically on push,
│                                 so no local tooling is ever required.
│
├── scripts/                     Build and verification. Node, no dependencies.
│   ├── check-release.mjs         29 checks — the release gate. See below.
│   ├── check-i18n.mjs            Measures translation coverage against the app.
│   ├── i18n-keys.mjs             Extracts every translatable string there is.
│   ├── build-lang.mjs            lang/src/*.json  →  lang/{ur,gu,ar}.js
│   ├── fetch-quran.mjs           Builds quran/surah/ from the source text.
│   └── verify-rabbanas.mjs       Checks the 40 Rabbanā against the Qur'an.
│
├── push/onesignal/              OneSignal's own service workers, kept on a
│   └── …                         separate scope so they don't collide with
│                                  sw.js. Duplicated one level down because
│                                  the dashboard still asks for the old path.
│
├── worker/                      Notification backend — a Cloudflare Worker.
│   ├── src/index.js              Holds the OneSignal REST key as a secret;
│   ├── wrangler.toml              handles manual sends and the scheduled
│   ├── hash-password.js            jamāʿah reminders.
│   ├── REMINDERS.md               See README.md to deploy, REMINDERS.md for
│   └── README.md                   how the automated reminders work.
│
├── lang/                        Language packs.
│   ├── src/*.json                The editable source — one file per area,
│   │                              each key as [Urdu, Gujarati, Arabic].
│   └── ur.js  gu.js  ar.js       Generated. Never edit these by hand.
│
├── quran/                       Qur'anic content — lazy-loaded, so the main
│   ├── surah/001.js … 114.js     app never pays for carrying it.
│   ├── athkar.js  duas.js
│   └── rabbanas.js
│
├── portal/                      The madrasah portal, mirrored from the website.
│
└── data/                        Timetable pipeline — not served to users.
    ├── parse_timetable.py           Converts the masjid's published PDF into
    ├── timetable-2026.json           the app's dataset, with verification.
    └── VERIFICATION.md               Also read once a minute by the Worker's
                                       reminder scheduler.
```

## Release checks

`scripts/check-release.mjs` runs on every push and is the reason a mistake in
this repository tends to be caught by a build rather than by somebody in the
congregation. It is not a linter. Each check exists because something went
wrong once, and each is written so that removing the behaviour it guards makes
the build fail.

There are **29**. Among them:

| Check | What it caught |
|---|---|
| Qur'an complete | 114 sūrahs and 6,236 āyāt, every count against the canonical table |
| 40 Rabbanā | each duʿā matched against the Qur'an text, not trusted as transcribed |
| Translations | 1,490 strings in all three languages, nothing missing and nothing spare |
| Latin identifiers | 22 postcodes, phone numbers and account numbers that must **not** be re-numeralled — "Bolton BL1 8HD" once became "Bolton BL۱ ۸HD" |
| Arabic marks | scripture on a font stack that actually has glyphs for the marks it ships |
| CSS variables | every custom property used is defined — an undefined one silently drops the whole declaration |
| Duplicate selectors | a second copy of a rule quietly overriding the first, which is how the 40 Rabbanā lost their padding |
| Donations | all 5 Stripe links present, in live mode, with no old shop links surviving |
| Update path | five behaviours that together let a new build and new words reach an installed phone without a reinstall |
| Holiday planner | the prose ("180 teaching days, 36 weeks") re-derived from the closure dates beside it |
| Nikāḥ requests | the form is shown only when the server confirms it can receive one, fails closed, and is never a dead end when closed |
| Everything parses | index.html, admin.html, sw.js and the Worker |

Run it locally with `node scripts/check-release.mjs`. It needs no dependencies.

## Translations

Four languages: English, Urdu, Gujarati and Arabic.

**Never edit `lang/ur.js`, `lang/gu.js` or `lang/ar.js`.** They are generated.
The source is `lang/src/*.json`, one file per area of the app, each entry a key
and its three translations:

```json
"nikah.request_a_date": ["تاریخ کی درخواست", "તારીખની વિનંતી", "اطلب موعداً"]
```

```
edit lang/src/*.json
node scripts/build-lang.mjs      # regenerates the three packs
node scripts/check-i18n.mjs      # every string on screen has a translation,
                                 # and no translation exists for a string that
                                 # is no longer on screen
```

`check-i18n.mjs` measures the packs **against the app**, not against each
other. An earlier version compared the packs to themselves and reported 100%
coverage while 406 strings were reaching the screen untranslated.

Each pack carries a content hash as its version. The app caches the pack it has
so it works offline, fetches a fresh copy in the background on every launch,
and — this part matters — uses the copy it just downloaded rather than reading
it back out of storage. A phone that cannot store the pack (at its quota, in
private mode, or evicted by iOS after a week unopened) still shows the right
words for as long as it is open.

## Shared data with the website

Hall bookings and nikāḥ requests are written to the same Supabase project the
masjid's website uses, so a request made in the app lands in the same queue the
office already works from. The app holds only the **publishable** key; Row
Level Security in Postgres is the access control. The key can insert a booking
and read the availability view, and can read no booking back.

**The `service_role` key must never appear in this repository**, in
`index.html`, or anywhere else a browser can reach it. It bypasses RLS entirely.

Two features are built and waiting on database migrations in the website
repository rather than on any change here:

- **Nikāḥ date requests** — needs `db/010_nikah_requests.sql`. The app asks the
  server whether that function exists each time the screen opens, so it turns
  itself on the moment the migration is applied. Until then it shows the
  calendar and offers to ring or email the office with the chosen date already
  written out.
- **Course registration** — needs `db/009_courses.sql`. Until then both courses
  say registration opens shortly and send people to the office.

Neither carries a hand-edited switch, deliberately: a boolean here and another
on the website would be two things that must agree, with nothing making them.

## Getting a new build onto an installed phone

Worth understanding before changing anything, because it is subtle and it has
bitten this app twice.

The app's `start_url` is `index.html`, which the service worker serves from its
own cache. So the code a phone runs is the code cached when that cache was
written — not what is on the server. Three things make an update actually
arrive:

1. **`sw.js` must change, and its `CACHE` name must change with it.** A worker
   with the same cache name opens the cache already there and hands back
   everything already in it. The release check fails a push that edits
   `index.html` without touching `sw.js`, and fails a `sw.js` whose cache name
   did not move.
2. The worker fills its cache **from the network** (`cache: "reload"`), not
   through the browser's own copy, which may itself be stale.
3. On replacing an older worker it **sends its windows back through the door**,
   so the open app picks up the new build immediately rather than a launch later.

Bump `CACHE` in `sw.js` with every user-visible change. It is one line and it
is the difference between shipping and appearing to ship.

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

Before pushing anything user-visible:

```
node scripts/check-release.mjs    # the release gate — 29 checks
node scripts/check-i18n.mjs       # translation coverage
```

Both are plain Node with no dependencies, and both run in CI anyway. Running
them first saves a red build.

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

- **App store release** — requires wrapping the PWA, an Apple Developer
  Organization account under BCIS, and Google Play's mandatory
  12-tester / 14-day period.
- **Nikāḥ requests and course registration** — built, and waiting on two
  database migrations in the website repository. See *Shared data with the
  website* above. Both need ICO registration, a documented lawful basis, a
  retention period and a line in the privacy notice before they are applied.
- **Madrasah applications** — the form lives on the website and stays
  unreachable until the DPIA is done. The app publishes the fees, rules and
  term dates, and says applications open soon rather than implying a form.
- **Hall hire prices** — the member and non-member figures shown are the
  website's placeholders and still need the committee's sign-off. The screen
  says so.
- **Account ownership** — OneSignal, Cloudflare, Stripe, Supabase and GitHub
  are currently under a personal account rather than the charity's. This is the
  most important item on this list.
- **Two end-to-end tests, by a person** — a real donation through Stripe, and a
  real hall booking, each confirmed as arriving where the office expects it.
  Both paths are built and neither has been exercised with real money or a real
  date. If the booking fails it will be CORS on the app's origin, which is a
  setting in Supabase rather than a change here.
- **Religious content review** — the translations carry the imam's approval.
  The Islamic Will and Marriage guidance have not separately been signed off.
  The 40 Rabbanā no longer need it: every one is now checked against the Qur'an
  text on each build.
- **Source attributions** — the citation line under each duʿā
  (`ṢAḤĪḤ AL-BUKHĀRĪ`) is gold at 10.5px and measures 3.38:1 against its card,
  below the 4.5:1 floor. The Arabic above it was fixed; this was left because
  it was not what people reported.
- **Vector logo** — current assets are upscaled from a small source image.
- **Housekeeping** — `files.zip` at the repository root is a stale copy of
  files that are already public individually. It is harmless but is served at
  the site root and can go.

### Done since the first release

- The complete Qur'an, replacing the single-sūrah demo
- Full translation into Urdu, Gujarati and Arabic — every string, number and
  date, not only navigation — with the imam's approval confirmed
- Donations moved to the masjid's own Stripe links
- Hall booking, madrasah admissions and the holiday planner, the education
  courses, the nikāḥ date request and funeral services, all brought across
  from the website
- The release-check suite, and the update path that gets a new build onto an
  installed phone

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
