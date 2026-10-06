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
import { C, F, R, SHADOW, dual } from "../theme";
import { LinearGradient } from "expo-linear-gradient";
import { useApp } from "../store";
import { Screen, Hero, Heading, Card, P, Note, CTA, Bank, Foot, Pill, Press, DL, open, tap, GLab, GoldCTA, Rich, TopBar, Girih } from "../ui";
import { SHEETS } from "../Blocks";

const BANK = [
  { k: { k: "sheet.account_name", t: "Account name" },
    v: { k: "sheet.bolton_central_islamic_society_bcis", t: "Bolton Central Islamic Society (BCIS)" } },
  { k: { k: "sheet.bank", t: "Bank" }, v: { k: "sheet.hsbc", t: "HSBC" } },
  { k: { k: "sheet.sort_code", t: "Sort code" },        v: { t: "40-04-15" } },
  { k: { k: "sheet.account_number", t: "Account number" }, v: { t: "02320258" } },
];

/* ---------- the new build ------------------------------------------------- */

/* Each tier is NAMED AFTER A METAL and the website colours it accordingly —
   .t-bronze through .t-plat each set their own border and their own ink for
   the name. The app drew all four with the same hairline and the same gold
   ink, so Bronze, Silver, Gold and Platinum were four identical boxes with
   different words in them. */
const TIERS = [
  { amt: "£250",   k: "sheet.bronze",   label: "Bronze",   line: "#D3A47C", ink: "#8E5730",
    href: "https://buy.stripe.com/eVqaEX0Z63PGb3E2cSf3a01?client_reference_id=newbuild" },
  { amt: "£500",   k: "sheet.silver",   label: "Silver",   line: "#C4BFC2", ink: "#6E656B",
    href: "https://buy.stripe.com/3cI7sLgY4fyo2x8eZEf3a02?client_reference_id=newbuild" },
  { amt: "£1,000", k: "sheet.gold",     label: "Gold",     line: "#D8BC72", ink: "#7A5D14",
    href: "https://buy.stripe.com/fZubJ123a4TK5Jk18Of3a03?client_reference_id=newbuild" },
  /* £5,000, as the website says and as the Stripe link charges. This read
   * £2,500 against the same link, so the app was advertising half the amount
   * somebody would actually be asked for. */
  { amt: "£5,000", k: "sheet.platinum", label: "Platinum", line: "#B89FAF", ink: "#7C5E71",
    href: "https://buy.stripe.com/28EbJ1cHOcmc5Jk04Kf3a04?client_reference_id=newbuild" },
];
const ANY = "https://buy.stripe.com/6oU3cvbDK1Hy2x8g3If3a05?client_reference_id=newbuild";
/* What phase 3.3 is actually paying for. Keyed, because a donor reading the
 * app in Urdu should be told what the money buys in Urdu. */
const PHASE = [
  { k: "sheet.tiling",     t: "Tiling" },
  { k: "sheet.carpets",    t: "Carpets" },
  { k: "sheet.heating",    t: "Heating" },
  { k: "sheet.lighting",   t: "Lighting" },
  { k: "sheet.electrical", t: "Electrical" },
  { k: "sheet.decor",      t: "Decor" },
];

