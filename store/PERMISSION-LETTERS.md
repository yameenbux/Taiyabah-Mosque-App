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
| `SENODROOM/sahih-al-bukhari` | AGPL-3.0 | Names **no translator at all** — "by reputable Islamic scholars". AGPL is a software licence; it says nothing about the text. 7,277 hadith, so it does not even match the standard numbering the app cites. |
| `halimbahae/hadith` | ODbL + DBCL | Database licences. The Database Contents Licence exists precisely to say that rights in the individual contents are a separate question — it is an admission, not a grant. |
| LK Hadith Corpus (Leeds / King Saud) | no licence file | An academic corpus that asks to be cited in a paper. A citation request is not a redistribution grant, and the English provenance is not stated. |
| Aisha Bewley's own site | no licence published | Genuinely her own work and free to read, but marked **"Revision in progress"**, with no permission statement anywhere on it. |

**Free to read is not free to copy.** That is the whole of it. sunnah.com is
the same case and says so plainly in its own terms: it does not permit
scraping, nor mass reproduction of entire books or collections, while
permitting individual hadith or selections for teaching.

**The unattributed ones are worse, not better.** The committee asked, in the
same note, for the source and reference to be identified and for the
authenticity of what is shown to be verifiable. A dataset that will not name
its translator fails that test before the licensing question is even reached.
The masjid cannot stand behind words when it cannot say who rendered them.

So there are two honest routes, and only two: ask, or write our own. The
letters below are the first. If both are declined, the second is the masjid's
own ʿulamā translating a chosen subset — the hadith actually used in khuṭbahs
and madrasah — which needs nobody's permission, and which is the same model
the Hajj section already runs on.

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
> do not read Arabic can benefit. At present the app links out to the
> translation online rather than reproducing it, because we did not wish to use
> your work without asking.
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
