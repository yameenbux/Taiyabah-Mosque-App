# Roadmap — getting to 9/10 on every front

Written 6 October 2026, after the screen-parity sweep. The scores below are
from the assessment of the app as it stands at commit `c519a49`: 23 screens,
8,346 lines of app source, 4 languages, 43MB APK, Android only.

**The bar is 9/10 on every front.** Not 9 on the weak ones and 6 on the rest —
every row in the table below reaches 9 before this is considered finished.

| Front | Oct 6 am | Oct 6 pm | Now | Target | What is still in the way |
|---|---|---|---|---|---|
| Content & substance | 9 | 9 | 9 | 9 | — |
| Design & craft | 8.5 | 8.5 | **9** | 9 | dark mode, the iPad column and iPad landscape all done |
| Internationalisation | 7 | 7.5 | **8** | 9 | three native speakers reading what is already queued for them |
| Accessibility | 3 | 8 | 8 | 9 | a TalkBack pass on a handset — twenty minutes of a person |
| Engineering quality | 6 | 8 | **8.5** | 9 | 43 tests, 12 checks, each proven to bite; no component tests |
| Robustness | 7 | 7 | **9** | 9 | boundary, crash reporting and global offline detection all in |
| Security & privacy | 8.5 | 8 | **8.5** | 9 | the write path is closed; the two orphaned views and leaked-password protection are still open, and both are yours to action |
| Performance & size | 6.5 | 6.5 | **8.5** | 9 | icon font 432KB→16KB, Qurʼan parse 2276KB→174KB worst case; Amiri is 377KB and is the next one |
| Platform coverage | 4 | 4 | **6** | 9 | iOS compiles and runs on a simulator and the iPad layout is real — but nobody can install it until Apple approves the account |
| Operational sustainability | 4 | 8 | 8 | 9 | the committee uploading the 2027 timetable — an act, not code |
| Store readiness | 7 | 7 | **8** | 9 | the Data safety answers are written out; filling the form is a Play Console task |

**Nothing is below 7 any more.** The two fronts that were — platform coverage
at 4 and performance at 6.5 — are at 6 and 8.5.

**The five points that remain are not code.** Three native speakers, twenty
minutes with TalkBack on a real phone, an Apple Developer account, the
committee uploading next year's timetable, and two clicks in the Supabase and
Play consoles. Every one of them needs a person or an account, and no amount
of further work in this repository moves them.

Re-scored at the end of 6 October 2026 against measured evidence: counts from
`npm run check` and `npm test`, file sizes from the files, i18n from
`check-i18n.mjs`, security from Supabase's advisors, and the iOS claims from a
macOS runner that actually compiled it.

---|---|---|---|---|
| Content & substance | 9 | 9 | 9 | — |
| Design & craft | 8.5 | 8.5 | 9 | tablet layout, landscape — both also count under platform |
| Internationalisation | 7 | 7.5 | 9 | native-speaker review of ur/gu/ar; 11 keys still English in Urdu (was 45) |
| Accessibility | 3 | 8 | 9 | a TalkBack pass on a handset — needs a person, not a commit |
| Engineering quality | 6 | 8 | 9 | 31 tests and 11 checks, each proven to bite; no component or integration tests |
| Robustness | 7 | 7 | 9 | **still no global offline detection** — confirmed, NetInfo appears nowhere |
| Security & privacy | 8.5 | 8 | 9 | an ERROR-level advisory: `notices_live` and `hall_availability` are still SECURITY DEFINER **views**, orphaned now the app calls the functions; leaked-password protection still off |
| **Performance & size** | 6.5 | **6.5** | 9 | untouched: 432KB of icon font for 15 glyphs, 2.28MB of Qurʼan JSON parsed on the JS thread |
| **Platform coverage** | 4 | **4** | 9 | untouched: Android only, `supportsTablet: false`, no iOS target |
| Operational sustainability | 4 | 8 | 9 | the 2027 timetable still has to be uploaded by the committee — an operational act, not code |
| Store readiness | 7 | 7 | 9 | untouched: Data safety form (location + notifications), staged rollout, listing assets |

**Below 7: two fronts, and both are untouched rather than half-done.**
Platform coverage at 4 and Performance & size at 6.5. Everything else has
moved or was already at or above 7.

