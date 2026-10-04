# Taiyabah Masjid — native app

A React Native rebuild of the masjid's app, in Expo. The web app stays live and
maintained; this replaces it when it is better, not before.

## Why

The web app is a Trusted Web Activity: a web page in a Chrome shell. Android
requires it to show "Running in Chrome" on first launch and there is no way to
remove it, the tab bar sits wherever the browser's own chrome leaves room, and
audio stops when the phone is backgrounded. None of that is fixable from inside
a webview. This is.

What native actually buys, in this app specifically:

* the radio keeps playing with the phone locked, with lock-screen controls
* the qibla reads the magnetometer directly rather than asking a browser for a
  heading it may not give
* prayer reminders are scheduled on the device, so they fire with no signal and
  cost the masjid nothing to send
* every pushed screen gets the platform's own swipe-back
* a tap answers with a haptic before the screen changes

## Where the content comes from

Almost none of it was retyped.

| | |
|---|---|
| `scripts/extract-content.mjs` | Opens the web app's `index.html` in a real browser and lifts each sheet out of the DOM as a block tree, keeping each `data-i18n` key beside its English. |
| `scripts/check-extract.mjs` | Walks the DOM and the JSON side by side and reports anything dropped. It currently carries **619 of 619** text fragments across — forms excluded, since those are hand-written here. |
| `scripts/check-parity.mjs` | Opens **both** apps in a browser and compares the home screen's sections, the twelve tiles *and their order*, and the More menu's groups and rows. This is the check behind "every link and button where the web app has it" — asserting that is easy, measuring it is the only version worth having. |
| `scripts/extract-reminders.mjs` | Copies the home screen's fifty-four reminders out of `index.html` as source, predicates and all, and refuses to write the file if one of them calls a helper the generated module does not define. |
| `scripts/build-logo.mjs` | Renders `logo.svg` to a bitmap for the top bar, at 3×. |
| `scripts/build-i18n.mjs` | Builds `src/i18n/{en,ur,gu,ar}.json`. English comes off the markup; Urdu, Gujarati and Arabic come from `lang/src/*.json` unchanged — 2,021 strings each, covering 99% of the English keys. |
| `scripts/build-data.mjs` | Bundles the Qur'an text, the surah and book headings, the muṣḥaf page map and the timetable. |
| `scripts/import-content.mjs` | Executes `quran/athkar.js`, `duas.js` and `rabbanas.js` in a sandbox and writes them as JSON. |

Run all of them with `npm run content`. When the committee changes the copy on
the website, that one command brings it here.

Because the i18n keys came across with the prose, picking a language redraws
every one of those screens. A key a pack is missing falls through to English
rather than showing a blank — the packs have not yet been checked by a native
speaker, so a gap has to degrade rather than break.

## What is bundled and what is fetched

Bundled, so it works in the masjid with no signal: the whole Qur'an text with
translation (2.3MB), every surah and book heading, the full year's timetable,
the adhkār, duʿās and rabbanās.

Fetched on demand and then cached to disk: the 848 muṣḥaf page images (66MB)
and Ṣaḥīḥ al-Bukhārī's 97 book files (8.7MB). Bundling those would nearly
triple the download for content most people never open.

## Writes

Every request the app sends goes through a Postgres function, never a table —
`request_nikah_date`, `request_hall_booking`, `request_imam_advice`. They are
the same functions the website calls, so the office gets one queue rather than
two, and they are what take the lock, hold the slot and refuse the second
person while the first is paying. Where one of them speaks to the applicant
directly, the app shows what it said rather than an apology over the top.

Two things are still on the website rather than in here, deliberately: the
charity-collection application, which has to carry a BMCC certificate as a file
upload, and the madrasah portal, which signs in against the masjid's own
records.

## Checking it without a phone

```
npm run content                      # rebuild data + language packs from the web app
node scripts/parse-check.mjs         # every source file through the project's Babel
node scripts/check-extract.mjs       # did any prose get dropped?
node scripts/check-parity.mjs        # is everything where the web app puts it?
npx expo export --platform web --output-dir dist
node scripts/shots.mjs               # photograph all 37 screens, report runtime errors
```

`shots.mjs` is not a substitute for a phone — the compass, the audio and the
haptics do not exist in a browser — but it catches a screen that throws or a
layout that breaks before eight minutes of Gradle does.

## Building an APK

Push to `main` under `native/`, or run the **Native app (Android)** workflow by
hand. It produces `app-release.apk` as a run artifact.

It is a release build, which matters: a *debug* APK contains no JavaScript at
all — it expects to reach a Metro dev server — so it installs and then sits on
the splash screen forever. That happened once; `assembleRelease` is the fix.

It is still not for Play. Expo's generated project signs release with the debug
keystore, which makes an APK that installs by hand but that Play would reject.
That is the right shape while the listing still belongs to the web app: this
build cannot touch it even by accident. It installs *alongside* the Play app —
different package id (`…app.dev`) — so the two can be compared side by side.

The signing keystore and its password are never generated here, never committed
and never pasted into a transcript.
