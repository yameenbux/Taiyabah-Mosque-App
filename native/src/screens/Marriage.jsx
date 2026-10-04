/* Nikāḥ at Taiyabah.
 *
 * The real form, writing through request_nikah_date() — the same Postgres
 * function the website calls, so the office gets one queue rather than two. The
 * masjid records five named people for every nikāḥ and cannot perform one
 * without them, which is why the form is as long as it is: shortening it would
 * only move the work to a phone call.
 */
import React, { useEffect, useMemo, useState } from "react";
import { View, Text } from "react-native";
import { C, F, R } from "../theme";
import { useApp } from "../store";
import { Screen, Hero, Heading, Card, P, Note, Notice, RowGroup, NavRow, Foot } from "../ui";
import { Field, Choice, Check, Calendar, ErrorBox, Submit, Sent, isEmail, isPhone } from "../form";
import { rpc, isOpen } from "../supabase";
import { dayFor } from "../prayer";
import { SHEETS, Blocks } from "../Blocks";

const NOTICE_DAYS = 14;        // the masjid needs a fortnight
const HORIZON_DAYS = 365;

const SLOTS = [
  { v: "after_fajr",    k: "nikah.after_fajr",    t: "After Fajr",    prayer: "fajr" },
  { v: "after_zuhr",    k: "nikah.after_zuhr",    t: "After Zuhr",    prayer: "zuhr" },
  { v: "after_asr",     k: "nikah.after_asr",     t: "After Asr",     prayer: "asr" },
  { v: "after_maghrib", k: "nikah.after_maghrib", t: "After Maghrib", prayer: "maghrib" },
  { v: "after_isha",    k: "nikah.after_isha",    t: "After Isha",    prayer: "isha" },
];
const SATURDAY = { v: "saturday_11", k: "nikah.saturday_11am", t: "Saturday, 11:00am", s: "before a wedding meal" };
const FLEXIBLE = { v: "flexible", k: "nikah.im_flexible", t: "I'm flexible", s: "the office can suggest a time" };

const PEOPLE = [
  { id: "groom", role: "groom",     k: "nikah.the_bridegroom",             label: "The bridegroom", adult: true },
  { id: "bride", role: "bride",     k: "nikah.the_bride",                  label: "The bride",      adult: true },
  { id: "wali",  role: "wali",      k: "nikah.the_brides_representative",  label: "The bride's representative" },
  { id: "w1",    role: "witness_1", k: "nikah.witness_1",                  label: "Witness 1" },
  { id: "w2",    role: "witness_2", k: "nikah.witness_2",                  label: "Witness 2" },
];
const blankPerson = () => ({ name: "", age: "", addr: "", town: "", pc: "" });