export function NewBuild({ navigation }) {
  const { t, fs, rtl } = useApp();
  return (
    <Screen pad={false}>
      {/* Donate is one of the website's seven PAGES, and its hero is the
          HADITH — the Arabic in gold at 23px, right-aligned, over the English
          in Fraunces and the chain of narration under a gold hairline. The
          app put the appeal in the hero instead and dropped the Arabic
          altogether, so the verse that is the whole reason for the page came
          out as a quiet card below the fold. */}
      <LinearGradient colors={[C.brand900, C.brand800]} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}>
        <TopBar navigation={navigation} />
      </LinearGradient>
      <LinearGradient colors={[C.brand800, C.brand900]} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
        style={{ paddingTop: 26, paddingHorizontal: 22, paddingBottom: 24, overflow: "hidden" }}>
        <Girih style={{ right: -50, top: -44 }} size={220} opacity={0.09} />
        <Text style={{ fontFamily: F.arabic, fontSize: fs(23), lineHeight: fs(46), color: C.goldBright,
                       textAlign: "right", writingDirection: "rtl", marginBottom: 16 }}>
          مَنْ بَنَى مَسْجِدًا لِلَّهِ بَنَى اللَّهُ لَهُ فِي الْجَنَّةِ مِثْلَهُ</Text>
        <Rich style={{ fontFamily: F.display, fontSize: fs(16.5), lineHeight: fs(25.5), color: "#EDEFE9",
                       textAlign: rtl ? "right" : "left" }}>
          {t("sheet.whoever_builds_a_mosque_for",
            "“Whoever builds a mosque for Allah, Allah will build for him a house like it in Paradise.”")}
        </Rich>
        <Text style={{ fontFamily: F.sans, fontSize: fs(11), letterSpacing: 0.66, color: "#A78F9E",
                       marginTop: 12, paddingTop: 11, borderTopWidth: 1,
                       borderTopColor: "rgba(198,162,76,.25)", textAlign: rtl ? "right" : "left" }}>
          {t("sheet.narrated_by_uthman_ibn_affan",
            "Narrated by ʿUthmān ibn ʿAffān · Ṣaḥīḥ al-Bukhārī 450 · Ṣaḥīḥ Muslim 533")}</Text>
      </LinearGradient>

      <View style={{ paddingHorizontal: 16 }}>
        <Heading>{t("sheet.where_the_build_is_now", "Where the build is now")}</Heading>
        {/* .card.phase — the appeal itself: a 10px uppercase plum tag tracked
            .16em, the phase in Fraunces at 19, the sentence under it, and the
            six needs as GOLD pills inside it. The app had the tag and the
            title up in the hero and the pills loose on the paper, so the card
            that says what the money is for did not exist. */}
        <Card pad={16}>
          <Text style={{ fontFamily: F.sansBold, fontSize: fs(10), letterSpacing: 1.6,
                         textTransform: "uppercase", color: C.brand600, marginBottom: 8,
                         textAlign: rtl ? "right" : "left" }}>
            {t("sheet.current_appeal_phase_3_3", "Current appeal · Phase 3.3")}</Text>
          <Text style={{ fontFamily: F.display, fontSize: fs(19), lineHeight: fs(24), color: C.ink,
                         textAlign: rtl ? "right" : "left" }}>
            {t("sheet.internal_fixtures_fittings", "Internal fixtures & fittings")}</Text>
          <Text style={{ fontFamily: F.sans, fontSize: fs(14), lineHeight: fs(21.5), color: C.muted,
                         marginTop: 8, textAlign: rtl ? "right" : "left" }}>
            {t("sheet.help_make_the_masjid_ready", "Help make the masjid ready for salah, Qur’an and remembrance for generations to come.")}</Text>
          {/* .needs span — a 16% gold fill inside a 30% gold border with the
              label in #4A3B14. They were plum text on a white pill. */}
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 13 }}>
            {PHASE.map(x => (
              <View key={x.k} style={{ borderWidth: 1, borderColor: "rgba(198,162,76,.3)",
                                       backgroundColor: "rgba(198,162,76,.16)", borderRadius: R.pill,
                                       paddingHorizontal: 11, paddingVertical: 5 }}>
                <Text style={{ fontFamily: F.sansSemi, fontSize: fs(12), color: dual("#4A3B14", C.goldInk) }}>
                  {t(x.k, x.t)}</Text>
              </View>))}
          </View>
        </Card>

        <Heading tag={t("sheet.apple_google_pay", "Apple & Google Pay")}>{t("sheet.give_now", "Give now")}</Heading>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          {TIERS.map(x => (
            <Pressable key={x.label} onPress={() => open(x.href)}
              style={({ pressed }) => ({ flexBasis: "47%", flexGrow: 1, borderRadius: R.card, borderWidth: 1,
                                         borderColor: x.line, backgroundColor: C.card, padding: 15,
                                         alignItems: "center", gap: 3,
                                         transform: [{ scale: pressed ? 0.98 : 1 }] })}>
              {/* .t-amt is the SANS at 20px weight 700, not the serif. */}
              <Text style={{ fontFamily: F.sansBold, fontSize: fs(20), color: C.ink }}>{x.amt}</Text>
              <Text style={{ fontFamily: F.sansBold, fontSize: fs(10.5), letterSpacing: 1.7,
                             textTransform: "uppercase", color: x.ink }}>{t(x.k, x.label)}</Text>
            </Pressable>))}
        </View>

        <CTA label={t("sheet.give_any_other_amount", "Give any other amount")}
             sub={t("sheet.card_apple_pay_google_pay", "Card · Apple Pay · Google Pay")} href={ANY} />
        <View style={{ marginTop: 11 }}>
          <Note>{t("sheet.opens_the_masjids_secure_donation", "Opens the masjid’s secure donation page. Card payments carry a small processing fee — a bank transfer below reaches the masjid in full, if that suits you better.")}</Note>
        </View>

        <Heading tag={t("sheet.tap_to_copy", "Tap to copy")}>{t("sheet.or_transfer_directly", "Or transfer directly")}</Heading>
        <Bank items={BANK} />
        <CopyAll />
        <Foot lines={["Bolton Central Islamic Society · Registered charity 1041569",
                      t("sheet.if_you_are_ever_unsure", "If you are ever unsure about donation details, please confirm them at the masjid office before transferring.")]} />
      </View>
    </Screen>
  );
}

