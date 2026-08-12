#!/usr/bin/env python3
"""
Taiyabah Masjid — 2026 timetable ingestion.

Input : raw_timetable_2026.txt  (rows lifted verbatim from the official PDF)
Output: timetable-2026.json     (clean daily dataset for the app)

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

SRC = "raw_timetable_2026.txt"
OUT = "timetable-2026.json"

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
    date_re = re.compile(r"^(\d{1,2})\w{0,2}\s+(\w+)\s+2026\s+(\d{1,2}:\d{2})(AM|PM)", re.I)
    win_re  = re.compile(r"WINDOW_330\s+(\d{1,2})\w{0,2}\s+(\w+)\s+2026\s+to\s+(\d{1,2})\w{0,2}\s+(\w+)\s+2026", re.I)
    for ln in lines:
        w = win_re.search(ln)
        if w:
            a = datetime.date(2026, MONTHS[w.group(2).upper()], int(w.group(1)))
            b = datetime.date(2026, MONTHS[w.group(4).upper()], int(w.group(3)))
            window = (a, b)
            continue
        m = date_re.match(ln.strip())
        if m:
            d = datetime.date(2026, MONTHS[m.group(2).upper()], int(m.group(1)))
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

def main():
    lines = open(SRC, encoding="utf-8").read().splitlines()
    explicit_jum, window = parse_second_jummah(lines)

    data = {}
    cur_month = None
    cur_hijri_month = None
    ah_year = 1447
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
                        ah_year = 1448
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

        date = datetime.date(2026, cur_month, gday)
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
    if len(keys) != 365:
        errs.append(f"expected 365 days, got {len(keys)}")
    from calendar import monthrange
    for mo in range(1, 13):
        want = monthrange(2026, mo)[1]
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

    # ---------------- spot checks (hand-verified vs PDF) ----------------
    spot = {
        "2026-01-01": ("06:36","07:45","12:20","12:45","16:06","18:30"),  # fajrB,fajrJ,zuhrB,zuhrJ,maghrib,ishaJ
        "2026-08-12": ("04:02","05:10","13:21","13:45","20:50","22:15"),
        "2026-12-31": ("06:36",None,"12:20","12:45","16:04","18:30"),
    }
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
    print("Sample — 2026-08-12:")
    print(json.dumps(data["2026-08-12"], indent=2, ensure_ascii=False))

    if errs:
        print("\nVERIFICATION FAILED — not writing output.")
        sys.exit(1)

    with open(OUT, "w", encoding="utf-8") as f:
        json.dump({
            "masjid": "Taiyabah Masjid (Bolton Central Islamic Society)",
            "year": 2026, "source": "Official 2026 Salah Timetable (1447–1448 AH)",
            "timezone": "Europe/London",
            "notes": {"bst_start": "2026-03-29", "bst_end": "2026-10-25",
                      "maghrib": "begins == jamaat (prayed at listed time)"},
            "days": data,
        }, f, ensure_ascii=False, indent=1)
    print(f"\n✓ wrote {OUT} ({len(keys)} days)")

if __name__ == "__main__":
    main()
