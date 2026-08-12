<div align="center">

# Taiyabah Masjid

**Salah times, jamāʿah reminders and Qibla direction for the Taiyabah Masjid community.**

Bolton Central Islamic Society · Registered charity 1041569
31a Draycott Street, Bolton BL1 8HD

[**Open the app →**](https://yameenbux.github.io/Taiyabah-Mosque-App/)

</div>

---

## About

A lightweight web app built for Taiyabah Masjid, giving the community direct
access to the masjid's own prayer timetable rather than a third-party
aggregator. It installs to the home screen, works offline, and takes its times
from the masjid's officially published Salah timetable.

It is a progressive web app — no app store, no install friction, one URL.

## Features

**Prayer times**
- Beginning and jamāʿah times for all five prayers, plus sunrise
- Live countdown to the next jamāʿah, with the current prayer marked
- Both Jumuʿah times on Fridays
- Browse any date in the year: previous/next, date picker, or jump to Today,
  Tomorrow or the next Jumuʿah
- Full-month view — the printed timetable, on a phone

**Reminders**
- Contextual prompts tied to the day and the time: Sūrah al-Kahf on Fridays,
  morning adhkār between Fajr and sunrise, evening adhkār after Asr
- Advance notice of voluntary fasts, with the suhūr end time, given the day
  before so there is time to prepare
- Islamic calendar days observed by the masjid — Shab-e-Miʿrāj, Shab-e-Barāʾat,
  Ramadan, both Eids, the days of Hajj, ʿĀshūrāʾ and the Hijrah
- A countdown to Ramadan through the final thirty days

**Qibla**
- Great-circle bearing to the Kaaba, with a live compass where the device
  supports it (118.4° true from the masjid; 5,042 km)
- Refines to the user's own location when permission is given

**Alerts**
- Opt-in by category — jamāʿah reminders, janāzah, announcements, events —
  so urgent notices stay urgent
- A compose screen for trustees, with templates and a lock-screen preview

## Repository structure

```
├── index.html              The app. Self-contained: the full year's
│                           timetable is embedded, so no network request
│                           is needed to show prayer times.
├── admin.html              Notification compose screen for trustees.
├── sw.js                   Service worker — offline shell, push handlers.
├── manifest.webmanifest    Home-screen install metadata.
├── logo-cream.png          Masjid logo, for dark backgrounds.
├── logo-dark.png           Masjid logo, for light backgrounds.
├── icon-192.png            App icons.
├── icon-512.png
├── apple-touch-icon.png
└── data/                   Timetable pipeline — not served to users.
    ├── parse_timetable.py      Converts the published timetable into data.
    ├── raw_timetable_2026.txt  Source rows from the official PDF.
    ├── timetable-2026.json     Generated dataset (365 days).
    └── VERIFICATION.md         Checks performed, and the sign-off checklist.
```

## Prayer time data

Times come from the masjid's official published Salah timetable. They are not
calculated by the app and not sourced from a third party.

The dataset is **generated, not hand-entered**. `parse_timetable.py` reads the
published rows, resolves the timetable's ditto marks, maps Hijri dates, and
runs a series of checks before writing anything — day counts per month, no
missing values, jamāʿah never earlier than the beginning time, Jumuʿah present
on every Friday, and the British Summer Time transitions. If any check fails,
it writes no output.

The current dataset covers **1 January – 31 December 2026** (1447–1448 AH).

### Annual refresh

The masjid publishes the following year's timetable around late November or
December. Updating the app is a routine task, not a repair:

1. Put the new year's rows into the format used by `data/raw_timetable_2026.txt`
   (month header line, one row per day, ditto marks preserved).
2. Run `python3 data/parse_timetable.py`. It verifies the data and refuses to
   produce output if anything fails.
3. Embed the generated JSON into `index.html`, replacing the existing
   `const DATA = { … }` block.
4. Complete the human sign-off in `data/VERIFICATION.md` — checking the
   generated times against the printed board before release.

Step 4 is not optional. The automated checks confirm the data is internally
consistent; only a person can confirm it matches what the masjid intends.

## Development

No build step, no dependencies, no framework. Edit the files directly and
commit — GitHub Pages deploys from `main`.

Note that the compass, notifications and home-screen install all require
HTTPS. They will not work from a local file or a preview frame; test against
the deployed URL.

## Roadmap

- **Push delivery.** The opt-in UI and service worker handlers are in place;
  connecting a push provider will enable delivery to subscribers.
- **Authentication for the trustee compose screen**, to be completed before
  push delivery is enabled.
- **Prayer time alignment.** Some settings are pending confirmation from the
  committee — see the notes in `index.html`.

## Credits

Built for Bolton Central Islamic Society. Prayer times are the masjid's own.
The Taiyabah Masjid name and logo belong to the charity.
