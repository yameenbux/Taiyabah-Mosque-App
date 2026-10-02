# Licence

**Taiyabah Masjid** — the app of Bolton Central Islamic Society, registered
charity 1041569, 31a Draycott Street, Bolton BL1 8HD.

Copyright © 2026 Yameen Bux. **All rights reserved.** This is not open source.

Ownership is split, and the distinction matters.

---

## Owned by Bolton Central Islamic Society (Taiyabah Masjid)

- The Taiyabah Masjid name, the wordmark and the logo
- The prayer timetable and every prayer time in it
- All masjid content — its history, photography, announcements, service
  details, rates, contact and campaign information
- Every record created through this app: hall bookings, nikāḥ date requests,
  requests for the imam's advice, charity collection requests and notices.
  These are the charity's records and the charity's responsibility under the
  UK GDPR, not the developer's.

## Owned by Yameen Bux

- The source code, in full
- The interface and visual design, the layout and the component structure
- The timetable parsing and verification pipeline
- The notification architecture and the Cloudflare Worker
- The release-check suite
- All original written content authored for this app

## The charity's licence

Bolton Central Islamic Society holds a **perpetual, irrevocable,
royalty-free licence** to use, host and operate this application for the
purposes of the masjid and its community — including engaging any other
person or company to maintain, host or further develop it on the charity's
behalf.

That licence covers **use of this app**. It does not transfer ownership of
the code or the design, and it grants no right to reuse either anywhere else.

## Everybody else

No permission is granted to any other person or organisation to copy, reuse,
redistribute or redeploy this code or this design, in whole or in part —
**including for another masjid**. If you are a masjid who wants something like
this, ask; do not fork it.

---

## Third-party content, which this licence does NOT cover

Some of what this app ships is not ours to license, and each piece carries its
own terms. Nothing above applies to any of it.

| What | Where | Terms |
| --- | --- | --- |
| **Ṣaḥīḥ al-Bukhārī**, Arabic text and book structure | `quran/hadith/bukhari/` | The Unlicense — a dedication to the public domain. `quran/hadith/bukhari/LICENCE.txt` records the provenance anyway, and the app prints it on screen. |
| **The 13-line Indo-Pak mus-haf**, 848 page images | `quran/mushaf/indopak13/` | Source and licence are named in that folder's `index.json`, and a release check refuses to render a pack that does not name them. |
| **The typefaces** — Fraunces, Hanken Grotesk, Amiri, Noto Naskh Arabic | `fonts/` | SIL Open Font License 1.1. Full text and each family's copyright line in `fonts/OFL.txt`. |
| **Qur'anic text** | `quran/surahs/` | The text of the Qur'an itself. The app's rendering of it is ours; the revelation is not. |

**No English translation of any hadith is bundled**, deliberately. Every
complete English Bukhārī in circulation is a modern work still in copyright,
whatever licence a dataset attaches to it, and a repository cannot give away
rights it never held. Each hadith links out to its English on sunnah.com
instead. Linking is not copying.

---

## Warranty

Provided as is, with no warranty of any kind. Prayer times are the masjid's
own published timetable and are shown in good faith; the printed board at the
masjid is the authority.
