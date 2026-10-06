/* Answers, so that "it doesn't work" has somewhere to go before the office.
 *
 * This screen is the one thing in the app the website does not have, and that
 * is deliberate rather than drift. Most of what goes wrong with a phone app is
 * not reachable from a browser: Android stops the app in the background, a
 * permission is refused once and never asked again, a compass needs waving in
 * a figure of eight away from a magnetic case. A help page written for the
 * website could not answer any of those, and those are the questions people
 * actually arrive with.
 *
 * Three rules it was written to:
 *
 *   - Every answer ends in something to DO. "Contact the masjid" is the last
 *     resort, not the answer.
 *   - Where the fix depends on the phone, it says the steps for THAT phone
 *     (battery-help.js), because "check your battery settings" is the kind of
 *     advice that sounds like help and isn't.
 *   - Nothing claims more than it knows. Where the honest answer is that the
 *     masjid has to fix it — a wrong timetable — it says so, and sends them to
 *     the people who can.
 */
import React, { useState } from "react";
import { View, Text, Platform, Linking } from "react-native";
import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { Ionicons } from "@expo/vector-icons";
import { C, F, R } from "../theme";
import { useApp } from "../store";
import { Screen, Hero, Heading, Card, Note, Press, tap, open } from "../ui";
import { batteryHelp } from "../battery-help";

/* `device: true` splices in this phone's own battery steps. `settings: true`
 * adds a button into the app's system settings, which is the only place some
 * of these can actually be changed. */
const GROUPS = [
  { k: "help.g_reminders", t: "Reminders & notifications", qs: [
    { k: "help.q_none", q: "I'm not getting any reminders at all",
      a: ["Almost always the phone rather than the app. Android stops apps it thinks you are not using, and a stopped app receives nothing — the masjid's reminder is sent, everything reports it as delivered, and nothing appears."],
      device: true, settings: true,
      after: ["Then check notifications are switched on for the app, and that Jamāʿah reminders are on under Notifications."] },

    { k: "help.q_some", q: "Announcements arrive but jamāʿah reminders don't",
      a: ["These are two different things, and it is worth knowing which is which.",
          "Jamāʿah and Sūrah al-Kahf reminders are set on this phone. They arrive with no signal and nothing is sent anywhere.",
          "Janāzah, announcements and events are sent by the masjid, so those need a connection.",
          "If the ones set on this phone are missing, open Notifications, make sure Jamāʿah reminders are on, and press “Send my categories again”."] },

    { k: "help.q_late", q: "Several arrived at once, all late",
      a: ["The phone held them while the app was stopped, and let them all through at once when it was allowed to run again. Nothing was lost — but a jamāʿah reminder twenty minutes late is no use, so it is worth fixing properly."],
      device: true },

    { k: "help.q_twice", q: "I get everything twice",
      a: ["You are most likely subscribed on the masjid's website in your browser as well as in this app, and both are being sent to.",
          "Keep whichever you prefer. To stop the browser one: open the website, then your browser's site settings for it, and block notifications."] },

    { k: "help.q_refused", q: "I tapped “Don't allow” and now it won't ask again",
      a: ["Android only offers that choice once. After that it can only be changed in settings — the app cannot ask a second time."],
      settings: true,
      after: ["Notifications → allow. The reminders start straight away; nothing needs setting up again."] },

    { k: "help.q_wrongtime", q: "A reminder came at the wrong time",
      a: ["Reminders are built from the masjid's own timetable, in London time, and are rebuilt when the timetable changes.",
          "If the timetable has just changed, open Notifications and press “Send my categories again” to rebuild them on this phone.",
          "If the time in the app itself is wrong, that is the timetable rather than the reminder — see the next section."] },
  ]},

  { k: "help.g_times", t: "Prayer times", qs: [
    { k: "help.q_board", q: "The times don't match the board at the masjid",
      a: ["The app shows the masjid's own timetable. It is not calculated on the phone, so it cannot drift from the board by itself.",
          "If it does not match, the timetable is wrong rather than your phone, and nobody else is seeing the right time either. Tell the masjid and it is corrected for everyone at once."],
      mail: true },

    { k: "help.q_begins", q: "What is the difference between beginning and jamāʿah time?",
      a: ["The beginning time is when the prayer time enters. The jamāʿah time is when the congregation prays together, which is later.",
          "The full timetable has a toggle at the top to show one or the other."] },
  ]},

  { k: "help.g_qibla", t: "Qibla compass", qs: [
    { k: "help.q_spins", q: "The compass spins, or points the wrong way",
      a: ["A phone's compass is easily confused. Three things fix it almost every time:",
          "1.  Move away from anything metal — radiators, cars, desks with steel frames.",
          "2.  Take the phone out of a magnetic case or car mount. These are the most common cause by far.",
          "3.  Wave the phone slowly in a figure of eight a few times to recalibrate it.",
          "The compass also needs location permission, so that it knows which direction Makkah is from where you are. That is used on the phone and never sent anywhere."],
      settings: true },
  ]},

  { k: "help.g_app", t: "The app itself", qs: [
    { k: "help.q_text", q: "The text is too small, or in the wrong language",
      a: ["More → System Preferences. Text size and language are both there, and both apply everywhere in the app straight away."] },

    { k: "help.q_blank", q: "A screen is blank, or will not load",
      a: ["More → Notifications → Having trouble? → “Reset & reload the app”.",
          "That clears what the app has stored and starts it again. Prayer times, duʿās and the Qurʾān are built in, so nothing is lost."] },

    { k: "help.q_offline", q: "Does it work without internet?",
      a: ["Most of it, yes. Prayer times, the full timetable, duʿās, athkār and the Qurʾān are built into the app and work with no signal at all.",
          "Announcements, videos, the live stream, and any form or payment need a connection."] },
  ]},

  { k: "help.g_pay", t: "Payments and forms", qs: [
    { k: "help.q_paid", q: "I paid but heard nothing back",
      a: ["The receipt comes from Stripe to the email address you gave at the checkout, usually within a minute. Check the spam folder first — it is nearly always there.",
          "A booking or a request is confirmed separately by the masjid, which takes longer than the payment does. If you need to chase it, have the reference from the receipt to hand."],
      mail: true },

    { k: "help.q_form", q: "A form would not send",
      a: ["Forms need a connection, so check that first and try once more.",
          "If it still will not send, ring the office rather than trying repeatedly — a request that half-sent is better sorted out by a person."],
      mail: true },
  ]},
];

