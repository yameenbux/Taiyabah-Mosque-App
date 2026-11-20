/* Masjid membership — your own record, and only yours.
 * Copyright (c) 2026 Yameen Bux. All rights reserved. See LICENSE.md.
 *
 * WHAT THIS REPLACES, AND WHY. The first version of this screen asked for a
 * name, told you how many records matched, then took a house number and a
 * postcode and showed the record. The trouble is that a name and an address
 * are things a neighbour knows: anyone could sit at this screen and confirm
 * that a named person is a member of this masjid, and membership is special-
 * category data. "Anyone can look anyone up" is not a bug in that screen, it
 * is what that screen was. So it is gone.
 *
 * THE LOCK. A member now proves they can open the EMAIL the masjid holds
 * against their record. A six-digit code goes to that inbox; entering it back
 * is the proof. Nothing is shown until it is entered, and the code is the only
 * thing that opens the record — knowing the name and the address no longer
 * does. About six members in seven have an email on the register; the rest see
 * the office, exactly as they do today, with nothing lost.
 *
 * STILL NO ACCOUNT. There is no password and nothing to remember. The app
 * keeps a session token after the first code so the member is not asked again
 * for sixty days — asking 1,490 men to hold an account to pay once a year is
 * how the Excel sheet wins, and that has not changed.
 *
 * ONE EMAIL, ONE HOUSEHOLD. Fathers, sons and brothers share an inbox on this
 * register — it is normal, not rare. So a verified email can open more than one
 * record, and when it does the member chooses which is theirs. The only names
 * ever shown are the ones already sharing that person's own inbox.
 *
 * NEUTRAL BY DESIGN. "Send me a code" says the same thing whether or not the
 * email is on the register — see memberRequestCode in supabase.js. Saying "no
 * such member" would turn this back into a way to confirm somebody is a member.
 *
 * PAYING IS STILL OFF. MEMBER_PAY_ENDPOINT is blank, so the screen shows the
 * ways to pay at the masjid rather than a card button, the same as before.
 */
import React, { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, BackHandler, ActivityIndicator } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useApp } from "../store";
import { C, F, dual } from "../theme";
import { Screen, Hero, Heading, Card, P, Note, GoldCTA, Press,
         Call, KV, RowGroup, Callout } from "../ui";
import { Field, ErrorBox } from "../form";
import * as WebBrowser from "expo-web-browser";
import { memberRequestCode, memberVerifyCode, memberArea, membershipCheckout, MEMBER_PAY_ENDPOINT } from "../supabase";
import { money } from "../membership";

const OFFICE = "01204 535 997";
const TOKEN_KEY = "member.session.v1";

/* t() takes a key and the English and nothing else, so a sentence with a value
 * in it carries {braces} and the value is put in afterwards — the one order
 * that leaves the Urdu, Gujarati and Arabic packs able to hold the sentence. */
const fill = (text, vals) =>
  Object.keys(vals).reduce((a, k) => a.split(`{${k}}`).join(String(vals[k])), text);

/* The five places this screen can be. Held as state in one component, not five
 * routes, so the back arrow walks the sign-in rather than dumping somebody out
 * of it halfway. */
const STEP = { START: 0, EMAIL: 1, CODE: 2, PICK: 3, AREA: 4, RESUMING: 5 };

/* --- the screen --------------------------------------------------------- */

