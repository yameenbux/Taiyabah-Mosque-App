/* Notifications, laid out the way the website lays them out.
 *
 * This screen used to offer five switches, one per prayer. The website has
 * never done that: it has ONE jamāʿah switch and a "remind me N minutes
 * before", then the four things the masjid sends — janāzah, announcements,
 * events, and the Friday reminder for Sūrah al-Kahf. Somebody who set their
 * notifications up on the website should find the same choices here, in the
 * same order, with the same words.
 *
 * What is real and what is not, plainly: the jamāʿah reminders and the Kahf
 * reminder are scheduled on the phone itself, so they work with no signal. The
 * other three are sent BY the masjid and need the push service, which is on
 * the website and is not yet wired into this app — so those three are saved
 * and will take effect as soon as it is.
 */
import React, { useEffect, useState } from "react";
import { View, Text, Switch, Linking, Modal } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import * as Notifications from "expo-notifications";
import { Ionicons } from "@expo/vector-icons";
import { C, F, R, SHADOW } from "../theme";
import { useApp } from "../store";
import { Screen, TopBar, Heading, Card, Note, P, Press, tap, open } from "../ui";
import { ORDER } from "../prayer";
import { arm, ask } from "../reminders";
import { syncTags, optIn, optOut, whoAmI } from "../push";
import { batteryHelp } from "../battery-help";

const MINS = [5, 10, 15, 20, 30];

function Row({ title, sub, badge, value, onChange, first }) {
  const { fs, rtl } = useApp();
  return (
    <View style={{ borderTopWidth: first ? 0 : 1, borderTopColor: C.line,
                   flexDirection: rtl ? "row-reverse" : "row", alignItems: "center",
                   gap: 12, paddingHorizontal: 15, paddingVertical: 13 }}>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: rtl ? "row-reverse" : "row", alignItems: "center", gap: 7 }}>
          <Text style={{ fontFamily: F.sansSemi, fontSize: fs(14.5), color: C.ink }}>{title}</Text>
          {!!badge && (
            <Text style={{ fontFamily: F.sansBold, fontSize: fs(9.5), letterSpacing: .8,
                           textTransform: "uppercase", color: C.danger, borderWidth: 1,
                           borderColor: C.danger, borderRadius: R.pill, paddingHorizontal: 7,
                           paddingVertical: 2, overflow: "hidden" }}>{badge}</Text>)}
        </View>
        {!!sub && (
          <Text style={{ fontFamily: F.sans, fontSize: fs(12.5), color: C.muted, marginTop: 2 }}>{sub}</Text>)}
      </View>
      {/* Left to itself the track is almost the colour of the card, so all you
          can see is the knob — which read as a broken half-moon on a phone. */}
      <Switch value={value} onValueChange={onChange}
              /* .switch: the track is #D9D2C0 off and brand-600 on, and the
                 knob is plain white either way. This had a washed-out track
                 with a GREEN knob on it — a colour that appears nowhere in
                 this masjid's palette. */
              trackColor={{ false: "#D9D2C0", true: C.brand600 }}
              thumbColor="#FFFFFF"
              /* react-native-web ignores thumbColor once the switch is ON and
                 uses its own teal, so the comparison screenshots showed a
                 green knob the phone never draws. Android honours thumbColor
                 for both states and ignores this prop; setting it only makes
                 the web render tell the truth. */
              activeThumbColor="#FFFFFF"
              ios_backgroundColor={C.line} />
    </View>);
}

