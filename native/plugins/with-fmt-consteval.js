/**
 * Let the fmt pod compile under Xcode 26's Clang.
 *
 * WHY THIS EXISTS. Since 28 April 2026 Apple refuses any upload built with an
 * SDK older than iOS 26, which means Xcode 26, which means a far newer Clang
 * than Expo SDK 52 and React Native 0.76 were released against. On Apple Clang
 * 21 (Xcode 26.4 and later) the vendored fmt does not build at all:
 *
 *   Pods/fmt/include/fmt/format-inl.h:59:24: error: call to consteval function
 *     'fmt::basic_format_string<...>::basic_format_string<FMT_COMPILE_STRING,0>'
 *     is not a constant expression
 *
 * consteval requires the call be evaluated at compile time, and the newer
 * compiler is stricter about what qualifies. Nothing in this app reaches fmt
 * directly — it arrives under RCT-Folly, under React Native — so there is no
 * call site here to correct.
 *
 * WHY THE OBVIOUS FIX DOES NOT WORK. The first attempt added
 * FMT_USE_CONSTEVAL=0 to GCC_PREPROCESSOR_DEFINITIONS, which is what fmt's own
 * documentation implies. React Native pins fmt 11.0.2, and in that version
 * FMT_USE_CONSTEVAL is NOT #ifdef-guarded: fmt's detection chain defines it
 * unconditionally and overwrites anything passed with -D. The guard that makes
 * the flag work was added in fmt 12.1.0, which React Native has not taken
 * (facebook/react-native#55601, fmtlib/fmt#4740). So the define is accepted,
 * silently discarded, and the archive fails exactly as before.
 *
 * WHAT WORKS. Rewriting the define in the header itself, after CocoaPods has
 * fetched the pod and before it is compiled. This is the workaround Expo's own
 * issue thread arrived at (expo/expo#44229). With consteval off, the format
 * strings are checked at runtime rather than compile time — in a library this
 * app never calls.
 *
 * The release workflow also now prefers the OLDEST Xcode that satisfies
 * Apple's floor, because the regression arrived in Clang 21 and Xcode 26.0 to
 * 26.3 compile this unmodified. This patch stays regardless: it is idempotent,
 * it is a no-op on a fmt that does not match, and depending on a runner image
 * happening to carry an older Xcode is not a fix.
 *
 * THIS IS A STOPGAP. The real fix is an Expo SDK upgrade carrying a fmt built
 * for this compiler. That is a large change — it moves React Native, and with
 * it the OneSignal pin and the New Architecture flag this project has already
 * been bitten by — and should be made deliberately.
 */
const { withDangerousMod } = require("expo/config-plugins");
const fs = require("fs");
const path = require("path");

const MARKER = "FMT_USE_CONSTEVAL";

/* Ruby, run by CocoaPods inside post_install. It edits the fetched pod rather
 * than passing a flag, for the reason set out above. */
const PATCH = `
    # See plugins/with-fmt-consteval.js. fmt 11.0.2 defines FMT_USE_CONSTEVAL
    # unconditionally, so -D flags are overwritten and the header has to be
    # edited instead. Idempotent, and a no-op on any fmt that does not match.
    begin
      fmt_dir = installer.sandbox.pod_dir('fmt')
      fmt_base = fmt_dir.nil? ? nil : File.join(fmt_dir, 'include', 'fmt', 'base.h')
      if fmt_base && File.exist?(fmt_base)
        before = File.read(fmt_base)
        after = before.gsub(/^(\\s*#\\s*define\\s+FMT_USE_CONSTEVAL\\s+)1\\s*$/) { "#{$1}0" }
        if after != before
          File.chmod(0644, fmt_base)
          File.write(fmt_base, after)
          Pod::UI.puts 'fmt: FMT_USE_CONSTEVAL forced to 0 for Xcode 26 (plugins/with-fmt-consteval.js)'
        else
          Pod::UI.warn 'fmt: no FMT_USE_CONSTEVAL 1 to patch — if the archive fails on consteval, this patch no longer matches fmt'
        end
      else
        Pod::UI.warn 'fmt: pod directory not found, consteval patch skipped'
      end
    rescue => e
      Pod::UI.warn "fmt: consteval patch failed (#{e.message})"
    end
`;

module.exports = function withFmtConsteval(config) {
  return withDangerousMod(config, ["ios", cfg => {
    const podfile = path.join(cfg.modRequest.platformProjectRoot, "Podfile");
    let src = fs.readFileSync(podfile, "utf8");

    if (src.includes(MARKER)) return cfg;

    /* Appended to the existing post_install rather than adding a second one:
     * CocoaPods honours only one, and a silently ignored block would fail the
     * archive again with nothing to explain it. */
    const hook = /post_install do \|installer\|\n/;
    if (!hook.test(src)) {
      throw new Error(
        "with-fmt-consteval: no `post_install do |installer|` in the generated Podfile. "
        + "Expo's template changed shape, so this patch would be dropped and the archive "
        + "would fail on fmt's consteval error again with nothing to say why.");
    }
    src = src.replace(hook, m => m + PATCH);
    fs.writeFileSync(podfile, src);
    return cfg;
  }]);
};
