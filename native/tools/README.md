# tools

Source material for generated assets. **Nothing here ships** — it is outside
`assets/`, so the font plugin and the bundler never see it.

## `ionicons-full.ttf`

The complete Ionicons face, 432KB. `assets/fonts/ionicons.ttf` is cut from it
down to the 48 glyphs the app actually draws, which is 16KB.

The full face is kept because a subset cannot be re-subset: the next person to
add an icon needs the glyph that was thrown away, and downloading "whatever
Ionicons is current" months later is how an icon set quietly changes shape.

Regenerating, after adding an icon:

    pip install fonttools
    node scripts/icon-names.mjs            # what the app can draw
    pyftsubset tools/ionicons-full.ttf \
      --output-file=assets/fonts/ionicons.ttf \
      --unicodes="U+...,U+..." --no-hinting --desubroutinize
    node scripts/check-icons.mjs           # proves nothing was lost

`npm run check` runs that last step, so a forgotten regeneration fails the
build rather than drawing an empty box on one screen.
