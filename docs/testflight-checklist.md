# Testing 2.0.2 build 2 on TestFlight

**Install build 2, not build 1.** Build 1 is in TestFlight and will install and
run perfectly well, but it shipped without the aps-environment entitlement, so
push is dead in it. Testing notifications on build 1 would tell you the whole
push setup is broken when it is not.

Internal Testing needs no Beta App Review — add yourself under TestFlight →
Internal Testing and the build appears once Apple finishes processing it.

---

## 1. Notifications — the one that matters most

This is the first iOS build that could ever have worked. The entitlements are
verified correct and OneSignal is configured, but nothing has yet proved the
whole chain end to end on a real phone.

- [ ] On first launch, the app offers to turn on jamaat reminders. Accept it,
      and check iOS raises its own permission dialog. That dialog can only be
      raised once, so if you decline it you will need to re-enable under
      iOS Settings → Taiyabah Masjid → Notifications.
- [ ] Send a test from the OneSignal dashboard and confirm it arrives.
- [ ] Wait for a real jamaat reminder and confirm it arrives **and** that it
      arrives at the right time. On Android these run roughly 40 seconds late;
      whether iOS does the same is unknown. Note the actual gap between the
      notification and the adhan.
- [ ] Lock the phone and confirm a notification still arrives. A push that only
      works with the app open is not a push.

## 2. Things with open questions against them

- [ ] **Mushaf pinch-zoom.** Never confirmed on real hardware. Open the Qur'an,
      pinch to zoom, check it zooms smoothly and can be panned while zoomed.
- [ ] **The "top banner sticks" report.** Nobody has pinned down which screen
      this was on. If it happens, note the screen and whether you had scrolled.
- [ ] **Qibla.** Cannot be tested on a simulator at all — there is no
      magnetometer. Check it points somewhere plausible (from Bolton, roughly
      south-east) and that it settles rather than spinning.
- [ ] **Listen live.** Check audio starts, and that it keeps playing when you
      lock the phone or switch apps.

## 3. Things recently changed that deserve a look

- [ ] **The tab bar.** Its height and the bottom safe area were reworked.
      Check nothing is clipped, and that the offline bar — turn on aeroplane
      mode — sits above the tab bar rather than behind it.
- [ ] **Offline.** With aeroplane mode on, prayer times, the Qur'an, the
      adhkar and the Qibla should all still work. Turn the connection back on
      and check the offline bar goes away by itself.
- [ ] **Donations.** The link opens in Safari rather than in the app. Check it
      opens, and that returning to the app leaves it where you were.

## 4. Worth a sweep

- [ ] Every tab, and every tile on the home screen, opens something.
- [ ] Switch language to Urdu or Arabic and check the layout flips
      right-to-left properly, then switch back.
- [ ] Increase text size and check the prayer times stay readable rather than
      overlapping.
- [ ] Dark theme.
- [ ] On an iPad if you have one — the app is offered on iPad, so Apple will
      review it there.

---

## If something is wrong

Note the screen and what you did. A crash is worth reporting even without
detail: crash reporting is wired up, so the report should reach Supabase by
itself, and the build is the first iOS one anybody has ever run.

Fixing anything means a new build and a new build number — 2.0.2 (3). Apple
permanently consumes a build number on upload, so numbers only ever go up.
