/* Giving.
 *
 * Two screens in one file because they share the plumbing: the new-build appeal
 * (fixed tiers, one cause) and ṣadaqah/lillāh (a cause, a frequency, an amount).
 *
 * Every link carries client_reference_id. Without it the webhook has no way to
 * tell the masjid what a payment was for, which is how the 42 unattributed
 * payments happened in the first place — so it is not optional here either.
 */
import React, { useState } from "react";
import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { C, F, R } from "../theme";
import { useApp } from "../store";
import { Screen, Hero, Heading, Card, P, Note, CTA, Bank, Foot, Pill, Press, DL, open, tap } from "../ui";
import { SHEETS } from "../Blocks";

const BANK = [
  { k: { k: "sheet.account_name", t: "Account name" }, v: { t: "Bolton Central Islamic Society (BCIS)" } },
  { k: { k: "sheet.bank", t: "Bank" },                 v: { t: "HSBC" } },
  { k: { k: "sheet.sort_code", t: "Sort code" },        v: { t: "40-04-15" } },
  { k: { k: "sheet.account_number", t: "Account number" }, v: { t: "02320258" } },
];

/* ---------- the new build ------------------------------------------------- */

const TIERS = [
  { amt: "£250",   label: "Bronze",   href: "https://buy.stripe.com/eVqaEX0Z63PGb3E2cSf3a01?client_reference_id=newbuild" },
  { amt: "£500",   label: "Silver",   href: "https://buy.stripe.com/3cI7sLgY4fyo2x8eZEf3a02?client_reference_id=newbuild" },
  { amt: "£1,000", label: "Gold",     href: "https://buy.stripe.com/fZubJ123a4TK5Jk18Of3a03?client_reference_id=newbuild" },
  { amt: "£2,500", label: "Platinum", href: "https://buy.stripe.com/28EbJ1cHOcmc5Jk04Kf3a04?client_reference_id=newbuild" },
];
const ANY = "https://buy.stripe.com/6oU3cvbDK1Hy2x8g3If3a05?client_reference_id=newbuild";
const PHASE = ["Tiling", "Carpets", "Heating", "Lighting", "Electrical", "Decor"];

export function NewBuild() {
  const { t, fs } = useApp();
  return (
    <Screen pad={false}>
      <Hero lines={[
        { k: "sheet.current_appeal_phase_3_3", t: "Current appeal · Phase 3.3", w: "eyebrow" },
        { k: "sheet.internal_fixtures_fittings", t: "Internal fixtures & fittings", w: "title" },
        { k: "sheet.help_make_the_masjid_ready", t: "Help make the masjid ready for salah, Qurʼan and remembrance", w: "sub" },
      ]} />
      <View style={{ paddingHorizontal: 16 }}>
        <Card style={{ marginTop: 16 }}>
          <Text style={{ fontFamily: F.arabic, fontSize: fs(17), lineHeight: fs(30), color: C.ink,
                         textAlign: "center" }}>
            {t("sheet.whoever_builds_a_mosque_for",
              "“Whoever builds a mosque for Allah, Allah will build for him a house like it in Paradise.”")}
          </Text>
          <Note>{t("sheet.narrated_by_uthman_ibn_affan",
            "Narrated by ʿUthmān ibn ʿAffān · Ṣaḥīḥ al-Bukhārī 450 · Ṣaḥīḥ Muslim 533")}</Note>
        </Card>

        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 7, marginTop: 14 }}>
          {PHASE.map(x => (
            <View key={x} style={{ borderWidth: 1, borderColor: C.line, borderRadius: R.pill,
                                   paddingHorizontal: 11, paddingVertical: 6, backgroundColor: C.card }}>
              <Text style={{ fontFamily: F.sans, fontSize: fs(12), color: C.brand600 }}>{x}</Text>
            </View>))}
        </View>

        <Heading tag={t("sheet.apple_google_pay", "Apple & Google Pay")}>{t("sheet.give_now", "Give now")}</Heading>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          {TIERS.map(x => (
            <Pressable key={x.label} onPress={() => open(x.href)}
              style={({ pressed }) => ({ flexBasis: "47%", flexGrow: 1, borderRadius: R.card, borderWidth: 1,
                                         borderColor: C.line, backgroundColor: C.card, padding: 15,
                                         alignItems: "center", gap: 3,
                                         transform: [{ scale: pressed ? 0.98 : 1 }] })}>
              <Text style={{ fontFamily: F.display, fontSize: fs(22), color: C.ink }}>{x.amt}</Text>
              <Text style={{ fontFamily: F.sansMedium, fontSize: fs(11), letterSpacing: 1,
                             textTransform: "uppercase", color: C.goldInk }}>{x.label}</Text>
            </Pressable>))}
        </View>

        <CTA label={t("sheet.give_any_other_amount", "Give any other amount")}
             sub={t("sheet.card_apple_pay_google_pay", "Card · Apple Pay · Google Pay")} href={ANY} />
        <View style={{ marginTop: 11 }}>
          <Note>{t("sheet.opens_the_masjids_secure_donation",
            "Opens the masjid's secure donation page. Card payments carry a small processing fee — a bank transfer below reaches the masjid in full, if that suits you better.")}</Note>
        </View>

        <Heading tag={t("sheet.tap_to_copy", "Tap to copy")}>{t("sheet.or_transfer_directly", "Or transfer directly")}</Heading>
        <Bank items={BANK} />
        <CopyAll />
        <Foot lines={["Bolton Central Islamic Society · Registered charity 1041569",
                      t("sheet.if_you_are_ever_unsure",
                        "If you are ever unsure about donation details, please confirm them at the masjid office.")]} />
      </View>
    </Screen>
  );
}

