/* Taiyabah Centre — hall and room hire.
 *
 * This one is a real booking, not an enquiry: request_hall_booking() takes the
 * lock, holds the date for thirty minutes while the deposit is paid, and refuses
 * the second person while the first is at the card page. Dates already held show
 * as struck through, read from hall_availability.
 */
import React, { useEffect, useMemo, useState } from "react";
import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { C, F, R } from "../theme";
import { useApp } from "../store";
import { Screen, Hero, Heading, Card, P, Note, Notice, CTA, Foot, Pill, RowGroup, NavRow, open, Press, tap } from "../ui";
import { Field, Choice, Calendar, Check, ErrorBox, Submit, Sent, isPhone } from "../form";
import { rpc, readView } from "../supabase";
import { SHEETS, Blocks } from "../Blocks";

const DEPOSIT_LINK = "https://book.stripe.com/3cIdR9cHOfyo5Jk7xcf3a06";
const HORIZON_DAYS = 365;      // bookings up to 12 months ahead

export default function HallHire({ navigation }) {
  const { t, fs } = useApp();
  const [hire, setHire] = useState(null);
  const [month, setMonth] = useState(null);
  const [date, setDate] = useState(null);
  /* null until the office's bookings have actually arrived — NOT an empty
     list. The website's bkDayFree() returns null while BK.taken is null and
     every day draws "unknown", grey and unringed; only once the rows land
     does a day go green. Starting at [] here meant the whole month came up
     green the moment the screen opened, and a date could be chosen on the
     strength of it a second before the real answer arrived. */
  const [taken, setTaken] = useState(null);
  const [who, setWho] = useState({ first: "", last: "", addr: "", phone: "" });
  const [state, setState] = useState({});
  const [touched, setTouched] = useState(false);
  const [agree, setAgree] = useState(false);

  const first = useMemo(() => { const d = new Date(); d.setHours(0,0,0,0); d.setDate(d.getDate() + 1); return d; }, []);
  const last  = useMemo(() => { const d = new Date(); d.setHours(0,0,0,0); d.setDate(d.getDate() + HORIZON_DAYS); return d; }, []);
  useEffect(() => { setMonth(new Date(first.getFullYear(), first.getMonth(), 1)); }, [first]);

  const loadTaken = () => readView("hall_availability", { select: "booking_date" })
    .then(rows => setTaken(rows.map(r => r.booking_date)))
    .catch(() => {});          // a list we cannot read is not a reason to block the form
  useEffect(() => { loadTaken(); }, []);

  /* One hall is Monday to Thursday only — the website's rule, enforced here too
   * rather than left for the office to catch. */
  const monThu = date ? [1, 2, 3, 4].includes(new Date(date + "T12:00:00").getDay()) : true;
  const hireOk = hire !== "halls1" || monThu;

  const bad = {
    hire: touched && !hire, date: touched && !date, agree: touched && !agree,
    first: touched && !who.first.trim(), last: touched && !who.last.trim(),
    addr: touched && !who.addr.trim(), phone: touched && !isPhone(who.phone),
  };
  /* THE TERMS OF HIRE WERE NEVER AGREED TO. The website will not send this
     form until "I have read and agree to the terms of hire, including use of
     the venue in accordance with Islamic rulings" is ticked. The app had no
     such box, so it took a £100 deposit for a venue whose conditions the
     hirer had never been asked to accept. */
  const valid = hire && date && hireOk && who.first.trim() && who.last.trim() &&
                who.addr.trim() && isPhone(who.phone) && agree;

  async function send() {
    setTouched(true);
    if (!valid) {
      setState({ error: !hireOk
        ? t("hallhire.one_hall_mon_thu", "One hall can only be hired Monday to Thursday. Pick another day, or take two halls.")
        : !agree
        ? t("hallhire.agree_first", "Please agree to the terms of hire before sending.")
        : t("hallhire.check_the_form", "Please choose what you need, a date, and fill in every box.") });
      return;
    }
    setState({ sending: true });
    const r = await rpc("request_hall_booking", {
      booking_date: date,
      hire_type: hire === "kitchen" ? "kitchen_only" : "halls",
      halls_count: hire === "kitchen" ? null : Number(hire.replace("halls", "")),
      first_name: who.first.trim(), last_name: who.last.trim(),
      address: who.addr.trim(), phone: who.phone.trim(),
    });
    if (r.ok) {
      setState({ sent: true, reference: r.data.reference, held: r.data.held_until });
      /* Somebody else's hold may have appeared while this form was open. */
      loadTaken();
      return;
    }
    if (/no longer available/i.test(r.body || "")) {
      setState({ error: t("hallhire.gone",
        "Somebody took that date while this form was open. Please choose another — the calendar has been refreshed.") });
      loadTaken(); setDate(null);
      return;
    }
    setState({ error: r.message || t("hallhire.couldnt_send",
      "That didn't send. Please try again, or ring the office on 01204 535 997.") });
  }

  const sheet = SHEETS.hallhire;
  const all = sheet?.blocks || [];
  const hero = all.find(b => b.type === "hero");
  /* THE FORM GOES WHERE THE WEBSITE PUTS IT.
   *
   * The website's order is: the stat strip, the address, what the Centre is,
   * then "Book the hall" with the deposit notice and the form under it, and
   * only THEN the charges, the terms of hire and the booking team's numbers.
   *
   * Everything that was not the hero used to be rendered in one run before
   * the form, so the whole tariff — three tables of it — sat between the
   * description and the thing you came to do, and a person scrolled past
   * every price twice to reach the calendar.
   *
   * The split is the website's own "Book the hall" heading: above it is the
   * introduction, below it is what follows the form. The heading and its
   * deposit notice are drawn by hand just above the form, so they are left
   * out of both runs rather than appearing twice. */
  const cut = all.findIndex(b => b.k === "hallhire.book_the_hall");
  if (cut < 0) throw new Error("hall hire: the 'Book the hall' heading has gone from the website");
  const intro = all.slice(0, cut).filter(b => b.type !== "hero");
  const after = all.slice(cut).filter(b =>
    b.k !== "hallhire.book_the_hall" &&
    !(b.type === "notice" && b.k === "hallhire.deposit_books_the_date"));

  if (state.sent)
    return (
      <Screen>
        <Sent title={t("hallhire.date_held", "The date is held for you")}
              body={t("hallhire.pay_within_thirty",
                "Pay the £100 deposit within thirty minutes and the date is yours. If the deposit is not paid, the hold lapses and the date goes back on the calendar.")}
              reference={state.reference}
              extra={
                <View style={{ width: "100%", paddingHorizontal: 8 }}>
                  <CTA label={t("hallhire.continue_to_deposit", "Continue to the deposit")}
                       sub="£100 · Card · Apple Pay · Google Pay"
                       onPress={() => open(DEPOSIT_LINK +
                         (DEPOSIT_LINK.includes("?") ? "&" : "?") +
                         "client_reference_id=" + encodeURIComponent(state.reference || "hall"))} />
                  <View style={{ marginTop: 12 }}>
                    <Note>{t("hallhire.caretaker_will_call",
                      "The caretaker will call you before the day to arrange access.")}</Note>
                  </View>
                </View>} />
      </Screen>);

  return (
    <Screen pad={false}>
      {!!hero && <Hero lines={hero.lines} ring={sheet.ring} />}
      <View style={{ paddingHorizontal: 16 }}>
        {/* The address card is the website's own .hh-addr block, which the
            extractor now lifts — it used to be typed out again here, as a
            nav row, under a hand-written Google Maps link that pointed at a
            different map from the one the website opens. */}
        <Blocks blocks={intro} nav={navigation} />

        <Heading>{t("hallhire.book_the_hall", "Book the hall")}</Heading>
        <Notice>{t("hallhire.deposit_books_the_date",
          "*Paying the £100 deposit books the date.* Choose your day, fill in the short form and pay — the date is yours as soon as the deposit goes through, with nobody to wait for. It is held for you for thirty minutes while you pay.")}</Notice>

        {/* The whole booking block — the label, the options, the legend, the
            calendar and the two notes under it — is ONE .card.bk-card on the
            website, padded 14. Here each piece sat loose on the paper with
            the calendar in a card of its own, so the controls read as five
            unrelated things rather than one form. */}
        <Card pad={14}>
        <Choice label={t("hallhire.what_do_you_need", "What do you need?")} value={hire} onChange={setHire}
                options={[
                  { v: "halls1", t: t("hallhire.one_hall", "1 hall"), s: t("hallhire.mon_thu_only", "Mon–Thu only") },
                  { v: "halls2", t: t("hallhire.two_halls", "2 halls"), s: t("hallhire.kitchen_included", "Kitchen included") },
                  { v: "halls3", t: t("hallhire.three_halls", "3 halls"), s: t("hallhire.kitchen_included_2", "Kitchen included") },
                  { v: "kitchen", t: t("hallhire.kitchen_only", "Kitchen only"), s: t("hallhire.no_halls", "No halls") },
                ]} />
        {bad.hire && <ErrorBox>{t("hallhire.choose_what_you_need", "Please choose what you need.")}</ErrorBox>}

        {month && (
          <Calendar month={month} onMonth={setMonth} first={first} last={last}
                    selected={date ? [date] : []} taken={taken}
                    /* The website closes off the days it does not sell rather
                       than taking the booking and refusing it afterwards: one
                       hall is Monday to Thursday, so Friday to Sunday come up
                       dashed and faded when one hall is chosen. */
                    offered={d => hire !== "halls1" || [1, 2, 3, 4].includes(d.getDay())}
                    onPick={key => setDate(key === date ? null : key)} />)}
        {/* Two .bk-horizon lines under the calendar on the website, both
            11.5px muted and centred. The second one — what the hire actually
            includes — was only in the charges card further down, where
            somebody choosing a date never reads it. */}
        <View style={{ marginTop: 9 }}>
          <Note>{t("hallhire.bookings_up_to_12_months", "Bookings can be made up to 12 months ahead.")}</Note>
          <Note>{t("hallhire.hire_is_whole_day",
            "Every hall booking includes the kitchen and the cleaning. Hire is for the whole day.")}</Note>
        </View>
        </Card>
        {!hireOk && <ErrorBox>{t("hallhire.one_hall_mon_thu",
          "One hall can only be hired Monday to Thursday. Pick another day, or take two halls.")}</ErrorBox>}
        {bad.date && hireOk && <ErrorBox>{t("hallhire.pick_a_date", "Please pick a date.")}</ErrorBox>}

        <Field label={t("hallhire.first_name", "First name")} type="name" value={who.first} bad={bad.first}
               onChange={v => setWho(s => ({ ...s, first: v }))} />
        <Field label={t("hallhire.surname", "Surname")} type="name" value={who.last} bad={bad.last}
               onChange={v => setWho(s => ({ ...s, last: v }))} />
        <Field label={t("hallhire.address_label", "Address")} type="multi" value={who.addr} bad={bad.addr}
               onChange={v => setWho(s => ({ ...s, addr: v }))} />
        <Field label={t("hallhire.contact_number", "Contact number")} type="tel" value={who.phone} bad={bad.phone}
               /* Two hint props on one field: the second silently won and the
                  first key was dead. The website's wording is .bk-hint's. */
               hint={t("hallhire.phone_hint",
                 "The caretaker will call you before the day to arrange access, so this must be a number that reaches you.")}
               onChange={v => setWho(s => ({ ...s, phone: v }))} />

        <Check value={agree} onChange={setAgree} bad={bad.agree}
               label={t("hallhire.i_agree_to_the_terms_2",
                 "I have read and agree to the terms of hire, including use of the venue in accordance with Islamic rulings.")} />

        {/* .bk-hint — the website says what it keeps these details for, and
            links the privacy notice, directly under the form. */}
        <View style={{ marginTop: 10 }}>
          <Note>{t("privacy.hall_details_kept",
            "The masjid keeps these details to arrange your booking and for its accounts. Read the privacy notice.")}</Note>
        </View>
        <Press onPress={() => { tap(); open("https://taiyabahapp.ysbdesigns.uk/privacy.html"); }}
          style={{ flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start",
                   paddingVertical: 6 }}>
          <Ionicons name="open-outline" size={14} color={C.brand600} />
          <Text style={{ fontFamily: F.sansSemi, fontSize: fs(12.5), color: C.brand600 }}>
            {t("privacy.read_the_privacy_notice", "Read the privacy notice")}</Text>
        </Press>

        <ErrorBox>{state.error}</ErrorBox>
        <Submit label={t("hallhire.continue_to_deposit", "Continue to the deposit")}
                sending={state.sending} onPress={send} />

        {/* Charges, terms of hire and the booking team's four numbers — which
            on the website come AFTER the form, not between the description
            and it. The sheet's own foot block ends the page. */}
        <Blocks blocks={after} nav={navigation} />
      </View>
    </Screen>
  );
}
