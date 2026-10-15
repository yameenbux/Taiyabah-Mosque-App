/**
 * Taiyabah Masjid — the next jamāʿah in the Dynamic Island.
 * Copyright (c) 2026 Yameen Bux. All rights reserved. See LICENSE.md.
 *
 * A Live Activity that costs the masjid nothing to run. The countdown and the
 * ring are both driven by date ranges handed to iOS once, at the moment the
 * activity starts: Text(timerInterval:) and ProgressView(timerInterval:) are
 * redrawn by the system itself, with this extension not running and the app
 * closed. So there is no push, no APNs certificate, no OneSignal quota and no
 * server — which is the whole reason this exists in the form it does.
 *
 * The app starts it when it is opened inside the window between the adhān and
 * the iqāmah (src/activity-plan.js decides), and iOS dismisses it a few
 * minutes after the jamāʿah stands. Nothing has to come back and tidy up,
 * which matters, because nothing would.
 *
 * iOS picks which of the four presentations to show and the app does not get
 * a say, so all four are written out. A Live Activity designed around the
 * expanded one ships three broken states.
 *
 * THE ISLAND ITSELF IS iPhone 14 Pro AND NEWER. Every other iPhone on iOS
 * 16.2+ gets the Lock Screen presentation, which is why that one is the
 * masjid's own plum card and not a black cutout: there it is a notification,
 * not a hole in the display.
 */
import ActivityKit
import WidgetKit
import SwiftUI

/* The type ActivityKit needs BOTH SIDES to agree on. The app target requests
   the activity, the widget extension renders it, and they are separate
   compilation units with no shared framework between them — so the
   declaration is written out in each, between the markers below, and modules/live-activity/ios/TaiyabahLiveActivityModule.swift
   holds the other copy.

   Drift between them does not fail a build. Each target compiles its own copy
   perfectly well and the activity simply never appears on the phone. So
   scripts/check-live-activity.mjs extracts both blocks and refuses the build
   unless they match character for character: edit one, run `npm run check`,
   and it will name the other. */
/* ─── shared-with-app:begin ─────────────────────────────────────────────── */
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

/* The eight-pointed khātim, which is the geometry the rest of the app's
   ornament is built from. The calligraphic lockup is three elements tall and
   illegible at the 18 points the compact island allows; a five-pointed star
   would read at that size but belongs to a different vocabulary entirely. */
struct Khatim: Shape {
  func path(in rect: CGRect) -> Path {
    var p = Path()
    let c = CGPoint(x: rect.midX, y: rect.midY)
    let outer = min(rect.width, rect.height) / 2
    let inner = outer * 0.556                 /* the {8/3} ratio */
    for i in 0..<16 {
      let a = Double(i) * .pi / 8 - .pi / 2
      let r = i % 2 == 0 ? outer : inner
      let pt = CGPoint(x: c.x + CGFloat(cos(a)) * r, y: c.y + CGFloat(sin(a)) * r)
      if i == 0 { p.move(to: pt) } else { p.addLine(to: pt) }
    }
    p.closeSubpath()
    return p
  }
}

struct Mark: View {
  var size: CGFloat
  var body: some View {
    Khatim()
      .fill(Brand.goldBright.opacity(0.18))
      .overlay(Khatim().stroke(Brand.goldBright, lineWidth: 1.1))
      .frame(width: size, height: size)
  }
}

/* The ring. ProgressView with a date range advances itself, so this is the
   countdown made visible without a single update being sent. */
struct Ring: View {
  var state: TaiyabahJamaahAttributes.ContentState
  var size: CGFloat
  var body: some View {
    ProgressView(timerInterval: state.adhan...state.iqamah, countsDown: false) {
      EmptyView()
    } currentValueLabel: {
      EmptyView()
    }
    .progressViewStyle(.circular)
    .tint(Brand.goldBright)
    .frame(width: size, height: size)
  }
}

/* The ticking countdown. iOS redraws this; nothing here does.

   THE RANGE IS adhān...iqāmah AND NOT Date()...iqāmah. The activity
   deliberately outlives the jamāʿah by a few minutes — vanishing on the exact
   second somebody walks in is unhelpful — so for those minutes the clock is
   PAST the iqāmah, and a ClosedRange whose lower bound is above its upper one
   is a trap in Swift, not an empty range. It would have crashed the widget
   extension a few minutes after every single jamāʿah, on the one view the
   whole thing exists for. scripts/check-live-activity.mjs now refuses any
   range built from the current instant for this reason.

   Both ends being fixed is also what keeps this free: the range is handed to
   iOS once and redrawn by the system, with nothing pushed and nothing
   recomputed here. countsDown shows the time left to the upper bound, and
   once that has passed it simply reads zero. */
