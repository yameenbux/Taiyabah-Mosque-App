/* Masjid membership — check it, and pay it.
 * Copyright (c) 2026 Yameen Bux. All rights reserved. See LICENSE.md.
 *
 * WHAT THIS REPLACES. A sheet lifted out of the website that said "ring the
 * office between 5pm and 7pm and they will tell you whether this year's fee
 * has been received". That is still true and still on this screen, because
 * the office is the fallback for everything here — but it was the only thing
 * the app could do, and the masjid's register was an Excel sheet nothing
 * could ask.
 *
 * THE COUNTER, ONLINE. What happens at the masjid is: you say you want to pay
 * your fee, somebody searches your name, and you tap a card. There is no
 * membership number in that exchange and there is not one here — older
 * members will not have one and the ones who do will not remember it. So it
 * is a name, then the house number and postcode, then the balance.
 *
 * STEP ONE RETURNS A COUNT, NOT A PERSON. "We have found 2 records with that
 * name" — never whose. And step two either matches or does not, with the SAME
 * sentence whichever field was wrong: saying which part failed would turn
 * this screen into a way of confirming that a named person is a member of
 * this masjid, and religious affiliation is special category data. The nikāḥ
 * form on the website already refuses to ask about it for the same reason.
 *
 * THE MASJID ASKS AND CANNOT COMPEL. It is a charity. There are two buttons
 * and no third: pay everything, or pay this year. Nothing on the screen is
 * red, "unpaid" is "not yet paid", and the note under the buttons says in
 * plain words that a year can be set aside. The waiver behind that sentence
 * is real — membership_waive_year() — which is the only thing that stops it
 * being decoration.
 *
 * THE APP NEVER NAMES AN AMOUNT. It sends "all" or "current" and the server
 * prices it. See MEMBER_PAY_ENDPOINT in supabase.js for why.
 */
import React, { useCallback, useEffect, useState } from "react";
import { View, Text, BackHandler } from "react-native";
import { useApp } from "../store";
import { C, F, R, SHADOW, dual } from "../theme";
import { Screen, Hero, Heading, Card, P, Note, Sub, Girih, GoldCTA, CTA, Press,
         Call, KV, RowGroup, Callout, open } from "../ui";
import { Field, ErrorBox } from "../form";
import { membershipNameMatches, membershipClaim, membershipState,
         membershipCheckout, MEMBER_PAY_ENDPOINT } from "../supabase";
import { money, years as sortedYears, outstanding, yearsOwing, scope,
         feeNote, label } from "../membership";

const OFFICE = "01204 535 997";

/* TRANSLATE FIRST, THEN FILL IN THE NUMBERS. t() takes a key and the English
 * to fall back on and nothing else — it has no idea about parameters — so a
 * key whose English holds a figure can only ever be shown in English. Every
 * string on this screen that carries an amount, a year or a count therefore
 * goes through t() with {braces} in it and has the values put in afterwards,
 * which is the one order that leaves the Urdu, Gujarati and Arabic packs able
 * to carry the sentence. Written out here because no other screen in the app
 * had needed it: nothing else shows somebody a figure inside a sentence. */
const fill = (text, vals) =>
  Object.keys(vals).reduce((a, k) => a.split(`{${k}}`).join(String(vals[k])), text);

/* The three steps of the lookup, then the balance, then the receipt. Held as
 * state in one screen rather than five routes: the back arrow has to walk
 * BACK THROUGH THE LOOKUP rather than dump somebody out of it halfway, and
 * five routes would each have had to know what the one before it held. */
const STEP = { START: 0, NAME: 1, WHERE: 2, BALANCE: 3, DONE: 4 };

/* --- the little pieces -------------------------------------------------- */

/* Note() carries no margin of its own — on every other screen it follows a
 * paragraph, which has one. After a Card it lands against the card's bottom
 * edge, and the reference line did exactly that under the history. */
function Spaced({ children, top = 12 }) {
  return <View style={{ marginTop: top }}>{children}</View>;
}

function Pips({ at }) {
  const on = n => n <= at;
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 7, marginTop: 13 }}>
      {[1, 2, 3].map(n => (
        <View key={n} style={{ width: 26, height: 3, borderRadius: 2,
          backgroundColor: on(n) ? C.goldBright : "rgba(243,239,227,.22)" }} />
      ))}
      <Text style={{ marginLeft: 6, fontFamily: F.sansSemi, fontSize: 10, letterSpacing: 1.8,
                     textTransform: "uppercase", color: "rgba(243,239,227,.6)" }}>
        Step {at} of 3
      </Text>
    </View>
  );
}

