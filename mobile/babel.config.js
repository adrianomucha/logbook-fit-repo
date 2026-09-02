module.exports = function (api) {
  api.cache(true);
  return {
    presets: [['babel-preset-expo', { jsxImportSource: 'nativewind' }], 'nativewind/babel'],
    // Reanimated 4: the worklets plugin has to be the last plugin listed
    plugins: ['react-native-worklets/plugin'],
  };
};
