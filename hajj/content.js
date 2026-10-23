/* Taiyabah Masjid — Hajj & Umrah
   Copyright (c) 2026 Yameen Bux. All rights reserved. See LICENSE.md.

   ONE SOURCE, BOTH PLATFORMS. The website loads this file directly and
   native/scripts/import-content.mjs turns it into src/data/hajj.json for the
   app, the same way duas.js and athkar.js are shared. Writing this content
   twice would guarantee the two drift, and the thing they would drift on is
   a ruling.

   TWO KINDS OF BRANCH, AND THEY ARE GATED DIFFERENTLY.

     kind: "practical"  — packing, heat, water, feet, paperwork, coming home.
                          This is travel and safety guidance, not fiqh, and it
                          is written here. It opens as soon as it exists.

     kind: "fiqh"       — iḥrām, the rites, the duʿās. These are Ḥanafī
                          rulings for a Deobandi congregation, and they are
                          the masjid's ʿulamā to give, not this file's.

   WHAT `by` DOES, AND WHY EVERY FIQH ENTRY BELOW HAS none. An entry counts
   towards opening a fiqh branch ONLY when it carries an approver's name. The
   entries below are DRAFTS, written to save the ʿulamā a blank page: they are
   a starting document to be corrected, not an answer. Until a scholar puts
   their name on an entry it is invisible to every reader and it cannot open
   anything, whoever merges it and whoever flips the release flag. That rule
   is in hajj.js and check-hajj.mjs asserts it.

   So: correct the text, then add `by: "Mufti ..."` and a `source`. The entry
   appears when, and only when, somebody is willing to be named for it.

   ON THE PRACTICAL BRANCHES. Nothing here states a Saudi entry requirement,
   a visa rule or a vaccination rule as current fact, because those change
   between seasons and being confidently wrong about one is worse than saying
   nothing. They point at the official source instead. Health lines are the
   ordinary advice of somebody who has been, not a prescription, and they say
   so where it matters.
*/
window.HAJJ = {
  branches: [

    /* ---------------------------------------------------------------- *
     *  1. WHAT TO PACK — tickable, saved, and written for a British
     *     pilgrim flying into heat most of us never train for.
     * ---------------------------------------------------------------- */
    {
      id: "pack",
      kind: "practical",
      title: "What to pack",
      lead: "Tick it off as it goes in the case. It saves itself, so you can come back to it.",
      sections: [
        {
          id: "pack-ihram",
          title: "Iḥrām and clothing",
          items: [
            { id: "p-ihram", pack: true, t: "Two iḥrām sheets, and a spare set",
              d: "One set gets wet, sandy or stained within a day or two. A spare is the difference between washing in a hotel sink at midnight and not." },
            { id: "p-belt", pack: true, t: "An iḥrām belt with pockets",
              d: "It holds the sheets and keeps your phone, money and room key on you. Pockets matter: there are none in an iḥrām." },
            { id: "p-pins", pack: true, t: "Safety pins and clips",
              d: "Whether they may be used on an iḥrām is a question for the ʿulamā, not for a packing list. Take them either way; they are useful for everything else." },
            { id: "p-abaya", pack: true, t: "Loose, light, dark clothing",
              d: "For women, and for men outside iḥrām. Thin cotton, loose enough for air to move. Black absorbs heat but hides dust; most people take both." },
            { id: "p-warm", pack: true, t: "One warm layer",
              d: "The desert at night in winter is cold, Minā tents are air-conditioned hard, and aeroplanes are freezing. One fleece covers all three." },
            { id: "p-wash", pack: true, t: "A travel wash bar or sachets",
              d: "You will be rinsing clothes in a sink. Hotel laundry during the season is slow and expensive." },
          ],
        },
        {
          id: "pack-unscented",
          title: "Unscented washing",
          lead: "Scented soap, shampoo, deodorant and toothpaste are the single most common thing people get caught out by. Buy unscented before you fly: it is far easier to find in a British supermarket than in Makkah during the season.",
          items: [
            { id: "p-soap", pack: true, t: "Unscented soap and shampoo", d: "Check the bottle, not the brand. Many 'sensitive' ranges are still perfumed." },
            { id: "p-deo", pack: true, t: "Unscented deodorant", d: "Crystal or plain alum sticks are widely used." },
            { id: "p-paste", pack: true, t: "Unflavoured or plain toothpaste", d: "Mint counts as a scent to many; take a plain one and ask the ʿulamā rather than guessing in the hotel." },
            { id: "p-cream", pack: true, t: "Unscented moisturiser and lip balm",
              d: "Lips crack badly in that air. An unscented balm is worth more than it sounds." },
          ],
        },
        {
          id: "pack-heat",
          title: "Heat, sun and water",
          items: [
            { id: "p-suncream", pack: true, t: "High-factor unscented sunscreen",
              d: "Factor 50. Scalps burn in iḥrām with no cap, and the tops of the feet burn in sandals — both are places people forget." },
            { id: "p-umbrella", pack: true, t: "An umbrella",
              d: "Not unusual there; half the courtyard carries one. It is the best shade you can own and it weighs nothing." },
            { id: "p-bottle", pack: true, t: "A refillable water bottle",
              d: "Zamzam coolers are everywhere in the Ḥaram. A bottle you can refill means you drink far more than you otherwise would." },
            { id: "p-salts", pack: true, t: "Oral rehydration sachets",
              d: "Water alone does not replace what you sweat out. A few sachets weigh nothing and are the quickest way back from feeling wrung out." },
            { id: "p-sweets", pack: true, t: "Dates and boiled sweets",
              d: "Long days, missed meals and heat drop your blood sugar. Something in a pocket for the walk back from Ḥaram is worth carrying." },
            { id: "p-spray", pack: true, t: "A small water spray bottle",
              d: "For the face and the back of the neck while queueing in the sun. Make sure it is unscented water." },
          ],
        },
        {
          id: "pack-feet",
          title: "Feet",
          lead: "More Hajj trips are spoiled by feet than by anything else. You will walk further than you expect, on marble that is polished, hot and unforgiving.",
          items: [
            { id: "p-sandals", pack: true, t: "Sandals you have already worn in",
              d: "Never take new ones. Which kind may be worn in iḥrām is a ruling, and it is in the Iḥrām branch; for comfort, take the ones your feet already know." },
            { id: "p-spare", pack: true, t: "A cheap spare pair",
              d: "Shoes go missing outside the Ḥaram constantly. A spare pair in the room means it is an annoyance rather than a crisis." },
            { id: "p-shoebag", pack: true, t: "A drawstring shoe bag",
              d: "Carry your sandals in with you. It is the single best tip anybody gives a first-timer." },
            { id: "p-blister", pack: true, t: "Blister plasters, foot cream, talc",
              d: "Treat a hot spot the moment you feel it, not that evening." },
            { id: "p-socks", pack: true, t: "Thin socks for outside iḥrām",
              d: "Marble is cold at Fajr and scorching by Ẓuhr." },
          ],
        },
        {
          id: "pack-health",
          title: "Health",
          items: [
            { id: "p-meds", pack: true, t: "Your own medication, in its original packaging",
              d: "With the pharmacy label on it, and a copy of your prescription or a letter from your GP. Some medicines that are ordinary here are controlled there, so check the official Saudi guidance before you fly rather than hoping." },
            { id: "p-basic", pack: true, t: "Paracetamol, throat lozenges, plasters",
              d: "Pharmacies are everywhere and cheap, but not at three in the morning when you need them." },
            { id: "p-mask", pack: true, t: "Masks",
              d: "Dust, crowds and a few million people breathing the same air. Most people come home with a cough; a mask in the crowded parts helps." },
            { id: "p-sanitiser", pack: true, t: "Hand sanitiser or wipes",
              d: "Whether alcohol-based sanitiser is a problem in iḥrām is a question for the ʿulamā. Alcohol-free wipes avoid the question." },
            { id: "p-tummy", pack: true, t: "Something for an upset stomach",
              d: "Different water, different food, eaten at odd hours." },
          ],
        },
        {
          id: "pack-papers",
          title: "Documents and money",
          items: [
            { id: "p-passport", pack: true, t: "Passport, visa and permits",
              d: "Printed as well as on your phone. Phones die and batteries run out in queues." },
            { id: "p-copies", pack: true, t: "Photocopies, kept separately",
              d: "One set in your case, one with somebody travelling with you." },
            { id: "p-card", pack: true, t: "A card with your name, hotel and a contact number",
              d: "In Arabic and English, in your iḥrām belt. If you are lost, confused or unwell, this is what gets you home. Take one for every member of your group, especially the elderly." },
            { id: "p-insurance", pack: true, t: "Travel insurance details",
              d: "Check it actually covers Hajj or ʿUmrah; some policies exclude it." },
            { id: "p-money", pack: true, t: "A card that works abroad, and some riyals",
              d: "Cards are accepted widely now, but small stalls, barbers and taxis are easier with cash." },
          ],
        },
        {
          id: "pack-power",
          title: "Power and phone",
          items: [
            { id: "p-adapter", pack: true, t: "A plug adapter",
              d: "Do not assume the sockets match yours. Take an adapter that covers more than one shape." },
            { id: "p-bank", pack: true, t: "A power bank",
              d: "You will be out of the room for six hours at a time and navigating, translating and calling the whole while." },
            { id: "p-cable", pack: true, t: "A long charging cable",
              d: "Hotel sockets are never near the bed, and rooms are shared." },
            { id: "p-torch", pack: true, t: "A small torch",
              d: "For Muzdalifah, and for finding your tent at night." },
          ],
        },
      ],
    },

    /* ---------------------------------------------------------------- *
     *  2. HEAT, WATER AND CROWDS — the safety branch. This is the part
     *     that gets people home.
     * ---------------------------------------------------------------- */
    {
      id: "heat",
      kind: "practical",
      title: "Heat, water and crowds",
      lead: "Most of what goes wrong on Hajj is heat, dehydration or a crowd, and all three are survivable if you know what you are looking at.",
      sections: [
        {
          id: "heat-water",
          title: "Drink before you are thirsty",
          items: [
            { id: "h-thirst", t: "Thirst arrives late",
              d: "By the time you feel thirsty in that heat you are already behind. Drink on a schedule rather than on a feeling: a little, often, all day." },
            { id: "h-zamzam", t: "Zamzam is everywhere in the Ḥaram",
              d: "Coolers line the courtyards and the floors. There is never a reason to walk past one thirsty." },
            { id: "h-salt", t: "Water alone is not enough",
              d: "You lose salts as well as water. If you feel wrung out, headachy or oddly weak after a long day, a rehydration sachet usually does more than another bottle of water." },
            { id: "h-urine", t: "The simplest check there is",
              d: "Dark urine means drink more. It is unglamorous and it is the most reliable signal you have." },
          ],
        },
        {
          id: "heat-signs",
          title: "When the heat is winning",
          lead: "Learn these, for yourself and for whoever you are travelling with. Older pilgrims often will not say anything.",
          items: [
            { id: "h-exhaust", t: "Heat exhaustion: get out of the sun now",
              d: "Heavy sweating, cold clammy skin, a fast weak pulse, dizziness, cramp, nausea, headache. Move into shade or air conditioning, loosen clothing, sip water with salts, cool the skin. It usually passes within half an hour of doing the right thing." },
            { id: "h-stroke", t: "Heatstroke is an emergency",
              d: "Hot dry skin or sweating that has STOPPED, a pounding pulse, confusion, slurred speech, fainting. Call for help straight away, get them into shade, and cool them with whatever water you have while you wait. Do not wait to see if it improves." },
            { id: "h-watch", t: "Watch the people with you",
              d: "The elderly, anybody fasting, anybody on blood pressure or water tablets, and anybody too proud to complain. Confusion is the sign people miss, because the person cannot report it themselves." },
          ],
        },
        {
          id: "heat-sun",
          title: "Sun, shade and the marble",
          items: [
            { id: "h-midday", t: "Keep the middle of the day quiet",
              d: "Ṭawāf and saʿī at Fajr or after ʿIshāʾ are a different experience from the same thing at two in the afternoon. Rest when the sun is highest; the Ḥaram is open all night." },
            { id: "h-floor", t: "The marble gets hot enough to burn",
              d: "It is cooled in parts of the courtyard and not in others. In sandals, keep to shade and to the cooled strips; a burnt sole ends your walking for days." },
            { id: "h-scalp", t: "A bare head in iḥrām burns fast",
              d: "Sunscreen on the scalp, the ears and the tops of the feet. Use an umbrella. Men cannot cover the head in iḥrām, which makes shade a necessity rather than a comfort." },
          ],
        },
        {
          id: "heat-crowd",
          title: "Crowds",
          items: [
            { id: "h-meet", t: "Agree a meeting point before you go in",
              d: "A gate number, not 'by the door'. Everyone in the group should know it and be able to say it. Phones do not work well in those crowds." },
            { id: "h-flow", t: "Move with the crowd, never across it",
              d: "If you need to leave, work diagonally towards the edge over time. Turning and pushing back is how people fall." },
            { id: "h-stone", t: "Do not fight your way to the Black Stone",
              d: "People are hurt there every year. Pointing from a distance as you pass is the practice of the Prophet ﷺ, and nobody is better for an injury." },
            { id: "h-fall", t: "If you drop something, leave it",
              d: "Bending down in a moving crowd is one of the most dangerous things you can do. A phone is replaceable." },
            { id: "h-tell", t: "Never go alone without telling somebody",
              d: "Where you are going and roughly when you will be back. Especially at night, and especially in Minā where every tent looks like every other tent." },
          ],
        },
      ],
    },

    /* ---------------------------------------------------------------- *
     *  3. DOCUMENTS AND HEALTH BEFORE YOU FLY
     *     Deliberately thin on specifics: these rules move.
     * ---------------------------------------------------------------- */
    {
      id: "papers",
      kind: "practical",
      title: "Before you book",
      lead: "Entry rules, visas and vaccination requirements change from season to season. What follows is what to go and check, not what the answer is.",
      sections: [
        {
          id: "papers-check",
          title: "Check these yourself, close to flying",
          items: [
            { id: "d-visa", t: "Your visa and permit",
              d: "Hajj and ʿUmrah are issued differently and through official channels. Use the Saudi government's own route and your tour operator; do not rely on what somebody was told two years ago." },
            { id: "d-vacc", t: "Vaccinations",
              d: "Saudi Arabia sets vaccination requirements for pilgrims and they are revised. Ask your GP or practice nurse well ahead, and check the UK's own travel health service, because some need more than one dose or time to take effect." },
            { id: "d-fcdo", t: "The UK's travel advice for Saudi Arabia",
              d: "The Foreign Office page is updated through the season and covers entry rules, safety and what the consulate can do if something goes wrong." },
            { id: "d-meds", t: "Whether your medication is allowed",
              d: "Some medicines sold freely here are controlled there. Check the official guidance, carry them in the original packaging, and take your prescription." },
            { id: "d-insure", t: "Insurance that actually covers pilgrimage",
              d: "Read the exclusions. Several ordinary travel policies will not cover Hajj or ʿUmrah, and medical care abroad is not free." },
          ],
        },
        {
          id: "papers-office",
          title: "If you are not sure",
          items: [
            { id: "d-office", t: "Ask the masjid office",
              d: "People from this community go every year. The office can often tell you which operators others have used and what caught them out, which is worth more than a forum." },
          ],
        },
      ],
    },

    /* ---------------------------------------------------------------- *
     *  4. IḤRĀM — fiqh. Every entry a DRAFT with no approver, so none of
     *     it is visible and none of it can open this branch.
     * ---------------------------------------------------------------- */
    {
      id: "ihram",
      kind: "fiqh",
      title: "Iḥrām",
      lead: "What may be worn, what may not be done, and what is owed if something is broken.",
      sections: [
        {
          id: "ihram-men",
          title: "For men",
          /* How the two cloths are actually worn, which is the thing a
             first-time pilgrim cannot picture from words. The note at the
             head of native/src/hajj-art.jsx says where the picture came from
             and why nothing in this section carries a verdict. */
          art: { id: "worn", cap: "The izār at the waist and the ridāʾ over the shoulder." },
          items: [
            { id: "i-m-dress", by: null, verdict: "allowed", t: "Two unstitched sheets",
              d: "DRAFT FOR REVIEW. An izār around the lower body and a ridāʾ over the upper, both unstitched and ordinarily white. Nothing sewn to the shape of the body is worn." },
            { id: "i-m-head", by: null, verdict: "avoid", t: "The head stays uncovered",
              d: "DRAFT FOR REVIEW. A man in iḥrām does not cover his head. Shade from an umbrella or a roof is a different matter from a cap or a cloth resting on the head; the ʿulamā should set out exactly where the line sits." },
            { id: "i-m-feet", by: null, verdict: "avoid", t: "Footwear that leaves the instep bare",
              /* Where the instep is, which is anatomy. The sandal is drawn
                 plainly: which ones pass is the ʿulamā's to say, not a
                 drawing's. */
              art: { id: "instep", cap: "The marked part of the foot is the instep." },
              d: "DRAFT FOR REVIEW. In the Ḥanafī school the raised middle bone of the foot is not covered. The ʿulamā should say plainly which sandals pass, because this is the single thing pilgrims from this community ask about most and get wrong in the shop." },
          ],
        },
        {
          id: "ihram-women",
          title: "For women",
          items: [
            { id: "i-w-dress", by: null, verdict: "allowed", t: "Ordinary modest clothing",
              d: "DRAFT FOR REVIEW. There is no special garment. Stitched clothing is worn as usual, covering as it normally would, and the colour is not fixed." },
            { id: "i-w-face", by: null, verdict: "avoid", t: "The face is not covered by cloth resting on it",
              d: "DRAFT FOR REVIEW. The usual arrangement is a covering held away from the face. The ʿulamā should describe what is actually done in practice, not only the principle." },
            { id: "i-w-hands", by: null, verdict: "allowed", t: "Hands and feet",
              d: "DRAFT FOR REVIEW. Needs the ʿulamā's wording on gloves and socks." },
          ],
        },
        {
          id: "ihram-dont",
          title: "What is not done in iḥrām",
          items: [
            { id: "i-scent", by: null, verdict: "dam", t: "Perfume and scented things",
              d: "DRAFT FOR REVIEW. Including scented soap, shampoo, deodorant and some toothpaste, which is why the packing list sends people to buy unscented before flying. The ʿulamā should set out what is owed for a small amount against a lot, because that distinction is the one people need." },
            { id: "i-hair", by: null, verdict: "dam", t: "Cutting hair or nails",
              d: "DRAFT FOR REVIEW. Needs the ʿulamā on quantity, and on hair that falls out without being cut." },
            { id: "i-marry", by: null, verdict: "avoid", t: "Contracting a marriage",
              d: "DRAFT FOR REVIEW." },
            { id: "i-intimacy", by: null, verdict: "dam", t: "Intimacy",
              d: "DRAFT FOR REVIEW. The consequences here are graver than a dam and differ by stage. This entry must not go live until the ʿulamā have written it in full." },
            { id: "i-hunt", by: null, verdict: "dam", t: "Hunting",
              d: "DRAFT FOR REVIEW." },
            { id: "i-argue", by: null, verdict: "avoid", t: "Quarrelling and foul speech",
              d: "DRAFT FOR REVIEW. Not a matter of dam, but of what the Qurʾān asks of a pilgrim, and worth saying in a crowd of two million in the heat." },
          ],
        },
        {
          id: "ihram-dam",
          title: "If something was broken",
          items: [
            { id: "i-dam-what", by: null, t: "What a dam is",
              d: "DRAFT FOR REVIEW. What it is, where it is given, and what the alternatives are for somebody who cannot." },
            { id: "i-dam-when", by: null, t: "Dam, ṣadaqah, or nothing owed",
              d: "DRAFT FOR REVIEW. The practical table the ʿulamā should supply: the common slips, and which of the three each one falls under. This is the entry the whole branch exists for." },
            { id: "i-dam-ask", by: null, t: "When to ask rather than assume",
              d: "DRAFT FOR REVIEW. Nobody should work this out from an app while standing in Minā. The masjid's number belongs in this entry." },
          ],
        },
      ],
    },

    /* ---------------------------------------------------------------- *
     *  5. THE RITES — fiqh. Drafts, unapproved.
     * ---------------------------------------------------------------- */
    {
      id: "rites",
      kind: "fiqh",
      title: "The rites, in order",
      lead: "What is done, when, and in what order.",
      sections: [
        {
          id: "rites-umrah",
          title: "ʿUmrah",
          items: [
            { id: "r-u-1", by: null, n: 1, t: "Iḥrām and the intention",
              d: "DRAFT FOR REVIEW. Where it is entered, what is said, and what the mīqāt means for somebody flying from Manchester." },
            { id: "r-u-2", by: null, n: 2, t: "Ṭawāf, seven circuits",
              d: "DRAFT FOR REVIEW. Where it starts and ends, which shoulder is bared and when, and what is said. The counter in this section keeps the number; this entry is what the counter cannot tell anybody." },
            { id: "r-u-3", by: null, n: 3, t: "Two rakʿahs after ṭawāf",
              d: "DRAFT FOR REVIEW." },
            { id: "r-u-4", by: null, n: 4, t: "Saʿī, seven laps",
              d: "DRAFT FOR REVIEW. From Ṣafā to Marwa and back, and why the seventh ends where it does." },
            { id: "r-u-5", by: null, n: 5, t: "Ḥalq or taqṣīr",
              d: "DRAFT FOR REVIEW. What is done for men and for women, and the point at which iḥrām ends." },
          ],
        },
        {
          id: "rites-hajj",
          title: "The days of Hajj",
          items: [
            { id: "r-h-8", by: null, n: 8, t: "8 Dhul Ḥijjah — Minā" , d: "DRAFT FOR REVIEW." },
            { id: "r-h-9", by: null, n: 9, t: "9 Dhul Ḥijjah — ʿArafah",
              d: "DRAFT FOR REVIEW. The day the Hajj turns on, what the standing is, and the one thing that invalidates it by being missed." },
            { id: "r-h-9b", by: null, n: 10, t: "The night at Muzdalifah", d: "DRAFT FOR REVIEW." },
            { id: "r-h-10", by: null, n: 11, t: "10 Dhul Ḥijjah — stoning, sacrifice, ḥalq",
              d: "DRAFT FOR REVIEW. The order, and what may be done out of order." },
            { id: "r-h-11", by: null, n: 12, t: "11 to 13 Dhul Ḥijjah — the days of Minā", d: "DRAFT FOR REVIEW." },
            { id: "r-h-wida", by: null, n: 13, t: "Ṭawāf al-Wadāʿ", d: "DRAFT FOR REVIEW." },
          ],
        },
      ],
    },

    /* ---------------------------------------------------------------- *
     *  6. THE DUʿĀS — the Arabic itself is not this file's to settle.
     * ---------------------------------------------------------------- */
    {
      id: "duas",
      kind: "fiqh",
      title: "The duʿās",
      lead: "What is said, where, with the pronunciation to read from.",
      sections: [
        {
          id: "duas-core",
          title: "Through the journey",
          items: [
            { id: "d-talbiyah", by: null, t: "The talbiyah",
              ar: "لَبَّيْكَ اللَّهُمَّ لَبَّيْكَ",
              tr: "Labbayk Allāhumma labbayk",
              when: "From entering iḥrām",
              d: "DRAFT FOR REVIEW. The opening words only. The full wording, when it is begun and when it stops, and the Arabic verified against the masjid's own source, are the ʿulamā's to confirm — the app verifies its other duʿās against their sources and this should go the same way." },
            { id: "d-tawaf", by: null, t: "Between the two corners", d: "DRAFT FOR REVIEW." },
            { id: "d-safa", by: null, t: "At Ṣafā and Marwa", d: "DRAFT FOR REVIEW." },
            { id: "d-arafah", by: null, t: "On the day of ʿArafah", d: "DRAFT FOR REVIEW." },
          ],
        },
      ],
    },

    /* ---------------------------------------------------------------- *
     *  7. COMING HOME
     * ---------------------------------------------------------------- */
    {
      id: "home",
      kind: "practical",
      title: "Coming home",
      sections: [
        {
          id: "home-health",
          title: "Your health afterwards",
          items: [
            { id: "c-cough", t: "The cough most people come back with",
              d: "Dust, crowds and air conditioning. It usually settles on its own." },
            { id: "c-fever", t: "See a doctor if you come home feverish",
              d: "And tell them you have been on Hajj or ʿUmrah. It changes what they look for, and it matters more than people realise." },
            { id: "c-rest", t: "Give yourself a few days",
              d: "People go straight back to work and then wonder why they feel wrecked for a fortnight." },
          ],
        },
        {
          id: "home-after",
          title: "Afterwards",
          items: [
            { id: "c-zamzam", t: "Zamzam on the way back",
              d: "There are rules about how much and how it may be carried, and airlines differ. Ask your operator before you buy more than you can take." },
            { id: "c-keep", t: "Keeping what you came back with",
              d: "Nobody can keep ʿArafah in their chest for ever, but the habits formed in those ten days are the part that can last. The masjid's own halaqah and the duʿā book in this app are the ordinary way people hold on to it." },
          ],
        },
      ],
    },
  ],
};
