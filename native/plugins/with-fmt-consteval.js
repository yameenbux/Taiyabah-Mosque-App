/**
 * Let the fmt pod compile under Xcode 26's Clang.
 *
 * WHY THIS EXISTS. Apple now refuses any upload built with an SDK older than
 * iOS 26, which means Xcode 26, which means a much newer Clang than the one
 * Expo SDK 52 and React Native 0.76 were released against. On that compiler the
 * vendored fmt fails to build at all:
 *
 *   Pods/fmt/include/fmt/format-inl.h:60:22: error: call to consteval function
 *     'fmt::basic_format_string<...>::basic_format_string<FMT_COMPILE_STRING,0>'
 *     is not a constant expression
 *
 * consteval demands the call be evaluated at compile time, and newer Clang is
 * stricter about what qualifies than the compiler fmt's authors tested against.
 * Nothing in this app reaches fmt directly — it arrives under folly, under
 * React Native — so there is no call site here to correct.
 *
 * fmt anticipates this. FMT_USE_CONSTEVAL is #ifndef-guarded precisely so it
 * can be forced off, and with it off FMT_CONSTEVAL expands to nothing, the
 * functions become ordinary constexpr, and the format strings are checked at
 * runtime instead of compile time. The cost is losing a compile-time check in a
 * library this app never calls. That is the whole price.
 *
 * WHY A CONFIG PLUGIN. `expo prebuild --clean` regenerates ios/ and its Podfile
 * on every run, so a hand-edit would last exactly until the next build. This is
 * applied where the Podfile is written, which is also why it matches the
 * existing with-api-36.js: the same reasoning, for Android.
 *
 * THIS IS A STOPGAP. The real fix is an Expo SDK upgrade, which brings a fmt
 * new enough for this compiler. That is a large change and should be made
 * deliberately, not at the end of an evening against a deadline.
 */
const { withDangerousMod } = require("expo/config-plugins");
const fs = require("fs");
const path = require("path");

const MARKER = "FMT_USE_CONSTEVAL=0";

const PATCH = `
    # See plugins/with-fmt-consteval.js. Xcode 26's Clang rejects fmt's
    # consteval format-string checks, and fmt itself provides this switch.
    installer.pods_project.targets.each do |fmt_target|
      fmt_target.build_configurations.each do |fmt_config|
        defs = fmt_config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] || ['$(inherited)']
        defs = [defs] if defs.is_a?(String)
        defs << '${MARKER}' unless defs.include?('${MARKER}')
        fmt_config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] = defs
      end
    end
`;

module.exports = function withFmtConsteval(config) {
  return withDangerousMod(config, ["ios", cfg => {
    const podfile = path.join(cfg.modRequest.platformProjectRoot, "Podfile");
    let src = fs.readFileSync(podfile, "utf8");

    if (src.includes(MARKER)) return cfg;

    /* Appended to the existing post_install rather than a second one: CocoaPods
     * accepts only one, and a silently ignored block is worse than an error. */
    const hook = /post_install do \|installer\|\n/;
    if (!hook.test(src)) {
      throw new Error(
        "with-fmt-consteval: no `post_install do |installer|` in the generated Podfile. "
        + "Expo's template changed shape, so this patch would be silently dropped and the "
        + "archive would fail on fmt again with nothing to say why.");
    }
    src = src.replace(hook, m => m + PATCH);
    fs.writeFileSync(podfile, src);
    return cfg;
  }]);
};
