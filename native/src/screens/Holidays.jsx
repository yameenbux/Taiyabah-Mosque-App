/* The madrasah year — the calendar a parent plans a trip around.
 *
 * This screen was built from the website's static markup, and the website
 * fills three of its boxes with JavaScript: the twelve month grids, the list
 * of closures, and the Islamic dates. So what shipped was a legend with no
 * colours and three empty cards. Everything below is the website's own
 * renderHolidays(), done natively: same data, same colours, same order.
 */
import React, { useMemo, useRef, useEffect } from "react";
import { View, Text, ScrollView, useWindowDimensions } from "react-native";
import { C, F, R, SHADOW, dual } from "../theme";
import { useApp } from "../store";
import { SHEETS } from "../Blocks";
import { Screen, Hero, Heading, Card, P } from "../ui";
import { nowLondon } from "../prayer";
import { MAD_YEAR, MAD_CLOSURES, MAD_EVENTS } from "../madrasah-data";

const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const parse = v => { const a = v.split("-"); return new Date(+a[0], +a[1] - 1, +a[2]); };
const MONTHS = ["January", "February", "March", "April", "May", "June",
                "July", "August", "September", "October", "November", "December"];
const DOW = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/* One lookup per day beats scanning the closure list 365 times. */
function dayMaps() {
  const shut = {}, evt = {};
  for (const c of MAD_CLOSURES) {
    const d = parse(c.from), end = parse(c.to);
    while (d <= end) { shut[iso(d)] = c; d.setDate(d.getDate() + 1); }
  }
  for (const e of MAD_EVENTS) (evt[e.on] = evt[e.on] || []).push(e);
  return { shut, evt };
}

/* Called at render, not read at import — three of these four are theme colours
 * and the key would otherwise describe the light calendar on a dark one.
 *
 * `open` is the odd one: the other three name a colour the grid actually
 * paints, but an open day is simply a plain cell, so its swatch is a SAMPLE of
 * one — the cell's own fill inside a border. The website does the same
 * (.hp-key is background:var(--card) inside border:var(--line)); this drew it
 * hollow, so on the dark page the swatch was the page seen through a 1.34:1
 * outline and the most common state in the calendar had no legible key at all.
 * The border is the hint grey now: 3.2:1 on light, 6:1 on dark.
 *
 * `today` follows the cell it describes, which is the filled plum — it named
 * brand-600 and so drew a pale pink ring against a saturated plum cell. */
const KEY = () => ({ open: C.hint, shut: "#C25B5B", ev: "#C6A24C", today: C.plumFill });

function Key({ colour, label, hollow, fill }) {
  const { fs } = useApp();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
      <View style={{ width: 11, height: 11, borderRadius: 3, borderWidth: hollow ? 1.5 : 0,
                     borderColor: colour,
                     backgroundColor: fill || (hollow ? "transparent" : colour) }} />
      <Text style={{ fontFamily: F.sans, fontSize: fs(11.5), color: C.muted }}>{label}</Text>
    </View>);
}

