// Environment variables — accessed via process.env.EXPO_PUBLIC_*
// Expo automatically exposes EXPO_PUBLIC_ prefixed vars to the JS bundle.
declare namespace NodeJS {
  interface ProcessEnv {
    EXPO_PUBLIC_API_URL?: string;
    EXPO_PUBLIC_ONESIGNAL_APP_ID?: string;
  }
}