export default function Membership({ navigation }) {
  const { t, fs } = useApp();
  const [step, setStep] = useState(STEP.RESUMING);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [token, setToken] = useState(null);
  const [members, setMembers] = useState([]);     // the household on this email
  const [active, setActive] = useState(null);      // the record being shown
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [info, setInfo] = useState(null);          // the neutral "code is on its way"
  const mounted = useRef(true);

  useEffect(() => () => { mounted.current = false; }, []);

  /* Settle the household into a place to be: one record goes straight in, more
     than one asks which, none drops back to the start (a token with no records
     means the email was unlinked since). */
  const land = useCallback((list) => {
    setMembers(list);
    if (list.length === 1) { setActive(list[0]); setStep(STEP.AREA); }
    else if (list.length > 1) { setStep(STEP.PICK); }
    else { clearSession(); setStep(STEP.START); }
  }, []);

  /* RESUME. A member who signed in last week should open straight onto their
     record, not be asked for a code again. The token is re-checked server-side
     every time — a revoked or expired one quietly lands back at the start. */
  useEffect(() => {
    let live = true;
    (async () => {
      let saved = null;
      try { saved = await AsyncStorage.getItem(TOKEN_KEY); } catch {}
      if (!live) return;
      if (!saved) { setStep(STEP.START); return; }
      const r = await memberArea(saved);
      if (!live) return;
      if (r && r.ok) { setToken(saved); land(r.members || []); }
      else if (r && r.ok === false) { await clearSession(); setStep(STEP.START); }
      else { setStep(STEP.START); }   // couldn't reach — don't throw them out loudly
    })();
    return () => { live = false; };
  }, [land]);

  async function clearSession() {
    try { await AsyncStorage.removeItem(TOKEN_KEY); } catch {}
    setToken(null); setMembers([]); setActive(null);
  }

  /* Android's own back button walks the sign-in; it does not leave it from the
     middle. Once signed in, back on the record leaves the screen (the session
     stays), and with more than one record it steps back to the chooser. */
  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (step === STEP.EMAIL) { goStart(); return true; }
      if (step === STEP.CODE) { setErr(null); setInfo(null); setStep(STEP.EMAIL); return true; }
      if (step === STEP.AREA && members.length > 1) { setStep(STEP.PICK); return true; }
      return false;
    });
    return () => sub.remove();
  }, [step, members.length]);

  function goStart() {
    setErr(null); setInfo(null); setCode("");
    setStep(STEP.START);
  }

  /* --- send the code ---------------------------------------------------- */
  async function sendCode() {
    setErr(null); setInfo(null);
    const e = email.trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) {
      setErr(t("member.email_looks_wrong", "That does not look like an email address. Please check it."));
      return;
    }
    setBusy(true);
    const r = await memberRequestCode(e);
    if (!mounted.current) return;
    setBusy(false);
    if (r === null) {
      setErr(fill(t("member.cannot_reach", "The masjid could not be reached just now. Please try again in a moment, or ring the office on {office}."), { office: OFFICE }));
      return;
    }
    /* Neutral whatever the truth is: a code was sent only if this email is on
       the register, but the screen never says which. */
    setCode("");
    setInfo(fill(t("member.code_sent_neutral",
      "If {email} is on the register, a six-digit code is on its way. It lasts ten minutes."), { email: e }));
    setStep(STEP.CODE);
  }

  /* --- enter the code --------------------------------------------------- */
  async function verify() {
    setErr(null);
    const c = code.trim();
    if (!/^\d{6}$/.test(c)) {
      setErr(t("member.code_six_digits", "The code is six digits. Please type all six."));
      return;
    }
    setBusy(true);
    const r = await memberVerifyCode(email.trim(), c);
    if (!mounted.current) return;
    if (r === null) {
      setBusy(false);
      setErr(fill(t("member.cannot_reach", "The masjid could not be reached just now. Please try again in a moment, or ring the office on {office}."), { office: OFFICE }));
      return;
    }
    if (!r.ok) {
      setBusy(false);
      if (r.reason === "locked")
        setErr(t("member.code_locked", "Too many tries on that code. Please wait a few minutes, then send a new one."));
      else if (r.reason === "expired")
        setErr(t("member.code_expired", "That code has expired. Please send a new one."));
      else
        setErr(t("member.code_didnt_work", "That code did not work. Check it and try again, or send a new one."));
      return;
    }
    /* Signed in. Keep the token so they are not asked again, then open the
       record it unlocks. */
    try { await AsyncStorage.setItem(TOKEN_KEY, r.token); } catch {}
    setToken(r.token);
    const area = await memberArea(r.token);
    if (!mounted.current) return;
    setBusy(false);
    setCode("");
    if (area && area.ok) {
      if (!(area.members || []).length) {
        /* Verified, but nothing links to this email. The office can attach it. */
        setErr(fill(t("member.no_membership_for_email",
          "We could not find a membership against that email. The office can link it to your record — {office}, 5pm to 7pm."), { office: OFFICE }));
        return;
      }
      land(area.members);
    } else {
      setErr(fill(t("member.cannot_reach", "The masjid could not be reached just now. Please try again in a moment, or ring the office on {office}."), { office: OFFICE }));
    }
  }

  async function logOut() {
    await clearSession();
    setEmail(""); setCode(""); goStart();
  }

  /* ===================================================================== */

  if (step === STEP.RESUMING)
    return <View style={{ flex: 1, backgroundColor: C.paper, justifyContent: "center" }}>
             <ActivityIndicator color={C.brand600} /></View>;

  if (step === STEP.START)
    return <Start nav={navigation} onGo={() => { setErr(null); setInfo(null); setStep(STEP.EMAIL); }} />;

  if (step === STEP.AREA && active)
    return <Area rec={active} many={members.length > 1} token={token}
                 onPaid={async () => {
                   /* After a card payment, pull the record again so the screen
                      flips to the paid ticket without a sign-in. */
                   if (!token) return;
                   const a = await memberArea(token);
                   if (a && a.ok && (a.members || []).length) land(a.members);
                 }}
                 onSwitch={() => setStep(STEP.PICK)} onLogOut={logOut} />;

  /* EMAIL, CODE and PICK share one plum top with a back arrow. */
  const backLabel = step === STEP.EMAIL ? t("member.membership", "Membership")
                  : step === STEP.CODE ? t("member.your_email", "Your email")
                  : t("member.sign_in", "Sign in");
  function back() {
    setErr(null); setInfo(null);
    if (step === STEP.EMAIL) { goStart(); return; }
    if (step === STEP.CODE) { setStep(STEP.EMAIL); return; }
    if (step === STEP.PICK) { logOut(); return; }
  }

  return (
    <Screen pad={false}>
      <Hero align="left">
        <Press onPress={back} accessibilityRole="button"
               accessibilityLabel={t("member.back", "Back")}
               style={{ alignSelf: "flex-start", paddingVertical: 4, paddingRight: 10 }}>
          <Text style={{ fontFamily: F.sansSemi, fontSize: fs(13), color: "rgba(243,239,227,.7)" }}>
            {"‹ " + backLabel}
          </Text>
        </Press>
        <Text style={{ fontFamily: F.display, fontSize: fs(23), color: C.cream, marginTop: 10 }}>
          {step === STEP.EMAIL ? t("member.email_heading", "What is your email?")
           : step === STEP.CODE ? t("member.code_heading", "Enter your code")
           : t("member.which_member", "Which member are you?")}
        </Text>
      </Hero>

      <View style={{ paddingHorizontal: 16 }}>
        {step === STEP.EMAIL && (
          <>
            <P muted>{t("member.email_intro",
              "We will send a six-digit code to the email the masjid holds for you. Only someone who can open that inbox can see the record — which is what keeps it private.")}</P>
            <Field label={t("member.email_label", "Email")} type="email" value={email}
                   onChange={setEmail} placeholder="you@example.com" />
            {!!err && <ErrorBox>{err}</ErrorBox>}
            <GoldCTA label={busy ? t("member.sending", "Sending…") : t("member.send_code", "Send me a code")}
                     onPress={sendCode} disabled={busy} />
            <Note>{t("member.no_email_on_file",
              "No email on your record? The office can add one, or check your membership for you — ring 01204 535 997, 5pm to 7pm.")}</Note>
          </>
        )}

        {step === STEP.CODE && (
          <>
            {!!info && (
              <Callout tone="gold" h={t("member.check_your_email", "Check your email")}
                       ps={[{ t: info }]} />
            )}
            <Field label={t("member.code_label", "Six-digit code")} type="num" value={code}
                   onChange={v => setCode(v.replace(/\D/g, "").slice(0, 6))} placeholder="123456" />
            {!!err && <ErrorBox>{err}</ErrorBox>}
            <GoldCTA label={busy ? t("member.checking", "Checking…") : t("member.see_my_membership", "See my membership")}
                     onPress={verify} disabled={busy} />
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 12 }}>
              <Press onPress={sendCode} disabled={busy} accessibilityRole="button"
                     accessibilityLabel={t("member.resend", "Send a new code")}>
                <Text style={{ fontFamily: F.sansSemi, fontSize: fs(13.5), color: C.brand600 }}>
                  {t("member.resend", "Send a new code")}</Text>
              </Press>
              <Press onPress={() => { setErr(null); setInfo(null); setCode(""); setStep(STEP.EMAIL); }}
                     accessibilityRole="button"
                     accessibilityLabel={t("member.use_different_email", "Use a different email")}>
                <Text style={{ fontFamily: F.sansSemi, fontSize: fs(13.5), color: C.muted }}>
                  {t("member.use_different_email", "Use a different email")}</Text>
              </Press>
            </View>
          </>
        )}

        {step === STEP.PICK && (
          <>
            <P muted>{t("member.which_member_intro",
              "This email is on more than one membership. Choose yours — these are the records that share your inbox.")}</P>
            <Card gap={0}>
              {members.map((m, i) => (
                <Press key={m.id} onPress={() => { setActive(m); setStep(STEP.AREA); }}
                       accessibilityRole="button"
                       accessibilityLabel={m.name}
                       style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between",
                                paddingVertical: 13,
                                borderBottomWidth: i === members.length - 1 ? 0 : 1,
                                borderBottomColor: "rgba(228,222,207,.7)" }}>
                  <Text style={{ fontFamily: F.sansSemi, fontSize: fs(15.5), color: C.ink, flex: 1 }}>
                    {m.name}</Text>
                  <Text style={{ fontFamily: F.sansSemi, fontSize: fs(18), color: C.goldInk }}>{"›"}</Text>
                </Press>
              ))}
            </Card>
            <Press onPress={logOut} accessibilityRole="button"
                   accessibilityLabel={t("member.log_out", "Log out")}
                   style={{ alignSelf: "center", marginTop: 18, padding: 8 }}>
              <Text style={{ fontFamily: F.sansSemi, fontSize: fs(13.5), color: C.muted }}>
                {t("member.log_out", "Log out")}</Text>
            </Press>
          </>
        )}
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
        { t: t("member.masjid_membership", "Masjid Membership"), w: "title", px: 22, col: C.cream },
        { t: t("member.your_record_only", "Your own record, kept private — opened with your email."),
          w: "sub", px: 13, col: "rgba(243,239,227,.8)" },
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

        <GoldCTA label={t("member.access_my_membership", "Check my membership")} onPress={onGo}
                 sub={t("member.sign_in_with_email", "Sign in with the email the masjid holds")} />

        <Heading>{t("member.other_ways", "Other ways to pay")}</Heading>
        <RowGroup>
          <KV k={t("member.at_the_masjid", "At the masjid")}
              v={t("member.at_the_masjid_v", "Cash or card at the office during Ramadan.")} />
          <KV k={t("member.by_transfer", "By bank transfer")}
              v={t("member.by_transfer_v", "Ask the office for the details and quote your reference.")} />
        </RowGroup>

        <Call k={t("member.office_5_7", "Masjid office · 5pm–7pm")} v={OFFICE}
              href={`tel:${OFFICE.replace(/\s/g, "")}`} icon="call" />
        <View style={{ marginTop: 16 }}>
          <Note center>{t("member.charity_line",
            "Bolton Central Islamic Society · Registered charity 1041569")}</Note>
        </View>
      </View>
    </Screen>
  );
}

