/* Renders the block tree that scripts/extract-content.mjs lifts out of the web
 * app's own markup.
 *
 * The point of doing it this way: eighteen screens of the masjid's prose — the
 * history, the fees, the funeral steps, the ghusl workshop, every phone number
 * — came across without a word being retyped, and each one kept its data-i18n
 * key, so Urdu, Gujarati and Arabic work on all of it for free. When the
 * committee changes the copy on the website, one script run brings it here.
 */
import React from "react";
import { View } from "react-native";
import { C } from "./theme";
import SHEETS from "./data/sheets.json";
import { useApp } from "./store";
import {
  Screen, Hero, Heading, Card, P, Note, Sub, DL, KV, Chips, Ticks, Warn, Notice,
  Callout, CTA, Bank, Social, Foot, RowGroup, NavRow, open,
} from "./ui";

/* The web app's internal links were element ids, because everything lived on
 * one page. Here they are routes. */
const ROUTE = {
  "ed-arabic": "EduArabic", "ed-ghusl": "EduGhusl",
  "md-birth": "Birth", "md-funeral": "Funeral", "md-marriage": "Marriage", "md-will": "Will",
  "fs-to-will": "Will",
  "ad-to-holidays": "Holidays", "hp-to-admissions": "Admissions",
  "mdr-go-admissions": "Admissions", "mdr-go-curriculum": "Curriculum",
  "mdr-go-holidays": "Holidays", "mdr-go-portal": "Portal",
  "ab-donate": "Donate", "lv-vids": "Videos",
};

/* An icon for each row, chosen by what the row leads to rather than by
 * guessing from its words — so a translated label still gets the right glyph. */
/* A row's glyph comes from where it leads, not from its words — so a translated
 * label still gets the right one, and a phone number never gets the
 * open-in-browser arrow. */
const hrefIcon = href =>
  !href ? null
  : href.startsWith("tel:") ? "call-outline"
  : href.startsWith("mailto:") ? "mail-outline"
  : /maps\.|geo:/.test(href) ? "location-outline"
  : /youtube|youtu\.be/.test(href) ? "logo-youtube"
  : "open-outline";

const ICON = {
  EduArabic: "language-outline", EduGhusl: "water-outline", Birth: "egg-outline",
  Funeral: "flower-outline", Marriage: "heart-outline", Will: "document-text-outline",
  Holidays: "calendar-outline", Admissions: "school-outline", Curriculum: "book-outline",
  Portal: "log-in-outline", Donate: "gift-outline", Videos: "play-circle-outline",
};

function Block({ b, nav, inCard }) {
  const { tx } = useApp();
  switch (b.type) {
    case "hero":    return null;   // the hero is hoisted out of the scroll body
    case "heading": return <Heading tag={b.tag ? tx(b.tag) : null}>{tx(b)}</Heading>;
    case "sub":     return <Sub>{tx(b)}</Sub>;
    case "p":       return <View style={{ marginTop: 9 }}><P>{tx(b)}</P></View>;
    case "note":    return <View style={{ marginTop: 9 }}><Note>{tx(b)}</Note></View>;
    case "warn":    return <Warn>{tx(b)}</Warn>;
    case "notice":  return <Notice>{tx(b)}</Notice>;
    case "chips":   return <Chips items={b.items} />;
    case "ticks":   return <Ticks items={b.items} ordered={b.ordered} />;
    case "dl":      return <DL items={b.items} />;
    case "bank":    return <Bank items={b.items} />;
    case "social":  return <Social items={b.items} />;
    case "foot":    return <Foot lines={b.lines} />;
    case "callout": return <Callout {...b} />;
    case "advisory": return (
      <Warn>{[b.h, ...(b.ps || [])].filter(Boolean).map(tx).join("\n\n")}</Warn>);

    case "list":
      return (
        <View style={{ gap: 7, marginTop: 4 }}>
          {b.items.map((it, i) => (
            <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <P style={{ flex: 1 }}>{tx(it)}</P>
              {!!it.note && <Note>{tx(it.note)}</Note>}
            </View>))}
        </View>
      );

    case "card": {
      /* A card that holds rows draws them edge to edge, so the card itself has
       * no padding — which means the prose between them has to carry its own,
       * or it sits flush against the border. */
      const ROW = new Set(["kv", "row", "link"]);
      const hasRows = b.blocks.some(x => ROW.has(x.type));
      return (
        <Card gap={0} pad={hasRows ? 0 : 15}>
          {b.blocks.map((x, i) => (
            <View key={i} style={[
              i && ROW.has(x.type) ? { borderTopWidth: 1, borderTopColor: C.line } : null,
              hasRows && !ROW.has(x.type) ? { paddingHorizontal: 15, paddingVertical: 4 } : null,
            ]}>
              <Block b={x} nav={nav} inCard />
            </View>))}
        </Card>
      );
    }

    case "kv": {
      const row = <KV k={tx(b.k)} v={tx(b.v)} href={b.href} icon={b.icon} />;
      return inCard ? row : <RowGroup>{row}</RowGroup>;
    }

    case "row": {
      const route = b.id && ROUTE[b.id];
      const row = (
        <NavRow
          icon={route ? ICON[route] : hrefIcon(b.href)}
          label={tx(b.label)} sub={b.sub ? tx(b.sub) : null}
          soon={b.soon ? tx(b.soon) : null}
          onPress={route ? () => nav?.navigate(route) : b.href ? () => open(b.href) : null} />);
      return inCard ? row : <RowGroup>{row}</RowGroup>;
    }

    case "link": {
      const row = <NavRow icon={hrefIcon(b.href)} label={tx(b)} onPress={() => open(b.href)} />;
      return inCard ? row : <RowGroup>{row}</RowGroup>;
    }

    case "cta": {
      const route = b.id && ROUTE[b.id];
      return <CTA label={tx(b)} sub={b.sub ? tx(b.sub) : null}
                  onPress={route ? () => nav?.navigate(route) : b.href ? () => open(b.href) : null} />;
    }

    default: return null;
  }
}

