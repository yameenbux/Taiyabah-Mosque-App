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
import { monthYear } from "./dates";

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

export function Field({ label, hint, value, onChange, type = "text", bad, required, placeholder }) {
  const { fs, rtl } = useApp();
  const [focus, setFocus] = useState(false);
  const multi = type === "multi";
  return (
    <View style={{ marginTop: 14 }}>
      <View style={{ flexDirection: rtl ? "row-reverse" : "row", alignItems: "center", gap: 6, marginBottom: 6 }}>
        <Text style={{ fontFamily: F.sansMedium, fontSize: fs(12.5), color: bad ? C.danger : C.ink }}>{label}</Text>
        {required === false && <Pill>optional</Pill>}
      </View>
      <TextInput
        value={value} onChangeText={onChange}
        placeholder={placeholder} placeholderTextColor={C.line}
        onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
        {...(KB[type] || KB.text)}
        style={{ fontFamily: F.sans, fontSize: fs(15), color: C.ink, backgroundColor: C.card,
                 borderWidth: focus || bad ? 1.6 : 1,
                 borderColor: bad ? C.danger : focus ? C.brand600 : C.line,
                 borderRadius: 13, paddingHorizontal: 14,
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
export function Choice({ label, options, value, onChange, columns = 2 }) {
  const { fs, rtl } = useApp();
  return (
    <View style={{ marginTop: 14 }}>
      {!!label && <Text style={{ fontFamily: F.sansMedium, fontSize: fs(12.5), color: C.ink, marginBottom: 7,
                                 textAlign: rtl ? "right" : "left" }}>{label}</Text>}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {options.map(o => {
          const on = o.v === value;
          return (
            <Pressable key={o.v} disabled={o.off} onPress={() => { tap(); onChange(o.v); }}
              style={({ pressed }) => ({ flexBasis: `${Math.floor(100 / columns) - 3}%`, flexGrow: 1,
                                         alignItems: "center", paddingVertical: 12, paddingHorizontal: 8,
                                         borderRadius: 13, borderWidth: on ? 1.6 : 1,
                                         borderColor: on ? C.brand600 : C.line,
                                         backgroundColor: on ? "rgba(119,33,87,.07)" : C.card,
                                         opacity: o.off ? 0.38 : pressed ? 0.85 : 1 })}>
              <Text style={{ fontFamily: F.sansMedium, fontSize: fs(13.5), color: on ? C.brand600 : C.ink,
                             textAlign: "center" }}>{o.t}</Text>
              {!!o.s && <Text style={{ fontFamily: F.sans, fontSize: fs(10.5), color: C.muted, marginTop: 2,
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
export function Calendar({ month, onMonth, selected = [], taken = [], first, last, onPick }) {
  const { t, fs } = useApp();
  const y = month.getFullYear(), m = month.getMonth();
  const lead = (new Date(y, m, 1).getDay() + 6) % 7;      // weeks start Monday
  const days = new Date(y, m + 1, 0).getDate();
  const iso = d => `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  const atStart = new Date(y, m, 1) <= new Date(first.getFullYear(), first.getMonth(), 1);
  const atEnd   = new Date(y, m, 1) >= new Date(last.getFullYear(), last.getMonth(), 1);

  return (
    <Card pad={13}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Press onPress={() => !atStart && (tap(), onMonth(new Date(y, m - 1, 1)))} style={{ padding: 7 }}>
          <Ionicons name="chevron-back" size={18} color={atStart ? C.line : C.brand600} />
        </Press>
        <Text style={{ fontFamily: F.display, fontSize: fs(15.5), color: C.ink }}>
          {monthYear(t, month)}</Text>
        <Press onPress={() => !atEnd && (tap(), onMonth(new Date(y, m + 1, 1)))} style={{ padding: 7 }}>
          <Ionicons name="chevron-forward" size={18} color={atEnd ? C.line : C.brand600} />
        </Press>
      </View>

      <View style={{ flexDirection: "row", marginTop: 6 }}>
        {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
          <Text key={i} style={{ flex: 1, textAlign: "center", fontFamily: F.sans, fontSize: fs(10.5),
                                 color: C.muted }}>{d}</Text>))}
      </View>

      <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
        {Array.from({ length: lead }, (_, i) => <View key={"x" + i} style={{ width: `${100 / 7}%`, height: 42 }} />)}
        {Array.from({ length: days }, (_, i) => {
          const d = i + 1, key = iso(d), date = new Date(y, m, d);
          const out = date < first || date > last;
          const isTaken = taken.includes(key);
          const idx = selected.indexOf(key);
          const on = idx !== -1;
          return (
            <Pressable key={key} disabled={out || isTaken} onPress={() => { tap(); onPick(key, date); }}
              style={{ width: `${100 / 7}%`, height: 42, alignItems: "center", justifyContent: "center" }}>
              <View style={{ width: 33, height: 33, borderRadius: 11, alignItems: "center", justifyContent: "center",
                             backgroundColor: on ? (idx === 0 ? C.brand600 : "rgba(119,33,87,.16)")
                                              : isTaken ? "rgba(180,83,47,.10)" : "transparent" }}>
                <Text style={{ fontFamily: on ? F.sansMedium : F.sans, fontSize: fs(13.5),
                               color: on && idx === 0 ? C.cream
                                    : out ? C.line : isTaken ? "rgba(180,83,47,.55)" : C.ink,
                               textDecorationLine: isTaken ? "line-through" : "none" }}>{d}</Text>
              </View>
            </Pressable>);
        })}
      </View>

      {!!taken.length && (
        <View style={{ flexDirection: "row", gap: 14, justifyContent: "center", marginTop: 4 }}>
          <Legend colour="rgba(180,83,47,.3)" label={t("hallhire.booked", "Booked")} />
          <Legend colour={C.card} label={t("hallhire.available", "Available")} bordered />
        </View>)}
    </Card>
  );
}

function Legend({ colour, label, bordered }) {
  const { fs } = useApp();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
      <View style={{ width: 11, height: 11, borderRadius: 4, backgroundColor: colour,
                     borderWidth: bordered ? 1 : 0, borderColor: C.line }} />
      <Text style={{ fontFamily: F.sans, fontSize: fs(11), color: C.muted }}>{label}</Text>
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
      <Text style={{ fontFamily: F.sansMedium, fontSize: fs(15), color: C.cream }}>
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
          <Text style={{ fontFamily: F.sansMedium, fontSize: fs(19), color: C.brand600, marginTop: 3 }}>
            {reference}</Text>
        </View>)}
      {extra}
    </View>
  );
}

export const isEmail = s => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(s).trim());
export const isPhone = s => String(s).replace(/[^0-9]/g, "").length >= 10;
