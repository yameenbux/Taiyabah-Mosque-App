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
/* DateFormatter and replacingOccurrences are Foundation. SwiftUI happens to
   pull it in, but relying on a transitive import is how a build breaks on
   somebody else's toolchain. */
import Foundation

// MARK: - The masjid's colours, which are the website's colours

private enum Brand {
  static let plum      = Color(red: 0.235, green: 0.043, blue: 0.165)   // #3C0B2A
  static let plumLift  = Color(red: 0.369, green: 0.094, blue: 0.267)   // #5E1844
  static let gold      = Color(red: 0.776, green: 0.635, blue: 0.298)   // #C6A24C
  static let goldBright = Color(red: 0.863, green: 0.733, blue: 0.388)  // #DCBB63
  static let cream     = Color(red: 0.953, green: 0.937, blue: 0.890)   // #F3EFE3
}

// MARK: - The furniture

/* THE GROUND.
 *
 * Not a 135-degree band between two plums — that is the look of a gradient
 * applied to a rectangle, and it is what every templated widget does. A light
 * source at the top left, a vignette opposite it, and the flat brand plum
 * underneath: the card reads as printed stock catching light rather than as a
 * filled view. */
private struct Ground: View {
  var body: some View {
    ZStack {
      Brand.plum
      RadialGradient(colors: [Color(red: 0.588, green: 0.176, blue: 0.431).opacity(0.55),
                              Brand.plumLift.opacity(0.22), .clear],
                     center: UnitPoint(x: 0.08, y: 0.0), startRadius: 0, endRadius: 210)
      RadialGradient(colors: [Color(red: 0.07, green: 0.012, blue: 0.051).opacity(0.55), .clear],
                     center: UnitPoint(x: 1.0, y: 1.0), startRadius: 0, endRadius: 190)
    }
  }
}

/* The sixteen-point girih star the app draws behind its own heroes, used here
 * as a watermark that bleeds off a corner. Only an arc of it is ever on the
 * card, which is what keeps it furniture rather than decoration — at four per
 * cent it is texture you notice only once you look for it. */
private struct Girih: Shape {
  func path(in rect: CGRect) -> Path {
    let pts: [(CGFloat, CGFloat)] = [
      (50,2),(57.3,32.4),(83.9,16.1),(67.6,42.7),(98,50),(67.6,57.3),(83.9,83.9),(57.3,67.6),
      (50,98),(42.7,67.6),(16.1,83.9),(32.4,57.3),(2,50),(32.4,42.7),(16.1,16.1),(42.7,32.4),
    ]
    var p = Path()
    for (i, pt) in pts.enumerated() {
      let x = rect.minX + pt.0 / 100 * rect.width
      let y = rect.minY + pt.1 / 100 * rect.height
      if i == 0 { p.move(to: CGPoint(x: x, y: y)) } else { p.addLine(to: CGPoint(x: x, y: y)) }
    }
    p.closeSubpath()
    return p
  }
}

/* A rule that is lit rather than drawn: a hard one-pixel line stops dead at
 * each end, this one fades out. */
private struct Rule: View {
  var width: CGFloat? = nil
  var body: some View {
    LinearGradient(colors: [Brand.gold.opacity(0.55), Brand.gold.opacity(0.04)],
                   startPoint: .leading, endPoint: .trailing)
      .frame(width: width, height: 1)
  }
}

private struct VRule: View {
  var body: some View {
    LinearGradient(stops: [.init(color: Brand.gold.opacity(0), location: 0),
                           .init(color: Brand.gold.opacity(0.38), location: 0.22),
                           .init(color: Brand.gold.opacity(0.38), location: 0.78),
                           .init(color: Brand.gold.opacity(0), location: 1)],
                   startPoint: .top, endPoint: .bottom)
      .frame(width: 1)
  }
}

/* The masjid's own mark. The full lockup — calligraphy over TAIYABAH over
 * MASJID — is three elements tall and illegible below about ninety points, so
 * what signs a widget is the calligraphy alone: مسجد طيبة, which is
 * distinctive at any size and is the part people recognise. */
private struct Mark: View {
  var width: CGFloat
  var body: some View {
    Image("Wordmark")
      .resizable()
      .aspectRatio(contentMode: .fit)
      .frame(width: width)
      .opacity(0.62)
  }
}

/* The countdown. NOT a capsule outline around two words — that is the first
 * thing that makes a widget look like a component library. Tracked small caps
 * in the accent say the same thing and get out of the way. */