/* Successive rows and key/value pairs read as one grouped list rather than a
 * stack of separate cards — the difference between a settings screen and a
 * web page with a lot of boxes on it. */
function merge(blocks) {
  const out = [];
  for (const b of blocks) {
    const last = out[out.length - 1];
    if ((b.type === "row" || b.type === "kv" || b.type === "link") && last && last.group &&
        last.group[0].type !== "card") { last.group.push(b); continue; }
    if (b.type === "row" || b.type === "kv" || b.type === "link") { out.push({ group: [b] }); continue; }
    out.push(b);
  }
  return out;
}

export function Blocks({ blocks, nav }) {
  const merged = merge(blocks);
  return merged.map((b, i) =>
    b.group
      ? <RowGroup key={i}>
          {b.group.map((g, j) =>
            g.type === "kv" ? <GroupKV key={j} b={g} /> : <GroupRow key={j} b={g} nav={nav} />)}
        </RowGroup>
      : <Block key={i} b={b} nav={nav} />);
}

/* Grouped rows render without wrapping themselves in a card of their own — the
 * RowGroup above already is the card. */
function GroupKV({ b }) {
  const { tx } = useApp();
  return <KV k={tx(b.k)} v={tx(b.v)} href={b.href} icon={b.icon} />;
}
function GroupRow({ b, nav }) {
  const { tx } = useApp();
  const route = b.id && ROUTE[b.id];
  const label = b.type === "link" ? tx(b) : tx(b.label);
  return (
    <NavRow
      icon={route ? ICON[route] : hrefIcon(b.href)}
      label={label} sub={b.sub ? tx(b.sub) : null} soon={b.soon ? tx(b.soon) : null}
      onPress={route ? () => nav?.navigate(route) : b.href ? () => open(b.href) : null} />
  );
}

/* A whole screen from one id in sheets.json. Eighteen of the app's screens are
 * exactly this and nothing else. */
export function sheetScreen(id, { extra } = {}) {
  return function SheetScreen({ navigation }) {
    const sheet = SHEETS[id];
    if (!sheet || sheet.missing) return null;
    const hero = sheet.blocks.find(b => b.type === "hero");
    const body = sheet.blocks.filter(b => b.type !== "hero");
    return (
      <Screen pad={false}>
        {!!hero && <Hero lines={hero.lines} />}
        <View style={{ paddingHorizontal: 16 }}>
          {extra?.top ? extra.top({ navigation }) : null}
          <Blocks blocks={body} nav={navigation} />
          {extra?.bottom ? extra.bottom({ navigation }) : null}
        </View>
      </Screen>
    );
  };
}

export { SHEETS };
