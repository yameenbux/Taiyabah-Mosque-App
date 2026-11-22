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

/* Not private: activity.swift draws the Live Activity from the same palette,
   and two copies of a brand's colours is how one of them goes stale. */
enum Brand {
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
    /* .timer, NOT .relative.
     *
     * SwiftUI's .relative style prints the two largest units — "12 min,
     * 22 sec" — which is both longer than this line has room for and more
     * precision than anybody wants off a glance. It truncated to
     * "IN 12 min, 22…" on a real phone.
     *
     * .timer is the mm:ss form and always one short token. On its own that
     * reads as a clock time, which is exactly the confusion to avoid next to
     * a 24-hour status bar — so it is never shown here without the "in"
     * carrying it. The timeline only refreshes once per prayer, so a string
     * computed here would be hours stale; both of these styles are redrawn
     * by the system instead. */
    (Text("in ") + Text(at, style: .timer))
      .font(.system(size: 11, weight: .bold))
      /* Tracking is added in points and does NOT shrink with
         minimumScaleFactor, so a heavily tracked line fights its own fallback.
         Less of it here, now the string can be "in 10:30:14". */
      .tracking(0.6)
      .textCase(.uppercase)
      .foregroundStyle(Brand.goldBright)
      .lineLimit(1)
      .minimumScaleFactor(0.75)
  }
}

