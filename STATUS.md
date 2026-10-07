# Where this is up to

**Last updated: 4 October 2026.** Written to be picked up cold, by whoever
reads it next, without reading a chat log first.

---

## The app is live and working

The web app is deployed and green. Every check passes:

| | |
|---|---|
| end-to-end (`check-everything.mjs`) | 67 pass |
| back button (`check-back-button.mjs`) | 71 pass |
| splash clears (`check-splash-clears.mjs`) | 8 pass |
| release (`check-release.mjs`) | 38 pass |
| translations (`check-i18n.mjs`) | 2035 strings, 3 languages, complete |
| Qurʼanic / hadith / rabbanā duʿās | verified verbatim against source |

Service worker **v184**. Android app verified by Google's Digital Asset Links
API — three fingerprints, no errors, so no address bar.

Rated 4 October: front end 92%, back end 88%, community value 94%.

---

## The native app is now feature-complete

`native/` is a React Native rebuild in Expo. It exists because a Trusted Web
Activity cannot stop saying "Running in Chrome", cannot keep audio playing in
the background, and cannot give a screen the platform's own swipe-back. The
web app stays live and maintained; this replaces it when it is better, not
before.

Every screen the web app has, the native app now has:

| | |
|---|---|
| tabs | Home, Prayer times, Notices, More |
| reading | Qurʼan (muṣḥaf page images or by surah with translation), Ṣaḥīḥ al-Bukhārī, adhkār, duʿās, rabbanās |
| the masjid | about, membership, contact, qibla, live radio, videos, full-year timetable |
| services | nikāḥ, funeral, birth, will, hall hire, charity collections, imams' advice, education |
| madrasah | admissions and fees, curriculum, holiday planner, portal |
| giving | the new-build appeal, ṣadaqah and lillāh, zakat calculator |
| settings | language, text size, prayer reminders, privacy |

Three of those are real forms writing through the same Postgres functions the
website calls — `request_nikah_date`, `request_hall_booking`,
`request_imam_advice` — so the office gets one queue rather than two.

**How the content got there.** `native/scripts/extract-content.mjs` opens the
web app's `index.html` in a browser and lifts each sheet out of the DOM as a
block tree, keeping every `data-i18n` key beside its English.
`check-extract.mjs` then walks both and reports anything dropped: **619 of 619**
text fragments carried across. Because the keys came too, `build-i18n.mjs`
reuses `lang/src/*.json` unchanged — so Urdu, Gujarati and Arabic work on all
of it without a word being retyped. **459 of 459** keys the app asks for
resolve against a pack; 350 have Urdu today, and the 135 strings this app
introduced are listed in `native/src/i18n/TODO-translate.json` for whoever
reviews the packs.

**It has been run on Android.** A CI job boots a real emulator, installs the
APK and drives it over adb: it waits for the home screen to actually draw,
checks the app is the focused window, then taps all twelve tiles and all
nineteen menu rows, verifying after each tap that a new screen drew and that
nothing landed in the crash log. It passes, and every screen is photographed
and uploaded. See the "Native app — does it actually run?" workflow.

That run earned its keep immediately: it found that the app drew **nothing at
all** on Android. Two gates could hang for ever — `useFonts()` returns a loaded
flag and an error and only the flag was read, so one font failing to load left
a plum rectangle permanently; and the settings provider rendered a blank veil
until AsyncStorage answered, which a missing native module never does. Both now
have a ceiling.

**It has been run repeatedly, which mattered more than running it once.** Three
emulator boots on the same commit now pass with identical tallies: home screen
drew, 16/16 expected items, 11/11 tiles opened a screen, 5/5 menu groups, 19/19
menu rows present and 13 followed into a screen, three tabs working, nothing in
the crash log, 31 screenshots. Repeating it was worth it because the app was
never the thing at fault: three separate failures were the test crying wolf —
labels below the fold reported missing, the *emulator's own* launcher ANR'ing
and taking focus, and a single `mCurrentFocus` snapshot read from only the
first of several displays. Each is fixed in the harness. A passing run also
emits its tally as a workflow notice now, because a green tick records that a
run passed but not what it looked at, and the detailed log can only be read by
downloading the artifact.

**Checking it without a phone:** `node scripts/shots.mjs` photographs all 37
screens and reports any runtime error; `node scripts/check-parity.mjs` compares
the layout against the web app. See `native/README.md`.

**Still not for Play.** The build signs with Expo's debug keystore, so the APK
installs by hand but Play would reject it — which is the right shape while the
listing belongs to the web app. It installs *alongside* the Play app, different
package id, so the two can be compared side by side.

---

## Three things are waiting, none of them urgent

### 1. The Android splash icon — a build is ready and not uploaded

`taiyabah-1.0.3` is an artifact on the "Android app bundle" workflow run.
Version code 4, 2.9MB. **It expires 2 November 2026** — after that, re-run
the workflow rather than hunting for it.

