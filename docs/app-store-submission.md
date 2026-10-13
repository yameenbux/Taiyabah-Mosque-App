# Everything still needed to submit Taiyabah Masjid to the App Store

Status at the time of writing. Items marked DONE are verified, not assumed.

---

## Already done

- **Build uploaded** — 2.0.2 build 2, Apple Distribution signed, verified to
  carry aps-environment production and both app groups. Build 1 is in
  TestFlight too but shipped without them; push is dead in it, so do not test
  notifications on build 1 and do not submit it.
- **Export compliance** — `ITSAppUsesNonExemptEncryption` is false in
  app.json, so App Store Connect will not ask on every upload and no build
  will sit blocked on "Missing Compliance".
- **App icon** — 1024x1024, RGB, no alpha channel. Comes from the build; iOS
  has no icon upload field. It fills in once a build processes.
- **Listing copy** — promotional text, description and keywords, written to
  what the app actually does and free of the characters App Store Connect
  rejects.
- **Privacy policy** — published and linked.

---

## Decisions only you can make

### 1. EU trader status — decide before submitting

Since 17 February 2025 the Digital Services Act requires every developer
distributing in the EU to declare trader status. An app without it is removed
from all 27 EU storefronts.

YSB Ventures Ltd is a trader, so the honest answer is yes. The consequence is
that a trader's **address, phone number and email are published on the App
Store listing**, visible to anyone. Use the registered company address rather
than a home address.

If you would rather not publish those details, the alternative is to deselect
the EU territories under Pricing and Availability. The congregation is in
Bolton, so the practical cost is low — but it also means a family visiting
relatives in Europe cannot download it there.

### 2. Content Rights

App Store Connect asks whether the app contains, shows or accesses third-party
content. It does: the Qur'an, its translation, and Sahih al-Bukhari.

The app is already careful here. Bukhari ships the **Arabic only**, and says so
in its own words — "The Arabic is 9th-century and free to reproduce. Every
complete English translation in circulation is still in copyright." The Qur'an
screen credits its translation on screen.

Answer yes, and confirm you have the rights. Before you do, satisfy yourself
that the specific English Qur'an translation bundled is one you are permitted
to distribute — a public-domain or openly licensed one is fine, a modern
copyrighted one is not.

### 3. Category

Apple has no Religion category. Masjid apps normally sit in:
- **Primary: Lifestyle** — where prayer time apps are usually found
- **Secondary: Reference** — reasonable given the Qur'an, hadith and athkar

---

## Mechanical, but each one blocks submission

- [ ] **Version number** — the record still says 1.0 in the screenshot I was
      sent. The build is 2.0.2 and a 2.0.2 build cannot be attached to a 1.0
      record. Change it while the page is still editable.
- [ ] **Attach the build** — pick 2.0.2 (2), NOT (1).
- [ ] **Screenshots** — iPhone 6.9" and iPad 13". Being generated; see below.
- [ ] **Age rating questionnaire** — answer honestly. Nothing in this app is
      objectionable, so it should land at 4+. Note that donation links open in
      Safari, which is a web view question the questionnaire asks about.
- [ ] **Pricing and Availability** — Free, and choose territories (see EU
      above).
- [ ] **App Privacy** — must show **Published**, not a draft. A draft blocks
      submission and does not warn you clearly.
- [ ] **App Review Information** — contact name, phone and email, so Apple can
      reach somebody. Sign-in is not required: nothing in the build is behind
      a login, so no demo account is needed. Review notes are drafted in
      app-store-listing.md and should be pasted in.
- [ ] **Copyright** — 2026 Taiyabah Masjid (Bolton Central Islamic Society).
- [ ] **Support URL** — must resolve and must offer a way to get help. Apple
      fetches it during review and a dead link is a rejection.

---

## Worth doing, not required

- **App Accessibility** — Apple's accessibility labels are optional. The app
  already supports adjustable text size and every control is nameable by a
  screen reader (the build gate checks this), so the answers are favourable
  and it is a quick win.
- **Subtitle** — 30 characters under the app name in search results. Something
  plain: "Prayer times for Bolton".

---

## Before you press Add for Review

**Look at the screenshots.** Nothing automated can tell a good screen from a
bad one. The first generated set passed every check and was twelve copies of
the home screen, because the deep links were not navigating; the checks now
fingerprint each image so that cannot pass silently again. Open them anyway.

**Install build 2 from TestFlight and confirm a notification arrives.** The
entitlements prove it is built correctly and OneSignal is configured, but
nothing has yet proven the whole chain end to end on a real phone. A masjid
app whose prayer alerts do not arrive has failed at the one job it exists for,
and that is better found now than in a review.
