/**
 * Taiyabah Masjid — the Dynamic Island, from JavaScript.
 * Copyright (c) 2026 Yameen Bux. All rights reserved. See LICENSE.md.
 *
 * Everything here is a no-op anywhere but a recent iPhone, and says so by
 * returning false rather than throwing. Android has its own home-screen
 * widget and the web app cannot do any of this, so a caller that has to ask
 * which platform it is on before calling would be three call sites waiting to
 * disagree with each other.
 */
import { Platform } from "react-native";
import { requireOptionalNativeModule } from "expo-modules-core";

/* Optional on purpose: the module is iOS-only and is not in an Expo Go
   build, so requiring it outright would take the whole app down on a
   platform that was never going to use it. */
const native = Platform.OS === "ios" ? requireOptionalNativeModule("TaiyabahLiveActivity") : null;

/** Whether this phone can show one AND the person has not turned them off. */
export function isAvailable() {
  try { return !!native?.isAvailable(); } catch { return false; }
}

/** Start one. Returns whether it actually started. */
export async function start({ name, adhanMs, iqamahMs, endMs }) {
  if (!native) return false;
  try { return !!(await native.start(String(name), adhanMs, iqamahMs, endMs)); }
  catch { return false; }
}

/** End whatever is running. Used when the switch is turned off. */
export async function end() {
  if (!native) return false;
  try { return !!(await native.end()); } catch { return false; }
}