private struct Eyebrow: View {
  var body: some View {
    /* TRACKING COSTS WIDTH AND lineLimit(1) ALONE SPENDS IT ON AN ELLIPSIS.
     * 1.5pt of tracking across twelve letters is 18pt — on a small widget,
     * next to the mark, that was the difference between "NEXT JAMĀʿAH" and
     * "NEX…". minimumScaleFactor makes the overflow shrink the type instead
     * of eating the words, and the tracking comes down so it rarely has to. */
    Text("NEXT JAMĀʿAH")
      .font(.system(size: 11, weight: .bold))
      .tracking(1.2)
      .foregroundStyle(Brand.goldBright.opacity(0.75))
      .lineLimit(1)
      .minimumScaleFactor(0.7)
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

/// One column of the medium size's strip: a prayer (or Sunrise), the day's
/// begins time as a 24-hour string, and — where there is a congregation — its
/// jamāʿah time and instant. Sunrise has no jamāʿah, so both are nil.
struct Col {
  let name: String
  let begins: String
  let jamaah: String?
  let at: Date?
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
  /// The six columns the medium size draws as a strip — Fajr … Isha with
  /// Sunrise — each carrying begins and, where there is one, the jamāʿah.
  let strip: [Col]
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

/// The six columns for the medium strip on a given day: begins for all six
/// (Sunrise included), and the jamāʿah for the five congregations. On Friday
/// the Zuhr column's jamāʿah is the first Jumuʿah sitting, so the strip, the
/// header and the app all name the same time.
private func stripFor(day: Date, record: Day) -> [Col] {
  let cols: [(key: String, name: String, jam: String?)] = [
    ("fajr", "Fajr", "fajr"),
    ("sunrise", "Sunrise", nil),
    ("zuhr", "Zuhr", "zuhr"),
    ("asr", "Asr", "asr"),
    ("maghrib", "Maghrib", "maghrib"),
    ("isha", "Isha", "isha"),
  ]
  return cols.map { c in
    let begins = record.begins[c.key] ?? ""
    var jam: String? = nil
    if let jk = c.jam {
      if jk == "zuhr", let j = record.jummah, let first = j.first, !first.isEmpty {
        jam = first
      } else {
        jam = record.jamaat[jk]
      }
    }
    let at = jam.flatMap { instant(day: day, hhmm: $0) }
    return Col(name: c.name, begins: begins, jamaah: jam, at: at)
  }
}

/// Every remaining jamāʿah from `from` onwards, across as many days as the
/// timetable holds, capped so a timeline stays a sensible size.
private func upcoming(from: Date, table: Timetable, limit: Int = 60) -> [Jamaah] {
  var out: [Jamaah] = []
  let cal = londonCalendar()
  var day = cal.startOfDay(for: from)
  var guardDays = 0
  /* The time of the jamāʿah appended just before this one, which is when the
     next entry should replace it on screen. Carried across days. */
  var previousAt: Date? = nil
  while out.count < limit && guardDays < 14 {
    if let record = table.days[isoKey(day)] {
      let slots = daySlots(day: day, record: record)
      let strip = stripFor(day: day, record: record)
      let hijri = record.hijri ?? ""
      for slot in slots {
        if slot.at <= from { continue }
        let key = PRAYERS.first { $0.name == slot.name }?.key ?? "zuhr"
        let begins = record.begins[key].flatMap { instant(day: day, hhmm: $0) }
        /* AN ENTRY TAKES OVER WHEN THE PRAYER BEFORE IT HAS BEEN, NOT A
           SECOND BEFORE ITS OWN.
           
           This read `slot.at.addingTimeInterval(-1)`, which meant the entry
           for Fajr did not become the visible one until one second before
           Fajr — and so the entry for Isha stayed on screen from the evening
           right through until morning, naming a jamāʿah that had already
           been. Worse, `at` was then in the past, and Text(style: .timer)
           counts UP from a past date: the widget sat there all night showing
           Isha with a number climbing away from it.
           
           Handing each entry the PREVIOUS slot's time makes the widget turn
           over at the jamāʿah, which is also exactly when nextJamaah() in
           src/prayer.js turns over — the app and the widget now answer the
           same question the same way, rather than differing by one prayer
           for most of the night. */
        out.append(Jamaah(date: out.isEmpty ? from : previousAt ?? from,
                          name: slot.name, at: slot.at, begins: begins, known: true,
                          hijri: hijri, today: slots, strip: strip))
        previousAt = slot.at
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
           known: true, hijri: "", today: [], strip: [])
  }

  func getSnapshot(in context: Context, completion: @escaping (Jamaah) -> Void) {
    completion(next() ?? placeholder(in: context))
  }

  func getTimeline(in context: Context, completion: @escaping (Timeline<Jamaah>) -> Void) {
    guard let table = Source.load() else {
      let empty = Jamaah(date: Date(), name: "", at: Date(), begins: nil,
                         known: false, hijri: "", today: [], strip: [])
      completion(Timeline(entries: [empty], policy: .after(Date().addingTimeInterval(3600))))
      return
    }
    let entries = upcoming(from: Date(), table: table)
    if entries.isEmpty {
      /* The timetable has run out — the masjid publishes a year at a time.
         Say so rather than showing a stale time. */
      let unknown = Jamaah(date: Date(), name: "", at: Date(), begins: nil,
                           known: false, hijri: "", today: [], strip: [])
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
          /* .timer, not .relative: "12 min, 22 sec" in a 76-point circle
             shrinks to something nobody can read. mm:ss fits, and under the
             prayer name it cannot be mistaken for a clock. */
          Text(entry.at, style: .timer)
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
          (Text("in ") + Text(entry.at, style: .timer))
            .font(.system(size: 10.5)).opacity(0.72)
            .lineLimit(1).minimumScaleFactor(0.8)
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
      GeometryReader { g in
        Girih()
          .fill(Brand.gold)
          .frame(width: g.size.height * 1.3, height: g.size.height * 1.3)
          .rotationEffect(.degrees(14))
          .opacity(0.038)
          .offset(x: g.size.width - g.size.height * 0.74,
                  y: g.size.height - g.size.height * 0.78)
      }
      /* THE EYEBROW GETS THE WHOLE LINE.
       *
       * It used to share the top row with the mark, and on a small widget
       * that left it about half the width — "NEXT JAMĀʿAH" came out as
       * "NEX…", then "NEXT JA…" once minimumScaleFactor was added, because
       * the space was below even the floor that was willing to shrink to.
       * No type size fixes that; the row does. The mark moves down beside
       * the countdown, where the line is short and there is width going
       * spare, and it gets bigger there than it ever was up top. */
      VStack(alignment: .leading, spacing: 0) {
        Eyebrow()
        Rule(width: 38).padding(.top, 7)
        Spacer(minLength: 0)
        if entry.known {
          Text(entry.name)
            .font(.system(size: 20, weight: .regular, design: .serif))
            .foregroundStyle(Brand.cream)
            .lineLimit(1).minimumScaleFactor(0.7)
          Text(timeText(entry.at))
            .font(.system(size: 38, weight: .bold))
            .tracking(-1.2)
            .monospacedDigit()
            .foregroundStyle(.white)
            .lineLimit(1).minimumScaleFactor(0.6)
          HStack(alignment: .bottom, spacing: 8) {
            Until(at: entry.at)
            Spacer(minLength: 0)
            Mark(width: 40)
          }
          .padding(.top, 6)
        } else {
          Text("Timetable not\npublished yet")
            .font(.system(size: 15, weight: .semibold))
            .foregroundStyle(Brand.cream)
        }
      }
      .padding(EdgeInsets(top: 15, leading: 15, bottom: 14, trailing: 15))
    }
  }

  /* MEDIUM — the whole day as a strip, which is the shape the masjid asked
   * for after seeing it on another app. A header names the next jamāʿah and
   * counts down to it; under a rule, six columns — Fajr, Sunrise, Zuhr, Asr,
   * Maghrib, Isha — each carry the begins time on top and the jamāʿah below.
   * Sunrise has a dash where a congregation time would be; there is none. The
   * next jamāʿah's column is boxed in gold, so a glance lands on it. */
  private var medium: some View {
    ZStack {
      GeometryReader { g in
        Girih()
          .fill(Brand.gold)
          .frame(width: g.size.height * 1.35, height: g.size.height * 1.35)
          .rotationEffect(.degrees(14))
          .opacity(0.038)
          .offset(x: g.size.width - g.size.height * 0.92, y: g.size.height - g.size.height * 0.82)
      }
      VStack(alignment: .leading, spacing: 0) {
        HStack(alignment: .top, spacing: 6) {
          VStack(alignment: .leading, spacing: 1) {
            Text("TAIYABAH MASJID")
              .font(.system(size: 9, weight: .bold)).tracking(1.4)
              .foregroundStyle(Brand.goldBright.opacity(0.8))
              .lineLimit(1).minimumScaleFactor(0.8)
            Text(entry.known ? entry.name : "Timetable")
              .font(.system(size: 22, weight: .regular, design: .serif))
              .foregroundStyle(Brand.cream)
              .lineLimit(1).minimumScaleFactor(0.6)
          }
          Spacer(minLength: 6)
          if entry.known {
            VStack(alignment: .trailing, spacing: 1) {
              Text("JAMĀʿAH IN")
                .font(.system(size: 8, weight: .bold)).tracking(0.9)
                .foregroundStyle(Brand.cream.opacity(0.55))
                .lineLimit(1).minimumScaleFactor(0.8)
              Text(entry.at, style: .timer)
                .font(.system(size: 20, weight: .bold)).monospacedDigit()
                .foregroundStyle(Brand.goldBright)
                .multilineTextAlignment(.trailing)
                .lineLimit(1).minimumScaleFactor(0.5)
                .frame(maxWidth: 96, alignment: .trailing)
            }
          }
        }
        Rule().padding(.top, 9).padding(.bottom, 9)
        if entry.known && !entry.strip.isEmpty {
          HStack(alignment: .top, spacing: 0) {
            ForEach(entry.strip, id: \.name) { col in
              StripCol(col: col, isNow: col.at != nil && col.at == entry.at)
                .frame(maxWidth: .infinity)
            }
          }
        } else if !entry.known {
          Text("Timetable not published yet")
            .font(.system(size: 14, weight: .semibold))
            .foregroundStyle(Brand.cream)
        }
        Spacer(minLength: 0)
        if !entry.hijri.isEmpty {
          Text(hijriShort(entry.hijri))
            .font(.system(size: 8, weight: .bold)).tracking(1.0)
            .textCase(.uppercase)
            .foregroundStyle(Brand.gold.opacity(0.65))
            .frame(maxWidth: .infinity, alignment: .center)
            .lineLimit(1).minimumScaleFactor(0.8)
        }
      }
      .padding(EdgeInsets(top: 13, leading: 16, bottom: 12, trailing: 16))
    }
  }
}

/* One column of the medium strip: a prayer name, its begins time, and its
 * jamāʿah below — the jamāʿah boxed in gold when it is the next one. Its own
 * view rather than a `let` or two inside the ForEach closure: result builders
 * only lifted their restrictions on local bindings in Swift 5.8, the target
 * still declares SWIFT_VERSION 5.0, and a build failing on that would be a bad
 * way to find out. */
private struct StripCol: View {
  let col: Col
  let isNow: Bool

  var body: some View {
    VStack(spacing: 3) {
      Text(col.name)
        .font(.system(size: 9, weight: .bold))
        .foregroundStyle(isNow ? Brand.goldBright : Brand.cream.opacity(0.6))
        .lineLimit(1).minimumScaleFactor(0.7)
      Text(col.begins)
        .font(.system(size: 13, weight: .bold)).monospacedDigit()
        .foregroundStyle(Brand.cream)
        .lineLimit(1).minimumScaleFactor(0.7)
      Text(col.jamaah ?? "—")
        .font(.system(size: 11, weight: .bold)).monospacedDigit()
        .foregroundStyle(isNow ? Color.white
                               : (col.jamaah == nil ? Brand.cream.opacity(0.38) : Brand.goldBright))
        .lineLimit(1).minimumScaleFactor(0.7)
        .padding(.horizontal, isNow ? 5 : 0)
        .padding(.vertical, isNow ? 1 : 0)
        .background(isNow ? Brand.gold : Color.clear, in: Capsule())
    }
  }
}

private func hijriShort(_ s: String) -> String {
  s.replacingOccurrences(of: " AH", with: "")
}

struct NextJamaahWidget: Widget {
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: "TaiyabahNextJamaah", provider: Provider()) { entry in
      /* Tapping it opens the Times tab, not wherever the app happened to be
         left. taiyabah://times is routed by the `linking` config in
         src/App.jsx, and native/scripts/test/links.test.mjs fails if that
         route stops existing. */
      /* THE GROUND BELONGS TO THE CONTAINER, NOT THE CONTENT.
       *
       * iOS 17 insets a widget's content from its container by the system
       * content margins. Ground() — plum plus two radial gradients — was
       * being drawn inside that inset area while the container itself was
       * filled with flat Brand.plum, so the gradient stopped short of the
       * widget's edges and read as a second rounded panel sitting inside the
       * first. A box inside a box, on the home screen, which is the single
       * most obvious way for a widget to look unfinished.
       *
       * Behind the container it bleeds to the real corners and there is one
       * surface again. Pre-17 has no container to fill, so it keeps a plain
       * background and is equally not doubled. */
      if #available(iOS 17.0, *) {
        NextJamaahView(entry: entry)
          .containerBackground(for: .widget) { Ground() }
          .widgetURL(URL(string: "taiyabah://times"))
      } else {
        NextJamaahView(entry: entry)
          .background(Ground())
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
