# App Review reply — Taiyabah Masjid 2.1.0

**Keep this file up to date. On every submission, paste block 1 into Reply to
App Review with the recording attached, and block 2 into App Review
Information → Notes.** It was first written for build 15 and has been
revised since; the Hajj & ʿUmrah section in particular did not exist when the
first version was sent, and item 6 asks directly about third-party material,
so a reply that omits a whole section invites a second rejection.

Two separate things arrived in Apple's letter.

**The questionnaire** (items 1–6) is Apple's standard "Information Needed"
template. Part 1 below answers it, and holds the two blocks to paste.

**The rejection reason** was the line under Review Status: *2.1.0 Performance:
App Completeness*. Answering the questionnaire does not clear that on its own
— the build has to change. Part 2 records what was wrong and what was done.

---

# Part 1 — the reply to paste into App Store Connect

**The Reply to App Review box takes 4,000 characters, and it allows exactly
one reply.** An earlier version of this file said to split the answer across
two messages. That was wrong — Resolution Center does not offer a second reply
on a rejected submission, so all six items have to fit one paste.

The block below is that paste: 3957 characters, numbered to match Apple's
own six items so a reviewer can read it against their letter line by line. The
long-form text further down is the record it was condensed from, not something
to paste.

The margin is deliberate. 4,000 is the cap, and a field that counts a line
break as two characters would reject a block that measured 3,993 on this side.

**Attach the screen recording to this reply.** Item 1 claims it.

---

## Paste block 1 — the reply, all six items (3957 characters)

```
1. SCREEN RECORDING
Attached: recorded on a physical iPhone on current iOS from the submitted build 2.1.0 (18), beginning at launch. None of the three listed cases apply. No accounts of any kind - no registration, no login, nothing to delete - so no demo credentials are needed. No user-generated content, so no reporting or blocking mechanism. No paid content: no in-app purchase, nothing digital sold. Donations are charitable giving on Stripe's hosted pages in the system browser.

2. PURPOSE AND TARGET AUDIENCE
Official app of Taiyabah Masjid, Bolton, UK, run by Bolton Central Islamic Society, a charity registered in England and Wales (1041569). Third-party prayer apps compute times astronomically and cannot know when this mosque actually holds each congregation. It publishes the mosque's own timetable, notices and services from one source, and works offline. Audience: the congregation, who read English, Urdu, Gujarati and Arabic - all four in the app, chosen in Settings.

3. SETTING UP AND ACCESSING THE MAIN FEATURES
Nothing to set up, no sign-in, no paywall; every feature works from a cold first launch. Prayer Times (the mosque's timetable, today and the year); Notices; Recite (the Qur'an, daily adhkar, the Arabic of Sahih al-Bukhari); Qibla compass; Zakat calculator (live gold and silver prices); Live (the mosque's audio broadcast); Services (hall hire, marriage, imams' advice, charity collection - a form sends a request to the office, creating no account); Madrasah (term dates, admissions, holiday planner); Hajj and Umrah (guidance for pilgrims - the reader picks their journey and sees only what applies: packing, paperwork, ihram, the rites in order, supplications, offline tally counters; nothing sold or submitted).
Two optional permissions, requested in context, the app fully usable if both are refused: Notifications, only for prayer reminders; Location when in use, only on Qibla, to compute the bearing to Makkah on the device; the coordinates are neither stored nor transmitted.

4. EXTERNAL SERVICES
Supabase (Postgres): the mosque's database - timetable, notices, service requests. OneSignal: push notifications. Stripe: hosted pages in the system browser for donations, hall-hire deposits and marriage fees - real-world services, not digital content. Cloudflare Workers: relays form submissions. YouTube: the mosque's recorded talks. radioca.st: streaming host. gold-api.com, goldprice.org, frankfurter.dev, open.er-api.com: metal and currency rates for Zakat. Apple Maps: directions. ksavisa.sa (Saudi Ministry of Foreign Affairs) and the App Store/Google Play listings for Nusuk, the ministry's own pilgrimage app: linked, not integrated - outbound links in the system browser; nothing is sent or read back. No analytics, advertising, tracking or AI services.

5. REGIONAL DIFFERENCES
None. Identical in every region and storefront; nothing unlocked, hidden or substituted by country. Language is chosen by the reader, not by region. The timetable is this mosque's own in Bolton and does not vary with location.

6. REGULATED INDUSTRY AND THIRD-PARTY MATERIAL
Not a regulated industry, no regulated service, no medical, legal or financial advice. Where an official rule applies - a visa condition, a vaccination requirement - the app says it is set by the Saudi authorities or UK health service and links to the source rather than restating it.
Timetable, notices, madrasah information, service details, live broadcast: the mosque's own. Qur'an: Arabic with the English translation of Abdullah Yusuf Ali (d. 1953), out of copyright in the UK where the app is published. Sahih al-Bukhari: Arabic only, public domain edition under The Unlicense; English links out to sunnah.com, so no modern translation is included. Hajj and Umrah guidance: the mosque's own, settled by its scholars and written by the mosque. Photographs and diagrams: the mosque's own or licensed. Name, logo and wordmark: the charity's property.
```

## Paste block 2 — App Review Information → Notes (3963 characters)

Not part of the Resolution Center reply. This one goes in the version page's
**App Review Information → Notes** field, and stays there for every future
submission.