export default function Marriage({ navigation }) {
  const { t, tx, fs } = useApp();
  const [open, setOpen] = useState(null);     // null = still asking Postgres
  const [month, setMonth] = useState(null);
  const [d1, setD1] = useState(null);
  const [d2, setD2] = useState(null);
  const [slot, setSlot] = useState(null);
  const [who, setWho] = useState({ name: "", role: null, phone: "", email: "", guests: "", notes: "" });
  const [people, setPeople] = useState(Object.fromEntries(PEOPLE.map(p => [p.id, blankPerson()])));
  const [agree, setAgree] = useState(false);
  const [state, setState] = useState({});     // {sending, error, sent, reference}
  const [touched, setTouched] = useState(false);

  const first = useMemo(() => { const d = new Date(); d.setHours(0,0,0,0); d.setDate(d.getDate() + NOTICE_DAYS); return d; }, []);
  const last  = useMemo(() => { const d = new Date(); d.setHours(0,0,0,0); d.setDate(d.getDate() + HORIZON_DAYS); return d; }, []);
  useEffect(() => { setMonth(new Date(first.getFullYear(), first.getMonth(), 1)); }, [first]);
  useEffect(() => { isOpen("request_nikah_date").then(setOpen); }, []);

  const setP = (id, k, v) => setPeople(s => ({ ...s, [id]: { ...s[id], [k]: v } }));
  const sheet = SHEETS.marriage;

  /* What the family are agreeing to, resolved to the clock time published for
   * the day they picked. Times move through the year, and the office needs to
   * know what they were actually looking at. */
  const jamaatFor = (isoDate, prayer) => {
    if (!isoDate || !prayer) return null;
    const day = dayFor(new Date(isoDate + "T12:00:00"));
    return day?.jamaat?.[prayer] || null;
  };
  const chosen = [...SLOTS, SATURDAY, FLEXIBLE].find(s => s.v === slot) || null;
  const saturdayOnly = d1 && new Date(d1 + "T12:00:00").getDay() === 6;

  const bad = {
    name: touched && !who.name.trim(),
    role: touched && !who.role,
    phone: touched && !isPhone(who.phone),
    email: touched && !isEmail(who.email),
    date: touched && !d1,
    slot: touched && !slot,
    agree: touched && !agree,
    ...Object.fromEntries(PEOPLE.flatMap(p => {
      const v = people[p.id];
      return [
        [`${p.id}.name`, touched && !v.name.trim()],
        [`${p.id}.age`, touched && (!v.age || (p.adult && Number(v.age) < 18))],
        [`${p.id}.addr`, touched && !v.addr.trim()],
        [`${p.id}.town`, touched && !v.town.trim()],
        [`${p.id}.pc`, touched && !v.pc.trim()],
      ];
    })),
  };
  const valid = !Object.values({ ...bad }).some(Boolean) && who.name.trim() && who.role &&
                isPhone(who.phone) && isEmail(who.email) && d1 && slot && agree &&
                PEOPLE.every(p => {
                  const v = people[p.id];
                  return v.name.trim() && v.age && (!p.adult || Number(v.age) >= 18) &&
                         v.addr.trim() && v.town.trim() && v.pc.trim();
                });

  async function send() {
    setTouched(true);
    if (!valid) {
      setState({ error: t("nikah.check_the_form",
        "Please fill in your name, number, a valid email, who you are, and tick the box.") });
      return;
    }
    setState({ sending: true });
    const r = await rpc("request_nikah_date", {
      preferred_date: d1,
      alternative_date: d2 || null,
      slot,
      preferred_time: chosen?.prayer ? jamaatFor(d1, chosen.prayer) : null,
      time_flexible: slot === "flexible",
      guests_estimate: who.guests.trim() === "" ? null : Number(who.guests),
      contact_name: who.name.trim(),
      contact_role: who.role,
      contact_phone: who.phone.trim(),
      contact_email: who.email.trim(),
      notes: who.notes.trim() || null,
      privacy_accepted: agree,
      people: PEOPLE.map(p => ({
        role: p.role,
        full_name: people[p.id].name.trim(),
        age: Number(people[p.id].age),
        address_line: people[p.id].addr.trim(),
        town: people[p.id].town.trim(),
        /* The database upper-cases it anyway; doing it here means the family see
         * what was stored rather than what they typed. */
        postcode: people[p.id].pc.trim().toUpperCase(),
      })),
    });
    if (r.ok) { setState({ sent: true, reference: r.data.reference }); return; }
    setState({ error: r.message || t("nikah.couldnt_send",
      "That didn't send. Please try again, or ring the office on 01204 535 997 between 5pm and 7pm.") });
  }

  if (state.sent)
    return (
      <Screen>
        <Sent title={t("nikah.request_sent", "Your request is with the office")}
              body={t("nikah.theyll_ring_you",
                "Somebody will ring the number you gave to confirm the date and the time. Nothing is booked until they do.")}
              reference={state.reference} />
      </Screen>);

  return (
    <Screen pad={false}>
      {!!sheet && <Hero lines={sheet.blocks.find(b => b.type === "hero")?.lines || []} />}
      <View style={{ paddingHorizontal: 16 }}>
        {/* The masjid's own words about nikāḥ, lifted from the website. */}
        {!!sheet && <Blocks blocks={sheet.blocks.filter(b => b.type !== "hero")} nav={navigation} />}

        {open === false ? (
          <>
            <Heading>{t("nikah.requests", "Requests")}</Heading>
            <Notice>{t("nikah.requests_by_phone_for_now", "Requests are taken by phone for now")}</Notice>
            <RowGroup>
              <NavRow icon="call-outline" label={t("nikah.ring_the_office", "Ring the office")}
                      sub={"01204 535 997 · " + t("nikah.5pm_to_7pm", "5pm to 7pm")}
                      href="tel:01204535997" />
              <NavRow icon="mail-outline" label={t("nikah.email_the_office", "Email the office")}
                      sub={t("nikah.opens_your_email_app", "Opens your email app with the details filled in")}
                      href={"mailto:info@taiyabahmasjid.com?subject=" +
                            encodeURIComponent("Nikah request") + "&body=" +
                            encodeURIComponent(`Preferred date: ${d1 || "—"}\nPrayer: ${chosen ? t(chosen.k, chosen.t) : "—"}\n\n`)} />
            </RowGroup>
          </>
        ) : (
          <>
            <Heading>{t("nikah.when_would_you_like_it", "When would you like it?")}</Heading>
            <P muted>{t("nikah.pick_a_first_choice",
              "Pick a first choice, and a second if you have one. The masjid needs a fortnight's notice.")}</P>
            {month && (
              <Calendar month={month} onMonth={setMonth} first={first} last={last}
                        selected={[d1, d2].filter(Boolean)}
                        onPick={key => {
                          if (key === d1) { setD1(d2); setD2(null); return; }
                          if (key === d2) { setD2(null); return; }
                          if (!d1) { setD1(key); return; }
                          setD2(key);
                        }} />)}
            <View style={{ marginTop: 9 }}>
              <Note>{d1
                ? `${t("nikah.1st_choice_2", "1st choice")}: ${pretty(d1)}${d2 ? ` · ${t("nikah.2nd_choice_2", "2nd choice")}: ${pretty(d2)}` : ""}`
                : t("nikah.not_chosen", "Not chosen")}</Note>
            </View>
            {bad.date && <ErrorBox>{t("nikah.pick_a_date", "Please pick a date.")}</ErrorBox>}

            <Choice label={t("nikah.what_time_would_suit_you", "What time would suit you?")}
                    value={slot} onChange={setSlot}
                    options={[
                      ...SLOTS.map(s => ({ v: s.v, t: t(s.k, s.t),
                                           s: jamaatFor(d1, s.prayer) ? pretty12(jamaatFor(d1, s.prayer)) : null })),
                      ...(saturdayOnly ? [{ v: SATURDAY.v, t: t(SATURDAY.k, SATURDAY.t), s: t("nikah.before_a_wedding_meal", SATURDAY.s) }] : []),
                      { v: FLEXIBLE.v, t: t(FLEXIBLE.k, FLEXIBLE.t), s: t("nikah.the_office_can_suggest", FLEXIBLE.s) },
                    ]} />
            {bad.slot && <ErrorBox>{t("nikah.pick_a_time", "Please choose a time.")}</ErrorBox>}

            <Heading>{t("nikah.who_are_you", "Who are you?")}</Heading>
            <Field label={t("nikah.your_name", "Your name")} type="name" value={who.name} bad={bad.name}
                   onChange={v => setWho(s => ({ ...s, name: v }))} />
            <Choice options={[
                      { v: "groom",  t: t("nikah.groom", "Groom") },
                      { v: "bride",  t: t("nikah.bride", "Bride") },
                      { v: "family", t: t("nikah.family", "Family") },
                      { v: "other",  t: t("nikah.other", "Other") }]}
                    value={who.role} onChange={v => setWho(s => ({ ...s, role: v }))} columns={4} />
            <Field label={t("nikah.contact_number", "Contact number")} type="tel" value={who.phone} bad={bad.phone}
                   hint={t("nikah.the_office_will_ring_this",
                     "The office will ring this number to confirm, so it must be one that reaches you.")}
                   onChange={v => setWho(s => ({ ...s, phone: v }))} />
            <Field label={t("nikah.email", "Email")} type="email" value={who.email} bad={bad.email}
                   onChange={v => setWho(s => ({ ...s, email: v }))} />
            <Field label={t("nikah.guests", "Roughly how many guests?")} type="num" required={false}
                   value={who.guests} onChange={v => setWho(s => ({ ...s, guests: v.replace(/[^0-9]/g, "") }))} />

            <Heading>{t("nikah.who_is_getting_married", "Who is getting married")}</Heading>
            <P muted>{t("nikah.the_masjid_records_these_five",
              "The masjid records these five people for every nikāḥ, and cannot perform one without them.")}</P>
            {PEOPLE.map(p => (
              <View key={p.id} style={{ marginTop: 18 }}>
                <Text style={{ fontFamily: F.display, fontSize: fs(15.5), color: C.brand600 }}>
                  {t(p.k, p.label)}</Text>
                <Field label={t("nikah.full_name", "Full name")} type="name" value={people[p.id].name}
                       bad={bad[`${p.id}.name`]} onChange={v => setP(p.id, "name", v)} />
                <Field label={t("nikah.age", "Age")} type="num" value={people[p.id].age}
                       bad={bad[`${p.id}.age`]}
                       hint={p.adult ? t("nikah.must_be_18_or_over", "Must be 18 or over.") : null}
                       onChange={v => setP(p.id, "age", v.replace(/[^0-9]/g, ""))} />
                <Field label={t("nikah.address", "Address")} value={people[p.id].addr}
                       bad={bad[`${p.id}.addr`]} onChange={v => setP(p.id, "addr", v)} />
                <Field label={t("nikah.town", "Town")} value={people[p.id].town}
                       bad={bad[`${p.id}.town`]} onChange={v => setP(p.id, "town", v)} />
                <Field label={t("nikah.postcode", "Postcode")} type="pc" value={people[p.id].pc}
                       bad={bad[`${p.id}.pc`]} onChange={v => setP(p.id, "pc", v)} />
              </View>))}

            <Field label={t("nikah.anything_else", "Anything else the office should know")} type="multi"
                   required={false} value={who.notes} onChange={v => setWho(s => ({ ...s, notes: v }))} />

            <Check value={agree} onChange={setAgree} bad={bad.agree}
                   label={t("nikah.i_agree_privacy",
                     "I agree to these details being held by the masjid so that the nikāḥ can be arranged and recorded.")} />

            <ErrorBox>{state.error}</ErrorBox>
            <Submit label={t("nikah.send_my_request", "Send my request")} sending={state.sending} onPress={send} />
            <Foot lines={["Bolton Central Islamic Society · Registered charity 1041569"]} />
          </>
        )}
      </View>
    </Screen>
  );
}

const pretty = iso => new Date(iso + "T12:00:00")
  .toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
const pretty12 = hhmm => {
  let [h, m] = hhmm.split(":").map(Number);
  const s = h >= 12 ? "pm" : "am"; h = h % 12 || 12;
  return `${h}:${String(m).padStart(2, "0")}${s}`;
};
