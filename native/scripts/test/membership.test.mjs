/**
 * Taiyabah Masjid — what a member owes, and which years each button pays.
 * Copyright (c) 2026 Yameen Bux. All rights reserved. See LICENSE.md.
 *
 * THE FIXTURE IS A REAL SERVER PAYLOAD. It is the output of
 * membership_claim('taiyabah', ...) against a database built from db/157-160,
 * copied verbatim rather than typed out here. A hand-written fixture only ever
 * proves the app agrees with whoever wrote the fixture; this one fails if the
 * server's shape moves, which is the whole point of having it.
 *
 * The member is invented. Nobody on the masjid's register appears in this
 * repository, in a test or anywhere else.
 *
 * THE RULE BOTH SIDES MUST AGREE ON is which years each button pays, and the
 * disagreement that matters is "current" — this year, never the oldest. The
 * server applies it in membership_quote(); scope() applies it here; the test
 * below states the expected answer as a literal so that a change to either
 * one has to come past it.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { money, years, outstanding, yearsOwing, scope, feeNote, label,
         tidyReference, REFERENCE_RE } from "../../src/membership.js";

/* Four years behind: 2026 and 2025 at £100, 2022 and 2021 at £80, with 2024
   and 2023 already paid. £360. */
const CLAIM = {
  "name": "Zakariya Momin",
  "years": [
    {
      "year": 2026,
      "fee_p": 10000,
      "net_p": 10000,
      "method": null,
      "paid_p": 0,
      "waived": false,
      "settled": false,
      "waived_p": 0,
      "last_paid_on": null,
      "outstanding_p": 10000
    },
    {
      "year": 2025,
      "fee_p": 10000,
      "net_p": 10000,
      "method": null,
      "paid_p": 0,
      "waived": false,
      "settled": false,
      "waived_p": 0,
      "last_paid_on": null,
      "outstanding_p": 10000
    },
    {
      "year": 2024,
      "fee_p": 10000,
      "net_p": 10000,
      "method": "legacy",
      "paid_p": 10000,
      "waived": false,
      "settled": true,
      "waived_p": 0,
      "last_paid_on": "2024-06-30",
      "outstanding_p": 0
    },
    {
      "year": 2023,
      "fee_p": 8000,
      "net_p": 8000,
      "method": "legacy",
      "paid_p": 8000,
      "waived": false,
      "settled": true,
      "waived_p": 0,
      "last_paid_on": "2023-06-30",
      "outstanding_p": 0
    },
    {
      "year": 2022,
      "fee_p": 8000,
      "net_p": 8000,
      "method": null,
      "paid_p": 0,
      "waived": false,
      "settled": false,
      "waived_p": 0,
      "last_paid_on": null,
      "outstanding_p": 8000
    },
    {
      "year": 2021,
      "fee_p": 8000,
      "net_p": 8000,
      "method": null,
      "paid_p": 0,
      "waived": false,
      "settled": false,
      "waived_p": 0,
      "last_paid_on": null,
      "outstanding_p": 8000
    }
  ],
  "matched": true,
  "has_email": false,
  "reference": "MF-26-0048",
  "years_owing": 4,
  "current_year": 2026,
  "last_paid_on": "2024-06-30",
  "outstanding_p": 36000
};

test("the money reads the way a masjid writes it", () => {
  assert.equal(money(46000), "\u00a3460");
  assert.equal(money(8000), "\u00a380");
  //  Whole pounds lose the .00 — every fee this masjid has charged is whole.
  assert.equal(money(10000), "\u00a3100");
  //  But a part-payment must not be rounded away.
  assert.equal(money(4050), "\u00a340.50");
  assert.equal(money(5), "\u00a30.05");
  assert.equal(money(123456), "\u00a31,234.56");
  assert.equal(money(0), "\u00a30");
  assert.equal(money(null), "\u00a30");
});

