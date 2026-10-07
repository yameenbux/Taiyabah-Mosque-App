#!/usr/bin/env python3
"""Taiyabah Masjid — do the glyphs in the shipped subset actually draw?
Copyright (c) 2026 Yameen Bux. All rights reserved. See LICENSE.md.

scripts/check-icons.mjs asks the font's character map whether a codepoint is
present. That is one level short of the truth: a subset can map a codepoint to
a glyph with no contours, and the app would draw a space. The whole lesson of
the night the tab bar shipped blank is that structural checks agree with each
other and only rendering tells you anything.

So this rasterises every glyph the app can draw and counts the ink. It is not
in `npm run check` and not in CI, because it needs Pillow and the three checks
that are automated — the character map, the hand-named tests in
scripts/test/icons.test.mjs, and the Android smoke job looking at real pixels
on a real device — already cover the regression that happened. Run it by hand
after regenerating the subset:

    pip install pillow
    python3 scripts/raster-icons.py

Last run: 103 of 103 glyphs drew ink, and the control drew nothing.

The control is the point. A test that renders glyphs and finds them all fine
proves nothing unless something that SHOULD come out blank does: this picks a
glyph deliberately left out of the subset and requires it to draw nothing. If
that one draws too, the font is not a subset and the whole check is vacuous.
"""
import json
import pathlib
import sys

try:
    from PIL import Image, ImageDraw, ImageFont
except ImportError:
    sys.exit("needs Pillow:  pip install pillow")

root = pathlib.Path(__file__).resolve().parent.parent
names = json.loads(__import__("subprocess").run(
    ["node", str(root / "scripts/icon-names.mjs"), "--json"],
    capture_output=True, text=True, check=True).stdout)
gmap = json.loads((root / "node_modules/@expo/vector-icons/build/vendor"
                   "/react-native-vector-icons/glyphmaps/Ionicons.json").read_text())
font = ImageFont.truetype(str(root / "assets/fonts/ionicons.ttf"), 48)

INK = 12          # fewer inked pixels than this at 48px is not a drawn icon


def ink(codepoint):
    im = Image.new("L", (64, 64), 0)
    ImageDraw.Draw(im).text((8, 8), chr(codepoint), font=font, fill=255)
    return sum(1 for p in im.getdata() if p > 20)


blank = [(n, ink(gmap[n])) for n in names]
blank = [(n, k) for n, k in blank if k < INK]

print(f"rasterised {len(names)} glyphs at 48px from the shipped subset")
print(f"  {len(names) - len(blank)} draw ink")
for n, k in blank:
    print(f"  FAIL  {n} draws nothing ({k} inked pixels) — either the font has no "
          f"such codepoint, or it maps to a glyph with no outline")

control = next((k for k in gmap if k not in names), None)
got = ink(gmap[control]) if control else 0
print(f'\ncontrol — "{control}" was deliberately left out: {got} inked pixels')
if got >= INK:
    print("  FAIL  a glyph that is not in the subset drew anyway, so this check "
          "is not measuring the subset at all")

sys.exit(1 if blank or got >= INK else 0)