/* .copyall — a FULL-WIDTH brand-700 to brand-800 button at 13px of radius
 * with the label 15px bold in cream and the shared lift. It was a small
 * outlined pill centred under the panel, which on the one screen where the
 * details matter looked like a footnote rather than the thing to press. */
function CopyAll() {
  const { t, fs } = useApp();
  const [done, setDone] = useState(false);
  const all = BANK.map(b => `${b.k.t}: ${b.v.t}`).join("\n");
  return (
    <Pressable onPress={async () => { tap(); await Clipboard.setStringAsync(all); setDone(true); setTimeout(() => setDone(false), 2000); }}
      style={({ pressed }) => [{ marginTop: 12, borderRadius: 13, overflow: "hidden",
                                 opacity: pressed ? 0.9 : 1 }, SHADOW]}>
      <LinearGradient colors={[C.ctaTop, C.ctaBot]} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
        style={{ paddingVertical: 14, alignItems: "center" }}>
        <Text style={{ fontFamily: F.sansBold, fontSize: fs(15), color: C.cream }}>
          {done ? t("ui.copied", "Copied") : t("sheet.copy_all_details", "Copy all details")}</Text>
      </LinearGradient>
    </Pressable>
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
      note: t("giving.the_general_fund_upkeep_running", "The general fund — upkeep, running costs, and the masjid’s work in Bolton.") },
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
      {/* The website's own hero, lifted whole: the eyebrow, صَدَقَة in gold
          between it and the title, and the full standfirst. The Arabic line
          was missing and the standfirst had been cut off halfway — it ends
          "...rests on what the community gives. This page is for the masjid
          itself — its upkeep, its running, and the work it does in Bolton",
          which is the sentence that says what this page is NOT for. */}
      <Hero lines={SHEETS.giving?.blocks.find(b => b.type === "hero")?.lines || []} />
      <View style={{ paddingHorizontal: 16 }}>
        {/* What the money actually pays for, in the masjid's own words. */}
        {!!goes && (
          <>
            <Heading>{t("giving.where_your_giving_goes", "Where your giving goes")}</Heading>
            <DL items={goes.items} kind={goes.kind} />
          </>)}

        {/* "Give online" is one SECTION on the website, with its tag naming
            what it takes, and the three choosers live together inside a
            single card under it. Here each was its own gold-ruled heading, so
            one decision — how much, to what, how often — read as three parts
            of the page. */}
        <Heading tag={t("sheet.apple_google_pay", "Apple & Google Pay")}>
          {t("giving.give_online", "Give online")}</Heading>
        <Card pad={14}>
          <GLab>{t("giving.what_it_is_for", "What it is for")}</GLab>
          <Options options={FUNDS} value={fund} onChange={setFund} />
          <Text style={{ fontFamily: F.sans, fontSize: fs(13.5), lineHeight: fs(21.5), color: C.ink,
                         marginTop: 12 }}>{FUNDS.find(f => f.v === fund).note}</Text>

          {/* .gv-zakat — the masjid saying, in the danger colour, that this is
              not where zakāt goes. It is in the data and in all four language
              packs; this screen simply never drew it, so somebody could give
              their zakāt here and the app would take it. */}
          <View style={{ marginTop: 11, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 12,
                         borderWidth: 1, borderColor: "rgba(180,83,47,.3)",
                         backgroundColor: "rgba(180,83,47,.07)" }}>
            <Rich style={{ fontFamily: F.sans, fontSize: fs(13.5), lineHeight: fs(21.5), color: C.danger }}>
              {t("giving.zakat_is_not_taken_here",
                 "*Zakāt is not taken here.* It has its own categories — please ring the office on 01204 535 997.")}
            </Rich>
          </View>

          <GLab>{t("giving.how_often", "How often")}</GLab>
          <Options options={FREQS} value={freq} onChange={setFreq} />

          <GLab>{t("giving.amount", "Amount")}</GLab>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {AMOUNTS.map(a => {
            const off = !LINKS[freq][a];
            const on = a === amt;
            return (
              <Pressable key={a} disabled={off} onPress={() => { tap(); setAmt(a); }}
                style={({ pressed }) => ({ flexBasis: "30%", flexGrow: 1, minHeight: 62,
                                           alignItems: "center", justifyContent: "center", gap: 2,
                                           paddingVertical: 11, paddingHorizontal: 7,
                                           borderRadius: 14, borderWidth: 1,
                                           borderColor: on ? C.brand900 : C.line,
                                           backgroundColor: on ? C.brand900 : C.card,
                                           opacity: off ? 0.38 : pressed ? 0.85 : 1 })}>
                <Text style={{ fontFamily: F.sansBold, fontSize: fs(14.5), lineHeight: fs(17.5),
                               color: on ? C.cream : C.ink }}>
                  {a === "other" ? t("giving.other", "Other") : `£${a}`}</Text>
                {a === "other" && <Text style={{ fontFamily: F.sans, fontSize: fs(10), letterSpacing: 0.7,
                                                 textTransform: "uppercase", lineHeight: fs(12.5),
                                                 color: on ? C.goldBright : C.muted }}>
                  {t("giving.you_choose", "You choose")}</Text>}
              </Pressable>);
          })}
        </View>
        {/* Two combinations have no link — a recurring gift of an amount the
            donor types. They grey out rather than vanishing, because a grid that
            changes shape as you switch frequency is a grid people think they
            misclicked. */}

        {/* .gv-cta is GOLD — a gold-bright to gold gradient with near-black
            text, 16px of radius, the amount in Fraunces at 20 over a 10.5px
            uppercase line. It drew as the app's ordinary plum pill, so the
            one button on the screen that takes money looked like every other
            button in the app. */}
        <GoldCTA label={label} href={href} disabled={!href}
             sub={href ? t("sheet.card_apple_pay_google_pay", "Card · Apple Pay · Google Pay")
                       : t("giving.choose_another_amount", "Choose another amount, or use the bank details below")} />
        </Card>

        <Heading tag={t("sheet.tap_to_copy", "Tap to copy")}>{t("sheet.or_transfer_directly", "Or transfer directly")}</Heading>
        <Bank items={BANK} />
        <CopyAll />
        <View style={{ marginTop: 13 }}>
          <Note>{t("giving.please_use_your_surname_as", "Please use your surname as the reference. If you are a UK taxpayer and want the masjid to claim Gift Aid on a transfer, ring the office — a declaration has to be held for it.")}</Note>
        </View>
        <Foot lines={["Bolton Central Islamic Society · Registered charity 1041569"]} />
      </View>
    </Screen>
  );
}

