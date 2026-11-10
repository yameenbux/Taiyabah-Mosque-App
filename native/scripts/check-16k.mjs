/**
 * Taiyabah Masjid — every native library must support 16 KB memory pages.
 * Copyright (c) 2026 Yameen Bux. All rights reserved. See LICENSE.md.
 *
 * WHY THIS EXISTS. On 10 November 2026 the Play Console refused version code
 * 15 outright: "Your app does not support 16 KB memory page sizes." That is an
 * error on the upload, not a warning, so the app could not be updated at all.
 *
 * It was found by a person pressing Upload, twenty-five minutes after a build
 * that had passed every check in the release workflow — because every one of
 * those checks reads the manifest, the applicationId, the signature and the
 * version code, and none of them had ever looked inside a .so file.
 *
 * WHAT GOOGLE ACTUALLY REQUIRES. Most Android devices use 4 KB memory pages;
 * newer 64-bit ones use 16 KB. A shared library is loadable on a 16 KB device
 * only if each of its PT_LOAD segments is aligned to at least 16384 bytes. An
 * app targeting API 35+ must satisfy this for every library it ships.
 *
 * WHAT IT IS NOT. It is not zipalign, which aligns entries within the archive
 * and says nothing about the ELF inside. Passing `zipalign -P 16` and passing
 * this check are unrelated facts, which is the trap the first attempt fell
 * into.
 *
 * WHAT WENT WRONG LAST TIME. 72 of the 76 libraries in the bundle were 4 KB
 * aligned, and they included libreactnative.so, libhermes.so, libjsi.so and
 * libc++_shared.so — prebuilt binaries that arrive from Maven rather than
 * being compiled here. No Gradle flag can realign those. The fix was moving
 * Expo SDK 52 to 53, whose React Native 0.79 publishes them aligned.
 *
 * So this check cannot tell you how to fix a failure, and it does not try. It
 * tells you WHICH libraries are wrong, which is the difference between bumping
 * one dependency and upgrading the whole SDK.
 *
 * Reads the ELF program headers directly: no NDK, no Python, no download.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const PT_LOAD = 1;
const NEEDED = 16384;

/* The smallest p_align across a library's loadable segments. That is the one
 * that decides it: a library is only as loadable as its worst segment. */
function minLoadAlign(buf) {
  if (buf.length < 64 || buf.readUInt32BE(0) !== 0x7f454c46) return null;  /* \x7fELF */
  const is64 = buf[4] === 2;
  const le = buf[5] === 1;
  const u16 = o => (le ? buf.readUInt16LE(o) : buf.readUInt16BE(o));
  const u32 = o => (le ? buf.readUInt32LE(o) : buf.readUInt32BE(o));
  const u64 = o => Number(le ? buf.readBigUInt64LE(o) : buf.readBigUInt64BE(o));

  const phoff = is64 ? u64(0x20) : u32(0x1c);
  const phentsize = u16(is64 ? 0x36 : 0x2a);
  const phnum = u16(is64 ? 0x38 : 0x2c);

  let min = null;
  for (let i = 0; i < phnum; i++) {
    const off = phoff + i * phentsize;
    if (off + phentsize > buf.length) break;
    if (u32(off) !== PT_LOAD) continue;
    const align = is64 ? u64(off + 0x30) : u32(off + 0x1c);
    if (min === null || align < min) min = align;
  }
  return min;
}

const archive = process.argv[2];
if (!archive || !fs.existsSync(archive)) {
  console.error("usage: node scripts/check-16k.mjs <app.aab|app.apk>");
  process.exit(2);
}

const list = execFileSync("unzip", ["-Z1", archive], { encoding: "utf8", maxBuffer: 64 << 20 })
  .split("\n").map(s => s.trim()).filter(s => s.endsWith(".so"));

if (!list.length) {
  console.error(`::error::${path.basename(archive)} contains no .so files at all, which cannot be right for a React Native build — this check is not looking where it thinks it is.`);
  process.exit(1);
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "so16k-"));
const bad = new Map();   /* library name -> set of alignments seen */
let checked = 0;

for (const entry of list) {
  const out = path.join(tmp, "lib.so");
  const data = execFileSync("unzip", ["-p", archive, entry], { maxBuffer: 256 << 20 });
  fs.writeFileSync(out, data);
  const align = minLoadAlign(fs.readFileSync(out));
  checked++;
  if (align === null || align < NEEDED) {
    const name = entry.split("/").pop();
    if (!bad.has(name)) bad.set(name, new Set());
    bad.get(name).add(align === null ? "not an ELF" : String(align));
  }
}
fs.rmSync(tmp, { recursive: true, force: true });

if (!bad.size) {
  console.log(`all ${checked} native libraries are aligned to at least ${NEEDED} bytes, so they load on a 16 KB page device`);
  process.exit(0);
}

console.error(`::error::${bad.size} of ${checked} native libraries are not 16 KB aligned. Play refuses the upload, and the app would fail to load them on a 16 KB device.`);
for (const [name, aligns] of [...bad].sort()) {
  console.error(`  ${name.padEnd(42)} align=${[...aligns].join(", ")}`);
}
console.error("");
console.error("A library compiled here is fixed by the NDK the build uses. One that");
console.error("arrives prebuilt — libreactnative.so, libhermes.so, libjsi.so,");
console.error("libc++_shared.so — can only be fixed by moving to a React Native that");
console.error("publishes it aligned, which means an Expo SDK upgrade.");
process.exit(1);
