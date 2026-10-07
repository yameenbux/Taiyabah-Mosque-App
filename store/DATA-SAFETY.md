# Data safety — the answers, derived from the code

Play rejects a release whose declared data use does not match what the bundle
requests, and the TWA this replaces asked for neither location nor
notifications. So the form **must** be updated before the native build is
promoted. `ANDROID-RELEASE.md` says that; this file says what to put in it.

Every answer below was read out of the source rather than remembered. Where it
matters, the file and line are named so the next person can check rather than
trust.

---

## The short version

| Play category | Collected? | Shared? | Why |
|---|---|---|---|
| Location (approximate and precise) | **No** | No | Read for the Qibla bearing and never put in a request |
| Name | Yes | No | Only when somebody sends a form |
| Email address | Yes | No | Same |
| Phone number | Yes | No | Same |
| Address | Yes | No | Hall hire and charity collections |
| Crash logs | Yes | No | The masjid's own database, not a third-party service |
| Device or other IDs | Yes | **Yes** | OneSignal needs one to deliver a notification |

Nothing is used for advertising, nothing is sold, and nothing is used to track
people across other companies' apps.

---

## Location — accessed, not collected

This is the answer most likely to be got wrong, because the permission is in
the manifest and the instinct is to tick the box.

`ACCESS_COARSE_LOCATION` and `ACCESS_FINE_LOCATION` exist for one screen. The
Qibla compass asks the phone where it is, works out the bearing to Makkah, and
puts the result on screen. The coordinates go into React state
(`src/screens/Qibla.jsx`, `setFrom({ lat, lon })`) and nowhere else — they are
never a request body, never written to storage, never sent to the masjid.

**Answer "No" to collected and "No" to shared.** Play's question is about data
leaving the device, not about the permission. The in-app disclosure is already
written and shows before the prompt:

> Taiyabah Masjid uses your location only to work out the Qibla direction from
> where you are. It is never stored and never sent anywhere.

The iOS App Privacy label takes the same answer, with the same wording already
in `NSLocationWhenInUseUsageDescription`.

---

## Personal details — only when somebody fills a form in

Collected **only** on submission, never in the background, and never from
somebody who just reads prayer times. Seven forms, all of them going to the
masjid's own Supabase through a function that takes the lock and enforces the
rules:

`request_hall_booking`, `request_nikah_date`, `request_charity_collection`,
`request_imam_advice`, `submit_admission_application`, `register_for_course`,
`register_foodbank_volunteer`.

- **Name, email, phone** — all seven.
- **Address and postcode** — hall hire and charity collections.
- **A trustee's name, phone and email** — charity collections, because the
  masjid rings a second person to check the collection is genuine.

Tick **"Collected"**, leave **"Shared"** unticked, and choose **"App
functionality"** as the purpose. Data collection is **optional** — the app is
fully usable without ever sending a form.

Say **yes** to "users can request that their data is deleted": `delete-data.html`
is published and is the route.

---

## Crash logs — the masjid's own database

`src/crash.js` sends the error, the screen it happened on, the platform, the
OS version and the device model to `report_app_crash()` in the masjid's
Supabase. **Not** Crashlytics, Sentry or anything else — which was a deliberate
choice, because a third-party crash service would have put a new data
processor into a privacy notice that names only Stripe and the masjid.

Tick **Crash logs** under App activity. Collected, not shared, App functionality.
Device model and OS version are not a device IDENTIFIER — they do not single
anybody out — so they do not belong under "Device or other IDs".

---

## Device IDs — the one genuine third-party share

OneSignal assigns a subscription ID so a notification can be delivered to one
phone rather than all of them (`src/push.js`). That identifier is held by
OneSignal, which makes it the only thing in this app that is **shared**.

Tick **Device or other IDs**: collected **and** shared, purpose **App
functionality**. Do not tick Advertising or Analytics — OneSignal is used to
deliver jamāʿah reminders and masjid announcements and nothing else.

---

## Encryption and deletion

- **In transit:** yes, everything is HTTPS.
- **Deletion:** yes, via `delete-data.html`.
- **Independent security review:** no. Do not tick it.

---

## Before promoting

1. Update this form. Play rejects on mismatch, and the mismatch here is real —
   the TWA asked for neither location nor notifications.
2. Closed testing, then production at 10%. A staged rollout can be halted; a
   full one cannot be taken back.
3. The iOS App Privacy label in App Store Connect asks the same questions in a
   different order. The answers above are the answers there too.
