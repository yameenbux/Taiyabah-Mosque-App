# Promo shots — mobile

Four-shot set. Three are here; the fourth has to come off a real phone.

| # | Shot | File | How |
|---|---|---|---|
| 1 | Prayer times, home screen — the hero | `1-home.png` | Captured from the running app |
| 2 | Push notification on the lock screen | **missing** | Must be taken on a real device — see below |
| 3 | Qibla compass mid-use, needle visible | `3-qibla.png` | Captured; heading fed in as a DeviceOrientation event |
| 4 | Zakat calculator with figures entered | `4-zakat.png` | Captured; metal prices stubbed |

All 1080 × 2400, from `capture.mjs`. Re-run with the app served on port 8111.

## Two things that are simulated, and why

**The compass heading.** A browser has no magnetometer, so `capture.mjs` dispatches a
real `deviceorientationabsolute` event and the app's own handler computes and draws
the needle. The rendering is genuine; only the sensor reading is fed in. The bearing
of 118° and the 5,042 km to Makkah are the app's real calculation from the masjid's
coordinates.

**The metal prices.** The price services are unreachable from the build sandbox, so
gold, silver and the USD→GBP rate are stubbed at plausible values ($2,650/oz,
$31/oz, 0.78). The nisab, the totals and the 2.5% are all the app's own arithmetic
from those inputs, and they add up on screen. If you want true prices in the shot,
run `capture.mjs` with the three `ctx.route` lines removed, on a machine that can
reach the internet.

## Shot 2 — how to take it

It cannot be produced here, and it should not be mocked: the whole point of that
image is that it proves push actually works, so a made-up one would be worth less
than nothing. From a phone:

1. Open the app on the phone and turn prayer reminders on. Accept the permission.
2. From `admin.html`, send a test notice — or wait for a jamāʿah reminder to fire.
3. Lock the phone. When the notification lands, screenshot the lock screen.
   - iPhone: side button + volume up.
   - Android: power + volume down.
4. A banner over the app also works, but the lock screen reads better: it shows the
   time and date, and makes clear the app is not open.

Worth doing for the janāzah case specifically — a real notice, real wording — since
that is the one that shows what the app is actually for. Take two or three and pick
the cleanest.
