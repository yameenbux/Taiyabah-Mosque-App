/* Charity collections at the masjid — the masjid's paper CHARITY DATA FORM.
 *
 * This used to send people to the website, because the form carries the BMCC
 * certificate as a file and the app had no way to attach one. That was the
 * right call while it was true and the wrong thing to leave standing: the app
 * now picks the file and puts it in the same private bucket the website uses,
 * and writes through the same request_charity_collection() — so the office
 * works one queue and sees one shape of request, whichever was used.
 *
 * The certificate goes up FIRST and the request only afterwards. If the
 * request then fails the file is left unreferenced, which is by a distance the
 * cheaper failure: the other order writes a request claiming a certificate
 * that is not there.
 */
import React, { useEffect, useMemo, useState } from "react";
import { View, Text } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { C, F, R } from "../theme";
import { useApp } from "../store";
import { Screen, Hero, Heading, Card, P, Note, Notice, RowGroup, NavRow, Press, tap, open } from "../ui";
import { Field, Choice, Check, Calendar, ErrorBox, Submit, Sent } from "../form";
import { rpc, upload, isOpen } from "../supabase";
import { longDate } from "../dates";
import { nowLondon } from "../prayer";
import { SHEETS, Blocks } from "../Blocks";

const NOTICE_DAYS  = 14;
const HORIZON_DAYS = 365;
const RULES_VERSION = "2026-09-14";
const BUCKET = "bmcc";
const MAX = 5 * 1024 * 1024;
/* The masjid's rule is three months, and request_charity_collection() is where
 * it is enforced. This copy exists so the form can refuse before somebody
 * uploads a file and waits. If the masjid changes the rule, both must change. */
const CERT_MONTHS = 3;
const TYPES = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "application/pdf": "pdf" };