export default function Alerts() {
  const { t, fs, rtl, alerts, setAlerts } = useApp();
  const [granted, setGranted] = useState(null);
  const [armed, setArmed] = useState(null);
  const [saved, setSaved] = useState(false);
  const [diag, setDiag] = useState(false);
  const [pickMins, setPickMins] = useState(false);
  const nav = useNavigation();
  /* Worked out once from the manufacturer; it cannot change while the app is
   * open, and it is null on anything that is not Android. */
  const help = React.useMemo(batteryHelp, []);
  const [who, setWho] = useState(null);

  useEffect(() => {
    Notifications.getPermissionsAsync()
      .then(p => setGranted(p.status === "granted"))
      .catch(() => setGranted(false));
  }, []);

  /* The count is a reading of what the OS is actually holding, not a promise.
   * A reminder somebody believes in and never gets is worse than none. */
  const rearm = async next => {
    if (!granted) return;
    const a = { ...alerts, ...next };
    const per = {};
    if (a.jamaah) for (const k of ORDER) per[k] = a.mins;
    setArmed(await arm(per, { kahf: a.kahf }));
  };
  useEffect(() => { rearm({}); }, [granted, alerts]);

  const enable = async () => {
    tap();
    const ok = await ask();
    setGranted(ok);
  };

  const set = patch => { tap(); setAlerts(patch); setSaved(false); };

  /* The three the masjid sends are tags on this device, and a tag written is
   * the whole of what makes a phone reachable by a targeted send. Written when
   * Save is pressed rather than on every flick of a switch, so a person
   * changing their mind four times does not queue four writes. */
  const [tagState, setTagState] = useState(null);
  const saveAll = async () => {
    tap(); setSaved(true);
    await rearm({});
    const wantsAny = alerts.janazah || alerts.announcements || alerts.events || alerts.kahf;
    if (wantsAny) await optIn(); else await optOut();
    setTagState(await syncTags(alerts));
  };

  return (
    <Screen pad={false}>
      {/* The website has no hero on this page — it is a page under the masjid's
          own top bar, and the sentence that was in the hero's sub belongs
          inside the card, above Enable, which is where the site puts it.
          A hero here said "Notifications" and then the heading said "Prayer
          alerts" directly underneath, which is the same screen named twice. */}
      <LinearGradient colors={[C.brand900, C.brand800]} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}>
        <TopBar back onBell={() => nav.navigate("NoticesTab")} />
      </LinearGradient>
      <View style={{ paddingHorizontal: 16 }}>
        <Heading>{t("sheet.prayer_alerts", "Prayer alerts")}</Heading>

        {/* .alerts — the intro, the Enable button, every toggle and Save are
            ONE card padded 16. They were three loose pieces on the paper with
            only the toggles in a card, so the button that grants permission
            and the button that saves the choices looked unrelated to the
            choices between them. */}
        <Card pad={16}>
        <P style={{ fontSize: fs(13.5), lineHeight: fs(20), color: C.muted, marginBottom: 15 }}>
          {t("sheet.get_a_quiet_reminder_before",
            "Get a quiet reminder before each jamāʿah, plus masjid announcements — on this device.")}</P>

        {granted === false && (
          /* .enable is a brand-700 to brand-800 gradient at 13px of radius
             with the shared lift under it, not a flat brand-600 pill. */
          <Press onPress={enable} style={{ marginBottom: 14, borderRadius: 13, overflow: "hidden", ...SHADOW }}>
            <LinearGradient colors={[C.brand700, C.brand800]} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
              style={{ alignItems: "center", paddingVertical: 14 }}>
              <Text style={{ fontFamily: F.sansSemi, fontSize: fs(15), letterSpacing: 0.2, color: C.cream }}>
                {t("sheet.enable_notifications", "Enable notifications")}</Text>
            </LinearGradient>
          </Press>)}

        {/* .toggles — HALF FADED and inert until notifications are granted.
            The website will not let anybody set reminders that cannot be
            delivered; the app let them be set and saved against a permission
            that had been refused. */}
        <View pointerEvents={granted === false ? "none" : "auto"}
              style={{ opacity: granted === false ? 0.45 : 1 }}>
        <View style={{ borderTopWidth: 1, borderTopColor: C.line }}>
          <Row first
            title={t("sheet.jama_ah_reminders", "Jamāʿah reminders")}
            sub={t("sheet.a_nudge_before_each_congregation", "A nudge before each congregation")}
            value={!!alerts.jamaah} onChange={v => set({ jamaah: v })} />

          {/* .mins — ONE sentence with a select sitting inside it: "Remind me
              [10 min] before jamāʿah". A row of five chips said the same thing
              and read as a filter, so the sentence came apart.
              The box is the website's select exactly: white, a line border,
              9px of radius, 6/9 of padding, the value at weight 600 in ink.
              Tapping it opens the list, which is what a select does on a
              phone — there is no native control shaped like an HTML one. */}
          <View style={{ flexDirection: rtl ? "row-reverse" : "row", alignItems: "center", gap: 9,
                         borderTopWidth: 1, borderTopColor: C.line,
                         paddingHorizontal: 15, paddingTop: 12, paddingBottom: 12,
                         opacity: alerts.jamaah ? 1 : .45 }}>
            <Text style={{ fontFamily: F.sans, fontSize: fs(13), color: C.muted }}>
              {t("sheet.remind_me", "Remind me")}</Text>
            <Press disabled={!alerts.jamaah} onPress={() => { tap(); setPickMins(true); }}
              style={{ flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#fff",
                       borderWidth: 1, borderColor: C.line, borderRadius: 9,
                       paddingHorizontal: 9, paddingVertical: 6 }}>
              <Text style={{ fontFamily: F.sansSemi, fontSize: fs(13), color: C.ink }}>
                {t(`sheet.${alerts.mins}_min`, `${alerts.mins} min`)}</Text>
              <Ionicons name="chevron-down" size={13} color={C.muted} />
            </Press>
            <Text style={{ fontFamily: F.sans, fontSize: fs(13), color: C.muted }}>
              {t("sheet.before_jamaah", "before jamāʿah")}</Text>
          </View>

          <Modal transparent visible={pickMins} animationType="fade" onRequestClose={() => setPickMins(false)}>
            <Press onPress={() => setPickMins(false)}
              style={{ flex: 1, backgroundColor: "rgba(21,6,15,.5)", justifyContent: "flex-end" }}>
              <View style={{ backgroundColor: C.card, borderTopLeftRadius: 22, borderTopRightRadius: 22,
                             paddingTop: 10, paddingBottom: 28 }}>
                {MINS.map(m => (
                  <Press key={m} onPress={() => { tap(); set({ mins: m }); setPickMins(false); }}
                    style={{ paddingVertical: 15, paddingHorizontal: 22, flexDirection: "row",
                             alignItems: "center", justifyContent: "space-between" }}>
                    <Text style={{ fontFamily: alerts.mins === m ? F.sansBold : F.sans, fontSize: fs(15),
                                   color: alerts.mins === m ? C.brand600 : C.ink }}>
                      {t(`sheet.${m}_min`, `${m} min`)}</Text>
                    {alerts.mins === m && <Ionicons name="checkmark" size={18} color={C.brand600} />}
                  </Press>))}
              </View>
            </Press>
          </Modal>

          <Row title={t("sheet.janazah", "Janāzah")} badge={t("sheet.urgent", "Urgent")}
            sub={t("sheet.funeral_prayer_announcements", "Funeral prayer announcements")}
            value={!!alerts.janazah} onChange={v => set({ janazah: v })} />
          <Row title={t("sheet.announcements", "Announcements")}
            sub={t("sheet.timetable_changes_ramadan_eid", "Timetable changes, Ramadan, Eid")}
            value={!!alerts.announcements} onChange={v => set({ announcements: v })} />
          <Row title={t("sheet.events_talks", "Events & talks")}
            sub={t("sheet.bayaans_classes_community_events", "Bayaans, classes, community events")}
            value={!!alerts.events} onChange={v => set({ events: v })} />
          <Row title={t("sheet.surah_al_kahf", "Sūrah al-Kahf")}
            sub={t("sheet.friday_morning_reminder", "Friday morning, a reminder to read it")}
            value={!!alerts.kahf} onChange={v => set({ kahf: v })} />
        </View>

        {/* .save: filled brand-700, cream text, 12px of radius, 13px of
           padding. An outlined pill reads as the secondary action, and on
           this screen Save is the only thing that commits anything. */}
        <Press onPress={saveAll} disabled={granted === false}
          style={{ alignItems: "center", paddingVertical: 13, borderRadius: 12,
                   backgroundColor: C.brand700, marginTop: 14 }}>
          <Text style={{ fontFamily: F.sansBold, fontSize: fs(14.5), letterSpacing: 0.2, color: C.cream }}>
            {saved ? `${t("sheet.notifications_on", "Notifications on")} · ${t("sheet.change", "Change")}`
                   : t("sheet.save", "Save")}</Text>
        </Press>
        </View>

        {/* .troublebtn — 12px semibold in the MUTED grey and UNDERLINED,
            centred under the card. It was plum and unlined, which made a last
            resort look like the next thing to press. */}
        <Press onPress={() => { tap(); setDiag(d => !d); }}
          style={{ alignSelf: "center", paddingVertical: 10, marginTop: 10 }}>
          <Text style={{ fontFamily: F.sansSemi, fontSize: fs(12), color: C.muted,
                         textDecorationLine: "underline" }}>
            {t("sheet.having_trouble", "Having trouble?")}</Text>
        </Press>
        </Card>

        {granted === false
          ? <Note>{t("alerts.turned_off", "Notifications are turned off for this app. Turn them on in Android settings and they will start straight away.")}</Note>
          : armed !== null && (
            <Note>{armed === 0
              ? t("alerts.none_set", "No reminders set.")
              : `${armed} ${t("alerts.scheduled", "reminders are scheduled on this phone.")}`}</Note>)}

        {/* The website's diagnostics, opened from the link inside the card
            above. When a reminder does not arrive the answer is almost always
            one of three things, and a person with no way to check any of them
            simply decides the app does not work. */}

        {diag && (
          <Card gap={10}>
            {/* FIRST, because it is the answer far more often than anything
                below it. A phone that has stopped the app in the background
                receives nothing — the masjid's send succeeds, every dashboard
                says delivered, and nothing appears. Only the person holding
                the phone can undo that, so the steps are for THEIR phone. */}
            {!!help && (
              <View style={{ gap: 7 }}>
                <Text style={{ fontFamily: F.sansSemi, fontSize: fs(12.5), color: C.ink }}>
                  {t("alerts.nothing_arriving", "Reminders not arriving at all?")}</Text>
                <Text style={{ fontFamily: F.sans, fontSize: fs(12), color: C.muted, lineHeight: fs(19) }}>
                  {help.name
                    ? t("alerts.phones_stop_apps", "{brand} phones stop apps running in the background to save battery, and a stopped app cannot receive anything. On this phone:").replace("{brand}", help.name)
                    : t("alerts.phones_stop_apps_generic", "Android stops apps running in the background to save battery, and a stopped app cannot receive anything. On this phone:")}
                </Text>
                {help.steps.map((line, i) => (
                  <Text key={i} style={{ fontFamily: F.sans, fontSize: fs(12), color: C.muted,
                                         lineHeight: fs(19), paddingLeft: 10 }}>
                    {`${i + 1}.  ${line}`}
                  </Text>))}
                <Press onPress={() => { tap(); Linking.openSettings().catch(() => {}); }}
                  style={{ alignItems: "center", paddingVertical: 11, borderRadius: R.pill,
                           borderWidth: 1, borderColor: C.line, marginTop: 3 }}>
                  <Text style={{ fontFamily: F.sansSemi, fontSize: fs(12.5), color: C.ink }}>
                    {t("alerts.open_app_settings", "Open this app's settings")}</Text>
                </Press>
              </View>)}

            {/* The id this phone is known by, so one handset can be sent a test
                rather than the whole congregation. */}
            <Press onPress={async () => { tap(); setWho(await whoAmI()); }}
              style={{ alignItems: "center", paddingVertical: 11, borderRadius: R.pill,
                       borderWidth: 1, borderColor: C.line }}>
              <Text style={{ fontFamily: F.sansSemi, fontSize: fs(12.5), color: C.ink }}>
                {t("alerts.show_this_device_id", "Show this device's notification id")}</Text>
            </Press>
            {!!who && (
              <Text selectable style={{ fontFamily: F.sans, fontSize: fs(11), color: C.muted,
                                        lineHeight: fs(18) }}>
                {`subscription: ${who.sub || "—"}\nuser: ${who.user || "—"}\nsubscribed: ${who.optedIn ? "yes" : "no"}${who.error ? "\n" + who.error : ""}`}
              </Text>)}
            <Text style={{ fontFamily: F.sans, fontSize: fs(12), color: C.muted, lineHeight: fs(19) }}>
              {`${t("alerts.permission", "Permission")}: ${granted ? t("sheet.notifications_on", "Notifications on") : t("alerts.notifications_off", "Notifications off")}\n` +
               `${t("alerts.scheduled_now", "Scheduled now")}: ${armed ?? "—"}\n` +
               `${t("sheet.jama_ah_reminders", "Jamāʿah reminders")}: ${alerts.jamaah ? `${alerts.mins} min` : "—"}`}
            </Text>
            <Press onPress={async () => { tap(); await rearm({}); }}
              style={{ alignItems: "center", paddingVertical: 11, borderRadius: R.pill,
                       borderWidth: 1, borderColor: C.line }}>
              <Text style={{ fontFamily: F.sansSemi, fontSize: fs(12.5), color: C.ink }}>
                {t("sheet.send_my_categories_again", "Send my categories again")}</Text>
            </Press>
            <Press onPress={() => { tap(); open(`mailto:admin@taiyabahmasjid.com?subject=${encodeURIComponent("App notifications")}&body=${encodeURIComponent(`Permission: ${granted}\nScheduled: ${armed}\nJamaah: ${alerts.jamaah ? alerts.mins + " min" : "off"}\nKahf: ${alerts.kahf}`)}`); }}
              style={{ alignItems: "center", paddingVertical: 11, borderRadius: R.pill,
                       borderWidth: 1, borderColor: C.line }}>
              <Text style={{ fontFamily: F.sansSemi, fontSize: fs(12.5), color: C.ink }}>
                {t("sheet.send_this_report_to_the", "Send this report to the masjid")}</Text>
            </Press>
            <Press onPress={async () => { tap(); await Notifications.cancelAllScheduledNotificationsAsync(); await rearm({}); }}
              style={{ alignItems: "center", paddingVertical: 11, borderRadius: R.pill,
                       borderWidth: 1, borderColor: C.line }}>
              <Text style={{ fontFamily: F.sansSemi, fontSize: fs(12.5), color: C.ink }}>
                {t("sheet.reset_reload_the_app", "Reset & reload the app")}</Text>
            </Press>
            <Note>{t("sheet.this_clears_the_app_s",
              "This clears the app’s stored files and re-installs its background service. Your prayer times are built in, so nothing is lost.")}</Note>
            {/* Everything else somebody might be here about. The answers live
              * in one place rather than being half-copied into two. */}
            <Press onPress={() => { tap(); nav.navigate("Help"); }}
              style={{ alignItems: "center", paddingVertical: 11, borderRadius: R.pill,
                       borderWidth: 1, borderColor: C.line }}>
              <Text style={{ fontFamily: F.sansSemi, fontSize: fs(12.5), color: C.ink }}>
                {t("alerts.more_answers", "More answers in Help")}</Text>
            </Press>
          </Card>)}

        <Note>{t("alerts.what_comes_from_where",
          "Jamāʿah and Sūrah al-Kahf reminders are set on this phone and arrive with no signal. Janāzah, announcements and events are sent by the masjid, so those need a connection.")}</Note>
        {!!tagState && tagState !== "stored" && (
          <Note>{t("alerts.choices_not_stored",
            "Your choices for the masjid's announcements could not be saved just now. They are kept on this phone and will be sent again next time you press Save.")}</Note>)}
      </View>
    </Screen>
  );
}
