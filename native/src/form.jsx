/* The form kit.
 *
 * Three screens in the app send a request to the masjid — a nikāḥ date, a hall
 * booking, a question for the imams — and all three live or die on the same
 * details: a field that says what is wrong rather than going quietly red, a
 * keyboard that matches what is being typed, a button that cannot be pressed
 * twice, and an answer at the end with a reference number the office can look up.
 */
import React, { useState } from "react";
import { View, Text, TextInput, Pressable, ActivityIndicator, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { C, F, R } from "./theme";
import { useApp } from "./store";
import { Card, Note, Pill, Press, CTA, tap } from "./ui";
import { monthYear, DOW } from "./dates";

/* Keyboards, so nobody types a phone number on a qwerty pad. */
const KB = {
  text:  { keyboardType: "default",       autoCapitalize: "words" },
  name:  { keyboardType: "default",       autoCapitalize: "words",  autoComplete: "name" },
  tel:   { keyboardType: "phone-pad",     autoComplete: "tel" },
  email: { keyboardType: "email-address", autoCapitalize: "none",   autoComplete: "email", autoCorrect: false },
  num:   { keyboardType: "number-pad" },
  pc:    { keyboardType: "default",       autoCapitalize: "characters", autoCorrect: false },
  multi: { multiline: true, autoCapitalize: "sentences" },
};

export function Field({ label, opt, hint, value, onChange, type = "text", bad, required, placeholder }) {
  const { t, fs, rtl } = useApp();
  const [focus, setFocus] = useState(false);
  const multi = type === "multi";
  return (
    <View style={{ marginTop: 14 }}>
      {/* .bk-field label — 12px BOLD, uppercase, .05em of tracking, in the
          muted grey, 5px above the box. This was 12.5px medium in ink and
          sentence case, which reads as a line of prose rather than a label,
          and it is the same control on every form in the app: hall hire,
          nikāḥ, the imāms' advice, charity collections. */}
      <View style={{ flexDirection: rtl ? "row-reverse" : "row", alignItems: "center", gap: 6, marginBottom: 5 }}>
        <Text style={{ fontFamily: F.sansBold, fontSize: fs(12), letterSpacing: 0.6,
                       textTransform: "uppercase",
                       color: bad ? C.danger : C.muted }}>{label}</Text>
        {/* .cc-opt — the website appends the aside to the LABEL in the same
            line: "CHARITY NUMBER — if you have one", the second half dropping
            the uppercase and the tracking and sitting at 500 in the muted
            grey. A pill saying "optional" beside it is a different thing: it
            reads as a status badge on the field rather than as part of what
            the field is asking for, and it loses the wording — "if you have
            one" says something "optional" does not. */}
        {required === false && (
          <Text style={{ fontFamily: F.sansMedium, fontSize: fs(12), color: C.muted }}>
            {opt || t("collect.optional", "— optional")}</Text>)}
      </View>
      <TextInput
        value={value} onChangeText={onChange}
        placeholder={placeholder} placeholderTextColor={C.line}
        onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
        {...(KB[type] || KB.text)}
        /* The website's input sits on the PAPER inside a plain hairline at
           11px of radius with 11/12 of padding — not on card at 13 with 14. */
        style={{ fontFamily: F.sans, fontSize: fs(15), color: C.ink, backgroundColor: C.paper,
                 borderWidth: focus || bad ? 1.6 : 1,
                 borderColor: bad ? C.danger : focus ? C.brand600 : C.line,
                 borderRadius: 11, paddingHorizontal: 12,
                 paddingTop: multi ? 12 : 12, paddingBottom: multi ? 12 : 12,
                 minHeight: multi ? 108 : undefined,
                 textAlignVertical: multi ? "top" : "center",
                 textAlign: rtl ? "right" : "left" }} />
      {!!hint && <View style={{ marginTop: 5 }}><Note>{hint}</Note></View>}
    </View>
  );
}

/* A row of mutually exclusive choices. Used for "who are you", "what do you
 * need", "is the collector paid" — anywhere a dropdown would have been. */
export function Choice({ label, options, value, onChange }) {
  const { fs, rtl } = useApp();
  return (
    <View>
      {/* .bk-clabel — 12px BOLD, uppercase, .06em of tracking, in the muted
          grey. It was 12.5px medium in ink and sentence case, which made it
          look like a sentence rather than the label on a control. */}
      {!!label && <Text style={{ fontFamily: F.sansBold, fontSize: fs(12), letterSpacing: 0.72,
                                 textTransform: "uppercase", color: C.muted,
                                 marginTop: 12, marginBottom: 7,
                                 textAlign: rtl ? "right" : "left" }}>{label}</Text>}
      {/* .bk-opts — the options FLOW: each is flex:1 1 auto with a 88px floor,
          so three short ones share a line and a long one takes its own. This
          was a fixed two-column grid, which put "1 hall" and "2 halls" on one
          row and "3 halls" and "Kitchen only" on the next, in two columns the
          website never draws. */}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 7 }}>
        {options.map(o => {
          const on = o.v === value;
          return (
            <Pressable key={o.v} disabled={o.off} onPress={() => { tap(); onChange(o.v); }}
              style={({ pressed }) => ({ flexGrow: 1, flexShrink: 1, flexBasis: "auto", minWidth: 88,
                                         paddingVertical: 10, paddingHorizontal: 12, borderRadius: 11,
                                         borderWidth: 1, borderColor: on ? C.brand600 : C.line,
                                         backgroundColor: on ? C.brand600 : C.paper,
                                         opacity: o.off ? 0.38 : pressed ? 0.85 : 1 })}>
              <Text style={{ fontFamily: F.sans, fontSize: fs(13), color: on ? "#FFFFFF" : C.ink,
                             textAlign: "center" }}>{o.t}</Text>
              {!!o.s && <Text style={{ fontFamily: F.sans, fontSize: fs(10.5), marginTop: 2,
                                       color: on ? "#EADFE6" : C.muted,
                                       textAlign: "center" }}>{o.s}</Text>}
            </Pressable>);
        })}
      </View>
    </View>
  );
}

