#!/usr/bin/env node
/**
 * Taiyabah Masjid — nothing the ʿulamā approved changes without them knowing.
 * Copyright (c) 2026 Yameen Bux. All rights reserved. See LICENSE.md.
 *
 * A signature on paper fixes the text at one moment. It says nothing about
 * the moment after. Somebody corrects a typo in an āyah eighteen months from
 * now, in good faith, and the masjid is publishing words two ʿālims never
 * saw while believing it is publishing words they did.
 *
 * So the approval is recorded as a FINGERPRINT of every entry — its Arabic,
 * its English, its transliteration, its count and its reference — taken at
 * the moment of signing. After that, any change to an approved entry fails
 * this check, which runs in the gate, and the only way past it is a fresh
 * signature. That is the whole idea: approval that expires on edit rather
 * than on trust.
 *
 *   node scripts/check-athkar-approved.mjs            # the gate runs this
 *   node scripts/check-athkar-approved.mjs --record "Name 1" "Name 2"
 *
 * BEFORE ANY APPROVAL IS RECORDED this passes and says so. It is not a stick
 * to beat the masjid with for not having asked yet; it is a record of what
 * was answered once somebody has answered.
 *
 * WHAT IT CANNOT SEE. Whether the approval was any good, whether the two
 * reviewers were independent, whether anyone read past page four. It checks
 * that the words on the signed sheet are the words in the app, and nothing
 * more. docs/athkar-approval-record.md holds the rest, in prose, for people.
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { flat } from "./lib/athkar-entries.mjs";

const root = path.resolve(import.meta.dirname, "..");
const RECORD = path.join(root, "docs/athkar-approved.json");

/* Everything a reviewer actually read, and nothing else. The id is left out
   on purpose: moving an entry between sets is not a change to its wording,
   and re-approval should be asked for when the WORDS move, not the order. */
const print = e => crypto.createHash("sha256")
  .update([e.ar, e.tr, e.en, e.times, e.source, e.note].map(x => x ?? "").join("\u0000"))
  .digest("hex").slice(0, 16);

const now = flat();

/* ---- recording an approval --------------------------------------------- */
if (process.argv.includes("--record")) {
  const names = process.argv.slice(process.argv.indexOf("--record") + 1).filter(a => !a.startsWith("--"));
  if (names.length < 2) {
    console.error("Two reviewers are required.\n" +
                  '  node scripts/check-athkar-approved.mjs --record "First ʿālim" "Second ʿālim"');
    process.exit(1);
  }
  const rec = {
    approvedOn: new Date().toISOString().slice(0, 10),
    reviewers: names,
    note: "Fingerprints of every entry as approved. Do not hand-edit: regenerate with --record " +
          "after a fresh signature, and say what changed in docs/athkar-approval-record.md.",
    entries: Object.fromEntries(now.map(e => [e.id, print(e)])),
  };
  fs.writeFileSync(RECORD, JSON.stringify(rec, null, 1) + "\n");
  console.log(`recorded ${now.length} approved entries, ${rec.approvedOn}, ` +
              `reviewed by ${names.join(" and ")}`);
  process.exit(0);
}

/* ---- checking against it ------------------------------------------------ */
if (!fs.existsSync(RECORD)) {
  console.log(`no ʿulamā approval recorded yet — ${now.length} supplications are published unapproved\n` +
              "      docs/athkar-for-review.docx is the sheet to have signed; " +
              "then --record it here");
  process.exit(0);
}

const rec = JSON.parse(fs.readFileSync(RECORD, "utf8"));
const changed = [], added = [];
for (const e of now) {
  const was = rec.entries[e.id];
  if (was === undefined) added.push(e);
  else if (was !== print(e)) changed.push(e);
}
const removed = Object.keys(rec.entries).filter(id => !now.some(e => e.id === id));

if (changed.length || added.length || removed.length) {
  console.error(`\nThe published supplications no longer match what was approved on ` +
                `${rec.approvedOn} by ${rec.reviewers.join(" and ")}:\n`);
  for (const e of changed)
    console.error(`  CHANGED  ${e.id}  (${e.set}${e.label ? " — " + e.label : ""})`);
  for (const e of added)
    console.error(`  ADDED    ${e.id}  (${e.set}${e.label ? " — " + e.label : ""}) — never reviewed`);
  for (const id of removed)
    console.error(`  REMOVED  ${id} — approved, but no longer published`);
  console.error(`\n  ${changed.length + added.length + removed.length} difference(s). Either put the ` +
                `wording back, or have the\n  changes signed off and re-record:\n` +
                `    node scripts/build-athkar-review.mjs\n` +
                `    node scripts/check-athkar-approved.mjs --record "…" "…"\n`);
  process.exit(1);
}
console.log(`all ${now.length} supplications match the ʿulamā approval of ${rec.approvedOn} ` +
            `(${rec.reviewers.join(", ")})`);