Re-rated 6 October 2026 against measured evidence rather than memory: the
check and test counts come from `npm run check` and `npm test`, the icon font
and Qurʼan sizes from the files themselves, the i18n figures from
`check-i18n.mjs`, the absence of offline detection from a search of `src/`,
and the security row from Supabase's own advisors.

---|---|---|---|
| Content & substance | 9 | 9 | — |
| Design & craft | 8.5 | 9 | dark mode, tablet, landscape |
| Internationalisation | 7 | 9 | native-speaker review of ur/gu/ar; 45 keys still English per language |
| **Accessibility** | **3** | **9** | labels, roles, font-scale cap, TalkBack/VoiceOver pass |
| Engineering quality | 6 | 9 | no tests at all; 12 pure functions with date/money arithmetic untested |
| Robustness | 7 | 9 | boundary and crash reporting done; still no global offline detection |
| Security & privacy | 8.5 | 9 | leaked-password protection off; 28 anon-executable definer functions to keep audited |
| Performance & size | 6.5 | 9 | 436KB icon font for 15 icons; 2.3MB JSON parsed on the JS thread |
| **Platform coverage** | **4** | **9** | Android only — iOS is roughly half the congregation |
| **Operational sustainability** | **4** | **9** | timetable is a bundled 2026-only file; breaks 1 Jan 2027 |
| Store readiness | 7 | 9 | Data safety form, staged rollout, listing assets |

---

## iOS — a separate build, not a port

**Status at the end of 6 October: it compiles, it runs, and it is waiting on
Apple.** A macOS runner built it unsigned for the simulator — `** BUILD
SUCCEEDED **` — which proves the project generates, every native module
compiles, and the app launches. None of that needed a developer account,
because signing is only required to reach a real device or TestFlight.

Done:

- **Separate from Android.** `.github/workflows/ios-build.yml`, its own
  trigger, its own artefacts. It is the only job in the repo that cannot run
  on ubuntu, which is the reason it is its own file. Nothing in it can hold
  up an Android release.
- **`scripts/ios-shots.mjs`** boots an iPhone and an iPad, installs, launches,
  waits, photographs, and then checks the process is STILL RUNNING and that no
  crash report was written — because "it compiled" and "it opens" are
  different claims, and a white screenshot and a dead process look identical.
- **iPad is real, not a stretched phone.** `supportsTablet` is `true` and
  behind it is the website's own `max-width: 520px; margin-inline: auto`,
  which the app had never implemented because a phone is narrower than the
  cap. Portrait and landscape both. The phone render is byte-identical.
- **Entitlements and Info.plist**, validated by running prebuild rather than
  by reading the docs: `aps-environment`, an App Group for the widget and the
  Watch, `remote-notification` beside the audio background mode,
  `NSMotionUsageDescription` (iOS refuses the magnetometer without it and the
  compass would simply never move), and `ITSAppUsesNonExemptEncryption`, which
  App Store Connect asks on every upload until it is answered here.

Written but NOT wired in, and blocked on the account rather than on effort:

- **The widget** (`targets/widget/index.swift`). Complete and reviewed: one
  timeline entry per prayer so iOS redraws at the right minute with no network
  and no battery cost, London's clock read explicitly, sunrise deliberately
  excluded because it is not a jamāʿah, and an honest "not published yet" when
  the timetable runs out. The same target's accessory families are the Watch's
  complications, so one piece of code serves both.
  `@bacons/apple-targets` requires `ios.appleTeamId`, which the Developer
  account issues. There is also a project-format problem to settle on a
  machine with Xcode: the plugin wires the target with a
  `PBXFileSystemSynchronizedRootGroup`, which needs objectVersion ≥ 70, and
  Expo SDK 52 generates 46.
- **Push.** The entitlement, the background mode and OneSignal's Notification
  Service Extension are all in place and verified. APNs needs a key issued by
  the account, so it cannot be tested before enrolment — by anyone, not just
  from here.

Still open, and worth deciding before the account arrives:
- Watch app: standalone (its own timetable copy, works on a walk to the masjid
  without the phone) or companion? Standalone is more work and much better.
