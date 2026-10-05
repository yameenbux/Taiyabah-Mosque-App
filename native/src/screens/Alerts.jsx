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
import { View, Text, Switch } from "react-native";
import * as Notifications from "expo-notifications";
import { Ionicons } from "@expo/vector-icons";
import { C, F, R } from "../theme";
import { useApp } from "../store";
import { Screen, Hero, Heading, Card, Note, Press, tap, open } from "../ui";
import { ORDER } from "../prayer";
import { arm, ask } from "../reminders";
import { syncTags, optIn, optOut, whoAmI } from "../push";

const MINS = [5, 10, 15, 20, 30];

function Row({ title, sub, badge, value, onChange, first }) {
  const { fs, rtl } = useApp();
  return (
    <View style={{ borderTopWidth: first ? 0 : 1, borderTopColor: C.line,
                   flexDirection: rtl ? "row-reverse" : "row", alignItems: "center",
                   gap: 12, paddingHorizontal: 15, paddingVertical: 13 }}>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: rtl ? "row-reverse" : "row", alignItems: "center", gap: 7 }}>
          <Text style={{ fontFamily: F.sansMedium, fontSize: fs(14.5), color: C.ink }}>{title}</Text>
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
              trackColor={{ false: C.line, true: "rgba(94,24,68,.45)" }}
              thumbColor={value ? C.brand600 : "#f4f3f4"}
              ios_backgroundColor={C.line} />
    </View>);
}

