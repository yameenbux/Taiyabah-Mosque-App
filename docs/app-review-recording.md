# Screen recording for App Review — shot list

Record on a **physical iPhone**, from the **latest TestFlight build**. Not the
simulator: Apple asked to see the app running, and the compass and
notifications do not behave on a simulator.

> **Which build.** Whatever is newest in TestFlight at the time, and it must
> be one built from `main`. iOS build 17 was built from a checkout four weeks
> stale and contains none of the Hajj & ʿUmrah section — recording that would
> show Apple an app that no longer exists.

**Settings → Control Centre → add Screen Recording** first, then swipe down
and press the record dot. No narration needed; Apple reads the written notes.
Aim for **2–3 minutes**. Do not rush — a reviewer is checking that each screen
loads and is real, so give each one a beat to settle.

## Before you start

- Delete the app and reinstall from TestFlight, so the recording shows a
  genuine **cold first launch** — this is the single most important thing in
  it. The rejection was App Completeness; the recording should prove there is
  nothing to configure and nothing missing.
- Turn the phone to **Do Not Disturb** so no personal notification banner
  appears. A banner from a private chat would put someone's name in a file
  sent to Apple.
- Aeroplane mode **off** for the recording (the stream and maps links need
  network), but see the offline beat below.

## The shots, in order

1. **Cold launch** from the home screen. Let the splash finish and Home draw
   on its own. Do not tap through it.
2. **Home** — scroll the whole page slowly to the foot.
3. **Prayer Times tab** — show today, then scroll to another date so the
   reviewer sees the real published timetable, not one screen of numbers.
4. **Notices tab** — open one notice, come back.
5. **More tab** — scroll the whole menu once, top to bottom, slowly. **This is
   the screen the rejection was about:** every row now leads somewhere and no
   row says "coming soon". Let it be legible.
6. **More → Recite → Qur'an** — open a sūrah, scroll a little.
7. **More → Recite → Adhkār**, then **Ṣaḥīḥ al-Bukhārī** — open each briefly.
8. **More → Qibla** — let the compass settle and point. Rotate the phone
   slowly so the needle visibly tracks. Allow the location prompt on camera
   if it appears; that is a reviewer-relevant permission.
9. **More → Resources → Hajj & ʿUmrah.** Give this one the most time — it is
   the largest thing added since the rejection and the reviewer has never seen
   it. Three beats:
   - the **chooser**, with its two photograph cards;
   - tap **Plan your journey: ʿUmrah** and let the branch grid draw;
   - open **What to pack** and tick one or two items so the counter moves,
     then come back. A working tick is the clearest possible answer to "is
     this screen finished".
10. **More → Ramadan** — shows the countdown with a live day count. Worth two
    seconds so it is clear it is a working screen, not a placeholder.
11. **More → Settings → Language** — switch to **Urdu**, let a screen redraw,
    then switch back to English. This answers the languages question
    concretely.
12. **Offline beat (optional but strong).** Turn on Aeroplane mode on camera,
    go back to Prayer Times, and show the timetable still there. The app's
    whole argument is that it works with no network.

## Do not film

- Any personal notification banner, email address, or name.
- The madrasah portal sign-in with real credentials.
- Anything that would put a face on screen.

## When it is done

Attach the file to **Reply to App Review**, with the text from **Part 1 of
`docs/app-review-reply.md`**. Paste that same text into **App Store Connect →
App Review Information → Notes**, so the next submission has it already.
