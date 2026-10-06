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
import { Screen, Hero, Heading, Card, P, Note, Notice, RowGroup, NavRow, Foot, Press, tap, open } from "../ui";
import { Field, Choice, Check, Calendar, ErrorBox, Submit, Sent, isEmail, isPhone } from "../form";
import { rpc, isOpen } from "../supabase";
import { dayFor } from "../prayer";
import { longDate } from "../dates";
import { SHEETS, Blocks } from "../Blocks";

/* The nikāḥ fee, and NOT a donation link.
 *
 * A nikāḥ fee is not a gift. Putting it through a donation link misstates it in
 * the charity's accounts and risks a Gift Aid problem, which is why the website
 * keeps these two Payment Links separate from every other one — and why the app
 * must use the same two rather than send people to the donate page. */
const PAY = {
  member:     "https://buy.stripe.com/5kQ6oHfU02LC0p05p4f3a07",   // £100
  non_member: "https://buy.stripe.com/28EcN58ry85W1t4cRwf3a08",   // £200
};

/* Typed in any shape, stored in one: NK-26-0001. */
const tidyRef = v => {
  let out = String(v).replace(/[٠-٩]/g, d => "٠١٢٣٤٥٦٧٨٩".indexOf(d))
                     .replace(/[૦-૯]/g, d => "૦૧૨૩૪૫૬૭૮૯".indexOf(d))
                     .toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (/^NK\d/.test(out))       out = "NK-" + out.slice(2);
  if (/^NK-\d{2}\d/.test(out)) out = out.slice(0, 5) + "-" + out.slice(5);
  return out.slice(0, 11);
};

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
  /* The website's nk-pay card sits between the rates card and the prose that
     follows it. The rates card is the one holding the fee rows, so the split
     is immediately after it. Paying happens AFTER the office has rung and
     agreed a date, so it has to be reachable whether or not requests are
     open — it stays outside that branch, as it was. */
  const prose = (() => {
    const bs = (sheet?.blocks || []).filter(b => b.type !== "hero");
    const i = bs.findIndex(b => b.type === "card" &&
                                (b.blocks || []).some(x => x.type === "kv" && x.kind === "rate"));
    if (i < 0) throw new Error("nikah: the fee table has gone from the website");
    return { before: bs.slice(0, i + 1), after: bs.slice(i + 1) };
  })();

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
    setState({ error: r.message || t("nikah.couldnt_send", "That didn't send. Please try again, or ring the office on 01204 535 997.") });
  }

  if (state.sent)
    return (
      <Screen>
        <Sent title={t("nikah.request_sent", "Request sent")}
              body={t("nikah.theyll_ring_you",
                "Somebody will ring the number you gave to confirm the date and the time. Nothing is booked until they do.")}
              reference={state.reference} />
      </Screen>);

  return (
    <Screen pad={false}>
      {!!sheet && <Hero lines={sheet.blocks.find(b => b.type === "hero")?.lines || []} ring={sheet.ring} />}
      <View style={{ paddingHorizontal: 16 }}>
        {/* The masjid's own words about nikāḥ, lifted from the website —
            split where the website puts the payment card, which is directly
            under the fee table and above "Requirements such as documentation".
            Rendering the whole run first and appending Pay at the very end
            moved it below the request form, four screens further down, where
            somebody who has just been rung by the office and told what to pay
            would never look for it. */}
        {!!sheet && <Blocks blocks={prose.before} nav={navigation} />}
        <Pay t={t} />
        {!!sheet && <Blocks blocks={prose.after} nav={navigation} />}

        {open === false ? (
          <>
            <Heading>{t("nikah.requests", "Requests")}</Heading>
            <Notice>{t("nikah.requests_by_phone_for_now", "Requests are taken by phone for now")}</Notice>
            <RowGroup>
              <NavRow icon="call-outline" label={t("marriage.call_the_main_office", "Call the main office")}
                      /* The website's own string carries the separator — the markup
                         puts the · inside the span — so adding one here doubled it. */
                      sub={"01204 535 997 " + t("nikah.5pm_to_7pm", "· 5pm to 7pm")}
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
            <Heading>{t("nikah.request_a_date", "Request a date")}</Heading>
            {/* THE SENTENCE THAT SAYS A DATE IS NOT RESERVED. The website
                opens the booking card with it, in a notice with an ⓘ, and
                the app did not have it anywhere: a family could pick two days
                on a calendar, send the form, and believe the masjid had their
                date. It also says what the calendar is NOT showing — the
                masjid's own diary — which is the thing the calendar most
                looks like it is showing. */}
            <Notice>{t("nikah.this_is_a_request_not",
              "*This is a request, not a booking.* No date here is reserved, and nothing on this calendar shows what the masjid already has in the diary. Choose the day and prayer that would suit you, and the office will ring the person named on the request to confirm whether it can be done, go through the details, and take payment.")}</Notice>
            <P muted>{t("nikah.two_weeks_notice_minimum",
              "Two weeks’ notice minimum, and up to a year ahead.")}</P>
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
                ? `${t("nikah.1st_choice", "1st choice")}: ${prettyIn(t, d1)}${d2 ? ` · ${t("nikah.2nd_choice", "2nd choice")} (${t("nikah.optional", "Optional")}): ${prettyIn(t, d2)}` : ""}`
                : t("nikah.not_chosen_2", "Not chosen")}</Note>
              {!!d1 && (
                <Press onPress={() => { tap(); setD1(null); setD2(null); }}
                  style={{ alignSelf: "flex-start", paddingVertical: 8 }}>
                  <Text style={{ fontFamily: F.sansSemi, fontSize: fs(12.5), color: C.brand600 }}>
                    {t("nikah.start_again", "Start again")}</Text>
                </Press>)}
            </View>
            {bad.date && <ErrorBox>{t("nikah.pick_a_date", "Please pick a date.")}</ErrorBox>}

            {/* Which prayer the nikāḥ sits after only means anything once a day
                is chosen, so the website says so rather than leaving the list
                looking broken. */}
            {!d1 && <Note>{t("nikah.pick_a_date_above_so",
              "Pick a date and a prayer above, and this will carry them across to the office for you.")}</Note>}
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
            <Field label={t("nikah.roughly_how_many_guests", "Roughly how many guests (optional)")} type="num" required={false}
                   value={who.guests} onChange={v => setWho(s => ({ ...s, guests: v.replace(/[^0-9]/g, "") }))} />

            <Heading>{t("nikah.who_is_getting_married", "Who is getting married")}</Heading>
            <P muted>{t("nikah.the_masjid_records_these_five", "The masjid records these five people for every nikāḥ, and cannot perform one without them. They are kept with your request and used for nothing else.")}</P>
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

            <Field label={t("nikah.anything_we_should_know", "Anything we should know (optional)")} type="multi"
                   required={false} value={who.notes} onChange={v => setWho(s => ({ ...s, notes: v }))} />

            <Check value={agree} onChange={setAgree} bad={bad.agree}
                   label={t("nikah.i_understand_the_masjid_will", "I understand the masjid will keep my contact details and the five people’s names, ages and addresses to deal with this request, and nothing else.")} />

            <ErrorBox>{state.error}</ErrorBox>
            <Press onPress={() => { tap(); open("https://taiyabahapp.ysbdesigns.uk/privacy.html"); }}
              style={{ alignSelf: "flex-start", paddingVertical: 8 }}>
              <Text style={{ fontFamily: F.sansSemi, fontSize: fs(12.5), color: C.brand600 }}>
                {t("privacy.read_the_privacy_notice", "Read the privacy notice")}</Text>
            </Press>
            <Note>{t("nikah.nothing_is_sent_until_you", "Nothing is sent until you press this.")}</Note>
            <Submit label={t("nikah.send_my_request", "Send my request")} sending={state.sending} onPress={send} />
          </>
        )}

        <Foot lines={["Bolton Central Islamic Society · Registered charity 1041569"]} />
      </View>
    </Screen>
  );
}

