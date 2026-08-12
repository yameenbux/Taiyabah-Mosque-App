# Taiyabah Masjid — Salah Times

A prayer-times Progressive Web App for **Taiyabah Masjid**, run by the
**Bolton Central Islamic Society** (registered charity 1041569). Deployed as
a static site on GitHub Pages.

## What this is

A single-page app showing today's (or any chosen day's) prayer begin and
jamā'ah times, a live countdown to the next jamā'ah, a Qibla compass, and an
opt-in notifications/alerts screen — installable to the home screen on iOS
and Android like a native app.

## Structure

- **`index.html`** — the entire app. Fully self-contained: the whole 2026
  timetable is embedded as a JS object (`const DATA = {...}`), so there is
  no network fetch at runtime. Styling, markup and logic all live in this
  one file.
- **`admin.html`** — the trustee "send a notification" screen, used to
  compose and (currently) locally raise a push-style notification.
- **`sw.js`** — the service worker. Caches the app shell for offline use and
  contains `push` / `notificationclick` handlers that are wired up and ready
  to go, waiting for a push provider to be connected.
- **`manifest.webmanifest`**, **`icon-192.png`**, **`icon-512.png`**,
  **`apple-touch-icon.png`** — PWA install metadata and icons.
- **`data/`** — the timetable ingestion pipeline (see below). Not read by
  the live app; it's the tooling used to produce the JSON that gets embedded
  into `index.html`.

## Annual timetable refresh

The embedded data currently runs to **31 December 2026**. The masjid
publishes the following year's timetable around late November / December.
To refresh:

1. Transcribe the new timetable's rows into `data/raw_timetable_2026.txt`
   format (month header line + one row per day, ditto marks preserved).
2. Run `python3 data/parse_timetable.py` — it verifies the data (day counts,
   no missing values, jamā'ah never before begin time, Maghrib begin ==
   jamā'ah, all Fridays carry Jumu'ah times, continuous Hijri months, clock
   -change days, etc.) and **refuses to write output if any check fails**.
3. Take the resulting JSON and embed it into `index.html`, replacing the
   existing `const DATA = {...}` block.
4. Complete the human sign-off checklist in `data/VERIFICATION.md` before
   deploying — the automated checks confirm internal consistency, not that
   the source PDF was transcribed correctly, so a person needs to eyeball
   the new times against the printed board.

## Known open items

1. **`admin.html` has no authentication** and is publicly reachable at its
   URL. This is harmless today because sending from it only raises a
   notification on the sender's own device — but it **must be secured
   before any real push service is connected**, otherwise anyone who finds
   the URL could message the whole congregation.
2. **Push notifications are not yet connected to a provider.** The UI and
   service worker (`sw.js`) are ready to receive and display push messages;
   delivery still needs a provider such as OneSignal wired in.
3. **`MARK_MAWLID` is set to `false`** in `index.html`. 12 Rabī' al-Awwal
   (Mawlid) is not marked in the app, pending a decision from the masjid
   committee/imam on whether to observe it.
4. **`RAM_FALLBACK` holds an estimated date for Ramadan 1448** (2027-02-08).
   It's only used as a fallback if the Ramadan countdown window opens before
   the 2027 timetable has been loaded, and should be confirmed by the
   committee once the moon-sighting date is known.
