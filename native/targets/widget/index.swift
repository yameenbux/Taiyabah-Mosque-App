//  Taiyabah Masjid — the next jamāʿah, on the home screen, the Lock Screen
//  and the Apple Watch.
//  Copyright (c) 2026 Yameen Bux. All rights reserved. See LICENSE.md.
//
//  WHY A TIMELINE AND NOT A BACKGROUND FETCH. Prayer times for the whole year
//  are known in advance, so the widget never has to ask anyone anything. It
//  hands WidgetKit one entry per prayer and iOS redraws at exactly the right
//  minute — no network, no battery, and correct even in a tunnel.
//
//  WHERE THE TIMES COME FROM. The timetable ships inside the widget. A widget
//  that depends on the app having been opened recently is blank for the person
//  who installed it and then did not open the app, which is the very person a
//  widget is for. If the app has written a newer year into the shared App
//  Group, that is preferred — so a later year reaches the widget as soon as
//  that write exists, without this file changing.

import WidgetKit
import SwiftUI

// MARK: - The masjid's colours, which are the website's colours

private enum Brand {
  static let plum      = Color(red: 0.235, green: 0.043, blue: 0.165)   // #3C0B2A
  static let plumLift  = Color(red: 0.369, green: 0.094, blue: 0.267)   // #5E1844
  static let gold      = Color(red: 0.776, green: 0.635, blue: 0.298)   // #C6A24C
  static let goldBright = Color(red: 0.863, green: 0.733, blue: 0.388)  // #DCBB63
  static let cream     = Color(red: 0.953, green: 0.937, blue: 0.890)   // #F3EFE3
}

// MARK: - The timetable

/// One day as the app stores it. Only the jamāʿah column is read here: a
/// widget has room for one time, and the one people need is the congregation.
private struct Day: Decodable {
  let jamaat: [String: String]
  let begins: [String: String]
}

private struct Timetable: Decodable {
  let days: [String: Day]
}

/// The five, in the order they are prayed. Sunrise is not a jamāʿah and is
/// deliberately absent — showing it as "next" would send somebody to the
/// masjid for a prayer that is not held.
private let PRAYERS: [(key: String, name: String)] = [
  ("fajr", "Fajr"), ("zuhr", "Zuhr"), ("asr", "Asr"),
  ("maghrib", "Maghrib"), ("isha", "Isha"),
]

private enum Source {
  /// The App Group first, the bundle second. The app writes the former once a
  /// year is downloaded; until then the bundled copy answers.
  static func load() -> Timetable? {
    let group = FileManager.default
      .containerURL(forSecurityApplicationGroupIdentifier: "group.com.taiyabahmasjid.app")?
      .appendingPathComponent("timetable.json")
    if let url = group, let data = try? Data(contentsOf: url),
       let t = try? JSONDecoder().decode(Timetable.self, from: data) { return t }
    guard let url = Bundle.main.url(forResource: "timetable", withExtension: "json"),
          let data = try? Data(contentsOf: url) else { return nil }
    return try? JSONDecoder().decode(Timetable.self, from: data)
  }
}

// MARK: - Working out what is next

struct Jamaah: TimelineEntry {
  let date: Date          // when this entry becomes the one on screen
  let name: String        // "Asr"
  let at: Date            // when that jamāʿah is
  let begins: Date?       // when the prayer time itself begins
  let known: Bool         // false once the timetable runs out
}

private let london: TimeZone = TimeZone(identifier: "Europe/London") ?? .current

/// The masjid's clock is London's, not the phone's. A device in Dubai must
/// still be told the Bolton jamāʿah — getting this wrong is the bug that once
/// showed "Fajr in 15 min" three hours early.
private func londonCalendar() -> Calendar {
  var c = Calendar(identifier: .gregorian)
  c.timeZone = london
  return c
}

private func instant(day: Date, hhmm: String) -> Date? {
  let bits = hhmm.split(separator: ":")
  guard bits.count == 2, let h = Int(bits[0]), let m = Int(bits[1]) else { return nil }
  var cal = londonCalendar()
  cal.timeZone = london
  return cal.date(bySettingHour: h, minute: m, second: 0, of: day)
}

private func isoKey(_ d: Date) -> String {
  let f = DateFormatter()
  f.calendar = londonCalendar()
  f.timeZone = london
  f.locale = Locale(identifier: "en_GB")
  f.dateFormat = "yyyy-MM-dd"
  return f.string(from: d)
}

/// Every remaining jamāʿah from `from` onwards, across as many days as the
/// timetable holds, capped so a timeline stays a sensible size.
private func upcoming(from: Date, table: Timetable, limit: Int = 60) -> [Jamaah] {
  var out: [Jamaah] = []
  let cal = londonCalendar()
  var day = cal.startOfDay(for: from)
  var guardDays = 0
  while out.count < limit && guardDays < 14 {
    if let record = table.days[isoKey(day)] {
      for p in PRAYERS {
        guard let hhmm = record.jamaat[p.key], let at = instant(day: day, hhmm: hhmm) else { continue }
        if at <= from { continue }
        let begins = record.begins[p.key].flatMap { instant(day: day, hhmm: $0) }
        out.append(Jamaah(date: out.isEmpty ? from : at.addingTimeInterval(-1),
                          name: p.name, at: at, begins: begins, known: true))
      }
    }
    guard let next = cal.date(byAdding: .day, value: 1, to: day) else { break }
    day = next
    guardDays += 1
  }
  return out
}