function CopyAll() {
  const { t, fs } = useApp();
  const [done, setDone] = useState(false);
  const all = BANK.map(b => `${b.k.t}: ${b.v.t}`).join("\n");
  return (
    <Press onPress={async () => { tap(); await Clipboard.setStringAsync(all); setDone(true); setTimeout(() => setDone(false), 1800); }}
      style={{ marginTop: 11, alignSelf: "center", flexDirection: "row", alignItems: "center", gap: 7,
               paddingHorizontal: 15, paddingVertical: 9, borderRadius: R.pill, borderWidth: 1, borderColor: C.line }}>
      <Ionicons name={done ? "checkmark" : "copy-outline"} size={15} color={C.brand600} />
      <Text style={{ fontFamily: F.sansMedium, fontSize: fs(13), color: C.brand600 }}>
        {done ? t("ui.copied", "Copied") : t("sheet.copy_all_details", "Copy all details")}</Text>
    </Press>
  );
}

/* ---------- ṣadaqah & lillāh --------------------------------------------- */

const LINKS = {
  once: { 5: "https://donate.stripe.com/3cI6oH8ry5XO2x84l0f3a09", 10: "https://donate.stripe.com/cNi7sL7nu71S8Vw3gWf3a0a",
          25: "https://donate.stripe.com/aFaeVd37egCs2x8eZEf3a0b", 50: "https://donate.stripe.com/eVq3cvfU03PG8VwdVAf3a0c",
          100: "https://donate.stripe.com/28EcN5cHOcmc7Rs4l0f3a0d", other: "https://donate.stripe.com/6oU00j7nueuk2x8bNsf3a0o" },
  monthly: { 5: "https://donate.stripe.com/dRmcN523aeukc7I6t8f3a0f", 10: "https://donate.stripe.com/4gMcN55fm71S0p018Of3a0e",
             25: "https://donate.stripe.com/14A8wPgY4gCs9ZAeZEf3a0g", 50: "https://donate.stripe.com/5kQ00jdLScmc9ZAaJof3a0h",
             100: "https://donate.stripe.com/dRm9ATgY4bi86NocRwf3a0i", other: "" },
  friday: { 5: "https://donate.stripe.com/28E5kD8ry2LCdbM04Kf3a0j", 10: "https://donate.stripe.com/5kQfZhdLSbi81t418Of3a0k",
            25: "https://donate.stripe.com/dRm3cv5fm71S9ZA9Fkf3a0l", 50: "https://donate.stripe.com/dRmaEX37e9a0b3E8Bgf3a0m",
            100: "https://donate.stripe.com/3cIaEXfU0cmc2x8dVAf3a0n", other: "" },
};
const AMOUNTS = ["5", "10", "25", "50", "100", "other"];

