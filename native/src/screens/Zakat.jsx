/* The zakat calculator.
 *
 * The arithmetic is the web app's, unchanged, because it has been checked by the
 * office: nisab is 612.36g of silver or 87.48g of gold at today's price, and the
 * rate is 2.5% of what is left after debts. Nothing is sent anywhere — every
 * figure stays on the phone.
 */
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, TextInput, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { C, F, R, dual } from "../theme";
import { useApp } from "../store";
import { fetchMetalPrices } from "../metals";
import { Screen, Hero, Heading, Card, P, Note, Rich, Ticks, Warn, Press, Pill, open, tap } from "../ui";

const NISAB = { silver: 612.36, gold: 87.48 };
const RATE = 0.025;
const money = n => "£" + n.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function Zakat() {
  const { t, fs, rtl } = useApp();
  const [standard, setStandard] = useState("silver");
  const [price, setPrice] = useState("");
  /* THE WEBSITE LOOKS THE PRICE UP AND FILLS THE BOX IN. The app shipped with
     an empty box and a link to a bullion site, so the one thing this screen
     exists to tell you — whether you are over the nisab — needed a trip
     somewhere else first. Four states, as the site has: fetching, a live
     figure with the time it came from, a remembered one marked as such, and
     only then "please enter it below". */
  const [live, setLive] = useState({ state: "loading" });
  const [typed, setTyped] = useState(false);     // don't overwrite what they typed

  const load = useCallback(async () => {
    setLive({ state: "loading" });
    const r = await fetchMetalPrices();
    setLive(r ? { state: "ok", ...r } : { state: "failed" });
  }, []);
  useEffect(() => { load(); }, [load]);

  /* The figure follows the standard: switching silver → gold puts the gold
     price in, unless a price has been typed by hand. */
  useEffect(() => {
    if (live.state !== "ok" || typed) return;
    const p = live[standard];
    if (Number.isFinite(p)) setPrice(p.toFixed(2));
  }, [live, standard, typed]);
  const [v, setV] = useState({ cash: "", gold: "", silver: "", owed: "", stock: "", invest: "", debts: "" });
  const set = (k, x) => setV(s => ({ ...s, [k]: x.replace(/[^0-9.]/g, "") }));
  const n = k => Number(v[k]) || 0;

  const out = useMemo(() => {
    const p = Number(price) || 0;
    /* Gold and silver you own are valued at the same price per gram the nisab
     * is worked out from — mixing two prices is how people get a wrong answer
     * and never find out. */
    const metal = (n("gold") + n("silver")) * p;
    const own = n("cash") + n("owed") + n("stock") + n("invest") + metal;
    const net = own - n("debts");
    const nisab = p ? NISAB[standard] * p : null;
    return { own, net, nisab, due: net > 0 ? net * RATE : 0,
             over: nisab !== null && net >= nisab };
  }, [v, price, standard]);

  return (
    <Screen pad={false}>
      {/* .zk-ar — مَا نَقَصَتْ صَدَقَةٌ مِنْ مَالٍ in gold at 25px above the
          English, with the attribution under it at 10.5px UPPERCASE tracked
          .12em. The Arabic was missing and the attribution was sentence case,
          so the hadith arrived in translation only. */}
      <Hero lines={[
        { t: "مَا نَقَصَتْ صَدَقَةٌ مِنْ مَالٍ", w: "arabic", px: 25 },
        { k: "zakat.charity_does_not_decrease_wealth", t: "“Charity does not decrease wealth.”", w: "title" },
      ]}>
        <Text style={{ fontFamily: F.sans, fontSize: fs(10.5), letterSpacing: 1.26,
                       textTransform: "uppercase", color: "#BBA9B4", marginTop: 8,
                       textAlign: "center" }}>
          {t("zakat.the_prophet_sahih_muslim_2588", "The Prophet ﷺ · Ṣaḥīḥ Muslim 2588")}</Text>
      </Hero>
      <View style={{ paddingHorizontal: 16 }}>

        {/* .card.zk-explain — "New to zakat? Start here" is an h4 INSIDE the
            card, not a section heading with a rule over it. */}
        <Card pad={16}>
          <Text style={{ fontFamily: F.display, fontSize: fs(16), color: C.ink, marginBottom: 9 }}>
            {t("zakat.new_to_zakat_start_here", "New to zakat? Start here")}</Text>
          {/* THE SENTENCE THAT SAYS WHAT ZAKAT IS was not here at all. It is
              the first thing the website says on this screen, and the only
              place the 2.5% appears before the calculator starts asking for
              figures. */}
          <P>{t("zakat.zakat_is_a_share_of",
            "Zakat is a share of your savings given each year to those in need. It is *2.5%* — £2.50 out of every £100 you have kept for a whole year.")}</P>
          <P>{t("zakat.you_pay_it_if_all", "You pay it if all of these are true:")}</P>
          {/* .zk-ul — plain BULLETS at 13.5px. They were green ticks, which
              say "you have done this" where the website says "this must be
              true of you". */}
          <View style={{ marginTop: 9, marginLeft: 2 }}>
            {[t("zakat.you_are_muslim_and_have", "You are Muslim and have reached the age of puberty"),
              t("zakat.what_you_own_is_worth", "What you own is worth more than the *nisab* (the minimum amount, below)"),
              t("zakat.you_have_owned_that_much", "You have owned that much for one full *lunar year*"),
            ].map((x, i) => (
              <View key={i} style={{ flexDirection: rtl ? "row-reverse" : "row", gap: 8, marginBottom: 4 }}>
                {/* The browser draws a list marker itself — a round dot — and
                    does not take it from the font. Setting a literal • in
                    Hanken Grotesk gave a small SQUARE instead, on both of this
                    screen's lists. A circle drawn here is what the website
                    actually shows. */}
                <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: C.ink,
                               marginTop: fs(9), marginHorizontal: 2 }} />
                <Rich style={{ flex: 1, fontFamily: F.sans, fontSize: fs(13.5), lineHeight: fs(22), color: C.ink,
                               textAlign: rtl ? "right" : "left" }}>{x}</Rich>
              </View>))}
          </View>
          {/* .zk-tip — a GOLD box, not a grey note. */}
          <View style={{ marginTop: 11, borderRadius: 12, paddingVertical: 11, paddingHorizontal: 13,
                         backgroundColor: "rgba(198,162,76,.14)", borderWidth: 1,
                         borderColor: "rgba(198,162,76,.3)" }}>
            <Rich style={{ fontFamily: F.sans, fontSize: fs(12.5), lineHeight: fs(19.5), color: dual("#7A6838", C.goldInk),
                           textAlign: rtl ? "right" : "left" }}>
              {t("zakat.pick_the_same_date_each",
                "Pick the same date each Islamic year — many choose a day in Ramadan — and work out your zakat on that day every year.")}</Rich>
          </View>
        </Card>

        {/* The website numbers these in the heading itself — "1 · The nisab" —
            rather than hanging a "1" off the end of the rule, where it reads
            as a count of something. */}
        <Heading>{t("zakat.1_the_nisab", "1 · The nisab")}</Heading>
        <Card pad={16}>
        <Rich style={{ fontFamily: F.sans, fontSize: fs(13.5), lineHeight: fs(21.5), color: C.muted,
                       marginBottom: 12, textAlign: rtl ? "right" : "left" }}>
          {t("zakat.nisab_is_the_minimum_you",
            "Nisab is the minimum you must own before zakat is due. It is fixed in gold and silver, so its value in pounds changes with the metal price.")}</Rich>

        <View style={{ flexDirection: "row", gap: 7 }}>
          {/* The website's own labels, on the buttons themselves. They used to
              be composed from sheet.silver + " · 612.36g" here, and the
              website's zakat.silver_612_36g was given a home in a pair of
              inert pills underneath — so the screen said Silver · 612.36g and
              Gold · 87.48g twice, once tappable and once not. */}
          {[["silver", t("zakat.silver_612_36g", "Silver · 612.36g")],
            ["gold", t("zakat.gold_87_48g", "Gold · 87.48g")]].map(([k, lab]) => {
            const on = standard === k;
            return (
              /* .zk-seg button — on the PAPER in muted at 13px, and when
                 chosen filled BRAND-700 with cream. It was a plum tint with
                 plum text, which on a two-way switch reads as "slightly
                 preferred" rather than "this one". */
              <Pressable key={k} onPress={() => { tap(); setStandard(k); }}
                accessibilityRole="radio" accessibilityState={{ selected: on }}
                hitSlop={{ top: 2, bottom: 2, left: 0, right: 0 }}
                style={{ flex: 1, alignItems: "center", paddingVertical: 11, paddingHorizontal: 6,
                         borderRadius: 11, borderWidth: 1,
                         borderColor: on ? C.pick : C.line,
                         backgroundColor: on ? C.pick : C.paper }}>
                <Text style={{ fontFamily: F.sansSemi, fontSize: fs(13),
                               color: on ? C.cream : C.muted }}>{lab}</Text>
              </Pressable>);
          })}
        </View>
        {/* THE WEBSITE NAMES THE SCHOOL. "The Hanafi school uses the silver
            nisab, which is lower — so more people qualify to give" had been
            rewritten here as "Most scholars prefer the silver standard": a
            vaguer claim about scholarship in general, in place of the
            masjid's own statement of which school it follows. That is the
            committee's to say, not the app's. */}
        <Rich style={{ fontFamily: F.sans, fontSize: fs(12), lineHeight: fs(18.5), color: C.muted,
                       marginTop: 10, textAlign: rtl ? "right" : "left" }}>
          {t("zakat.the_hanafi_school_uses_the",
            "The Hanafi school uses the *silver* nisab, which is lower — so more people qualify to give.")}</Rich>

        {/* .zk-live — idle shows nothing; loading is a muted line; ok is a
            plum-tinted line naming the metal, the price and the time with a
            Refresh beside it; stale is the same in gold saying "last known";
            failed is the rose panel with Try again. */}
        {live.state !== "idle" && (
          <View style={{ marginTop: 12, paddingVertical: 9, paddingHorizontal: 12, borderRadius: 10,
                         flexDirection: rtl ? "row-reverse" : "row", alignItems: "center", gap: 8,
                         backgroundColor: live.state === "failed" ? C.tintRose
                                        : live.stale ? C.tintGold
                                        : live.state === "ok" ? C.tintPlum : "transparent" }}>
            <Text style={{ flex: 1, fontFamily: F.sans, fontSize: fs(12), lineHeight: fs(18),
                           color: live.state === "failed" ? C.tintRoseInk
                                : live.stale ? C.tintGoldInk
                                : live.state === "ok" ? C.brand600 : C.muted,
                           textAlign: rtl ? "right" : "left" }}>
              {live.state === "loading"
                ? t("zakat.fetching_price", "Fetching today’s price…")
                : live.state === "failed"
                ? t("zakat.price_fetch_failed", "Couldn’t fetch today’s price — please enter it below.")
                : (live.stale
                    ? t("zakat.last_known_price", "Last known {metal} price · £{p}/g · from {at}")
                    : t("zakat.live_price", "Live {metal} price · £{p}/g · updated {at}"))
                    .replace("{metal}", t(`zakat.metal.${standard}`, standard))
                    .replace("{p}", (live[standard] || 0).toFixed(2))
                    .replace("{at}", live.at.toLocaleTimeString("en-GB",
                      { hour: "2-digit", minute: "2-digit" }))}</Text>
            {live.state !== "loading" && (
              <Press dim={false} onPress={() => { tap(); setTyped(false); load(); }}
                hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                style={{ paddingVertical: 5, paddingHorizontal: 10, borderRadius: 8,
                         borderWidth: 1, borderColor: C.line, backgroundColor: C.card }}>
                <Text style={{ fontFamily: F.sansSemi, fontSize: fs(11.5), color: C.ink }}>
                  {live.state === "failed" ? t("zakat.try_again", "Try again")
                                           : t("zakat.refresh", "Refresh")}</Text>
              </Press>)}
          </View>)}

        {/* .zk-l is a flex ROW: the label on the left and "check price" on the
            right of the same line, plum and bold, with no icon. The app made
            it a row of its own underneath with an open-in-browser glyph, so a
            quiet aside beside the label became a second control. And the
            website's placeholder is "e.g. 0.85" — a worked example of the
            shape, which matters on a field where somebody could reasonably
            type the price per ounce. */}
        <View style={{ flexDirection: rtl ? "row-reverse" : "row", alignItems: "baseline",
                       justifyContent: "space-between", gap: 8, marginTop: 14, marginBottom: 6 }}>
          <Text style={{ fontFamily: F.sans, fontSize: fs(12.5), color: C.muted, flexShrink: 1 }}>
            {t("zakat.price_per_gram_today", "Price per gram today (£)")}</Text>
          <Press dim={false}
            hitSlop={{ top: 14, bottom: 14, left: 10, right: 10 }}
            onPress={() => { tap(); open(standard === "gold"
                   ? "https://www.bullionbypost.co.uk/gold-price/gold-price-per-gram/"
                   : "https://www.bullionbypost.co.uk/silver-price/silver-price-per-gram/"); }}>
            <Text style={{ fontFamily: F.sansSemi, fontSize: fs(12.5), color: C.brand600 }}>
              {t("zakat.check_price", "check price")}</Text>
          </Press>
        </View>
        <Money value={price} placeholder="e.g. 0.85"
               onChange={x => { setTyped(true); setPrice(x.replace(/[^0-9.]/g, "")); }} />
        {/* .zk-result — a pale plum panel inside the nisab card, not a card
            of its own sitting under it. */}
        <View style={{ marginTop: 12, borderRadius: 12, paddingVertical: 13, paddingHorizontal: 14,
                       backgroundColor: C.tintPlum }}>
          <Text style={{ fontFamily: F.sansSemi, fontSize: fs(14), color: C.brand600, textAlign: "center" }}>
            {out.nisab === null
              ? t("zakat.enter_today_s_price_to", "Enter today’s price to see the nisab")
              : `${t("zakat.nisab_is", "Nisab is")} ${money(out.nisab)}`}
          </Text>
        </View>
        </Card>

        <Heading>{t("zakat.2_what_you_own", "2 · What you own")}</Heading>
        <Field label={t("zakat.cash_at_home_bank_savings", "Cash — at home, bank, savings (£)")} value={v.cash} onChange={x => set("cash", x)} />
        <Field label={t("zakat.gold_you_own_grams", "Gold you own (grams)")} value={v.gold} onChange={x => set("gold", x)} />
        <Field label={t("zakat.silver_you_own_grams", "Silver you own (grams)")} value={v.silver} onChange={x => set("silver", x)} />
        <Field label={t("zakat.money_owed_to_you_that", "Money owed to you that you expect back (£)")} value={v.owed} onChange={x => set("owed", x)} />
        <Field label={t("zakat.business_stock_goods_bought_to", "Business stock — goods bought to sell (£)")} value={v.stock} onChange={x => set("stock", x)} />
        <Field label={t("zakat.shares_crypto_other_investments", "Shares, crypto & other investments (£)")} value={v.invest} onChange={x => set("invest", x)} />
        <Note>{t("zakat.money_in_a_pension_you", "Money in a pension you can access")}</Note>
        {(n("gold") > 0 || n("silver") > 0) && !Number(price) && (
          <Warn>{t("zakat.gsnote",
            "Enter a price per gram above, or the gold and silver you own cannot be valued.")}</Warn>)}

        <Heading>{t("zakat.3_what_you_owe", "3 · What you owe")}</Heading>
        <Field label={t("zakat.debts_and_bills_due_now", "Debts and bills due now (£)")} value={v.debts} onChange={x => set("debts", x)} />
        <View style={{ marginTop: 9 }}>
          <Note>{t("zakat.include_what_you_owe_right", "Include what you owe right now — bills, rent, money borrowed. For a mortgage, most scholars say to deduct only the payments due, not the whole loan. Ask the imam if you are unsure.")}</Note>
        </View>

        {/* The answer. Three lines of arithmetic shown so the figure can be
            checked rather than taken on trust. */}
        <Card style={{ marginTop: 20, backgroundColor: "rgba(119,33,87,.04)" }} gap={0}>
          <Line k={t("zakat.total_you_own", "Total you own")} v={money(out.own)} />
          <Line k={t("zakat.less_what_you_owe", "Less what you owe")} v={"− " + money(n("debts"))} />
          <Line k={t("zakat.zakatable_wealth", "Zakatable wealth")} v={money(Math.max(0, out.net))} strong />
          <View style={{ height: 1, backgroundColor: C.line, marginVertical: 11 }} />
          {out.nisab === null ? (
            <Text style={{ fontFamily: F.sans, fontSize: fs(13.5), color: C.muted, textAlign: "center" }}>
              {t("zakat.enter_your_amounts_above", "Enter your amounts above")}</Text>
          ) : out.over ? (
            /* The dark plum panel the website gives this (.zk-result). The
               figure is the answer the whole screen exists to produce, and on
               cream it read as one more line in a list of sums. */
            <LinearGradient colors={[C.brand800, C.brand900]} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
              style={{ alignItems: "center", gap: 4, borderRadius: R.card,
                       paddingVertical: 20, paddingHorizontal: 16 }}>
              <Text style={{ fontFamily: F.sansSemi, fontSize: fs(11), letterSpacing: 1.5,
                             textTransform: "uppercase", color: C.goldBright, textAlign: "center" }}>
                {t("zakat.zakat_due_2_5", "Zakat due · 2.5%")}</Text>
              <Text style={{ fontFamily: F.display, fontSize: fs(38), lineHeight: fs(46),
                             color: C.goldBright }}>{money(out.due)}</Text>
            </LinearGradient>
          ) : (
            <View style={{ alignItems: "center", gap: 6 }}>
              <Pill>{t("zakat.below_nisab", "Below the nisab")}</Pill>
              <Note>{t("zakat.no_zakat_due",
                "No zakat is due on this amount. Ṣadaqah is always welcome.")}</Note>
            </View>
          )}
        </Card>

        {/* .zk-lists — ONE card holding both lists, "Include these" first in
            plum and "Leave these out" under a hairline in the danger colour,
            each an 11px uppercase heading tracked .14em over plain bullets.
            The app had them as two separate cards in the other order, both
            headed with a section rule, both set as green TICKS — which on
            "Leave these out" says the opposite of what the list means. */}
        <Heading>{t("zakat.what_counts", "What counts")}</Heading>
        <Card pad={16}>
          <ZList tone={C.brand600} head={t("zakat.include_these", "Include these")} items={[
            t("zakat.cash_at_home_in_the", "Cash at home, in the bank, or in any savings account"),
            /* THE ONE MOST PEOPLE MISS. "All gold and silver you own —
               including jewellery you wear" was not in the app's list at all,
               and jewellery you wear is the single most commonly forgotten
               zakatable thing there is. */
            t("zakat.all_gold_and_silver_you", "All gold and silver you own — *including jewellery you wear*"),
            t("zakat.money_you_are_saving_for", "Money you are saving for something, like a wedding, a car or Hajj"),
            t("zakat.money_people_owe_you_that", "Money people owe you that you expect to get back"),
            t("zakat.goods_you_bought_in_order", "Goods you bought in order to sell them"),
            t("zakat.shares_bought_to_trade_and", "Shares bought to trade, and cryptocurrency"),
          ]} />
          <View style={{ marginTop: 18, paddingTop: 16, borderTopWidth: 1, borderTopColor: C.line }}>
            <ZList tone={C.danger} head={t("zakat.leave_these_out", "Leave these out")} items={[
              t("zakat.the_home_you_live_in", "The home you live in"),
              t("zakat.your_car_clothes_phone_and", "Your car, clothes, phone and furniture"),
              t("zakat.tools_and_machinery_you_use", "Tools and machinery you use for work — unless you bought them to sell"),
              t("zakat.a_property_you_rent_out", "A property you rent out — but rent you have saved does count"),
              t("zakat.debts_you_are_owed_but", "Debts you are owed but do not expect to get back"),
              t("zakat.anything_you_have_already_spent", "Anything you have already spent"),
            ]} />
          </View>
        </Card>

        <Press onPress={() => { tap(); setV({ cash: "", gold: "", silver: "", owed: "", stock: "", invest: "", debts: "" }); setPrice(""); }}
          hitSlop={{ top: 4, bottom: 4, left: 0, right: 0 }}
          style={{ alignSelf: "center", marginTop: 14, flexDirection: "row", gap: 7, alignItems: "center",
                   paddingHorizontal: 15, paddingVertical: 9, borderRadius: R.pill, borderWidth: 1, borderColor: C.line }}>
          <Ionicons name="refresh-outline" size={15} color={C.muted} />
          <Text style={{ fontFamily: F.sansSemi, fontSize: fs(13), color: C.muted }}>
            {t("zakat.clear_all", "Clear all")}</Text>
        </Press>

        {/* .zk-disclaimer — the website's own words, which name the position
            the calculator follows: "It follows the Hanafi position and uses
            the price you enter." The app had written its own disclaimer
            instead, which said neither. */}
        <View style={{ marginTop: 18, marginBottom: 10, borderRadius: 12, padding: 13,
                       backgroundColor: C.tintRose, borderWidth: 1, borderColor: C.tintRoseLine }}>
          <Rich style={{ fontFamily: F.sans, fontSize: fs(12.5), lineHeight: fs(20.5), color: C.tintRoseInk,
                         textAlign: rtl ? "right" : "left" }}>
            {t("zakat.this_is_a_guide_not",
              "*This is a guide, not a ruling.* It follows the Hanafi position and uses the price you enter. Zakat can depend on your own circumstances, and scholars differ on things like pensions, shares and long-term debt. For anything you are unsure about, please ask the imam at the masjid.")}</Rich>
        </View>
      </View>
    </Screen>
  );
}

