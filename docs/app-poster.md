# The download poster

`poster/taiyabah-app-poster.pdf` — A4 portrait, print-ready. A PNG of the same
artwork sits beside it for a WhatsApp group or a newsletter.

Rebuild it with:

```
node scripts/build-app-poster.mjs
```

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
write anything that does not fit: it checks the text column against the page,
the lower half against the page, that the feature list keeps 7mm of air above
the fold, and that the QR cards do not run into the footer. Each failure says
which part and by how much.

Two of those guards exist because the poster failed that way once. The
clearance check in particular: a column with bottom padding reports no
overflow until its content passes the padding as well, so the list can finish
0.7mm off the fold while every other check says the page is fine.

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
