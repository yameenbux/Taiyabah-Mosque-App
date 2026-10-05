/* A question for the imams.
 *
 * Writes through request_imam_advice(), which is also what decides whether the
 * masjid is taking written questions at all — asked of Postgres rather than a
 * flag in the app, so the app and the website cannot drift.
 */
import React, { useEffect, useState } from "react";
import { View } from "react-native";
import { useApp } from "../store";
import { Screen, Hero, Heading, Note, Notice, RowGroup, NavRow, Foot, P } from "../ui";
import { Field, ErrorBox, Submit, Sent, isEmail, isPhone } from "../form";
import { rpc, isOpen } from "../supabase";
import { SHEETS, Blocks } from "../Blocks";

export default function Advice({ navigation }) {
  const { t } = useApp();
  const [open, setOpen] = useState(null);
  const [v, setV] = useState({ name: "", phone: "", email: "", subject: "", question: "" });
  const [state, setState] = useState({});
  const [touched, setTouched] = useState(false);
  useEffect(() => { isOpen("request_imam_advice").then(setOpen); }, []);

  const bad = {
    name: touched && !v.name.trim(), phone: touched && !isPhone(v.phone),
    email: touched && !isEmail(v.email), subject: touched && !v.subject.trim(),
    question: touched && v.question.trim().length < 10,
  };
  const valid = v.name.trim() && isPhone(v.phone) && isEmail(v.email) &&
                v.subject.trim() && v.question.trim().length >= 10;

  async function send() {
    setTouched(true);
    if (!valid) {
      setState({ error: t("advice.check_the_form",
        "Please fill in every box, and check the email address — that is where the answer goes.") });
      return;
    }
    setState({ sending: true });
    const r = await rpc("request_imam_advice", {
      name: v.name.trim(), phone: v.phone.trim(), email: v.email.trim(),
      subject: v.subject.trim(), question: v.question.trim(),
    });
    if (r.ok) { setState({ sent: true, reference: r.data.reference }); return; }
    setState({ error: r.message || t("advice.couldnt_send",
      "That didn't send. Please try again, or ask at the masjid office.") });
  }

  const sheet = SHEETS.advice;
  const hero = sheet?.blocks.find(b => b.type === "hero");

  if (state.sent)
    return (
      <Screen>
        <Sent title={t("advice.question_sent", "Your question is with the imams")}
              body={t("advice.answer_by_email",
                "The answer comes back to the email address you gave. Questions are answered in the order they arrive, and some take a few days.")}
              reference={state.reference} />
      </Screen>);

  return (
    <Screen pad={false}>
      {!!hero && <Hero lines={hero.lines} />}
      <View style={{ paddingHorizontal: 16 }}>
        <Blocks blocks={sheet?.blocks.filter(b => b.type !== "hero") || []} nav={navigation} />

        {open === false ? (
          <>
            <Heading>{t("advice.questions", "Questions")}</Heading>
            <Notice>{t("advice.not_taking_written",
              "The masjid is not taking written questions at the moment.")}</Notice>
            <RowGroup>
              <NavRow icon="call-outline" label={t("advice.call_the_main_office_to", "Call the main office to book")}
                      sub="01204 535 997 · 5pm to 7pm" href="tel:01204535997" />
              <NavRow icon="mail-outline" label={t("advice.or_write_to_them", "Or write to them")}
                      sub="info@taiyabahmasjid.com" href="mailto:info@taiyabahmasjid.com" />
            </RowGroup>
          </>
        ) : (
          <>
            <Heading>{t("advice.ask_a_question", "Ask a question")}</Heading>
            {/* Why the form asks for everything it asks for, and what will and
                will not happen afterwards. The website says both; without them
                the form looks nosy and its silence afterwards looks broken. */}
            <Note>{t("advice.every_box_is_needed_so",
              "Every box is needed: the imam has to know who he is answering, where to send his answer, and what the question is about.")}</Note>
            <Field label={t("advice.your_name", "Your name")} type="name" value={v.name} bad={bad.name}
                   onChange={x => setV(s => ({ ...s, name: x }))} />
            <Field label={t("advice.phone_number", "Phone number")} type="tel" value={v.phone} bad={bad.phone}
                   onChange={x => setV(s => ({ ...s, phone: x }))} />
            <Field label={t("advice.email", "Email")} type="email" value={v.email} bad={bad.email}
                   hint={t("advice.the_imams_answer_is_sent_here", "The imam’s answer is sent to this address, so please check it.")}
                   onChange={x => setV(s => ({ ...s, email: x }))} />
            <Field label={t("advice.what_it_is_about", "What it is about — one short line")} value={v.subject} bad={bad.subject}
                   onChange={x => setV(s => ({ ...s, subject: x }))} />
            <Field label={t("advice.your_question", "Your question")} type="multi" value={v.question} bad={bad.question}
                   onChange={x => setV(s => ({ ...s, question: x }))} />
            <ErrorBox>{state.error}</ErrorBox>
            <Note>{t("advice.you_will_get_no_email_confirming",
              "You will not get an email confirming this was sent — your reference is shown on the next screen, so keep it.")}</Note>
            {/* Who sees it. For some of what people write here, this is the
                single most important sentence on the screen. */}
            <Heading>{t("advice.who_reads_this", "Who reads this")}</Heading>
            <Note>{t("advice.what_you_write_here_is_read",
              "What you write here is read by *the imams and by nobody else at the masjid* — not the office, not the committee, not an administrator. The imam answers you by email.")}</Note>
            <Note>{t("advice.if_this_is_urgent_please_ring",
              "If this is urgent, or you would rather speak to somebody, please ring the number above instead of writing.")}</Note>
            <Submit label={t("advice.send_this_to_the_imams", "Send this to the imams")}
                    sending={state.sending} onPress={send} />
          </>
        )}
        <Foot lines={["Bolton Central Islamic Society · Registered charity 1041569"]} />
      </View>
    </Screen>
  );
}
