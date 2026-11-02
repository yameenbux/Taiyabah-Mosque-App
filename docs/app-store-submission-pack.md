# Submission pack — Taiyabah Masjid 2.1.0, build 18

Everything to paste, in the order App Store Connect asks for it. Nothing here
needs writing: copy the blocks as they are.

**Do not submit build 17.** It was built from a checkout four weeks stale and
contains none of the Hajj & ʿUmrah section. Build 18, from `main`, is the one.

---

# 1. Resolution Center — answer the rejection first

**App Store Connect → your app → App Review → Resolution Center.** Reply in
Apple's thread, attach the screen recording, and paste the block in section 7
below. Do this before resubmitting; it is what un-blocks the review.

---

# 2. Version page

| Field | Value |
| --- | --- |
| Version | `2.1.0` |
| Build | **18** |
| Subtitle | `Prayer times for Bolton` |
| Copyright | `2026 Taiyabah Masjid (Bolton Central Islamic Society)` |
| Support URL | `https://taiyabahapp.ysbdesigns.uk/` |
| Privacy Policy URL | `https://taiyabahapp.ysbdesigns.uk/privacy.html` |
| Marketing URL | leave blank |

All three URLs were checked and return 200.

---

# 3. Promotional Text  *(max 170)*

```
Prayer times taken straight from the masjid's own timetable, with jamaat notifications, Qibla, the Qur'an, live audio and a zakat calculator.
```

---

# 4. Keywords  *(max 100, no spaces after commas)*

```
masjid,mosque,prayer times,namaz,salah,qibla,quran,adhan,bolton,muslim,jamaat,zakat,hajj,umrah
```

94 of 100. `islamic` was dropped to make room for `hajj` and `umrah`, which the
app now has a whole section for. Apple combines keywords, and `muslim`,
`masjid` and `quran` already cover that ground.

---

# 5. Description  *(max 4000 — this is 3,811)*

```
The official app of Taiyabah Masjid, Bolton — built for the congregation, and for anyone who needs the masjid's times while they are out.

PRAYER TIMES FROM THE MASJID ITSELF
Beginning and jamaat times come straight from Taiyabah Masjid's own official Salah timetable — the same one printed and put up each year. They are not calculated estimates, so the time on your phone is the time the jamaat actually stands. See today at a glance, or open the full monthly timetable for any date in the year.

NOTIFICATIONS YOU CHOOSE
A quiet reminder before each congregation, with the number of minutes' warning set by you, so you leave in time rather than arrive during it. You can also turn on:
• Janazah (funeral prayer) announcements
• Timetable changes, Ramadan and Eid
• Events, bayaans, classes and community gatherings
• Surah al-Kahf on a Friday morning
Each is a separate switch. You get what you asked for and nothing else, and you can change your mind at any time.

QIBLA
Find the direction of prayer from wherever you are standing. Your location is used on the phone itself to work out the direction, and is never stored or sent anywhere.

THE HOLY QUR'AN
The complete mushaf in the familiar 13-line layout, with pinch to zoom for closer reading. Jump to any of the 114 surahs, mark the page you stopped at, and keep the ones you return to in a list of their own.

HADITH
Sahih al-Bukhari, arranged by book, to read a few at a time.

DUAS AND DAILY ATHKAR
The athkar for morning and evening, after every salah, and before sleep — alongside everyday duas and the 40 Rabbana of the Qur'an.

LISTEN LIVE
Hear the masjid live when you cannot be there in person, and watch recorded bayaans and talks.

ZAKAT CALCULATOR
A plain-English guide to who pays zakat and when. The nisab in both gold and silver, worked out from today's prices, with a note on why the Hanafi school uses the silver one. Then a step-by-step calculator covering cash, gold, silver, business stock and money owed to you.

MADRASAH
The madrasah has taught the community's children since 1967. Admissions, fees, class times, and what is asked of students and parents — with a holiday planner showing every day the madrasah is closed this year, set against the Islamic dates.

SERVICES
• Nikah, in keeping with authentic Islamic tradition
• Funeral services, and support for families through every part of an Islamic funeral
• Hall and room hire at the Taiyabah Centre, with halls and kitchens for community and family events
• The imams' advice on questions families bring to the masjid
• Charity collections
• Donate securely — Sadaqah, Lillah, and the masjid's own appeals

HAJJ AND UMRAH
Guidance for pilgrims from this congregation, written and approved by the masjid. Choose which journey you are making and you are shown only what applies to it: what to pack, coping with the heat and the crowds, the paperwork to arrange before you book, what may and may not be worn in ihram, the rites in the order they are done, the duas, and what to do on coming home. Tally counters for tawaf and sai keep your count when the phone has no signal and remember it if the battery dies.

NOTICES
Announcements from the masjid, so a change to the timetable, or something happening this weekend, reaches you without a phone call.

IT WORKS WHEN THE SIGNAL DOES NOT
Prayer times, the Qur'an, the adhkar and the Qibla all keep working with no connection — which matters in a prayer hall, in a basement, and abroad.

MADE TO BE READ BY EVERYONE
• English, Urdu, Arabic and Gujarati, with full right-to-left layout
• Text size you can set, so the times are legible without reaching for glasses
• A light theme and a dark one, the dark easier on the eyes at Fajr and Isha

Taiyabah Masjid is run by Bolton Central Islamic Society, registered charity 1041569.
```

