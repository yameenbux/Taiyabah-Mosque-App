#!/usr/bin/env python3
"""
Taiyabah Masjid — make each bundled font answer to the name the app asks for.
Copyright (c) 2026 Yameen Bux. All rights reserved. See LICENSE.md.

WHY THIS EXISTS. The two platforms find a bundled font in completely different
ways, and only one of them looks at the file name.

  Android  expo-font copies the file to assets/fonts/<name>.ttf and React
           Native resolves fontFamily:"X" to assets/fonts/X.ttf. The file name
           IS the family. Everything the app asks for has always worked here.

  iOS      expo-font only lists the file in UIAppFonts. iOS then registers it
           under the names inside the font, and RCTFont.mm looks up the family
           name, then tries UIFont fontWithName: (PostScript or full name), and
           if neither answers it logs "Unrecognized font family" and quietly
           draws in the SYSTEM FONT.

Hanken Grotesk calls itself "Hanken Grotesk". The app asks for
"HankenGroteskSemiBold". Those are not the same string, so every word of sans
text in this app — every label, every value, every row title, all four weights
— was being drawn on iPhone in San Francisco. It looks like a typeface, so it
reads as a design choice rather than as a fault, and nothing fails.

Noto Naskh Arabic arrived with the same problem and a louder symptom: it is
bundled to draw the Qurʼanic marks, and under the system font those marks are
empty boxes again, which is the fault it was added to fix.

So each file is rewritten to call itself exactly what its file name says, and
to be its own one-member family. Nothing else about the font is touched — same
glyphs, same outlines, same metrics, same bytes everywhere but the name table.

LICENCE. All four families are SIL OFL 1.1 and NONE of them reserves a font
name (see fonts/OFL.txt — every copyright line is bare), so renaming is
permitted. ionicons.ttf is left alone: it already calls itself "Ionicons",
which is what @expo/vector-icons asks for.

    pip install fonttools
    python3 scripts/name-fonts.py           # report only
    python3 scripts/name-fonts.py --write   # rewrite the name tables

scripts/check-fonts.mjs fails the build if a font and its file name ever
disagree again, so this never has to be remembered.
"""
import os
import sys
import glob

try:
    from fontTools.ttLib import TTFont
except ImportError:
    sys.exit("needs fontTools: pip install fonttools")

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LEAVE_ALONE = {"ionicons"}

FAMILY, SUBFAMILY, FULL, POSTSCRIPT = 1, 2, 4, 6
TYPO_FAMILY, TYPO_SUBFAMILY = 16, 17

write = "--write" in sys.argv
changed = 0

for path in sorted(glob.glob(os.path.join(HERE, "assets/fonts/*.ttf"))):
    base = os.path.splitext(os.path.basename(path))[0]
    if base in LEAVE_ALONE:
        print(f"  {base:<24} left alone")
        continue

    font = TTFont(path)
    name = font["name"]
    before = name.getDebugName(FAMILY)
    if before == base and name.getDebugName(POSTSCRIPT) == base:
        print(f"  {base:<24} already answers to its own name")
        continue

    for rec in list(name.names):
        if rec.nameID in (TYPO_FAMILY, TYPO_SUBFAMILY):
            # Removed on purpose: left in place, iOS groups the four weights
            # back under "Hanken Grotesk" and the file name stops being a family.
            name.names.remove(rec)

    for nameID, value in ((FAMILY, base), (SUBFAMILY, "Regular"),
                          (FULL, base), (POSTSCRIPT, base)):
        name.setName(value, nameID, 1, 0, 0)        # Macintosh / Roman
        name.setName(value, nameID, 3, 1, 0x409)    # Windows / Unicode / en-US

    print(f"  {base:<24} {before!r} -> {base!r}" + ("" if write else "   (dry run)"))
    changed += 1
    if write:
        font.save(path)

if not changed:
    print("\nnothing to do — every font already answers to its own file name")
elif not write:
    print(f"\n{changed} font(s) would be renamed. Run again with --write.")
else:
    print(f"\n{changed} font(s) rewritten. Run `npm run check` and rebuild.")