struct Provider: TimelineProvider {
  func placeholder(in context: Context) -> Jamaah {
    Jamaah(date: Date(), name: "Asr", at: Date().addingTimeInterval(3600), begins: nil, known: true)
  }

  func getSnapshot(in context: Context, completion: @escaping (Jamaah) -> Void) {
    completion(next() ?? placeholder(in: context))
  }

  func getTimeline(in context: Context, completion: @escaping (Timeline<Jamaah>) -> Void) {
    guard let table = Source.load() else {
      let empty = Jamaah(date: Date(), name: "", at: Date(), begins: nil, known: false)
      completion(Timeline(entries: [empty], policy: .after(Date().addingTimeInterval(3600))))
      return
    }
    let entries = upcoming(from: Date(), table: table)
    if entries.isEmpty {
      /* The timetable has run out — the masjid publishes a year at a time.
         Say so rather than showing a stale time. */
      let unknown = Jamaah(date: Date(), name: "", at: Date(), begins: nil, known: false)
      completion(Timeline(entries: [unknown], policy: .after(Date().addingTimeInterval(21600))))
      return
    }
    /* Reload when the last entry has passed, not on a fixed interval. */
    completion(Timeline(entries: entries, policy: .after(entries.last!.at.addingTimeInterval(60))))
  }

  private func next() -> Jamaah? {
    guard let t = Source.load() else { return nil }
    return upcoming(from: Date(), table: t, limit: 1).first
  }
}

// MARK: - How it looks

private func timeText(_ d: Date) -> String {
  let f = DateFormatter()
  f.timeZone = london
  f.locale = Locale(identifier: "en_GB")
  f.dateFormat = "h:mm a"
  f.amSymbol = "am"; f.pmSymbol = "pm"
  return f.string(from: d)
}

struct NextJamaahView: View {
  @Environment(\.widgetFamily) private var family
  let entry: Jamaah

  var body: some View {
    switch family {
    case .accessoryInline:
      Text(entry.known ? "\(entry.name) \(timeText(entry.at))" : "No timetable")
    case .accessoryCircular:
      VStack(spacing: 0) {
        Text(entry.known ? entry.name.prefix(4).uppercased() : "—")
          .font(.system(size: 11, weight: .semibold))
        if entry.known {
          Text(entry.at, style: .time).font(.system(size: 13, weight: .bold))
        }
      }
    case .accessoryRectangular:
      VStack(alignment: .leading, spacing: 2) {
        Text("NEXT JAMĀʿAH").font(.system(size: 10, weight: .semibold)).opacity(0.7)
        if entry.known {
          Text("\(entry.name)  \(timeText(entry.at))").font(.system(size: 15, weight: .bold))
          Text(entry.at, style: .relative).font(.system(size: 11)).opacity(0.8)
        } else {
          Text("Timetable not published").font(.system(size: 13, weight: .semibold))
        }
      }
    default:
      home
    }
  }

  /* The home-screen widget is the app's own hero, shrunk: the gold standfirst,
     the prayer in the display face, the time large, and the countdown in the
     gold pill underneath. */
  private var home: some View {
    ZStack(alignment: .topLeading) {
      LinearGradient(colors: [Brand.plumLift, Brand.plum],
                     startPoint: .topLeading, endPoint: .bottomTrailing)
      VStack(alignment: .leading, spacing: 3) {
        Text("NEXT JAMĀʿAH")
          .font(.system(size: 10, weight: .semibold))
          .tracking(1.1)
          .foregroundStyle(Brand.goldBright)
        if entry.known {
          Text(entry.name)
            .font(.system(size: 20, weight: .semibold, design: .serif))
            .foregroundStyle(Brand.cream)
          Text(timeText(entry.at))
            .font(.system(size: 30, weight: .bold))
            .minimumScaleFactor(0.6)
            .lineLimit(1)
            .foregroundStyle(.white)
          Text(entry.at, style: .relative)
            .font(.system(size: 11, weight: .semibold))
            .foregroundStyle(Brand.goldBright)
            .padding(.horizontal, 8).padding(.vertical, 3)
            .overlay(Capsule().stroke(Brand.gold.opacity(0.55), lineWidth: 1))
        } else {
          Text("Timetable not\npublished yet")
            .font(.system(size: 15, weight: .semibold))
            .foregroundStyle(Brand.cream)
          Text("Check at the masjid")
            .font(.system(size: 11))
            .foregroundStyle(Brand.goldBright)
        }
        Spacer(minLength: 0)
        Text("Taiyabah Masjid")
          .font(.system(size: 9, weight: .medium))
          .foregroundStyle(Brand.cream.opacity(0.55))
      }
      .padding(14)
    }
  }
}

@main
struct NextJamaahWidget: Widget {
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: "TaiyabahNextJamaah", provider: Provider()) { entry in
      if #available(iOS 17.0, *) {
        NextJamaahView(entry: entry).containerBackground(for: .widget) { Brand.plum }
      } else {
        NextJamaahView(entry: entry)
      }
    }
    .configurationDisplayName("Next jamāʿah")
    .description("The next congregation at Taiyabah Masjid.")
    .supportedFamilies([
      .systemSmall, .systemMedium,
      .accessoryRectangular, .accessoryCircular, .accessoryInline,
    ])
  }
}