export default function Help() {
  const { t, fs, rtl } = useApp();
  /* Urdu and Arabic read right to left. Every line on this screen is prose
   * rather than a label, so getting this wrong is not a cosmetic slip — it is
   * a paragraph that starts in the wrong corner and reads as broken. */
  const dir = { writingDirection: rtl ? "rtl" : "ltr", textAlign: rtl ? "right" : "left" };
  const [open_, setOpen] = useState(null);
  const help = React.useMemo(batteryHelp, []);

  /* Enough for somebody at the masjid to act on, and nothing that is not
   * already on this screen. No name, no number, nothing from the forms. */
  async function mailUs(about) {
    tap();
    let perm = "unknown";
    try { perm = (await Notifications.getPermissionsAsync()).status; } catch {}
    const c = Platform.constants || {};
    const body =
      `\n\n—\n${t("help.sent_from", "Sent from the app")}\n` +
      `App: ${Constants.expoConfig?.version || "?"}\n` +
      `Phone: ${c.Manufacturer || "?"} ${c.Model || ""}, Android ${c.Release || "?"}\n` +
      `Notifications: ${perm}\n`;
    open(`mailto:admin@taiyabahmasjid.com?subject=${encodeURIComponent(about)}&body=${encodeURIComponent(body)}`);
  }

  return (
    <Screen>
      <Hero lines={[t("help.title", "Help")]} />
      <View style={{ padding: 16, gap: 14 }}>
        <Note>{t("help.intro",
          "The answer to most problems is here, and is quicker than waiting for a reply. If none of it helps, the masjid is at the bottom.")}</Note>

        {GROUPS.map(g => (
          <View key={g.k} style={{ gap: 9 }}>
            <Heading>{t(g.k, g.t)}</Heading>
            {g.qs.map(item => {
              const isOpen = open_ === item.k;
              return (
                <Card key={item.k} pad={0} gap={0}>
                  <Press onPress={() => { tap(); setOpen(isOpen ? null : item.k); }}
                    style={{ flexDirection: rtl ? "row-reverse" : "row", alignItems: "center",
                             gap: 10, padding: 14 }}>
                    <Text style={[{ flex: 1, fontFamily: F.sansMedium, fontSize: fs(13.5),
                                    color: C.ink, lineHeight: fs(20) }, dir]}>
                      {t(item.k, item.q)}</Text>
                    <Ionicons name={isOpen ? "chevron-up" : "chevron-down"} size={16} color={C.muted} />
                  </Press>

                  {isOpen && (
                    <View style={{ paddingHorizontal: 14, paddingBottom: 14, gap: 9 }}>
                      {t(`${item.k}_a`, item.a.join("\n\n")).split("\n\n").map((line, i) => (
                        <Text key={i} style={[{ fontFamily: F.sans, fontSize: fs(12.5), color: C.muted,
                                                lineHeight: fs(20) }, dir]}>{line}</Text>))}

                      {/* The steps for this phone, not for a phone in general. */}
                      {item.device && !!help && (
                        <View style={{ gap: 6, marginTop: 2 }}>
                          <Text style={[{ fontFamily: F.sansMedium, fontSize: fs(12.5), color: C.ink }, dir]}>
                            {help.name
                              ? t("help.on_phone", "On your {brand} phone:").replace("{brand}", help.name)
                              : t("help.on_this_phone", "On this phone:")}</Text>
                          {help.steps.map((line, i) => (
                            <Text key={i} style={[{ fontFamily: F.sans, fontSize: fs(12.5), color: C.muted,
                                                    lineHeight: fs(20) }, dir,
                                                    rtl ? { paddingRight: 10 } : { paddingLeft: 10 }]}>
                              {`${i + 1}.  ${line}`}</Text>))}
                        </View>)}

                      {!!item.after && t(`${item.k}_after`, item.after.join("\n\n")).split("\n\n").map((line, i) => (
                        <Text key={`x${i}`} style={[{ fontFamily: F.sans, fontSize: fs(12.5), color: C.muted,
                                                      lineHeight: fs(20) }, dir]}>{line}</Text>))}

                      {item.settings && Platform.OS !== "web" && (
                        <Press onPress={() => { tap(); Linking.openSettings().catch(() => {}); }}
                          style={{ alignItems: "center", paddingVertical: 11, borderRadius: R.pill,
                                   borderWidth: 1, borderColor: C.line, marginTop: 3 }}>
                          <Text style={{ fontFamily: F.sansMedium, fontSize: fs(12.5), color: C.ink }}>
                            {t("alerts.open_app_settings", "Open this app's settings")}</Text>
                        </Press>)}

                      {item.mail && (
                        <Press onPress={() => mailUs(t(item.k, item.q))}
                          style={{ alignItems: "center", paddingVertical: 11, borderRadius: R.pill,
                                   borderWidth: 1, borderColor: C.line, marginTop: 3 }}>
                          <Text style={{ fontFamily: F.sansMedium, fontSize: fs(12.5), color: C.ink }}>
                            {t("help.tell_the_masjid", "Tell the masjid")}</Text>
                        </Press>)}
                    </View>)}
                </Card>);
            })}
          </View>))}

        <Heading>{t("help.g_stuck", "Still stuck")}</Heading>
        <Card gap={10}>
          <Text style={[{ fontFamily: F.sans, fontSize: fs(12.5), color: C.muted, lineHeight: fs(20) }, dir]}>
            {t("help.stuck_body",
              "Say what you expected and what happened instead. The message carries which phone you are on and whether notifications are allowed, which is usually what settles it.")}</Text>
          <Press onPress={() => mailUs(t("help.subject", "Help with the app"))}
            style={{ alignItems: "center", paddingVertical: 13, borderRadius: R.pill,
                     backgroundColor: C.brand600 }}>
            <Text style={{ fontFamily: F.sansBold, fontSize: fs(13.5), color: C.cream }}>
              {t("help.email_the_masjid", "Email the masjid")}</Text>
          </Press>
          {/* The same number, and the same hours, the rest of the app gives.
            * A help screen that sends somebody to a different line than the
            * Imams' Advice page is its own small failure. */}
          <Press onPress={() => { tap(); open("tel:01204535997"); }}
            style={{ alignItems: "center", paddingVertical: 11, borderRadius: R.pill,
                     borderWidth: 1, borderColor: C.line }}>
            <Text style={{ fontFamily: F.sansMedium, fontSize: fs(12.5), color: C.ink }}>
              {t("help.ring_the_masjid", "Ring the masjid")} · 01204 535 997 · 5pm to 7pm</Text>
          </Press>
        </Card>
      </View>
    </Screen>
  );
}
