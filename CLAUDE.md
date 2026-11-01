# Working on this repository

Standing rules for the Taiyabah Masjid website and app. These are the
masjid's decisions, not suggestions — they hold across every change.

## No faces

**No human face appears anywhere in the app or on the website.** Not in a
photograph, not in an illustration, not in an animation, not in a store
asset, not in a diagram. A picture that needs a person must have the face
blurred past recognition, or must not show the face at all.

Blurring is the preferred treatment where the picture is otherwise useful —
`hajj/ihram.jpg` is the worked example: a feathered ellipse over the face at
a blur radius heavy enough that no feature survives, soft enough that it
melts into the hair instead of reading as a rectangle somebody forgot.

There is no automated check for this and there cannot be a reliable one, so
it is on whoever adds the picture. Shipped raster images are few — the app
icons, the wordmark, the girih, the muṣḥaf pages and the Hajj pictures — so
auditing the whole set is a `git ls-files` away.

## No personal details in anything public

Never use a personal email address, anyone's name, or a home address in
code, commits, store listings, or anything else a reader could reach. The
public contact address is **support@ysbdesigns.uk**.

## The Hajj section asserts no fiqh

Every ruling in `hajj/content.js` is a draft until the `by` field names who
stands behind it. An entry without one is invisible, is held out of the app
bundle and the website's copy by the importer, and cannot open its branch,
whatever the release switch says.

**`by` records who takes responsibility.** Entries carry
`by: "Taiyabah Masjid"` because the trustees publish them on the charity's
authority. An entry opens because somebody has read those words and will be
named for them — never because the material came from a good source.

**No source is named on screen.** The trustee has asked that only Taiyabah
Masjid appear anywhere a reader can see, so the `source` field is gone from
every entry and the check that used to require one has been removed. The
header of `hajj/content.js` still records which published guides each branch
was drafted from, and that the permission question those raise has never been
recorded as settled. Do not delete that note: taking the attribution off the
screen did not change where the words came from.

Seven entries are still held, and all seven are the same kind of thing: their
bodies describe what the entry *ought to contain* rather than saying it —
"The practical table the ʿulamā should supply", "Still open", "Still blank",
"DRAFT FOR REVIEW." They are the three `dam` entries, `i-marry`,
`i-intimacy`, `i-w-hands` and `d-arafah`. Publishing one would put a note
meant for a scholar in front of a pilgrim. **Read the body before naming an
approver on it** — the field is easy to set and a check failure is not a
formality. That mistake has been made on this file already.

`docs/hajj-held-entries-for-the-ulama.md` is the sheet to hand the ʿulamā:
each of the seven, the question it is waiting on, and what is needed back.
Only one of them has proposed wording, and that is the one asserting no
ruling at all.

Everything else is live, including the five days of Hajj, which are drafted
from Islamic Relief's guide with the Ḥanafī positions kept from the Academy's
booklet, and which name three things inside their own text as the ʿulamā's to
settle.

A journey tag splits the two trips: anything may carry `journey: "hajj"` or
`journey: "umrah"`, and anything carrying neither belongs to both, which is
the common case. `native/src/hajj.js` owns that rule and every gate function
takes the journey, so no screen decides it alone.

Pictures in that section describe what they show and never which option
passes — `scripts/check-hajj.mjs` enforces all of this, and
`native/src/hajj-art.jsx` explains why.

## Before pushing

`cd native && npm run check` — the full gate, and it must be green.
`node scripts/check-everything.mjs` and `node scripts/check-back-button.mjs`
need `python3 -m http.server 8111` running from the repository root.

If a file in the service worker's `SHELL` changes — `index.html`,
`admin.html` and the rest of the list in `sw.js` — bump `CACHE` in the same
commit, or returning visitors keep the old copy.
