# The download poster

Five sheets, A4 up to A0, all print-ready, plus a PNG of the same artwork for
a WhatsApp group or a newsletter. `taiyabah-app-poster.pdf` without a size in
the name is the A4 one.

```
node scripts/build-app-poster.mjs            # the five trimmed sheets
node scripts/build-app-poster.mjs --bleed 3  # the same, with 3mm trim bleed
```

The bleed set is not committed — printers who want it can have it in one
command, and five more PDFs of identical artwork is not worth the repository
weight.

## The sizes, and what each is for

| | Sheet | Headline cap height | Smallest type | Screenshot | Play badge |
|---|---|---|---|---|---|
| **A4** | 210×297 | 6.9mm | 2.0mm | 392 dpi | 393 dpi |
| **A3** | 297×420 | 9.7mm | 2.9mm | 277 dpi | 278 dpi |
| **A2** | 420×594 | 13.7mm | 4.1mm | 196 dpi | 196 dpi |
| **A1** | 594×841 | 19.4mm | 5.7mm | 139 dpi | 139 dpi |
| **A0** | 841×1189 | 27.5mm | 8.1mm | 98 dpi | 98 dpi |

The build prints this table every time, so it is measured rather than
remembered.

**Every size is the same artwork, scaled.** The design is drawn once at A4 and
each larger sheet renders it inside a 210×297mm box scaled by `width / 210`.
That is the whole reason the big sizes can be trusted: an A1 is
mathematically the A4 that was checked, so it cannot reflow, cannot drop a
line, and cannot need re-tuning. Five separate layouts would be five things to
keep in step and five chances for one to drift.

ISO A sizes are not exactly √2 apart, so the scaled artwork misses the sheet
by up to a millimetre at the foot. That millimetre is empty cream and is
clipped; it is not worth correcting.

**On the two bitmaps.** Type, the logo and both QR codes are vector and scale
without limit. The home-screen picture is 1080px wide and Google's Play badge
is 646px — the only size Google publishes — so those two set the ceiling. At
A2 and below they are comfortably above 150 dpi. At A1 and A0 they are 139 and
98 dpi, which is normal for sheets that size: an A0 is read from two or three
metres, where 100 dpi is indistinguishable from 300. If a sharper A0 is ever
wanted, the screenshot is the one to replace, and it needs a higher-resolution
device rather than an upscale.

## What it is made of

| Part | Lives in |
|---|---|
| The words | `scripts/lib/app-poster-content.mjs` |
| The two store links and their QR matrices | `scripts/lib/app-poster-qr.mjs` |
| The home-screen picture | `docs/store-assets/poster/app-home.png` |
| Layout, type and artwork | `scripts/build-app-poster.mjs` |
| The logo | `logo.svg`, the repository's own |
| The typefaces | `native/assets/fonts/*.ttf`, embedded whole |

Nothing is fetched at build time and nothing is linked from the PDF, so it
renders the same at a print shop that has none of it installed.

## Changing the wording

Edit `scripts/lib/app-poster-content.mjs` and rebuild. The builder refuses to
write anything that does not fit. It checks, in order:

- the kicker is one line and does not orphan a word;
- the text column does not overflow the page;
- the lower half does not overflow the page;
- the feature list keeps 7mm of air above the fold;
- the QR cards do not run into the footer;
- **each sheet is drawn at the scale it is meant to be, and fits one page.**

Each failure names the part and the amount, and nothing is written.

Four of those exist because the poster failed that way first, and three of the
four passed every other check while failing:

- the text column overflowed A4 by 46px;
- the feature list finished **0.7mm** off the fold while `scrollHeight`
  reported no overflow at all — a column with bottom padding does not report
  overflow until its content passes the padding too;
- an **A0 came out as three pages** with the artwork unscaled in the middle of
  the first, because a page size pinned in CSS quietly beats the one the
  renderer asks for — and nothing was looking at the finished sheet, only at
  the A4 layout it was made from;
- the kicker began wrapping the moment the text column was narrowed.

The last guard is negative-tested: pin the scale to 1 and the build stops.

## Changing a link

The QR matrices are written out module by module rather than encoded at build
time. A QR encoder is several hundred lines of Reed–Solomon, mask scoring and
version tables, and one wrong bit anywhere in it gives you a code that still
looks like a code and sends people somewhere else. On something that gets
printed and stuck on a wall, that is not a bug anybody catches in time.

So the matrices are produced once, by a tool, and read back by a different
tool before they are committed:

1. In a scratch directory **outside this repository**:
   `npm install qrcode jsqr`
2. Encode the URL with `qrcode` at error-correction level **Q**.
3. Render the modules to a pixel buffer with a four-module quiet zone.
4. Decode that buffer with `jsqr` and assert the string that comes back is
   **exactly** the URL you put in.
5. Only then write the rows into `scripts/lib/app-poster-qr.mjs`.

Neither package is a dependency of this repository, on purpose: the verified
output is what ships. Level Q carries 25% redundancy, which is what lets a
code survive being printed small, photocopied, or read at an angle in a badly
lit foyer — all three were tested by rasterising the finished PDF down to
72dpi and decoding it again.

`scripts/check-app-poster.mjs` runs on every gate. It cannot tell you a code
carries the right URL — only a decoder can, and that happens here — but it
proves the three finder patterns, both timing patterns and the dark module are
intact, which catches a matrix mangled by a merge, and it fails if the PDF on
disk was built from older words, links, matrices or screenshot.

## The web address is not on it

There is a third way to open this app and it is deliberately absent. That host
is a working address for building and testing, not somewhere to send the
congregation, and it has been obsolete as a way in since the Android and iOS
apps shipped. Do not add it back.

## Refreshing the screenshot

`docs/store-assets/poster/app-home.png` is the home screen as the Android
smoke run photographed it on a real emulator — crop `02-home.png` from the
`smoke-screens-*` artifact of a green `native-smoke` run, dropping the black
system navigation bar at the foot.

The hero deliberately crops the device off the bottom of the page. A phone
screen is taller than any crop of it, so a screenshot shown whole ends on a
half line of body text that reads as a mistake; cut by the layout, it reads as
a screen that carries on, which is what it is. `padding-top` on `.phone`
decides where that cut lands.

## Nobody's face is on it

And none may be added. See `CLAUDE.md`.
