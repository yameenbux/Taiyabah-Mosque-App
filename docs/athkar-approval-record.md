# The adhkār and duʿās: approval record

Every supplication the app and the website publish — 142 of them — is listed
in full in `docs/athkar-for-review.docx`, for two ʿulamā to read
independently and sign.

This file is the record of what has been approved, by whom, and when. It is
for people. `docs/athkar-approved.json` is the same thing for the build.

---

## Why there is a process at all

The app used to carry a line at the foot of the Adhkār screen:

> Wording varies between narrations and printings. Confirm this set with the
> imam before treating it as settled.

That is a note to the masjid, printed where the congregation reads it. It
asked somebody who had opened the app to say their morning adhkār to go and
verify them first — which nobody does — and it quietly said the masjid would
not stand behind the words on its own screen.

It has been removed. Removing it is only an improvement if the confirming
actually happens, and this is the confirming.

It is the same principle `CLAUDE.md` sets for the Hajj section: material is
held until somebody will be named for it, and published plainly once they
will.

---

## How it works

**1. Generate the sheet.** Never write it by hand.

    node scripts/build-athkar-review.mjs

Reads `native/src/data/*.json` — what the app actually ships — and writes
`docs/athkar-for-review.docx`: every entry with its Arabic, transliteration,
English, count and reference, a column beside each for the reviewer's mark,
and a sign-off page per part.

A document transcribed by hand reviews a copy of the text rather than the
text, and the two drift the first time either is edited.

**2. Two ʿulamā read it independently.** Independently is the point. Two
people who agree separately are worth more than two who agree together. Each
part may be approved on its own.

**3. Make the amendments, and send them back.** Anything marked goes back to
both reviewers before it is published. A correction nobody checked is a new
unapproved entry.

**4. Record the approval.**

    node scripts/check-athkar-approved.mjs --record "First ʿālim" "Second ʿālim"

This fingerprints every entry as approved, into `docs/athkar-approved.json`.

**5. Keep the signed paper**, dated, in the masjid's own records. The
fingerprint proves the words have not moved; the paper proves who agreed to
them. Neither replaces the other.

---

## What happens afterwards, which is the point

`scripts/check-athkar-approved.mjs` runs in the gate. Once an approval is
recorded, any change to an approved entry fails the build and names it:

    CHANGED  athkar/morning-evening/1  (Morning & Evening)
    ADDED    duas/day/8  (Through the Day — On leaving) — never reviewed

The only way past is a fresh signature and a fresh `--record`.

This is what stops the ordinary accident: somebody fixes a typo in an āyah in
good faith eighteen months from now, and the masjid publishes words two
ʿulamā never saw while believing it publishes words they did. Approval that
expires on edit, rather than on trust.

Before any approval is recorded the check passes and says plainly that the
supplications are published unapproved. It is a record, not a reprimand.

---

## Where the text comes from

Worth having to hand when a reviewer asks.

| | |
| --- | --- |
| Qurʼanic passages | Taken from the masjid's own machine-checked IndoPak Qurʼan data — Āyat al-Kursī, the muʿawwidhāt, the end of al-Baqarah, the forty Rabbanā. Not retyped. |
| Adhkār and duʿās from hadith | The masjid's own renderings, written for this app, with the collection named on each. |
| English | A plain meaning for someone who does not read Arabic. No published translation is reproduced. |

---

## Two questions put to the reviewers

Both are in the document, and both want an answer in writing.

1. **Part C, the forty Rabbanā, has no English at all** — Arabic and sūrah
   reference only. Should that stand, or should a meaning be added before it
   continues to be published?

2. **The counts and the virtues** — "Once, morning and evening", and the
   notes under some adhkār about what reciting them brings — are shown to the
   reader as statements of fact, and should be checked as carefully as the
   wording.

---

## Record

| Issued | Parts | Reviewers | Approved on | Notes |
| --- | --- | --- | --- | --- |
| 2026-11-11 | A, B, C (142 entries) | *awaiting* | — | First issue. Generated from the data as it shipped in 2.1.0. |

Add a row each time the document is reissued. If a part is approved while
another is still out, say so — partial approval is expected and is better
than waiting for all three.
