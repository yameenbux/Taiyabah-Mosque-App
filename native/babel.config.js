module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    /* Reanimated's plugin is not optional. React Navigation pulls Reanimated
       in, and without this the worklets it generates are never transformed —
       which fails at build on some setups and at runtime on the rest. It must
       also stay LAST in the list; that is its own documented requirement. */
    plugins: ["react-native-reanimated/plugin"],
  };
};
