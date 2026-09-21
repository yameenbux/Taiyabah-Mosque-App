# Google Play listing — Taiyabah Masjid

Everything to paste into the Play Console, and the answers to the questionnaires.
Written against what the code actually does, so the Data safety section can be
relied on rather than guessed at.

Developer account: **Bolton Central Islamic Society** (organisation).
Package name: `com.taiyabahmasjid.app` — set once, never changeable.

---

## Store listing

**App name** (30 characters max)

```
Taiyabah Masjid
```

**Short description** (80 characters max)

```
Prayer times, reminders, Qurʼan and services for Taiyabah Masjid, Bolton.
```

**Full description** (4000 characters max)

```
Taiyabah Masjid in Bolton, in your pocket.

Prayer times taken straight from the masjid's own timetable — beginning times
and jamāʿah times, today and for the year — with the next jamāʿah always on the
first screen and a countdown to it.

REMINDERS THAT SUIT YOU
Choose how many minutes before jamāʿah you want telling, and which prayers you
want telling about. Janāzah announcements, masjid notices and event reminders
are separate switches, so you only get what you asked for.

THE QURʼAN, OFFLINE
The full Qurʼan with a familiar 13-line mushaf, readable upright or turned
sideways for a wider page. Keep one bookmark for where you are up to, and as
many favourites as you like for the sūrahs you return to. Once downloaded it
works with no signal at all.

EVERY DAY
Morning, evening and after-prayer adhkār, a collection of duʿās, the forty
Rabbanā verses, and a qibla compass that uses your phone's sensors.

THE MASJID
Book the Taiyabah Centre for a family occasion, with the real diary — you can
see which days are free before you ask. Request a nikāḥ date. Read the madrasah
fees, class times and term dates. Work out your zakat with live gold and silver
prices. Listen to the masjid live.

IN YOUR LANGUAGE
English, Urdu, Gujarati and Arabic throughout — not only the menus but the
duʿās, the sūrah names and the masjid's own information, with the numerals
written the way each language writes them.

NO ADVERTS, NO TRACKING
There is no advertising in this app, no analytics, and nothing that follows you
around. Most of it asks nothing of you at all and works without a signal.

Taiyabah Masjid is run by Bolton Central Islamic Society, registered charity
1041569, Astley Street and Draycott Street, Bolton.
```

**Category** — Lifestyle. (Books & Reference is defensible given the Qurʼan
reader; Lifestyle matches how people will look for a mosque app.)

**Tags** — prayer times, Islam, Quran, mosque, Bolton

**Contact details** — these are published on the listing, so they must be the
masjid's, never a personal address.

| Field | Value |
|---|---|
| Email | `info@taiyabahmasjid.com` |
| Phone | `01204 535 997` |
| Website | the masjid domain, once the app has moved onto it |
| Address | 31a Draycott Street, Bolton BL1 8HD |

**Privacy policy URL** — `https://<masjid domain>/privacy.html`
(currently `https://taiyabahapp.ysbdesigns.uk/privacy.html`; update when the
domain moves, and update it in the Console at the same time.)

---

## Graphics

| Asset | Requirement | File |
|---|---|---|
| App icon | 512 × 512 PNG | `icon-512.png` in the repository root |
| Feature graphic | 1024 × 500 PNG | `store/feature-graphic.png` |
| Phone screenshots | 2–8, **9:16 or 16:9** | `store/screenshots/*.png`, 1080 × 1920 |

Screenshots are captured from the real app, not mocked.

THE ASPECT RATIO IS A HARD REQUIREMENT, not a suggestion. The Console asks
for 9:16 or 16:9. The first set was 1080 × 2400, the shape of a real modern
phone, which is 9:20 and is refused. Capture at a 540 × 960 viewport with
deviceScaleFactor 2: that is exactly 1080 × 1920, and the text renders at
phone density instead of being scaled up from something small.

Capture with the service worker blocked, or a stale cache renders an old
build under a new version number. And look at every frame before using it:
the zakat screen was dropped from this set because the price service is not
reachable from a sandbox and the shot carried a red "Couldn't fetch today's
price" banner across it, which reads as a broken app.