It is the first build carrying the vector logo. Until it is uploaded, a new
installer sees the old soft icon on the screen Android draws before the web
app loads. Purely cosmetic; the app itself is current on every device.

Deliberately parked. Nothing depends on it.

### 2. Leaked password protection reads as disabled

Supabase's security advisor still reports it off, after it was believed to be
switched on. Worth opening the setting and confirming it saved.

### 3. 42 Stripe payments are unreconciled

Unchanged. Related and more awkward: subscription renewals fire
`invoice.paid`, which the webhook does not subscribe to, so recurring
donations are a standing blind spot rather than a bug a test will catch.

---

## What has never been tested, and cannot be from CI

Donations, push notifications and live prayer-time fetching all talk to
Stripe, OneSignal and Supabase. The test environment cannot reach any of
them, so **every green tick above is the web app in isolation.**

The one test worth doing on a real phone: install from Play, make a £1
donation, check it lands in Stripe carrying a reference.

---

## Apple: the enrolment is blocked, the app is not

**The iOS app compiles and installs. It does not yet run.** That is a
correction to what this file said a few hours ago, and the correction is the
useful part.

The job had been building `-configuration Debug`, which does not embed the
JavaScript — it expects a Metro dev server that no CI runner has. So the app
launched, stayed alive, wrote no crash report, and executed none of this
project's code, and five runs went green on it. The screenshots were 72%
black with a red error banner, and nothing was looking at them.

Building Release fixed that and immediately found a real defect: the app
crashes on launch, on both the iPhone and the iPad, with

    Invariant Violation: TurboModuleRegistry.getEnforcing(...):
      'OneSignal' could not be found.

OneSignal's native half is in the build — its Expo plugin writes the
AppDelegate hooks and the notification service extension — and the React
Native module JavaScript talks to is not registered, although the pod IS in
Podfile.lock and autolinking does resolve it. Every call site in src/push.js
is wrapped and the guard added since never fires, so the import raising it is
not this app's own. The next run prints the full stack, which names who asked.

**None of this touches Android**, which is green: all 33 screens, every tile
and menu row, and the tab bar icons drawing 4/4 on a real emulator.

What still needs the Apple account regardless: push, the widget and the Watch
app, which want a Team ID and an APNs key. `store/IOS-RELEASE.md` says what to
do with each the day it clears.

So what follows is about the account, and only the account.

The D-U-N-S record was corrected and D&B confirmed it on 2 October — the
street line had held the organisation's name and no street at all.

Apple caches D&B data for a week or two, so the enrolment form was still
refusing the number on 4 October. **That is expected, not a new problem** —
and the 4th was a Sunday, two days after a Friday confirmation, so not one
business day had passed. Apple's own figure is up to two business days for
D&B to hand the record over, and up to about a fortnight before an updated
number appears in their look-up.

**Retry from Wednesday 7 October**, and again midweek after. A refusal any
time up to roughly 16 October is the queue running, not a fault: do not open
a support case before then. A failed attempt costs nothing and is not held
against the account.

**Ask for the fee waiver during enrolment, not after.** The UK is eligible and
the society is a registered charity, so the £79 a year goes away — but only on
the organisation path, and only while the account has not signed the Paid
Applications Agreement or sold digital goods. Donations leaving to Stripe in a
browser are fine and are the normal nonprofit pattern; adding an in-app
purchase later would end the waiver.

**Do not enrol as an Individual.** It lets you through only because that path
never asks for a D-U-N-S. It would put a personal name on the listing as
seller, carry personal liability, cost £79 a year with no nonprofit waiver,
and need a support request to undo.

Full detail, including the exact field values Apple needs: `store/IOS-RELEASE.md`.

---

## Changing the app's URL — understood, deliberately not done

It would break more than it looks. The domain is in the APK (so it needs a
new build, and existing installs keep using the old one), in the Cloudflare
worker's CORS allowlist (so notifications fail opaquely), and in six more
places in the worker. Every push subscription would be invalidated, because
web push is bound to the origin — the whole notification audience would have
to opt in again. Everyone's language, text size and reading position would
reset, because browser storage is per-origin.

Worth doing eventually to get off a developer-owned subdomain. Not worth
doing casually, and the order matters.

---

## Picking the tests back up

```sh
python3 -m http.server 8111        # from the repo root, in another shell
node scripts/check-everything.mjs  # the whole app, end to end
```

The scripts import `playwright` by bare name, so they need a `node_modules`
beside them.

For the native app:

```sh
cd native
npm run content                    # rebuild data + language packs from the web app
node scripts/parse-check.mjs       # every screen through the project's Babel
node scripts/check-extract.mjs     # did any of the masjid's prose get dropped?
node scripts/check-i18n.mjs        # which strings are still English only
npx expo export --platform web --output-dir dist
node scripts/shots.mjs             # photograph all 36 screens
```
