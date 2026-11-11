/**
 * Taiyabah Masjid — what the holiday planner was built from, in sixteen hex.
 * Copyright (c) 2026 Yameen Bux. All rights reserved. See LICENSE.md.
 *
 * Two things read this: the builder, which stamps the fingerprint into
 * planner/planner.json, and the gate check, which recomputes it and fails if
 * it has moved. They must agree about what counts as a change, so the
 * computation lives here once — the same reason scripts/lib/athkar-entries.mjs
 * exists, and the same failure if it did not: a committed sheet that quietly
 * stops matching the data while every check still passes.
 *
 * WHAT IS IN THE PRINT. Only what a reader of the sheet would notice: the
 * span of the year, and each closure and Islamic date with the fields the
 * planner actually sets in type. The `id` is in because it keys the app's
 * translations, so renaming one is a change the sheet should be rebuilt for.
 * Order is NOT normalised — the planner prints these lists in file order, so
 * reordering them reorders the sheet, and that is a difference worth catching.
 *
 * It reads the data by importing it, rather than by parsing the file, so that
 * what is fingerprinted is exactly what the app would load.
 */
import path from "node:path";
import crypto from "node:crypto";

const root = path.resolve(import.meta.dirname, "../..");

export async function madrasahData() {
  return await import(path.join(root, "native/src/madrasah-data.js"));
}

export async function fingerprint(data) {
  const d = data || await madrasahData();
  return { all: h(lines(d).join("\u0000")), ...parts(d) };
}

/* Per item as well as overall, so the gate can name the closure that moved
   rather than only saying the sheet is stale. */
export function parts(d) {
  return {
    year: h(`${d.MAD_YEAR.from}|${d.MAD_YEAR.to}`),
    closures: Object.fromEntries(d.MAD_CLOSURES.map(c => [c.id, h(closure(c))])),
    events: Object.fromEntries(d.MAD_EVENTS.map(e => [e.id, h(event(e))])),
  };
}

export const labelOf = (d, kind, id) =>
  (kind === "closures" ? d.MAD_CLOSURES : d.MAD_EVENTS).find(x => x.id === id)?.name || id;

const h = s => crypto.createHash("sha256").update(s).digest("hex").slice(0, 16);
const closure = c => `shut|${c.id}|${c.from}|${c.to}|${c.name}|${c.note ?? ""}`;
const event = e => `evt|${e.id}|${e.on}|${e.name}|${e.sub ?? ""}`;
const lines = d => [`year|${d.MAD_YEAR.from}|${d.MAD_YEAR.to}`,
                    ...d.MAD_CLOSURES.map(closure), ...d.MAD_EVENTS.map(event)];
