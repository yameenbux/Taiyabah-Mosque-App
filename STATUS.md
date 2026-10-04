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

## Apple: blocked, and nothing to do yet

The D-U-N-S record was corrected and D&B confirmed it on 2 October — the
street line had held the organisation's name and no street at all.

Apple caches D&B data for a week or two, so the enrolment form was still
refusing the number on 4 October. **That is expected, not a new problem.**

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