---

# 6. General App Information

| Field | Answer |
| --- | --- |
| Primary category | **Lifestyle** |
| Secondary category | **Reference** |
| Content Rights | **Yes** — contains third-party content, and you hold the rights |
| Age Rating | answer honestly; lands at **4+** |

**On Content Rights, you can tick this honestly. Verified:**

- The Qurʼan translation is **Abdullah Yusuf Ali**, who died in 1953. UK
  copyright expired in 2023, so it is public domain where it is published.
- **Ṣaḥīḥ al-Bukhārī** ships **Arabic only**, from an edition released under
  The Unlicense. English links out to sunnah.com rather than being bundled.
- The **Hajj & ʿUmrah** material is the masjid's own throughout.

**On the Age Rating questionnaire:** the one to read carefully is the web
content question — donation links open Stripe's hosted pages in Safari.

---

# 7. App Review Information

| Field | Value |
| --- | --- |
| Sign-in required | **No** — nothing is behind a login |
| Contact email | `support@ysbdesigns.uk` |
| Contact name / phone | yours |

**Notes** — paste this, the same text as the Resolution Center reply. Apple
asked for it in both places, explicitly "for reference on future submissions".

---

> Paste this into **Reply to App Review**, and the same text into
> **App Review Information → Notes**. Attach the screen recording for item 1.

---

**1. Screen recording**

Attached. Recorded on a physical iPhone running the latest iOS, from this
build in TestFlight, beginning with a cold launch from the home screen and
following the typical user flow through every section.

The app has no account registration, no login and no account deletion,
because it has no accounts at all. It carries no user-generated content, so
there is nothing to report or block. There is no paid content and no in-app
purchase; the donation links open Stripe's hosted pages in Safari and are
charitable giving to a registered charity, not purchases of digital content.
Those three sub-points of your item 1 therefore have nothing to show, rather
than being omitted.

**2. The app's purpose and target audience**

Taiyabah Masjid is the official app of Taiyabah Masjid in Bolton, United
Kingdom, operated by Bolton Central Islamic Society, a charity registered in
England and Wales, number 1041569, at 31a Draycott Street, Bolton BL1 8HD.

It is a free app for the mosque's congregation and for the wider public. It
carries no advertising, sells nothing, collects no analytics and requires no
account.

The problem it solves is specific. A person who wants to know when a
congregational prayer starts at this mosque previously had four places to
look — a printed card on the wall, a third-party prayer-times app, a message
forwarded in a group chat, or telephoning the office — and no way to tell
which was the mosque's own decision. Third-party apps calculate prayer times
astronomically; they cannot know what time this mosque has actually chosen to
hold the congregation. The app publishes the mosque's own timetable, together
with its notices, services and facilities, from one authoritative source, and
works with no network connection.

Its audience is the mosque's congregation, who read English, Urdu, Gujarati
and Arabic. All four languages are in the app and the reader chooses.

**3. Setting up and accessing the app's main features**

There is nothing to set up. The app has no accounts, no sign-in, no
registration and no paywall, so no demo credentials are required. Every
feature is reachable from a cold first launch with no configuration.

From the four tabs and the More menu:

- **Home / Prayer Times** — the mosque's published timetable for today and for
  the year, including the Friday prayer.
- **Notices** — announcements published by the mosque.
- **Recite** — the Qur'an, daily adhkār, and the Arabic text of
  Ṣaḥīḥ al-Bukhārī.
- **Qibla** — a compass showing the direction of prayer.
- **Zakat calculator** — works out the threshold using live gold and silver
  prices.
- **Live** — the mosque's own audio broadcast of its services.
- **Services** — information and request forms for hall hire, marriage, the
  imams' advice service and charity collection. A form submits a request to
  the mosque office; it does not create an account.
- **Madrasah** — term dates, admissions information and a holiday planner.
- **Hajj & ʿUmrah** — guidance for pilgrims from this congregation. The reader
  picks which journey they are making and is then shown only what applies to
  it: what to pack, coping with the heat, the paperwork to arrange before
  booking, the state of iḥrām, the rites in order, the duʿās, tally counters
  for ṭawāf and saʿī, and what to do on returning. It is reading material and
  two offline counters. Nothing in it is sold, nothing is submitted and no
  account is involved.

Two optional system permissions are requested in context, and the app is fully
usable if both are refused:

- **Notifications**, only if the user turns on prayer reminders.
- **Location, when in use**, only on the Qibla screen, to compute the bearing
  to Makkah. The coordinates are used on the device for that calculation and
  are neither stored nor transmitted.

**4. External services, tools and platforms**

