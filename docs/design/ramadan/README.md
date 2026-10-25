# The Ramadan section — the design, and when it opens

Six screens, drawn before any of them was built, kept here so the build has
something to be checked against. They are plain HTML: open one in a browser.

The palette, the type and the radii are not approximations — they are the
app's own tokens out of `native/src/theme.js`. The times, the juz numbers and
the page ranges are the masjid's own, read out of `timetable-2026.json` and
`mushaf.json` rather than invented. The four duʿās are the ones already
shipped in `duas.json`, each placed where it is actually said. Anything the
committee has still to supply is written in [brackets].

| File | What it shows |
|---|---|
| `Coming.html` | The guard. A poster: the words, the count, the mark. |
| `Main.html` | The section on open — sehri and iftar, tonight, reminders, parking |
| `Schedule.html` | Night 7: who leads, the nightly juz, two bayaans a day |
| `Later.html` | Night 24 — the same screen once the month has moved on |
| `LastTen.html` | The odd nights, iʿtikāf, fitrana, Eid |
| `More.html` | Ideas not taken up, and why |

`Coming.html`, `Later.html` and `LastTen.html` each carry more than one state.
In the design canvas those are switches on a Tweaks tab; in these files the
default state is the one that renders.

## What the logic does, and where it lives

`native/src/ramadan.js`, with `scripts/test/ramadan.test.mjs` beside it.

Two decisions are made there rather than in a screen, because both are easy to
get quietly wrong and neither can be tested inside a component:

**The night rolls over at Fajr, not midnight.** Taraweeh for the twenty-fourth
night is prayed on the evening of 24 Ramadan and carries on past midnight for
anyone sitting with the Qurʼan afterwards. A screen that turns over at
midnight folds the night away while people are still in the masjid praying it.

**The length of the month is counted, not assumed.** Ramadan is twenty-nine
days or thirty and which one is the committee's business. It matters: in a
twenty-nine-day month the last ten nights begin at night 20, not 21.

## When the section opens

The guard stands in front of everything else until all of this is true:

- **The timetable carries Ramadan.** Until the committee publishes the year
  Ramadan falls in, there is no sehri time, no iftar time and no date to count
  to. This is the state the app is in as this is written: its calendar stops at
  22 Rajab 1448, and Ramadan 1448 is in 2027.
- **Ramadan is within a week.** Not the first night — iʿtikāf places are
  limited and have to be booked, and a booking screen that appears on the first
  night gives the committee no lead time and the congregation no warning. The
  taraweeh leaders are settled about a month beforehand, so there is a real
  rota to read by then too. A week is the masjid's own call; the number lives
  in `native/src/ramadan.js` as `OPEN_DAYS_BEFORE` and nowhere else, and
  `scripts/check-ramadan.mjs` asserts the website's copy agrees with it.

  In that week there is no night yet, so the hero, "Tonight" and the last ten
  stand down and the screen is the month's arrangements alone. That is the
  point of opening early: the booking has to be reachable before Ramadan
  starts.

It stays open one day past the last night, because Eid al-Fitr and the fitrana
deadline are on that screen and both matter on the morning after. Then it
shuts, and the guard comes back counting to the next year.

Nobody has to throw a switch for any of this. The app already downloads a
published year and lays it over the bundled one, so the count appears by
itself the day the committee presses publish.

## What was built, and where it went

Both halves are built and both sit behind the guard above.

| Where | What |
|---|---|
| `ramadan/content.js` | the committee's own: the rota, the bayaan slots, the iʿtikāf booking, the fitrana, Eid. Half of it is `null` on purpose — see its header. |
| `index.html` | `ramState()`, `ramTimes()`, `ramJuzPages()` and `renderRamadanOpen()`, filling eight containers in the Ramadan sheet |
| `native/src/screens/Ramadan.jsx` | the same screen: `Month` below the guard, in one file with it |
| `native/scripts/check-ramadan.mjs` | 140 assertions — both platforms' numbers agree, the gate runs on fixture months, no clock time is typed into content.js, and no field in it is drawn nowhere |

`check-screens` requires the app to say what the website says, and `ramadan`
is now in its list of screens: all 31 strings the website shows on that sheet
are in the app. It was missing from that list for as long as the app had only
the guard, which is exactly the hole the check exists to find.

Two things on the drawn screens were not built, deliberately:

- **The sehri time.** The design puts Fajr itself under "Sehri ends". The
  shipped reminder cards say suhūr ends ten minutes before Fajr, which is the
  masjid's own cushion, and two sehri times in one app is worse than either.
  The cushion won; Fajr is printed underneath it.
- **The reminders toggle, the preparation tiles and the duʿā on the guard.**
  A screen that exists to say one thing should say one thing.

## The two things the masjid has to create

Both are built, and both are dark until somebody at the masjid does one thing.
Neither needs an app release: the day the thing exists, the button appears on
both platforms.

### 1. iʿtikāf booking — two Postgres functions

The form is written on both platforms and posts nowhere, because the database
has no function to post to. It asks Postgres whether to show itself at all, so
it is off by default and cannot be switched on by accident:

| Function | What it must do |
|---|---|
| `itikaf_is_open()` | returns `true` when the committee is taking bookings. **Nothing is drawn until this answers true** — a missing function answers false, which is today. |
| `request_itikaf_place(payload jsonb)` | takes `{masjid, name, phone}`, holds the place, and returns `{reference}`. Where it raises with a sentence beginning with a capital — "There are no places left" — both platforms show that sentence rather than an apology over the top of it. |

**There is no `nights[]`, and there must not be.** Iʿtikāf is the whole of the
last ten nights: entered once and kept to the end, not booked a night at a
time. The first build offered ten nights to choose from, which is not a
smaller version of this — it is a different thing, and one the masjid does not
do. A place is a place for all ten. `check-ramadan.mjs` asserts neither
platform sends a per-night selection.

`request_hall_booking` is the worked example: same shape, same row-level
security, same way of speaking to the applicant directly.

The number of places and how many are taken are **not** in the database —
they are `itikaf.places` and `itikaf.taken` in `ramadan/content.js`, because
that is the committee's to set. Both null means the places row reads "To be
confirmed" rather than "0 of 0 left", which would read as fully booked.

### 2. Zakat al-Fitr — one Stripe Payment Link

`fitrana.payLink` in `ramadan/content.js` is null. Only the masjid can make
the link: it is their Stripe account, and the amount changes each year. The
five links already on the giving screen are the shape to copy —
`buy.stripe.com/…` with a `client_reference_id`.

The button needs the link **and** `fitrana.amount`, because a payment button
with no amount beside it asks for money nobody has been told the size of.

### And one that will not work as drawn

**A hadith a day.** `bukhari.json` holds only the index of the 97 books; the
narrations are fetched over the network. So it needs either a connection in
the masjid or the thirty chosen and stored before the month starts — and the
masjid picking them is the better answer anyway. Not built.
