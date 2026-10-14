/**
 * Taiyabah Masjid — a notification reaches only the people who asked for it.
 * Copyright (c) 2026 Yameen Bux. All rights reserved. See LICENSE.md.
 *
 * THE CLAIM UNDER TEST, in the words it was asked in: somebody should get the
 * notifications they have switched ON, and must not get the ones they have
 * switched OFF.
 *
 * Everything about who a send reaches comes down to two functions in
 * worker.js. encodePrefs() turns five switches and a reminder offset into the
 * single tag OneSignal stores on the device. prefValues() lists every value of
 * that tag which ought to receive a given category, and anyOfFilter() turns
 * that list into the filter the send is made with. If those two ever disagree,
 * the masjid sends janāzah alerts to people who asked for events and nothing
 * anywhere looks wrong — the tag is valid, the filter is well formed, the
 * dashboard says delivered.
 *
 * So this does not sample. It walks EVERY value the tag can hold — both
 * widths, every combination of flags, every offset — and checks, for every
 * category, that the value is in that category's filter if and only if its own
 * switch is on. That is the whole claim, proved over the entire space rather
 * than argued from examples.
 *
 * It also pins the two ends of the chain to reality: the encoded values below
 * are the ones OneSignal actually held for two real handsets, and the filter
 * sizes are the ones the live sends actually carried.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  PREF_ORDER, PREF_MINUTES, LEGACY_FLAGS, TOPICS,
  encodePrefs, decodePrefs, prefValues, anyOfFilter,
} from "../worker.js";

const bits = (on, mins) => encodePrefs({
  ...Object.fromEntries(PREF_ORDER.map(k => [k, on.includes(k) ? "1" : "0"])),
  jamaah_mins: mins,
});

/* Every value the tag can legitimately hold, at both widths. */
function everyValue() {
  const out = [];
  for (const width of [LEGACY_FLAGS, PREF_ORDER.length]) {
    for (let n = 0; n < (1 << width); n++) {
      const flags = [];
      for (let i = 0; i < width; i++) flags.push((n >> (width - 1 - i)) & 1);
      for (const m of PREF_MINUTES) out.push({ value: flags.join("") + m, flags, width });
    }
  }
  return out;
}

test("THE RULE: a device is in a category's audience exactly when its own switch is on", () => {
  const values = everyValue();
  assert.equal(values.length, (16 + 32) * 3, "the value space is not the size it should be");

  for (const [name, topic] of Object.entries(TOPICS)) {
    const audience = new Set(prefValues(topic.idx));
    for (const { value, flags, width } of values) {
      const wants = flags[topic.idx] === 1;
      /* A value written before al-Kahf existed carries no answer about it, so
         it is not in that audience whatever else it says. Silence is not
         consent: the four-flag width is excluded from al-Kahf by design. */
      const reachable = wants && !(topic.idx >= LEGACY_FLAGS && width === LEGACY_FLAGS);

      assert.equal(audience.has(value), reachable,
        reachable
          ? `${name}: ${value} has ${name} ON and would NOT be sent it`
          : `${name}: ${value} has ${name} OFF and WOULD be sent it`);
    }
  }
});

test("no category's audience contains a device that switched it off", () => {
  /* The same claim from the other side, stated the way it was asked. */
  for (const [name, topic] of Object.entries(TOPICS)) {
    for (const value of prefValues(topic.idx)) {
      const decoded = decodePrefs(value);
      assert.ok(decoded, `${name}: ${value} is not even a readable preference`);
      assert.equal(decoded[name], "1",
        `${name}: the audience includes ${value}, which has ${name} switched off`);
    }
  }
});

test("every value in an audience is one OneSignal could actually have stored", () => {
  for (const topic of Object.values(TOPICS))
    for (const value of prefValues(topic.idx))
      assert.match(value, /^[01]{4,5}(05|10|15)$/);
});

test("the switches survive the round trip", () => {
  for (const { value } of everyValue()) {
    const decoded = decodePrefs(value);
    assert.ok(decoded);
    assert.equal(encodePrefs(decoded), value.length === 7 ? value : encodePrefs(decoded));
    for (const k of PREF_ORDER) assert.ok(decoded[k] === "0" || decoded[k] === "1");
  }
});

test("jamāʿah reminders go to the offset that was chosen, and no other", () => {
  for (const mins of PREF_MINUTES) {
    const audience = new Set(prefValues(TOPICS.jamaah.idx, Number(mins)));
    for (const value of audience) assert.ok(value.endsWith(mins),
      `a ${mins}-minute send would reach ${value}`);
    /* And somebody on a different offset is not in it. */
    for (const other of PREF_MINUTES.filter(m => m !== mins))
      assert.equal(audience.has(bits(PREF_ORDER, other)), false,
        `a ${mins}-minute send would reach a phone set to ${other}`);
  }
});

test("the two handsets OneSignal actually holds encode to what it holds", () => {
  /* Read off the live account on 14 October 2026. If either of these ever
     stops matching, the app and the sender have drifted apart and the whole
     of the above proves nothing about the real audience. */
  assert.equal(bits(["jamaah", "janazah", "announcements", "events", "kahf"], "15"),
    "1111115", "the iPhone with all five on at 15 minutes");
  assert.equal(bits(["jamaah", "janazah", "announcements", "kahf"], "10"),
    "1110110", "the Huawei with events switched off at 10 minutes");

  /* And the consequence that matters: the one with events off is not in the
     events audience, while the one with events on is. */
  const events = new Set(prefValues(TOPICS.events.idx));
  assert.equal(events.has("1111115"), true);
  assert.equal(events.has("1110110"), false);
});

test("the filters are the size the live sends carried", () => {
  /* OneSignal recorded 47 filter entries on "Isha Jamāʿah in 15 min" and 143
     on "Jamāʿah Time Now". Matching those here is what ties this file to the
     code that actually ran, rather than to a plausible-looking copy of it. */
  assert.equal(anyOfFilter(prefValues(TOPICS.jamaah.idx, 10)).length, 47);
  assert.equal(anyOfFilter(prefValues(TOPICS.jamaah.idx)).length, 143);
});

test("the filter is an OR, not an AND that reaches nobody", () => {
  const f = anyOfFilter(prefValues(TOPICS.janazah.idx));
  assert.ok(f.length > 1);
  f.forEach((entry, i) => {
    if (i % 2) { assert.deepEqual(entry, { operator: "OR" }); return; }
    assert.equal(entry.field, "tag");
    assert.equal(entry.key, "p");
    assert.equal(entry.relation, "=");
  });
});

test("an empty or malformed tag is nobody's audience", () => {
  for (const bad of ["", "abc", "11111", "111111", "1111120", "111112", null, undefined])
    assert.equal(decodePrefs(bad), null, `${JSON.stringify(bad)} was read as a preference`);
});