export function Giving() {
  const { t, fs } = useApp();
  const [fund, setFund] = useState("general");
  const [freq, setFreq] = useState("once");
  const [amt, setAmt]   = useState("25");

  const FUNDS = [
    { v: "general",  t: t("giving.the_masjid", "The masjid"), s: t("giving.general", "General"),
      note: t("giving.the_general_fund_upkeep_running", "The general fund — upkeep, running costs, and the masjid's work in Bolton.") },
    { v: "sadaqah",  t: t("giving.sadaqah", "Sadaqah"), s: t("giving.voluntary", "Voluntary"),
      note: t("giving.voluntary_charity_given_as_and", "Voluntary charity, given as and when you wish.") },
    { v: "lillah",   t: t("giving.lillah", "Lillah"), s: t("giving.for_allah", "For Allah"),
      note: t("giving.given_purely_for_the_sake", "Given purely for the sake of Allah, with nothing expected in return.") },
  ];
  const FREQS = [
    { v: "once",    t: t("giving.one_off", "One-off"), s: t("giving.a_single_gift", "A single gift") },
    { v: "monthly", t: t("giving.monthly", "Monthly"), s: t("giving.until_you_stop", "Until you stop") },
    { v: "friday",  t: t("giving.friday_pay", "Friday Pay"), s: t("giving.jumuah", "Jumuʿah") },
  ];

  const goes = SHEETS.giving?.blocks.find(b => b.type === "dl");
  const base = LINKS[freq][amt];
  /* The designation rides on the same link rather than needing its own, exactly
   * as it does on the website, so the masjid's reports do not split in two. */
  const href = base ? base + (base.includes("?") ? "&" : "?") + "client_reference_id=" + encodeURIComponent(fund) : null;
  const per = freq === "monthly" ? " " + t("giving.a_month", "a month")
            : freq === "friday"  ? " " + t("giving.every_friday", "every Friday") : "";
  const label = !href ? t("giving.not_available_yet", "Not available yet")
              : amt === "other" ? t("giving.choose_your_amount", "Choose your amount") + per
              : `${t("tiles.donate", "Donate")} £${amt}${per}`;

  return (
    <Screen pad={false}>
      <Hero lines={[
        { k: "giving.support_the_masjid", t: "Support the masjid", w: "eyebrow" },
        { k: "giving.give_to_taiyabah_masjid", t: "Give to Taiyabah Masjid", w: "title" },
        { k: "giving.every_prayer_held_here", t: "Every prayer held here, every child taught, every janāzah carried out", w: "sub" },
      ]} />
      <View style={{ paddingHorizontal: 16 }}>
        {/* What the money actually pays for, in the masjid's own words. */}
        {!!goes && (
          <>
            <Heading>{t("giving.where_your_giving_goes", "Where your giving goes")}</Heading>
            <DL items={goes.items} />
          </>)}

        <Heading>{t("giving.what_it_is_for", "What it is for")}</Heading>
        <Options options={FUNDS} value={fund} onChange={setFund} />
        <View style={{ marginTop: 10 }}><Note>{FUNDS.find(f => f.v === fund).note}</Note></View>

        <Heading>{t("giving.how_often", "How often")}</Heading>
        <Options options={FREQS} value={freq} onChange={setFreq} />

        <Heading>{t("giving.amount", "Amount")}</Heading>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {AMOUNTS.map(a => {
            const off = !LINKS[freq][a];
            const on = a === amt;
            return (
              <Pressable key={a} disabled={off} onPress={() => { tap(); setAmt(a); }}
                style={({ pressed }) => ({ flexBasis: "30%", flexGrow: 1, alignItems: "center", paddingVertical: 13,
                                           borderRadius: 14, borderWidth: on ? 1.6 : 1,
                                           borderColor: on ? C.brand600 : C.line,
                                           backgroundColor: on ? "rgba(119,33,87,.07)" : C.card,
                                           opacity: off ? 0.38 : pressed ? 0.85 : 1 })}>
                <Text style={{ fontFamily: F.sansMedium, fontSize: fs(16), color: on ? C.brand600 : C.ink }}>
                  {a === "other" ? t("giving.other", "Other") : `£${a}`}</Text>
                {a === "other" && <Text style={{ fontFamily: F.sans, fontSize: fs(10.5), color: C.muted }}>
                  {t("giving.you_choose", "You choose")}</Text>}
              </Pressable>);
          })}
        </View>
        {/* Two combinations have no link — a recurring gift of an amount the
            donor types. They grey out rather than vanishing, because a grid that
            changes shape as you switch frequency is a grid people think they
            misclicked. */}

        <CTA label={label} href={href} disabled={!href}
             sub={href ? t("sheet.card_apple_pay_google_pay", "Card · Apple Pay · Google Pay")
                       : t("giving.choose_another_amount", "Choose another amount, or use the bank details below")} />

        <Heading tag={t("sheet.tap_to_copy", "Tap to copy")}>{t("sheet.or_transfer_directly", "Or transfer directly")}</Heading>
        <Bank items={BANK} />
        <CopyAll />
        <View style={{ marginTop: 13 }}>
          <Note>{t("giving.please_use_your_surname_as",
            "Please use your surname as the reference.")}</Note>
        </View>
        <Foot lines={["Bolton Central Islamic Society · Registered charity 1041569"]} />
      </View>
    </Screen>
  );
}

function Options({ options, value, onChange }) {
  const { fs } = useApp();
  return (
    <View style={{ flexDirection: "row", gap: 8 }}>
      {options.map(o => {
        const on = o.v === value;
        return (
          <Pressable key={o.v} onPress={() => { tap(); onChange(o.v); }}
            style={({ pressed }) => ({ flex: 1, alignItems: "center", paddingVertical: 12, paddingHorizontal: 6,
                                       borderRadius: 14, borderWidth: on ? 1.6 : 1,
                                       borderColor: on ? C.brand600 : C.line,
                                       backgroundColor: on ? "rgba(119,33,87,.07)" : C.card,
                                       opacity: pressed ? 0.85 : 1 })}>
            <Text style={{ fontFamily: F.sansMedium, fontSize: fs(13.5), color: on ? C.brand600 : C.ink }}>{o.t}</Text>
            <Text style={{ fontFamily: F.sans, fontSize: fs(10.5), color: C.muted, marginTop: 1 }}>{o.s}</Text>
          </Pressable>);
      })}
    </View>
  );
}
