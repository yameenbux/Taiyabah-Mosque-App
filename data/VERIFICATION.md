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

1. Pull the new timetable's rows into `raw_timetable_2026.txt` format
   (month header line + one row per day, ditto marks preserved).
2. `python3 parse_timetable.py` — it verifies, and refuses to write output if any
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
