# Getting the app onto the Apple App Store

Android first, iOS second — see `ANDROID-RELEASE.md` for that half. This file
is the iOS half, and it starts with a wait nobody can shorten.

**Status: blocked on Dun & Bradstreet.** Nothing else can start.

---

## Where it is stuck, and the reference numbers

Apple will not enrol an organisation it cannot verify, and it verifies through
Dun & Bradstreet rather than Companies House or the Charity Commission.

| | |
|---|---|
| D-U-N-S number | **222426253** |
| D&B correction case | **34879551**, raised 26 September 2026 |
| D&B's own estimate | 7–14 **business** days |
| Apple's error | *"This organization could not be verified as a legal entity."* |

**What was wrong with the record.** The Street line held the organisation's
name — `BOLTON CENTRAL ISLAMIC SOCIETY` — and no street was recorded at all.
The city and postcode were right. Apple checks identity, legal entity status
**and address**, so a record with no usable address fails, and the failure
message says nothing about which of the three it was.

The correction supplies `31a Draycott Street`, cites charity number 1041569,
attaches the Charity Commission register entry, and asks D&B to confirm the
record is an active legal entity and to say whether any duplicate D-U-N-S
numbers exist for the charity. A duplicate, if one exists, would be the
fastest way through.

**If D&B telephone to verify**, they will ring the masjid office on
01204 535 997 and ask for Mubarak Patel or Muhammed Chippa, both of whom were
told to expect it. An unexpected call from a credit agency asking a charity to
confirm its own details sounds exactly like a fraud attempt, and the natural
response is to hang up — which fails the verification silently and restarts
the clock.

**After D&B accept the change, Apple does not see it immediately.** Apple
caches D&B data. Allow another week or two before the enrolment form will
take the number. Total, realistically: three to five weeks from 26 September.

---

## The four things Apple requires

1. **D-U-N-S number.** Required for every organisation except government
   entities. Nonprofits are not exempt.
2. **Legal binding authority.** Whoever enrols becomes the Account Holder and
   signs agreements on the charity's behalf. Apple's wording: owner/founder,
   executive team member, senior project lead, or an employee with legal
   authority granted by a senior employee. This is a trustee decision, not a
   technical one, and Apple does check.
3. **Legal entity name.** `Bolton Central Islamic Society` — which becomes the
   **seller name** shown under every listing. Apple explicitly refuses trading
   names, so "Taiyabah Masjid" cannot be the seller. It can still be the app's
   name, exactly as on Google Play.
4. **A public website on the charity's own domain.** Apple: the domain "must
   be associated with your organization", and sites with minimal content are
   refused. `taiyabahmasjid.com` qualifies. `taiyabahwebsite.ysbdesigns.uk` is
   a subdomain of the developer's domain, not the charity's, and should be
   expected to draw a question.

---

## The fee waiver — worth having, and we qualify

Enrol as **Nonprofit**, not Organization. Apple waives the £79 a year for a
charity, permanently.

The condition that could have caught us:

> Not otherwise sell digital goods or services through any of your apps.

The app sells nothing digital. Donations are gifts to a charity; hall deposits
and nikāḥ fees buy a real room and a real service; every payment happens on
Stripe's own pages outside the app; there are no in-app purchases. The same
reasoning is why Google Play's billing rules do not apply either.

**The catch:** the waiver needs the nonprofit status verified, which adds time
on top of ordinary enrolment. The Charity Commission entry for 1041569 is the
evidence, so it should be clean — just not instant.

---

## Until then, iPhone users are not shut out

Safari → Share → **Add to Home Screen** installs the same app: full screen, own
icon, offline, all four languages. Notifications work from iOS 16.4, but only
once it is on the home screen — not from a Safari tab.

What is missing compared with a store install: no App Store listing, no
Spotlight, no splash screen, no app shortcuts.

---

## When the D-U-N-S clears

1. Re-run Apple's D-U-N-S lookup. It has to pass before anything else.
2. Enrol as Nonprofit, with a trustee as Account Holder.
3. Build the iOS wrapper. A TWA has no iOS equivalent — iOS needs a `WKWebView`
   shell, and Apple rejects anything that is only a website in a frame, so it
   has to carry real native behaviour. Budget properly for this; it is not the
   twenty minutes Bubblewrap took.
4. App Store Connect listing. The text in `PLAY-LISTING.md` transfers; the
   screenshots do not — Apple wants its own sizes.
5. Submit. Review is typically 1–3 days.
