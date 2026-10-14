/**
 * Taiyabah Masjid — lets plain Node import the app's own modules.
 * Copyright (c) 2026 Yameen Bux. All rights reserved. See LICENSE.md.
 *
 * Metro resolves `./timetable` and imports JSON without ceremony; Node's ESM
 * loader does neither. Rather than rewrite every import in the app to suit the
 * test runner — the tail wagging the dog — this teaches Node the two things
 * Metro already knows, for the duration of a test run only.
 *
 * The point of doing it this way: the tests then exercise THE REAL MODULES,
 * the same files the app ships, rather than copies that can drift away from
 * them. A test of a copy is a test of nothing.
 */
import { existsSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

/* The two modules that exist only on a phone, stood in for by notebooks that
 * write down what they were asked to do. This is what lets a test RUN
 * src/reminders.js — whose first two lines import these — instead of merely
 * reading it. Two tests that read that file passed for weeks while arm()
 * threw on its first prayer and scheduled nothing at all.
 *
 * The stubs are ordinary modules in the main thread, so a test can import the
 * same file by path and read the record back. Only this hook runs off-thread. */
const NATIVE_ONLY = {
  "expo-notifications": new URL("./test/stubs/expo-notifications.mjs", import.meta.url).href,
  "react-native":       new URL("./test/stubs/react-native.mjs",       import.meta.url).href,
  "@react-native-async-storage/async-storage":
                        new URL("./test/stubs/async-storage.mjs",      import.meta.url).href,
};

export async function resolve(specifier, context, next) {
  const stub = NATIVE_ONLY[specifier];
  if (stub) return { url: stub, shortCircuit: true };

  /* JSON, which Node will otherwise refuse without an import attribute. */
  if (specifier.endsWith(".json")) {
    const r = await next(specifier, context);
    return { ...r, importAttributes: { ...r.importAttributes, type: "json" } };
  }

  /* Extensionless relative imports — "./timetable", "./supabase". */
  if (specifier.startsWith(".") && !path.extname(specifier)) {
    const from = context.parentURL ? path.dirname(fileURLToPath(context.parentURL)) : process.cwd();
    const base = path.resolve(from, specifier);
    for (const ext of [".js", ".jsx", ".mjs", "/index.js", "/index.jsx"]) {
      if (existsSync(base + ext)) return next(pathToFileURL(base + ext).href, context);
    }
  }

  return next(specifier, context);
}
