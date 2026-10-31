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

**`by` records who takes responsibility, not who wrote the source.** The
entries are the masjid's own restatements of the Islāmic Daʿwah Academy's
*How to Perform ʿUmrah*; they carry `by: "Taiyabah Masjid"` because the
trustees publish them on the charity's authority. Do not put a scholar's
name on wording that scholar has not read — the screen says what the
guidance follows, and that is the honest claim.

Nineteen entries are still held, and they fall into two kinds.

**Briefs, not guidance.** Some entries' bodies describe what the entry ought
to contain rather than saying it — "The practical table the ʿulamā should
supply", "Still blank", "DRAFT FOR REVIEW." Publishing one would put a note
meant for a scholar in front of a pilgrim. These are the three `dam` entries,
`i-marry`, `i-intimacy`, `i-w-hands`, `i-w-hayd`, `d-arafah`, and the five
`o-` entries. **Read the body before naming an approver on it** — the field is
easy to set and a check failure is not a formality. That mistake has been made
on this file already.

**The six days of Hajj** (`r-h-*`), which the ʿUmrah booklet never covered and
four of which were never written. A day-by-day guide missing four of its days
is worse than no guide.

The iḥrām branch is open. Ten of its entries carry `by: "Taiyabah Masjid"`;
the seven above stay held, and the two sections left with nothing in them —
"What is still fine" and dam — are dropped by `visibleSections()` rather than
drawn as empty headings. Asides addressed to reviewers ("The ʿulamā should say
plainly which sandals pass…") were removed from the published ten; the rulings
themselves were not touched.

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
