# Getting the app onto the Apple App Store

Android first, iOS second — see `ANDROID-RELEASE.md` for that half. This file
is the iOS half, and it starts with a wait nobody can shorten.

**Status: the D-U-N-S is cleared.** Enrolment can proceed.

---

## The D-U-N-S record, as D&B confirmed it

Cleared on **2 October 2026**, six days after the correction was raised —
inside D&B's own 7–14 business day estimate rather than at the end of it.

**Enter these into Apple exactly as written.** D&B's own instruction, and the
reason the first attempt failed: Apple matches the string, not the meaning.

| Field | Value |
|---|---|
| DUNS | `222426253` |
| Company Name | `BOLTON CENTRAL ISLAMIC SOCIETY` |
| Trade Style | *(leave blank)* |
| Street Address | `31A DRAYCOTT STREET` |
| City | `BOLTON` |
| State | *(leave blank)* |
| Zip | `BL1 8HD` |
| Legal Structure | Charity |
| Country | United Kingdom |

Three of those are easy to get wrong by being helpful:

- **`31A`, not `31a`.** The record holds a capital A.
- **State is blank.** The United Kingdom has no state. Typing "England" or
  "Greater Manchester", as the old malformed record did, is a mismatch.
- **Trade Style is blank.** "Taiyabah Masjid" is a trading name, and Apple
  rejects those outright — it wants the legal entity.

**Legal Structure: Charity** is what makes the Nonprofit entity type and the
fee waiver available. It is the field that was missing before.

If Apple still refuses the number, it is caching the old data rather than
rejecting the new. Wait and retry before escalating; D&B's note points at
https://developer.apple.com/contact for alternate registration if it persists.

## The history, and the reference numbers

Apple will not enrol an organisation it cannot verify, and it verifies through
Dun & Bradstreet rather than Companies House or the Charity Commission.

| | |
|---|---|
| D-U-N-S number | **222426253** |
| D&B correction case | **34879551** — raised 26 Sept, confirmed 2 Oct 2026 |
| Apple's error at the time | *"This organization could not be verified as a legal entity."* |

**What was wrong with the record.** The Street line held the organisation's
name — `BOLTON CENTRAL ISLAMIC SOCIETY` — and no street was recorded at all.
The city and postcode were right. Apple checks identity, legal entity status
**and address**, so a record with no usable address fails, and the failure
message says nothing about which of the three it was.

The correction supplies `31a Draycott Street`, cites charity number 1041569,
attaches the Charity Commission register entry, and asks D&B to confirm the
record is an active legal entity and to say whether any duplicate D-U-N-S
numbers exist for the charity. A duplicate, if one exists, would be the
fastest way through.

**If D&B telephone to verify**, they will ring the masjid office on
01204 535 997 and ask for Mubarak Patel or Muhammed Chippa, both of whom were
told to expect it. An unexpected call from a credit agency asking a charity to
confirm its own details sounds exactly like a fraud attempt, and the natural
response is to hang up — which fails the verification silently and restarts
the clock.

**After D&B accept the change, Apple may not see it immediately.** Apple
caches D&B data. Allow another week or two before the enrolment form will
take the number. Total, realistically: three to five weeks from 26 September.

---

## The four things Apple requires

1. **D-U-N-S number.** Required for every organisation except government
   entities. Nonprofits are not exempt.
2. **Legal binding authority.** Whoever enrols becomes the Account Holder and
   signs agreements on the charity's behalf. Apple's wording: owner/founder,
   executive team member, senior project lead, or an employee with legal
   authority granted by a senior employee. This is a trustee decision, not a
   technical one, and Apple does check.
3. **Legal entity name.** `Bolton Central Islamic Society` — which becomes the
   **seller name** shown under every listing. Apple explicitly refuses trading
   names, so "Taiyabah Masjid" cannot be the seller. It can still be the app's
   name, exactly as on Google Play.
4. **A public website on the charity's own domain.** Apple: the domain "must
   be associated with your organization", and sites with minimal content are
   refused. `taiyabahmasjid.com` qualifies. `taiyabahwebsite.ysbdesigns.uk` is
   a subdomain of the developer's domain, not the charity's, and should be
   expected to draw a question.

---

## The fee waiver — worth having, and we qualify

Enrol as **Nonprofit**, not Organization. Apple waives the £79 a year for a
charity, permanently.

The condition that could have caught us:

> Not otherwise sell digital goods or services through any of your apps.

The app sells nothing digital. Donations are gifts to a charity; hall deposits
and nikāḥ fees buy a real room and a real service; every payment happens on
Stripe's own pages outside the app; there are no in-app purchases. The same
reasoning is why Google Play's billing rules do not apply either.

**The catch:** the waiver needs the nonprofit status verified, which adds time
on top of ordinary enrolment. The Charity Commission entry for 1041569 is the
evidence, so it should be clean — just not instant.

---

## Until then, iPhone users are not shut out

Safari → Share → **Add to Home Screen** installs the same app: full screen, own
icon, offline, all four languages. Notifications work from iOS 16.4, but only
once it is on the home screen — not from a Safari tab.

What is missing compared with a store install: no App Store listing, no
Spotlight, no splash screen, no app shortcuts.

---

## The app itself is built — that part is no longer waiting

This section used to say an iOS wrapper still had to be written, and to budget
properly for it. That is out of date. The iOS app is the same React Native app
as Android, not a `WKWebView` shell, and it compiles.

**What has actually been proved**, on every push, by the `ios` job:

- it builds on a macOS runner (Expo SDK 52, React Native 0.76.9);
- it installs and launches on an **iPhone 16 Pro** and an **iPad Pro 13-inch**
  simulator, and is still running fourteen seconds later with no crash report;
- a screenshot is taken of each and checked for having actually drawn — see
  `native/scripts/ios-shots.mjs`.

**None of that needs an Apple account.** A simulator runs unsigned builds, so
`CODE_SIGNING_ALLOWED=NO` is enough and no certificate or provisioning profile
is involved. That is the whole reason this could be done while enrolment is
pending.

**What a simulator cannot prove**, and what therefore remains genuinely
untested until there is an account and a device: push notifications, the
widget and the Watch app, anything touching the keychain or App Groups across
processes, and real performance on real hardware.

### Already configured, waiting only to be signed

`native/app.json` carries the iOS side: `supportsTablet`, the `aps-environment`
entitlement, the `group.com.taiyabahmasjid.app` App Group, the
`remote-notification` background mode, the location and motion usage strings
(both written to say the coordinates never leave the phone, which is true —
the Qibla screen keeps them in React state and never puts them in a request),
and `ITSAppUsesNonExemptEncryption: false` so the export-compliance question
does not stop every upload.

The iPad is done rather than tolerated: the layout holds the website's own
520-point column and centres it, instead of stretching a phone screen across a
tablet.

### The two things blocked on the account, and exactly why

**The widget and the Watch complications.** The WidgetKit code is written —
`native/targets/widget/index.swift`, one timeline entry per prayer, London
clock stated explicitly, sunrise excluded because it is not a prayer, and the
accessory families a Watch face needs. It is **not wired into the build**:
`@bacons/apple-targets` is installed but deliberately left out of the plugins
list, because it requires `ios.appleTeamId`, and a Team ID is issued only with
a Developer account. Adding it with a placeholder would break the build that
currently passes, for no gain.

There is a second, smaller obstacle behind that one: an Xcode 16
`PBXFileSystemSynchronizedRootGroup` needs project `objectVersion` 70 or
higher, and Expo SDK 52 generates 46. Worth knowing before the first attempt,
so the error is recognised rather than debugged from scratch.

**Push notifications on iOS.** The app already carries OneSignal and the
entitlement. What is missing is an **APNs authentication key** (a `.p8` from
the Developer account), uploaded to OneSignal. Until that exists, an iOS build
can ask for notification permission and will never receive one. Android is
unaffected and already works.

## When the D-U-N-S clears

1. Re-run Apple's D-U-N-S lookup. It has to pass before anything else.
2. Enrol as Nonprofit, with a trustee as Account Holder.
3. Take the **Team ID** from the account and put it in `native/app.json` as
   `ios.appleTeamId`, then add `@bacons/apple-targets` to the plugins list.
   That is what turns the widget and the Watch target on.
4. Create an **APNs key** and upload it to OneSignal, then test a notification
   to a real iPhone. Do not take Android's green as evidence for iOS.
5. App Store Connect listing. The text in `PLAY-LISTING.md` transfers; the
   screenshots do not — Apple wants its own sizes, and these can be taken from
   the simulators the `ios` job already boots.
6. Submit. Review is typically 1–3 days.
