#!/usr/bin/env node
// Teach the generated Android project to sign release builds with OUR key.
//
// WHY THIS EXISTS. `expo prebuild` writes android/app/build.gradle from a
// template, and that template signs the release build with the DEBUG keystore
// — the one that ships inside React Native, the same on every machine on
// earth. An APK signed with it installs by hand, which is all the sideload
// workflow ever needed. Play refuses it, and rightly: anybody could sign an
// update to your app.
//
// The android/ directory is build output and is not committed, so there is
// nothing to edit by hand. This runs after prebuild and before gradle.
//
// NO SECRET IS WRITTEN. The block below reads the keystore path and passwords
// out of the environment at build time. Nothing lands in a file, which matters
// because a build directory is easy to upload by accident.
//
// It fails loudly rather than quietly doing nothing: if the template ever
// changes shape, a silent no-op would produce a debug-signed .aab that looks
// finished and that Play rejects an hour later. Better to stop here.

import fs from "node:fs";

const file = "android/app/build.gradle";
const die = (why) => {
  console.error(`::error::sign-release: ${why}`);
  console.error(`::error::${file} is not the shape this expected. Expo's`);
  console.error(`::error::template changed; update scripts/sign-release.mjs.`);
  process.exit(1);
};

if (!fs.existsSync(file)) die(`${file} does not exist — run expo prebuild first`);
let src = fs.readFileSync(file, "utf8");

if (src.includes("// taiyabah: release signing")) {
  console.log("already patched");
  process.exit(0);
}

// 1. A release signing config, next to the debug one.
const anchor = "signingConfigs {";
if (!src.includes(anchor)) die("no signingConfigs block");
const block = `signingConfigs {
        // taiyabah: release signing — values come from the environment, see
        // .github/workflows/native-release.yml. Never hard-code them here.
        release {
            storeFile file(System.getenv("TAIYABAH_KEYSTORE"))
            storePassword System.getenv("TAIYABAH_KEYSTORE_PASSWORD")
            keyAlias System.getenv("TAIYABAH_KEY_ALIAS")
            keyPassword System.getenv("TAIYABAH_KEY_PASSWORD")
        }`;
src = src.replace(anchor, block);

// 2. Point the release build type at it. The template says
// `signingConfig signingConfigs.debug` twice: once in the debug build type,
// once in release. The release one is the second, and the debug one must stay
// as it is — `expo run:android` depends on it.
const uses = [...src.matchAll(/signingConfig signingConfigs\.debug/g)];
if (uses.length !== 2) die(`expected 2 uses of signingConfigs.debug, found ${uses.length}`);
const at = uses[1].index;
src = src.slice(0, at) + "signingConfig signingConfigs.release" + src.slice(at + uses[1][0].length);

fs.writeFileSync(file, src);
console.log("patched " + file + ": release builds now use signingConfigs.release");