/* The input on its own, for the one field whose label shares its line with a
   link — the nisab price, where the website puts "check price" on the right
   of .zk-l rather than under the box. */
function Money({ value, onChange, placeholder = "0" }) {
  const { fs, rtl } = useApp();
  const [focus, setFocus] = useState(false);
  return (
    <TextInput
      value={value} onChangeText={onChange}
      keyboardType="decimal-pad" inputMode="decimal"
      placeholder={placeholder} placeholderTextColor={C.hint}
      onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
      style={{ fontFamily: F.sansSemi, fontSize: fs(16), color: C.ink, backgroundColor: C.card,
               borderWidth: focus ? 1.6 : 1, borderColor: focus ? C.brand600 : C.line,
               borderRadius: 13, paddingHorizontal: 14, paddingVertical: 12,
               textAlign: rtl ? "right" : "left" }} />
  );
}

function Field({ label, value, onChange }) {
  const { fs, rtl } = useApp();
  const [focus, setFocus] = useState(false);
  return (
    <View style={{ marginTop: 13 }}>
      <Text style={{ fontFamily: F.sans, fontSize: fs(12.5), color: C.muted, marginBottom: 6,
                     textAlign: rtl ? "right" : "left" }}>{label}</Text>
      <TextInput
        value={value} onChangeText={onChange}
        keyboardType="decimal-pad" inputMode="decimal"
        placeholder="0" placeholderTextColor={C.hint}
        onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
        style={{ fontFamily: F.sansSemi, fontSize: fs(16), color: C.ink, backgroundColor: C.card,
                 borderWidth: focus ? 1.6 : 1, borderColor: focus ? C.brand600 : C.line,
                 borderRadius: 13, paddingHorizontal: 14, paddingVertical: 12,
                 textAlign: rtl ? "right" : "left" }} />
    </View>
  );
}

