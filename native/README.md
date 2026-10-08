# Taiyabah Masjid — native app

A React Native rebuild of the masjid's app, in Expo. **This is now what is on
Google Play** — `com.taiyabahmasjid.app`, version 2.0.1, version code 8. It
replaced the Trusted Web Activity, which ended at version code 1. The web app
at [taiyabahapp.ysbdesigns.uk](https://taiyabahapp.ysbdesigns.uk) stays live and
maintained, and remains the source of every word this app says.

## Why

The app on Play used to be a Trusted Web Activity: a web page in a Chrome shell.
Android
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
| `scripts/check-extract.mjs` | Walks the DOM and the JSON side by side and reports anything dropped. It currently carries **645 of 665** text fragments across (97%) — forms excluded, since those are hand-written here. |
| `scripts/check-parity.mjs` | Opens **both** apps in a browser and compares the home screen's sections, the twelve tiles *and their order*, and the More menu's groups and rows. This is the check behind "every link and button where the web app has it" — asserting that is easy, measuring it is the only version worth having. |
| `scripts/extract-reminders.mjs` | Copies the home screen's fifty-four reminders out of `index.html` as source, predicates and all, and refuses to write the file if one of them calls a helper the generated module does not define. |
| `scripts/build-logo.mjs` | Renders `logo.svg` to a bitmap for the top bar, at 3×. |
| `scripts/build-i18n.mjs` | Builds `src/i18n/{en,ur,gu,ar}.json`. English comes off the markup; Urdu, Gujarati and Arabic come from `lang/src/*.json` unchanged, plus `src/i18n/app-extra.json` for the words the website does not have — 2,195 strings each, covering 1,271 of the 1,279 English keys (99%). |
| `scripts/build-data.mjs` | Bundles the Qur'an text, the surah and book headings, the muṣḥaf page map and the timetable. |
| `scripts/import-content.mjs` | Executes `quran/athkar.js`, `duas.js` and `rabbanas.js` in a sandbox and writes them as JSON. |

Run all of them with `npm run content`. When the committee changes the copy on
the website, that one command brings it here.

Because the i18n keys came across with the prose, picking a language redraws
every one of those screens. A key a pack is missing falls through to English
rather than showing a blank, so a gap degrades rather than breaks.

> [!WARNING]
> **Never edit `src/i18n/ur.json`, `gu.json`, `ar.json` or `en.json`.** They are
> generated, and `npm run content` rewrites them. An edit there disappears at
> the next routine content run and looks, in the diff, exactly like an edit that
> worked — nobody would notice until somebody switched language.
>
> Words the website already has belong in `lang/src/*.json`. Words only this app
> says — the forms, the alerts, the muṣḥaf reader — belong in
> **`src/i18n/app-extra.json`**, in the same shape, `"key": [Urdu, Gujarati,
> Arabic]`. That file is merged in by the generator, so it survives.

All 772 keys the screens use now have all three languages;
`src/i18n/TODO-translate.json` is the generator's list of what is still missing
and is currently empty. Twelve of them were drafted here rather than taken from
the website's checked wording, and are listed on their own in
**`src/i18n/NEEDS-A-NATIVE-SPEAKER.md`** with English, Urdu, Gujarati and Arabic
side by side and where each appears on screen. That is the file to hand to
whoever confirms them.

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
npm run check                        # the 14 checks, any one of which fails the lot
npm test                             # 114 unit tests across 12 files
node scripts/check-parity.mjs        # is everything where the web app puts it?
npx expo export --platform web --output-dir dist
node scripts/shots.mjs               # photograph every screen, report runtime errors
```

`npm run check` runs `check-keys` first, because a key the project rejects makes
every other check's answer irrelevant. Then: the sources through Babel, the
theme and contrast floors, that every component referenced exists, that each
screen and link and coloured box matches the website's, the four language packs,
the English against the markup, that a screen reader can name every control, the
icon subset, and the iOS targets.

`shots.mjs` is not a substitute for a phone — the compass, the audio and the
haptics do not exist in a browser — but it catches a screen that throws or a
layout that breaks before eight minutes of Gradle does.

## Running it on Android

```
# in CI only — it needs a real emulator
.github/workflows/native-smoke.yml   →  "Native app — does it actually run?"
```

It installs the APK on a booted Pixel 6, waits for the home screen to **draw**
(looking for the words, not sleeping), checks the app is the focused window,
then taps every tile and every menu row — verifying after each tap that a new
screen drew and that nothing reached the crash log or the ReactNativeJS error
log. Every screen is photographed and uploaded, pass or fail.

**Read the notice, not the tick.** A passing run emits its tally as a workflow
notice — how many home items it found, how many tiles and menu rows opened a
screen, which tabs worked — because a green tick says a run passed but not what
it looked at, and `run.log` can only be read by downloading the artifact.

**A red run is worth reading before believing.** Every failure so far has been
this harness, not the app: labels below the fold called missing, the emulator's
own launcher ANR'ing and taking focus, a `mCurrentFocus` snapshot read from the
first of several displays. Each is fixed, but the lesson stands — check whether
the other fifty checks passed before concluding the app is broken, because they
cannot pass if it is. Run it two or three times on the same commit; identical
tallies are the signal, a single pass is not.

Two things it cannot tell you: how the scrolling *feels*, and anything about
the compass — an emulator has no magnetometer, so Qibla shows its "no compass"
state. Everything else is the real app on real Android.

The smoke build packs two architectures to keep the job short. The build to
install on a phone comes from the other workflow and is universal; the two
differ only in which architectures are inside.

## Building the side-by-side APK (`…app.dev`)

Push to `main` under `native/`, or run the **Native app (Android)** workflow by
hand. It produces `app-release.apk` as a run artifact.

It is a release build, which matters: a *debug* APK contains no JavaScript at
all — it expects to reach a Metro dev server — so it installs and then sits on
the splash screen forever. That happened once; `assembleRelease` is the fix.

That one is not for Play: it carries the `…app.dev` package id and Expo's debug
keystore, so it installs *alongside* the real app rather than replacing it.

## Building the bundle Play actually takes

The **Native app bundle (Play)** workflow, by hand, with a version name and a
version code. It produces two artifacts, deliberately separate so the upload
and the phone test cannot be mixed up:

* `taiyabah-play-<run>` — the `.aab` to upload
* `taiyabah-apk-<run>` — the real package, signed, to sideload and test

Mind the signature on that APK. It carries the **upload** key; Play re-signs
with the app signing key before anybody downloads it. Same code, different
signature, so a phone already holding the Play copy refuses this one until that
copy is uninstalled, and vice versa.

Four things gate it, each because something got through once:

1. **No bundle from a commit no phone has opened.** It looks for a successful
   smoke run against that exact SHA and refuses without one. A bundle that
   packages perfectly and crashes on launch passes every other check here.
2. **The app's key must be the website's key** (`scripts/check-keys.mjs`) —
   see below.
3. **The permissions are read back out of the merged manifest** and printed as a
   notice, and a blocklist fails the build. `app.json` says what the app *asks*
   for; the merged manifest is what Play *receives*, and a dependency can add to
   it.
4. **The certificate is read back out of the finished `.aab`** and compared to
   the keystore's, then to the fingerprint recorded in
   `store/ANDROID-RELEASE.md`. A debug-signed bundle builds perfectly and looks
   finished.

The signing keystore and its password are never generated here, never committed
and never pasted into a transcript.

## The publishable key, and why it has its own check

From the first commit that wired this app up until 8 October 2026,
`src/supabase.js` carried a publishable key the project answers **401 `Invalid
API key`** to. `index.html` and `portal/config.js` had the right one all along.
So the installed app never authenticated to Supabase — not once, including the
version that was live on Play.

Nothing said so, because every server-backed path here is deliberately written
to degrade quietly:

| | what happened | why nobody saw it |
|---|---|---|
| Prayer times | fell back to the bundled timetable | the bundled year *is* 2026, so the times were right |
| Notices | came back empty | indistinguishable from "no notices" |
| Forms | every submission failed | they check `r.ok`, so it read as a bad connection |
| Crash reports | never sent | `app_crashes` was empty, and that was read as "no crashes" |

From inside the app, a wrong key and a phone with no signal are the same thing.
That is right behaviour on a train and catastrophic as a permanent state, and it
is why the check cannot ask *does it work* — the app genuinely cannot tell. It
asks **do the app and the website hold the same key**, which needs no network
and no secrets. The website is the reference, because it is deployed
continuously and somebody would notice within the hour.

`scripts/check-keys.mjs` also refuses a secret key or a `service_role` JWT in
anything that ships, by shape so a newly-minted one is caught — and deliberately
*not* by the bare word `service_role`, because `index.html` and
`portal/config.js` both carry a comment saying never to put that key there,
which is the right thing for those files to say. A check that fires on the
warning against the mistake is a check people learn to ignore.

It runs first in `npm run check` and first in the release workflow.

## Two settings in app.json that are not cosmetic

`app.json` is JSON and cannot hold a comment, so the two that would cost a day
to re-derive are written down here.

**`newArchEnabled: true`.** `react-native-onesignal` 5.4.3 declares its event
listeners as codegen `EventEmitter` properties (`src/NativeOneSignal.ts`), and
those properties only exist under React Native's New Architecture. Build
without it and nothing complains: the module loads, its constructor calls
`setupListeners`, and the first line reaches for a property that was never
generated. The app dies on launch with `TypeError: undefined is not a
function` and shows a blank screen — no stack anyone would connect to a
notification library. Every workflow now checks `android/gradle.properties`
after prebuild rather than trusting that the flag survived.

**`targetSdkVersion: 36`**, under `expo-build-properties`. Play now requires
API 36 of every update and SDK 52 defaults to 34, so without this the bundle is
refused on upload — it refused version code 5 outright for targeting 35.
Targeting 36 brings two things that do not announce themselves:

* AGP 8.6 does not know API 36, so `android.suppressUnsupportedCompileSdk=36`
  is set by the `with-api-36` plugin or the build warns on every module
* Android 16 enables **predictive back** by default at this target.
  `android:enableOnBackInvokedCallback="false"` keeps it off, deliberately —
  React Navigation's own back handling is what the app relies on

Targeting 35 and above also means Android draws the app edge to edge whether it
asked to or not, which is why the smoke emulator runs a matching API — on 34
that change is invisible and a header hidden behind the status bar would pass
every run here.

`plugins/with-api-36.js` also **strips permissions the app never asked for**.
Two arrived from dependencies: `ACTIVITY_RECOGNITION`, which triggered Play's
Health declaration and read as the app wanting to track people's physical
activity, and `SYSTEM_ALERT_WINDOW` — "draw over other apps" — from a
development overlay. Both are removed with `tools:node="remove"` at the manifest
merge, and the release workflow fails if either reappears.

**The package id lives in `app.config.js`, not only `app.json`.** `app.json`
names the real package, `com.taiyabahmasjid.app` — the one the Play listing
owns. Setting `TAIYABAH_VARIANT=dev`, which the APK and smoke workflows do,
appends `.dev` and puts "(test)" in the app name so a build you are testing
installs beside the real app instead of replacing it. The release workflow
sets no variant, on purpose.