private struct Until: View {
  let at: Date
  var body: some View {
    (Text("in ") + Text(at, style: .relative))
      .font(.system(size: 9.5, weight: .bold))
      .tracking(1.3)
      .textCase(.uppercase)
      .foregroundStyle(Brand.goldBright)
      .lineLimit(1)
  }
}

private struct Eyebrow: View {
  var body: some View {
    Text("NEXT JAMĀʿAH")
      .font(.system(size: 9, weight: .bold))
      .tracking(1.5)
      .foregroundStyle(Brand.goldBright.opacity(0.75))
      .lineLimit(1)
  }
}

// MARK: - The timetable

/// One day as the app stores it. Only the jamāʿah column is read here: a
/// widget has room for one time, and the one people need is the congregation.
private struct Jummah: Decodable {
  let first: String?
  let second: String?
}

private struct Day: Decodable {
  let jamaat: [String: String]
  let begins: [String: String]
  /// Fridays only, and the reason this is read at all: on a Friday the Zuhr
  /// jamāʿah is not what people attend. A widget that says "Zuhr 1:00pm" when
  /// Jumuʿah is at 1:15 sends somebody to the masjid at the wrong time, on the
  /// one day the most people come. The field was already in the bundled
  /// timetable and was simply never decoded.
  let jummah: Jummah?
  /// "13 Rajab 1447 AH". Also already shipped and never used.
  let hijri: String?
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

/// One congregation on the day being shown.
struct Slot {
  let name: String
  let at: Date
}

struct Jamaah: TimelineEntry {
  let date: Date          // when this entry becomes the one on screen
  let name: String        // "Asr"
  let at: Date            // when that jamāʿah is
  let begins: Date?       // when the prayer time itself begins
  let known: Bool         // false once the timetable runs out
  let hijri: String       // "13 Rajab 1447 AH", empty if the day has none
  /// Every jamāʿah of the day this entry falls on, so the medium size can
  /// show the whole day instead of being the small one stretched.
  let today: [Slot]
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

/// Every congregation on one day, in order, with Friday handled properly.
///
/// On a Friday the Zuhr slot IS Jumuʿah — the timetable carries its own time
/// and, where the masjid holds two, a second one. Both are shown, because
/// people attend both and a widget naming only the first sends half of them
/// at the wrong time.
private func daySlots(day: Date, record: Day) -> [Slot] {
  var out: [Slot] = []
  for p in PRAYERS {
    if p.key == "zuhr", let j = record.jummah, let first = j.first,
       let at = instant(day: day, hhmm: first) {
      /* Numbered only when there are two. "Jumuʿah" and "2nd Jumuʿah" reads
         as though the first one is the real one and the second an overflow;
         "1st" and "2nd" says they are both sittings of the same prayer, which
         is what they are. A lone sitting needs no number at all. */
      let second = (j.second?.isEmpty == false) ? j.second : nil
      out.append(Slot(name: second == nil ? "Jumuʿah" : "1st Jumuʿah", at: at))
      if let second = second, let at2 = instant(day: day, hhmm: second) {
        out.append(Slot(name: "2nd Jumuʿah", at: at2))
      }
      continue
    }
    guard let hhmm = record.jamaat[p.key], let at = instant(day: day, hhmm: hhmm) else { continue }
    out.append(Slot(name: p.name, at: at))
  }
  return out.sorted { $0.at < $1.at }
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
      let slots = daySlots(day: day, record: record)
      let hijri = record.hijri ?? ""
      for slot in slots {
        if slot.at <= from { continue }
        let key = PRAYERS.first { $0.name == slot.name }?.key ?? "zuhr"
        let begins = record.begins[key].flatMap { instant(day: day, hhmm: $0) }
        out.append(Jamaah(date: out.isEmpty ? from : slot.at.addingTimeInterval(-1),
                          name: slot.name, at: slot.at, begins: begins, known: true,
                          hijri: hijri, today: slots))
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
    Jamaah(date: Date(), name: "Asr", at: Date().addingTimeInterval(3600), begins: nil,
           known: true, hijri: "", today: [])
  }

  func getSnapshot(in context: Context, completion: @escaping (Jamaah) -> Void) {
    completion(next() ?? placeholder(in: context))
  }

  func getTimeline(in context: Context, completion: @escaping (Timeline<Jamaah>) -> Void) {
    guard let table = Source.load() else {
      let empty = Jamaah(date: Date(), name: "", at: Date(), begins: nil,
                         known: false, hijri: "", today: [])
      completion(Timeline(entries: [empty], policy: .after(Date().addingTimeInterval(3600))))
      return
    }
    let entries = upcoming(from: Date(), table: table)
    if entries.isEmpty {
      /* The timetable has run out — the masjid publishes a year at a time.
         Say so rather than showing a stale time. */
      let unknown = Jamaah(date: Date(), name: "", at: Date(), begins: nil,
                           known: false, hijri: "", today: [])
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
      /* THE COUNTDOWN, NOT THE TIME.
       *
       * This family appears in exactly two places — the Lock Screen and
       * StandBy — and both of them have a large clock immediately above it.
       * A second clock time is therefore the one genuinely redundant thing
       * this circle could show, and it was showing it. "5:00" also cannot
       * say am or pm in 76 points, so Fajr at 7:00 and Isha at 7:00 read
       * identically; switching it to 24-hour would fix the ambiguity while
       * keeping the redundancy.
       *
       * What somebody actually wants off a glance at a circle this size is
       * how long they have got. `.relative` is updated live by the system,
       * so this needs no extra timeline entries, and minimumScaleFactor
       * means a long gap ("11 hr") shrinks rather than clips.
       *
       * The full prayer name is kept rather than cut to four letters —
       * "Jumu" was not worth the characters it saved. */
      VStack(spacing: -1) {
        Text(entry.known ? entry.name.uppercased() : "—")
          .font(.system(size: 9.5, weight: .bold))
          .tracking(0.4)
          .opacity(0.75)
          .lineLimit(1)
          .minimumScaleFactor(0.55)
        if entry.known {
          Text(entry.at, style: .relative)
            .font(.system(size: 13, weight: .bold))
            .lineLimit(1)
            .minimumScaleFactor(0.5)
        }
      }
      .padding(3)
    case .accessoryRectangular:
      /* Tinted white by iOS, so colour is not available here and only the
         hierarchy carries it. */
      VStack(alignment: .leading, spacing: 3) {
        Text("NEXT JAMĀʿAH")
          .font(.system(size: 9, weight: .bold)).tracking(1.2).opacity(0.62)
        if entry.known {
          Text("\(entry.name) \(timeText(entry.at))")
            .font(.system(size: 16, weight: .bold)).tracking(-0.3)
          (Text("in ") + Text(entry.at, style: .relative))
            .font(.system(size: 10.5)).opacity(0.72)
        } else {
          Text("Timetable not published").font(.system(size: 13, weight: .semibold))
        }
      }
    case .systemMedium:
      medium
    default:
      home
    }
  }

  /* SMALL — a diagonal. The mark signs the top right, the type stacks up from
     the bottom left, and the space between them is left alone. Everything
     centred in a box is the default; a composition with a weighted corner is
     a decision. */
  private var home: some View {
    ZStack {
      Ground()
      GeometryReader { g in
        Girih()
          .fill(Brand.gold)
          .frame(width: g.size.height * 1.3, height: g.size.height * 1.3)
          .rotationEffect(.degrees(14))
          .opacity(0.038)
          .offset(x: g.size.width - g.size.height * 0.74,
                  y: g.size.height - g.size.height * 0.78)
      }
      VStack(alignment: .leading, spacing: 0) {
        HStack(alignment: .top, spacing: 8) {
          Eyebrow()
          Spacer(minLength: 0)
          Mark(width: 44)
        }
        Rule(width: 34).padding(.top, 7)
        Spacer(minLength: 0)
        if entry.known {
          Text(entry.name)
            .font(.system(size: 17, weight: .regular, design: .serif))
            .foregroundStyle(Brand.cream)
            .lineLimit(1).minimumScaleFactor(0.7)
          Text(timeText(entry.at))
            .font(.system(size: 34, weight: .bold))
            .tracking(-1.2)
            .monospacedDigit()
            .foregroundStyle(.white)
            .lineLimit(1).minimumScaleFactor(0.6)
          Until(at: entry.at).padding(.top, 5)
        } else {
          Text("Timetable not\npublished yet")
            .font(.system(size: 15, weight: .semibold))
            .foregroundStyle(Brand.cream)
        }
      }
      .padding(EdgeInsets(top: 15, leading: 15, bottom: 14, trailing: 15))
    }
  }

  /* MEDIUM IS NOT THE SMALL ONE STRETCHED.
   *
   * It was: the same four lines, twice the width, nothing more in it. A
   * medium widget costs somebody two small slots and has to earn them. The
   * left column answers "am I about to miss it" and the right answers "what
   * else is on today" — the two reasons anybody opens a prayer app, without
   * opening it. The rule between them carries the weight.
   *
   * The next prayer is MARKED, not shouted: a gold dot in the margin and the
   * accent colour. Bolding a whole row unbalances the column. Prayers already
   * prayed are dimmed rather than removed, because a list that shrinks
   * through the day loses its shape and people read these by position. */
  private var medium: some View {
    ZStack {
      Ground()
      GeometryReader { g in
        Girih()
          .fill(Brand.gold)
          .frame(width: g.size.height * 1.35, height: g.size.height * 1.35)
          .rotationEffect(.degrees(14))
          .opacity(0.038)
          .offset(x: -g.size.height * 0.52, y: g.size.height - g.size.height * 0.79)
      }
      HStack(alignment: .top, spacing: 15) {
        VStack(alignment: .leading, spacing: 0) {
          Eyebrow()
          Rule(width: 34).padding(.top, 7)
          Spacer(minLength: 0)
          if entry.known {
            Text(entry.name)
              .font(.system(size: 16, weight: .regular, design: .serif))
              .foregroundStyle(Brand.cream)
              .lineLimit(1).minimumScaleFactor(0.7)
            Text(timeText(entry.at))
              .font(.system(size: 31, weight: .bold))
              .tracking(-1.2)
              .monospacedDigit()
              .foregroundStyle(.white)
              .lineLimit(1).minimumScaleFactor(0.6)
            Until(at: entry.at).padding(.top, 5)
          } else {
            Text("Timetable not\npublished yet")
              .font(.system(size: 14, weight: .semibold))
              .foregroundStyle(Brand.cream)
          }
          Spacer(minLength: 0)
          Mark(width: 62).padding(.leading, -2)
        }
        .frame(maxWidth: .infinity, alignment: .leading)

        VRule()

        VStack(alignment: .leading, spacing: 0) {
          if !entry.hijri.isEmpty {
            /* "AH" is dropped: everybody reading a hijri date on a masjid's
               widget knows which calendar it is, and the column is 139 points
               wide. */
            Text(hijriShort(entry.hijri))
              .font(.system(size: 8, weight: .bold))
              .tracking(1.1)
              .textCase(.uppercase)
              .foregroundStyle(Brand.gold.opacity(0.8))
              .lineLimit(1).minimumScaleFactor(0.75)
            Rule().padding(.top, 6).padding(.bottom, 7)
          }
          ForEach(entry.today, id: \.name) { slot in
            DayRow(slot: slot,
                   isNext: entry.known && slot.at == entry.at,
                   past: slot.at < entry.at)
          }
          Spacer(minLength: 0)
        }
        .frame(width: 139, alignment: .leading)
      }
      .padding(EdgeInsets(top: 15, leading: 16, bottom: 14, trailing: 16))
    }
  }
}

/* One line of the day's list.
 *
 * Its own view rather than a `let` or two inside the ForEach closure: result
 * builders only lifted their restrictions on local bindings in Swift 5.8, the
 * target still declares SWIFT_VERSION 5.0, and a build failing on that would
 * be a bad way to find out. It also reads better. */
private struct DayRow: View {
  let slot: Slot
  let isNext: Bool
  let past: Bool