struct Until: View {
  var state: TaiyabahJamaahAttributes.ContentState
  var body: some View {
    Text(timerInterval: state.adhan...state.iqamah, countsDown: true)
      .monospacedDigit()
  }
}

/* What a locked phone shows, and what every iPhone without an island shows.
   The masjid's own ground rather than the island's black, because here it is
   a card and not a cutout. */
struct JamaahLockView: View {
  var attributes: TaiyabahJamaahAttributes
  var state: TaiyabahJamaahAttributes.ContentState
  var body: some View {
    VStack(alignment: .leading, spacing: 0) {
      HStack(alignment: .center, spacing: 10) {
        Mark(size: 17)
        Text("NEXT JAMĀʿAH · \(attributes.masjid.uppercased())")
          .font(.system(size: 10, weight: .bold))
          .kerning(1.3)
          .foregroundStyle(Brand.gold)
          .lineLimit(1)
        Spacer(minLength: 0)
      }
      HStack(alignment: .firstTextBaseline, spacing: 9) {
        Text(state.name)
          .font(.custom("Georgia", size: 21))
          .foregroundStyle(Brand.cream)
          .lineLimit(1)
        Until(state: state)
          .font(.system(size: 26, weight: .bold))
          .foregroundStyle(.white)
        Spacer(minLength: 0)
        Ring(state: state, size: 40)
      }
      .padding(.top, 9)

      Rectangle()
        .fill(LinearGradient(colors: [Brand.gold.opacity(0.55), Brand.gold.opacity(0.04)],
                             startPoint: .leading, endPoint: .trailing))
        .frame(height: 1)
        .padding(.vertical, 11)

      HStack {
        Text("Adhān \(state.adhan, style: .time)")
          .font(.system(size: 11))
          .foregroundStyle(Brand.cream.opacity(0.62))
        Spacer(minLength: 0)
        Text("Jamāʿah \(state.iqamah, style: .time)")
          .font(.system(size: 11))
          .foregroundStyle(Brand.cream.opacity(0.62))
      }
    }
    .padding(.horizontal, 16)
    .padding(.vertical, 14)
  }
}

struct JamaahLiveActivity: Widget {
  var body: some WidgetConfiguration {
    ActivityConfiguration(for: TaiyabahJamaahAttributes.self) { context in
      JamaahLockView(attributes: context.attributes, state: context.state)
        .activityBackgroundTint(Brand.plum)
        .activitySystemActionForegroundColor(Brand.cream)
    } dynamicIsland: { context in
      DynamicIsland {
        DynamicIslandExpandedRegion(.leading) {
          HStack(spacing: 7) {
            Mark(size: 18)
            Text("NEXT JAMĀʿAH")
              .font(.system(size: 10, weight: .bold))
              .kerning(1.4)
              .foregroundStyle(Brand.gold)
              .lineLimit(1)
          }
        }
        DynamicIslandExpandedRegion(.trailing) {
          HStack(spacing: 8) {
            Until(state: context.state)
              .font(.system(size: 15, weight: .bold))
              .foregroundStyle(.white)
              .multilineTextAlignment(.trailing)
            Ring(state: context.state, size: 26)
          }
        }
        DynamicIslandExpandedRegion(.bottom) {
          VStack(alignment: .leading, spacing: 0) {
            HStack(alignment: .firstTextBaseline, spacing: 10) {
              Text(context.state.name)
                .font(.custom("Georgia", size: 21))
                .foregroundStyle(Brand.cream)
                .lineLimit(1)
              Text(context.state.iqamah, style: .time)
                .font(.system(size: 34, weight: .bold))
                .foregroundStyle(.white)
              Spacer(minLength: 0)
            }
            Text("Adhān \(context.state.adhan, style: .time)")
              .font(.system(size: 11))
              .foregroundStyle(Brand.cream.opacity(0.55))
              .padding(.top, 5)
          }
          .padding(.top, 2)
        }
      } compactLeading: {
        Mark(size: 17)
      } compactTrailing: {
        Until(state: context.state)
          .font(.system(size: 14, weight: .semibold))
          .foregroundStyle(Brand.goldBright)
          .frame(maxWidth: 52)
      } minimal: {
        ZStack {
          Ring(state: context.state, size: 22)
          Mark(size: 11)
        }
      }
      .widgetURL(URL(string: "taiyabah://times"))
      .keylineTint(Brand.gold)
    }
  }
}

/* Two widgets in one extension now, so the entry point has to be the bundle
   rather than either of them. */
@main
struct TaiyabahWidgets: WidgetBundle {
  var body: some Widget {
    NextJamaahWidget()
    JamaahLiveActivity()
  }
}
