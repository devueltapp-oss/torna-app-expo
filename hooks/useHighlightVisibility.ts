/**
 * useHighlightVisibility — handler para flippear la visibilidad de un item de la
 * librería (público ↔ privado).
 *
 *   - Highlights: flip OPTIMISTA del `isPublic` local + persistencia en el backend
 *     (`PATCH /highlights/:id/toggle`, invierte `isEnabled`). Si la request falla,
 *     se revierte el flip. Un highlight público aparece en el perfil (el perfil
 *     filtra `isPublic`); uno privado solo en la librería.
 *   - Matches: no tienen visibilidad en el backend (no hay endpoint) → el toggle es
 *     solo local/cosmético.
 *
 * Extraído de `App.tsx` para que la lógica sea unit-testeable sin renderizar la app.
 */
import { useCallback } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { toggleHighlightVisibility } from '../api/highlights';
import type { LibraryItem, LibraryHighlight, LibraryMatch } from '../data/types';

/** Invierte `isPublic` del item con `id`; devuelve una lista nueva (inmutable). */
export function flipVisibility<T extends { id: string; isPublic: boolean }>(
  xs: T[],
  id: string,
): T[] {
  return xs.map((x) => (x.id === id ? { ...x, isPublic: !x.isPublic } : x));
}

export function useHighlightVisibility(
  setHighlights: Dispatch<SetStateAction<LibraryHighlight[]>>,
  setMatches: Dispatch<SetStateAction<LibraryMatch[]>>,
) {
  return useCallback(
    (item: LibraryItem) => {
      if (item.kind === 'match') {
        setMatches((xs) => flipVisibility(xs, item.id));
        return;
      }
      // Highlight: flip optimista + persistir; revertir si la request falla.
      setHighlights((xs) => flipVisibility(xs, item.id));
      toggleHighlightVisibility(item.id).catch(() => {
        setHighlights((xs) => flipVisibility(xs, item.id));
      });
    },
    [setHighlights, setMatches],
  );
}