const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export default function Collect({ navigation }) {
  const { t, fs } = useApp();
  const sheet = SHEETS.collect;
  const hero = sheet?.blocks.find(b => b.type === "hero");

  const [open_, setOpen] = useState(null);
  const [month, setMonth] = useState(null);
  const [date, setDate] = useState(null);
  const [org, setOrg] = useState({ name: "", addr: "", phone: "", email: "", number: "" });
  const [students, setStudents] = useState({ total: "", boarding: "" });
  const [file, setFile] = useState(null);
  const [certDate, setCertDate] = useState("");
  const [who, setWho] = useState({ name: "", role: "", paid: null });
  const [trustee, setTrustee] = useState({ name: "", phone: "", email: "" });
  const [sign, setSign] = useState("");
  const [agree, setAgree] = useState(false);
  const [privacy, setPrivacy] = useState(false);
  const [bad, setBad] = useState({});
  const [state, setState] = useState({});

  const first = useMemo(() => { const d = nowLondon(); d.setHours(0,0,0,0); d.setDate(d.getDate() + NOTICE_DAYS); return d; }, []);
  const last  = useMemo(() => { const d = nowLondon(); d.setHours(0,0,0,0); d.setDate(d.getDate() + HORIZON_DAYS); return d; }, []);
  const certFloor = useMemo(() => { const d = nowLondon(); d.setMonth(d.getMonth() - CERT_MONTHS); return d; }, []);

  useEffect(() => { setMonth(new Date(first.getFullYear(), first.getMonth(), 1)); }, [first]);
  useEffect(() => { isOpen("request_charity_collection").then(setOpen).catch(() => setOpen(false)); }, []);

  const pick = async () => {
    tap();
    const r = await DocumentPicker.getDocumentAsync({
      type: Object.keys(TYPES), copyToCacheDirectory: true, multiple: false,
    });
    if (r.canceled || !r.assets?.length) return;
    const f = r.assets[0];
    if (!TYPES[f.mimeType]) return setState({ error: t("collect.that_file_type", "That file type is not accepted. JPG, PNG, WEBP or PDF.") });
    if (f.size > MAX) return setState({ error: t("collect.that_file_is_too_big", "That file is too big. The largest the masjid can take is 5 MB — a photo taken on a phone usually is.") });
    setState({}); setBad(b => ({ ...b, file: false })); setFile(f);
  };

  const send = async () => {
    const need = {
      date: !date, org: !org.name.trim(), addr: !org.addr.trim(), phone: !org.phone.trim(),
      email: !org.email.trim(), file: !file, certDate: !/^\d{4}-\d{2}-\d{2}$/.test(certDate),
      cname: !who.name.trim(), crole: !who.role.trim(), paid: who.paid === null,
      tname: !trustee.name.trim(), tphone: !trustee.phone.trim(), temail: !trustee.email.trim(),
      sign: !sign.trim(), agree: !agree, privacy: !privacy,
    };
    /* Refused here as well as in Postgres, so nobody waits for a 5 MB upload
     * only to be told the certificate is too old to be accepted. */
    if (!need.certDate && new Date(certDate + "T12:00:00") < certFloor)
      need.certDate = true;
    setBad(need);
    if (Object.values(need).some(Boolean))
      return setState({ error: t("collect.check_the_form", "Please fill in every question, choose a date at least two weeks away, and tick both boxes.") });

    setState({ sending: true });
    try {
      const path = await upload(BUCKET, file, { ext: TYPES[file.mimeType] });
      const r = await rpc("request_charity_collection", {
        requested_date: date,
        org_name: org.name.trim(), org_address: org.addr.trim(),
        org_phone: org.phone.trim(), org_email: org.email.trim(),
        charity_number: org.number.trim() || null,
        collector_name: who.name.trim(), collector_role: who.role.trim(),
        collector_paid: who.paid === "yes",
        trustee_name: trustee.name.trim(), trustee_phone: trustee.phone.trim(),
        trustee_email: trustee.email.trim(),
        rules_version: RULES_VERSION,
        signed_name: sign.trim(),
        /* The boxes themselves, never literal trues: hard-coding these would
         * record an agreement nobody gave and look identical in the diff. */
        rules_accepted: agree, privacy_accepted: privacy,
        bmcc_certificate_path: path, bmcc_certificate_date: certDate,
        /* Empty means "not answered", not zero. */
        students_total: students.total || null,
        students_boarding: students.boarding || null,
      });
      setState({ done: r });
    } catch (e) {
      setState({ error: e.message || t("collect.couldnt_send", "That didn't send. Please try again, or ring Rafik Patel on 07951 795 465.") });
    }
  };

  if (state.done)
    return (
      <Screen>
        <Sent title={t("collect.request_sent", "Your request has been sent")}
              body={t("collect.the_office_will_ring_the_trustee",
                "The office rings the trustee to confirm before anything is agreed. Keep your reference.")}>
          {!!state.done?.reference && (
            <Text style={{ fontFamily: F.display, fontSize: fs(22), color: C.brand600, textAlign: "center" }}>
              {state.done.reference}</Text>)}
        </Sent>
      </Screen>
    );

  return (
    <Screen pad={false}>
      {!!hero && <Hero lines={hero.lines} />}
      <View style={{ paddingHorizontal: 16 }}>
        {/* The rules, in the masjid's own words. */}
        <Blocks blocks={sheet?.blocks.filter(b => b.type !== "hero") || []} nav={navigation} />

        {/* WHEN THE FORM IS CLOSED, THE WEBSITE'S OWN PROSE IS THE CLOSED
            STATE — the plum "Requests are taken by phone for now" panel and
            the help row with Rafik Patel's number, both already drawn from
            the sheet above. The app added an "Apply" heading, a second notice
            carrying the same sentence and a second copy of the same number,
            so the charity line ended up mid-screen with the whole message
            repeating beneath it. The same duplication the imāms' advice
            screen had. */}
        {open_ === false ? null : (
          <>
            <Heading>{t("collect.before_you_fill_this_in", "Before you fill this in")}</Heading>
            <Note>{`${t("collect.the_masjid_needs_at_least", "The masjid needs at least")} ${NOTICE_DAYS} ${t("collect.days_notice_and_takes_requests", "days’ notice, and takes requests up to a year ahead.")}`}</Note>
            <Note>{t("collect.every_question_is_needed_unless", "Every question is needed unless it says otherwise. The masjid rings the trustee named at the bottom before confirming anything, so please give a number that will be answered.")}</Note>

            <Heading>{t("collect.the_date", "The date")}</Heading>
            <P muted>{t("collect.date_you_would_like_to", "Date you would like to collect")}</P>
            {month && (
              <Calendar month={month} onMonth={setMonth} first={first} last={last}
                        selected={date ? [date] : []}
                        onPick={k => { setDate(k === date ? null : k); setBad(b => ({ ...b, date: false })); }} />)}
            <Note>{date ? longDate(t, new Date(date + "T12:00:00")) : t("nikah.not_chosen_2", "Not chosen")}</Note>
            {bad.date && <ErrorBox>{t("collect.pick_a_date", "Please choose a date.")}</ErrorBox>}

            <Heading>{t("collect.the_charity_or_institute", "The charity or institute")}</Heading>
            <Field label={t("collect.full_name_of_charity_institute", "Full name of charity / institute (idāra)")}
                   value={org.name} bad={bad.org} onChange={v => setOrg(s => ({ ...s, name: v }))} />
            <Field label={t("collect.address", "Address")} type="multi"
                   value={org.addr} bad={bad.addr} onChange={v => setOrg(s => ({ ...s, addr: v }))} />
            <Field label={t("collect.phone_number", "Phone number")} type="tel"
                   value={org.phone} bad={bad.phone} onChange={v => setOrg(s => ({ ...s, phone: v }))} />
            <Field label={t("collect.email", "Email")} type="email"
                   value={org.email} bad={bad.email} onChange={v => setOrg(s => ({ ...s, email: v }))} />
            <Field label={t("collect.charity_number_if_you_have", "Charity number")}
                   required={false} opt={t("collect.if_you_have_one", "— if you have one")}
                   hint={t("collect.leave_this_empty_if_the", "Leave this empty if the cause is overseas or not registered in England and Wales.")}
                   value={org.number} onChange={v => setOrg(s => ({ ...s, number: v }))} />
            <Field label={t("collect.students_altogether", "Students altogether")}
                   type="num" required={false} opt={t("collect.optional", "— optional")}
                   value={students.total} onChange={v => setStudents(s => ({ ...s, total: v.replace(/[^0-9]/g, "") }))} />
            <Field label={t("collect.of_those_boarding", "Of those, boarding")} type="num" required={false} opt={t("collect.optional", "— optional")}
                   hint={t("collect.if_your_madrasah_or_school", "If your madrasah or school has students, it helps the masjid to know how many, and how many of them board. Leave both empty if it does not apply.")}
                   value={students.boarding} onChange={v => setStudents(s => ({ ...s, boarding: v.replace(/[^0-9]/g, "") }))} />

            <Heading>{t("collect.your_bmcc_certificate", "Your BMCC certificate")}</Heading>
            {/* WHO ISSUES IT, AND THAT WITHOUT IT THERE IS NO REQUEST. The
                website says both here, before the file picker. The app asked
                for a certificate without ever saying the masjid cannot take
                the request without one, or who issues it — so somebody with
                no certificate had no idea where to get one. */}
            <Note>{t("collect.the_masjid_cannot_take_a",
              "The masjid *cannot take a request without this*. Bolton Masjid Chanda Committee issues the certificate, and it must have been issued *within the last three months*.")}</Note>
            <View style={{ marginTop: 8 }}>
              <P muted>{t("collect.photo_or_scan_of_the", "Photo or scan of the certificate")}</P>
            </View>
            <Press onPress={pick}
              style={{ borderWidth: 1, borderStyle: "dashed", borderColor: bad.file ? C.danger : C.line,
                       borderRadius: R.card, paddingVertical: 20, alignItems: "center", gap: 6,
                       backgroundColor: C.card }}>
              <Text style={{ fontFamily: F.sansSemi, fontSize: fs(13.5), color: C.brand600 }}>
                {file ? file.name : t("collect.choose_a_file", "Choose a file")}</Text>
              <Text style={{ fontFamily: F.sans, fontSize: fs(11.5), color: C.muted, textAlign: "center",
                             paddingHorizontal: 20 }}>
                {t("collect.a_clear_photo_is_fine", "A clear photo is fine. JPG, PNG, WEBP or PDF, up to 5 MB.")}</Text>
            </Press>
            {bad.file && <ErrorBox>{t("collect.attach_the_certificate", "Please attach the certificate.")}</ErrorBox>}
            <Field label={t("collect.the_date_on_the_certificate", "The date on the certificate")}
                   placeholder="YYYY-MM-DD" value={certDate} bad={bad.certDate}
                   hint={t("collect.it_must_have_been_issued", "It must have been issued within the last three months.")}
                   onChange={v => setCertDate(v.replace(/[^0-9-]/g, "").slice(0, 10))} />

            <Heading>{t("collect.who_will_be_collecting", "Who will be collecting")}</Heading>
            <Field label={t("collect.name_of_the_person_doing", "Name of the person doing the collection")}
                   type="name" value={who.name} bad={bad.cname} onChange={v => setWho(s => ({ ...s, name: v }))} />
            <Field label={t("collect.their_role_in_the_institute", "Their role in the institute")}
                   value={who.role} bad={bad.crole} onChange={v => setWho(s => ({ ...s, role: v }))} />
            <Choice label={t("collect.do_they_receive_any_wage", "Do they receive any wage or commission for this collection?")}
                    value={who.paid} onChange={v => setWho(s => ({ ...s, paid: v }))} columns={2}
                    options={[{ v: "no", t: t("collect.no", "No") }, { v: "yes", t: t("collect.yes", "Yes") }]} />
            {who.paid === "yes" && (
              <Note>{t("collect.thank_you_for_saying_so", "Thank you for saying so. A paid collector is allowed — the masjid simply needs to know beforehand, and the committee may ask about it when they ring.")}</Note>)}
            {bad.paid && <ErrorBox>{t("collect.please_answer_this", "Please answer this.")}</ErrorBox>}

            <Heading>{t("collect.trustee_or_manager", "Trustee or manager")}</Heading>
            <P muted>{t("collect.somebody_other_than_the_collector", "Somebody other than the collector. The masjid rings this person to confirm the collection is genuine.")}</P>
            <Field label={t("collect.full_name_of_trustee_ceo", "Full name of trustee / CEO / principal")}
                   type="name" value={trustee.name} bad={bad.tname}
                   onChange={v => setTrustee(s => ({ ...s, name: v }))} />
            <Field label={t("collect.their_phone_number", "Their phone number")} type="tel"
                   value={trustee.phone} bad={bad.tphone} onChange={v => setTrustee(s => ({ ...s, phone: v }))} />
            <Field label={t("collect.their_email", "Their email")} type="email"
                   value={trustee.email} bad={bad.temail} onChange={v => setTrustee(s => ({ ...s, email: v }))} />

            <Heading>{t("collect.agreement", "Agreement")}</Heading>
            {/* Which version is being agreed to, as the website says it above
                its own rules panel. It is sent with the request as
                rules_version, so the record and the screen have to name the
                same thing — agreeing to "the rules" with no version is not a
                record of anything. */}
            <Note>{`${t("collect.version", "Version")} ${RULES_VERSION} ` +
                   t("collect.you_are_agreeing_to_this", "· you are agreeing to this version")}</Note>
            {/* The website's declaration is made ON BEHALF OF the charity —
                "I have read the rules for collection above and agree to them
                on behalf of the charity or institute named on this form." The
                app had shortened it to "I have read and agree to the rules
                for collection", which drops the only clause that makes it a
                declaration by the signatory for the body they represent. */}
            <Check value={agree} onChange={setAgree} bad={bad.agree}
                   label={t("collect.i_have_read_the_rules",
                     "I have read the *rules for collection* above and agree to them on behalf of the charity or institute named on this form.")} />
            <Check value={privacy} onChange={setPrivacy} bad={bad.privacy}
                   label={t("collect.i_understand_the_masjid_will", "I understand the masjid will keep these details to arrange and check the collection, will contact the trustee named above, and will delete them afterwards in line with its privacy notice. I confirm the trustee is content to be contacted about this.")} />
            <Press onPress={() => { tap(); open("https://taiyabahapp.ysbdesigns.uk/privacy.html"); }}
              style={{ alignSelf: "flex-start", paddingVertical: 8 }}>
              <Text style={{ fontFamily: F.sansSemi, fontSize: fs(12.5), color: C.brand600 }}>
                {t("privacy.read_the_privacy_notice", "Read the privacy notice")}</Text>
            </Press>
            <Field label={t("collect.signed_type_your_full_name", "Signed — type your full name")}
                   type="name" value={sign} bad={bad.sign} onChange={setSign} />
            <Note>{t("collect.typing_your_name_here_has", "Typing your name here has the same effect as signing the paper form. The date and time are recorded with it.")}</Note>

            <ErrorBox>{state.error}</ErrorBox>
            {/* What pressing it does and — just as important — does not do. */}
            <Note>{t("collect.the_masjid_will_contact_your",
              "The masjid will contact your trustee to confirm. Nothing here reserves a date.")}</Note>
            <Submit label={t("collect.send_this_request", "Send this request")} sending={state.sending} onPress={send} />
          </>
        )}
        {/* The charity line is the last block of the sheet above and is already
            drawn from it, so adding it again here printed it twice. */}
      </View>
    </Screen>
  );
}
