# The two store badges

Apple's and Google's own artwork, downloaded unmodified from the places each
company publishes it for exactly this purpose — telling people an app is on
their store.

| File | From | Fetched |
|---|---|---|
| `app-store.svg` | `toolbox.marketingtools.apple.com` — Apple's Marketing Tools, "Download on the App Store", black, en-GB/US | 2026-11-12 |
| `google-play.png` | `play.google.com/intl/en_us/badges/…/en_badge_web_generic.png` — Google's generic web badge | 2026-11-12 |

**Do not redraw, recolour, crop or restyle either of them.** Both are
trademarks, both companies' guidelines require the badge as supplied, and a
hand-made lookalike is both a trademark problem and obvious to anybody who
has seen the real one. If a badge needs to be a different size, scale it
whole.

The Play badge ships with its required clear space inside the image and has a
visible outline; Apple's does not and is tight to its own edge. They are
therefore sized separately in `scripts/build-app-poster.mjs` so that the two
read as the same size on the page, which is what Apple's guidelines ask for
when badges appear together.

Apple's guidelines: <https://developer.apple.com/app-store/marketing/guidelines/>
Google's: <https://play.google.com/intl/en_us/badges/>
