# Timetable data — verification

**Dataset:** `timetable-2026.json` — 365 days, generated from Taiyabah's official
2026 Salah Timetable PDF via `parse_timetable.py` (source rows in
`raw_timetable_2026.txt`).

A wrong jamāʿah time in an app people trust is worse than no app. So this
dataset is not hand-typed — it's parsed deterministically and checked. Below is
what the machine already confirmed, and what a human still needs to sign off.

## Automated checks (all currently passing)

- 365 days, correct day-count for every month.
- No missing begin/jamāʿah values; every ditto (`"`) resolved.
- Jamāʿah is never earlier than the begin time (Fajr/Zuhr/Asr/Isha).
- Maghrib begin == Maghrib jamāʿah (prayed at the listed time).
- All 52 Fridays carry Jumuʿah times.
- Hijri months run continuously (Rajab 1447 → Rajab 1448).
- Spot-checks on 1 Jan, 12 Aug, 31 Dec match the PDF exactly.
- Clock-change days verified: 29 Mar (BST starts), 25 Oct (GMT returns).

## Human sign-off (do this before launch)

The committee should eyeball the generated times against the **printed board**
for a handful of dates — the machine confirms internal consistency, not that the
source PDF was transcribed to their intent:

- [ ] Today + the next 7 days, against the wall timetable.
- [ ] The four season edges: a week in Jan, May, Aug, Nov.
- [ ] Both clock-change weekends (29 Mar, 25 Oct).
- [ ] Ramadan (18 Feb – ~19 Mar) — Suhūr/Iftār depend on Fajr/Maghrib.
- [ ] **1st Jumuʿah assumption** — the dataset uses the Friday Zuhr-jamāʿah value
      as 1st Jumuʿah (12:45 winter / 13:30 summer) and the separate schedule for
      2nd Jumuʿah. Confirm the 1st Jumuʿah time is right; if it's a fixed
      different time, correct it in the data.

## Regenerating (e.g. for 2027)

1. Pull the new timetable's rows into `raw_timetable_<year>.txt` format, and
   fill in `year-<year>.json` from the printed board
   (month header line + one row per day, ditto marks preserved).
2. `python3 parse_timetable.py <year>` — it verifies, and refuses to write output if any
   check fails.
3. Re-run the human sign-off above.

## Shape (per day)

```json
"2026-08-12": {
  "hijri": "29 Safar 1448 AH",
  "begins": { "fajr","sunrise","zuhr","asr","maghrib","isha" },
  "jamaat": { "fajr","zuhr","asr","maghrib","isha" },
  "jummah": { "first","second" }   // Fridays only
}
```

Times are 24h local wall-clock (Europe/London); BST is already baked in
(starts 2026-03-29, ends 2026-10-25).

---

# 2027

**Dataset:** `timetable-2027.json` — 365 days, parsed by `parse_timetable.py 2027`
from `raw_timetable_2027.txt`, whose rows were lifted from the text layer of the
masjid's official 2027 Salah Timetable PDF (1448–1449 AH) rather than retyped.

## Automated checks (all passing)

- 365 days, correct day-count for every month, 53 Fridays.
- 0 warnings, 0 errors from the parser; it writes nothing if either is non-zero.
- Hijri runs 23 Rajab 1448 → 3 Sha'ban 1449, continuous: no day number jumps
  except to 1 at a month boundary, and all fourteen months in canonical order
  with the AH year turning at Muharram.
- Every one of the 365 rows re-read **straight from the PDF text by separate
  code** and compared field by field against the generated JSON — 0 mismatches
  — and each row's printed weekday checked against the real 2027 calendar.
- Five spot checks in `year-2027.json`: 1 Jan, 31 Dec, 2 July (deepest summer,
  Fajr begins 02:46) and **both clock changes**, 28 March and 31 October. The
  clock-change rows are the likeliest for a parser to mangle and the hardest
  for a reader to spot, because every time on them jumps an hour.

## Two things the source document does not say

1. **Friday 31 December 2027 has no 2nd Jumuʿah time.** Page 2 of the PDF lists
   2nd Jumuʿah every Friday up to 24 December and stops, but 31 December is a
   Friday and the daily table carries it. The parser's rule is to carry the last
   stated time forward, so the dataset says **13:40**, copied from 24 December.
   That is an assumption, not the board. **Ask the committee.**
2. The PDF spells 26 February "FEBRAURY" on its 2nd Jumuʿah page. Corrected in
   `raw_timetable_2027.txt` so the month parses; no time was changed.

## Human sign-off (before `published` is set true)

The rows are loaded by `db/155_prayer_times_2027.sql` with **`published = false`**,
so the app ignores them entirely until the committee has checked:

- [ ] A week of days against the printed board.
- [ ] The four season edges: a week in Jan, May, Aug, Nov.
- [ ] Both clock-change weekends (28 Mar, 31 Oct).
- [ ] Ramadan (begins ~8 Feb 2027) — Suhūr/Iftār depend on Fajr/Maghrib.
- [ ] 1st Jumuʿah, which the dataset takes from the Friday Zuhr jamāʿah column.
- [ ] **31 December's 2nd Jumuʿah**, per the note above.