export default function Alerts() {
  const { t, fs, rtl, alerts, setAlerts } = useApp();
  const [granted, setGranted] = useState(null);
  const [armed, setArmed] = useState(null);
  const [saved, setSaved] = useState(false);
  const [diag, setDiag] = useState(false);
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
      <Hero lines={[
        { k: "menu.notifications", t: "Notifications", w: "title" },
        { k: "sheet.get_a_quiet_reminder_before",
          t: "Get a quiet reminder before each jamāʿah, plus masjid announcements — on this device.", w: "sub" },
      ]} />
      <View style={{ paddingHorizontal: 16 }}>
        <Heading>{t("sheet.prayer_alerts", "Prayer alerts")}</Heading>

        {granted === false && (
          <Press onPress={enable}
            style={{ alignItems: "center", paddingVertical: 14, borderRadius: R.pill,
                     backgroundColor: C.brand600, marginBottom: 14 }}>
            <Text style={{ fontFamily: F.sansBold, fontSize: fs(14), color: C.cream }}>
              {t("sheet.enable_notifications", "Enable notifications")}</Text>
          </Press>)}

        <Card gap={0} pad={0}>
          <Row first
            title={t("sheet.jama_ah_reminders", "Jamāʿah reminders")}
            sub={t("sheet.a_nudge_before_each_congregation", "A nudge before each congregation")}
            value={!!alerts.jamaah} onChange={v => set({ jamaah: v })} />

          {/* "Remind me [10 min] before jamāʿah", as one sentence the way the
              website writes it, with the choices inline. */}
          <View style={{ borderTopWidth: 1, borderTopColor: C.line, paddingHorizontal: 15, paddingVertical: 13,
                         opacity: alerts.jamaah ? 1 : .45 }}>
            <Text style={{ fontFamily: F.sans, fontSize: fs(13), color: C.muted, marginBottom: 9 }}>
              {t("sheet.remind_me", "Remind me")} · {t("sheet.before_jamaah", "before jamāʿah")}</Text>
            <View style={{ flexDirection: rtl ? "row-reverse" : "row", flexWrap: "wrap", gap: 7 }}>
              {MINS.map(m => {
                const on = alerts.mins === m;
                return (
                  <Press key={m} disabled={!alerts.jamaah} onPress={() => set({ mins: m })}
                    style={{ paddingHorizontal: 13, paddingVertical: 7, borderRadius: R.pill,
                             borderWidth: 1, borderColor: on ? C.brand600 : C.line,
                             backgroundColor: on ? "rgba(94,24,68,.1)" : "transparent" }}>
                    <Text style={{ fontFamily: F.sansMedium, fontSize: fs(12.5),
                                   color: on ? C.brand600 : C.muted }}>
                      {t(`sheet.${m}_min`, `${m} min`)}</Text>
                  </Press>);
              })}
            </View>
          </View>

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
        </Card>

        <Press onPress={saveAll}
          style={{ alignItems: "center", paddingVertical: 13, borderRadius: R.pill,
                   borderWidth: 1, borderColor: C.brand600, marginTop: 14 }}>
          <Text style={{ fontFamily: F.sansBold, fontSize: fs(14), color: C.brand600 }}>
            {saved ? `${t("sheet.notifications_on", "Notifications on")} · ${t("sheet.change", "Change")}`
                   : t("sheet.save", "Save")}</Text>
        </Press>

        {granted === false
          ? <Note>{t("alerts.turned_off", "Notifications are turned off for this app. Turn them on in Android settings and they will start straight away.")}</Note>
          : armed !== null && (
            <Note>{armed === 0
              ? t("alerts.none_set", "No reminders set.")
              : `${armed} ${t("alerts.scheduled", "reminders are scheduled on this phone.")}`}</Note>)}

        {/* The website's diagnostics. When a reminder does not arrive, the
            answer is almost always one of three things, and a person with no
            way to check any of them simply decides the app does not work. */}
        <Press onPress={() => { tap(); setDiag(d => !d); }}
          style={{ alignItems: "center", paddingVertical: 11, marginTop: 14 }}>
          <Text style={{ fontFamily: F.sansMedium, fontSize: fs(13), color: C.brand600 }}>
            {t("sheet.having_trouble", "Having trouble?")}</Text>
        </Press>

        {diag && (
          <Card gap={10}>
            {/* The id this phone is known by, so one handset can be sent a test
                rather than the whole congregation. */}
            <Press onPress={async () => { tap(); setWho(await whoAmI()); }}
              style={{ alignItems: "center", paddingVertical: 11, borderRadius: R.pill,
                       borderWidth: 1, borderColor: C.line }}>
              <Text style={{ fontFamily: F.sansMedium, fontSize: fs(12.5), color: C.ink }}>
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
              <Text style={{ fontFamily: F.sansMedium, fontSize: fs(12.5), color: C.ink }}>
                {t("sheet.send_my_categories_again", "Send my categories again")}</Text>
            </Press>
            <Press onPress={() => { tap(); open(`mailto:admin@taiyabahmasjid.com?subject=${encodeURIComponent("App notifications")}&body=${encodeURIComponent(`Permission: ${granted}\nScheduled: ${armed}\nJamaah: ${alerts.jamaah ? alerts.mins + " min" : "off"}\nKahf: ${alerts.kahf}`)}`); }}
              style={{ alignItems: "center", paddingVertical: 11, borderRadius: R.pill,
                       borderWidth: 1, borderColor: C.line }}>
              <Text style={{ fontFamily: F.sansMedium, fontSize: fs(12.5), color: C.ink }}>
                {t("sheet.send_this_report_to_the", "Send this report to the masjid")}</Text>
            </Press>
            <Press onPress={async () => { tap(); await Notifications.cancelAllScheduledNotificationsAsync(); await rearm({}); }}
              style={{ alignItems: "center", paddingVertical: 11, borderRadius: R.pill,
                       borderWidth: 1, borderColor: C.line }}>
              <Text style={{ fontFamily: F.sansMedium, fontSize: fs(12.5), color: C.ink }}>
                {t("sheet.reset_reload_the_app", "Reset & reload the app")}</Text>
            </Press>
            <Note>{t("sheet.this_clears_the_app_s",
              "This clears the app’s stored files and re-installs its background service. Your prayer times are built in, so nothing is lost.")}</Note>
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