Suggested captions, if you use them:

1. Every prayer, and the next one counting down
2. Beginning and jamāʿah times, today and all year
3. The whole Qurʼan, and it works offline
4. Morning, evening and after-prayer adhkār
5. Give to the masjid in seconds
6. Ask to collect for your cause

---

## Data safety

Google requires this to match the app's behaviour. Each answer below is
traceable to code.

**Does your app collect or share any of the required user data types?** — Yes.

**Is all of the user data collected by your app encrypted in transit?** — Yes.
Every request is HTTPS.

**Do you provide a way for users to request that their data be deleted?** — Yes.
By telephone and email, as set out in the privacy notice.

### Data types to declare

| Type | Collected | Shared | Optional? | Purpose | Where in the code |
|---|---|---|---|---|---|
| Name | Yes | No | Optional | App functionality | Hall booking `first_name`/`last_name`; nikāḥ `contact_name`; charity collection `collector_name`, `trustee_name`, `signed_name` |
| Address | Yes | No | Optional | App functionality | Hall booking `address`; charity collection `org_address` |
| Phone number | Yes | No | Optional | App functionality | Hall booking `phone`; nikāḥ `contact_phone`; charity collection `org_phone`, `trustee_phone` |
| Email address | Yes | No | Optional | App functionality | Nikāḥ `contact_email`; charity collection `org_email`, `trustee_email` |
| Photos | Yes | No | Optional | App functionality | The BMCC certificate, when uploaded as a JPEG, PNG or WebP |
| Files and docs | Yes | No | Optional | App functionality | The BMCC certificate, when uploaded as a PDF |
| Other user-generated content | Yes | No | Optional | App functionality | Nikāḥ `notes` free-text box |
| Device or other IDs | Yes | No | Optional | App functionality | OneSignal subscription id, only if notifications are turned on |

The certificate is one upload that the form accepts in four formats, so which
of the two file categories applies depends on what the person picked. Declare
both: `CC_CERT_TYPES` in `index.html` allows `image/jpeg`, `image/png`,
`image/webp` and `application/pdf`, and the `bmcc` bucket accepts exactly
those. A declaration that named only one would be false half the time.

It goes to a **private** Supabase bucket that `anon` may write and only
`verified_admin()` may read, and the portal reaches it through a signed URL
valid for 300 seconds. It is not shared with anyone outside the masjid, which
is why the Shared column says No.

"Optional" because none of it is required to use the app — every one of these
is collected only if the person chooses to book a hall, request a nikāḥ, or
turn notifications on.

### Data types NOT to declare, and why

- **Location.** The qibla compass reads the device position on a button press,
  uses it in memory and discards it. It is never stored and never transmitted,
  so it is not collected within Google's meaning. Be ready to say so if asked.
- **Payment information.** Stripe takes payment on its own hosted pages, opened
  outside the app. No card data passes through the app.
- **App activity / analytics.** There is none. No analytics SDK, no tracker, no
  advertising identifier.

---

## Content rating (IARC questionnaire)

Answer as a **Reference, News, or Educational** app.

- Violence, sexuality, language, controlled substances — none.
- **Does the app contain user-generated content shared with others?** No. The
  nikāḥ notes box goes to the masjid office only; nothing is shown to other
  users.
- **Does the app share the user's location with other users?** No.
- **Does the app allow purchases?** Yes — it links out to Stripe for the hall
  deposit, the nikāḥ fee and donations. These are payments for real-world
  services and gifts to a charity, handled outside the app.

Expected outcome: PEGI 3 / Everyone.

---

## Before you can press publish

- [ ] Organisation account verified (see the D‑U‑N‑S work)
- [ ] `assetlinks.json` carries the real Play App Signing fingerprint, not the
      placeholder — otherwise the app shows a browser bar across the top
- [ ] Privacy policy reachable at the URL entered in the Console
- [ ] App signing enrolled, upload key stored somewhere the masjid can reach
- [ ] Target API level meets Play's current requirement
- [ ] Closed testing done, if the 12-tester rule turns out to apply
