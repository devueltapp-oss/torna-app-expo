// ⚠️ `babel-preset-expo` **inlina** las `EXPO_PUBLIC_*` en tiempo de transform: setearlas
// dentro de un test llega tarde (el módulo ya quedó compilado con el valor vacío, y
// `initNotifications` corta apenas ve el app id vacío). Por eso se definen acá, antes de
// que jest transforme nada.
process.env.EXPO_PUBLIC_ONESIGNAL_APP_ID =
  process.env.EXPO_PUBLIC_ONESIGNAL_APP_ID || 'test-onesignal-app-id';

module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|lucide-react-native|@react-native-firebase))',
  ],
};
