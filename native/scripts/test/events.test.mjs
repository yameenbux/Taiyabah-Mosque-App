/**
 * Taiyabah Masjid — which posts are events, and what order they go in.
 * Copyright (c) 2026 Yameen Bux. All rights reserved. See LICENSE.md.
 *
 * THE ROWS HERE ARE THE SHAPE notices_live RETURNS — id, created_at, topic,
 * title, body, image_url, image_w, image_h, event_at — and the topics are
 * the masjid's own vocabulary, the same five the notification switches name.
 * Nothing invented: at the time of writing the live table holds three posts
 * tagged 'events', all with posters and none with a date, and one tagged
 * 'janazah'. Both of those cases are below, because both have to work.
 *
 * DATES ARE BUILT LOCALLY (new Date(y, m, d, h)) and asserted against
 * locally-derived strings, never against a hardcoded "2026-12-05T19:00:00Z".
 * A test that passes in UTC and fails in British Summer Time would be a test
 * that fails for half the year on a contributor's laptop and never in CI.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  EVENT_TOPIC, when, dayKey, isEvent, split, order, groupByDay,
  daysWithEvents, openingMonth,
} from "../../src/events.js";

const row = (o) => ({
  id: o.id, created_at: o.created_at || new Date(2026, 10, 1).toISOString(),
  topic: o.topic, title: o.title, body: o.body || null,
  image_url: o.image_url || null, image_w: null, image_h: null,
  event_at: o.event_at ? o.event_at.toISOString() : null,
});
const ymd = (d) => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0")
                 + "-" + String(d.getDate()).padStart(2, "0");

const NOW = new Date(2026, 10, 13, 12, 0);          // Fri 13 Nov 2026, midday

const eidParty   = row({ id:"a", topic:"events",        title:"Eid party",    event_at:new Date(2026, 11, 5, 19, 0), image_url:"p1.jpg" });
const quizNight  = row({ id:"b", topic:"events",        title:"Quiz night",   event_at:new Date(2026, 10, 20, 18, 30), image_url:"p2.jpg" });
const twoOnADay  = row({ id:"c", topic:"events",        title:"Bake sale",    event_at:new Date(2026, 10, 20, 10, 0), image_url:"p3.jpg" });
const lastWeek   = row({ id:"d", topic:"events",        title:"Past talk",    event_at:new Date(2026, 10, 6, 19, 0) });
const undated    = row({ id:"e", topic:"events",        title:"Old poster" });            // the real backlog
const janazah    = row({ id:"f", topic:"janazah",       title:"Janāzah today" });
const announce   = row({ id:"g", topic:"announcements", title:"Car park closed" });

const ALL = [eidParty, quizNight, twoOnADay, lastWeek, undated, janazah, announce];

test("an event is a post tagged 'events', and nothing else is", () => {
  assert.equal(EVENT_TOPIC, "events");
  assert.ok(isEvent(eidParty));
  assert.equal(isEvent(janazah), false);
  assert.equal(isEvent(announce), false);
  assert.equal(isEvent(null), false);
  assert.equal(isEvent({}), false);
});

test("split sends events one way and everything else the other", () => {
  const { events, notifications } = split(ALL);
  assert.deepEqual(events.map(r => r.id), ["a", "b", "c", "d", "e"]);
  assert.deepEqual(notifications.map(r => r.id), ["f", "g"]);
  //  A janāzah must never be swallowed by the Events page. It is the one
  //  notice where being seen the same day is the whole point.
  assert.ok(notifications.some(r => r.topic === "janazah"));
});

test("split copes with nothing at all", () => {
  for (const empty of [[], null, undefined]) {
    const s = split(empty);
    assert.deepEqual(s.events, []);
    assert.deepEqual(s.notifications, []);
  }
});

test("when() reads event_at and refuses anything else", () => {
  assert.equal(when(eidParty).getTime(), new Date(2026, 11, 5, 19, 0).getTime());
  assert.equal(when(undated), null);
  assert.equal(when({ event_at: "not a date" }), null);
  assert.equal(when({}), null);
  assert.equal(when(null), null);
});

test("dayKey is the LOCAL day, which is the one on the calendar", () => {
  assert.equal(dayKey(eidParty), ymd(new Date(2026, 11, 5)));
  assert.equal(dayKey(undated), null);
  //  JULY, NOT JANUARY. In London, January IS UTC, so a midnight case in
  //  winter discriminates nothing — this assertion was written against
  //  1 January first and a deliberate switch of dayKey() to getUTCDate()
  //  still passed it. 00:30 on 1 July is 23:30Z on 30 June in British
  //  Summer Time, so a UTC day key files this event under the wrong day,
  //  the wrong week, and the wrong month.
  const justAfterMidnight = row({ id:"z", topic:"events", title:"Night prayer",
                                  event_at:new Date(2027, 6, 1, 0, 30) });
  assert.equal(dayKey(justAfterMidnight), ymd(new Date(2027, 6, 1)));
});

test("order: soonest first, then what has just gone, then the undated backlog", () => {
  const { upcoming, past, undated: un } = order(ALL, NOW);
  //  20 Nov has two events; the earlier one on the day comes first.
  assert.deepEqual(upcoming.map(r => r.id), ["c", "b", "a"]);
  assert.deepEqual(past.map(r => r.id), ["d"]);
  assert.deepEqual(un.map(r => r.id), ["e"]);
});

test("an event earlier TODAY is still upcoming, not past", () => {
  const thisMorning = row({ id:"m", topic:"events", title:"Breakfast",
                            event_at:new Date(2026, 10, 13, 8, 0) });
  const { upcoming, past } = order([thisMorning], NOW);
  assert.deepEqual(upcoming.map(r => r.id), ["m"],
    "today's event dropped off the top of the screen at 8:01am");
  assert.deepEqual(past, []);
});

test("order ignores notifications entirely", () => {
  const { upcoming, past, undated: un } = order([janazah, announce], NOW);
  assert.deepEqual([...upcoming, ...past, ...un], []);
});

test("groupByDay puts both of a day's events under one date", () => {
  const { upcoming } = order(ALL, NOW);
  const groups = groupByDay(upcoming);
  assert.deepEqual(groups.map(g => g.key),
    [ymd(new Date(2026, 10, 20)), ymd(new Date(2026, 11, 5))]);
  assert.deepEqual(groups[0].items.map(r => r.id), ["c", "b"]);
  assert.equal(groups[1].items.length, 1);
});

test("groupByDay files the undated under one 'undated' heading", () => {
  const groups = groupByDay([undated, row({ id:"e2", topic:"events", title:"Another old one" })]);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].key, "undated");
  assert.equal(groups[0].at, null);
  assert.equal(groups[0].items.length, 2);
});

test("daysWithEvents dots the right days and only this month", () => {
  const nov = daysWithEvents(ALL, 2026, 10);
  assert.deepEqual([...nov].sort((a, b) => a - b), [6, 20]);
  const dec = daysWithEvents(ALL, 2026, 11);
  assert.deepEqual([...dec], [5]);
  //  A janāzah is not an event and must not put a dot on the calendar.
  assert.equal(daysWithEvents([janazah, announce], 2026, 10).size, 0);
  //  Nothing in a month with nothing on.
  assert.equal(daysWithEvents(ALL, 2027, 5).size, 0);
});

test("the calendar opens on the month of the next event, not on an empty one", () => {
  //  Nothing until December -> open on December, so the reader sees a dot.
  const m = openingMonth([eidParty, lastWeek], NOW);
  assert.equal(m.getFullYear(), 2026);
  assert.equal(m.getMonth(), 11);
  //  Nothing ahead at all -> this month, rather than a month in the past.
  const none = openingMonth([lastWeek, undated], NOW);
  assert.equal(none.getMonth(), NOW.getMonth());
  assert.equal(none.getDate(), 1);
  //  No events whatsoever -> still this month, not a crash.
  const empty = openingMonth([], NOW);
  assert.equal(empty.getMonth(), NOW.getMonth());
});
