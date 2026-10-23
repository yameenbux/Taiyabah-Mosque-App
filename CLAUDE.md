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

Every ruling in `hajj/content.js` is a draft until a scholar's name is in
its `by` field. An entry without one is invisible and cannot open its
branch, whatever the release switch says. Pictures in that section describe
what they show and never which option passes — `scripts/check-hajj.mjs`
enforces both, and `native/src/hajj-art.jsx` explains why.

## Before pushing

`cd native && npm run check` — the full gate, and it must be green.
`node scripts/check-everything.mjs` and `node scripts/check-back-button.mjs`
need `python3 -m http.server 8111` running from the repository root.

If a file in the service worker's `SHELL` changes — `index.html`,
`admin.html` and the rest of the list in `sw.js` — bump `CACHE` in the same
commit, or returning visitors keep the old copy.