  var body: some View {
    HStack(spacing: 4) {
      Text(slot.name)
        .font(.system(size: 11, weight: isNext ? .bold : .medium))
        .lineLimit(1)
        .minimumScaleFactor(0.75)
      Spacer(minLength: 4)
      Text(timeText(slot.at))
        .font(.system(size: 11, weight: isNext ? .bold : .medium))
        .monospacedDigit()
    }
    .foregroundStyle(isNext ? Brand.goldBright
                            : Brand.cream.opacity(past ? 0.34 : 0.88))
    .padding(.vertical, 2.2)
    .overlay(alignment: .leading) {
      if isNext {
        Circle().fill(Brand.goldBright).frame(width: 3, height: 3).offset(x: -9)
      }
    }
  }
}

private func hijriShort(_ s: String) -> String {
  s.replacingOccurrences(of: " AH", with: "")
}

@main
struct NextJamaahWidget: Widget {
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: "TaiyabahNextJamaah", provider: Provider()) { entry in
      /* Tapping it opens the Times tab, not wherever the app happened to be
         left. taiyabah://times is routed by the `linking` config in
         src/App.jsx, and native/scripts/test/links.test.mjs fails if that
         route stops existing. */
      if #available(iOS 17.0, *) {
        NextJamaahView(entry: entry)
          .containerBackground(for: .widget) { Brand.plum }
          .widgetURL(URL(string: "taiyabah://times"))
      } else {
        NextJamaahView(entry: entry)
          .widgetURL(URL(string: "taiyabah://times"))
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
