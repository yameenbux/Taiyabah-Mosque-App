/* "Report a problem" — a person telling the masjid something is not working.
 * Copyright (c) 2026 Yameen Bux. All rights reserved. See LICENSE.md.
 *
 * The crash boundary (src/Boundary.jsx) reports the faults that THROW, on their
 * own. Plenty of "it doesn't work" never throws: a screen that loads nothing
 * because there is no signal, a form that will not send, a stream that stays
 * silent. There was no way for a person to say so short of ringing the office,
 * and "ring the office" loses the one thing that makes a fault fixable — what
 * the app was actually doing when it happened.
 *
 * So this sends what they type plus the short breadcrumb trail the app keeps as
 * it goes (src/diagnostics.js), to the masjid's own Supabase, the same place
 * and the same privacy stance as a crash: a device model, not an id, and only
 * the words the person chose to write.
 */
import React, { useState } from "react";
import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { C, F } from "./theme";
import { useApp } from "./store";
import { Field, Submit, ErrorBox } from "./form";
import { Note } from "./ui";
import { reportIssue } from "./diagnostics";

export function ReportProblem({ screen }) {
  const { t, fs } = useApp();
  const [note, setNote] = useState("");
  const [state, setState] = useState("idle"); // idle | sending | sent | failed

  async function send() {
    if (state === "sending") return;
    setState("sending");
    const ok = await reportIssue({ note: note.trim(), screen });
    setState(ok ? "sent" : "failed");
  }

  if (state === "sent") {
    return (
      <View style={{ alignItems: "center", paddingVertical: 20, gap: 9 }}>
        <View style={{ width: 54, height: 54, borderRadius: 27, backgroundColor: "rgba(63,190,115,.14)",
                       alignItems: "center", justifyContent: "center" }}>
          <Ionicons name="checkmark" size={28} color="#2E8C56" />
        </View>
        <Text style={{ fontFamily: F.sansSemi, fontSize: fs(14.5), color: C.ink, textAlign: "center" }}>
          {t("report.thanks_title", "Thank you — that’s been sent")}</Text>
        <Text style={{ fontFamily: F.sans, fontSize: fs(12.5), lineHeight: fs(20), color: C.muted,
                       textAlign: "center", paddingHorizontal: 8 }}>
          {t("report.thanks_body",
            "The masjid now has what it needs to look into it. If it is urgent, ring the office on 01204 535 997.")}</Text>
      </View>
    );
  }

  return (
    <View>
      <Field label={t("report.field_label", "What went wrong?")} required={false} type="multi"
             value={note} onChange={setNote}
             placeholder={t("report.placeholder",
               "e.g. the live stream would not play, or a screen stayed blank")} />
      {state === "failed" && (
        <ErrorBox>{t("report.failed",
          "That didn’t send — check your connection and try again, or ring the office on 01204 535 997.")}</ErrorBox>)}
      <Submit label={t("report.send", "Send report")} sending={state === "sending"} onPress={send} />
      <View style={{ marginTop: 12 }}>
        <Note>{t("report.privacy",
          "This sends your app version, your phone model, and a short log of the last few screens — so the masjid can see what happened. It does not send your name, your number, or anything you typed into a form.")}</Note>
      </View>
    </View>
  );
}