- Does the Watch get the qibla compass? The hardware is there.

---

## Tier 1 — blocking a wide rollout

1. **Move the timetable to Supabase**, bundled file as the offline fallback.
   ~1 day. The app currently carries `timetable-2026.json`, 365 days,
   `2026-01-01 → 2026-12-31`. On 1 January 2027 the most-used feature in the
   app stops working and fixing it needs a code change and a store release.
2. ~~Error boundary + crash reporting.~~ **Done** (`3d83faf`). Two
   boundaries — one inside every screen through react-navigation's
   `screenLayout`, so the tab bar survives a fault and "Try again" has
   somewhere to go back to, and one around the whole app. Reported to the
   masjid's own Supabase (`app_crashes`, `report_app_crash()`) rather than to
   a third-party crash service, which would have put a new data processor in
   a privacy notice that names only Stripe and the masjid. Proved by making
   Notices throw and rendering it.

   Still open on that row: **no global offline detection.** Notices has its
   own "can't reach the masjid" state; nothing else does.
3. **iOS build** — see above.
4. ~~Rate-limit the public write RPCs.~~ **Already done, and I was wrong to
   list it.** It is implemented as BEFORE INSERT triggers on the tables
   rather than inside the RPC bodies, which is why grepping the function
   source missed it. Seven write paths are covered, per masjid and per phone
   *and* email over a rolling 24 hours: advice 3 a day, nikāḥ 5, hall 5,
   collections 3, admissions 3, courses 5, food bank 3.
5. **Home's missing-timetable state.** ~20 minutes. Prayer Times says "That
   date is outside the published timetable"; Home just drops the prayer card
   with no explanation.

## Tier 2 — quality

6. **Accessibility pass.** 15 accessibility props across 23 screens today, 6
   of them on one screen. Needs: labels on every icon-only control, roles on
   pressables, a cap so the OS font scale does not multiply the app's own
   (1.3 system × 1.42 in-app = 1.85× and the layouts break), and a pass with
   TalkBack and VoiceOver. ~3 days. The congregation skews older; this
   matters here more than the average app.
7. **Tests for anything with arithmetic** — the zakāt calculator,
   `nextJamaah`, hijri conversion, the countdown phrasing. 12 exported pure
   functions in `prayer.js` and `dates.js`, none tested. ~2 days.
8. **Dark mode.** The palette tokens already exist. ~2 days.
9. **Trim the bundle.** Subset Ionicons to the 15 glyphs actually used
   (−420KB of a 436KB font) and split `quran-text.json` per juzʾ so the parse
   is ~80KB rather than 2.3MB on the JS thread. ~1 day, removes a visible
   stutter opening the muṣḥaf.
10. **Native-speaker review of Urdu, Gujarati and Arabic.** Not a code task —
    three people. The one item I would least want to ship without.

## Tier 3 — product

11. **Test the white-label play on a second mosque.** `extract-content.mjs`
    turns a website into an app's content with one run; that pipeline is the
    real asset. Building mosque #2 is what tells you whether the business is
    real.
12. Recitation audio for the muṣḥaf.
13. Ramadan timetable and Jumuʿah khutbah times as first-class screens.
14. Android widget to match the iOS one.

---

## Already fixed in the parity run (for the record)

Substantive defects found by putting each screen beside the website:

- Hall booking took a £100 deposit with no terms-of-hire agreement.
- The nikāḥ consent was rewritten, dropping the list of what is held (five
  people's names, **ages** and addresses) and the limit on its use.
- The charity-collection consent was truncated, dropping the confirmation
  that the trustee is content to be contacted — before the masjid rang them.
- Giving never said zakāt is not taken there.
- The zakāt screen had rewritten the Hanafi ruling, omitted jewellery you
  wear, and dropped the mortgage guidance entirely.
- Prayer Times had NOW and NEXT the wrong way round.
- Alerts let reminders be set against a refused permission.
- Giving dropped the Gift Aid instruction for bank transfers.
- 33 places where English readers saw different words than the website,
  because `t(key, english)` returns the call-site English and there is no
  English pack. `scripts/check-english.mjs` now guards this.
- The app never bundled the website's commonest font weight (600, used in 99
  rules), so almost every label in the app drew a step light.