/* One year on the record. The right-hand mark is whatever membership.label()
 * decided, so the words and the colours are chosen in one place and tested
 * there. Nothing in here is red: see the header. */
function YearRow({ y, last }) {
  const { fs } = useApp();
  const l = label(y);
  const colour = l.kind === "paid" ? C.muted
               : l.kind === "waived" ? C.goldInk
               : l.kind === "part" ? C.ink
               : C.muted;
  const settled = l.kind === "paid" || l.kind === "waived";
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between",
                   paddingVertical: 9,
                   borderBottomWidth: last ? 0 : 1, borderBottomColor: "rgba(228,222,207,.7)" }}>
      <Text style={{ fontFamily: settled ? F.sans : F.sansSemi, fontSize: fs(14),
                     fontVariant: ["tabular-nums"], color: settled ? C.muted : C.ink }}>
        {y.year}
      </Text>
      <View style={{ flexDirection: "row", alignItems: "baseline", gap: 11 }}>
        <Text style={{ fontFamily: settled ? F.sans : F.sansSemi, fontSize: fs(14),
                       fontVariant: ["tabular-nums"], color: settled ? C.muted : C.ink }}>
          {money(y.net_p)}
        </Text>
        <Text numberOfLines={1}
              style={{ fontFamily: F.sansSemi, fontSize: fs(12), color: colour,
                       minWidth: 86, textAlign: "right" }}>
          {l.text}
        </Text>
      </View>
    </View>
  );
}

/* --- the screen --------------------------------------------------------- */

