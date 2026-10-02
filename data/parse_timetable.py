#!/usr/bin/env python3
"""
Taiyabah Masjid — timetable ingestion.

    python3 parse_timetable.py 2027

Input : raw_timetable_<year>.txt  (rows lifted verbatim from the official PDF)
        year-<year>.json          (the Hijri year on 1 January, and the days
                                   hand-checked against the printed board)
Output: timetable-<year>.json     (clean daily dataset for the app)

The year is an argument, not a constant. It was 2026 in fourteen places —
filenames, three date constructors, two regexes, the Hijri seed, the day count,
the BST dates and the spot checks — which made the annual refresh an edit to
this script, in late December, under time pressure, by whoever is holding it.
That is the worst possible moment to be changing a parser. Now the only things
that change are the two input files, and the script refuses to run without
them rather than quietly assuming last year's.

Model notes
-----------
* Column order per row (from the PDF header):
    BEGINS : Fajr  Sunrise  Zuhr  Asr  Isha
    JAMAAT : Fajr  Zuhr  Asr  Maghrib  Isha
  There is no separate "Maghrib begins" column — Maghrib is prayed at the
  listed time, so begins.maghrib := jamaat.maghrib.
* Ditto marks (") mean "same as the day above" and are forward-filled
  per column. Begins are always explicit; only jamaat uses ditto.
* Times carry no AM/PM. Rule: Fajr & Sunrise = AM; Zuhr/Asr/Maghrib/Isha = PM.
* Clock times already bake in BST — we store local wall-clock (Europe/London).
"""
import re, json, sys, datetime

def year_from_argv():
    """The year to build, with no default. A default here would mean a typo
       silently rebuilding last year over this year's output."""
    if len(sys.argv) < 2 or not re.fullmatch(r"\d{4}", sys.argv[1]):
        sys.exit("usage: parse_timetable.py <year>   e.g. parse_timetable.py 2027")
    return int(sys.argv[1])

YEAR = year_from_argv()
SRC  = f"raw_timetable_{YEAR}.txt"
OUT  = f"timetable-{YEAR}.json"
CFG  = f"year-{YEAR}.json"

MONTHS = {m: i+1 for i, m in enumerate(
    ["JANUARY","FEBRUARY","MARCH","APRIL","MAY","JUNE","JULY",
     "AUGUST","SEPTEMBER","OCTOBER","NOVEMBER","DECEMBER"])}
DOW = {"MON","TUE","WED","THU","FRI","SAT","SUN"}
HIJRI = {
    "RJB":"Rajab","SHBN":"Sha'ban","RMD":"Ramadan","SHWL":"Shawwal","SHW":"Shawwal",
    "ZQDH":"Dhul Qa'dah","ZHAJJ":"Dhul Hijjah","MUHRM":"Muharram","SFR":"Safar",
    "RAWAL":"Rabi al-Awwal","RAKHIR":"Rabi al-Thani",
    "JAWL":"Jumada al-Awwal","JAWAL":"Jumada al-Awwal","JAKHIR":"Jumada al-Thani",
}
TIME = re.compile(r"^\d{1,2}:\d{2}$")
BEGIN_KEYS = ["fajr","sunrise","zuhr","asr","isha"]
BEGIN_AMPM = ["AM","AM","PM","PM","PM"]
JAM_KEYS   = ["fajr","zuhr","asr","maghrib","isha"]
JAM_AMPM   = ["AM","PM","PM","PM","PM"]

def to24(t, ampm):
    h, m = map(int, t.split(":"))
    if ampm == "AM":
        if h == 12: h = 0
    else:
        if h != 12: h += 12
    return f"{h:02d}:{m:02d}"

def is_time(tok):
    return bool(TIME.match(tok))

# ---- second Jumu'ah schedule ----
def parse_second_jummah(lines):
    explicit = {}   # date -> "HH:MM"
    window = None
    date_re = re.compile(rf"^(\d{{1,2}})\w{{0,2}}\s+(\w+)\s+{YEAR}\s+(\d{{1,2}}:\d{{2}})(AM|PM)", re.I)
    win_re  = re.compile(rf"WINDOW_330\s+(\d{{1,2}})\w{{0,2}}\s+(\w+)\s+{YEAR}\s+to\s+(\d{{1,2}})\w{{0,2}}\s+(\w+)\s+{YEAR}", re.I)
    for ln in lines:
        w = win_re.search(ln)
        if w:
            a = datetime.date(YEAR, MONTHS[w.group(2).upper()], int(w.group(1)))
            b = datetime.date(YEAR, MONTHS[w.group(4).upper()], int(w.group(3)))
            window = (a, b)
            continue
        m = date_re.match(ln.strip())
        if m:
            d = datetime.date(YEAR, MONTHS[m.group(2).upper()], int(m.group(1)))
            explicit[d] = to24(m.group(3), m.group(4).upper())
    return explicit, window