test("the balance is the server's figure, not one the app adds up", () => {
  assert.equal(outstanding(CLAIM), 36000);
  //  And it genuinely is the sum of the unpaid years, so neither side drifts.
  assert.equal(yearsOwing(CLAIM).reduce((n, y) => n + y.outstanding_p, 0), 36000);
  assert.equal(yearsOwing(CLAIM).length, CLAIM.years_owing);
});

test("this year comes first on the screen, whatever order the payload arrives in", () => {
  const shuffled = { ...CLAIM, years: CLAIM.years.slice().reverse() };
  assert.equal(years(shuffled)[0].year, 2026);
  assert.equal(years(CLAIM)[0].year, 2026);
});

test("Pay everything covers every year still owing", () => {
  const all = scope(CLAIM, "all");
  assert.deepEqual(all.years, [2021, 2022, 2025, 2026]);
  assert.equal(all.amount_p, 36000);
});

test("Pay this year pays THIS year, never the oldest", () => {
  const one = scope(CLAIM, "current");
  //  The failure this guards: [2021] here would collect the same £100 and
  //  leave the member still not a member for 2026.
  assert.deepEqual(one.years, [2026]);
  assert.equal(one.amount_p, 10000);
});

test("a member who owes nothing gets no buttons rather than a \u00a30 one", () => {
  const settled = { ...CLAIM, outstanding_p: 0,
    years: CLAIM.years.map(y => ({ ...y, outstanding_p: 0, paid_p: y.net_p, settled: true })) };
  assert.equal(scope(settled, "all"), null);
  assert.equal(scope(settled, "current"), null);
});

test("somebody behind on older years but straight for this one is offered only the arrears", () => {
  const paidThisYear = { ...CLAIM, outstanding_p: 26000,
    years: CLAIM.years.map(y => y.year === 2026
      ? { ...y, outstanding_p: 0, paid_p: y.net_p, settled: true } : y) };
  assert.equal(scope(paidThisYear, "current"), null);
  assert.deepEqual(scope(paidThisYear, "all").years, [2021, 2022, 2025]);
});

test("the fee-changed sentence is worked out from the record, not written down", () => {
  const note = feeNote(CLAIM);
  assert.deepEqual(note, { before: 8000, from: 2024 });
  //  A member whose every year is the same fee is told nothing, because
  //  there is nothing that needs explaining.
  const flat = { ...CLAIM, years: CLAIM.years.map(y => ({ ...y, fee_p: 10000, net_p: 10000 })) };
  assert.equal(feeNote(flat), null);
  //  And one single year cannot have a change in it.
  assert.equal(feeNote({ ...CLAIM, years: [CLAIM.years[0]] }), null);
});

test("the words used about somebody's money", () => {
  const owing  = CLAIM.years.find(y => y.year === 2026);
  const paid   = CLAIM.years.find(y => y.year === 2024);
  assert.equal(label(owing).text, "Not yet paid");   //  never "Unpaid"
  assert.equal(label(owing).kind, "due");
  assert.equal(label(paid).kind, "paid");
  //  A year the office has set aside says so, instead of looking like a
  //  payment nobody can find.
  assert.equal(label({ ...owing, waived_p: 10000, outstanding_p: 0 }).text, "Set aside");
  //  Part-paid shows both halves; "Not yet paid" against \u00a340 already in
  //  would send somebody to the office to ask where their money went.
  assert.equal(label({ ...owing, paid_p: 4000, outstanding_p: 6000 }).text,
               "\u00a340 of \u00a3100");
});

test("a reference typed without its dashes is still a reference", () => {
  assert.equal(tidyReference("mf260042"), "MF-26-0042");
  assert.equal(tidyReference("MF-26-0042"), "MF-26-0042");
  assert.equal(tidyReference("mf 26 0042"), "MF-26-0042");
  assert.ok(REFERENCE_RE.test(tidyReference("mf260042")));
  assert.ok(!REFERENCE_RE.test(tidyReference("MF-26-42")));
  //  It cannot grow past a real reference however much is pasted in.
  assert.equal(tidyReference("MF260042999999").length, 11);
});
