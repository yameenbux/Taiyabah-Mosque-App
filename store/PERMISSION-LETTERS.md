# Asking permission to include an English translation

The app ships the Arabic of Ṣaḥīḥ al-Bukhārī and **links out** to sunnah.com
for the English. That is deliberate: linking is not copying, so it needs no
permission from anybody.

Bundling an English translation — so it reads inside the app, offline, beside
the Arabic — does need permission. Every complete English Bukhārī in
circulation is a modern work still in copyright, whatever licence a dataset on
GitHub may claim. A repository cannot give away rights it never held.

Two people can grant it. Both letters are below, ready to send on masjid
letterhead. **Send them from the masjid, not from a personal address** — the
request carries more weight from the charity, and any permission granted
should be to the charity, since the charity is what the app stores list.

**Keep the reply.** A written permission is not just courtesy: it is the
evidence Google Play and Apple ask for when they question rights to bundled
content. File it wherever the D‑U‑N‑S paperwork lives.

---

## First: the open-licence question, already asked and answered

Before sending either letter, somebody will reasonably ask whether a free,
openly licensed English Bukhārī exists that could simply be used. It was
looked for properly. It does not — and the way it does not is consistent
enough to be worth writing down, so the search is not repeated every year.

**Every "open" hadith dataset licenses its own packaging, not the
translation.** A repository can license the code it wrote, the database it
assembled and the API it serves. It cannot license an English translation it
never held rights in, and none of them claims in writing to have been granted
any. Five were checked:

| Source | Licence it claims | What it actually is |
| --- | --- | --- |
| `fawazahmed0/hadith-api`, edition `eng-bukhari` | The Unlicense — public domain | Its own editions metadata names the author: **Muhsin Khan**. Source field blank. This is the same repository the app's **Arabic** comes from, and for the Arabic the licence is sound, because that text is 9th-century. |
| `SENODROOM/sahih-al-bukhari` | AGPL-3.0, with `Copyright (C) 2026 Muhammad Saad Amin` | **Measured, not assumed: it is the Muhsin Khan translation.** See below. Its own metadata names no translator — the "English author" field says Imām al-Bukhārī, who did not write English. 7,277 hadith, so it does not match the numbering the app cites either. |
| `halimbahae/hadith` | ODbL + DBCL | Database licences. The Database Contents Licence exists precisely to say that rights in the individual contents are a separate question — it is an admission, not a grant. |
| LK Hadith Corpus (Leeds / King Saud) | no licence file | An academic corpus that asks to be cited in a paper. A citation request is not a redistribution grant, and the English provenance is not stated. |
| Aisha Bewley's own site | no licence published | Genuinely her own work and free to read, but marked **"Revision in progress"**, with no permission statement anywhere on it. |

### The AGPL one, measured

This is the candidate people will keep finding, because its licence file
genuinely does say that anyone may use it, and it carries a real copyright
line in the AGPL's own "how to apply" appendix:
`Copyright (C) 2026  Muhammad Saad Amin @SENODROOM`. The question is not
whether the licence is real. It is whether the thing being licensed was his
to license. That is answerable, so it was answered.

The pack's English was compared against the edition that openly declares
itself as Muhsin Khan's (`fawazahmed0/hadith-api`, `eng-bukhari`). The two
number differently — 7,277 against 7,589 — so a first pass matching by
hadith number compared unrelated narrations and returned a meaningless 0.04.
Aligned instead by their Arabic, on a random sample of 400:

    aligned by Arabic    400 of 400
    median similarity    0.942
    above 90% similar    266 of 400
    above 70% similar    330 of 400

Two translators working independently from the same Arabic do not land at
94% character-level agreement. That is one translation, lightly edited and
renumbered. The licence is therefore a licence over somebody else's work,
and a licence from a party that does not hold the rights conveys nothing to
the person who relies on it. If it were ever challenged, the masjid is the
name in the app stores — not the repository.

There is a second problem even setting ownership aside: AGPL-3.0 is strong
copyleft. Bundling AGPL'd content into the app invites the argument that the
whole app must be offered under the AGPL with its source made available to
users. That may be arguable, but a masjid app is not the place to find out.

To re-run the measurement, the script is in the commit that added this
section.

### The printed edition settles it in its own words

A scan of the Darussalam Arabic–English edition circulates freely online
(the one watermarked Kalamullah.com). Its availability changes nothing, and
its own copyright page says so, in English, in a box on page iii:

> ALL RIGHTS RESERVED ©
> No part of this book may be reproduced or utilized in any form or by any
> means, electronic or mechanical, including photocopying and recording or
> by any information storage and retrieval system, without written
> permission of the publisher or the translator.