export default function Membership({ navigation }) {
  const { t, fs } = useApp();
  const [step, setStep] = useState(STEP.START);
  const [name, setName] = useState("");
  const [house, setHouse] = useState("");
  const [post, setPost] = useState("");
  const [matches, setMatches] = useState(null);   // null = not asked yet
  /* The name the count belongs to. Without it, somebody who looks up one name,
     sees "2 records", then edits the box could walk forward on a count that
     was never about what is now typed. */
  const [counted, setCounted] = useState("");
  const [rec, setRec] = useState(null);           // the matched record
  const [token, setToken] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [paid, setPaid] = useState(null);         // what was settled, for the receipt

  /* ANDROID'S OWN BACK BUTTON WALKS THE LOOKUP, it does not leave it. Without
     this, somebody three steps in who presses back is thrown out to the menu
     and has to type their name again — and on Android that is the button
     people actually use. */
  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (step === STEP.START || step === STEP.DONE) return false;
      back();
      return true;
    });
    return () => sub.remove();
  }, [step]);

  function back() {
    setErr(null);
    if (step === STEP.BALANCE) { setStep(STEP.WHERE); return; }
    if (step === STEP.WHERE) { setStep(STEP.NAME); return; }
    if (step === STEP.NAME) { setStep(STEP.START); setMatches(null); return; }
  }

  function restart() {
    setStep(STEP.START); setName(""); setHouse(""); setPost("");
    setMatches(null); setRec(null); setToken(null); setPaid(null); setErr(null);
  }

  /* --- step 1: the name -------------------------------------------------
   *
   * TWO TAPS, NOT ONE, AND THE COUNT IS THE POINT OF THE FIRST. The first
   * version looked the name up and went straight on whenever anything
   * matched, so the count was computed and never shown. Telling somebody
   * "we have found 1 record with that name" before asking for their address
   * is the whole reassurance of this step: they learn they are on the
   * register without being shown anybody's details, and if the masjid holds
   * their name differently they find out HERE rather than after typing a
   * postcode and being told only that it did not match. */
  async function askName() {
    setErr(null);
    if (matches > 0 && name.trim() === counted) { setStep(STEP.WHERE); return; }
    if (name.trim().length < 3) {
      setErr(t("member.name_too_short", "Please type the name as the masjid holds it — at least three letters."));
      return;
    }
    setBusy(true);
    const n = await membershipNameMatches(name.trim());
    setBusy(false);
    if (n === null) {
      setErr(fill(t("member.cannot_reach", "The masjid could not be reached just now. Please try again in a moment, or ring the office on {office}."), { office: OFFICE }));
      return;
    }
    /* A name nobody holds goes no further, and the panel below says so
       without saying whether it is the spelling or the register that is at
       fault. */
    setMatches(Number(n));
    setCounted(name.trim());
  }

  /* --- step 2: where they live ------------------------------------------ */
  async function askWhere() {
    setErr(null);
    if (!house.trim() || !post.trim()) {
      setErr(t("member.need_both", "Both boxes, please — the house number and the postcode."));
      return;
    }
    setBusy(true);
    const r = await membershipClaim(name.trim(), house.trim(), post.trim());
    setBusy(false);
    if (r === null) {
      setErr(fill(t("member.cannot_reach", "The masjid could not be reached just now. Please try again in a moment, or ring the office on {office}."), { office: OFFICE }));
      return;
    }
    /* THE BRAKE IS NOT A MISMATCH. membership_claim() refuses once failed
       attempts across the whole masjid pass a ceiling, and it says so with
       its own flag precisely so that a real member who meets it is told to
       come back shortly rather than told their details are wrong. Treating
       this as a mismatch would send somebody to the office over nothing. */
    if (r.busy) {
      setErr(t("member.too_busy",
        "Too many lookups are being tried just now. Please wait a few minutes and try again — nothing is wrong with your details."));
      return;
    }
    if (!r.matched) {
      /* ONE SENTENCE FOR EVERY WAY THIS FAILS. Not a word about which box was
         wrong — see the header. */
      setErr(fill(t("member.no_match", "We cannot match that. Please speak to the office and they will sort it out — {office}, 5pm to 7pm."), { office: OFFICE }));
      return;
    }
    setRec(r); setToken(r.token); setStep(STEP.BALANCE);
  }

  /* --- paying ----------------------------------------------------------- */
  async function pay(which) {
    setErr(null);
    const want = scope(rec, which);
    if (!want) return;
    setBusy(true);
    const r = await membershipCheckout(token, which);
    setBusy(false);

    if (r.unavailable) {
      setErr(t("member.card_not_on", "Paying by card is not switched on yet. The ways to pay at the masjid are below, and the office can take it over the counter."));
      return;
    }
    if (!r.ok) {
      setErr(r.message || fill(t("member.checkout_failed", "That did not open. Please try again, or pay at the office — {office}."), { office: OFFICE }));
      return;
    }

    /* Stripe opens in Safari proper, not the in-app browser: App Review's rule
       for charitable payment, and the person paying can see the address bar,
       which is the whole reason to trust the page. open() already knows. */
    await open(r.url);

    /* They are back. Whether they paid is not ours to assume, so the record is
       read again and the receipt is shown only if the balance actually moved.
       A "thank you" screen shown to somebody who abandoned the checkout is a
       lie the masjid then has to unpick. */
    setBusy(true);
    const after = await membershipState(token);
    setBusy(false);
    if (after && after.matched && outstanding(after) < outstanding(rec)) {
      setPaid({ was: outstanding(rec), now: outstanding(after), years: want.years });
      setRec({ ...rec, ...after });
      setStep(STEP.DONE);
    } else if (after && after.matched) {
      setRec({ ...rec, ...after });   // nothing changed; stay where we are
    }
  }

  /* ===================================================================== */

  if (step === STEP.START) return <Start nav={navigation} onGo={() => setStep(STEP.NAME)} />;

  if (step === STEP.DONE)
    return <Done rec={rec} paid={paid} onDone={restart} />;

  /* --- the lookup and the balance share one plum top -------------------- */
  const at = step === STEP.NAME ? 1 : step === STEP.WHERE ? 2 : 3;

  return (
    <Screen pad={false}>
      <Hero align="left">
        <Press onPress={back} style={{ alignSelf: "flex-start", paddingVertical: 4, paddingRight: 10 }}>
          <Text style={{ fontFamily: F.sansSemi, fontSize: fs(13), color: "rgba(243,239,227,.7)" }}>
            {step === STEP.NAME ? "‹ Membership"
             : step === STEP.WHERE ? "‹ Your name" : "‹ Where you live"}
          </Text>
        </Press>
        <Pips at={at} />
      </Hero>

      <View style={{ paddingHorizontal: 16 }}>
        {step === STEP.NAME && (
          <>
            <Heading>{t("member.whats_your_name", "What is your name?")}</Heading>
            <P muted>{t("member.name_as_held",
              "As the masjid holds it. We will tell you how many records match — never whose.")}</P>
            <Field label={t("member.full_name", "Full name")} value={name}
                   onChange={v => { setName(v); if (matches !== null) setMatches(null); }}
                   placeholder="e.g. Ibrahim Patel" />
            {matches === 0 && (
              <Callout tone="danger" h={t("member.not_on_register", "Nothing matches that name")}
                       ps={[{ t: fill(t("member.not_on_register_p",
                         "The register may hold it differently, or the fee may be under another name in the household. The office can look it up — {office}, 5pm to 7pm."), { office: OFFICE }) }]} />
            )}
            {matches > 0 && (
              <Note>{matches === 1
                ? t("member.found_one", "We have found 1 record with that name.")
                : fill(t("member.found_many", "We have found {n} records with that name."), { n: matches })}</Note>
            )}
            {!!err && <ErrorBox>{err}</ErrorBox>}
            <GoldCTA
              label={busy ? t("member.checking", "Checking…")
                : matches > 0 && name.trim() === counted ? t("member.continue", "Continue")
                : t("member.look_up_my_name", "Look up my name")}
              onPress={askName} disabled={busy} />
            <Note>{t("member.never_shows",
              "We never show a name or an address on this screen — only how many records match.")}</Note>
          </>
        )}

        {step === STEP.WHERE && (
          <>
            <Heading>{t("member.where_do_you_live", "Where do you live?")}</Heading>
            <P muted>{t("member.just_number_postcode",
              "Just the number and the postcode — the same two things you would say at the counter.")}</P>
            <View style={{ flexDirection: "row", gap: 12 }}>
              <View style={{ width: 118 }}>
                <Field label={t("member.number", "Number")} value={house} onChange={setHouse}
                       placeholder="31a" />
              </View>
              <View style={{ flex: 1 }}>
                <Field label={t("member.postcode", "Postcode")} value={post} onChange={setPost}
                       placeholder="BL1 8HD" />
              </View>
            </View>
            {!!err && <ErrorBox>{err}</ErrorBox>}
            <GoldCTA label={busy ? t("member.looking", "Looking…") : t("member.find_my_membership", "Find my membership")}
                     onPress={askWhere} disabled={busy} />
            <Note>{t("member.same_answer",
              "If we cannot match it, the answer never says which part was wrong. Saying so would let somebody guess their way through a name they do not own.")}</Note>
          </>
        )}

        {step === STEP.BALANCE && <Balance rec={rec} busy={busy} err={err} onPay={pay} />}
      </View>
    </Screen>
  );
}

