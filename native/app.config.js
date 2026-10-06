// app.json now names the REAL package, com.taiyabahmasjid.app — the one the
// Play listing already belongs to. That is deliberate: the thing that gets
// uploaded should be the default, so a release can never be cut from a
// nearly-right config by forgetting a flag.
//
// Which leaves the test builds. A build you sideload has to install ALONGSIDE
// whatever is on the phone from Play, or you cannot compare them and every
// test install overwrites the real app. Two apps can only coexist if they have
// different package ids, so the APK workflows set TAIYABAH_VARIANT=dev and
// this file moves them to com.taiyabahmasjid.app.dev with a visibly different
// name on the home screen.
//
// Expo passes app.json in as `config` and uses whatever comes back.

module.exports = ({ config }) => {
  if (process.env.TAIYABAH_VARIANT !== "dev") return config;

  const pkg = `${config.android.package}.dev`;
  return {
    ...config,
    name: `${config.name} (test)`,
    android: { ...config.android, package: pkg },
    ios: { ...config.ios, bundleIdentifier: pkg },
  };
};
