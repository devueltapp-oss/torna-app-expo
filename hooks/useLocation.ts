/**
 * useLocation — permiso de ubicación + coordenadas actuales (expo-location).
 *
 * Al montar chequea SILENCIOSAMENTE si el permiso ya fue otorgado
 * (`getForegroundPermissionsAsync`, sin prompt). Si ya está concedido, obtiene
 * las coords directamente → la pantalla no vuelve a mostrar el gate de permiso.
 * Si no, queda en `idle` y se pide on-demand al llamar `request()`.
 */
import { useCallback, useEffect, useState } from 'react';
import * as Location from 'expo-location';

export type LocationStatus = 'checking' | 'idle' | 'requesting' | 'granted' | 'denied' | 'error';

export interface Coords {
  lat: number;
  lng: number;
}

export function useLocation() {
  const [coords, setCoords] = useState<Coords | null>(null);
  const [status, setStatus] = useState<LocationStatus>('checking');
  const [error, setError] = useState<string | null>(null);

  // Chequeo silencioso del permiso ya otorgado (no muestra prompt).
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { granted } = await Location.getForegroundPermissionsAsync();
        if (!active) return;
        if (!granted) {
          setStatus('idle');
          return;
        }
        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        if (!active) return;
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setStatus('granted');
      } catch {
        if (active) setStatus('idle');
      }
    })();
    return () => { active = false; };
  }, []);

  const request = useCallback(async (): Promise<Coords | null> => {
    setStatus('requesting');
    setError(null);
    try {
      const { status: perm } = await Location.requestForegroundPermissionsAsync();
      if (perm !== 'granted') {
        setStatus('denied');
        return null;
      }
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const c = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      setCoords(c);
      setStatus('granted');
      return c;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo obtener la ubicación.');
      setStatus('error');
      return null;
    }
  }, []);

  return { coords, status, error, request };
}
