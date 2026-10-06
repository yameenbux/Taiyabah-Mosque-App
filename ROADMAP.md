# Roadmap — getting to 9/10 on every front

Written 6 October 2026, after the screen-parity sweep. The scores below are
from the assessment of the app as it stands at commit `c519a49`: 23 screens,
8,346 lines of app source, 4 languages, 43MB APK, Android only.

**The bar is 9/10 on every front.** Not 9 on the weak ones and 6 on the rest —
every row in the table below reaches 9 before this is considered finished.

| Front | Now | Target | Gap |
|---|---|---|---|
| Content & substance | 9 | 9 | — |
| Design & craft | 8.5 | 9 | dark mode, tablet, landscape |
| Internationalisation | 7 | 9 | native-speaker review of ur/gu/ar; 45 keys still English per language |
| **Accessibility** | **3** | **9** | labels, roles, font-scale cap, TalkBack/VoiceOver pass |
| Engineering quality | 6 | 9 | no tests at all; 12 pure functions with date/money arithmetic untested |
| **Robustness** | **4** | **9** | no error boundary, no crash reporting, no offline detection |
| Security & privacy | 8.5 | 9 | leaked-password protection off; 28 anon-executable definer functions to keep audited |
| Performance & size | 6.5 | 9 | 436KB icon font for 15 icons; 2.3MB JSON parsed on the JS thread |
| **Platform coverage** | **4** | **9** | Android only — iOS is roughly half the congregation |
| **Operational sustainability** | **4** | **9** | timetable is a bundled 2026-only file; breaks 1 Jan 2027 |
| Store readiness | 7 | 9 | Data safety form, staged rollout, listing assets |

---

## iOS — a separate build, not a port

Apple developer account is pending. The build can be made ready in advance so
that enrolment is the only thing standing between us and a TestFlight upload.

Decided:

- **Separate from the Android build.** Its own workflow, its own version
  track, its own release cadence. Android ships when Android is ready.
- **Three targets, one codebase:** iPhone, iPad and Apple Watch.
  `ios.supportsTablet` is currently `false` and has to become `true` with a
  real iPad layout behind it, not a stretched phone screen.
- **Widgets** on both iPhone and iPad home screens, and a Watch
  complication. Next jamāʿah is the obvious one and the highest-value thing
  in the whole roadmap for daily use — it is the question the app exists to
  answer, and answering it without opening the app is the win.

Open questions to settle before building:
- Watch app: standalone (its own timetable copy, works without the phone) or
  companion? Standalone is more work and much better on a walk to the masjid.
- Widget refresh budget: prayer times change daily, so a timeline provider
  with one entry per prayer is cheap and exact. No background fetch needed.
- Does the Watch get the qibla compass? The hardware is there.

---

## Tier 1 — blocking a wide rollout

1. **Move the timetable to Supabase**, bundled file as the offline fallback.
   ~1 day. The app currently carries `timetable-2026.json`, 365 days,
   `2026-01-01 → 2026-12-31`. On 1 January 2027 the most-used feature in the
   app stops working and fixing it needs a code change and a store release.
2. **Error boundary + crash reporting (Sentry).** ~half a day. Today a single
   render exception anywhere is a white screen with no recovery, and nobody
   would ever hear that it happened.
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