/* --- the entry screen --------------------------------------------------- */

function Start({ nav, onGo }) {
  const { t, fs } = useApp();
  return (
    <Screen pad={false}>
      <Hero lines={[
        { t: "Masjid Membership", w: "title", px: 22, col: C.cream },
        { t: "Check whether this year’s fee is paid, and pay it here.", w: "sub", px: 13,
          col: "rgba(243,239,227,.8)" },
      ]} />
      <View style={{ paddingHorizontal: 16 }}>
        <Card>
          <Text style={{ fontFamily: F.sansSemi, fontSize: fs(10), letterSpacing: 1.6,
                         textTransform: "uppercase", color: C.goldInk }}>
            {t("member.the_fee", "The fee")}
          </Text>
          <View style={{ flexDirection: "row", alignItems: "baseline", gap: 9 }}>
            <Text style={{ fontFamily: F.display, fontSize: fs(34), color: C.ink,
                           fontVariant: ["tabular-nums"] }}>£100</Text>
            <Text style={{ fontFamily: F.sans, fontSize: fs(14), color: C.muted }}>
              {t("member.per_person_year", "per person, per year")}
            </Text>
          </View>
          <P muted>{t("member.collected_in_ramadan",
            "Collected in Ramadan, as it always has been. The year is named by the calendar year it covers.")}</P>
        </Card>

        <GoldCTA label={t("member.check_my_membership", "Check my membership")} onPress={onGo}
                 sub={t("member.takes_two_steps", "Your name, then your address")} />

        <Heading>{t("member.other_ways", "Other ways to pay")}</Heading>
        <RowGroup>
          <KV k={t("member.at_the_masjid", "At the masjid")}
              v={t("member.at_the_masjid_v", "Cash or card at the office during Ramadan.")} />
          <KV k={t("member.by_transfer", "By bank transfer")}
              v={t("member.by_transfer_v", "Ask the office for the details and quote your reference.")} />
        </RowGroup>

        <Call k={t("member.office_5_7", "Masjid office · 5pm–7pm")} v={OFFICE}
              href={`tel:${OFFICE.replace(/\s/g, "")}`} icon="call" />
        <Spaced top={16}><Note center>{t("member.charity_line",
          "Bolton Central Islamic Society · Registered charity 1041569")}</Note></Spaced>
      </View>
    </Screen>
  );
}