"Information storage and retrieval system" is not loose wording. That is an
app database, named.

The same page gives the details the letter should cite, so a rights
department can identify the edition without correspondence:

    © Maktaba Dar us Salam, 1997
    Darussalam Publishers and Distributors, P.O. Box 22743, Riyadh 11416
    Translated by Dr Muhammad Muhsin Khan
    Printed July 1997, printing supervised by Abdul Malik Mujahid
    ISBN 9960-717-31-3 (set), 9960-717-32-1 (v.1)

**AND IT NAMES TWO ROUTES, NOT ONE:** "the publisher **or the translator**".
Dr Muhsin Khan died in 2021, so the translator route now means his estate —
harder to reach, but a second door where we assumed there was one.

**Worth asking for specifically.** The front matter carries endorsements of
this translation's soundness from the Presidency of Islamic Research and
Iftā (signed ʿAbd al-ʿAzīz ibn Bāz) and from the Islamic University of
Madinah. That is the committee's authenticity question answered for this
edition, by authorities they would recognise — which is a reason to want
this translation in particular, and therefore a reason to ask properly for
it rather than settle for an unattributed copy of it.

**Free to read is not free to copy.** That is the whole of it. sunnah.com is
the same case and says so plainly in its own terms: it does not permit
scraping, nor mass reproduction of entire books or collections, while
permitting individual hadith or selections for teaching.

**The unattributed ones are worse, not better.** The committee asked, in the
same note, for the source and reference to be identified and for the
authenticity of what is shown to be verifiable. A dataset that will not name
its translator fails that test before the licensing question is even reached.
The masjid cannot stand behind words when it cannot say who rendered them.

So there are two honest routes: ask, or write our own. **Ask sunnah.com
first** — see the next section; it is the shortest door and the only one with
a direct precedent. If every ask is declined, the fallback is the masjid's
own ʿulamā translating a chosen subset — the hadith actually used in khuṭbahs
and madrasah — which needs nobody's permission, and which is the same model
the Hajj section already runs on.

---

## Ask sunnah.com FIRST — their own invited channel

**This is the shortest door, and this file nearly missed it.** An earlier
version said flatly that sunnah.com forbids reproduction. That is what their
"Reproduction, Copying, Scraping" section says, and reading only that section
is how you arrive at the wrong conclusion. Their *Developers* page says the
other half: they describe themselves as committed to an open platform for
hadith that includes data and tools, they run an API, they ask you to open a
GitHub issue to request a key, and they invite requests for an offline dump
of hadith data.

The prohibition is on **taking**. There is a sanctioned way to **ask**.

**And there is a precedent that matches us almost exactly.** Greentech Apps
Foundation's "Hadith Collection (All in One)" ships roughly 41,000 hadith in
Arabic and English — free, ad-free, from a non-profit — and its store listing
credits "Reference and Courtesy of Sunnah.com". It reads offline, so whatever
they were granted covers bundling and not merely live API calls. That is the
same shape as this masjid's request.

**Channel:** a GitHub issue on `sunnah-com/api`, which is what their own page
asks for, or their contact form. Not a letter — do not post this one.

**What must be asked explicitly.** An API key is permission to *access*. It
is not automatically permission to *ship the text inside an app, offline*,
and it does not by itself settle the underlying translators' rights, which
are not sunnah.com's to waive. So ask all of it plainly, in one message:

> **Subject:** API access request — Taiyabah Masjid (Bolton, UK), a free
> congregational app
>
> As-salāmu ʿalaykum.
>
> I write for Bolton Central Islamic Society (registered charity 1041569),
> which runs Taiyabah Masjid in Bolton, United Kingdom. We publish a free app
> for our congregation — no advertising, no analytics, not sold — carrying our
> prayer timetable, the Qurʼan, the daily adhkār and the **Arabic** text of
> Ṣaḥīḥ al-Bukhārī.
>
> We deliberately reproduce no English. Each hadith links out to its English
> on sunnah.com, because we did not want to copy what we had not been given.
> We would like to do better by the many in our community who read English
> rather than Arabic, and your Developers page invites us to ask.
>
> Four questions, so that we assume nothing:
>
> 1. May we have an API key?
> 2. Would any grant extend to **including the English text in the app so it
>    reads offline**, or is it for live API access only? Our building has poor
>    signal, and offline is the point.
> 3. Is the offline dump of hadith data available now?
> 4. Whose permission, besides yours, do we still need? We understand the
>    English translations are the translators' and publishers' work, and we
>    would rather write to them as well than assume your grant covers them.
>
> We will display whatever credit line you ask for, on every hadith if you
> wish. We note that Greentech Apps Foundation credit "Reference and Courtesy
> of Sunnah.com" and would be glad to do the same.
>
> Jazākum Allāhu khayran for sunnah.com. It has served our community for
> years, and the link-out in our app points to you today.

