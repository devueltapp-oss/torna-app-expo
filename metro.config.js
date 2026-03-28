// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// @react-aria/utils@3.33.1 (pulled in transitively by @gluestack-ui/themed →
// @gluestack-ui/tooltip → @react-native-aria/utils) imports `flushSync` from
// react-dom in its animation helpers. That code path is unreachable on React
// Native (it requires DOM nodes with .getAnimations()), so we redirect the
// import to a safe stub that satisfies the module graph without crashing.
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  'react-dom': path.resolve(__dirname, 'src/stubs/react-dom.js'),
};

module.exports = config;
