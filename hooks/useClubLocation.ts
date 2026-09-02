/**
 * useClubLocation — carga la ubicación del club si falta.
 *
 * Espejo del `ClubLocationDialog` del desktop: los dos clientes resuelven lo
 * mismo (`GET`/`PUT /club/location` + `/geo/*`) porque el admin de un club puede
 * entrar por cualquiera de los dos y el dato tiene que quedar cargado igual.
 *
 * Dos caminos, en este orden a propósito:
 *
 *  1. **Usar mi ubicación actual** — el caso real (el admin está en el club).
 *     **No depende de Geoapify**: las coordenadas salen del GPS. El reverse solo
 *     agrega la dirección legible y, si falla, se guarda igual.
 *  2. **Buscar la dirección** — para dar de alta a distancia. Este sí necesita la
 *     clave; sin ella `configured` es false y la UI no muestra el buscador.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  fetchClubLocation,
  saveClubLocation,
  type ClubLocation,
} from '../api/club';
import {
  isGeoConfigured,
  reverseAddress,
  searchAddress,
  type AddressSuggestion,
} from '../api/geo';
import { precisePosition, type LocationDenial } from '../lib/location';

/** Se busca al dejar de teclear: cada consulta gasta cuota del proveedor. */
const SEARCH_DEBOUNCE_MS = 450;

export interface PickedLocation {
  latitude: number;
  longitude: number;
  address?: string;
}

export interface UseClubLocation {
  /** null mientras carga. `hasLocation:false` = hay que pedirla. */
  location: ClubLocation | null;
  /** ¿Está configurado el buscador de direcciones en el backend? */
  searchEnabled: boolean;
  results: AddressSuggestion[];
  picked: PickedLocation | null;
  locating: boolean;
  searching: boolean;
  saving: boolean;
  problem: LocationDenial | 'search' | 'save' | null;
  /** Texto del buscador; el hook lo mantiene para poder silenciar la búsqueda al elegir. */
  query: string;
  setQuery: (q: string) => void;
  useMyPosition: () => Promise<void>;
  choose: (s: AddressSuggestion) => void;
  save: () => Promise<boolean>;
}

export function useClubLocation(enabled: boolean): UseClubLocation {
  const [location, setLocation] = useState<ClubLocation | null>(null);
  const [searchEnabled, setSearchEnabled] = useState(false);
  const [results, setResults] = useState<AddressSuggestion[]>([]);
  const [picked, setPicked] = useState<PickedLocation | null>(null);
  const [query, setQuery] = useState('');
  const [locating, setLocating] = useState(false);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [problem, setProblem] = useState<UseClubLocation['problem']>(null);

  const aliveRef = useRef(true);
  // Marca que el texto salió del buscador: elegir una sugerencia RELLENA el
  // campo, y sin esto ese cambio dispararía otra búsqueda por lo ya elegido.
  const chosenRef = useRef(false);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!enabled) {
      setLocation(null);
      return;
    }
    let cancelled = false;
    Promise.all([fetchClubLocation(), isGeoConfigured()])
      .then(([loc, configured]) => {
        if (cancelled || !aliveRef.current) return;
        setLocation(loc);
        setSearchEnabled(configured);
      })
      .catch(() => {
        // 403 = no es una cuenta de club. No hay nada que pedirle: se deja en
        // null y la UI no muestra nada.
      });
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  /* ─────────── 1. Mi ubicación ─────────── */

  const useMyPosition = useCallback(async () => {
    setLocating(true);
    setProblem(null);
    try {
      const { coords, reason } = await precisePosition();
      if (!coords) {
        if (aliveRef.current) setProblem(reason);
        return;
      }

      // La dirección legible es un EXTRA: si Geoapify no está configurado o
      // falla, se guardan las coordenadas igual — son lo único que el resto del
      // sistema necesita.
      let address: string | undefined;
      try {
        const found = await reverseAddress(coords.latitude, coords.longitude);
        address = found?.label ?? undefined;
      } catch {
        // sin dirección, con coordenadas: sigue sirviendo
      }

      if (!aliveRef.current) return;
      chosenRef.current = true;
      setPicked({ ...coords, address });
      if (address) setQuery(address);
    } finally {
      if (aliveRef.current) setLocating(false);
    }
  }, []);

  /* ─────────── 2. Buscar la dirección ─────────── */

  useEffect(() => {
    if (!searchEnabled) return undefined;
    if (chosenRef.current || query.trim().length < 3) {
      setResults([]);
      return undefined;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        // Si ya hay un punto, sesga la búsqueda: lo cercano sale primero.
        const near = picked
          ? { latitude: picked.latitude, longitude: picked.longitude }
          : undefined;
        const found = await searchAddress(query.trim(), near);
        if (aliveRef.current) {
          setResults(found);
          setProblem(null);
        }
      } catch {
        if (aliveRef.current) {
          setResults([]);
          setProblem('search');
        }
      } finally {
        if (aliveRef.current) setSearching(false);
      }
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [query, searchEnabled, picked]);

  const setQueryPublic = useCallback((q: string) => {
    chosenRef.current = false;
    setQuery(q);
  }, []);

  const choose = useCallback((s: AddressSuggestion) => {
    chosenRef.current = true;
    setQuery(s.label);
    setResults([]);
    setPicked({ latitude: s.latitude, longitude: s.longitude, address: s.label });
  }, []);

  /* ─────────── Guardar ─────────── */

  const save = useCallback(async (): Promise<boolean> => {
    if (!picked) return false;
    setSaving(true);
    setProblem(null);
    try {
      const saved = await saveClubLocation({
        latitude: picked.latitude,
        longitude: picked.longitude,
        // Si el admin editó el texto a mano, vale lo que escribió.
        address: query.trim() || picked.address,
      });
      if (aliveRef.current) setLocation(saved);
      return true;
    } catch {
      if (aliveRef.current) setProblem('save');
      return false;
    } finally {
      if (aliveRef.current) setSaving(false);
    }
  }, [picked, query]);

  return {
    location,
    searchEnabled,
    results,
    picked,
    locating,
    searching,
    saving,
    problem,
    query,
    setQuery: setQueryPublic,
    useMyPosition,
    choose,
    save,
  };
}
