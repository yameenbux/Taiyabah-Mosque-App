# The holiday planner: how it is built, and what the committee is signing

`planner/` holds three files, all generated, none written by hand:

| | |
| --- | --- |
| `taiyabah-holiday-planner-2026-27.pdf` | A4 landscape, one page. The sheet to print. This is what both apps and the website link to. |
| `taiyabah-holiday-planner-2026-27.png` | The same sheet as an image, 2×, for anyone who cannot open a PDF. |
| `taiyabah-holiday-planner-2026-27-card.png` | A tall card, 1080 wide — the two lists, no grid. For saving to a phone and forwarding. |
| `planner.json` | Not for reading. What the sheet was built from, so the gate can tell when it has gone stale. |

    node scripts/build-holiday-planner.mjs

---

## Why it is generated and not designed

A planner is read for its dates, and a date that is wrong is worse than no
planner at all, because a parent books flights around it. So nothing here is
typed, drawn or image-generated. Every closure, every Islamic date and every
shaded square comes out of `native/src/madrasah-data.js` — the same file the
app's Holidays screen and the website's planner sheet read.

That is also why the sheet matches the screen rather than merely resembling
it: Monday-first weeks, a closed day as a soft terracotta wash rather than a
solid block, muted weekends, gold-ringed Islamic dates. A parent who checked
a date on their phone and then checked it on the wall should not have to work
out whether they are looking at the same thing.

Two things the builder refuses to do:

- **Ship a sheet that does not fit.** The side panel is a fixed 75mm beside a
  fixed page. The first draft ran six Islamic dates off the bottom edge — no
  error, no warning, a PDF that looked finished and had lost a third of its
  content under the footer. The page now measures itself and the build stops
  rather than writing a clipped file.
- **Ship a sheet nobody can reach.** The filename carries the year, so every
  link to it is a hostage to the next madrasah year. The gate reads the app's
  `PLANNER` const and the website's `href` and fails if either stops naming
  the file that was actually built.

## Why the gate watches it

`scripts/check-holiday-planner.mjs` runs inside `cd native && npm run check`.
It recomputes a fingerprint of the madrasah data and compares it with the one
stamped into `planner.json` when the sheet was built, naming what moved:

    CHANGED  closure  summerht     (Summer Half Term)
    ADDED    event    mawlid-1449  (not on the printed sheet)

The fix is always a rebuild, committed in the same change. Without this, the
ordinary accident is certain: somebody corrects a date in the data eighteen
months from now, the screen updates, and the sheet on the fridge — and the
file still being served to every new download — quietly says something else.

**What it cannot see** is whether the dates are *right*. It checks only that
the sheet and the app agree. Both can be wrong together, and on two points
they may be — see below.

---

## For the committee

The sheet is generated, so there is no wording to correct on the sheet
itself: everything on it is either the masjid's own data or fixed furniture.
What wants approving is **the data**, and these two questions in particular
were raised when it was drawn:

**1. Mawlid an-Nabi ﷺ is dated 25 August 2026.** The madrasah year opens on
1 September 2026, so this falls a week *before* the year starts — and Mawlid
1449 lands in mid-August 2027, which is inside the year. It looks like it is
a year out. It appears on the planner with its full year shown, so nobody can
mistake it for an in-year date, but it is on the Holidays screen in the app
today as well.

**2. Eid al-Adha is dated 16 May 2027; the closure runs 17–18 May.** So Eid
day itself is not a madrasah closure day. That may well be deliberate. It is
listed here because it reads oddly on the sheet and somebody will ask.

Neither has been changed. Both are the madrasah's to settle.

## Record

| Issued | Sheet | Approved by | Date | Notes |
| --- | --- | --- | --- | --- |
| 2026-11-11 | 2026/27 | *awaiting* | — | First issue. 8 closures, 10 Islamic dates. |

Add a row each time the sheet is reissued. Rebuilding changes the `Issued`
stamp in the footer, so a printed copy can always be matched to a row here.