def second_jummah_for(d, explicit, window):
    if d in explicit:
        return explicit[d]
    if window and window[0] <= d <= window[1]:
        return "15:30"
    # fallback: most recent explicit on/before d
    prior = [k for k in explicit if k <= d]
    return explicit[max(prior)] if prior else None

def last_sunday(year, month):
    """UK clocks change on the last Sunday of March and of October. Derived,
       because two more hand-typed dates a year is two more things to get
       wrong, and this one is a rule rather than a fact about the PDF."""
    from calendar import monthrange
    d = datetime.date(year, month, monthrange(year, month)[1])
    return d - datetime.timedelta(days=(d.weekday() + 1) % 7)


def main():
    try:
        cfg = json.load(open(CFG, encoding="utf-8"))
    except FileNotFoundError:
        sys.exit(f"missing {CFG} — it carries the Hijri year on 1 January and the "
                 f"days checked against the printed board. Copy year-2026.json and "
                 f"fill it in from the new timetable; do not guess it.")
    ah_start = cfg["ah_year_at_jan_1"]
    spot = {k: tuple(v) for k, v in cfg["spot"].items()}
    if not spot:
        sys.exit(f"{CFG} lists no spot checks. A day count does not catch a year "
                 f"read the American way round; a handful of checked days does.")
    bad_year = [k for k in spot if not k.startswith(f"{YEAR}-")]
    if bad_year:
        sys.exit(f"{CFG} has spot checks for another year: {', '.join(bad_year)}")

    lines = open(SRC, encoding="utf-8").read().splitlines()
    explicit_jum, window = parse_second_jummah(lines)

    data = {}
    cur_month = None
    cur_hijri_month = None
    ah_year = ah_start
    last_jam = {k: None for k in JAM_KEYS}
    warnings = []

    for ln in lines:
        toks = ln.split()
        if not toks:
            continue
        # month header?
        up = ln.upper()
        hit = next((MONTHS[k] for k in MONTHS if k in up and "BEGINNING" in up), None)
        if hit:
            cur_month = hit
            continue
        # data row?  int day + DOW ...
        if not (toks[0].replace("*","").isdigit() and len(toks) > 2 and toks[1] in DOW):
            continue

        gday = int(toks[0].replace("*",""))
        rest = toks[2:]
        # hijri day is first token; may carry a trailing hijri-month code after it
        # separate alpha tokens (hijri month codes) from numeric/ditto cells
        cells = []
        seen_hday = False
        for tok in rest:
            t = tok.replace("*","")
            if not seen_hday:
                seen_hday = True          # first token = hijri day, skip value
                continue
            if re.search(r"[A-Za-z]", t):  # hijri month code
                code = t.upper()
                if code in HIJRI:
                    newm = HIJRI[code]
                    if newm == "Muharram" and cur_hijri_month != "Muharram":
                        ah_year += 1
                    cur_hijri_month = newm
                else:
                    warnings.append(f"{cur_month}/{gday}: unknown hijri code {code}")
            else:
                cells.append(tok)          # time or ditto
        hday = int(rest[0].replace("*",""))

        # pad to 10 cells (begins 5 + jamaat 5); missing trailing = ditto
        while len(cells) < 10:
            cells.append('"')
        if len(cells) > 10:
            warnings.append(f"{cur_month}/{gday}: {len(cells)} cells (expected 10)")
            cells = cells[:10]

        begins = {}
        for i, k in enumerate(BEGIN_KEYS):
            c = cells[i]
            if not is_time(c):
                warnings.append(f"{cur_month}/{gday}: begins.{k} not a time ({c!r})")
                begins[k] = None
            else:
                begins[k] = to24(c, BEGIN_AMPM[i])

        jamaat = {}
        for i, k in enumerate(JAM_KEYS):
            c = cells[5+i]
            if is_time(c):
                v = to24(c, JAM_AMPM[i])
                jamaat[k] = v
                last_jam[k] = v
            else:  # ditto → carry forward
                if last_jam[k] is None:
                    warnings.append(f"{cur_month}/{gday}: jamaat.{k} ditto with no prior")
                jamaat[k] = last_jam[k]

        begins["maghrib"] = jamaat["maghrib"]   # Maghrib begin == its time

        date = datetime.date(YEAR, cur_month, gday)
        rec = {
            "hijri": f"{hday} {cur_hijri_month} {ah_year} AH",
            "begins": {k: begins[k] for k in ["fajr","sunrise","zuhr","asr","maghrib","isha"]},
            "jamaat": {k: jamaat[k] for k in ["fajr","zuhr","asr","maghrib","isha"]},
        }
        if date.weekday() == 4:  # Friday
            rec["jummah"] = {"first": jamaat["zuhr"],
                             "second": second_jummah_for(date, explicit_jum, window)}
        data[date.isoformat()] = rec

    # ---------------- verification ----------------
    errs = []
    keys = sorted(data)
    # 1. day count + per-month completeness
    from calendar import isleap, monthrange
    want_days = 366 if isleap(YEAR) else 365
    if len(keys) != want_days:
        errs.append(f"expected {want_days} days, got {len(keys)}")
    for mo in range(1, 13):
        want = monthrange(YEAR, mo)[1]
        got = sum(1 for k in keys if int(k[5:7]) == mo)
        if got != want:
            errs.append(f"month {mo}: {got} days (expected {want})")
    # 2. no missing values; jamaat after begin (except maghrib == )
    def mins(t): h, m = map(int, t.split(":")); return h*60+m
    for k in keys:
        r = data[k]
        for grp in ("begins","jamaat"):
            for kk, vv in r[grp].items():
                if vv is None:
                    errs.append(f"{k}: {grp}.{kk} missing")
        try:
            for p in ["fajr","zuhr","asr","isha"]:
                if mins(r["jamaat"][p]) < mins(r["begins"][p]):
                    errs.append(f"{k}: {p} jamaat before begins")
            if r["begins"]["maghrib"] != r["jamaat"]["maghrib"]:
                errs.append(f"{k}: maghrib begin/jamaat mismatch")
        except Exception:
            pass
    # 3. Fridays carry jummah
    for k in keys:
        d = datetime.date.fromisoformat(k)
        if d.weekday() == 4 and "jummah" not in data[k]:
            errs.append(f"{k}: Friday missing jummah")

    # ---- spot checks, hand-verified against the printed board (from CFG) ----
    #      (fajr begins, fajr jamaat, zuhr begins, zuhr jamaat, maghrib, isha jamaat)
    for k,(fb,fj,zb,zj,mg,ij) in spot.items():
        r = data.get(k)
        if not r: errs.append(f"spot {k}: missing"); continue
        got = (r["begins"]["fajr"], r["jamaat"]["fajr"], r["begins"]["zuhr"],
               r["jamaat"]["zuhr"], r["jamaat"]["maghrib"], r["jamaat"]["isha"])
        exp = (fb, fj or got[1], zb, zj, mg, ij)
        if got != exp:
            errs.append(f"spot {k}: got {got} expected {exp}")

    print("="*54)
    print(f"Parsed days : {len(keys)}  ({keys[0]} … {keys[-1]})")
    print(f"Fridays     : {sum(1 for k in keys if datetime.date.fromisoformat(k).weekday()==4)}")
    print(f"AH span     : {data[keys[0]]['hijri']}  →  {data[keys[-1]]['hijri']}")
    print(f"Warnings    : {len(warnings)}")
    for w in warnings[:12]: print("   ·", w)
    print(f"Errors      : {len(errs)}")
    for e in errs[:20]: print("   ✗", e)
    print("="*54)
    mid = keys[len(keys)//2]
    print(f"Sample — {mid}:")
    print(json.dumps(data[mid], indent=2, ensure_ascii=False))

    if errs:
        print("\nVERIFICATION FAILED — not writing output.")
        sys.exit(1)

    with open(OUT, "w", encoding="utf-8") as f:
        json.dump({
            "masjid": "Taiyabah Masjid (Bolton Central Islamic Society)",
            "year": YEAR,
            "source": f"Official {YEAR} Salah Timetable "
                      f"({data[keys[0]]['hijri'].split()[-2]}–{data[keys[-1]]['hijri'].split()[-2]} AH)",
            "timezone": "Europe/London",
            "notes": {"bst_start": last_sunday(YEAR, 3).isoformat(),
                      "bst_end": last_sunday(YEAR, 10).isoformat(),
                      "maghrib": "begins == jamaat (prayed at listed time)"},
            "days": data,
        }, f, ensure_ascii=False, indent=1)
    print(f"\n✓ wrote {OUT} ({len(keys)} days)")

if __name__ == "__main__":
    main()