function Month({ y, m, shut, evt, todayISO, width }) {
  const { fs, t } = useApp();
  const days = new Date(y, m + 1, 0).getDate();
  const lead = (new Date(y, m, 1).getDay() + 6) % 7;        // Monday-first, as the website is
  const cells = [];
  for (let i = 0; i < lead; i++) cells.push(null);
  for (let d = 1; d <= days; d++) cells.push(d);

  /* FLOOR, and explicit rows of seven. box was an exact seventh of the inner
     width, so after React Native rounded each cell to the pixel grid the
     seven of them could total a fraction more than the row — and flexWrap
     then pushed the seventh onto the next line. Every month drew SIX columns
     under a seven-letter header, which put every date in the year under the
     wrong day name on the one screen whose entire job is saying which day
     something falls on. */
  const box = Math.floor((width - 32 - 26) / 7);
  const rows = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
  return (
    <View style={{ width: width - 32, backgroundColor: C.card, borderWidth: 1, borderColor: C.line,
                   borderRadius: R.tile, padding: 13, marginRight: 12 }}>
      <Text style={{ fontFamily: F.display, fontSize: fs(15), color: C.ink, marginBottom: 9 }}>
        {t(`month.${m}`, MONTHS[m])} {y}</Text>
      <View style={{ flexDirection: "row" }}>
        {[1, 2, 3, 4, 5, 6, 0].map(i => (
          <Text key={i} style={{ width: box, textAlign: "center", fontFamily: F.sansSemi,
                                 fontSize: fs(10), color: C.muted }}>
            {t(`dow.${i}`, DOW[i]).slice(0, 1)}</Text>))}
      </View>
      <View style={{ marginTop: 4 }}>
        {rows.map((row, r) => (
        <View key={r} style={{ flexDirection: "row" }}>
        {row.map((d, i) => {
          if (d === null) return <View key={i} style={{ width: box, height: box }} />;
          const key = `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
          const dw = new Date(y, m, d).getDay();
          const isShut = !!shut[key], isEv = !!evt[key], isToday = key === todayISO;
          const wknd = dw === 0 || dw === 6;
          return (
            <View key={i} style={{ width: box, height: box, alignItems: "center", justifyContent: "center" }}>
              {/* .hp-d — every cell sits on the PAPER with a transparent
                  hairline; a closed day is a 14% danger fill with a 30% danger
                  border, an Islamic date is marked by a GOLD BORDER on the
                  cell rather than a dot under the number, and TODAY is filled
                  brand-600 with cream. The app outlined today instead of
                  filling it, which on a grid of twelve months is the one cell
                  a reader is hunting for. */}
              <View style={{ width: box - 4, height: box - 4, borderRadius: 8,
                             alignItems: "center", justifyContent: "center", borderWidth: 1,
                             backgroundColor: isToday ? C.plumFill
                                            : isShut ? "rgba(180,83,47,.14)" : C.paper,
                             borderColor: isToday ? C.brand600
                                        : isShut ? "rgba(180,83,47,.3)"
                                        : isEv ? C.gold : "transparent" }}>
                <Text style={{ fontFamily: isToday || isEv ? F.sansBold : F.sans, fontSize: fs(11.5),
                               color: isToday ? C.cream
                                    : isShut ? dual("#8E4126", C.danger)
                                    : wknd ? C.muted : C.ink }}>{d}</Text>
              </View>
            </View>);
        })}
        </View>))}
      </View>
    </View>);
}

function ListRow({ name, sub, when, len, past, est, first }) {
  const { fs, t } = useApp();
  return (
    <View style={{ borderTopWidth: first ? 0 : 1, borderTopColor: C.line, flexDirection: "row",
                   alignItems: "baseline", gap: 10, paddingHorizontal: 15, paddingVertical: 12,
                   opacity: past ? .45 : 1 }}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Text style={{ fontFamily: F.sans, fontSize: fs(13.5), lineHeight: fs(19.5), color: C.ink,
                         flexShrink: 1 }}>{name}</Text>
          {est && (
            /* Gold, as .hp-est is on the website. In grey it reads as a
               disabled label rather than "this date is an estimate", which is
               the one thing it is there to say. */
            <Text style={{ flexShrink: 0, fontFamily: F.sans, fontSize: fs(9.5), color: C.goldInk, borderWidth: 1,
                           borderColor: "rgba(198,162,76,.45)", backgroundColor: "rgba(198,162,76,.12)",
                           borderRadius: R.pill, paddingHorizontal: 5,
                           paddingVertical: 1, overflow: "hidden" }}>{t("hol.est", "est.")}</Text>)}
        </View>
        {!!sub && <Text style={{ fontFamily: F.sans, fontSize: fs(11), color: C.muted, marginTop: 2 }}>{sub}</Text>}
      </View>
      {/* .hp-r is THREE columns on one baseline — the name, the dates, and
          the length in a 52px column at the right. Stacking the length under
          the dates put "5 days" where a second date would be, so two rows ran
          together and the eye had to re-find the right-hand edge on each. */}
      <Text style={{ fontFamily: F.sans, fontSize: fs(12), color: C.muted, textAlign: "right" }}>{when}</Text>
      <Text style={{ minWidth: 52, fontFamily: F.sans, fontSize: fs(11), color: C.muted,
                     textAlign: "right" }}>{len}</Text>
    </View>);
}

export default function Holidays() {
  const { t, fs } = useApp();
  const { width } = useWindowDimensions();
  const strip = useRef(null);

  const { shut, evt } = useMemo(dayMaps, []);
  const today = nowLondon();
  const todayISO = iso(today);

  const months = useMemo(() => {
    const from = parse(MAD_YEAR.from), to = parse(MAD_YEAR.to);
    const cur = new Date(from.getFullYear(), from.getMonth(), 1);
    const out = [];
    while (cur <= to) { out.push({ y: cur.getFullYear(), m: cur.getMonth() }); cur.setMonth(cur.getMonth() + 1); }
    return out;
  }, []);

  /* Open on the month the reader is actually in, not on last September. */
  const here = months.findIndex(x => x.y === today.getFullYear() && x.m === today.getMonth());
  useEffect(() => {
    if (here > 0) {
      const id = setTimeout(() => strip.current?.scrollTo({ x: here * (width - 32 + 12), animated: false }), 80);
      return () => clearTimeout(id);
    }
  }, [here, width]);

  const pretty = v => { const d = parse(v); return `${d.getDate()} ${t(`month.${d.getMonth()}`, MONTHS[d.getMonth()]).slice(0, 3)} ${d.getFullYear()}`; };

  /* Is the madrasah open today? The website's four answers, in its order. */
  const wd = today.getDay(), why = shut[todayISO];
  const status = why
    ? { open: false, title: t("hol.madrasah_is_closed_today", "Madrasah is closed today"),
        detail: `${t(`hol.c.${why.id}.n`, why.name)} — ${t("hol.until", "until")} ${pretty(why.to)}.` }
    : wd === 0
      ? { open: false, title: t("hol.no_classes_today", "No classes today"),
          detail: t("hol.the_madrasah_teaches_monday_to", "The madrasah teaches Monday to Friday. Hifz students also attend on Saturday mornings.") }
      : wd === 6
        ? { open: true, title: t("hol.hifz_only_today", "Hifz only today"),
            detail: t("hol.saturday_is_a_hifz_morning", "Saturday is a Hifz morning, 9:00–11:00am. All other classes are Monday to Friday.") }
        : { open: true, title: t("hol.madrasah_is_open_today", "Madrasah is open today"),
            detail: t("hol.classes_run_5_00_7_00pm", "Classes run 5:00–7:00pm. Hifz runs until 7:30pm.") };

  return (
    <Screen pad={false}>
      {/* The website's own hero: "Madrasah · 2026/27" — which names the year
          the planner is for — over its own standfirst. The app used the sheet
          header's title again, so the bar and the hero both said "Holiday
          Planner" and the academic year was nowhere on the screen, and its
          standfirst had been rewritten from "Every day the madrasah is closed
          this year, alongside the Islamic dates" to "Term dates, closures and
          the Islamic dates for the year". */}
      <Hero ring={SHEETS.holidays?.ring}
            lines={SHEETS.holidays?.blocks.find(b => b.type === "hero")?.lines || []} />
      <View style={{ paddingHorizontal: 16 }}>

        {/* .hp-today is an ordinary CARD — the dot carries the colour, not
            the panel. A green wash behind "Madrasah is open today" made an
            everyday fact look like a status alert, and on a closed day the
            same panel turned red for what is only a holiday. */}
        <View style={[{ flexDirection: "row", alignItems: "flex-start", gap: 11, marginTop: 14,
                        paddingVertical: 15, paddingHorizontal: 14, borderRadius: 15,
                        backgroundColor: C.card, borderWidth: 1, borderColor: C.line }, SHADOW]}>
          <View style={{ width: 10, height: 10, borderRadius: 5, marginTop: 5,
                         backgroundColor: status.open ? "#3F7D58" : C.danger }} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: F.sansBold, fontSize: fs(14.5), color: C.ink }}>{status.title}</Text>
            <Text style={{ fontFamily: F.sans, fontSize: fs(12.5), lineHeight: fs(20), color: C.muted,
                           marginTop: 3 }}>{status.detail}</Text>
          </View>
        </View>

        <Card><P>{t("hol.the_madrasah_teaches_180_days", "The madrasah teaches 180 days this year — 36 weeks, Monday to Friday, 5pm to 7pm. Hifz students also attend on Saturday mornings. Everything below applies to every class.")}</P></Card>

        <Heading>{t("hol.the_year_at_a_glance", "The year at a glance")}</Heading>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 14, marginBottom: 11 }}>
          <Key colour={KEY().open} hollow fill={C.card}
            label={t("hol.madrasah_open", "Madrasah open")} />
          <Key colour={KEY().shut} label={t("hol.closed", "Closed")} />
          <Key colour={KEY().ev} label={t("hol.islamic_date", "Islamic date")} />
          {/* SOLID, not hollow: .hp-key.k-today is background AND border-color
              set to the same plum, and today's cell in the grid is filled, so
              an outlined swatch described a cell the calendar never draws. */}
          <Key colour={KEY().today} label={t("hol.today", "Today")} />
        </View>
      </View>

      <ScrollView ref={strip} horizontal pagingEnabled showsHorizontalScrollIndicator={false}
                  decelerationRate="fast" snapToInterval={width - 32 + 12}
                  contentContainerStyle={{ paddingHorizontal: 16 }}>
        {months.map(({ y, m }) => (
          <Month key={`${y}-${m}`} y={y} m={m} shut={shut} evt={evt} todayISO={todayISO} width={width} />))}
      </ScrollView>

      <View style={{ paddingHorizontal: 16 }}>
        <Heading>{t("hol.when_the_madrasah_is_closed", "When the madrasah is closed")}</Heading>
        <Card gap={0} pad={0}>
          {MAD_CLOSURES.map((c, i) => {
            const n = Math.round((parse(c.to) - parse(c.from)) / 86400000) + 1;
            return (
              <ListRow key={c.id} first={i === 0}
                name={t(`hol.c.${c.id}.n`, c.name)}
                sub={c.note ? t(`hol.c.${c.id}.d`, c.note) : ""}
                when={pretty(c.from) + (c.from === c.to ? "" : ` – ${pretty(c.to)}`)}
                len={`${n} ${n === 1 ? t("hol.day", "day") : t("hol.days", "days")}`}
                past={todayISO > c.to} />);
          })}
        </Card>
        <Card><P>{t("hol.the_two_long_breaks", "The two long breaks — Ramadhan (33 days) and the summer (40 days) — are when a family trip costs nothing in attendance. Everything else is a week or less.")}</P></Card>

        <Heading>{t("hol.islamic_dates_this_year", "Islamic dates this year")}</Heading>
        <Card gap={0} pad={0}>
          {MAD_EVENTS.map((e, i) => (
            <ListRow key={e.id} first={i === 0} est
              name={t(`hol.e.${e.id}.n`, e.name)}
              sub={t(`hol.e.${e.id}.d`, e.sub)}
              when={pretty(e.on)}
              len={t(`dow.${parse(e.on).getDay()}`, DOW[parse(e.on).getDay()])}
              past={todayISO > e.on} />))}
        </Card>

        {/* The website's own advisory, in its own words: these are calculated,
            not announced, and the masjid confirms the real day by sighting. */}
        <View style={{ backgroundColor: "rgba(119,33,87,.045)", borderWidth: 1,
                       borderColor: "rgba(119,33,87,.14)", borderRadius: R.card,
                       padding: 15, gap: 7, marginTop: 14, marginBottom: 10 }}>
          <Text style={{ fontFamily: F.sansSemi, fontSize: fs(13.5), color: C.brand600 }}>
            {t("hol.these_dates_are_estimates", "These dates are estimates")}</Text>
          <Text style={{ fontFamily: F.sans, fontSize: fs(12.5), lineHeight: fs(20), color: C.muted }}>
            {t("hol.the_islamic_calendar_follows_the", "The Islamic calendar follows the moon, so the exact day is confirmed by sighting and can fall a day either side of what is shown here. These are calculated from the Umm al-Qurā calendar and are shown so you can plan — the masjid announces the confirmed date for Ramadhan and each Eid beforehand. The madrasah’s closure dates above are fixed and were set by the madrasah itself.")}</Text>
        </View>
      </View>
    </Screen>
  );
}