function Line({ k, v, strong }) {
  const { fs, rtl } = useApp();
  return (
    <View style={{ flexDirection: rtl ? "row-reverse" : "row", justifyContent: "space-between",
                   paddingVertical: 5 }}>
      <Text style={{ fontFamily: F.sans, fontSize: fs(13.5), color: strong ? C.ink : C.muted }}>{k}</Text>
      <Text style={{ fontFamily: strong ? F.sansSemi : F.sans, fontSize: fs(13.5), color: C.ink }}>{v}</Text>
    </View>
  );
}

/* .zk-lists — an 11px uppercase heading tracked .14em in plum or the danger
 * colour, over plain bullets at 13.5px. Not green ticks: a tick beside "The
 * home you live in" tells the reader the opposite of what the list says. */
function ZList({ head, items, tone }) {
  const { fs, rtl } = useApp();
  return (
    <>
      <Text style={{ fontFamily: F.sansBold, fontSize: fs(11), letterSpacing: 1.54,
                     textTransform: "uppercase", color: tone, marginBottom: 9,
                     textAlign: rtl ? "right" : "left" }}>{head}</Text>
      {items.map((x, i) => (
        <View key={i} style={{ flexDirection: rtl ? "row-reverse" : "row", gap: 8, marginBottom: 6 }}>
          <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: C.ink,
                         marginTop: fs(9), marginHorizontal: 2 }} />
          <Rich style={{ flex: 1, fontFamily: F.sans, fontSize: fs(13.5), lineHeight: fs(21.5), color: C.ink,
                         textAlign: rtl ? "right" : "left" }}>{x}</Rich>
        </View>))}
    </>
  );
}
