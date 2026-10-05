# Getting the app onto Google Play

> **The listing is changing hands.** Everything below the line describes the
> Trusted Web Activity — the shell that opens the website — which is what
> `com.taiyabahmasjid.app` has been since September 2026. It is being replaced
> by the native app in `native/`, under the **same package name**, so that
> everybody who already has it simply receives an update. Read
> **[Replacing the web app with the native app](#replacing-the-web-app-with-the-native-app)**
> first. The TWA section is kept because the signing key, the fingerprints and
> the Play Console paths are all still the same, and because until the native
> app has fully rolled out there are people running the old one.

---

## Replacing the web app with the native app

### What is actually changing

| | Before | After |
|---|---|---|
| What it is | a browser window with no address bar | a real Android app |
| Package | `com.taiyabahmasjid.app` | **the same** — that is the point |
| Upload key | `android.keystore`, alias `taiyabah` | **the same** |
| Built by | `android-build.yml` (Bubblewrap) | `native-release.yml` (Expo) |
| Format | `.aab` | `.aab` |
| Version code | 1 | 2 or higher |
| Minimum Android | 5 | 7 |

Keeping the package name is what makes this an update rather than a second
app in the store: one listing, the installs and reviews kept, and no one has
to be told to go and download something new.

**It only goes one way.** Once a build of the native app is in production
under this package, there is no putting the TWA back for anyone who has taken
the update. That is why the rollout below is staged.

### Four things that are different and will be noticed

1. **Everything saved is gone.** The TWA kept settings in Chrome's storage for
   the website; the native app has its own. Language, notification choices and
   bookmarks start again. Nobody loses data that matters, but it is the first
   thing a regular will say.
2. **Notification permission is asked again**, by Android this time rather
   than by Chrome. Anyone who had web push from the TWA may keep receiving it
   through the browser as well until they clear it, so a few people could see
   a notice twice for a while.
3. **New permissions.** The app asks for location (qibla) and notifications.
   The TWA asked for neither, so the **Data safety form has to be updated
   before this can be promoted** — Play rejects a release whose declared data
   use does not match what the bundle requests.
4. **Android 5 and 6 drop off.** The native app needs Android 7. Those phones
   keep the TWA they already have; they simply stop getting updates. Play will
   tell you how many are affected when you upload — it was a handful.

### Build it

**Actions → Native app bundle (Play) → Run workflow.**

It will not appear in that list until the branch carrying it has been merged
to `main` — GitHub only offers a workflow it can see on the default branch.
That is deliberate: the one build that can change what is on people's phones
should not be runnable from a branch nobody has reviewed.

| | |
|---|---|
| Version people see | `2.0.0` |
| Version code | `2` — must be higher than anything already uploaded |

The last TWA production release was version code **1**, so 2 is free. If that
is ever in doubt, read it off **Release → Production** in the console rather
than guessing; Play refuses a repeat and only says so after the upload.

The run checks every screen parses, that each one says what the website says,
and that every link and Stripe URL points where the website points — then
builds, signs, and **reads the certificate back out of the finished bundle**
to prove it is the upload key and not Expo's debug key. A debug-signed bundle
builds perfectly and is rejected on upload, so this is checked here rather
than discovered there.

Download `taiyabah-play-<run>` from the run's Artifacts.

### Put it out

1. **Internal testing** first — Play Console → Test and release → Internal
   testing → Create new release → upload the `.aab`.
2. Install it from the internal testing link **on a phone that already has the
   old app**, and let it update in place. That is the path every user takes
   and the only way to see what they will see. Check: it opens, prayer times
   load, the qibla compass asks for location, a notification arrives.
3. **Update the Data safety form** (point 3 above). Do this before promoting,
   not after.
4. **Closed testing**, then **Production at 10%**. Watch Android vitals and
   the crash rate for a day or two before going to 100%. A staged rollout can
   be halted; a full one cannot be taken back.

### Leave `assetlinks.json` alone

`.well-known/assetlinks.json` and its three fingerprints stay exactly as they
are. Anyone still on the TWA — someone on Android 6, or simply someone who has
not opened the Play Store in a month — needs that file to keep working, and it
costs nothing to serve. Remove it only once nobody is running the old app.

### Test builds still install alongside

`native-build.yml` and the smoke run build `com.taiyabahmasjid.app.**dev**`,
signed with the debug key and called "Taiyabah Masjid (test)" on the home
screen (see `native/app.config.js`). That is deliberate: a build you are
testing must never overwrite the real app on your own phone, and nothing that
cannot reach the Play listing should share its package name. Only
`native-release.yml` builds the real one.

---


## The Trusted Web Activity (what is being replaced)

The app is a **Trusted Web Activity**: an Android shell that opens
`taiyabahapp.ysbdesigns.uk` full screen with no browser bar. The site proves
the shell is allowed to do that, through `/.well-known/assetlinks.json`.

Everything below is done once. After that, publishing a content change —
a new duʿā, a reworded page, a fixed timetable — needs **none** of it: merge
to `main` and it is live. A new Play upload is only needed when the shell
itself changes (name, icon, permissions).

---

## The trap, read this first

The app and the site have to vouch for each other, and **each needs the
other's answer**:

- The site's `assetlinks.json` must contain the SHA-256 of the key the app
  is signed with.
- Play re-signs every upload with a key **Google** generates, and you
  cannot see that key until you have uploaded a build.

So the order is fixed, and doing it in any other order ships an app with a
browser bar across the top:

1. Build and upload to a **closed track** (internal testing).
2. Read the fingerprint out of Play.
3. Add it to `assetlinks.json`, merge, wait for Pages.
4. Check it worked.
5. **Only then** promote to production.

### Why the file holds two fingerprints

An app installed from Play carries Google's signature. An APK built by the
workflow and installed by hand carries ours. They are different keys, so a
file naming only one leaves the other showing a browser bar — and testing
a sideloaded APK is exactly how you would first notice.

| Fingerprint | Signs | Where it comes from |
|---|---|---|
| `AC:10:3A:…:D7` | every install from the Play Store **now** | Play App Signing, current key, read 3 Oct 2026 |
| `14:11:94:…:3F` | installs made before the key was rotated | Play App Signing, **previous** key, first used 21 Sep 2026 |
| `F5:7F:73:…:6E` | APKs from the workflow, sideloaded or via Internal App Sharing | our upload key, `android.keystore`, alias `taiyabah` |

### Play rotates its signing key, and says nothing

On 3 October 2026 every Play install showed the browser bar while a
sideloaded build did not. Same site, same file, same package — the only
difference was which key signed the APK, which is what made it certain.

Play had **upgraded the app signing key** since 21 September. The console
records the old one under "Previous app signing keys" and quietly starts
signing with a new one; nothing warns you, and nothing in this repository
could have noticed. `14:11:94:…:3F` was correct when it was written and
simply stopped being the key in use.

All three stay listed. Dropping the previous key would fix new installs and
break every phone that installed before the rotation, because those carry
the old signature for as long as they are not reinstalled.

**If the bar ever comes back, check this first.** Protected with Play →
Play Store protection → Protect app signing key → Manage Play App Signing,
and compare the App signing key's SHA-256 against the top row above. The
page moved there from App integrity, which now only redirects.

Fingerprints are public by design — the whole purpose of the file is to
publish them. The keystore and its password are the secrets, and neither
appears here.

Ours came from:

```
keytool -list -v -keystore android.keystore -alias taiyabah
```

Android caches the verification result when the app is installed, so after
changing this file **uninstall and reinstall** rather than updating in
place, or the bar will still be there and look like a failure.

---

## 1. The signing key

Make it on your own machine — it must never be in this repository, and it is
not recoverable. Lose it and the app can only ever be replaced under a new
name, not updated.

```
keytool -genkeypair -v -keystore android.keystore -alias taiyabah \
        -keyalg RSA -keysize 2048 -validity 10000
base64 -w0 android.keystore > android.keystore.b64
```

Keep `android.keystore` and its password somewhere safe and offline — a
password manager the masjid controls, not one person's laptop.

Then in GitHub: **Settings → Secrets and variables → Actions → New secret**

| Secret | Value |
|---|---|
| `ANDROID_KEYSTORE_BASE64` | the contents of `android.keystore.b64` |
| `ANDROID_KEYSTORE_PASSWORD` | the password you just chose |

## 2. Build

**Actions → Android app bundle → Run workflow.** Version name `1.0.0`,
version code `1`.

It checks the site is live, builds, and attaches a signed `.aab` to the run.
Download it from the run's Artifacts.

Every later upload needs a **higher version code** than the one before.
Play refuses a repeat.

## 3. Play Console

Create the app, then work through what Play asks for. The long ones:

- **Privacy policy** — `https://taiyabahapp.ysbdesigns.uk/privacy.html`
- **Data safety** — the app collects what the forms collect: name, phone,
  email, and for a charity collection an uploaded certificate. Say so.
  Location is used for the qibla compass and is **not** sent anywhere.
- **Content rating** — the questionnaire; this app is 3+.
- **Target audience** — not children; it is for the congregation.
- Screenshots and the feature graphic are in `store/` already, and
  `store/PLAY-LISTING.md` has the text.

Upload the `.aab` to **Internal testing** first, not production.

## 4. The fingerprint

**Play Console → Test and release → Setup → App integrity → App signing.**

Copy the **SHA-256 certificate fingerprint** of the *app signing key* — not
the upload key, which is already in the file. It looks like `AB:CD:12:...`,
32 pairs.

Add it to the `sha256_cert_fingerprints` list in
`.well-known/assetlinks.json`, **alongside** the upload key rather than
replacing it, merge to `main`, and give GitHub Pages a minute. The build
warns on every run until that list has two entries.

Check it is being served:

```
curl https://taiyabahapp.ysbdesigns.uk/.well-known/assetlinks.json
```

## 5. Prove it before going live

Install from the internal testing link on a real phone and open it.

- **No browser bar across the top** → the asset links work. Promote to
  production when ready.
- **A browser bar appears** → they do not. The fingerprint is wrong, or the
  file has not published yet. Fix it before promoting; do not ship it like
  this, because every person who installs it sees a web page pretending to
  be an app.

Also check, on that same install: prayer times load, a notification arrives,
and the Qibla compass asks for location.

---

## About notifications

They work on Android with nothing extra — a TWA runs on Chrome, so the
OneSignal web push already in the app carries straight over. The person is
asked for permission the first time, as they are on the website.

iPhone is a different story and is not solved by this build: Apple does not
allow web push inside an App Store app, so an iOS release needs OneSignal's
native SDK adding to the wrapper. Nothing about the sending side changes.