/* .gv-opt — a 14px-radius card, 11/7 of padding, at least 62px tall, with the
 * title 14.5px BOLD over a 10px uppercase sub tracked .07em. Chosen, it fills
 * brand-900 with cream and turns its sub GOLD-BRIGHT.
 *
 * Here the chosen one was a 7% plum tint with plum text and a grey sub, which
 * on a screen where the choice decides where the money goes is the difference
 * between "this is selected" and "this is slightly highlighted". */
function Options({ options, value, onChange }) {
  const { fs } = useApp();
  return (
    <View style={{ flexDirection: "row", gap: 8 }}>
      {options.map(o => {
        const on = o.v === value;
        return (
          <Pressable key={o.v} onPress={() => { tap(); onChange(o.v); }}
            style={({ pressed }) => ({ flex: 1, minHeight: 62, alignItems: "center", justifyContent: "center",
                                       gap: 2, paddingVertical: 11, paddingHorizontal: 7,
                                       borderRadius: 14, borderWidth: 1,
                                       borderColor: on ? C.brand900 : C.line,
                                       backgroundColor: on ? C.brand900 : C.card,
                                       opacity: pressed ? 0.85 : 1 })}>
            <Text style={{ fontFamily: F.sansBold, fontSize: fs(14.5), lineHeight: fs(17.5),
                           textAlign: "center", color: on ? C.cream : C.ink }}>{o.t}</Text>
            <Text style={{ fontFamily: F.sans, fontSize: fs(10), letterSpacing: 0.7, lineHeight: fs(12.5),
                           textTransform: "uppercase", textAlign: "center",
                           color: on ? C.goldBright : C.muted }}>{o.s}</Text>
          </Pressable>);
      })}
    </View>
  );
}
