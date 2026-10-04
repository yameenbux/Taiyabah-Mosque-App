# The native app

React Native, built with Expo. This is the rebuild that replaces the Trusted
Web Activity — a real app rather than a browser in a costume.

**The web app stays live and maintained** until this one is better than it.
Nothing here is on the Play listing yet.

## Why React Navigation rather than Expo Router

Expo Router's static export renders routes on a server first, and that step
fails here. The fix needs `expo install --fix`, which cannot run because this
environment blocks Expo's API. React Navigation is the layer Expo Router wraps
anyway, it is what most production apps use directly, and it has no
server-rendering step to break.

## What carries over from the web app, unchanged

The whole back end: Supabase, the Cloudflare worker, Stripe, OneSignal. The
content too — the Qur'an, the athkār, the duʿās, and 2035 translated strings
are all data, and all portable.

`src/data/timetable-2026.json` is a copy of the web app's own timetable, so
the two cannot disagree about when Maghrib is.

## Seeing it without a phone

There is no Android SDK in this environment, so the APK is built in CI. For
looking at the work:

```sh
npx expo export --platform web --output-dir dist
cd dist && python3 -m http.server 8123
```

React Native for web is the same component tree and the same styles, so it is
honest about layout and type. It is not a substitute for a device when judging
scroll feel or gesture handling.

## Where it is up to

- [x] step 1 — shell: native tab bar, brand palette, real brand faces, haptics
- [x] step 2 — home screen and the prayer engine, off the committee's timetable
- [ ] step 3 — notices, notifications, the More menu
- [ ] step 4 — Qur'an, athkār, Bukhārī, duʿās
- [ ] step 5 — nikāḥ, funeral, hall booking, zakat, donations
- [ ] step 6 — madrasah portal
- [ ] step 7 — the four languages throughout
