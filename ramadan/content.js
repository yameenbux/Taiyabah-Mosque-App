/* Taiyabah Masjid — Ramadan
   Copyright (c) 2026 Yameen Bux. All rights reserved. See LICENSE.md.

   ONE SOURCE, BOTH PLATFORMS, the same arrangement as hajj/content.js. The
   website loads this file directly and native/scripts/import-content.mjs
   turns it into src/data/ramadan.json for the app. Writing a taraweeh rota
   twice guarantees the two drift, and the thing they would drift on is who
   is leading tonight.

   WHAT IS IN HERE AND WHAT IS NOT. Everything below is the masjid's to say.
   Nothing that can be COMPUTED lives here — the night, the sehri and iftar
   times, the isha jamāʿah, tonight's juz and its page range are all read
   from timetable-2026.json and mushaf.json at the moment of asking, because
   a time copied into a content file is a time that will be wrong the year
   the timetable moves.

   AND NOTHING THAT IS ALREADY TRANSLATED. The parking advice, the taraweeh
   arrangement, the iʿtikāf lead-in and the fitrana rule are prose the whole
   site carries in Urdu, Gujarati and Arabic through lang/src. A second
   English copy in here is the copy a non-English reader would have been
   shown, so prose that has a key stays in the packs and this file holds only
   what the committee fills in — names, numbers, dates. Every field left in
   here is drawn on both platforms; one that is drawn nowhere is a thing the
   committee filled in and nobody ever sees.

   HOW A BLANK BEHAVES, AND WHY IT IS A null RATHER THAN A GUESS. The four
   taraweeh students are settled about a month before Ramadan. The number of
   iʿtikāf places, the booking deadline and the fitrana amount are set each
   year. Until the committee gives them they are null here, and a null is
   drawn as "To be confirmed" rather than quietly left out — because a row
   that disappears looks like a row that was never promised, and somebody
   planning iʿtikāf needs to see that the answer is coming rather than that
   the masjid is not doing it.

   check-ramadan.mjs asserts that both platforms carry every key, that a
   null never renders as a real value, and that nothing in here states a
   time the timetable is meant to own. */
window.RAMADAN = {

  /* ---------------------------------------------------------------- *
   *  TARAWEEH — settled practice, with this year's names to come
   * ---------------------------------------------------------------- */
  taraweeh: {
    /* Five lead between them: the Imam takes the first four and four
       students of the masjid take the rest. That much is the masjid's
       long-standing arrangement and does not change year to year. */
    leaders: [
      { rakahs: "1–4",   name: "Mufti Faiyaz", role: "Imam of the masjid" },
      { rakahs: "5–8",   name: null, role: "Student of the masjid" },
      { rakahs: "9–12",  name: null, role: "Student of the masjid" },
      { rakahs: "13–16", name: null, role: "Student of the masjid" },
      { rakahs: "17–20", name: null, role: "Student of the masjid" },
    ],
  },

  /* ---------------------------------------------------------------- *
   *  BAYAAN — two a day, every day of the month
   * ---------------------------------------------------------------- */
  bayaan: {
    slots: [
      { when: "After Asr",  speaker: null, subject: null },
      { when: "After Isha", speaker: null, subject: null },
    ],
  },

  /* ---------------------------------------------------------------- *
   *  IʿTIKĀF — the one thing on this screen that has to be booked
   * ---------------------------------------------------------------- */
  itikaf: {
    begins: "After Maghrib, 20 Ramadan",
    who: "Brothers only",
    /* null until the committee sets the year's number. `taken` is what the
       office has filled; both null means the places line reads as pending
       rather than as "0 of 0 left", which would read as fully booked. */
    places: null,
    taken: null,
    bookBy: null,
    /* I'TIKAF IS THE WHOLE OF THE LAST TEN NIGHTS. It is entered once and
       kept to the end — nobody books the 23rd and the 27th and goes home in
       between — so there is no night to choose and the form does not ask for
       one. The first build offered ten nights to pick from, which is not a
       smaller version of this; it is a different thing, and one the masjid
       does not do. */
    asks: "You will be asked for a name and a phone number.",
  },

  /* ---------------------------------------------------------------- *
   *  ZAKAT AL-FITR — an amount the committee sets each year
   * ---------------------------------------------------------------- */
  fitrana: {
    amount: null,
    /* The masjid's own Stripe Payment Link for fitrana, which only the masjid
       can create — it is their Stripe account and the amount changes each
       year. Null until they make one, and null draws no Pay button rather
       than a button that goes nowhere. The five links already on the giving
       screen are the shape: buy.stripe.com/… with a client_reference_id. */
    payLink: null,
    note: "The amount is set by the committee each year and announced in the masjid.",
  },

  /* ---------------------------------------------------------------- *
   *  EID AL-FITR — on the screen the morning after the last night
   * ---------------------------------------------------------------- */
  eid: {
    jamaats: null,
    venue: null,
    note: "Eid times are announced once the moon has been sighted.",
  },

  /* ---------------------------------------------------------------- *
   *  THE LAST TEN NIGHTS
   * ---------------------------------------------------------------- */
  lastTen: {
    lead: "Laylat al-Qadr is better than a thousand months. The masjid stays open through each of these nights.",
    kicker: "Seek it in the odd nights",
  },
};