/* --- the member's own area --------------------------------------------- */

function Area({ rec, many, token, onPaid, onSwitch, onLogOut }) {
  const { t, fs } = useApp();
  const [paying, setPaying] = useState(false);
  const [payErr, setPayErr] = useState(null);
  /* THIS YEAR is the one thing a member comes to check. It is answered from the
     year's own line, not the lifetime total — a member who paid and a member who
     was never charged both have nothing "outstanding", and only the year's line
     tells them apart. */
  const ty = rec.this_year || {};
  const year = ty.year || new Date().getFullYear();
  const paidThisYear = !!ty.settled;
  const chargedThisYear = !!ty.charged;
  const owedThisYear = Math.max(0, Number(ty.outstanding_p) || 0);
  const totalPaid = Number(rec.paid_p);
  const totalInvoiced = Number(rec.invoiced_p);
  /* In-app card payment is shown only once the Worker route is live
     (MEMBER_PAY_ENDPOINT non-blank). Until then the office is the way to pay. */
  const canPayInApp = !!MEMBER_PAY_ENDPOINT && !paidThisYear;

  async function payNow() {
    setPayErr(null);
    setPaying(true);
    try {
      /* The amount is built by the Worker from the register — the app never
         names a figure. We send only the session token and which member. */
      const r = await membershipCheckout(token, rec.id, "current");
      if (!r || !r.ok || !r.url) {
        setPaying(false);
        setPayErr(r && r.message ? r.message
          : t("member.pay_failed", "Could not start the payment just now. Please try again, or pay at the office."));
        return;
      }
      await WebBrowser.openBrowserAsync(r.url);
      setPaying(false);
      /* We cannot tell from here whether they completed it. Refresh either way:
         if they paid, the webhook has recorded it and this flips to the ticket;
         if they did not, nothing changes. */
      if (onPaid) onPaid();
    } catch (e) {
      setPaying(false);
      setPayErr(t("member.pay_failed", "Could not start the payment just now. Please try again, or pay at the office."));
    }
  }

  return (
    <Screen pad={false}>
      <Hero lines={[
        { t: t("member.your_membership", "Your membership"), w: "title", px: 23, col: C.cream },
        { t: fill(t("member.signed_in_as", "Signed in as {name}"), { name: rec.name }),
          w: "sub", px: 13, col: "rgba(243,239,227,.8)" },
      ]} />
      <View style={{ paddingHorizontal: 16 }}>

        {paidThisYear ? (
          /* THE TICKET. Whoever has paid this year is greeted with this and
             nothing to do — the answer they came for, said plainly. */
          <View style={{ backgroundColor: C.tintGreen, borderWidth: 1,
                         borderColor: dual("#CFE3D4", "#2B5B3E"), borderRadius: 18,
                         paddingVertical: 28, paddingHorizontal: 20, marginTop: 14,
                         alignItems: "center" }}>
            <View style={{ width: 56, height: 56, borderRadius: 28,
                           backgroundColor: dual("#2F5E36", "#8FD6A6"),
                           alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
              <Text style={{ fontFamily: F.sansSemi, fontSize: fs(30), lineHeight: fs(34),
                             color: dual("#EAF5EC", "#0E2A17") }}>✓</Text>
            </View>
            <Text style={{ fontFamily: F.display, fontSize: fs(21), textAlign: "center",
                           color: dual("#2F5E36", "#8FD6A6") }}>
              {fill(t("member.paid_this_year", "Your membership is paid for {year}"), { year })}</Text>
            <P muted center>{t("member.paid_this_year_sub",
              "Jazāk Allāhu khayran — there is nothing to pay for this year.")}</P>
          </View>
        ) : (
          /* NOT PAID THIS YEAR — charged and owing, or not yet on this year's
             record at all. Either way, the way to pay follows below. */
          <Card>
            <Text style={{ fontFamily: F.sansSemi, fontSize: fs(10), letterSpacing: 1.6,
                           textTransform: "uppercase", color: C.goldInk }}>
              {fill(t("member.your_year_membership", "Your {year} membership"), { year })}
            </Text>
            {chargedThisYear ? (
              /* Not red. The masjid asks and cannot compel; a balance in the
                 colour the app keeps for danger reads as a demand. */
              <View style={{ flexDirection: "row", alignItems: "baseline", gap: 9, marginTop: 2 }}>
                <Text style={{ fontFamily: F.display, fontSize: fs(38), color: C.ink,
                               fontVariant: ["tabular-nums"] }}>{money(owedThisYear)}</Text>
                <Text style={{ fontFamily: F.sans, fontSize: fs(13), color: C.muted }}>
                  {fill(t("member.to_pay_for_year", "to pay for {year}"), { year })}</Text>
              </View>
            ) : (
              <P muted>{fill(t("member.not_on_record_year",
                "We don’t have your {year} membership on record yet."), { year })}</P>
            )}
          </Card>
        )}

        <Card>
          {!!rec.status && (
            <KV k={t("member.status", "Status")} v={String(rec.status)} />
          )}
          {Number.isFinite(totalPaid) && (
            <KV k={t("member.total_paid", "Total paid")} v={money(totalPaid || 0)} />
          )}
          {Number.isFinite(totalInvoiced) && (
            <KV k={t("member.total_invoiced", "Total invoiced")} v={money(totalInvoiced || 0)} />
          )}
        </Card>

        {!paidThisYear && (canPayInApp ? (
          <View style={{ marginTop: 12 }}>
            <Press onPress={paying ? undefined : payNow} accessibilityRole="button"
                   accessibilityState={{ disabled: paying }}
                   accessibilityLabel={t("member.pay_now", "Pay membership by card")}
                   style={{ backgroundColor: C.gold, borderRadius: 13, paddingVertical: 15,
                            alignItems: "center", opacity: paying ? 0.6 : 1 }}>
              <Text style={{ fontFamily: F.sansSemi, fontSize: fs(15.5), color: C.brand900 }}>
                {paying ? t("member.pay_opening", "Opening…")
                  : (chargedThisYear
                      ? fill(t("member.pay_amount", "Pay {amount} by card"), { amount: money(owedThisYear) })
                      : fill(t("member.pay_year", "Pay for {year} by card"), { year }))}
              </Text>
            </Press>
            {!!payErr && (
              <Text style={{ fontFamily: F.sans, fontSize: fs(13), color: C.danger, marginTop: 8, textAlign: "center" }}>
                {payErr}</Text>
            )}
            <Note center>{fill(t("member.or_office", "Or pay at the office — {office}, 5pm to 7pm."), { office: OFFICE })}</Note>
          </View>
        ) : (
          <Callout tone="plum"
            h={t("member.to_pay_see_office", "How to pay")}
            ps={[{ t: fill(t("member.to_pay_see_office_p",
              "To pay your {year} membership, speak to the office — {office}, 5pm to 7pm. Once it is recorded, this screen will show your membership as paid."),
              { year, office: OFFICE }) }]} />
        ))}

        <Call k={t("member.office_5_7", "Masjid office · 5pm–7pm")} v={OFFICE}
              href={`tel:${OFFICE.replace(/\s/g, "")}`} icon="call" />

        <View style={{ flexDirection: "row", justifyContent: "center", gap: 22, marginTop: 20 }}>
          {many && (
            <Press onPress={onSwitch} accessibilityRole="button"
                   accessibilityLabel={t("member.switch_member", "Switch member")}>
              <Text style={{ fontFamily: F.sansSemi, fontSize: fs(13.5), color: C.brand600 }}>
                {t("member.switch_member", "Switch member")}</Text>
            </Press>
          )}
          <Press onPress={onLogOut} accessibilityRole="button"
                 accessibilityLabel={t("member.log_out", "Log out")}>
            <Text style={{ fontFamily: F.sansSemi, fontSize: fs(13.5), color: C.muted }}>
              {t("member.log_out", "Log out")}</Text>
          </Press>
        </View>

        <View style={{ marginTop: 18 }}>
          <Note center>{t("member.charity_line",
            "Bolton Central Islamic Society · Registered charity 1041569")}</Note>
        </View>
      </View>
    </Screen>
  );
}
