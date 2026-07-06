/**
 * Confirma la lógica "desde la app" que convierte un highlight privado en público:
 * el handler hace un flip OPTIMISTA de `isPublic` y persiste con
 * `PATCH /highlights/:id/toggle`. Si el backend falla, REVIERTE. Los partidos no
 * tienen visibilidad server-side → no llaman a la API.
 */
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useHighlightVisibility, flipVisibility } from '../useHighlightVisibility';
import { toggleHighlightVisibility } from '../../api/highlights';
import type { LibraryHighlight, LibraryMatch } from '../../data/types';

jest.mock('../../api/highlights');

const mockToggle = toggleHighlightVisibility as jest.MockedFunction<
  typeof toggleHighlightVisibility
>;

const privateHighlight: LibraryHighlight = {
  id: 'h1',
  kind: 'highlight',
  title: 'Punto ganador',
  isPublic: false,
  durationSeconds: 42,
};

const localMatch: LibraryMatch = {
  id: 'm1',
  kind: 'match',
  title: 'Partido del sábado',
  isPublic: false,
  surface: 'HARD',
  cameras: 2,
  highlightsCount: 0,
  recordingUrl: 'https://cdn/m1.m3u8',
  durationSeconds: 3600,
};

/** State harness: un setter que aplica los updaters como lo haría React. */
function harness<T>(initial: T[]) {
  let state = initial;
  const setState = jest.fn((u: T[] | ((prev: T[]) => T[])) => {
    state = typeof u === 'function' ? (u as (p: T[]) => T[])(state) : u;
  });
  return { get: () => state, setState };
}

describe('useHighlightVisibility', () => {
  afterEach(() => jest.clearAllMocks());

  it('flipVisibility invierte isPublic solo del item con ese id (inmutable)', () => {
    const before = [privateHighlight];
    const after = flipVisibility(before, 'h1');
    expect(after[0].isPublic).toBe(true);
    expect(before[0].isPublic).toBe(false); // no muta el original
  });

  it('publica optimista y persiste con PATCH cuando el backend responde OK', async () => {
    mockToggle.mockResolvedValue(undefined);
    const hl = harness<LibraryHighlight>([{ ...privateHighlight }]);
    const mt = harness<LibraryMatch>([]);

    const { result } = renderHook(() =>
      useHighlightVisibility(hl.setState, mt.setState),
    );

    act(() => result.current(privateHighlight));

    // Flip optimista inmediato → visible en el perfil.
    expect(hl.get()[0].isPublic).toBe(true);
    expect(mockToggle).toHaveBeenCalledWith('h1');
  });

  it('REVIERTE a privado si el PATCH falla', async () => {
    mockToggle.mockRejectedValue(new Error('HTTP 403'));
    const hl = harness<LibraryHighlight>([{ ...privateHighlight }]);
    const mt = harness<LibraryMatch>([]);

    const { result } = renderHook(() =>
      useHighlightVisibility(hl.setState, mt.setState),
    );

    act(() => result.current(privateHighlight));
    expect(hl.get()[0].isPublic).toBe(true); // optimista

    await waitFor(() => expect(hl.get()[0].isPublic).toBe(false)); // revertido
  });

  it('un partido (match) togglea local y NO llama al backend', () => {
    const hl = harness<LibraryHighlight>([]);
    const mt = harness<LibraryMatch>([{ ...localMatch }]);

    const { result } = renderHook(() =>
      useHighlightVisibility(hl.setState, mt.setState),
    );

    act(() => result.current(localMatch));

    expect(mt.get()[0].isPublic).toBe(true);
    expect(mockToggle).not.toHaveBeenCalled();
  });
});
