/**
 * useNearbyLocation — el latido de posición del aviso de partidas cercanas.
 *
 * Lo que se fija acá son las tres reglas de privacidad del hook, que son
 * invisibles mirando la UI y fáciles de romper sin darse cuenta:
 *
 *  1. El latido **nunca** pide permiso (solo lo hace el toggle).
 *  2. Con el opt-in apagado **no se reporta nada**.
 *  3. Apagar el toggle borra la posición del servidor.
 */
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useNearbyLocation } from '../useNearbyLocation';
import * as api from '../../api/nearby';
import * as location from '../../lib/location';

jest.mock('../../api/nearby');
jest.mock('../../lib/location');

const mockedApi = api as jest.Mocked<typeof api>;
const mockedLocation = location as jest.Mocked<typeof location>;

const settings = (over: Partial<api.NearbySettings> = {}): api.NearbySettings => ({
  enabled: false,
  hasLocation: false,
  updatedAt: null,
  radiusKm: 25,
  ...over,
});

beforeEach(() => {
  jest.clearAllMocks();
  mockedLocation.currentPosition.mockResolvedValue({
    coords: { latitude: 10.4915, longitude: -66.9036 },
    reason: null,
  });
  mockedLocation.requestPositionOnce.mockResolvedValue({
    coords: { latitude: 10.4915, longitude: -66.9036 },
    reason: null,
  });
  mockedApi.updateMyLocation.mockResolvedValue(settings({ enabled: true, hasLocation: true }));
  mockedApi.setNearbyEnabled.mockResolvedValue(settings({ enabled: true }));
});

describe('useNearbyLocation — latido', () => {
  it('con el opt-in apagado no reporta ninguna posición', async () => {
    mockedApi.fetchNearbySettings.mockResolvedValue(settings({ enabled: false }));

    const { result } = renderHook(() => useNearbyLocation(true));
    await waitFor(() => expect(result.current.settings).not.toBeNull());

    expect(mockedApi.updateMyLocation).not.toHaveBeenCalled();
    // Y sobre todo: no se le pide el GPS a nadie que no lo pidió.
    expect(mockedLocation.currentPosition).not.toHaveBeenCalled();
  });

  it('con el opt-in activo reporta al montar, SIN pedir permiso', async () => {
    mockedApi.fetchNearbySettings.mockResolvedValue(settings({ enabled: true }));

    renderHook(() => useNearbyLocation(true));

    await waitFor(() =>
      expect(mockedApi.updateMyLocation).toHaveBeenCalledWith(10.4915, -66.9036),
    );
    // `currentPosition` devuelve 'denied' si el permiso no está; el que pregunta
    // es `requestPositionOnce`, y el latido no puede usarlo: abriría el diálogo
    // del sistema sin que el usuario haya tocado nada.
    expect(mockedLocation.currentPosition).toHaveBeenCalled();
    expect(mockedLocation.requestPositionOnce).not.toHaveBeenCalled();
  });

  it('sin usuario logueado no consulta nada', async () => {
    renderHook(() => useNearbyLocation(false));
    expect(mockedApi.fetchNearbySettings).not.toHaveBeenCalled();
  });

  it('permiso denegado deja el motivo a la vista y no rompe', async () => {
    mockedApi.fetchNearbySettings.mockResolvedValue(settings({ enabled: true }));
    mockedLocation.currentPosition.mockResolvedValue({ coords: null, reason: 'denied' });

    const { result } = renderHook(() => useNearbyLocation(true));

    await waitFor(() => expect(result.current.problem).toBe('denied'));
    expect(mockedApi.updateMyLocation).not.toHaveBeenCalled();
  });
});

describe('useNearbyLocation — toggle', () => {
  it('encender pide permiso, activa el flag y reporta la primera posición', async () => {
    mockedApi.fetchNearbySettings.mockResolvedValue(settings({ enabled: false }));
    const { result } = renderHook(() => useNearbyLocation(true));
    await waitFor(() => expect(result.current.settings).not.toBeNull());

    await act(async () => {
      await result.current.enable();
    });

    expect(mockedLocation.requestPositionOnce).toHaveBeenCalled();
    expect(mockedApi.setNearbyEnabled).toHaveBeenCalledWith(true);
    expect(mockedApi.updateMyLocation).toHaveBeenCalledWith(10.4915, -66.9036);
    expect(result.current.settings?.enabled).toBe(true);
  });

  /**
   * Si el usuario rechaza el permiso, el flag NO se enciende: quedaría un opt-in
   * que no puede producir ni un solo aviso, y el switch mentiría.
   */
  it('permiso rechazado: no enciende el flag', async () => {
    mockedApi.fetchNearbySettings.mockResolvedValue(settings({ enabled: false }));
    mockedLocation.requestPositionOnce.mockResolvedValue({ coords: null, reason: 'denied' });

    const { result } = renderHook(() => useNearbyLocation(true));
    await waitFor(() => expect(result.current.settings).not.toBeNull());

    await act(async () => {
      await result.current.enable();
    });

    expect(mockedApi.setNearbyEnabled).not.toHaveBeenCalled();
    expect(result.current.problem).toBe('denied');
  });

  it('apagar manda enabled:false (que del lado del servidor borra la posición)', async () => {
    mockedApi.fetchNearbySettings.mockResolvedValue(settings({ enabled: true, hasLocation: true }));
    mockedApi.setNearbyEnabled.mockResolvedValue(settings({ enabled: false, hasLocation: false }));

    const { result } = renderHook(() => useNearbyLocation(true));
    await waitFor(() => expect(result.current.settings?.enabled).toBe(true));

    await act(async () => {
      await result.current.disable();
    });

    expect(mockedApi.setNearbyEnabled).toHaveBeenCalledWith(false);
    expect(result.current.settings?.hasLocation).toBe(false);
  });
});
