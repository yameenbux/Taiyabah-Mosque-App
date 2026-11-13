/* Taiyabah Masjid — what a member owes, and which years each button pays.
 * Copyright (c) 2026 Yameen Bux. All rights reserved. See LICENSE.md.
 *
 * THE SCREEN DECIDES NOTHING ABOUT MONEY. Every figure here is read out of
 * what membership_claim() returned; nothing is added up from a fee the app
 * holds, and nothing is sent back to the server as an amount. The server
 * prices both buttons itself (membership_quote), because a client that could
 * name its own amount could settle five years of arrears for a penny.
 *
 * So what IS in this file is presentation and the one rule the screen has to
 * know: which years each of the two buttons covers. It is here rather than in
 * the screen so that it can be tested without a renderer, and so that the app
 * and the server can be shown to agree about it.
 *
 * THE MASJID ASKS AND CANNOT COMPEL. It is a charity. Nothing here describes a
 * member as a debtor, and `label()` deliberately says "not yet paid" rather
 * than "unpaid" — the words a screen uses about somebody's money are not
 * decoration.
 */

/* Pence to the way a British masjid writes it. Whole pounds lose the ".00",
 * because "£460.00" on a poster-sized figure reads like an invoice and every
 * membership fee this masjid has ever charged has been a whole number. */
export function money(pence) {
  const p = Math.round(Number(pence) || 0);
  const pounds = Math.floor(Math.abs(p) / 100);
  const rem = Math.abs(p) % 100;
  const sign = p < 0 ? "−" : "";
  const body = rem === 0
    ? pounds.toLocaleString("en-GB")
    : `${pounds.toLocaleString("en-GB")}.${String(rem).padStart(2, "0")}`;
  return `${sign}£${body}`;
}

/* The years as the screen shows them: newest first, which is the order
 * membership_state() already returns them in. Defended anyway, because a
 * payload that arrived in the other order would silently invert the list and
 * put 2021 at the top where this year belongs. */
export function years(state) {
  const list = Array.isArray(state?.years) ? state.years.slice() : [];
  return list.sort((a, b) => Number(b.year) - Number(a.year));
}

export const outstanding = state => Number(state?.outstanding_p) || 0;
export const yearsOwing = state => years(state).filter(y => Number(y.outstanding_p) > 0);

/* WHICH YEARS EACH BUTTON PAYS.
 *
 * "all"     every year still owing.
 * "current" THIS year alone, never the oldest. Somebody paying £100 wants to
 *           be a member now — that is what they opened the screen for. Paying
 *           the oldest year instead would take their money and leave them
 *           still not a member, which collects the same amount and gets the
 *           point of it wrong. membership_quote() applies the identical rule
 *           server-side; the test file holds both to it.
 *
 * Returns null when there is nothing for that button to do, so the screen can
 * leave it out rather than offer a button that charges £0.
 */
export function scope(state, which) {
  const owing = yearsOwing(state);
  if (!owing.length) return null;

  const wanted = which === "current"
    ? owing.filter(y => Number(y.year) === Number(state?.current_year))
    : owing;

  if (!wanted.length) return null;
  return {
    amount_p: wanted.reduce((n, y) => n + Number(y.outstanding_p), 0),
    years: wanted.map(y => Number(y.year)).sort((a, b) => a - b),
  };
}

/* "The fee was £80 until 2024. Each year is charged at the rate that applied
 * then." — DERIVED, not written down. The sentence exists because a member
 * looking at £80 against 2022 and £100 against 2025 would otherwise think one
 * of them was a mistake. Hard-coding it would make it a lie the day the fee
 * changes again, and nothing would fail.
 *
 * Returns null when every year on the record is the same fee, which is the
 * common case and needs no explaining.
 */
export function feeNote(state) {
  const list = years(state).filter(y => Number(y.fee_p) > 0);
  if (list.length < 2) return null;

  const fees = [...new Set(list.map(y => Number(y.fee_p)))];
  if (fees.length < 2) return null;

  /* Walk oldest to newest and find where it last went up. Only the most
     recent change is named: a member with three different fees on the record
     does not need a history of the fee, only to know the older ones are not
     errors. */
  const asc = list.slice().reverse();
  let changedAt = null, before = null;
  for (let i = 1; i < asc.length; i++) {
    if (Number(asc[i].fee_p) !== Number(asc[i - 1].fee_p)) {
      changedAt = Number(asc[i].year);
      before = Number(asc[i - 1].fee_p);
    }
  }
  if (changedAt === null) return null;
  return { before, from: changedAt };
}

/* What one row says on the right. The three states are not symmetrical on
 * purpose: a settled year is quiet, a waived year says so plainly rather than
 * looking like a payment nobody can find, and an unpaid year is NOT shouted
 * at — see the header. */
export function label(y) {
  if (Number(y.waived_p) > 0 && Number(y.outstanding_p) === 0) return { kind: "waived", text: "Set aside" };
  if (Number(y.outstanding_p) === 0 && Number(y.paid_p) > 0) return { kind: "paid", text: "Paid" };
  if (Number(y.outstanding_p) === 0) return { kind: "paid", text: "Nothing due" };
  if (Number(y.paid_p) > 0) return { kind: "part", text: `${money(y.paid_p)} of ${money(y.net_p)}` };
  return { kind: "due", text: "Not yet paid" };
}

/* A reference is MF-YY-NNNN and the office reads it out over the phone, so
 * the screen has to accept it typed without the dashes — the website's nikāḥ
 * box learnt the same lesson. */
export function tidyReference(s) {
  let v = String(s || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (/^MF\d/.test(v)) v = `MF-${v.slice(2)}`;
  if (/^MF-\d{2}\d/.test(v)) v = `${v.slice(0, 5)}-${v.slice(5)}`;
  return v.slice(0, 11);
}

export const REFERENCE_RE = /^MF-\d{2}-\d{4}$/;