/* Dates read back to the family in the language they chose. */
const prettyIn = (t, iso) => longDate(t, new Date(iso + "T12:00:00"));
const pretty12 = hhmm => {
  let [h, m] = hhmm.split(":").map(Number);
  const s = h >= 12 ? "pm" : "am"; h = h % 12 || 12;
  return `${h}:${String(m).padStart(2, "0")}${s}`;
};

/* Paying the fee, after the office has agreed a date.
 *
 * This was missing from the app entirely, so the only two Stripe links on the
 * website that are not donations had no way of being reached. The reference is
 * what carries the payment back to the request: client_reference_id is the only
 * thing tying the two together, and without it Stripe takes the money and
 * nobody knows whose it is.
 */
function Pay({ t }) {
  const { fs } = useApp();
  const [ref, setRef] = useState("");
  const [err, setErr] = useState("");

  const go = kind => {
    const v = tidyRef(ref);
    if (!v) return setErr(t("nikah.enter_your_reference_first",
      "Please enter your reference first, so the masjid knows whose fee this is. It looks like NK-26-0001."));
    /* Checked here only so a typo does not send money against a reference that
     * cannot be matched. The database checks it again properly. */
    if (!/^NK-\d{2}-\d{4}$/.test(v)) return setErr(t("nikah.that_is_not_a_reference",
      "That does not look like a nikāḥ reference. It is four digits after the year, like NK-26-0001. The office can read yours out if you cannot find it."));
    const link = PAY[kind];
    if (!link) return setErr(t("nikah.that_option_unavailable",
      "That payment option is not available just now. Please ring the office."));
    setErr("");
    open(link + (link.includes("?") ? "&" : "?") + "client_reference_id=" + encodeURIComponent(v));
  };

  /* .np-btn — 13.5px bold at 11px of radius with 12/10 of padding, both
     inside a brand-600 border; the member one filled, .np-alt on the paper
     with plum text. They sit SIDE BY SIDE, flex:1 1 150px, and wrap only when
     they will not fit. These were two full-width stadium pills stacked, which
     made the second look like a second step rather than the other rate. */
  const rate = (kind, label, alt) => (
    <Press onPress={() => { tap(); go(kind); }}
      style={{ flexGrow: 1, flexShrink: 1, flexBasis: 150, alignItems: "center",
               paddingVertical: 12, paddingHorizontal: 10, borderRadius: 11,
               borderWidth: 1, borderColor: C.brand600,
               backgroundColor: alt ? C.paper : C.brand600 }}>
      <Text style={{ fontFamily: F.sansBold, fontSize: fs(13.5), textAlign: "center",
                     color: alt ? C.brand600 : "#FFFFFF" }}>{label}</Text>
    </Press>
  );

  return (
    /* .nk-pay's heading is an h4 INSIDE the card — Fraunces at 16, no gold
       rule beside it. It was a section Heading out on the paper, which
       announced the card as a new part of the page rather than titling it. */
    <Card>
      <Text style={{ fontFamily: F.display, fontSize: fs(16), color: C.ink }}>
        {t("nikah.pay_the_fee_online", "Pay the fee online")}</Text>
      <>
        <P style={{ fontSize: fs(12.5), lineHeight: fs(20.5), color: C.muted }}>
          {t("nikah.once_the_office_has_rung",
          "*Once the office has rung you and agreed your date.* Paying does not book a date on its own — the masjid confirms what it can do first.")}</P>
        <Field label={t("nikah.your_reference", "Your reference")}
               value={ref} onChange={v => { setErr(""); setRef(tidyRef(v)); }}
               placeholder="NK-26-0001" autoCapitalize="characters" maxLength={11} />
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 11 }}>
          {rate("member", t("nikah.member_pay_100", "Member — pay £100"))}
          {rate("non_member", t("nikah.non_member_pay_200", "Non-member — pay £200"), true)}
        </View>
        <ErrorBox>{err}</ErrorBox>
        <Note>{t("nikah.your_reference_is_on_the",
          "Your reference is on the confirmation you were given when you sent your request, and the office can read it out. Pick the rate that applies to you — the office checks it, and will tell you if anything is owed or owed back.")}</Note>
      </>
    </Card>
  );
}
