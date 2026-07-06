/* Setup de Jest: mocks de módulos nativos que las pantallas/clientes tocan. */
require('@testing-library/react-native/extend-expect');

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
    Notifications: { requestPermission: jest.fn(), addEventListener: jest.fn() },
    User: { pushSubscription: { getIdAsync: jest.fn(async () => 'sub-id') } },
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