/* --- what is due ------------------------------------------------------- */

function Balance({ rec, busy, err, onPay }) {
  const { t, fs } = useApp();
  const list = sortedYears(rec);
  const owed = outstanding(rec);
  const owing = yearsOwing(rec);
  const all = scope(rec, "all");
  const one = scope(rec, "current");
  const note = feeNote(rec);

  if (owed === 0)
    return (
      <>
        <Heading>{t("member.youre_paid_up", "You are paid up")}</Heading>
        <Card>
          <Text style={{ fontFamily: F.sansSemi, fontSize: fs(10), letterSpacing: 1.6,
                         textTransform: "uppercase", color: C.goldInk }}>
            {t("member.your_record", "Your record")}
          </Text>
          {list.map((y, i) => <YearRow key={y.year} y={y} last={i === list.length - 1} />)}
        </Card>
        <Spaced><Note>{fill(t("member.reference_is", "Your reference is {ref}."), { ref: rec.reference })}</Note></Spaced>
        <Callout tone="gold" h={fill(t("member.next_year_h", "Next is {year}."), { year: Number(rec.current_year) + 1 })}
                 ps={[{ t: t("member.next_year_p",
                   "The masjid will write to you when Ramadan begins.") }]} />
      </>
    );

  return (
    <>
      <Heading>{t("member.your_membership", "Your membership")}</Heading>

      <Card>
        <View style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" }}>
          <Text style={{ fontFamily: F.sansSemi, fontSize: fs(10), letterSpacing: 1.6,
                         textTransform: "uppercase", color: C.goldInk }}>
            {t("member.years_not_yet_paid", "Years not yet paid")}
          </Text>
          <View style={{ backgroundColor: "rgba(198,162,76,.13)", borderWidth: 1,
                         borderColor: "rgba(198,162,76,.45)", borderRadius: 999,
                         paddingHorizontal: 10, paddingVertical: 3 }}>
            <Text style={{ fontFamily: F.sansSemi, fontSize: fs(11.5), color: C.goldInk }}>
              {owing.length === 1 ? t("member.one_year", "1 year")
                                  : fill(t("member.n_years", "{n} years"), { n: owing.length })}
            </Text>
          </View>
        </View>

        {/* THE FIGURE IS NOT RED. The masjid asks and cannot compel; a balance
            in the colour this app reserves for danger reads as a demand. */}
        <View style={{ flexDirection: "row", alignItems: "baseline", gap: 9, marginTop: 2 }}>
          <Text style={{ fontFamily: F.display, fontSize: fs(38), color: C.ink,
                         fontVariant: ["tabular-nums"] }}>{money(owed)}</Text>
          <Text style={{ fontFamily: F.sans, fontSize: fs(14), color: C.muted }}>
            {t("member.in_total", "in total")}
          </Text>
        </View>

        <View style={{ borderTopWidth: 1, borderTopColor: C.line, marginTop: 10, paddingTop: 2 }}>
          {list.map((y, i) => <YearRow key={y.year} y={y} last={i === list.length - 1} />)}
        </View>

        {!!note && (
          <Note>{fill(t("member.fee_changed",
            "The fee was {before} until {from}. Each year is charged at the rate that applied then."),
            { before: money(note.before), from: note.from })}</Note>
        )}
      </Card>

      {!!err && <ErrorBox>{err}</ErrorBox>}

      {/* TWO BUTTONS AND NO THIRD. Somebody who can only manage this year
          should not have to fill in a form to say so. */}
      {!!all && (
        <GoldCTA
          label={busy ? t("member.opening", "Opening…")
            : all.years.length === 1
              ? fill(t("member.pay_one", "Pay {amount} — {year}"),
                     { amount: money(all.amount_p), year: all.years[0] })
              : fill(t("member.pay_all", "Pay {amount} — all {n} years"),
                     { amount: money(all.amount_p), n: all.years.length })}
          onPress={() => onPay("all")} disabled={busy} />
      )}
      {!!one && !!all && all.amount_p !== one.amount_p && (
        <CTA compact
             label={fill(t("member.pay_current", "Pay {amount} — {year} only"),
                      { amount: money(one.amount_p), year: one.years[0] })}
             onPress={() => onPay("current")} disabled={busy} />
      )}

      <Spaced top={10}><Note center>{
        fill(t("member.reference_is_ref", "Reference {ref}"), { ref: rec.reference })
        + (MEMBER_PAY_ENDPOINT
             ? t("member.card_methods", " · card, Apple Pay or Google Pay") : "")
      }</Note></Spaced>

      {/* THE SENTENCE THAT MAKES THIS A CHARITY'S SCREEN. The waiver behind
          it is real, which is the only reason it is not decoration. */}
      <Callout tone="plum"
        h={t("member.asks_not_demands", "The masjid asks for these years; it does not demand them.")}
        ps={[{ t: fill(t("member.asks_not_demands_p",
          "Pay this year alone if that is what you can do — or speak to the office, and a year can be set aside or corrected. {office}, 5pm to 7pm."), { office: OFFICE }) }]} />
    </>
  );
}