export function Check({ label, value, onChange, bad }) {
  const { fs, rtl } = useApp();
  return (
    <Press onPress={() => { tap(); onChange(!value); }}
      style={{ flexDirection: rtl ? "row-reverse" : "row", gap: 11, alignItems: "flex-start", marginTop: 16,
               paddingVertical: 2 }}>
      <View style={{ width: 22, height: 22, borderRadius: 6, borderWidth: value ? 0 : 1.6,
                     borderColor: bad ? C.danger : C.line, backgroundColor: value ? C.brand600 : C.card,
                     alignItems: "center", justifyContent: "center", marginTop: 1 }}>
        {value && <Ionicons name="checkmark" size={15} color={C.cream} />}
      </View>
      <Text style={{ flex: 1, fontFamily: F.sans, fontSize: fs(13), lineHeight: fs(20),
                     color: bad ? C.danger : C.ink, textAlign: rtl ? "right" : "left" }}>{label}</Text>
    </Press>
  );
}

/* A month grid. The three date pickers in the app all need the same thing: a
 * window of allowed days, some of them taken, one or two chosen — and none of
 * the platform pickers can show "taken". */
export function Calendar({ month, onMonth, selected = [], taken = null, first, last, onPick, offered }) {
  const { t, fs } = useApp();
  const y = month.getFullYear(), m = month.getMonth();
  /* THE WEEK STARTS ON SUNDAY. The website writes its header with dow(0..6)
     and leads the grid with first.getDay() blanks — Sun Mon Tue Wed Thu Fri
     Sat. This started on Monday, so for most of the year every date in the
     month sat in the wrong column. */
  const lead = new Date(y, m, 1).getDay();
  const days = new Date(y, m + 1, 0).getDate();
  const iso = d => `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  const atStart = new Date(y, m, 1) <= new Date(first.getFullYear(), first.getMonth(), 1);
  const atEnd   = new Date(y, m, 1) >= new Date(last.getFullYear(), last.getMonth(), 1);

  const FREE = "#3F7D58";
  const nav = (dir, off) => (
    /* .bk-nav — a 34px box at 10px of radius on the paper inside a hairline,
       not a bare chevron floating at the edge of the card. */
    <Press onPress={() => !off && (tap(), onMonth(new Date(y, m + dir, 1)))} disabled={off}
      style={{ width: 34, height: 34, borderRadius: 10, borderWidth: 1, borderColor: C.line,
               backgroundColor: C.paper, alignItems: "center", justifyContent: "center",
               opacity: off ? 0.35 : 1 }}>
      <Ionicons name={dir < 0 ? "chevron-back" : "chevron-forward"} size={18} color={C.ink} />
    </Press>
  );

  return (
    <View>
      {/* .bk-legend sits ABOVE the calendar on the website and is always
         shown — it is what tells you a green ring means free before you have
         tapped anything. This was drawn underneath, and only once some date
         in the month happened to be booked. */}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 14, marginBottom: 12 }}>
        <Legend colour={FREE} label={t("hallhire.available", "Available")} />
        <Legend colour={C.danger} label={t("hallhire.booked", "Booked")} />
        <Legend colour={C.line} label={t("hallhire.not_published", "Not published")} />
      </View>

      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 }}>
        {nav(-1, atStart)}
        <Text style={{ flex: 1, textAlign: "center", fontFamily: F.display, fontSize: fs(16), color: C.ink }}>
          {monthYear(t, month)}</Text>
        {nav(1, atEnd)}
      </View>

      <View style={{ flexDirection: "row" }}>
        {[0, 1, 2, 3, 4, 5, 6].map(i => (
          <Text key={i} style={{ flex: 1, textAlign: "center", fontFamily: F.sans, fontSize: fs(10.5),
                                 color: C.muted, paddingBottom: 4 }}>
            {t(`date.dow.${i}`, DOW[i].slice(0, 3))}</Text>))}
      </View>

      <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
        {Array.from({ length: lead }, (_, i) =>
          <View key={"x" + i} style={{ width: "14.2857%", aspectRatio: 1, padding: 2 }} />)}
        {Array.from({ length: days }, (_, i) => {
          const d = i + 1, key = iso(d), date = new Date(y, m, d);
          const past = date < first || date > last;
          /* Not "booked" — the masjid simply does not sell one hall at the
             weekend, and the website says so with a dashed, faded cell
             rather than greying the day out mutely. */
          const unoffered = !past && offered ? !offered(date) : false;
          /* taken === null means the office's answer has not come back yet.
             The website calls that state "unknown" and draws the day plain,
             which is the third thing its legend names. */
          const unknown = taken === null;
          const isTaken = !past && !unoffered && !unknown && taken.includes(key);
          const on = selected.includes(key);
          const state = past ? "past" : unoffered ? "unoffered" : unknown ? "unknown"
                      : isTaken ? "taken" : "free";
          const edge = on ? C.brand600 : state === "free" ? FREE : state === "taken" ? C.danger : C.line;
          const mark = state === "free" ? FREE : state === "taken" ? C.danger : null;
          return (
            <Pressable key={key} disabled={past || unoffered || isTaken || unknown}
              onPress={() => { tap(); onPick(key, date); }}
              style={{ width: "14.2857%", aspectRatio: 1, padding: 2 }}>
              {/* .bk-day — a square cell with its own border and paper fill,
                  10px of radius, and a 5px dot at the foot saying what it is.
                  These were borderless round chips, so the three states the
                  legend names were invisible. */}
              <View style={{ flex: 1, borderRadius: 10, borderWidth: 1, borderColor: edge,
                             borderStyle: state === "unoffered" ? "dashed" : "solid",
                             backgroundColor: on ? C.brand600 : C.paper,
                             alignItems: "center", justifyContent: "center",
                             opacity: past ? 0.3 : state === "unoffered" ? 0.45 : 1 }}>
                <Text style={{ fontFamily: on ? F.sansBold : F.sans, fontSize: fs(13),
                               color: on ? "#FFFFFF" : state === "taken" ? C.muted : C.ink }}>{d}</Text>
                {!!(mark || on) && (
                  <View style={{ position: "absolute", bottom: 4, width: 5, height: 5, borderRadius: 2.5,
                                 backgroundColor: on ? "#FFFFFF" : mark }} />)}
              </View>
            </Pressable>);
        })}
      </View>
    </View>
  );
}

/* .bk-dot — a 9px CIRCLE, and the row it sits in is 11.5px muted with a 5px
 * gap. These were 11px rounded squares at 11px with a 6px gap. */
function Legend({ colour, label }) {
  const { fs } = useApp();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
      <View style={{ width: 9, height: 9, borderRadius: 4.5, backgroundColor: colour }} />
      <Text style={{ fontFamily: F.sans, fontSize: fs(11.5), color: C.muted }}>{label}</Text>
    </View>
  );
}

export function ErrorBox({ children }) {
  const { fs } = useApp();
  if (!children) return null;
  return (
    <View style={{ flexDirection: "row", gap: 9, alignItems: "flex-start", marginTop: 16,
                   backgroundColor: "rgba(180,83,47,.08)", borderWidth: 1, borderColor: "rgba(180,83,47,.3)",
                   borderRadius: 13, padding: 13 }}>
      <Ionicons name="alert-circle" size={17} color={C.danger} style={{ marginTop: 1 }} />
      <Text style={{ flex: 1, fontFamily: F.sans, fontSize: fs(13), lineHeight: fs(20), color: "#8A3E22" }}>
        {children}</Text>
    </View>
  );
}

export function Submit({ label, sending, onPress, disabled }) {
  const { t, fs } = useApp();
  if (sending) return (
    <View style={{ marginTop: 18, borderRadius: R.pill, backgroundColor: C.brand800, paddingVertical: 16,
                   alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 9 }}>
      <ActivityIndicator color={C.cream} size="small" />
      <Text style={{ fontFamily: F.sansSemi, fontSize: fs(15), color: C.cream }}>
        {t("hallhire.sending", "Sending…")}</Text>
    </View>);
  return <CTA label={label} onPress={onPress} disabled={disabled} />;
}

/* The end of a request. A reference number the office can look up is the whole
 * difference between "we have sent it" and "we think we sent it". */
export function Sent({ title, body, reference, extra }) {
  const { t, fs } = useApp();
  return (
    <View style={{ alignItems: "center", paddingVertical: 36, paddingHorizontal: 8, gap: 10 }}>
      <View style={{ width: 62, height: 62, borderRadius: 31, backgroundColor: "rgba(63,190,115,.14)",
                     alignItems: "center", justifyContent: "center" }}>
        <Ionicons name="checkmark" size={32} color="#2E8C56" />
      </View>
      <Text style={{ fontFamily: F.display, fontSize: fs(21), color: C.ink, textAlign: "center" }}>{title}</Text>
      <Text style={{ fontFamily: F.sans, fontSize: fs(14), lineHeight: fs(22), color: C.muted,
                     textAlign: "center" }}>{body}</Text>
      {!!reference && (
        <View style={{ marginTop: 6, alignItems: "center", backgroundColor: C.card, borderWidth: 1,
                       borderColor: C.line, borderRadius: 13, paddingHorizontal: 20, paddingVertical: 13 }}>
          <Text style={{ fontFamily: F.sans, fontSize: fs(11), letterSpacing: 1.2, textTransform: "uppercase",
                         color: C.muted }}>{t("ui.reference", "Reference")}</Text>
          <Text style={{ fontFamily: F.sansSemi, fontSize: fs(19), color: C.brand600, marginTop: 3 }}>
            {reference}</Text>
        </View>)}
      {extra}
    </View>
  );
}

export const isEmail = s => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(s).trim());
export const isPhone = s => String(s).replace(/[^0-9]/g, "").length >= 10;
