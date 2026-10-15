/**
 * Taiyabah Masjid — enough of Android's layout rules to measure a widget.
 * Copyright (c) 2026 Yameen Bux. All rights reserved. See LICENSE.md.
 *
 * A home-screen widget is measured and drawn by the launcher, in another
 * process, from XML this app only posts across. Nothing in the build and
 * nothing on screen says that the content did not fit: it just loses its last
 * row, quietly, on somebody's phone. Both of these layouts were written to
 * look right and both overflowed a real cell — the wide one by 51dp, which
 * would have clipped Isha, the prayer people check latest.
 *
 * So the rules live here instead, once, and two things use them: the check
 * that fails the build when a layout outgrows the cell it is used in, and the
 * preview that draws it. Sharing them is the point — a preview that agrees
 * with a check that is wrong is worth nothing.
 *
 * It implements the subset these layouts use: LinearLayout in both
 * orientations with weights, FrameLayout as an overlay with gravity, fixed dp,
 * wrap_content, match_parent, margins, padding, and a crude text metric. It
 * is deliberately pessimistic about text, which is the safe direction for a
 * check: it would rather claim something does not fit than let it clip.
 */

/** Line height as a multiple of text size. */
export const LINE = 1.25;

/* Glyph advances in ems, measured from the real Roboto and Noto Serif rather
   than estimated. They were estimated once — every lower-case letter counted
   as 0.52em — and Roboto's "m" is 0.876, so "7:15pm" came out a tenth narrow
   and the check was optimistic in the one direction a check must never be.
   Regenerate with scripts/measure-widget-fonts.mjs. */
import metrics from "./font-metrics.json" with { type: "json" };

/* A character nobody measured is assumed wide, because being wrong about a
   width has to cost a layout that fits, never a layout that clips. */
const UNMEASURED = 0.95;

/** Which measured face a TextView will be drawn in. */
export const faceOf = (el) =>
  `${attr(el, "fontFamily") === "serif" ? "serif" : "sans"}-${attr(el, "textStyle") === "bold" ? 700 : 400}`;

export const TEXTY = new Set(["TextView", "Chronometer"]);
const STACKS_V = (el) => el.tag === "LinearLayout" && attr(el, "orientation") === "vertical";
const STACKS_H = (el) => el.tag === "LinearLayout" && attr(el, "orientation") !== "vertical";

export const attr = (el, name) => el.a["android:" + name];
export const px = (v) => (v == null || !/^-?[\d.]+(dp|sp|px)$/.test(v) ? null : parseFloat(v));
export const num = (el, name, dflt = 0) => px(attr(el, name)) ?? dflt;

/* layout_weight and alpha are bare numbers, not dimensions. Reading them
   through px() — which insists on a dp/sp/px suffix — quietly returns null,
   every weighted child gets a weight of zero, and the columns collapse. That
   is what the first preview drew, and it is the kind of thing only drawing it
   shows you. */
export const scalar = (el, name, dflt = 0) => {
  const v = attr(el, name);
  return v != null && /^-?[\d.]+$/.test(v) ? parseFloat(v) : dflt;
};

export const advance = (s, sp, face = "sans-400") => {
  const table = metrics[face] || metrics["sans-400"];
  let em = 0;
  for (const c of String(s)) em += table[c] ?? UNMEASURED;
  return em * sp;
};

