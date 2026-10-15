# Testing 2.1.0 — widgets, the Dynamic Island, and usage counting

Everything new since the last TestFlight build, how to get it onto a phone,
and how to tell whether each piece actually works.

Three of these are **new native code that has never been compiled**, so the
build is the first real test of them. One is already live and needs nothing
from you.

---

## 1. Before you build

### a. Merge the branch

The fixes are on `claude/admin-html-notifications-tpwohh`, not on `main`.
Merge it first, or the build will be missing all five of them — including the
one where the native half of the Live Activity was not in the repository at
all.

### b. Pull, clean, and reinstall

The Live Activity adds a **new local native module**, so a stale `ios/` folder
or an old Pods cache will build without it and give you no error at all:

```bash
git checkout main && git pull
cd native
rm -rf ios android node_modules
npm install
```

### c. Check it agrees with itself

```bash
npm test        # 200 expected
npm run check   # ends with four green lines
```

The last two lines matter most:

```
the Android widget's 17 ids and every resource it names are present, and both layouts fit their cells
the Live Activity's app and widget halves agree, and the bundle registers both widgets
```

If either fails, **stop** — the build will fail too, slower and less clearly.

---

## 2. Build

```bash
cd native
npx --yes eas-cli@latest build --platform ios --profile production
```

The version is now **2.1.0** (it was 2.0.2 — widgets and a Live Activity are
not a patch). The build number is managed remotely by EAS, so there is nothing
to bump by hand.

**If the build fails, it will almost certainly be Swift**, because none of it
has ever been through a compiler — there is no Swift toolchain on Linux and no
ActivityKit on it either. The error will name a line in
`targets/widget/activity.swift` or
`modules/live-activity/ios/TaiyabahLiveActivityModule.swift`. Send me the
error and I'll turn it round.

Android, when you want it:

```bash
npx --yes eas-cli@latest build --platform android --profile production
```

---

## 3. What to test, and how

### A. iOS home-screen and Lock Screen widget

Long-press the home screen → **+** → search **Taiyabah**.

- [ ] Small and medium both offered
- [ ] Shows the next jamāʿah, not a blank or a placeholder
- [ ] On the Lock Screen: the rectangular, circular and inline ones
- [ ] Tapping it opens the **Times** tab, not wherever the app was left

### B. Dynamic Island — **iPhone 14 Pro or newer only**

Every other iPhone gets the Lock Screen card instead. Both are worth seeing;
only the island needs the newer phone.

**It only appears if you open the app within the hour before a jamāʿah.**
That is deliberate — it costs nothing to run precisely because nothing is ever
pushed to it, and the price of that is the app has to be open when it starts.

Windows for the next two days, from the real timetable:

| | Island can start | Jamāʿah |
|---|---|---|
| **Today** Fajr | 6:00am | 7:00am |
| Zuhr | 12:45pm | 1:45pm |
| Asr | 4:00pm | 5:00pm |
| Maghrib | 5:18pm | 6:18pm |
| Isha | 7:15pm | 8:15pm |
| **Tomorrow (Fri)** Fajr | 6:15am | 7:15am |
| **Jumuʿah** | 12:30pm | 1:30pm |
| Asr | 4:00pm | 5:00pm |
| Maghrib | 5:16pm | 6:16pm |
| Isha | 7:00pm | 8:00pm |

Inside one of those windows:

1. Make sure **jamāʿah reminders are ON** in the app — the island follows that
   same switch. Off means no island, by design.
2. Check **Settings → Face ID & Passcode → Live Activities** is on, and
   **Settings → Taiyabah → Live Activities** too.
3. Open the app. Then swipe up to the home screen.

- [ ] Compact: the gold star on the left, a clock ticking down on the right
- [ ] Long-press it: prayer name, iqāmah time large, ring showing how much of
      the wait has gone
- [ ] Lock the phone: the plum card, with the iqāmah time leading
- [ ] The countdown **ticks on its own** with the app closed
- [ ] Times read like the app does — `1:30pm`, not `13:30`
- [ ] On a Friday it says **Jumuʿah**, not Zuhr
- [ ] It disappears by itself a few minutes after the jamāʿah

That last one is worth waiting for once. It is where a crash would have been.

### C. Android home-screen widget

Long-press the home screen → **Widgets** → **Taiyabah**.

- [ ] The 4×3 lands with the next jamāʿah on the left and the day's times right
- [ ] Resize it down to 2×2 — it should swap to the compact layout, not clip
- [ ] The countdown ticks without opening the app
- [ ] On a Friday both Jumuʿah sittings are listed, and Zuhr is not
- [ ] Restart the phone — the countdown is still right afterwards

### D. Usage counting — **nothing to do**

Already live. The Worker deployed automatically when it merged and its own
health check passed.

To see it: open `admin.html`, sign in, scroll to **What the app is used for**,
press **Load usage**. It will be empty or near-empty until real traffic
arrives.

It counts gold-rate lookups, notice posters and notification-setting changes.
It does **not** yet count muṣḥaf pages — those are served by the static host,
not the Worker, and routing them through it needs a Cloudflare change I would
not make without being able to test it.

---

## 4. Still outstanding

**One line of SQL**, in the Supabase SQL editor. The tooling here holds `drop`
statements for confirmation, so it could not be done from the session:

```sql
drop function if exists public.__probe_tmp();
```

**Carried over from before**, still unconfirmed on a real phone:

- Muṣḥaf pinch-zoom, swipe and centring
- That the iPhone draws Hanken Grotesk rather than San Francisco
- That a push actually arrives

---

## 5. What I could not verify, and you should not assume

| | |
|---|---|
| Swift compiles | **No.** No toolchain here. The build is the test. |
| Anything renders on a device | **No.** |
| Xcode project generation | Yes — `expo prebuild` clean on both platforms, Info.plist key present, local module autolinked, all ten Android files landing |
| Android widget logic | Yes — compiled with `javac` against a real framework jar and **run** over all 365 days of the timetable |
| The decision rules | Yes — 200 app tests, 61 Worker tests |
| Database | Yes — migrations applied and exercised against the live project |
