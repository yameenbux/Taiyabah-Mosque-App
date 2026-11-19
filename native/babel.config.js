module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    /* The worklets Babel plugin is not optional. React Navigation pulls
       Reanimated in, and without this the worklets it generates are never
       transformed — which fails at build on some setups and at runtime on the
       rest. As of Reanimated 4 the plugin lives in react-native-worklets (the
       old "react-native-reanimated/plugin" path is gone); it must still stay
       LAST in the list, which is its own documented requirement. */
    plugins: ["react-native-worklets/plugin"],
  };
};
