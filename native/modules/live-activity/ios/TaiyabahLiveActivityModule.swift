/**
 * Taiyabah Masjid — starting the next-jamāʿah Live Activity from the app.
 * Copyright (c) 2026 Yameen Bux. All rights reserved. See LICENSE.md.
 *
 * The entire native surface is start/end. There is deliberately no update:
 * the activity's countdown and ring are date ranges that iOS redraws by
 * itself, so once it has been started there is nothing left to tell it. That
 * is what makes this free to run — no APNs, no OneSignal, no server, and no
 * background work on the phone either.
 *
 * ActivityKit will only start an activity while the app is in the foreground,
 * which is the one real constraint of doing it this way and is why
 * src/keep-activity.jsx hangs off the same foreground event the reminders do.
 */
import ActivityKit
import ExpoModulesCore
import Foundation

/* The type ActivityKit needs BOTH SIDES to agree on. The app target requests
   the activity, the widget extension renders it, and they are separate
   compilation units with no shared framework between them — so the
   declaration is written out in each, between the markers below, and targets/widget/activity.swift
   holds the other copy.

   Drift between them does not fail a build. Each target compiles its own copy
   perfectly well and the activity simply never appears on the phone. So
   scripts/check-live-activity.mjs extracts both blocks and refuses the build
   unless they match character for character: edit one, run `npm run check`,
   and it will name the other. */
/* ─── shared-with-app:begin ─────────────────────────────────────────────── */
/* The annotation is not optional. ActivityAttributes arrived in iOS 16.1 and
   the APP target deploys to 15.1 (Expo SDK 52's default — nothing in
   app.json raises it), so without this the app target does not compile at
   all: "'ActivityAttributes' is only available in iOS 16.1 or newer". The
   widget extension deploys to 17.0 and would never have noticed.

   16.2 rather than 16.1 because that is what Activity.request(content:) and
   ActivityContent need, and there is no version in between worth supporting
   separately. */
@available(iOS 16.2, *)
struct TaiyabahJamaahAttributes: ActivityAttributes {
  public struct ContentState: Codable, Hashable {
    /** "Fajr", "Jumuʿah", "2nd Jumuʿah" — what the congregation is called. */
    var name: String
    /** When the prayer came in. The ring fills from here. */
    var adhan: Date
    /** When the jamāʿah stands. Everything counts down to this. */
    var iqamah: Date
  }

  /** Static for the life of the activity; it is here so the Lock Screen card
      can say whose masjid this is without the app sending it twice. */
  var masjid: String
}
/* ─── shared-with-app:end ─────────────────────────────────────────────── */

public class TaiyabahLiveActivityModule: Module {
  public func definition() -> ModuleDefinition {
    Name("TaiyabahLiveActivity")

    /* Three things have to be true before any of this is worth attempting,
       and JS cannot see any of them: the iOS version, whether the device
       supports Live Activities at all, and whether the person has left them
       switched on in Settings. The last one changes while the app is
       running, so it is read on every call rather than cached. */
    Function("isAvailable") { () -> Bool in
      if #available(iOS 16.2, *) {
        return ActivityAuthorizationInfo().areActivitiesEnabled
      }
      return false
    }

    /* Dates cross the bridge as milliseconds since the epoch, because that is
       the one representation JavaScript and Swift agree on without either of
       them parsing a string. */
    AsyncFunction("start") { (name: String, adhanMs: Double, iqamahMs: Double, endMs: Double) -> Bool in
      guard #available(iOS 16.2, *) else { return false }
      guard ActivityAuthorizationInfo().areActivitiesEnabled else { return false }

      let iqamah = Date(timeIntervalSince1970: iqamahMs / 1000)
      let adhan = Date(timeIntervalSince1970: adhanMs / 1000)
      let end = Date(timeIntervalSince1970: endMs / 1000)

      /* A jamāʿah that has already been has nothing to count down to, and a
         ring whose start is not before its end draws nothing. Rather than
         trust the caller, refuse. */
      guard iqamah > Date(), adhan < iqamah else { return false }

      /* Opening the app twice in one window must not stack two islands. The
         older one is ended rather than left for iOS to hide behind the new
         one, because a hidden activity still counts against the app's
         allowance. */
      await endAllActivities()

      let attributes = TaiyabahJamaahAttributes(masjid: "Taiyabah Masjid")
      let state = TaiyabahJamaahAttributes.ContentState(name: name, adhan: adhan, iqamah: iqamah)

      do {
        if #available(iOS 16.2, *) {
          _ = try Activity.request(
            attributes: attributes,
            content: ActivityContent(state: state, staleDate: end),
            pushType: nil                     /* nothing will ever push to it */
          )
        }
        return true
      } catch {
        /* Throws when the person has Live Activities off, or when the app is
           not in the foreground, or when it is already at its allowance.
           None of those is worth shouting about: the island is a courtesy,
           and the reminders are what actually tell people. */
        return false
      }
    }

    AsyncFunction("end") { () -> Bool in
      guard #available(iOS 16.2, *) else { return false }
      await endAllActivities()
      return true
    }
  }

  @available(iOS 16.2, *)
  private func endAllActivities() async {
    for activity in Activity<TaiyabahJamaahAttributes>.activities {
      await activity.end(nil, dismissalPolicy: .immediate)
    }
  }
}
