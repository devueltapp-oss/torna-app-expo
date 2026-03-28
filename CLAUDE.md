# CLAUDE.md — torna-app-expo

Expo SDK 55 + React Native 0.83.2 + TypeScript. Active mobile app for the Torna platform.

See root `CLAUDE.md` for the no-`/api`-prefix gotcha, shared auth model, and deprecated `torna-app/` note.

## Commands

```bash
npm start              # Start Expo dev server (requires dev client)
npm run ios            # Build + run on iOS simulator: iPhone 16e
npm run android        # Build + run on Android
npm run lint           # Run ESLint
npm run test           # Run Jest tests
```

### iOS Build Flow (after any native change or first clone)

```bash
npm install
cd ios && pod install
cd .. && npm run ios   # first build: ~5-10 min
```

### EAS Builds

`eas.json` defines three profiles: `development` (dev client, simulator), `preview` (internal), `production` (store).

---

## Architecture

### Provider Stack (`App.tsx`, outermost first)
1. `GestureHandlerRootView` + `SafeAreaProvider`
2. `GluestackUIProvider` (config at `config/gluestack-ui.config.ts`)
3. `AuthProvider` → `ProfileRefreshProvider` → `AuthDialogProvider`
4. `OneSignalProvider`
5. `SplashScreenProvider`
6. `MainNavigatorContainer`

### Navigation
Three-tier: `MainNavigatorContainer` (NativeStack) → `TabNavigator` → nested stacks (e.g. `DiscoverNavigator`).
- Screen route keys: `src/config/screens.tsx` (`Screens` object)
- Param types: `MainNavigatorParamList` in `src/navigators/main-navigator/index.tsx`

### State Management
- **React Context** (`src/contexts/`) — primary global state: `AuthContext`, `OneSignalContext`, `SplashScreenContext`, `ProfileRefreshContext`
- **Zustand** (`src/store/tokenLogin.tsx`) — token + user data
- **AsyncStorage** (`src/utils/storage.ts`) — persistence

---

## API Layer

`src/api/index.ts` exports `createAxiosInstance(token)` — sets `baseURL` from `EXPO_PUBLIC_API_URL`, injects Bearer token on every request.

Pipeline trim polling: 2.5s interval, transitions `PENDING → RUNNING → COMPLETED | FAILED`.

---

## Key Conventions

- **Path aliases**: `@/` → `src/` (configured in both `babel.config.js` and `tsconfig.json`). Never use relative imports.
- **Reanimated plugin** must be **last** in `babel.config.js` plugins list
- **Colors**: always import from `@/config/theme`, no hardcoded hex values
- **Forms**: Formik + Yup
- **Styling**: `react-native-unistyles` 2.x for custom styles, Gluestack UI for pre-built components
- Prettier: single quotes, no bracket spacing, trailing commas

---

## iOS Native Details

- Bundle identifier: `com.tornapp`
- Deployment target: iOS 15.1
- New Architecture: **disabled**
- Hermes: enabled
- `FOLLY_CFG_NO_COROUTINES=1` required in Podfile `post_install` block
- Firebase iOS: requires `withFirebaseSwiftAppDelegate` custom Expo plugin in `app.json`

---

## Environment Variables

```
EXPO_PUBLIC_API_URL          # Backend base URL (http://localhost:4000, NO /api suffix)
EXPO_PUBLIC_ONESIGNAL_APP_ID # OneSignal app ID
```

Firebase config lives in `GoogleService-Info.plist` (iOS) and `google-services.json` (Android) — not committed to git.