/** Parse the subset of XML these layouts use: elements and attributes only. */
export const parse = (xml) => {
  const root = { tag: "#root", a: {}, kids: [] };
  const stack = [root];
  const body = xml.replace(/<\?[\s\S]*?\?>/g, "").replace(/<!--[\s\S]*?-->/g, "");
  for (const m of body.matchAll(/<(\/?)([\w.]+)((?:\s+[\w:]+\s*=\s*"[^"]*")*)\s*(\/?)>/g)) {
    const [, close, tag, attrs, self] = m;
    if (close) { stack.pop(); continue; }
    const a = {};
    for (const [, k, v] of attrs.matchAll(/([\w:]+)\s*=\s*"([^"]*)"/g)) a[k] = v;
    const el = { tag, a, kids: [] };
    stack[stack.length - 1].kids.push(el);
    if (!self) stack.push(el);
  }
  return root.kids[0];
};

export const id = (el) => (attr(el, "id") || "").replace("@+id/", "");

const margins = (el) => {
  const all = num(el, "layout_margin");
  return { top: num(el, "layout_marginTop", all), bottom: num(el, "layout_marginBottom", all),
           start: num(el, "layout_marginStart", all), end: num(el, "layout_marginEnd", all) };
};
const padding = (el) => {
  const all = num(el, "padding");
  return { top: num(el, "paddingTop", all), bottom: num(el, "paddingBottom", all),
           start: num(el, "paddingStart", all), end: num(el, "paddingEnd", all) };
};

/* A child with a negative margin is deliberately bleeding past the edge —
   that is the girih, and being clipped is the whole point of it. It must not
   count toward what the parent needs. */
const inFlow = (el) => {
  const m = margins(el);
  return m.top >= 0 && m.bottom >= 0 && m.start >= 0 && m.end >= 0;
};

/**
 * The smallest height this element can be drawn in, margins included.
 * `text` answers the widest string a given id can ever hold.
 */
export const measureH = (el, text = () => "") => {
  const m = margins(el), p = padding(el);
  const fixed = px(attr(el, "layout_height"));
  let inner;
  if (fixed != null) inner = fixed;
  else if (TEXTY.has(el.tag)) inner = Math.ceil(num(el, "textSize", 14) * LINE) + p.top + p.bottom;
  else if (el.tag === "Space" || el.tag === "View") inner = p.top + p.bottom;
  else {
    const hs = el.kids.filter(inFlow).map((k) => measureH(k, text));
    inner = (STACKS_V(el) ? hs.reduce((a, b) => a + b, 0) : Math.max(0, ...hs)) + p.top + p.bottom;
  }
  return inner + m.top + m.bottom;
};

/** The same, across. */
export const measureW = (el, text = () => "") => {
  const m = margins(el), p = padding(el);
  const fixed = px(attr(el, "layout_width"));
  let inner;
  if (fixed != null && fixed > 0) inner = fixed;
  else if (TEXTY.has(el.tag)) {
    const sp = num(el, "textSize", 14);
    const s = attr(el, "textAllCaps") === "true" ? String(text(el)).toUpperCase() : String(text(el));
    /* letterSpacing is in ems and unitless, so it must come through scalar()
       — num() would read it as a dimension, find no "dp", and silently call
       it zero. On an eyebrow at 0.16em across twelve characters that is 17dp
       of real width unaccounted for. */
    inner = Math.ceil(advance(s, sp, faceOf(el)) + scalar(el, "letterSpacing") * sp * s.length) + p.start + p.end;
  } else if (el.tag === "Space" || el.tag === "View") inner = (fixed ?? 0) + p.start + p.end;
  else {
    const ws = el.kids.filter(inFlow).map((k) => measureW(k, text));
    inner = (STACKS_H(el) ? ws.reduce((a, b) => a + b, 0) : Math.max(0, ...ws)) + p.start + p.end;
  }
  return inner + m.start + m.end;
};

/* measureW/measureH include the element's own margins, because that is what
   a parent has to set aside for it. A placed box does NOT — the margins are
   outside it. Comparing one against the other reads every margin as overflow,
   so anything checking a box against a need wants these. */
export const contentW = (el, text = () => "") => {
  const m = margins(el);
  return measureW(el, text) - m.start - m.end;
};
export const contentH = (el, text = () => "") => {
  const m = margins(el);
  return measureH(el, text) - m.top - m.bottom;
};

/**
 * Lay the tree out in a box of w x h dp and return a flat list of
 * {el, x, y, w, h} in paint order. This is what the preview draws, so the
 * preview cannot drift from what the check measures.
 */
export const place = (el, w, h, text = () => "") => {
  const out = [];
  const walk = (node, x, y, bw, bh) => {
    out.push({ el: node, x, y, w: bw, h: bh });
    const p = padding(node);
    const cx = x + p.start, cy = y + p.top;
    const cw = bw - p.start - p.end, ch = bh - p.top - p.bottom;
    const kids = node.kids;
    if (!kids.length) return;

    if (STACKS_V(node) || STACKS_H(node)) {
      const vertical = STACKS_V(node);
      const weights = kids.map((k) => scalar(k, "layout_weight"));
      const total = weights.reduce((a, b) => a + b, 0);
      /* Fixed sizes first, then whatever is left is split by weight — which
         is how a weighted Space ends up pushing type to the bottom. */
      const fixed = kids.map((k, i) => {
        if (weights[i] > 0) {
          const own = px(attr(k, vertical ? "layout_height" : "layout_width"));
          return own === 0 ? 0 : (vertical ? measureH(k, text) : measureW(k, text));
        }
        const want = px(attr(k, vertical ? "layout_height" : "layout_width"));
        if (want != null) {
          const m = margins(k);
          return want + (vertical ? m.top + m.bottom : m.start + m.end);
        }
        return vertical ? measureH(k, text) : measureW(k, text);
      });
      const slack = Math.max(0, (vertical ? ch : cw) - fixed.reduce((a, b) => a + b, 0));
      let run = vertical ? cy : cx;
      kids.forEach((k, i) => {
        const m = margins(k);
        const share = total > 0 ? (weights[i] / total) * slack : 0;
        const main = fixed[i] + share;
        /* Across the grain, match_parent fills and wrap_content hugs. */
        const crossWant = px(attr(k, vertical ? "layout_width" : "layout_height"));
        const crossAvail = vertical ? cw : ch;
        const cross = crossWant != null && crossWant > 0 ? crossWant
                    : attr(k, vertical ? "layout_width" : "layout_height") === "wrap_content"
                      ? Math.min(crossAvail, vertical ? measureW(k, text) : measureH(k, text))
                      : crossAvail - (vertical ? m.start + m.end : m.top + m.bottom);
        if (vertical) walk(k, cx + m.start, run + m.top, cross, main - m.top - m.bottom);
        else walk(k, run + m.start, cy + m.top, main - m.start - m.end, cross);
        run += main;
      });
      return;
    }

    /* FrameLayout: every child gets the whole box, placed by gravity. */
    for (const k of kids) {
      const m = margins(k);
      const wantW = px(attr(k, "layout_width")), wantH = px(attr(k, "layout_height"));
      const kw = wantW != null && wantW > 0 ? wantW
               : attr(k, "layout_width") === "wrap_content" ? measureW(k, text) : cw - m.start - m.end;
      const kh = wantH != null && wantH > 0 ? wantH
               : attr(k, "layout_height") === "wrap_content" ? measureH(k, text) : ch - m.top - m.bottom;
      const g = attr(k, "layout_gravity") || "";
      const kx = g.includes("end") || g.includes("right") ? cx + cw - kw - m.end
               : g.includes("center_horizontal") ? cx + (cw - kw) / 2
               : cx + m.start;
      const ky = g.includes("bottom") ? cy + ch - kh - m.bottom
               : g.includes("center_vertical") ? cy + (ch - kh) / 2
               : cy + m.top;
      walk(k, kx, ky, kw, kh);
    }
  };
  walk(el, 0, 0, w, h);
  return out;
};