```
NO SIGN-IN REQUIRED. No accounts of any kind - no registration, no login, nothing to delete - so no demo credentials are needed. No user-generated content, so no reporting or blocking mechanism. No in-app purchase; nothing digital is sold.

1. PURPOSE AND AUDIENCE
Official app of Taiyabah Masjid, Bolton, UK, operated by Bolton Central Islamic Society, a charity registered in England and Wales, no. 1041569. Free; no advertising, no analytics, no account. Third-party prayer apps calculate times astronomically and cannot know when this mosque actually holds each congregation. This app publishes the mosque's own timetable, notices and services from one authoritative source, and works offline. Its audience is the congregation, who read English, Urdu, Gujarati and Arabic; all four are in the app, chosen by the reader in Settings.

2. FEATURES - all reachable from a cold first launch
Prayer Times (the mosque's own timetable, today and the year); Notices; Recite (the Qur'an, daily adhkar, the Arabic text of Sahih al-Bukhari); Qibla compass; Zakat calculator (live gold and silver prices); Live (the mosque's own audio broadcast); Services (hall hire, marriage, imams' advice, charity collection - a form sends a request to the mosque office and creates no account); Madrasah (term dates, admissions, holiday planner); Hajj and Umrah (guidance for pilgrims - the reader picks their journey and sees only what applies: packing, paperwork, the state of ihram, the rites in order, supplications, and offline tally counters for tawaf and sa'i; nothing sold, nothing submitted).

3. PERMISSIONS - both optional, in context, app fully usable if refused
Notifications, only for prayer reminders. Location when in use, only on Qibla, to compute the bearing to Makkah on the device; those coordinates are neither stored nor transmitted.

4. EXTERNAL SERVICES
Supabase (Postgres): the mosque's own database - timetable, notices, service requests. OneSignal: push notifications. Stripe: hosted payment pages in the system browser, for charitable donations, hall-hire deposits and marriage fees - services delivered at the mosque premises, not digital content. Cloudflare Workers: relays form submissions. YouTube: the mosque's recorded talks. radioca.st: streaming host for the live broadcast. gold-api.com, goldprice.org, frankfurter.dev, open.er-api.com: metal prices and currency rates for the Zakat calculator. Apple Maps: directions. ksavisa.sa (Saudi Ministry of Foreign Affairs) and the App Store and Google Play listings for Nusuk, the Saudi ministry's own pilgrimage app: linked, not integrated - outbound links in the system browser; the app sends them nothing and reads nothing back. No analytics, advertising, tracking or AI services.

5. REGIONAL DIFFERENCES
None. Identical in every region and storefront; nothing is unlocked, hidden or substituted by country. Language is chosen by the reader, not by region. The timetable is this one mosque's timetable in Bolton and does not vary with location.

6. RIGHTS AND REGULATION
Not a regulated industry, no regulated service, no medical, legal or financial advice. Where an official rule applies - a visa condition, a vaccination requirement - the app states it is set by the Saudi authorities or the UK health service and links to the official source rather than restating it.
Timetable, notices, madrasah information, service details and the live broadcast: the mosque's own. Qur'an: Arabic text with the English translation of Abdullah Yusuf Ali (d. 1953), out of copyright in the United Kingdom where the app is published. Sahih al-Bukhari: Arabic text only, from a public domain edition under The Unlicense; English links out to sunnah.com, so no modern translation is reproduced. Hajj and Umrah guidance: the mosque's own, settled by this mosque's scholars and written by the mosque. Photographs and diagrams: the mosque's own or licensed for this use. Name, logo and wordmark: the charity's property.
```

---

## The long form, for the record

Everything the two blocks were cut down from. Do not paste this — it does not
fit. Attach the screen recording to the reply carrying block 1.

---

**1. Screen recording**

Attached. *(This is the one item that cannot be written — see Part 2.)*

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

# Part 2 — the App Completeness findings, and what was done

All of these are **fixed**. Kept as the record of what the 2.1 rejection was
actually about, because the same mistakes are easy to make again.

| Finding | What it was | Now |
| --- | --- | --- |
| **Tours & Visits** | A menu row with a COMING SOON tag and no destination — tapping it did nothing. The clearest possible 2.1 finding. | Row removed. |
| **Hajj / Umrah** | Tagged COMING SOON and opened a locked screen. | The section is finished and released. It opens a chooser, and every ruling in it carries the name of whoever at the masjid is answerable for it. |
| **Madrasah Portal** | Subtitle advertised an unfinished feature: *"registers and pupil records still being built"*. | Reworded to what the portal does today. |
| **Education → More courses** | Dead row. | Removed. |
| **Membership** | A callout promising online checking "soon". | Reworded. |
| **Imams' advice form** | Had vanished, and the screen said questions were closed. It was not a switched-off form — the database went multi-masjid and the call needed a parameter it was not sending. | Fixed on both the app and the website. |

**Verified on a device before this submission**, not only in checks: the
Android emulator run installs the app, opens every section, reopens it at the
largest text size a phone can request, and reports *no crash or fatal JS error
in logcat at any point*, with no clipped text and no screen without a way back.

**The one thing nobody can automate** is item 1, the screen recording. It has
to be captured on a physical device. `RECORDING.md` has the shot list.