| Service | What it does |
| --- | --- |
| Supabase (Postgres) | The mosque's own database. Holds the prayer timetable, notices and service requests submitted from the app. |
| OneSignal | Delivers push notifications for prayer reminders and mosque announcements. |
| Stripe | Hosted payment pages, opened in the system browser. Used for charitable donations to the registered charity, hall-hire deposits and marriage service fees. |
| Cloudflare Workers | A small endpoint operated for the mosque that relays form submissions. |
| YouTube | Hosts the mosque's recorded talks, which the app links to. |
| radioca.st | Streaming host for the mosque's live audio broadcast. |
| api.gold-api.com, data-asg.goldprice.org | Live gold and silver prices for the Zakat threshold. |
| frankfurter.dev, open.er-api.com | Currency conversion for the same calculator. |
| Apple Maps | Opens directions to the mosque. |
| Saudi Ministry of Foreign Affairs (ksavisa.sa) | Linked, not integrated. The Hajj & ʿUmrah section points a reader at the Kingdom's own visa service rather than restating its terms. |
| Apple App Store / Google Play listings for Nusuk | Linked, not integrated. Nusuk is the Saudi ministry's own pilgrimage app; the section tells a pilgrim to install it and links to the listing for their platform. |

Those last two are outbound links opened in the system browser. The app
integrates with neither service, sends them nothing, and reads nothing back.

There is **no in-app purchase** in the app and nothing digital is sold. The
Stripe pages cover charitable donations and real-world services delivered at
the mosque premises — a physical hall booking, a marriage service — which are
not digital content.

The app uses **no analytics, no advertising, no tracking and no AI services**.

**5. Regional differences**

There are none. The app behaves identically in every region and every store
front. Nothing is unlocked, hidden or substituted by country.

The interface is available in English, Urdu, Gujarati and Arabic, chosen by
the reader in Settings rather than by their region. The prayer timetable is
this one mosque's published timetable in Bolton and does not vary with the
user's location. The only place the device's location is used at all is the
Qibla compass, as described above.

**6. Regulated industry and third-party material**

The app does not operate in a regulated industry. It is published by a
registered charity for its own congregation and provides no regulated service.

On rights to the material it carries:

- **The prayer timetable, notices, madrasah information, service details and
  the live broadcast** are the mosque's own, published by the mosque that
  operates the app.
- **The Qur'an** — the Arabic text, together with the English translation of
  Abdullah Yusuf Ali, who died in 1953. That translation is out of copyright in
  the United Kingdom, where it is published.
- **Ṣaḥīḥ al-Bukhārī** — the app bundles the Arabic text only, from a public
  domain edition released under The Unlicense. For English it links out to
  sunnah.com rather than reproducing any modern translation, so no third
  party's translation is included in the app.
- **The Hajj & ʿUmrah guidance** is the mosque's own. The rulings in it were
  settled by this mosque's scholars and the text was written by the mosque;
  every entry is published on the charity's authority and carries no other
  attribution because there is no other author. No third party's text is
  reproduced in it.
- **The photographs and diagrams** throughout are the mosque's own or are
  licensed for this use. The mosque's own name, logo and wordmark are its
  property.

The app is not in a regulated industry and provides no regulated service. It
gives no medical, legal or financial advice: where a pilgrim needs an official
rule — a visa condition, a vaccination requirement — the app says plainly that
those are set by the Saudi authorities and the UK health service, declines to
restate them as current fact, and links the reader to the official source
instead.

We are glad to supply anything further the review team would find useful.

---

---

# 8. Pricing and Availability

**Free.** Then the territories decision:

YSB Ventures Ltd is a trader, so the honest answer to **EU trader status** is
yes. The consequence is that a trader's **address, phone number and email are
published on the public App Store listing**. Use the **registered company
address** — never a home address.

If you would rather not publish those, deselect the 27 EU storefronts. The
congregation is in Bolton, so the practical cost is a family on holiday in
Europe being unable to download it.

---

# 9. The two that block submission silently

- **App Privacy** must read **Published**, not Draft. A draft blocks the
  submit button without saying clearly why. `store/DATA-SAFETY.md` has the
  declarations.
- **Screenshots** must show the app in use — not the splash, title art or a
  login page. That is guideline 2.3.3 and it is in the same letter as the
  rejection. Open the ones already uploaded and look at them. Add one of the
  Hajj chooser; it is the newest screen and a reviewer has never seen it.

---

# 10. Submit

**Version Release** → Manually release, unless you want it live the moment it
passes. Then **Add for Review → Submit**.

---

# Before you press it

**Install build 18 from TestFlight and confirm a notification arrives.** The
entitlements prove it is built correctly and OneSignal is configured, but
nothing has yet proven the whole chain end to end on a real phone. A masjid
app whose prayer alerts do not arrive has failed at the one job it exists for.

**Open the screenshots.** Nothing automated can tell a good screen from a bad
one — an earlier generated set passed every check and was twelve copies of the
home screen.
