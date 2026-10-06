/* Taiyabah Centre — hall and room hire.
 *
 * This one is a real booking, not an enquiry: request_hall_booking() takes the
 * lock, holds the date for thirty minutes while the deposit is paid, and refuses
 * the second person while the first is at the card page. Dates already held show
 * as struck through, read from hall_availability.
 */
import React, { useEffect, useMemo, useState } from "react";
import { View, Text } from "react-native";
import { C, F, R } from "../theme";
import { useApp } from "../store";
import { Screen, Hero, Heading, Card, P, Note, Notice, CTA, Foot, Pill, RowGroup, NavRow, open } from "../ui";
import { Field, Choice, Calendar, ErrorBox, Submit, Sent, isPhone } from "../form";
import { rpc, readList } from "../supabase";
import { SHEETS, Blocks } from "../Blocks";

const DEPOSIT_LINK = "https://book.stripe.com/3cIdR9cHOfyo5Jk7xcf3a06";
const HORIZON_DAYS = 365;      // bookings up to 12 months ahead

export default function HallHire({ navigation }) {
  const { t, fs } = useApp();
  const [hire, setHire] = useState(null);
  const [month, setMonth] = useState(null);
  const [date, setDate] = useState(null);
  const [taken, setTaken] = useState([]);
  const [who, setWho] = useState({ first: "", last: "", addr: "", phone: "" });
  const [state, setState] = useState({});
  const [touched, setTouched] = useState(false);

  const first = useMemo(() => { const d = new Date(); d.setHours(0,0,0,0); d.setDate(d.getDate() + 1); return d; }, []);
  const last  = useMemo(() => { const d = new Date(); d.setHours(0,0,0,0); d.setDate(d.getDate() + HORIZON_DAYS); return d; }, []);
  useEffect(() => { setMonth(new Date(first.getFullYear(), first.getMonth(), 1)); }, [first]);

  /* The function, not the view: same booking_date rows, but it can be told
     which masjid. */
  const loadTaken = () => readList("hall_availability")
    .then(rows => setTaken(rows.map(r => r.booking_date)))
    .catch(() => {});          // a list we cannot read is not a reason to block the form
  useEffect(() => { loadTaken(); }, []);

  /* One hall is Monday to Thursday only — the website's rule, enforced here too
   * rather than left for the office to catch. */
  const monThu = date ? [1, 2, 3, 4].includes(new Date(date + "T12:00:00").getDay()) : true;
  const hireOk = hire !== "halls1" || monThu;

  const bad = {
    hire: touched && !hire, date: touched && !date,
    first: touched && !who.first.trim(), last: touched && !who.last.trim(),
    addr: touched && !who.addr.trim(), phone: touched && !isPhone(who.phone),
  };
  const valid = hire && date && hireOk && who.first.trim() && who.last.trim() &&
                who.addr.trim() && isPhone(who.phone);

  async function send() {
    setTouched(true);
    if (!valid) {
      setState({ error: !hireOk
        ? t("hallhire.one_hall_mon_thu", "One hall can only be hired Monday to Thursday. Pick another day, or take two halls.")
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
  const hero = sheet?.blocks.find(b => b.type === "hero");
  /* The website's own "Book the hall" heading and its deposit notice are
   * reproduced below, immediately above the form they introduce — so they are
   * dropped here rather than appearing twice, once orphaned. */
  const prose = (sheet?.blocks || []).filter(b =>
    b.type !== "hero" && b.k !== "hallhire.book_the_hall" &&
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
      {!!hero && <Hero lines={hero.lines} />}
      <View style={{ paddingHorizontal: 16 }}>
        <Blocks blocks={prose} nav={navigation} />

        {/* Where the hall actually is, and how to get to it — the website puts
            this above the form, and without it the booking form asks people to
            commit to a venue the app never names. */}
        <RowGroup>
          <NavRow icon="location-outline"
                  label={t("hallhire.taiyabah_centre_get_directions", "Taiyabah Centre · get directions")}
                  sub={t("hallhire.astley_street_bolton_bl1_8eh", "Astley Street, Bolton BL1 8EH")}
                  href="https://maps.google.com/?q=Astley+Street,+Bolton+BL1+8EH" />
        </RowGroup>
        <Note>{t("hallhire.hire_is_whole_day",
          "Every hall booking includes the kitchen and the cleaning. Hire is for the whole day.")}</Note>

        <Heading>{t("hallhire.book_the_hall", "Book the hall")}</Heading>
        <Notice>{t("hallhire.deposit_books_the_date",
          "*Paying the £100 deposit books the date.* Choose your day, fill in the short form and pay — the date is yours as soon as the deposit goes through, with nobody to wait for. It is held for you for thirty minutes while you pay.")}</Notice>

        <Choice label={t("hallhire.what_do_you_need", "What do you need?")} value={hire} onChange={setHire}
                options={[
                  { v: "halls1", t: t("hallhire.one_hall", "1 hall"), s: t("hallhire.mon_thu_only", "Mon–Thu only") },
                  { v: "halls2", t: t("hallhire.two_halls", "2 halls"), s: t("hallhire.kitchen_included", "Kitchen included") },
                  { v: "halls3", t: t("hallhire.three_halls", "3 halls"), s: t("hallhire.kitchen_included_2", "Kitchen included") },
                  { v: "kitchen", t: t("hallhire.kitchen_only", "Kitchen only"), s: t("hallhire.no_halls", "No halls") },
                ]} />
        {bad.hire && <ErrorBox>{t("hallhire.choose_what_you_need", "Please choose what you need.")}</ErrorBox>}

        {month && (
          <View style={{ marginTop: 4 }}>
            <Calendar month={month} onMonth={setMonth} first={first} last={last}
                      selected={date ? [date] : []} taken={taken}
                      onPick={key => setDate(key === date ? null : key)} />
          </View>)}
        <View style={{ marginTop: 9 }}>
          <Note>{t("hallhire.bookings_up_to_12_months", "Bookings can be made up to 12 months ahead.")}</Note>
        </View>
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
               hint={t("hallhire.phone_hint", "The caretaker will call you before the day to arrange access, so this must be a number that reaches you.")}
               hint={t("hallhire.the_caretaker_will_call_you",
                 "The caretaker will call you before the day to arrange access, so it must be a number that reaches you.")}
               onChange={v => setWho(s => ({ ...s, phone: v }))} />

        <ErrorBox>{state.error}</ErrorBox>
        <Submit label={t("hallhire.continue_to_deposit", "Continue to the deposit")}
                sending={state.sending} onPress={send} />
        <Foot lines={["Bolton Central Islamic Society · Registered charity 1041569"]} />
      </View>
    </Screen>
  );
}
