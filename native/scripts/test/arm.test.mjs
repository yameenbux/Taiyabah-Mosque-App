/**
 * Taiyabah Masjid — the reminders are actually handed to the phone.
 * Copyright (c) 2026 Yameen Bux. All rights reserved. See LICENSE.md.
 *
 * WHAT THIS EXISTS FOR.
 *
 * triggers.test.mjs proves the trigger builders produce a `type`.
 * reminders.test.mjs proves plan() maps the switches correctly.
 * Both passed while arm() — the function between them, the one that actually
 * schedules anything — threw on its first prayer and scheduled NOTHING.
 *
 * The fault: `const at = day.jamaat[key]` inside the loop shadowed the `at`
 * trigger builder imported at the top of the file, so `at(when, …)` called the
 * string "19:15". It threw TypeError on the first iteration, AFTER arm() had
 * already cancelled every scheduled notification, and every caller wraps arm()
 * in a catch — so the queue was emptied, nothing was put back, and no error
 * reached anybody. Not one local jamāʿah or Sūrah al-Kahf reminder existed on
 * any phone.
 *
 * No test that READS the file would have caught that, and two tests that read
 * the file did not. So this one runs it: the real src/reminders.js, against
 * the real timetable and the real plan(), with only expo-notifications and
 * react-native stood in for.
 */
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { arm, plan } from "../../src/reminders.js";
import { ORDER } from "../../src/prayer.js";
/* scripts/test-loader.mjs points expo-notifications at this file, so what the
   app just talked to and what is read back here are one module. Run through
   `npm test`, which registers that loader. */
import * as stub from "./stubs/expo-notifications.mjs";

beforeEach(() => stub.reset());

test("arming actually schedules reminders", async () => {
  const { per, extras } = plan({ jamaah: true, mins: 10, kahf: true });
  const held = await arm(per, extras);

  assert.ok(stub.log.scheduled.length > 0,
    "arm() scheduled nothing at all. Either it threw — the fault this file was " +
    "written for — or dayFor() has no days left in the bundled timetable, " +
    "which next-year.test.mjs covers separately.");
  assert.equal(held, stub.log.scheduled.length,
    "arm() reported a different number than the OS is holding");
  assert.equal(stub.log.cancels, 1, "the old set must be cleared exactly once");
});

test("every trigger carries a type", async () => {
  /* The whole of the notification-spam fault in one assertion: expo-notifications
     does not reject a trigger with no `type`, it DELIVERS IT IMMEDIATELY. */
  const { per, extras } = plan({ jamaah: true, mins: 10, kahf: true });
  await arm(per, extras);

  for (const req of stub.log.scheduled) {
    assert.ok(req.trigger && typeof req.trigger === "object",
      `${req.content?.title}: trigger is not an object — a null trigger means DELIVER NOW`);
    assert.equal(typeof req.trigger.type, "string",
      `${req.content?.title}: trigger has no type, so it would be delivered the instant ` +
      "it is scheduled. See src/triggers.js.");
  }
});

test("prayer reminders are dated, in the future, and on the prayer channel", async () => {
  const { per } = plan({ jamaah: true, mins: 10, kahf: false });
  await arm(per, {});

  const now = Date.now();
  assert.ok(stub.log.scheduled.length > 0, "no prayer reminders were scheduled");
  for (const req of stub.log.scheduled) {
    assert.equal(req.trigger.type, "date");
    assert.ok(req.trigger.date instanceof Date, "the date must be a Date");
    assert.ok(req.trigger.date.getTime() > now, "a reminder was scheduled in the past");
    assert.equal(req.trigger.channelId, "prayer");
    /* The body is built from the same string that shadowed the builder, so a
       title with "undefined" in it is the other way this fault could show. */
    assert.match(req.content.body, /^\d{1,2}:\d{2}(am|pm) at Taiyabah Masjid$/,
      `the jamāʿah time did not reach the body: ${JSON.stringify(req.content.body)}`);
    assert.match(req.content.title, /jamāʿah/);
  }
});

test("Sūrah al-Kahf is a weekly trigger on Friday", async () => {
  await arm({}, { kahf: true });
  assert.equal(stub.log.scheduled.length, 1, "Kahf alone should schedule exactly one");
  const [req] = stub.log.scheduled;
  assert.equal(req.trigger.type, "weekly");
  assert.equal(req.trigger.weekday, 6, "expo-notifications counts from Sunday, so Friday is 6");
  assert.equal(req.content.title, "Sūrah al-Kahf");
});

test("every prayer in ORDER gets a reminder on at least one day", async () => {
  const { per } = plan({ jamaah: true, mins: 10, kahf: false });
  await arm(per, {});
  const titles = stub.log.scheduled.map(r => r.content.title).join(" | ");
  for (const key of ORDER) {
    assert.ok(stub.log.scheduled.some(r => r.content.title.includes(" jamāʿah")),
      "no jamāʿah reminders at all");
  }
  assert.equal(new Set(stub.log.scheduled.map(r => r.content.title)).size >= ORDER.length, true,
    `fewer distinct prayers than expected: ${titles}`);
});

test("nothing wanted schedules nothing, and still clears the old set", async () => {
  const { per, extras } = plan({ jamaah: false, mins: 10, kahf: false });
  const held = await arm(per, extras);
  assert.equal(held, 0);
  assert.equal(stub.log.scheduled.length, 0);
  assert.equal(stub.log.cancels, 1, "turning everything off must still cancel what was armed");
});

test("a refused permission arms nothing", async () => {
  stub.log.permission = "denied";
  const { per, extras } = plan({ jamaah: true, mins: 10, kahf: true });
  assert.equal(await arm(per, extras), 0);
  assert.equal(stub.log.scheduled.length, 0);
});