/* --- after paying ------------------------------------------------------- */

function Done({ rec, paid, onDone }) {
  const { t, fs } = useApp();
  const list = sortedYears(rec);
  const settled = (paid?.was || 0) - (paid?.now || 0);

  return (
    <Screen pad={false}>
      <Hero lines={[
        { t: "Jazāk Allāhu khayran", w: "title", px: 24, col: C.cream },
        { t: fill(t("member.received_thanks", "{amount} received. Thank you."),
                  { amount: money(settled) }), w: "sub", px: 13.5,
          col: "rgba(243,239,227,.8)" },
      ]} />
      <View style={{ paddingHorizontal: 16 }}>

        {/* THE RECEIPT IS SENT, NOT OFFERED. Stripe emails it to the address
            it collected at the checkout — which is also how the register
            finally acquires an address for next Ramadan's reminder. A receipt
            somebody has to ask for is a receipt half of them will not have
            when they need it. */}
        {/* THE ONE GREEN ON THIS SCREEN, and it has to work at night too.
            The strip's fill is a theme token and turns itself over; the ink
            and the hairline were literals, so in dark mode this was a dark
            green on a dark green — 2.46:1, which check-contrast.mjs caught
            before anybody had to read it on a phone at night. */}
        <View style={{ backgroundColor: C.tintGreen, borderWidth: 1,
                       borderColor: dual("#CFE3D4", "#2B5B3E"),
                       borderRadius: 15, padding: 15, marginTop: 12 }}>
          <Text style={{ fontFamily: F.sansSemi, fontSize: fs(14.5),
                         color: dual("#2F5E36", "#8FD6A6") }}>
            {t("member.receipt_sent", "A receipt has been emailed to you")}
          </Text>
          <P muted>{t("member.receipt_sent_p",
            "It goes to the address you gave at the checkout. Keep it — it is the masjid's record as well as yours.")}</P>
        </View>

        <Heading>{t("member.your_history", "Your membership history")}</Heading>
        <Card>
          {list.map((y, i) => <YearRow key={y.year} y={y} last={i === list.length - 1} />)}
        </Card>

        <Spaced><Note>{fill(t("member.reference_is", "Your reference is {ref}."), { ref: rec.reference })}</Note></Spaced>

        <Callout tone="gold"
          h={fill(t("member.next_year_h", "Next is {year}."), { year: Number(rec.current_year) + 1 })}
          ps={[{ t: t("member.next_year_p", "The masjid will write to you when Ramadan begins.") }]} />

        <CTA label={t("member.done", "Done")} onPress={onDone} />
        <Spaced top={16}><Note center>{t("member.charity_line",
          "Bolton Central Islamic Society · Registered charity 1041569")}</Note></Spaced>
      </View>
    </Screen>
  );
}
