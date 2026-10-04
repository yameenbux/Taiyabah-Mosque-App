/* The zakat calculator.
 *
 * The arithmetic is the web app's, unchanged, because it has been checked by the
 * office: nisab is 612.36g of silver or 87.48g of gold at today's price, and the
 * rate is 2.5% of what is left after debts. Nothing is sent anywhere — every
 * figure stays on the phone.
 */
import React, { useMemo, useState } from "react";
import { View, Text, TextInput, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { C, F, R } from "../theme";
import { useApp } from "../store";
import { Screen, Hero, Heading, Card, P, Note, Ticks, Warn, Press, Pill, open, tap } from "../ui";

const NISAB = { silver: 612.36, gold: 87.48 };
const RATE = 0.025;
const money = n => "£" + n.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function Zakat() {
  const { t, fs, rtl } = useApp();
  const [standard, setStandard] = useState("silver");
  const [price, setPrice] = useState("");
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
      <Hero lines={[
        { k: "zakat.charity_does_not_decrease_wealth", t: "“Charity does not decrease wealth.”", w: "title" },
        { k: "zakat.the_prophet_sahih_muslim_2588", t: "The Prophet ﷺ · Ṣaḥīḥ Muslim 2588", w: "sub" },
      ]} />
      <View style={{ paddingHorizontal: 16 }}>

        <Heading tag="1">{t("zakat.the_nisab", "The nisab")}</Heading>
        <P muted>{t("zakat.nisab_is_the_minimum",
          "Nisab is the minimum you must own before zakat is due. It is fixed in gold and silver, so it moves with the price.")}</P>

        <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
          {[["silver", `${t("sheet.silver", "Silver")} · 612.36g`], ["gold", `${t("sheet.gold", "Gold")} · 87.48g`]].map(([k, lab]) => {
            const on = standard === k;
            return (
              <Pressable key={k} onPress={() => { tap(); setStandard(k); }}
                style={{ flex: 1, alignItems: "center", paddingVertical: 12, borderRadius: 14,
                         borderWidth: on ? 1.6 : 1, borderColor: on ? C.brand600 : C.line,
                         backgroundColor: on ? "rgba(119,33,87,.07)" : C.card }}>
                <Text style={{ fontFamily: F.sansMedium, fontSize: fs(13.5), color: on ? C.brand600 : C.ink }}>{lab}</Text>
              </Pressable>);
          })}
        </View>
        <View style={{ marginTop: 10 }}>
        <Note>{t("zakat.most_scholars_silver",
          "Most scholars prefer the silver standard, because it is lower and so more people qualify to give.")}</Note>
        </View>

        <Field label={t("zakat.price_per_gram_today", `Price per gram of ${standard} today (£)`)}
               value={price} onChange={x => setPrice(x.replace(/[^0-9.]/g, ""))} />
        <Press onPress={() => open(standard === "gold"
                 ? "https://www.bullionbypost.co.uk/gold-price/gold-price-per-gram/"
                 : "https://www.bullionbypost.co.uk/silver-price/silver-price-per-gram/")}
          style={{ flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start",
                   paddingVertical: 8 }}>
          <Ionicons name="open-outline" size={14} color={C.brand600} />
          <Text style={{ fontFamily: F.sansMedium, fontSize: fs(12.5), color: C.brand600 }}>
            {t("zakat.check_price", "Check today's price")}</Text>
        </Press>
        <Card>
          <Text style={{ fontFamily: F.sansMedium, fontSize: fs(14), color: C.brand600, textAlign: "center" }}>
            {out.nisab === null
              ? t("zakat.enter_today_s_price_to", "Enter today's price to see the nisab")
              : `${t("zakat.nisab_is", "Nisab is")} ${money(out.nisab)}`}
          </Text>
        </Card>

        <Heading tag="2">{t("zakat.what_you_own", "What you own")}</Heading>
        <Field label={t("zakat.cash_at_home_bank_savings", "Cash — at home, bank, savings (£)")} value={v.cash} onChange={x => set("cash", x)} />
        <Field label={t("zakat.gold_you_own_grams", "Gold you own (grams)")} value={v.gold} onChange={x => set("gold", x)} />
        <Field label={t("zakat.silver_you_own_grams", "Silver you own (grams)")} value={v.silver} onChange={x => set("silver", x)} />
        <Field label={t("zakat.money_owed_to_you_that", "Money owed to you that you expect back (£)")} value={v.owed} onChange={x => set("owed", x)} />
        <Field label={t("zakat.business_stock_goods_bought_to", "Business stock — goods bought to sell (£)")} value={v.stock} onChange={x => set("stock", x)} />
        <Field label={t("zakat.shares_crypto_other_investments", "Shares, crypto & other investments (£)")} value={v.invest} onChange={x => set("invest", x)} />
        {(n("gold") > 0 || n("silver") > 0) && !Number(price) && (
          <Warn>{t("zakat.gsnote",
            "Enter a price per gram above, or the gold and silver you own cannot be valued.")}</Warn>)}

        <Heading tag="3">{t("zakat.what_you_owe", "What you owe")}</Heading>
        <Field label={t("zakat.debts_and_bills_due_now", "Debts and bills due now (£)")} value={v.debts} onChange={x => set("debts", x)} />
        <View style={{ marginTop: 9 }}>
          <Note>{t("zakat.include_what_you_owe",
            "Include what you owe right now — bills, rent, money borrowed.")}</Note>
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
            <View style={{ alignItems: "center", gap: 5 }}>
              <Text style={{ fontFamily: F.sans, fontSize: fs(12), letterSpacing: 1,
                             textTransform: "uppercase", color: C.goldInk }}>
                {t("zakat.zakat_due_2_5", "Zakat due · 2.5%")}</Text>
              <Text style={{ fontFamily: F.display, fontSize: fs(34), color: C.brand600 }}>{money(out.due)}</Text>
            </View>
          ) : (
            <View style={{ alignItems: "center", gap: 6 }}>
              <Pill>{t("zakat.below_nisab", "Below the nisab")}</Pill>
              <Note>{t("zakat.no_zakat_due",
                "No zakat is due on this amount. Ṣadaqah is always welcome.")}</Note>
            </View>
          )}
        </Card>

        <Press onPress={() => { tap(); setV({ cash: "", gold: "", silver: "", owed: "", stock: "", invest: "", debts: "" }); setPrice(""); }}
          style={{ alignSelf: "center", marginTop: 14, flexDirection: "row", gap: 7, alignItems: "center",
                   paddingHorizontal: 15, paddingVertical: 9, borderRadius: R.pill, borderWidth: 1, borderColor: C.line }}>
          <Ionicons name="refresh-outline" size={15} color={C.muted} />
          <Text style={{ fontFamily: F.sansMedium, fontSize: fs(13), color: C.muted }}>
            {t("zakat.clear_all", "Clear all")}</Text>
        </Press>

        <Heading>{t("zakat.what_counts", "What counts")}</Heading>
        <Card>
          <Text style={{ fontFamily: F.sansMedium, fontSize: fs(13), color: C.ink }}>
            {t("zakat.include_these", "Include these")}</Text>
          <Ticks items={[
            { k: "zakat.cash_at_home_in_the", t: "Cash at home, in the bank, or in any savings account" },
            { k: "zakat.money_you_are_saving_for", t: "Money you are saving for something, like a wedding, a car or Hajj" },
            { k: "zakat.money_people_owe_you_that", t: "Money people owe you that you expect to get back" },
            { k: "zakat.goods_you_bought_in_order", t: "Goods you bought in order to sell them" },
            { k: "zakat.shares_bought_to_trade_and", t: "Shares bought to trade, and cryptocurrency" },
          ]} />
        </Card>

        <Warn>{t("zakat.disclaimer",
          "This is a guide, not a ruling. Zakat on a business, on a pension, or on property bought to let can be more involved — ask an imam if your situation is not a simple one.")}</Warn>
      </View>
    </Screen>
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
        placeholder="0" placeholderTextColor={C.line}
        onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
        style={{ fontFamily: F.sansMedium, fontSize: fs(16), color: C.ink, backgroundColor: C.card,
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
      <Text style={{ fontFamily: strong ? F.sansMedium : F.sans, fontSize: fs(13.5), color: C.ink }}>{v}</Text>
    </View>
  );
}
