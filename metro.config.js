// Metro config para Expo SDK 55. Antes no existía y Metro tomaba defaults; a partir
// de SDK 53 conviene extender el de Expo explícitamente (package exports, resolución
// de assets, symlinks).
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

module.exports = config;
