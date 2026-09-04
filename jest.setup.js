/* Setup de Jest: mocks de módulos nativos que las pantallas/clientes tocan. */
// `@testing-library/react-native` v13 extiende `expect` solo al importarse; el
// subpath `/extend-expect` se eliminó.
require('@testing-library/react-native');

// expo-video (SDK 55): módulo nativo. Mock mínimo — `useVideoPlayer` devuelve un
// player inerte y `<VideoView>` no renderiza nada. Los tests de recuperación de
// stream vigilan un objeto propio, no éste.
jest.mock('expo-video', () => {
  const React = require('react');
  const player = {
    play: jest.fn(),
    pause: jest.fn(),
    replace: jest.fn(),
    replay: jest.fn(),
    seekBy: jest.fn(),
    addListener: jest.fn(() => ({ remove: jest.fn() })),
    removeAllListeners: jest.fn(),
    generateThumbnailsAsync: jest.fn(async () => []),
    muted: false,
    loop: false,
    playing: false,
    currentTime: 0,
    duration: 0,
    bufferedPosition: 0,
    status: 'idle',
    timeUpdateEventInterval: 0,
  };
  return {
    useVideoPlayer: jest.fn(() => player),
    createVideoPlayer: jest.fn(() => player),
    VideoView: React.forwardRef((_props, _ref) => null),
    isPictureInPictureSupported: jest.fn(() => false),
  };
});

// `useEventListener` de `expo`: en tests no adjuntamos listeners nativos.
jest.mock('expo', () => ({
  ...jest.requireActual('expo'),
  useEvent: jest.fn(() => ({})),
  useEventListener: jest.fn(),
}));

// expo-secure-store: los clientes de `api/*` leen el token desde acá.
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async () => 'test-token'),
  setItemAsync: jest.fn(async () => undefined),
  deleteItemAsync: jest.fn(async () => undefined),
}));

// OneSignal se inicializa en App.tsx; en tests no queremos el módulo nativo.
jest.mock('react-native-onesignal', () => ({
  OneSignal: {
    initialize: jest.fn(),
    login: jest.fn(),
    logout: jest.fn(),
    Notifications: {
      requestPermission: jest.fn(async () => true),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    },
    User: {
      pushSubscription: {
        getIdAsync: jest.fn(async () => 'sub-id'),
        optIn: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      },
    },
  },
}));

// AsyncStorage (ThemeProvider hidrata el modo desde acá).
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// safe-area-context trae su propio mock listo para tests.
jest.mock('react-native-safe-area-context', () =>
  require('react-native-safe-area-context/jest/mock').default,
);