Question 4 is the one not to drop. Answered honestly, it is also what tells
the masjid whether the two letters below are still needed.

---

## Letter 1 — Darussalam (the Muhsin Khan translation)

The translation by Dr Muhammad Muhsin Khan is the standard English Bukhārī and
the one sunnah.com serves. Darussalam publishes it.

> **Subject:** Permission request — Muhsin Khan translation of Ṣaḥīḥ
> al-Bukhārī in a free mosque app
>
> Dear Sir or Madam,
>
> I write on behalf of Bolton Central Islamic Society (registered charity
> 1041569), which runs Taiyabah Masjid in Bolton, United Kingdom.
>
> We have built a free application for our congregation. It carries our prayer
> timetable, the Qurʼan, daily adhkār and the Arabic text of Ṣaḥīḥ al-Bukhārī.
> It is free to download, carries no advertising, collects no analytics, and is
> not sold or monetised in any way.
>
> We would like to include Dr Muhammad Muhsin Khan's English translation of
> Ṣaḥīḥ al-Bukhārī alongside the Arabic, so that members of our community who
> do not read Arabic can benefit. The edition we mean is your Arabic–English
> set translated by Dr Khan, ISBN 9960-717-31-3, © Maktaba Dar us Salam 1997.
>
> We note that its copyright page reserves reproduction "in any form or by any
> means, electronic or mechanical ... or by any information storage and
> retrieval system, without written permission of the publisher or the
> translator". That is why we are writing rather than proceeding: at present
> the app links out to the translation online and reproduces none of it.
>
> We would be grateful to know whether Darussalam would grant permission for
> this use, and on what terms. We are glad to display any credit or copyright
> line you require, on every screen where the translation appears if you wish.
>
> If a licence fee applies, please let us know the amount and we will put it to
> our trustees.
>
> Jazākum Allāhu khayran for your consideration.
>
> Yours faithfully,
> *[name]*
> *[role]*, Bolton Central Islamic Society
> 31a Draycott Street, Bolton BL1 8HD · info@taiyabahmasjid.com · 01204 535 997

---

## Letter 2 — Aisha Bewley

Aisha Bewley has produced a complete English translation of Ṣaḥīḥ al-Bukhārī
and publishes it free on her own website. She has a long record of allowing her
work to be distributed freely, which makes this the more likely "yes" of the
two — but it still has to be asked, and the answer kept in writing.

> **Subject:** Permission request — your translation of Ṣaḥīḥ al-Bukhārī in a
> free mosque app
>
> Dear Ms Bewley,
>
> I write on behalf of Bolton Central Islamic Society (registered charity
> 1041569), which runs Taiyabah Masjid in Bolton.
>
> We have built a free application for our congregation, which includes the
> Arabic text of Ṣaḥīḥ al-Bukhārī. Many of our community read English rather
> than Arabic, and we would like to include your English translation beside the
> Arabic so that they can read it — including offline, which matters in a
> building with poor signal.
>
> The app is free, carries no advertising, no analytics and no tracking, and is
> not sold. We would display your name as translator on every hadith, and any
> copyright notice you ask for.
>
> We did not want to reproduce your work without asking, so at present the app
> links out rather than including any translation.
>
> May we have your permission? If there are conditions you would want attached,
> we would be glad to meet them.
>
> Jazāki Allāhu khayran for the service your translations have been to English
> speaking Muslims.
>
> Yours sincerely,
> *[name]*
> *[role]*, Bolton Central Islamic Society
> 31a Draycott Street, Bolton BL1 8HD · info@taiyabahmasjid.com · 01204 535 997

---

## If permission is granted

Send the reply through, and the translation can be bundled properly:

1. The text goes in its own pack beside the Arabic, keyed by hadith number
   (1–7563), so the two line up exactly.
2. The permission is recorded in `quran/hadith/bukhari/LICENCE.txt` alongside
   the Arabic's provenance — with who granted it, when, and on what terms.
3. A release check holds the translator's credit on screen, the same way the
   Arabic's provenance is held there now.
4. The English then reads inside the app, offline, and the link-out can stay as
   a way to see the hadith in its wider context.

## If permission is refused, or never answered

The link-out stands. It is not a workaround — it is the honest arrangement:
the masjid points at the translation rather than claiming it. Nothing about the
app misrepresents whose work it is.
